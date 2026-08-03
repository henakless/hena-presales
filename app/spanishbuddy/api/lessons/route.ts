import { inferLearningType, type ExtractedItem, type LearningType, type SavedItem, type SavedLesson } from "../../../../lib/spanish-buddy";
import {
  ensureSpanishBuddySchema,
  getOwner,
  getSpanishBuddyDatabase,
  jsonWithOwner,
} from "../../../../lib/spanish-buddy-server";

export const runtime = "edge";

type LessonRow = {
  id: string;
  title: string;
  summary: string;
  source_type: string;
  created_at: string;
};

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

function mapItem(row: ItemRow): SavedItem {
  let acceptedAnswers: string[] = [];
  try {
    const parsed = JSON.parse(row.accepted_answers);
    acceptedAnswers = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    acceptedAnswers = [];
  }
  const base = {
    id: row.id,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    kind: row.kind,
    learningType: row.learning_type,
    spanish: row.spanish,
    translation: row.translation,
    explanation: row.explanation,
    example: row.example,
    acceptedAnswers,
    provenance: row.provenance,
    mastery: row.mastery,
    attempts: row.attempts,
    correctCount: row.correct_count,
    nextReviewAt: row.next_review_at,
  };
  const inferred = inferLearningType(base);
  const learningType = (row.kind === "grammar" && row.learning_type === "word") || (row.kind === "vocabulary" && row.learning_type === "word" && inferred !== "word")
    ? inferred
    : row.learning_type || inferred;
  return { ...base, learningType };
}

export async function GET(request: Request) {
  const { ownerId, setCookie } = getOwner(request);

  try {
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const [lessonResult, itemResult] = await Promise.all([
      db.prepare(
        `SELECT id, title, summary, source_type, created_at
         FROM spanish_buddy_lessons
         WHERE owner_id = ?
         ORDER BY created_at DESC`,
      ).bind(ownerId).all<LessonRow>(),
      db.prepare(
         `SELECT i.id, i.lesson_id, l.title AS lesson_title, i.kind, i.learning_type, i.spanish,
                i.translation, i.explanation, i.example, i.accepted_answers, i.provenance,
                i.mastery, i.attempts, i.correct_count, i.next_review_at
         FROM spanish_buddy_items i
         JOIN spanish_buddy_lessons l ON l.id = i.lesson_id
         WHERE i.owner_id = ?
         ORDER BY i.next_review_at ASC, i.mastery ASC, i.created_at DESC`,
      ).bind(ownerId).all<ItemRow>(),
    ]);

    const items = (itemResult.results ?? []).map(mapItem);
    const lessons: SavedLesson[] = (lessonResult.results ?? []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      sourceType: lesson.source_type,
      createdAt: lesson.created_at,
      items: items.filter((item) => item.lessonId === lesson.id),
    }));

    return jsonWithOwner({ lessons, items }, 200, setCookie);
  } catch (error) {
    console.error("Spanish Buddy lessons read failed", error);
    return jsonWithOwner({ error: "No se ha podido cargar tu biblioteca." }, 500, setCookie);
  }
}

