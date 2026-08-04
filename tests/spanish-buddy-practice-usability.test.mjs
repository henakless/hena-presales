import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { applyExerciseUsabilityGuardrails, auditExerciseUsability } from "../lib/spanish-buddy-practice-usability.ts";

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

const baseExercise = {
  exerciseType: "own-sentence",
  instruction: "Escribe una frase.",
  context: "",
  prompt: "Escribe una frase con «amistad».",
  answer: "La amistad es importante para mí.",
  answerTranslation: "Freundschaft ist für mich wichtig.",
  options: [],
  acceptedAnswers: [],
  germanSupport: "Freundschaft ist für mich wichtig.",
  grammarReminder: "La amistad es importante para mí.",
  strongerHint: "Beschreibe eine persönliche Beziehung.",
};

test("replaces generated basic help with a safe exercise-type strategy", () => {
  const guarded = applyExerciseUsabilityGuardrails(baseExercise);
  assert.notEqual(guarded.germanSupport, baseExercise.germanSupport);
  assert.equal(guarded.grammarReminder, "");
  assert.equal(guarded.strongerHint, baseExercise.strongerHint);
  assert.equal(auditExerciseUsability(guarded).usable, true);
});

test("requires two to four unique options containing one correct answer for selection tasks", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "grammar-choice",
    answer: "Cuál",
    answerTranslation: "Welches",
    options: ["Cuál"],
  });
  assert.ok(audit.issues.some((issue) => issue.code === "INVALID_MULTIPLE_CHOICE_OPTIONS"));
});

test("accepts a meaningful binary grammar contrast without padding it to four options", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "grammar-choice",
    context: "Hay dos opciones conocidas.",
    prompt: "¿___ prefieres?",
    answer: "Cuál",
    answerTranslation: "Welche",
    options: ["Qué", "Cuál"],
  });
  assert.equal(audit.usable, true, JSON.stringify(audit.issues));
});

test("accepts a fill-gap exercise with one blank and four selectable answers", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "vocabulary-gap",
    instruction: "Elige la opción que completa el hueco.",
    prompt: "Cuando no tengo nada que hacer, siento ___.",
    answer: "aburrimiento",
    answerTranslation: "Langeweile",
    options: ["aburrimiento", "entusiasmo", "cansancio", "hambre"],
  });
  assert.equal(audit.usable, true, JSON.stringify(audit.issues, null, 2));
});

test("rejects a fill-gap exercise without a visible gap or four choices", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "vocabulary-gap",
    prompt: "el aburrimiento",
    answer: "Langeweile",
    answerTranslation: "Langeweile",
    options: [],
  });
  assert.ok(audit.issues.some((issue) => issue.code === "FILL_GAP_MISSING"));
  assert.ok(audit.issues.some((issue) => issue.code === "INVALID_MULTIPLE_CHOICE_OPTIONS"));
});

test("rejects German lesson explanations and mismatched shapes as Spanish answer options", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "grammar-choice",
    context: "¿Dónde está la farmacia?",
    prompt: "¿Qué? ¿Quién? ¿Cómo? ¿Dónde? ¿Cuándo? ¿Cuánto?",
    answer: "Fragewörter für Informationen über Dinge, Personen, Art und Weise, Ort, Zeit und Menge.",
    answerTranslation: "Fragewörter für Informationen über Dinge, Personen, Art und Weise, Ort, Zeit und Menge.",
    options: [
      "Fragewörter für Informationen über Dinge, Personen, Art und Weise, Ort, Zeit und Menge.",
      "Substantive mit diesen Endungen sind meistens feminin und stehen mit la.",
      "Substantive mit diesen Endungen sind meistens maskulin und stehen mit el. Bei Personen kann das Geschlecht variieren.",
      "Nuestra amistad dura muchos años.",
    ],
  });
  assert.ok(audit.issues.some((issue) => issue.code === "NON_SPANISH_MULTIPLE_CHOICE_CONTENT"));
  assert.ok(audit.issues.some((issue) => issue.code === "INCONSISTENT_MULTIPLE_CHOICE_OPTIONS"));
});

test("requires a full reading context and an explicit comprehension question", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "reading-detail",
    context: "Ana trabaja el sábado.",
    prompt: "El trabajo de Ana",
  });
  assert.ok(audit.issues.some((issue) => issue.code === "READING_CONTEXT_LENGTH"));
  assert.ok(audit.issues.some((issue) => issue.code === "READING_QUESTION_MISSING"));
});

test("rejects a sentence-order task whose context nearly gives the solved sentence", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "sentence-order",
    context: "Hoy Pablo ha terminado sus deberes.",
    prompt: "Ordena: terminado / Hoy / los deberes / ha / Pablo",
    answer: "Hoy Pablo ha terminado los deberes.",
    answerTranslation: "Heute hat Pablo die Hausaufgaben beendet.",
  });
  assert.ok(audit.issues.some((issue) => issue.code === "ANSWER_IN_TASK_CONTEXT"));
});

test("rejects a sentence-order task that does not provide shuffled fragments", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "sentence-order",
    instruction: "Ordena los fragmentos.",
    context: "Ana ya ha prestado los apuntes a Miguel.",
    prompt: "¿Cuál es el orden correcto?",
    answer: "Ana se los ha prestado.",
    answerTranslation: "Ana hat sie ihm geliehen.",
  });
  assert.ok(audit.issues.some((issue) => issue.code === "SENTENCE_ORDER_FRAGMENTS_MISSING"));
});

test("rejects an open-response task whose instruction promises selectable options", () => {
  const audit = auditExerciseUsability({
    ...applyExerciseUsabilityGuardrails(baseExercise),
    exerciseType: "reading-main-idea",
    instruction: "Lee el texto y elige la idea principal.",
    context: Array.from({ length: 50 }, (_, index) => `palabra${index}`).join(" "),
    prompt: "¿Cuál es la idea principal?",
    options: [],
  });
  assert.ok(audit.issues.some((issue) => issue.code === "SELECTION_INSTRUCTION_WITHOUT_OPTIONS"));
});
