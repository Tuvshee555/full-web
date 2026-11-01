/**
 * Runs evaluation cases through the real conversation engine (runCustomerTurn) over the invented
 * catalogue. Shared by the CLI (run-eval.mjs) and the test suite (eval-suite.test.ts). No database,
 * no network: state, history and catalogue live in memory; order creation and lookup are fakes.
 */
import { randomUUID } from "node:crypto";
import { EvalWorld, ORDER } from "./fixture.mjs";

const CYRILLIC_RUN = /[А-Яа-яӨҮөү]{4,}/;
const AMOUNT = /(\d{1,3}(?:,\d{3})+|\d+)\s*₮/g;

/** Hard rules every turn must pass regardless of the case's own expectations. */
export function hardChecks({ world, locale, text, reply, expect, orderCalls }) {
  const problems = [];
  if (!reply || !reply.trim()) { problems.push("silent turn"); return problems; }
  if (/^(?:REFER|SILENT)\b/i.test(reply.trim()) || /\b(?:REFER|SILENT)\b/.test(reply)) problems.push("control token leaked");
  // Order totals the engine may legitimately compute: unit × quantity (1..5), with and without the
  // delivery fee. They are accepted only on a line that presents a total or a multiplication
  // (Нийт / Total / × / ширхэг / =); anywhere else, only a catalogue amount counts as true.
  const derived = new Set();
  for (const p of world.products()) {
    const units = p.sizes.length ? p.sizes.map((s) => s.price || p.price) : [p.price];
    for (const unit of new Set(units)) for (let qty = 1; qty <= 5; qty += 1) { derived.add(unit * qty); derived.add(unit * qty + world.fee); }
  }
  const allowed = new Set([...world.quotable(), ...(expect.allowAmounts || [])]);
  for (const line of reply.split("\n")) {
    const totalLine = /Нийт|Total|×|ширхэг|=/iu.test(line);
    for (const match of line.matchAll(AMOUNT)) {
      const amount = Number(match[1].replaceAll(",", ""));
      if (!allowed.has(amount) && !(totalLine && derived.has(amount))) problems.push(`invented amount ${match[0]}`);
    }
  }
  const prose = world.products().reduce((value, p) => value.replaceAll(p.productName, ""), reply).replace(/https?:\/\/\S+/g, "");
  if (locale === "en" && CYRILLIC_RUN.test(prose.replace(/Цайвар хүрэн|Хар хүрэн|Хүрэн|мл/g, ""))) problems.push("Mongolian prose in English reply");
  if (locale === "mn" && !/[А-Яа-яӨҮөү]/.test(prose)) problems.push("no Cyrillic in Mongolian reply");
  if (reply.includes(ORDER.privateMarker) || (!expect.allowOrderNumber && reply.includes(ORDER.number) && !text.includes(ORDER.number))) problems.push("private order data echoed");
  if (/100\s*%\s*ургана|guaranteed regrowth|will regrow|баталгаатай.{0,20}ургана/i.test(reply)) problems.push("growth promise");
  if (orderCalls > 0 && expect.order !== "created") problems.push("order created without confirmation");
  if (expect.order === "created" && orderCalls !== 1) problems.push("confirmed order not created");
  return problems;
}

export function expectationChecks({ reply, needsHuman, expect }) {
  const failures = [];
  for (const pattern of expect.must || []) if (!new RegExp(pattern, "iu").test(reply)) failures.push(`missing /${pattern}/`);
  for (const pattern of expect.mustNot || []) if (new RegExp(pattern, "iu").test(reply)) failures.push(`forbidden /${pattern}/`);
  if (expect.human === true && !needsHuman) failures.push("expected hand-off");
  if (expect.human === false && needsHuman) failures.push("unexpected hand-off");
  return failures;
}

/**
 * Runs one case. `engine` = { runCustomerTurn, setStateAdapter, askUnderstanding, askReply }: the
 * model functions are null for the deterministic run.
 */
export async function runCase(item, engine) {
  const world = new EvalWorld();
  const states = new Map();
  engine.setStateAdapter({ read: async (id) => states.get(id) || {}, merge: async (id, patch) => { states.set(id, { ...states.get(id), ...patch }); } });
  const history = [];
  let state = {};
  const senderId = `eval:${item.id}:${randomUUID().slice(0, 8)}`;
  const rows = [];
  let orderSerial = 0;
  try {
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
        result = await engine.runCustomerTurn({
          text: turn.text, history, state, context, senderId, askUnderstanding: engine.askUnderstanding ?? null, askReply: engine.askReply ?? null,
          orderLookup: async (number, phone) => number === ORDER.number && phone.replace(/\D/g, "").endsWith(ORDER.phone) ? ORDER.status : null,
          placeOrder,
        });
      } catch (error) {
        rows.push({ turn: turn.text, reply: "", hard: [`engine error: ${error?.message || error}`], failures: [], ms: Date.now() - started, intent: "error" });
        continue;
      }
      const reply = result.text || "";
      const hard = hardChecks({ world, locale: item.locale, text: turn.text, reply, expect, orderCalls });
      const failures = expectationChecks({ reply, needsHuman: result.needsHuman, expect });
      rows.push({ turn: turn.text, reply, hard, failures, ms: Date.now() - started, intent: result.intent, model: result.model });
      state = result.state;
      history.push({ role: "user", text: turn.text }, { role: "assistant", text: reply });
    }
  } finally {
    engine.setStateAdapter(null);
  }
  return { id: item.id, category: item.category, locale: item.locale, rows };
}

export function summarize(results) {
  const turns = results.flatMap((r) => r.rows.map((row) => ({ ...row, id: r.id, category: r.category })));
  const hardOk = turns.filter((row) => row.hard.length === 0).length;
  const passed = turns.filter((row) => row.hard.length === 0 && row.failures.length === 0).length;
  const byCategory = {};
  for (const row of turns) {
    const bucket = (byCategory[row.category] ||= { turns: 0, passed: 0, hardOk: 0 });
    bucket.turns += 1; if (row.hard.length === 0) bucket.hardOk += 1; if (row.hard.length === 0 && row.failures.length === 0) bucket.passed += 1;
  }
  const casesPassed = results.filter((r) => r.rows.every((row) => row.hard.length === 0 && row.failures.length === 0)).length;
  return {
    turns, byCategory, cases: results.length, casesPassed, passed, hardOk,
    passRate: Number(((passed / Math.max(1, turns.length)) * 100).toFixed(1)),
    hardCriteriaRate: Number(((hardOk / Math.max(1, turns.length)) * 100).toFixed(1)),
    avgMs: Math.round(turns.reduce((sum, row) => sum + row.ms, 0) / Math.max(1, turns.length)),
  };
}
