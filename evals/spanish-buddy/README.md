# SpanishBuddy exercise usability eval

This eval checks the learner-visible structure of generated practice exercises. It focuses on answer leakage, repeated content, duplicate options, and whether the basic and stronger help levels contain distinct information.

## Run the deterministic eval

From `site/`:

```sh
npm run eval:usability
```

The default input is `evals/spanish-buddy/usability-cases.jsonl`. Supply generated exercises and save a report with:

```sh
node evals/spanish-buddy/run-usability.mjs \
  --input path/to/generated-exercises.jsonl \
  --output path/to/usability-report.json
```

Each JSONL row has this shape:

```json
{
  "id": "exercise-001",
  "exercise": {
    "exerciseType": "conjugation-context",
    "instruction": "Completa la frase.",
    "context": "...",
    "prompt": "...",
    "answer": "...",
    "answerTranslation": "...",
    "options": [],
    "acceptedAnswers": [],
    "germanSupport": "...",
    "grammarReminder": "...",
    "strongerHint": "..."
  }
}
```

`expectedUsable` and `expectedIssue` are optional fixture assertions. The runner exits with status 1 when an asserted expectation does not match the deterministic audit.

## Add the semantic model grader

The optional model grader catches paraphrased or translated leakage that exact text comparisons cannot reliably detect:

```sh
OPENAI_API_KEY=... npm run eval:usability -- --model
```

Set `OPENAI_EVAL_MODEL` to evaluate with a different model. The model grader is for offline analysis; production blocking uses only deterministic checks to avoid adding latency and model variance to practice generation.

The model scores answer leakage and repetition from 0 (none) to 3 (direct or severe). `helpProgression` ranges from 0 (the help levels are redundant or misplaced) to 3 (each level adds useful information at the right time).

## Collect real generated exercises

Generate three fresh variants for every active exercise type using the production model, schema, exercise catalogue, and prompt:

```sh
npm run eval:collect
```

The collector calls the Responses API directly and does not modify a learner's library or cache. It intentionally captures raw structured generations before the production usability gate filters them. By default it writes `evals/spanish-buddy/generated-exercises.jsonl`. Useful options are:

```sh
npm run eval:collect -- \
  --variants 3 \
  --model gpt-5.6-terra \
  --output evals/spanish-buddy/generated-exercises.jsonl
```

Follow collection with deterministic and semantic grading:

```sh
npm run eval:usability -- --input evals/spanish-buddy/generated-exercises.jsonl
node --env-file=.env.local evals/spanish-buddy/run-usability.mjs \
  --input evals/spanish-buddy/generated-exercises.jsonl \
  --output evals/spanish-buddy/generated-usability-report.json \
  --model
```

## Production behavior

The same deterministic audit runs after a generated exercise is normalized and before it is cached. Cached exercises are audited again when loaded. Exercises with blocking usability issues are discarded, and the server logs issue codes and affected fields without logging lesson or answer content.
