import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_EXERCISE_IDS,
  EXERCISE_LIBRARY,
  EXERCISE_MODES,
  EXERCISE_PRESETS,
} from "../lib/spanish-buddy-exercises.ts";

test("every Spanish Buddy exercise has a supported primary activity mode", () => {
  const supportedModes = new Set(EXERCISE_MODES.map((mode) => mode.id));
  assert.ok(EXERCISE_LIBRARY.every((exercise) => supportedModes.has(exercise.mode)));
});

test("practice presets cover the intended activity modes", () => {
  const modesFor = (id) => EXERCISE_PRESETS.find((preset) => preset.id === id)?.modes;
  assert.deepEqual(modesFor("quick"), ["multiple-choice", "fill-gap"]);
  assert.deepEqual(modesFor("public"), ["multiple-choice", "fill-gap", "writing", "reading"]);
  assert.deepEqual(modesFor("hands-free"), ["listening", "speaking"]);
  assert.equal(modesFor("full"), undefined);
});

test("multiple-choice is an explicit contract for the three selectable exercise types", () => {
  const multipleChoiceIds = EXERCISE_LIBRARY
    .filter((exercise) => exercise.status === "active" && exercise.mode === "multiple-choice")
    .map((exercise) => exercise.id);
  assert.deepEqual(multipleChoiceIds, ["lexical-contrast", "grammar-choice", "appropriate-response"]);
  assert.ok(multipleChoiceIds.every((id) => ACTIVE_EXERCISE_IDS.includes(id)));
});
