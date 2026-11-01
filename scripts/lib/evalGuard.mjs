/**
 * Guard for every script that spends model credit (live evaluation, model comparison).
 * Pattern from the Uudam chatbot: a day of uncontrolled replays once drained a provider balance
 * and left customers unanswered. A run must be deliberate and bounded:
 *   1. opted in for this run: EVAL_RUN_APPROVED=1 (no script spends credit just by being started);
 *   2. never target the production site (its replies and logs are real customer data);
 *   3. stay under EVAL_MAX_MODEL_CALLS (default 150) model calls;
 *   4. one run at a time: a second concurrent run is refused.
 * Routine CI never needs any of this: `npm test` runs with a mock and no provider key.
 */
import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PRODUCTION_HOSTS = ["full-web-lac.vercel.app"];
const COST_PER_CALL_ESTIMATE_USD = 0.01;
const LOCK_FILE = join(tmpdir(), "lorentz-eval-run.lock");

export function evaluationCallBudget() {
  const value = Number(process.env.EVAL_MAX_MODEL_CALLS || 150);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 150;
}

const processAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

function takeRunLock(estimate) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(LOCK_FILE, "wx");
      writeSync(fd, String(process.pid));
      closeSync(fd);
      const release = () => { try { if (readFileSync(LOCK_FILE, "utf8") === String(process.pid)) unlinkSync(LOCK_FILE); } catch { /* already gone */ } };
      process.once("exit", release);
      return;
    } catch {
      let holder = 0;
      try { holder = Number(readFileSync(LOCK_FILE, "utf8")); } catch { /* removed meanwhile */ }
      if (holder && holder !== process.pid && processAlive(holder)) throw new Error(`${estimate}. Refused: another evaluation run (pid ${holder}) is still going.`);
      if (holder === process.pid) return;
      try { unlinkSync(LOCK_FILE); } catch { /* removed meanwhile */ }
    }
  }
}

/** Throws with an actionable message unless the run is allowed. Labels this process's spend as "evaluation". */
export function requireApprovedEvaluation({ name, estimatedModelCalls, baseUrl }) {
  const key = process.env.EVAL_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
  const calls = Math.min(estimatedModelCalls, evaluationCallBudget());
  const estimate = `${name}: about ${calls} model calls, roughly $${(calls * COST_PER_CALL_ESTIMATE_USD).toFixed(2)}`;
  if (!key) throw new Error(`${estimate}. Refused: no OPENAI_API_KEY (or EVAL_OPENAI_API_KEY) is set.`);
  if (baseUrl) {
    let host = "";
    try { host = new URL(baseUrl).hostname; } catch { /* not a URL */ }
    if (PRODUCTION_HOSTS.includes(host)) throw new Error(`${estimate}. Refused: ${host} is production. Run against a local or preview server.`);
  }
  if (process.env.EVAL_RUN_APPROVED !== "1") throw new Error(`${estimate}. Not approved: this run spends model credit. Re-run with EVAL_RUN_APPROVED=1.`);
  takeRunLock(estimate);
  process.env.OPENAI_API_KEY = key;
  process.env.AI_USAGE_ENVIRONMENT = "evaluation";
  console.log(`[eval] ${estimate}; cap ${evaluationCallBudget()} calls; spend labelled "evaluation" and never written to the shop database.`);
  return key;
}

/** Wraps a model-calling function so the run stops at the cap instead of running away. */
export function cappedCalls(fn, counter = { calls: 0 }) {
  return async (...args) => {
    if (counter.calls >= evaluationCallBudget()) throw new Error(`EVAL_MAX_MODEL_CALLS (${evaluationCallBudget()}) reached`);
    counter.calls += 1;
    return fn(...args);
  };
}
