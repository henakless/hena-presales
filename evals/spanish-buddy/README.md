# SpanishBuddy exercise usability eval

This eval checks the learner-visible structure of generated practice exercises. It focuses on answer leakage, repeated content, task coherence, option plausibility, language consistency, and whether the basic and stronger help levels contain distinct information. The fixture set includes regressions reconstructed from real learner screenshots.

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

It also scores `taskCoherence` and `optionQuality` from 0 to 3. A score below 2 in either dimension forces the semantic result to unusable, even if the model's initial boolean judgment was more lenient. See `coherence-eval-2026-08-05.md` for the screenshot-driven regression and latest 72-exercise results.

## Collect real generated exercises

Generate three fresh variants for every active exercise type using the production model, schema, exercise catalogue, and prompt:

```sh
npm run eval:collect
```

The collector calls the Responses API directly and does not modify a learner's library or cache. Each row preserves the model's raw basic-help fields under `rawHelp` and stores the exercise after the same server-owned basic-help guardrail used in production. The subsequent eval applies the production usability gate. By default it writes `evals/spanish-buddy/generated-exercises.jsonl`. Useful options are:

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

## Upload capacity and timing benchmark

The upload benchmark measures the complete extraction path at 1, 2, 4, and 6 images with the same controlled concurrency of two used by the product. It records source preparation time, each page's HTTP status and extraction duration, end-to-end duration, extracted item count, source-deletion confirmation, and the highest image count that completed successfully. It writes both JSON and Markdown reports. Use `--concurrency 1` to compare against the previous sequential behavior.

By default it performs a cost-free dry run: six synthetic 3024×4032 Spanish-note photos are generated at approximately 3.5 MB each and passed through the same 2,000 px / JPEG quality 84 preparation settings as the browser.

```sh
npm run eval:uploads
```

To exercise the deployed API and OpenAI extraction, opt in explicitly:

```sh
npm run eval:uploads -- \
  --live \
  --base-url https://henakless.com/spanishbuddy \
  --output evals/spanish-buddy/upload-benchmark-report.json
```

The default live matrix makes 13 extraction requests. Use `--counts 6` for a cheaper single six-page capacity check, or `--counts 1,2,4,6 --repetitions 3` for a more meaningful latency distribution. `--pause-ms` controls the pause between scenarios; use `--pause-ms 60000` for repeated production runs if the report shows HTTP 429 rate limiting.

Real photos can replace the generated fixtures. Files are read in filename order and are never modified:

```sh
npm run eval:uploads -- \
  --live \
  --base-url https://henakless.com/spanishbuddy \
  --image-dir /absolute/path/to/test-photos \
  --counts 1,2,4,6
```

Live extraction does not save lessons or modify a learner library. Uploaded sources are expected to be deleted by the extraction endpoint, and a scenario fails unless every response confirms deletion.
