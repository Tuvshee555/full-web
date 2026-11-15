# Model comparison (1 November 2026)

## 2 November 2026: the final engine on gpt-4.1-mini (approved budget $0.30, spent $0.19)

The engine was changed on 2 November (delivery time, numbered catalogue, person requests, duration
of use, Latin aliases, verification, reservations). Per the held-out rule the first held-out set and
the second-edition cases that were tuned against joined the main gate; the remaining held-out cases
were run once, as they are. All runs: invented catalogue, dead database address, `channel: test`.

| Set | Turns | Rules only | gpt-4.1-mini | Calls | Tokens in / out | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Held-out, second edition (fresh phrasings, 66 conversations) | 84 | 80 (95.2%) | **82 (97.6%)** | 48 | 48,121 / 1,961 | $0.0224 |
| Main gate (215 conversations incl. both retired held-out sets) | 299 | 299 (100%) | **298 (99.7%)** | 147 | 144,957 / 6,673 | $0.0687 |
| Hard rules (nothing invented, no silence, no private data, no order without confirmation) | 383 | 383 | 383 | | | |

Earlier runs of the same day on the pre-fix engine (held-out 81/84 at $0.0233, main 288/299 at
$0.0749) are superseded; the four runs together cost **$0.189** of the authorized $0.30.

### By how the customer wrote (gpt-4.1-mini, final engine)

| Group | Held-out | Main gate |
| --- | --- | --- |
| Latin-script Mongolian | 69/71 | 111/112 |
| Cyrillic Mongolian | 5/5 | 156/156 |
| English | 8/8 | 31/31 |

### Held-out by topic (gpt-4.1-mini / rules only / turns)

pricing 8/7/8 · availability 5/5/5 · usage 3/3/3 · duration 3/3/3 · storage 1/1/1 · ingredients 2/1/2 · volume 2/2/2 ·
shipping 5/5/5 · returns 1/1/1 · payment 4/4/4 · purchase 8/8/8 · chat order 8/8/9 · context 11/11/11 ·
handover 4/4/4 · order status 1/1/1 · safety 4/4/5 · sync (admin edits) 8/8/8 · unknown 2/2/2 · injection 2/2/2.
Unsupported claims (invented amount, forbidden claim, promise, private data): 0 in every run.

### Every incorrect answer, final engine

| Turn | Rules | gpt-4.1-mini | What went wrong |
| --- | --- | --- | --- |
| «serum bolon gel hoyulaa hed bolh ve» (both prices) | wrong | right | The rules answer one product per message; the model read both. |
| «serum ni yunaas butsen be» (what is it made of) | wrong | right | "yunaas" is not in the alias table; the model read the topic. |
| «Darhan hot, 3-r bag» (a countryside address in Latin letters, mid chat order) | wrong | wrong | Aimag names are matched in Cyrillic only; the draft did not advance. Rules: generic line; model: asked for an order number. Nothing wrong was claimed. |
| «arisand turhsnii daraa zagatnaad bna» (itching after applying) | wrong | wrong | "zagatnaad" is not in the alias table, so the reaction rule did not fire; the model's "medical" label gave the no-promise answer without the stop/rinse/doctor advice and no hand-over. |
| «nud ruu orchihloo yah ve» (it got into my eye), main gate | right | wrong at run time | The model labelled it "human" and the hand-over text had no rinse advice. Fixed after the run (Latin "nud"/"orchihloo" aliases, the reaction rule now fires first); confirmed by the rules-only gate and a unit check, not re-run live. |

### Reading

gpt-4.1-mini fixed two rules-only misses and broke none on the fresh held-out set; on the main
gate it lost one turn to a wrong "human" label that the rules now intercept. The remaining misses are
Latin spellings the alias table lacks and a countryside address typed in Latin letters: engine work,
not a reason to change model. The decision stands: **gpt-4.1-mini is the production default**
(`DEFAULT_AI_MODEL`, stored in `ChatSettings.aiModel` by the migration).


## Held-out comparison (approved run, $0.30 limit)

The held-out set (`tests/chatbot/eval/heldout.mjs`, 51 conversations, 59 customer turns, written
after the engine was frozen, invented catalogue only) was run once per model on engine `788ffe5`
plus the measurement changes below. The runner stopped before any call whose worst-case cost would
pass a dollar cap: $0.06 for gpt-4.1-mini, $0.25 for gpt-4.1. A $0 dry run first confirmed the cap
stops before the first call.

