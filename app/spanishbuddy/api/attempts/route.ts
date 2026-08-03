import {
  ensureSpanishBuddySchema,
  getOwner,
  getSpanishBuddyDatabase,
  jsonWithOwner,
} from "../../../../lib/spanish-buddy-server";

export const runtime = "edge";

type ItemProgress = {
  mastery: number;
  attempts: number;
  correct_count: number;
};

export async function POST(request: Request) {
  const { ownerId, setCookie } = getOwner(request);
  let payload: { itemId?: unknown; correct?: unknown; exerciseType?: unknown };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return jsonWithOwner({ error: "Die Antwort konnte nicht gelesen werden." }, 400, setCookie);
  }

  const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
  const correct = payload.correct === true;
  const exerciseType = typeof payload.exerciseType === "string" ? payload.exerciseType.slice(0, 40) : "practice";
  if (!itemId) return jsonWithOwner({ error: "Der Lerneintrag fehlt." }, 400, setCookie);

  try {
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const item = await db.prepare(
      `SELECT mastery, attempts, correct_count
       FROM spanish_buddy_items WHERE id = ? AND owner_id = ?`,
    ).bind(itemId, ownerId).first<ItemProgress>();

    if (!item) return jsonWithOwner({ error: "Der Lerneintrag wurde nicht gefunden." }, 404, setCookie);

    const attempts = item.attempts + 1;
    const correctCount = item.correct_count + (correct ? 1 : 0);
    const gain = Math.max(7, 18 - Math.floor(item.attempts / 2));
    const mastery = Math.max(0, Math.min(100, item.mastery + (correct ? gain : -20)));
    const reviewDays = correct
      ? mastery >= 90 ? 16 : mastery >= 75 ? 8 : mastery >= 55 ? 4 : mastery >= 30 ? 2 : 1
      : 0;
    const nextReview = new Date(Date.now() + reviewDays * 86_400_000).toISOString();

    await db.batch([
      db.prepare(
        `UPDATE spanish_buddy_items
         SET mastery = ?, attempts = ?, correct_count = ?, next_review_at = ?
         WHERE id = ? AND owner_id = ?`,
      ).bind(mastery, attempts, correctCount, nextReview, itemId, ownerId),
      db.prepare(
        `INSERT INTO spanish_buddy_attempts (id, owner_id, item_id, exercise_type, correct)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), ownerId, itemId, exerciseType, correct ? 1 : 0),
    ]);

    return jsonWithOwner(
      { progress: { mastery, attempts, correctCount, nextReviewAt: nextReview } },
      200,
      setCookie,
    );
  } catch (error) {
    console.error("Spanish Buddy attempt save failed", error);
    return jsonWithOwner({ error: "Die Antwort wurde geprüft, aber der Fortschritt konnte nicht gespeichert werden." }, 500, setCookie);
  }
}