export async function POST(request: Request) {
  const { ownerId, setCookie } = getOwner(request);
  let payload: { title?: unknown; summary?: unknown; sourceType?: unknown; items?: unknown };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return jsonWithOwner({ error: "No se ha podido leer la lección." }, 400, setCookie);
  }

  const title = typeof payload.title === "string" ? payload.title.trim().slice(0, 100) : "";
  const summary = typeof payload.summary === "string" ? payload.summary.trim().slice(0, 300) : "";
  const sourceType = typeof payload.sourceType === "string" ? payload.sourceType.slice(0, 30) : "notes";
  const items = Array.isArray(payload.items) ? (payload.items as ExtractedItem[]) : [];
  const selected = items.filter(
    (item) =>
      item?.selected &&
      (item.kind === "vocabulary" || item.kind === "grammar") &&
      typeof item.spanish === "string" &&
      item.spanish.trim(),
  ).slice(0, 60);

  if (!title || selected.length === 0) {
    return jsonWithOwner({ error: "Pon un título y confirma al menos un contenido." }, 400, setCookie);
  }

  try {
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const lessonId = crypto.randomUUID();
    const statements = [
      db.prepare(
        `INSERT INTO spanish_buddy_lessons (id, owner_id, title, summary, source_type)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(lessonId, ownerId, title, summary, sourceType),
      ...selected.map((item) =>
        db.prepare(
          `INSERT INTO spanish_buddy_items
           (id, owner_id, lesson_id, kind, learning_type, spanish, translation, explanation, example, accepted_answers, provenance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          ownerId,
          lessonId,
          item.kind,
          item.learningType || inferLearningType(item),
          item.spanish.trim().slice(0, 180),
          String(item.translation ?? "").trim().slice(0, 300),
          String(item.explanation ?? "").trim().slice(0, 700),
          String(item.example ?? "").trim().slice(0, 400),
          JSON.stringify(
            [...new Set((Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers : [])
              .map((value) => String(value).trim().slice(0, 300))
              .filter(Boolean))].slice(0, 5),
          ),
          item.provenance === "suggested" ? "suggested" : "course",
        ),
      ),
    ];

    await db.batch(statements);
    return jsonWithOwner({ lessonId, savedItems: selected.length }, 201, setCookie);
  } catch (error) {
    console.error("Spanish Buddy lesson save failed", error);
    return jsonWithOwner({ error: "No se ha podido guardar la lección." }, 500, setCookie);
  }
}

export async function PATCH(request: Request) {
  const { ownerId, setCookie } = getOwner(request);
  let payload: Partial<ExtractedItem> & { id?: unknown };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return jsonWithOwner({ error: "No se han podido leer los cambios." }, 400, setCookie);
  }

  const id = typeof payload.id === "string" ? payload.id.slice(0, 80) : "";
  const kind = payload.kind === "grammar" ? "grammar" : "vocabulary";
  const allowedTypes: LearningType[] = ["word", "collocation", "fixed_expression", "sentence_pattern", "grammar_rule", "conjugation"];
  const learningType = allowedTypes.includes(payload.learningType as LearningType)
    ? payload.learningType as LearningType
    : inferLearningType({ kind, spanish: String(payload.spanish ?? ""), explanation: String(payload.explanation ?? "") });
  const spanish = typeof payload.spanish === "string" ? payload.spanish.trim().slice(0, 180) : "";
  if (!id || !spanish) return jsonWithOwner({ error: "El contenido necesita una forma en español." }, 400, setCookie);

  try {
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const result = await db.prepare(
      `UPDATE spanish_buddy_items
       SET kind = ?, learning_type = ?, spanish = ?, translation = ?, explanation = ?, example = ?, accepted_answers = ?
       WHERE id = ? AND owner_id = ?`,
    ).bind(
      kind,
      learningType,
      spanish,
      String(payload.translation ?? "").trim().slice(0, 300),
      String(payload.explanation ?? "").trim().slice(0, 700),
      String(payload.example ?? "").trim().slice(0, 400),
      JSON.stringify((Array.isArray(payload.acceptedAnswers) ? payload.acceptedAnswers : []).map(String).map((value) => value.trim()).filter(Boolean).slice(0, 12)),
      id,
      ownerId,
    ).run();
    if (!result.meta.changes) return jsonWithOwner({ error: "No se ha encontrado este contenido." }, 404, setCookie);
    await db.prepare("DELETE FROM spanish_buddy_answer_cache WHERE owner_id = ? AND item_id = ?").bind(ownerId, id).run();
    return jsonWithOwner({ item: { ...payload, id, kind, learningType, spanish } }, 200, setCookie);
  } catch (error) {
    console.error("Spanish Buddy item update failed", error);
    return jsonWithOwner({ error: "No se han podido guardar los cambios." }, 500, setCookie);
  }
}
