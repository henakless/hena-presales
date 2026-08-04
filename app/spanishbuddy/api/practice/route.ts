import {
  ACTIVE_EXERCISE_IDS,
  EXERCISE_LIBRARY,
  isActiveExerciseId,
  type ExerciseCategory,
} from "../../../../lib/spanish-buddy-exercises";
import { MAX_LESSON_ITEMS, resolveLearningType, type LearningType, type SavedItem } from "../../../../lib/spanish-buddy";
import {
  applyExerciseUsabilityGuardrails,
  auditExerciseUsability,
  type PracticeExerciseForAudit,
} from "../../../../lib/spanish-buddy-practice-usability";
import {
  ensureSpanishBuddySchema,
  getOwner,
  getSpanishBuddyDatabase,
  jsonWithOwner,
} from "../../../../lib/spanish-buddy-server";
import {
  deterministicPracticeExercise,
  scheduleSpanishBuddyExerciseRefill,
  spanishBuddyItemContentHash,
  type ExercisePlan,
} from "../../../../lib/spanish-buddy-exercise-cache";

export const runtime = "edge";

const MAX_SESSION_SIZE = 8;

type ItemRow = {
  id: string;
  lesson_id: string;
  lesson_title: string;
  kind: "vocabulary" | "grammar";
  learning_type: LearningType;
  spanish: string;
  translation: string;
  explanation: string;
  example: string;
  accepted_answers: string;
  provenance: "course" | "suggested";
  mastery: number;
  attempts: number;
  correct_count: number;
  next_review_at: string;
};

type PracticeExercise = PracticeExerciseForAudit & {
  itemId: string;
  label: string;
  gradingFocus: string;
};

type CachedRow = { id: string; payload: string; use_count: number; last_used_at: string | null; created_at: string };
type UsageRow = { exercise_type: string; total_uses: number };
type RecentUsageRow = { item_id: string; exercise_type: string; recent_uses: number };

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}


