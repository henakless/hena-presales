# SpanishBuddy generated exercise usability results

Generated: 2026-08-04

## Coverage

- Model: `gpt-5.6-terra`
- 24 active exercise types
- 3 fresh variants per type
- 72 generations in each baseline
- Fixed-baseline generation usage: 22,839 input tokens; 12,851 output tokens; 35,690 total tokens
- Fixed-baseline semantic grading usage: 32,924 input tokens; 20,305 output tokens; 53,229 total tokens

Both baselines used synthetic A2-B1 Spanish/German lesson items and the production model, schema, exercise catalogue, and generation instructions. The fixed collector also applies the same server-owned basic-help guardrail as production.

## Before and after

| Measure | Before | After | Change |
|---|---:|---:|---:|
| Semantic usability | 44/72 (61.1%) | 60/72 (83.3%) | +16 exercises / +22.2 pp |
| Repetition severity 2–3 | 25/72 | 6/72 | -19 |
| Poor help progression 0–1 | 24/72 | 16/72 | -8 |
| Generated basic-help leaks reaching display | 3/72 | 0/72 | -3 |
| Deterministic production gate accepted | 69/72 | 66/72 | stricter post-fix gate |

The lower deterministic acceptance rate is intentional. The production gate now rejects four reading passages outside the 45–90 word contract, one repeated context/prompt, and one sentence-order task whose context nearly displays the solved sentence. Previously, those structural problems passed.

## Implemented guardrails

1. Basic help is no longer model-authored. The server inserts a safe German strategy for each of the 24 active exercise types and removes the generated grammar reminder.
2. Fresh and cached exercises pass the same audit before display. Invalid cached rows are discarded.
3. The gate rejects repeated text, direct basic-help answer leakage, duplicate or malformed multiple-choice options, options on non-choice exercises, malformed reading tasks, and solved sentence-order contexts.
4. The generation contract requires distinct field roles, 45–90 word readings, explicit comprehension questions, consistent context/prompt facts, and type-correct task structure.
5. The practice planner only pairs conjugation, rule-completion, and pronoun-substitution exercises with compatible learning items.

## Remaining advisory findings

The semantic grader marked 12/72 fixed-baseline exercises unusable. Most findings concern the optional `strongerHint`: a useful assisted hint can make a multiple-choice answer uniquely identifiable even though the basic panel remains safe. This is a product-calibration question, so it is not a production blocker. Two genuine type/item mismatches in this already-generated sample motivated the planner compatibility fix; a future collection will exercise that final change.

Semantic grading stays offline because it is probabilistic and would add latency and cost to learner sessions. Deterministic failures are production blockers.

## Artifacts

- `generated-exercises.jsonl` and `generated-semantic-report.json`: pre-fix baseline.
- `generated-exercises-fixed.jsonl`: fixed generated sample, including raw generated help and server-guarded exercises.
- `generated-deterministic-report-fixed.json`: final deterministic audit with the stricter gate.
- `generated-semantic-report-fixed.json`: post-fix semantic grades and evidence.
- `fixture-usability-report.json`: focused detector fixtures.
