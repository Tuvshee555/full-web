/**
 * Runs the evaluation set (cases.mjs) through the real conversation engine (runCustomerTurn) over
 * the invented catalogue (fixture.mjs). No database, no network: the state, history and catalogue
 * live in memory, order creation and order lookup are fakes.
 *
 *   node --import tsx tests/chatbot/eval/run-eval.mjs                 deterministic (no model)
 *   node --import tsx tests/chatbot/eval/run-eval.mjs --label before  write docs/chatbot/EVAL_before.md
 *   node --import tsx tests/chatbot/eval/run-eval.mjs --live          real model (EVAL_RUN_APPROVED=1)
 *   --only <category|id prefix>   --max-calls <n>   --model <name>   --quiet
 *
 * Hard rules apply to every turn: a non-empty reply, no REFER/SILENT token, no amount that is not
 * a current catalogue amount (or an expected order total), the customer's language, no private
 * order data, no growth promise, and no order created without the confirmation turn.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { evalCases } from "./cases.mjs";
import { EvalWorld, ORDER } from "./fixture.mjs";

const args = process.argv.slice(2);
const flag = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const LIVE = args.includes("--live");
const QUIET = args.includes("--quiet");
const LABEL = flag("--label");
const ONLY = flag("--only");
const MAX_CALLS = Number(flag("--max-calls") || process.env.EVAL_MAX_MODEL_CALLS || 150);
const MODEL = flag("--model");

const { runCustomerTurn } = await import("../../../src/chatbot/turn.ts");
const { setStateAdapter } = await import("../../../src/chatbot/conversationState.ts");

let askUnderstanding = null, askReply = null;
const calls = { count: 0, prompt: 0, completion: 0, ms: 0 };
if (LIVE) {
  const { requireApprovedEvaluation } = await import("../../../scripts/lib/evalGuard.mjs");
  const turns = evalCases.flatMap((item) => item.turns.filter((turn) => turn.text)).length;
  requireApprovedEvaluation({ name: "chatbot eval (live model)", estimatedModelCalls: Math.min(turns * 2, MAX_CALLS) });
  if (MODEL) { process.env.OPENAI_MODEL = MODEL; process.env.PRODUCT_UNDERSTANDING_MODEL = MODEL; process.env.OPENAI_REPLY_MODEL = MODEL; }
  process.env.ERROR_LOG_DB_ENABLED = "false";
  const { understandingModel } = await import("../../../src/chatbot/productUnderstandingModel.ts");
  const { openAIReply } = await import("../../../src/chatbot/productWriter.ts");
  const { withChatbotContext } = await import("../../../src/chatbot/runtimeContext.ts");
  const guard = (fn, name) => async (...fnArgs) => {
    if (calls.count >= MAX_CALLS) throw new Error(`EVAL_MAX_MODEL_CALLS (${MAX_CALLS}) reached`);
    calls.count += 1;
    const started = Date.now();
    try { return await withChatbotContext({ channel: "test", conversationId: `eval:${name}` }, () => fn(...fnArgs)); }
    finally { calls.ms += Date.now() - started; }
  };
  askUnderstanding = guard(understandingModel({ correlationId: "eval" }), "understanding");
  askReply = guard(openAIReply, "writer");
}

const CYRILLIC_RUN = /[А-Яа-яӨҮөү]{4,}/;
const AMOUNT = /(\d{1,3}(?:,\d{3})+|\d+)\s*₮/g;

function hardChecks({ world, locale, text, reply, needsHuman, expect, orderCalls }) {
  const problems = [];
  if (!reply || !reply.trim()) { problems.push("silent turn"); return problems; }
  if (/^(?:REFER|SILENT)\b/i.test(reply.trim()) || /\b(?:REFER|SILENT)\b/.test(reply)) problems.push("control token leaked");
  const allowed = new Set([...world.quotable(), ...(expect.allowAmounts || [])]);
  for (const match of reply.matchAll(AMOUNT)) {
    const amount = Number(match[1].replaceAll(",", ""));
    if (!allowed.has(amount)) problems.push(`invented amount ${match[0]}`);
  }
  const prose = world.products().reduce((value, p) => value.replaceAll(p.productName, ""), reply).replace(/https?:\/\/\S+/g, "");
  if (locale === "en" && CYRILLIC_RUN.test(prose.replace(/Цайвар хүрэн|Хар хүрэн|Хүрэн|мл/g, ""))) problems.push("Mongolian prose in English reply");
  if (locale === "mn" && !/[А-Яа-яӨҮөү]/.test(prose)) problems.push("no Cyrillic in Mongolian reply");
  if (reply.includes(ORDER.privateMarker) || (!expect.allowOrderNumber && reply.includes(ORDER.number) && !text.includes(ORDER.number))) problems.push("private order data echoed");
  if (/100\s*%\s*ургана|guaranteed regrowth|will regrow|баталгаатай.{0,20}ургана/i.test(reply)) problems.push("growth promise");
  if (orderCalls > 0 && expect.order !== "created") problems.push("order created without confirmation");
  if (expect.order === "created" && orderCalls !== 1) problems.push("confirmed order not created");
  void needsHuman;
  return problems;
}

function expectationChecks({ reply, needsHuman, expect }) {
  const failures = [];
  for (const pattern of expect.must || []) if (!new RegExp(pattern, "iu").test(reply)) failures.push(`missing /${pattern}/`);
  for (const pattern of expect.mustNot || []) if (new RegExp(pattern, "iu").test(reply)) failures.push(`forbidden /${pattern}/`);
  if (expect.human === true && !needsHuman) failures.push("expected hand-off");
  if (expect.human === false && needsHuman) failures.push("unexpected hand-off");
  return failures;
}

async function runCase(item) {
  const world = new EvalWorld();
  const states = new Map();
  setStateAdapter({ read: async (id) => states.get(id) || {}, merge: async (id, patch) => { states.set(id, { ...states.get(id), ...patch }); } });
  const history = [];
  let state = {};
  const senderId = `eval:${item.id}:${randomUUID().slice(0, 8)}`;
  const rows = [];
  let orderSerial = 0;
  for (const turn of item.turns) {
    if (turn.mutate) { world.mutate(turn.mutate); continue; }
    const expect = turn.expect || {};
    const context = world.context(item.locale);
    let orderCalls = 0;
    const placeOrder = async (draft) => {
      orderCalls += 1; orderSerial += 1;
      const subtotal = draft.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
      return { orderNumber: `EV-CHAT-${orderSerial}`, totalPrice: subtotal + context.deliveryFee, deliveryFee: context.deliveryFee, status: "WAITING_PAYMENT", paymentMethod: "BANK" };
    };
    const started = Date.now();
    let result;
    try {
      result = await runCustomerTurn({
        text: turn.text, history, state, context, senderId, askUnderstanding, askReply,
        orderLookup: async (number, phone) => number === ORDER.number && phone.replace(/\D/g, "").endsWith(ORDER.phone) ? ORDER.status : null,
        placeOrder,
      });
    } catch (error) {
      rows.push({ turn: turn.text, reply: "", hard: [`engine error: ${error?.message || error}`], failures: [], ms: Date.now() - started, intent: "error" });
      continue;
    }
    const reply = result.text || "";
    const hard = hardChecks({ world, locale: item.locale, text: turn.text, reply, needsHuman: result.needsHuman, expect, orderCalls });
    const failures = expectationChecks({ reply, needsHuman: result.needsHuman, expect });
    rows.push({ turn: turn.text, reply, hard, failures, ms: Date.now() - started, intent: result.intent, model: result.model });
    state = result.state;
    history.push({ role: "user", text: turn.text }, { role: "assistant", text: reply });
  }
  setStateAdapter(null);
  return { id: item.id, category: item.category, locale: item.locale, rows };
}

const onlyList = ONLY ? ONLY.split(",").map((value) => value.trim()).filter(Boolean) : [];
const selected = evalCases.filter((item) => !onlyList.length || onlyList.some((only) => item.category === only || item.id.startsWith(only)));
const results = [];
for (const item of selected) {
  try { results.push(await runCase(item)); }
  catch (error) { if (/EVAL_MAX_MODEL_CALLS/.test(String(error?.message))) { console.error(String(error.message)); break; } throw error; }
}

const turns = results.flatMap((r) => r.rows.map((row) => ({ ...row, id: r.id, category: r.category })));
const hardOk = turns.filter((row) => row.hard.length === 0).length;
const passed = turns.filter((row) => row.hard.length === 0 && row.failures.length === 0).length;
const byCategory = {};
for (const row of turns) {
  const bucket = (byCategory[row.category] ||= { turns: 0, passed: 0, hardOk: 0 });
  bucket.turns += 1; if (row.hard.length === 0) bucket.hardOk += 1; if (row.hard.length === 0 && row.failures.length === 0) bucket.passed += 1;
}
const casesPassed = results.filter((r) => r.rows.every((row) => row.hard.length === 0 && row.failures.length === 0)).length;
const summary = {
  mode: LIVE ? `live (${MODEL || process.env.OPENAI_MODEL || "default model"})` : "deterministic (no model)",
  cases: results.length, casesPassed, turns: turns.length, passed, passRate: Number(((passed / Math.max(1, turns.length)) * 100).toFixed(1)),
  hardCriteriaPassed: hardOk, hardCriteriaRate: Number(((hardOk / Math.max(1, turns.length)) * 100).toFixed(1)),
  avgMs: Math.round(turns.reduce((sum, row) => sum + row.ms, 0) / Math.max(1, turns.length)),
  modelCalls: calls.count, modelMs: calls.ms,
  byCategory,
};
console.log(JSON.stringify({ ...summary, byCategory: undefined }));
console.table(Object.entries(byCategory).map(([category, bucket]) => ({ category, turns: bucket.turns, passed: bucket.passed, hardOk: bucket.hardOk, rate: `${Math.round((bucket.passed / bucket.turns) * 100)}%` })));
if (!QUIET) for (const row of turns) if (row.hard.length || row.failures.length) console.log(`✗ ${row.id} | ${row.turn}\n    → ${row.reply.replace(/\n/g, " ⏎ ").slice(0, 220)}\n    ${[...row.hard, ...row.failures].join("; ")}`);

if (LABEL) {
  const cell = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", "<br>");
  const lines = [
    `# Chatbot evaluation: ${LABEL}`, "",
    `Mode: ${summary.mode}. ${summary.cases} conversations, ${summary.turns} customer turns. Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.`, "",
    `| Measure | Result |`, `| --- | --- |`,
    `| Turns passing every check | ${passed}/${turns.length} (${summary.passRate}%) |`,
    `| Turns passing the hard rules (reply, no invented amount, language, privacy, no promise, confirmed orders only) | ${hardOk}/${turns.length} (${summary.hardCriteriaRate}%) |`,
    `| Conversations fully correct | ${casesPassed}/${results.length} |`,
    `| Average engine time per turn | ${summary.avgMs} ms |`,
    ...(LIVE ? [`| Model calls | ${calls.count} (${Math.round(calls.ms / Math.max(1, calls.count))} ms each on average) |`] : []),
    "", "## By category", "", "| Category | Turns | Passed | Hard rules ok |", "| --- | --- | --- | --- |",
    ...Object.entries(byCategory).map(([category, b]) => `| ${category} | ${b.turns} | ${b.passed} (${Math.round((b.passed / b.turns) * 100)}%) | ${b.hardOk} |`),
    "", "## Every turn", "", "| Conversation | Customer | Reply | Result | Why |", "| --- | --- | --- | --- | --- |",
    ...turns.map((row) => `| ${cell(row.id)} | ${cell(row.turn)} | ${cell(row.reply)} | ${row.hard.length || row.failures.length ? "FAIL" : "PASS"} | ${cell([...row.hard, ...row.failures].join("; "))} |`),
    "",
  ];
  const target = path.join("docs", "chatbot", `EVAL_${LABEL}.md`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, lines.join("\n"));
  fs.writeFileSync(path.join("docs", "chatbot", `EVAL_${LABEL}.json`), JSON.stringify({ summary, turns }, null, 2) + "\n");
  console.log(`Wrote ${target}`);
}
process.exitCode = 0;
