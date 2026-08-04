import assert from "node:assert/strict";
import test from "node:test";

import { parseCounts, summarizeScenarios } from "../evals/spanish-buddy/run-upload-benchmark.mjs";

test("upload benchmark accepts unique image counts up to the product limit", () => {
  assert.deepEqual(parseCounts("6,1,4,2,4"), [1, 2, 4, 6]);
  assert.throws(() => parseCounts("0,7"), /values from 1 to 6/i);
});

test("upload benchmark reports capacity and latency percentiles", () => {
  const scenarios = [
    { imageCount: 1, success: true, pages: [{ success: true, durationMs: 1_000 }] },
    { imageCount: 2, success: true, pages: [{ success: true, durationMs: 2_000 }, { success: true, durationMs: 3_000 }] },
    { imageCount: 6, success: false, pages: [{ success: false, durationMs: 4_000 }] },
  ];
  assert.deepEqual(summarizeScenarios(scenarios), {
    successfulScenarios: 2,
    highestSuccessfulImageCount: 2,
    pageDurationMs: { p50: 2_000, p95: 3_000, max: 3_000 },
  });
});
