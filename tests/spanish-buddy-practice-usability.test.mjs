import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { auditExerciseUsability } from "../lib/spanish-buddy-practice-usability.ts";

const cases = fs.readFileSync(new URL("../evals/spanish-buddy/usability-cases.jsonl", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

for (const testCase of cases) {
  test(`exercise usability: ${testCase.id}`, () => {
    const audit = auditExerciseUsability(testCase.exercise);
    assert.equal(audit.usable, testCase.expectedUsable, JSON.stringify(audit.issues, null, 2));
    if (testCase.expectedIssue) {
      assert.ok(audit.issues.some((issue) => issue.code === testCase.expectedIssue), JSON.stringify(audit.issues, null, 2));
    }
  });
}
