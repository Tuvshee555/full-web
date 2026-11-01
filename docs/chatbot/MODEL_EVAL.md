# Model comparison (1 November 2026)

## What was run

- Engine: branch `chatbot-intelligence` at `adcf4c6`.
- Data: the invented fixture catalogue in `tests/chatbot/eval/fixture.mjs` only. No shop data, no
  customer data; the database URL was a dead local address and the turns ran as `channel: "test"`,
  so nothing was written to the shop's database and no staff alert was possible.
- Subset: 62 of the 147 main-set conversations (74 customer turns) in 7 categories: pricing,
  availability, usage, latin, purchase, unknown, contradictory.
- One run per model, `EVAL_RUN_APPROVED=1`, cap 160 model calls per run.

## Results

| Model | Turns correct | Hard rules | Model calls | Avg model time | Notes |
| --- | --- | --- | --- | --- | --- |
| gpt-4.1 (current default) | 71/74 (95.9%) | 74/74 | 51 | 0.99 s | |
| gpt-4.1-mini | 72/74 (97.3%) | 74/74 | 53 | 1.01 s | |
| gpt-4o-mini | 72/74 (97.3%) | 74/74 | 52 | 0.98 s | |
| gpt-5-mini | 69/74 (93.2%) | 72/74 | 52 | 5.29 s | Most calls returned empty: its reasoning used up the output-token limit (`finish_reason: length`); one call got HTTP 400. Two English replies contained Mongolian prose. Removed from the admin's model list. |
| Same engine, no model | 74/74 (100%) | 74/74 | 0 | | Deterministic layers only. |
| Before the changes, gpt-4.1 | 50/74 (67.6%) | 73/74 | 70 | | The engine on `main`, same subset. |

How to read this:

- The differences between gpt-4.1, gpt-4.1-mini and gpt-4o-mini are one turn out of 74. That is
  within run-to-run noise for a single run; it does not show one model is better.
- Two misses repeat under every model and pass without a model: "Ямар бүтээгдэхүүн байгаа вэ?"
  gets an AI-written list without numbers, and "сэрумыг хэдий хугацаанд хэрэглэх вэ?" is answered
  from the usage steps instead of the owner's FAQ answer. The model path loses these two turns.
- About 70% of turns call the model at least once (51 calls over 74 turns): one understanding call
  per routed turn, plus a writer call for open questions.

## Spending

Evaluation runs are labelled "evaluation" and are kept out of the shop's AI ledger, so the shop's
daily budget was neither consumed nor exercised by them; each run's own cap (160 calls) held,
the largest run used 70. Token counts were not recorded per call, so the figures below are
estimates from the measured prompt sizes (about 1,200 input tokens per understanding call and
2,000 per writer call, small outputs) and list prices per million tokens. The OpenAI usage page is
the authoritative figure.

| Run | Calls | Estimated cost |
| --- | --- | --- |
| Baseline, gpt-4.1, first fixture naming | 70 | about $0.25 |
| Baseline, gpt-4.1, final fixture | 70 | about $0.25 |
| After, gpt-4.1 | 51 | about $0.18 |
| After, gpt-4.1-mini | 53 | about $0.04 |
| After, gpt-4o-mini | 52 | about $0.02 |
| After, gpt-5-mini | 52 | up to about $0.09 (reasoning tokens billed as output) |
| Total | 348 | about $0.80; at most about $1.30 if every call were writer-sized |

## Cost per customer conversation (estimate)

At about 0.7 model calls per turn and 5 turns per conversation:

| Model | Per conversation | 1,000 conversations a month |
| --- | --- | --- |
| gpt-4.1 | about $0.015 | about $15 |
| gpt-4.1-mini | about $0.003 | about $3 |
| gpt-4o-mini | about $0.001 | about $1 |

The live shop currently has 3 conversations in total, so any of these is far below the default
$5 daily budget.

## Recommendation

Keep gpt-4.1 until a controlled comparison on the held-out set (`tests/chatbot/eval/heldout.mjs`)
supports switching. Proposed run, needs approval because it spends credit:

```text
EVAL_RUN_APPROVED=1 EVAL_MAX_MODEL_CALLS=60 npm run eval:chatbot:live -- --set heldout --model gpt-4.1 --label heldout-live-gpt-4.1
EVAL_RUN_APPROVED=1 EVAL_MAX_MODEL_CALLS=60 npm run eval:chatbot:live -- --set heldout --model gpt-4.1-mini --label heldout-live-gpt-4.1-mini
```

About 2 × 45 calls, estimated under $0.30 in total. If gpt-4.1-mini matches gpt-4.1 there, switching
it in Admin → Chat assistant → Settings cuts model cost by about 5×.
