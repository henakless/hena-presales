import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { ACTIVE_EXERCISE_IDS, EXERCISE_LIBRARY } from "../../lib/spanish-buddy-exercises.ts";
import { createSpanishBuddyPracticeSchema, SPANISH_BUDDY_PRACTICE_INSTRUCTIONS } from "../../lib/spanish-buddy-practice-contract.mjs";
import { applyExerciseUsabilityGuardrails } from "../../lib/spanish-buddy-practice-usability.ts";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const outputPath = path.resolve(valueAfter("--output") ?? "evals/spanish-buddy/generated-exercises.jsonl");
const variantsPerType = Math.max(1, Math.min(5, Number(valueAfter("--variants") ?? 3)));
const model = valueAfter("--model") ?? process.env.OPENAI_MODEL ?? "gpt-5.6-terra";
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required. Run with node --env-file=.env.local or export the variable.");
const practiceSchema = createSpanishBuddyPracticeSchema(ACTIVE_EXERCISE_IDS, 8);

const sourceItems = {
  vocabulary: [
    { kind: "vocabulary", learningType: "word", spanish: "la amistad", translation: "die Freundschaft", explanation: "Sustantivo femenino.", example: "La amistad es muy importante para mí." },
    { kind: "vocabulary", learningType: "word", spanish: "el aburrimiento", translation: "die Langeweile", explanation: "Sustantivo masculino.", example: "El aburrimiento me hizo salir a pasear." },
    { kind: "vocabulary", learningType: "collocation", spanish: "hablar con", translation: "sprechen mit", explanation: "Se usa con la preposición con.", example: "Hablo con mis vecinos todos los días." },
    { kind: "vocabulary", learningType: "collocation", spanish: "alojarse en", translation: "übernachten in", explanation: "Verbo pronominal seguido de en.", example: "Nos alojamos en un hotel pequeño." },
  ],
  communication: [
    { kind: "vocabulary", learningType: "fixed_expression", spanish: "Gracias por la invitación.", translation: "Danke für die Einladung.", explanation: "Respuesta cortés a una invitación.", example: "Gracias por la invitación, allí estaré." },
    { kind: "vocabulary", learningType: "sentence_pattern", spanish: "Me gustaría…, pero…", translation: "Ich würde gerne…, aber…", explanation: "Patrón para rechazar algo cortésmente.", example: "Me gustaría ir, pero tengo que trabajar." },
  ],
  grammar: [
    { kind: "grammar", learningType: "conjugation", spanish: "El condicional", translation: "das Konditional", explanation: "Las terminaciones -ía, -ías, -ía, -íamos, -íais, -ían se añaden al infinitivo. Se usa para peticiones, deseos y situaciones hipotéticas.", example: "¿Podrías ayudarme?" },
    { kind: "grammar", learningType: "grammar_rule", spanish: "Pronombres de objeto directo e indirecto", translation: "direkte und indirekte Objektpronomen", explanation: "El pronombre indirecto precede al directo; le y les se convierten en se delante de lo, la, los o las.", example: "Pedro se las ha regalado." },
    { kind: "grammar", learningType: "conjugation", spanish: "Pretérito perfecto", translation: "Perfekt", explanation: "Se forma con haber en presente y el participio. Se usa para experiencias y acciones conectadas con el presente.", example: "Esta semana he hablado con Ana." },
    { kind: "grammar", learningType: "grammar_rule", spanish: "Contraste entre qué y cuál", translation: "Unterschied zwischen qué und cuál", explanation: "Qué pide una definición o información abierta; cuál selecciona entre opciones conocidas.", example: "Tengo dos camisas. ¿Cuál prefieres?" },
  ],
};
sourceItems.reading = [...sourceItems.vocabulary, ...sourceItems.communication];

function outputText(response) {
  if (response.output_text) return response.output_text;
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) if (content.type === "output_text" && content.text) return content.text;
  }
  return null;
}

function groups(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, index * size + size));
}

