/**
 * Runs the evaluation set (cases.mjs) through the real conversation engine over the invented
 * catalogue (fixture.mjs) and prints a scoreboard; see harness.mjs for the checks.
 *
 *   node --import tsx tests/chatbot/eval/run-eval.mjs                 deterministic (no model)
 *   node --import tsx tests/chatbot/eval/run-eval.mjs --label before  write docs/chatbot/EVAL_before.md
 *   node --import tsx tests/chatbot/eval/run-eval.mjs --live          real model (EVAL_RUN_APPROVED=1)
 *   --only <category|id prefix>[,…]   --max-calls <n>   --model <name>   --quiet
 */
import fs from "node:fs";
import path from "node:path";
import { evalCases } from "./cases.mjs";
import { runCase, summarize } from "./harness.mjs";

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
const calls = { count: 0, ms: 0 };
if (LIVE) {
  const { requireApprovedEvaluation } = await import("../../../scripts/lib/evalGuard.mjs");
  const turns = evalCases.flatMap((item) => item.turns.filter((turn) => turn.text)).length;
  requireApprovedEvaluation({ name: "chatbot eval (live model)", estimatedModelCalls: Math.min(turns * 2, MAX_CALLS) });
  if (MODEL) { process.env.OPENAI_MODEL = MODEL; process.env.PRODUCT_UNDERSTANDING_MODEL = MODEL; process.env.OPENAI_REPLY_MODEL = MODEL; }
  process.env.ERROR_LOG_DB_ENABLED = "false";
  const { understandingModel } = await import("../../../src/chatbot/productUnderstandingModel.ts");
  const { replyModel } = await import("../../../src/chatbot/productWriter.ts");
  const { withChatbotContext } = await import("../../../src/chatbot/runtimeContext.ts");
  const guard = (fn, name) => async (...fnArgs) => {
    if (calls.count >= MAX_CALLS) throw new Error(`EVAL_MAX_MODEL_CALLS (${MAX_CALLS}) reached`);
    calls.count += 1;
    const started = Date.now();
    try { return await withChatbotContext({ channel: "test", conversationId: `eval:${name}` }, () => fn(...fnArgs)); }
    finally { calls.ms += Date.now() - started; }
  };
  askUnderstanding = guard(understandingModel({ correlationId: "eval", model: MODEL }), "understanding");
  askReply = guard(replyModel(MODEL), "writer");
}

const onlyList = ONLY ? ONLY.split(",").map((value) => value.trim()).filter(Boolean) : [];
const selected = evalCases.filter((item) => !onlyList.length || onlyList.some((only) => item.category === only || item.id.startsWith(only)));
const results = [];
for (const item of selected) {
  try { results.push(await runCase(item, { runCustomerTurn, setStateAdapter, askUnderstanding, askReply })); }
  catch (error) { if (/EVAL_MAX_MODEL_CALLS/.test(String(error?.message))) { console.error(String(error.message)); break; } throw error; }
}

const summary = summarize(results);
const { turns, byCategory } = summary;
const mode = LIVE ? `live (${MODEL || process.env.OPENAI_MODEL || "default model"})` : "deterministic (no model)";
console.log(JSON.stringify({ mode, cases: summary.cases, casesPassed: summary.casesPassed, turns: turns.length, passed: summary.passed, passRate: summary.passRate, hardCriteriaPassed: summary.hardOk, hardCriteriaRate: summary.hardCriteriaRate, avgMs: summary.avgMs, modelCalls: calls.count, modelMs: calls.ms }));
console.table(Object.entries(byCategory).map(([category, bucket]) => ({ category, turns: bucket.turns, passed: bucket.passed, hardOk: bucket.hardOk, rate: `${Math.round((bucket.passed / bucket.turns) * 100)}%` })));
if (!QUIET) for (const row of turns) if (row.hard.length || row.failures.length) console.log(`✗ ${row.id} | ${row.turn}\n    → ${row.reply.replace(/\n/g, " ⏎ ").slice(0, 220)}\n    ${[...row.hard, ...row.failures].join("; ")}`);

if (LABEL) {
  const cell = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", "<br>");
  const lines = [
    `# Chatbot evaluation: ${LABEL}`, "",
    `Mode: ${mode}. ${summary.cases} conversations, ${turns.length} customer turns. Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.`, "",
    `| Measure | Result |`, `| --- | --- |`,
    `| Turns passing every check | ${summary.passed}/${turns.length} (${summary.passRate}%) |`,
    `| Turns passing the hard rules (reply, no invented amount, language, privacy, no promise, confirmed orders only) | ${summary.hardOk}/${turns.length} (${summary.hardCriteriaRate}%) |`,
    `| Conversations fully correct | ${summary.casesPassed}/${summary.cases} |`,
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
  fs.writeFileSync(path.join("docs", "chatbot", `EVAL_${LABEL}.json`), JSON.stringify({ summary: { mode, ...summary, turns: undefined, byCategory }, turns }, null, 2) + "\n");
  console.log(`Wrote ${target}`);
}
process.exitCode = 0;