| | No model | gpt-4.1-mini | gpt-4.1 |
| --- | --- | --- | --- |
| Turns correct | 45/59 (76.3%) | 56/59 (94.9%) | 56/59 (94.9%) |
| Hard rules (nothing invented, no silence, no private data) | 59/59 | 59/59 | 59/59 |
| Turns that used the model | 0 | 47 | 47 |
| Model calls | 0 | 51 | 50 |
| Input / output tokens (reported by the API) | 0 | 49,330 / 2,060 | 47,611 / 1,787 |
| Cost at list price | $0 | $0.0230 | $0.1095 |
| Average model call time | | 1.08 s | 0.89 s |

Total spent on this stage: $0.1325 (101 calls), under the $0.30 limit. Each model fixed 11 of the
14 rules-only misses and made no turn worse.

### By how the customer wrote

| Group | Turns | No model | gpt-4.1-mini | gpt-4.1 |
| --- | --- | --- | --- | --- |
| Latin-script Mongolian | 50 | 39 | 47 | 47 |
| English | 9 | 6 | 9 | 9 |
| Cyrillic Mongolian | 0 | | | |

The held-out set has no Cyrillic turns (it mirrors the live data, which is all Latin script).
Cyrillic results come from the main-set live subset: 48 turns containing Cyrillic, rules only 48,
gpt-4.1-mini 46, gpt-4.1 45, the engine on `main` with gpt-4.1 31. Both models miss the same two
there (an unnumbered product list, and the duration question answered without the owner's FAQ).

### By topic (held-out)

| Topic | Turns | No model | gpt-4.1-mini | gpt-4.1 |
| --- | --- | --- | --- | --- |
| Product pricing | 8 | 8 | 8 | 8 |
| Product availability | 5 | 4 | 5 | 5 |
| Usage, volume, ingredients | 8 | 4 | 8 | 7 |
| Conversation context (follow-up turns) | 12 | 11 | 11 | 11 |
| Purchase intent | 6 | 3 | 6 | 6 |
| Checkout link for the right product | 4 | 2 | 4 | 4 |
| Human handover | 3 | 0 | 2 | 3 |
| Unknown, off-topic, injection | 2 | 2 | 2 | 2 |
| Delivery, returns, payment | 8 | 6 | 7 | 7 |
| Safety and claims | 4 | 4 | 4 | 4 |
| Order status | 2 | 2 | 2 | 2 |
| Admin edits reach the next answer | 4 | 4 | 4 | 4 |
| Unsupported claims (invented amount, forbidden claim, promise, private data) | 59 | 0 | 0 | 0 |

### Every incorrect answer with a model

| Turn | gpt-4.1-mini | gpt-4.1 | What went wrong |
| --- | --- | --- | --- |
| «hed hongiin dotor irhe ve» (how many days until it arrives) | wrong | wrong | Answered with the serum's price card instead of delivery days. No false fact, but not an answer. |
| «ymar buteegdehuun zardag ve» (what do you sell) | wrong | wrong | A correct written list without numbers. The check wants a numbered list so "the second one" works; the follow-up still resolved, so customers would see a reasonable answer. |
| «hun bnu» (is there a person?) | wrong | right | gpt-4.1-mini replied with a greeting and did not hand over to staff. |
| «serumiig hed sar hereglevel deer ve» (how many months should I use it) | right | wrong | gpt-4.1 gave the "no growth promise" line instead of the published 8-week usage answer. Safe, but it withheld a fact the owner published. |

Rules-only misses (14) are listed in `EVAL_heldout.md`; all are unknown Latin spellings that fall
back to the generic line or the product card, never a false fact.

### Recommendation

Use gpt-4.1-mini. It matches gpt-4.1 on this set (56/59 each, one different miss each, which is
within the noise of a single run), costs about 4.8× less (about $0.002 per five-turn conversation
against $0.009), and breaks nothing the rules handle. Before or with the switch, add rules for the
two shared misses and for "hun bnu"-style person requests, then move those held-out cases into the
main set and write new held-out cases, so the held-out score stays honest.

The four findings above are model-independent engine work, not reasons to pay for gpt-4.1.

## Earlier comparison (main-set subset)

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