function compatibleSourceItems(exerciseType, category) {
  const pool = sourceItems[category];
  if (["conjugation-dice", "conjugation-context"].includes(exerciseType)) {
    return pool.filter((item) => item.learningType === "conjugation");
  }
  if (exerciseType === "complete-rule") {
    return pool.filter((item) => item.learningType === "grammar_rule");
  }
  if (exerciseType === "pronoun-substitution") {
    return pool.filter((item) => /pronomb|objeto (?:directo|indirecto)/i.test(`${item.spanish} ${item.explanation}`));
  }
  return pool;
}

function exerciseInput(exerciseType, variant) {
  const definition = EXERCISE_LIBRARY.find((entry) => entry.id === exerciseType);
  const category = definition.category === "reading" ? "reading" : definition.category;
  const pool = compatibleSourceItems(exerciseType, category);
  const item = pool[(ACTIVE_EXERCISE_IDS.indexOf(exerciseType) + variant) % pool.length];
  const itemId = `eval-${variant + 1}-${exerciseType}`;
  return {
    requested: {
      itemId,
      lessonId: "eval-lesson",
      exerciseType,
      exerciseName: definition.name,
      interactionMode: definition.mode,
      exerciseRule: definition.rule,
      example: { prompt: definition.examplePrompt, answer: definition.exampleAnswer },
      avoidPreviousPrompts: [],
      targetItem: item,
    },
    contextItem: { id: itemId, ...item },
  };
}

const rows = [];
const usages = [];
for (let variant = 0; variant < variantsPerType; variant += 1) {
  for (const exerciseTypes of groups(ACTIVE_EXERCISE_IDS, 8)) {
    const inputs = exerciseTypes.map((exerciseType) => exerciseInput(exerciseType, variant));
    process.stdout.write(`Generating variant ${variant + 1}/${variantsPerType}: ${exerciseTypes.join(", ")}\n`);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "low" },
        instructions: SPANISH_BUDDY_PRACTICE_INSTRUCTIONS,
        input: [{
          role: "user",
          content: JSON.stringify({
            requested: inputs.map((entry) => entry.requested),
            lessonContexts: { "eval-lesson": inputs.map((entry) => entry.contextItem) },
          }),
        }],
        text: { verbosity: "low", format: { type: "json_schema", name: "spanish_practice_session", strict: true, schema: practiceSchema } },
        max_output_tokens: 3600,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`Generation failed (${response.status}): ${body.error?.message ?? "unknown error"}`);
    const text = outputText(body);
    if (!text) throw new Error("Generation returned no output text.");
    const parsed = JSON.parse(text);
    for (const exerciseType of exerciseTypes) {
      const expectedId = `eval-${variant + 1}-${exerciseType}`;
      const exercise = (parsed.exercises ?? []).find((entry) => entry.itemId === expectedId && entry.exerciseType === exerciseType);
      if (exercise) {
        rows.push({
          id: `${exerciseType}-${variant + 1}`,
          rawHelp: { germanSupport: exercise.germanSupport, grammarReminder: exercise.grammarReminder },
          exercise: applyExerciseUsabilityGuardrails(exercise),
        });
      }
    }
    usages.push(body.usage ?? {});
  }
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
const coverage = Object.fromEntries(ACTIVE_EXERCISE_IDS.map((exerciseType) => [exerciseType, rows.filter((row) => row.exercise.exerciseType === exerciseType).length]));
const usage = usages.reduce((total, current) => ({
  inputTokens: total.inputTokens + (current.input_tokens ?? 0),
  outputTokens: total.outputTokens + (current.output_tokens ?? 0),
  totalTokens: total.totalTokens + (current.total_tokens ?? 0),
}), { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
process.stdout.write(`${JSON.stringify({ output: outputPath, model, total: rows.length, requestedPerType: variantsPerType, coverage, usage }, null, 2)}\n`);
if (rows.length !== ACTIVE_EXERCISE_IDS.length * variantsPerType) process.exitCode = 1;
