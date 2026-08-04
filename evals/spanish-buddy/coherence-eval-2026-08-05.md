# SpanishBuddy coherence regression eval

Run: 2026-08-05

## Regression that triggered this pass

A production screenshot showed a generic deterministic `grammar-choice` fallback whose prompt listed Spanish question words while its correct option and two distractors were unrelated German lesson explanations. After submission, the selected answer was repeated in the feedback message, reference answer, and identical German translation.

The screenshot structure is preserved as `screenshot-incoherent-grammar-choice` in `usability-cases.jsonl` and is rejected by the deterministic evaluator.

## Changes evaluated

- Generic deterministic multiple-choice fallbacks are no longer generated.
- Cached variants are rejected when Spanish selection tasks contain German lesson content or strongly inconsistent option shapes.
- Sentence ordering requires visible shuffled fragments.
- Open-response instructions cannot tell the learner to choose when no options exist.
- Selection tasks allow 2–4 meaningful options instead of padding binary contrasts to four.
- The generation contract forbids multiple valid options, accepted answers as distractors, fake error-correction tasks, and mediation prompts that paraphrase the answer-bearing facts.
- Correct button answers are not repeated in the feedback/reference panel, and identical answer translations are hidden.
- The semantic grader now scores `taskCoherence` and `optionQuality`; either score below 2 forces an unusable result.

## Final 72-exercise sample

Coverage: 24 active types × 3 generations using `gpt-5.6-terra`.

| Gate | Passed | Rate |
|---|---:|---:|
| Deterministic production gate, at generation time | 71/72 | 98.6% |
| Expanded semantic coherence grader | 70/72 | 97.2% |
| Final deterministic gate after adding the open-response wording check | 70/72 | 97.2% |

The final deterministic gate rejected one 41-word reading passage and one reading task that said “elige” despite having no options. The semantic grader additionally rejected one `grammar-choice` sample whose `Quién` and `Cuánto` distractors were weak for a `qué`/`cuál` contrast. The final 2–4 option contract directly addresses that padding failure for future generations.

The immediately preceding sample was intentionally useful as a variance check: only 61/72 passed the expanded semantic rubric. Its failures exposed ambiguous synonyms, fake corrections, missing ordering fragments, and answer-paraphrasing mediation prompts; those patterns were converted into the contract and deterministic checks used by the final sample.

## Run again

From `site/`:

```sh
npm run test:usability
npm run eval:collect -- --output /private/tmp/spanishbuddy-coherence.jsonl
node --env-file=.env.local evals/spanish-buddy/run-usability.mjs \
  --input /private/tmp/spanishbuddy-coherence.jsonl \
  --output /private/tmp/spanishbuddy-coherence-report.json \
  --model
```

Use multiple runs when calibrating prompts: generative variance is material, so a single high score should not be treated as a permanent guarantee.
