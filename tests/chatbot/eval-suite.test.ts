import test from "node:test";
import assert from "node:assert/strict";
import { evalCases, CATEGORIES } from "./eval/cases.mjs";
import { runCase, summarize } from "./eval/harness.mjs";
import { runCustomerTurn } from "../../src/chatbot/turn";
import { setStateAdapter } from "../../src/chatbot/conversationState";

/**
 * The 147-conversation evaluation set runs on every test run without a model (the deterministic
 * layers). The hard rules must hold on every turn; the expectations must hold on nearly every turn.
 * A new failure means a customer-facing regression: fix the engine, never loosen the case.
 */
test("the evaluation set covers every required area with at least 100 conversations", () => {
  assert.ok(evalCases.length >= 100, `expected 100+ cases, found ${evalCases.length}`);
  for (const required of ["pricing", "availability", "usage", "ingredients", "shipping", "returns", "order_status", "latin", "typos", "context", "purchase", "handover", "unknown", "contradictory", "injection", "incorrect_stock", "sync"]) {
    assert.ok(CATEGORIES.includes(required), `missing category ${required}`);
  }
});

test("every evaluation turn passes the hard rules and the expectations hold", async () => {
  const results = [];
  for (const item of evalCases) results.push(await runCase(item, { runCustomerTurn, setStateAdapter, askUnderstanding: null, askReply: null }));
  const summary = summarize(results);
  const turns: Array<{ id: string; turn: string; hard: string[]; failures: string[] }> = summary.turns;
  const hardFailures = turns.filter((row) => row.hard.length);
  assert.deepEqual(hardFailures.map((row) => `${row.id}: ${row.turn} → ${row.hard.join("; ")}`), [], "hard rules must hold on every turn");
  const failures = turns.filter((row) => row.failures.length).map((row) => `${row.id}: ${row.turn} → ${row.failures.join("; ")}`);
  assert.ok(summary.passRate >= 97, `expectation pass rate ${summary.passRate}% is below 97%:\n${failures.join("\n")}`);
});