function acceptedAnswers(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function mapItem(row: ItemRow): SavedItem {
  const item = {
    id: row.id,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    kind: row.kind,
    learningType: row.learning_type,
    spanish: row.spanish,
    translation: row.translation,
    explanation: row.explanation,
    example: row.example,
    acceptedAnswers: acceptedAnswers(row.accepted_answers),
    provenance: row.provenance,
    mastery: row.mastery,
    attempts: row.attempts,
    correctCount: row.correct_count,
    nextReviewAt: row.next_review_at,
  };
  const learningType = resolveLearningType(item, row.learning_type);
  return { ...item, learningType };
}

function compatibleItems(exerciseType: string, category: ExerciseCategory, items: SavedItem[]) {
  if (category === "vocabulary") return items.filter((item) => item.kind === "vocabulary");
  if (category === "grammar") {
    const grammarItems = items.filter((item) => item.kind === "grammar");
    if (["conjugation-dice", "conjugation-context"].includes(exerciseType)) {
      return grammarItems.filter((item) => item.learningType === "conjugation");
    }
    if (exerciseType === "complete-rule") {
      return grammarItems.filter((item) => item.learningType === "grammar_rule");
    }
    if (exerciseType === "pronoun-substitution") {
      return grammarItems.filter((item) => /pronomb|objeto (?:directo|indirecto)/i.test(`${item.spanish} ${item.explanation}`));
    }
    return grammarItems;
  }
  if (category === "communication") {
    const preferred = items.filter((item) => item.kind === "vocabulary" && ["collocation", "fixed_expression", "sentence_pattern"].includes(item.learningType));
    return preferred.length ? preferred : items.filter((item) => item.kind === "vocabulary");
  }
  return items;
}

function interleavedDefinitions(selectedIds: string[], useCounts: Map<string, number>) {
  const categories: ExerciseCategory[] = ["vocabulary", "grammar", "communication", "reading"];
  const queues = new Map(categories.map((category) => [category, EXERCISE_LIBRARY
    .filter((exercise) => exercise.status === "active" && exercise.category === category && selectedIds.includes(exercise.id))
    .sort((a, b) => (useCounts.get(a.id) ?? 0) - (useCounts.get(b.id) ?? 0))]));
  const result = [];
  while (result.length < selectedIds.length) {
    let moved = false;
    for (const category of categories) {
      const next = queues.get(category)?.shift();
      if (next) {
        result.push(next);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return result;
}

function randomUnit() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 0x1_0000_0000;
}

function weightedItem(
  candidates: SavedItem[],
  exerciseType: string,
  recentUses: Map<string, number>,
  alreadyPlanned: Set<string>,
) {
  const now = Date.now();
  const weighted = candidates.map((item) => {
    const overdueDays = Math.max(0, (now - new Date(item.nextReviewAt).getTime()) / 86_400_000);
    const learningPriority = 1 + Math.min(8, overdueDays) + (100 - item.mastery) / 18 + (item.attempts > item.correctCount ? 1.5 : 0);
    const recentPenalty = 1 + (recentUses.get(`${item.id}:${exerciseType}`) ?? 0) * 2.5;
    const sessionPenalty = alreadyPlanned.has(item.id) ? 3 : 1;
    return { item, weight: Math.max(.05, learningPriority / recentPenalty / sessionPenalty) };
  });
  let cursor = randomUnit() * weighted.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.item;
  }
  return weighted.at(-1)!.item;
}

function chooseCachedVariant(rows: CachedRow[]) {
  if (!rows.length) return null;
  const cooldown = Date.now() - 7 * 86_400_000;
  const eligible = rows.filter((row) => !row.last_used_at || new Date(row.last_used_at).getTime() < cooldown);
  const pool = (eligible.length ? eligible : rows).slice(0, 3);
  return pool[Math.floor(randomUnit() * pool.length)];
}

function normalizeExercise(value: PracticeExercise, planned: { item: SavedItem; exerciseType: string }) {
  if (value.itemId !== planned.item.id || value.exerciseType !== planned.exerciseType) return null;
  const definition = EXERCISE_LIBRARY.find((entry) => entry.id === planned.exerciseType);
  if (!definition) return null;
  const prompt = clean(value.prompt, 900);
  const instruction = clean(value.instruction, 260);
  const answer = clean(value.answer, 600);
  const answerTranslation = clean(value.answerTranslation, 700);
  const germanSupport = clean(value.germanSupport, 700);
  const strongerHint = clean(value.strongerHint, 700);
  if (!instruction || !prompt || !answer || !answerTranslation || !strongerHint) return null;
  const options = Array.isArray(value.options)
    ? [...new Set(value.options.map((entry) => clean(entry, 240)).filter(Boolean))].slice(0, 4)
    : [];
  if (options.length && !options.some((option) => option.toLocaleLowerCase("es") === answer.toLocaleLowerCase("es"))) {
    if (options.length >= 4) options[options.length - 1] = answer;
    else options.push(answer);
  }
  const matchingAnswers = options.filter((option) => option.toLocaleLowerCase("es") === answer.toLocaleLowerCase("es"));
  if (definition.mode === "multiple-choice" && (options.length !== 4 || matchingAnswers.length !== 1)) return null;
  if (definition.mode !== "multiple-choice" && options.length > 0) return null;
  const exercise = applyExerciseUsabilityGuardrails({
    itemId: planned.item.id,
    exerciseType: planned.exerciseType,
    label: clean(value.label, 80) || "Práctica",
    instruction,
    context: clean(value.context, 1400),
    prompt,
    answer,
    answerTranslation,
    options: options.slice(0, 4),
    acceptedAnswers: Array.isArray(value.acceptedAnswers)
      ? [...new Set(value.acceptedAnswers.map((entry) => clean(entry, 300)).filter(Boolean))].slice(0, 6)
      : [],
    gradingFocus: clean(value.gradingFocus, 220),
    germanSupport,
    grammarReminder: clean(value.grammarReminder, 400),
    strongerHint,
  } satisfies PracticeExercise);
  const audit = auditExerciseUsability(exercise);
  if (!audit.usable) {
    console.warn("Spanish Buddy rejected an unusable exercise", {
      itemId: planned.item.id,
      exerciseType: planned.exerciseType,
      issues: audit.issues.map((issue) => ({ code: issue.code, fields: issue.fields })),
    });
    return null;
  }
  return exercise;
}

export async function POST(request: Request) {
  const { ownerId, setCookie } = getOwner(request);
  let payload: { itemIds?: unknown; selectedTypes?: unknown; sessionSize?: unknown };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return jsonWithOwner({ error: "No se ha podido preparar la práctica." }, 400, setCookie);
  }

  const itemIds = Array.isArray(payload.itemIds)
    ? [...new Set(payload.itemIds.filter((value): value is string => typeof value === "string").map((value) => value.slice(0, 80)))].slice(0, MAX_LESSON_ITEMS)
    : [];
  const selectedTypes = Array.isArray(payload.selectedTypes)
    ? [...new Set(payload.selectedTypes.filter(isActiveExerciseId))]
    : [...ACTIVE_EXERCISE_IDS];
  const requestedSessionSize = typeof payload.sessionSize === "number" && Number.isFinite(payload.sessionSize)
    ? Math.round(payload.sessionSize)
    : MAX_SESSION_SIZE;
  const sessionSize = Math.max(3, Math.min(MAX_SESSION_SIZE, requestedSessionSize));
  if (!selectedTypes.length) return jsonWithOwner({ error: "Selecciona al menos un tipo de ejercicio." }, 400, setCookie);

  try {
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const itemFilter = itemIds.length ? `AND i.id IN (${itemIds.map(() => "?").join(",")})` : "";
    const itemResult = await db.prepare(
      `SELECT i.id, i.lesson_id, l.title AS lesson_title, i.kind, i.learning_type, i.spanish,
              i.translation, i.explanation, i.example, i.accepted_answers, i.provenance,
              i.mastery, i.attempts, i.correct_count, i.next_review_at
       FROM spanish_buddy_items i
       JOIN spanish_buddy_lessons l ON l.id = i.lesson_id
       WHERE i.owner_id = ? ${itemFilter}
       ORDER BY i.next_review_at ASC, i.mastery ASC`,
    ).bind(ownerId, ...itemIds).all<ItemRow>();
    const items = (itemResult.results ?? []).map(mapItem);
    if (!items.length) return jsonWithOwner({ error: "Añade primero contenido a tu biblioteca." }, 422, setCookie);

    const [usageResult, recentUsageResult] = await Promise.all([
      db.prepare(
        `SELECT exercise_type, COUNT(*) AS total_uses
         FROM spanish_buddy_variant_usage
         WHERE owner_id = ? AND shown_at >= datetime('now', '-30 days')
         GROUP BY exercise_type`,
      ).bind(ownerId).all<UsageRow>(),
      db.prepare(
        `SELECT item_id, exercise_type, COUNT(*) AS recent_uses
         FROM spanish_buddy_variant_usage
         WHERE owner_id = ? AND shown_at >= datetime('now', '-7 days')
         GROUP BY item_id, exercise_type`,
      ).bind(ownerId).all<RecentUsageRow>(),
    ]);
    const useCounts = new Map((usageResult.results ?? []).map((row) => [row.exercise_type, Number(row.total_uses) || 0]));
    const recentUses = new Map((recentUsageResult.results ?? []).map((row) => [`${row.item_id}:${row.exercise_type}`, Number(row.recent_uses) || 0]));
    const definitions = interleavedDefinitions(selectedTypes, useCounts)
      .filter((definition) => compatibleItems(definition.id, definition.category, items).length > 0);
    if (!definitions.length) return jsonWithOwner({ error: "Estos tipos de ejercicio todavía no encajan con el contenido seleccionado." }, 422, setCookie);

    const plans: ExercisePlan[] = [];
    const plannedItems = new Set<string>();
    for (let index = 0; plans.length < Math.min(sessionSize, Math.max(items.length, definitions.length)); index += 1) {
      const definition = definitions[index % definitions.length];
      const candidates = compatibleItems(definition.id, definition.category, items);
      const unusedCandidates = candidates.filter((item) => !plans.some((plan) => plan.item.id === item.id && plan.exerciseType === definition.id));
      if (!unusedCandidates.length) {
        if (index > sessionSize * Math.max(definitions.length, items.length)) break;
        continue;
      }
      const item = weightedItem(unusedCandidates, definition.id, recentUses, plannedItems);
      if (!plans.some((plan) => plan.item.id === item.id && plan.exerciseType === definition.id)) {
        plans.push({ item, exerciseType: definition.id });
        plannedItems.add(item.id);
      }
      if (index > sessionSize * Math.max(definitions.length, items.length)) break;
    }

    const hashes = new Map<string, string>();
    await Promise.all(items.map(async (item) => hashes.set(item.id, await spanishBuddyItemContentHash(item))));
    const cached = await Promise.all(plans.map((plan) => db.prepare(
      `SELECT id, payload, use_count, last_used_at, created_at
       FROM spanish_buddy_exercise_variants
       WHERE owner_id = ? AND item_id = ? AND exercise_type = ? AND item_content_hash = ?
         AND quality_status = 'active'
       ORDER BY
         CASE WHEN last_used_at IS NULL OR last_used_at < datetime('now', '-7 days') THEN 0 ELSE 1 END,
         use_count ASC, COALESCE(last_used_at, created_at) ASC
       LIMIT 6`,
    ).bind(ownerId, plan.item.id, plan.exerciseType, hashes.get(plan.item.id)).all<CachedRow>()));
    const exercises: Array<{ exercise: PracticeExercise; item: SavedItem; cacheId: string }> = [];
    const refillPlans: ExercisePlan[] = [];
    const invalidCacheIds: string[] = [];
    for (let index = 0; index < plans.length; index += 1) {
      const plan = plans[index];
      const rows = cached[index].results ?? [];
      if (rows.length < 3) refillPlans.push(plan);
      const row = chooseCachedVariant(rows);
      try {
        const parsed = row ? normalizeExercise(JSON.parse(row.payload) as PracticeExercise, plan) : null;
        if (parsed && row) exercises.push({ exercise: parsed, item: plan.item, cacheId: row.id });
        else if (row) invalidCacheIds.push(row.id);
      } catch {
        if (row) invalidCacheIds.push(row.id);
      }
      if (exercises.some((entry) => entry.item.id === plan.item.id && entry.exercise.exerciseType === plan.exerciseType)) continue;

      const fallback = normalizeExercise(deterministicPracticeExercise(plan, items) as PracticeExercise, plan);
      if (!fallback) continue;
      const cacheId = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO spanish_buddy_exercise_variants
         (id, owner_id, item_id, lesson_id, exercise_type, payload, item_content_hash, generator_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'deterministic-v3')`,
      ).bind(cacheId, ownerId, plan.item.id, plan.item.lessonId, plan.exerciseType, JSON.stringify(fallback), hashes.get(plan.item.id)).run();
      exercises.push({ exercise: fallback, item: plan.item, cacheId });
      if (!refillPlans.some((entry) => entry.item.id === plan.item.id && entry.exerciseType === plan.exerciseType)) refillPlans.push(plan);
    }
    if (invalidCacheIds.length) {
      await db.batch(invalidCacheIds.map((id) => db.prepare(
        "UPDATE spanish_buddy_exercise_variants SET quality_status = 'retired', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?",
      ).bind(id, ownerId)));
    }

    if (!exercises.length) return jsonWithOwner({ error: "No se han podido crear ejercicios válidos con esta selección." }, 502, setCookie);
    const ordered = plans.flatMap((plan) => {
      const match = exercises.find((entry) => entry.item.id === plan.item.id && entry.exercise.exerciseType === plan.exerciseType);
      return match ? [match] : [];
    });
    const sessionId = crypto.randomUUID();
    await db.batch([
      db.prepare(
        `INSERT INTO spanish_buddy_practice_sessions (id, owner_id, mode) VALUES (?, ?, ?)`,
      ).bind(sessionId, ownerId, itemIds.length ? "focused" : "adaptive"),
      ...ordered.flatMap((entry) => [
        db.prepare(
          `UPDATE spanish_buddy_exercise_variants
           SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND owner_id = ?`,
        ).bind(entry.cacheId, ownerId),
        db.prepare(
          `INSERT INTO spanish_buddy_variant_usage
           (id, owner_id, session_id, variant_id, item_id, exercise_type)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), ownerId, sessionId, entry.cacheId, entry.item.id, entry.exercise.exerciseType),
      ]),
    ]);
    scheduleSpanishBuddyExerciseRefill(db, ownerId, refillPlans);

    return jsonWithOwner({
      sessionId,
      exercises: ordered.map(({ exercise, item }) => ({
        ...exercise,
        item: { ...item, acceptedAnswers: exercise.acceptedAnswers },
      })),
    }, 200, setCookie);
  } catch (error) {
    console.error("Spanish Buddy practice error", error);
    return jsonWithOwner({ error: "No se ha podido preparar la práctica." }, 500, setCookie);
  }
}
