import type { ExtractedItem, SavedItem, SavedLesson } from "../../../../lib/spanish-buddy";
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
  spanish: string;
  translation: string;
  explanation: string;
  example: string;
  provenance: "course" | "suggested";
  mastery: number;
  attempts: number;
  correct_count: number;
  next_review_at: string;
};

function mapItem(row: ItemRow): SavedItem {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    kind: row.kind,
    spanish: row.spanish,
    translation: row.translation,
    explanation: row.explanation,
    example: row.example,
    provenance: row.provenance,
    mastery: row.mastery,
    attempts: row.attempts,
    correctCount: row.correct_count,
    nextReviewAt: row.next_review_at,
  };
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
        `SELECT i.id, i.lesson_id, l.title AS lesson_title, i.kind, i.spanish,
                i.translation, i.explanation, i.example, i.provenance,
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
    return jsonWithOwner({ error: "Your learning library could not be loaded." }, 500, setCookie);
  }
}

export async function POST(request: Request) {
  const { ownerId, setCookie } = getOwner(request);
  let payload: { title?: unknown; summary?: unknown; sourceType?: unknown; items?: unknown };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return jsonWithOwner({ error: "That lesson could not be read." }, 400, setCookie);
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
    return jsonWithOwner({ error: "Give the lesson a title and approve at least one item." }, 400, setCookie);
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
           (id, owner_id, lesson_id, kind, spanish, translation, explanation, example, provenance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          ownerId,
          lessonId,
          item.kind,
          item.spanish.trim().slice(0, 180),
          String(item.translation ?? "").trim().slice(0, 300),
          String(item.explanation ?? "").trim().slice(0, 700),
          String(item.example ?? "").trim().slice(0, 400),
          item.provenance === "suggested" ? "suggested" : "course",
        ),
      ),
    ];

    await db.batch(statements);
    return jsonWithOwner({ lessonId, savedItems: selected.length }, 201, setCookie);
  } catch (error) {
    console.error("Spanish Buddy lesson save failed", error);
    return jsonWithOwner({ error: "The lesson could not be saved." }, 500, setCookie);
  }
}
