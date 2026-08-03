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
  accepted_answers: string;
};

type AttemptRow = {
  id: string;
  quality: "correct" | "almost" | "incorrect";
  mastery_before: number;
};

function normalizeForCache(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFKC")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function answerCacheId(ownerId: string, values: string[]) {
  const bytes = new TextEncoder().encode([ownerId, ...values].join("\u001f"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const { ownerId, setCookie } = getOwner(request);
  let payload: {
    action?: unknown;
    attemptId?: unknown;
    itemId?: unknown;
    correct?: unknown;
    quality?: unknown;
    exerciseType?: unknown;
    prompt?: unknown;
    expectedAnswer?: unknown;
    learnerAnswer?: unknown;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return jsonWithOwner({ error: "No se ha podido leer la respuesta." }, 400, setCookie);
  }

  const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
  const action = payload.action === "override" ? "override" : "record";
  const quality = payload.quality === "almost" ? "almost" : payload.correct === true || payload.quality === "correct" ? "correct" : "incorrect";
  const correct = quality === "correct";
  const exerciseType = typeof payload.exerciseType === "string" ? payload.exerciseType.slice(0, 40) : "practice";
  if (!itemId) return jsonWithOwner({ error: "Falta el contenido de aprendizaje." }, 400, setCookie);

  try {
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const item = await db.prepare(
      `SELECT mastery, attempts, correct_count, accepted_answers
       FROM spanish_buddy_items WHERE id = ? AND owner_id = ?`,
    ).bind(itemId, ownerId).first<ItemProgress>();

    if (!item) return jsonWithOwner({ error: "No se ha encontrado el contenido de aprendizaje." }, 404, setCookie);

    if (action === "override") {
      const requestedAttemptId = typeof payload.attemptId === "string" ? payload.attemptId : "";
      const previousAttempt = requestedAttemptId
        ? await db.prepare(
          `SELECT id, quality, mastery_before FROM spanish_buddy_attempts
           WHERE id = ? AND item_id = ? AND owner_id = ? AND correct = 0`,
        ).bind(requestedAttemptId, itemId, ownerId).first<AttemptRow>()
        : await db.prepare(
          `SELECT id, quality, mastery_before FROM spanish_buddy_attempts
           WHERE item_id = ? AND owner_id = ? AND correct = 0
           ORDER BY created_at DESC LIMIT 1`,
        ).bind(itemId, ownerId).first<AttemptRow>();

      if (!previousAttempt) {
        return jsonWithOwner({ error: "No encuentro la respuesta que quieres corregir." }, 409, setCookie);
      }

      const learnerAnswer = typeof payload.learnerAnswer === "string" ? payload.learnerAnswer.trim().slice(0, 300) : "";
      const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 600) : "";
      const expectedAnswer = typeof payload.expectedAnswer === "string" ? payload.expectedAnswer.trim().slice(0, 600) : "";
      if (!learnerAnswer || !prompt || !expectedAnswer) {
        return jsonWithOwner({ error: "Falta la respuesta que quieres recordar." }, 400, setCookie);
      }

      let acceptedAnswers: string[] = [];
      try {
        const parsed = JSON.parse(item.accepted_answers);
        acceptedAnswers = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
      } catch {
        acceptedAnswers = [];
      }
      if (!acceptedAnswers.some((value) => normalizeForCache(value) === normalizeForCache(learnerAnswer))) {
        acceptedAnswers.push(learnerAnswer);
      }
      acceptedAnswers = acceptedAnswers.slice(-12);

      const gain = Math.max(7, 18 - Math.floor(Math.max(0, item.attempts - 1) / 2));
      const mastery = Math.max(0, Math.min(100, previousAttempt.mastery_before + gain));
      const correctCount = item.correct_count + 1;
      const reviewDays = mastery >= 90 ? 16 : mastery >= 75 ? 8 : mastery >= 55 ? 4 : mastery >= 30 ? 2 : 1;
      const nextReview = new Date(Date.now() + reviewDays * 86_400_000).toISOString();
      const normalized = [prompt, expectedAnswer, learnerAnswer, exerciseType].map(normalizeForCache);
      const cacheId = await answerCacheId(ownerId, normalized);

      await db.batch([
        db.prepare(
          `UPDATE spanish_buddy_items
           SET mastery = ?, correct_count = ?, next_review_at = ?, accepted_answers = ?
           WHERE id = ? AND owner_id = ?`,
        ).bind(mastery, correctCount, nextReview, JSON.stringify(acceptedAnswers), itemId, ownerId),
        db.prepare(
          `UPDATE spanish_buddy_attempts
           SET correct = 1, quality = 'correct', exercise_type = ?
           WHERE id = ? AND owner_id = ?`,
        ).bind(`${exerciseType}:overridden`, previousAttempt.id, ownerId),
        db.prepare(
          `INSERT INTO spanish_buddy_answer_cache
           (id, owner_id, item_id, exercise_type, prompt_normalized, expected_normalized, learner_normalized, verdict, feedback, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'equivalent', ?, 'learner')
           ON CONFLICT(id) DO UPDATE SET verdict = 'equivalent', feedback = excluded.feedback,
             source = 'learner', updated_at = CURRENT_TIMESTAMP`,
        ).bind(
          cacheId,
          ownerId,
          itemId,
          exerciseType,
          normalized[0],
          normalized[1],
          normalized[2],
          "Von dir als richtige Formulierung bestätigt.",
        ),
      ]);

      return jsonWithOwner({
        learnedAnswer: learnerAnswer,
        progress: { mastery, attempts: item.attempts, correctCount, nextReviewAt: nextReview },
      }, 200, setCookie);
    }

    const attempts = item.attempts + 1;
    const correctCount = item.correct_count + (correct ? 1 : 0);
    const gain = Math.max(7, 18 - Math.floor(item.attempts / 2));
    const mastery = Math.max(0, Math.min(100, item.mastery + (correct ? gain : quality === "almost" ? -4 : -20)));
    const reviewDays = correct
      ? mastery >= 90 ? 16 : mastery >= 75 ? 8 : mastery >= 55 ? 4 : mastery >= 30 ? 2 : 1
      : quality === "almost" ? 1 : 0;
    const nextReview = new Date(Date.now() + reviewDays * 86_400_000).toISOString();

    const attemptId = crypto.randomUUID();
    await db.batch([
      db.prepare(
        `UPDATE spanish_buddy_items
         SET mastery = ?, attempts = ?, correct_count = ?, next_review_at = ?
         WHERE id = ? AND owner_id = ?`,
      ).bind(mastery, attempts, correctCount, nextReview, itemId, ownerId),
      db.prepare(
        `INSERT INTO spanish_buddy_attempts
         (id, owner_id, item_id, exercise_type, correct, quality, mastery_before)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(attemptId, ownerId, itemId, `${exerciseType}:${quality}`, correct ? 1 : 0, quality, item.mastery),
    ]);

    return jsonWithOwner(
      { attemptId, progress: { mastery, attempts, correctCount, nextReviewAt: nextReview } },
      200,
      setCookie,
    );
  } catch (error) {
    console.error("Spanish Buddy attempt save failed", error);
    return jsonWithOwner({ error: "La respuesta se ha comprobado, pero no se ha podido guardar el progreso." }, 500, setCookie);
  }
}
