import assert from "node:assert/strict";
import test from "node:test";

import { inferLearningType } from "../lib/spanish-buddy.ts";

const vocabulary = (spanish) => ({ kind: "vocabulary", spanish, explanation: "" });

test("keeps multiword dictionary headwords in vocabulary", () => {
  assert.equal(inferLearningType(vocabulary("la sencillez")), "word");
  assert.equal(inferLearningType(vocabulary("el/la carterista")), "word");
  assert.equal(inferLearningType(vocabulary("redes sociales")), "word");
});

test("keeps verbs with governed complements as collocations", () => {
  assert.equal(inferLearningType(vocabulary("hablar con")), "collocation");
  assert.equal(inferLearningType(vocabulary("ir a")), "collocation");
  assert.equal(inferLearningType(vocabulary("alojarse en")), "collocation");
});

test("separates complete expressions and grammar", () => {
  assert.equal(inferLearningType(vocabulary("Gracias por la invitación.")), "fixed_expression");
  assert.equal(inferLearningType({ kind: "grammar", spanish: "Condicional", explanation: "Terminaciones y formas irregulares" }), "conjugation");
});
