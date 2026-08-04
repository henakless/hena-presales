const OWNER_COOKIE = "sb_owner";
const OWNER_PATTERN = /^[a-f0-9-]{36}$/i;

export async function getSpanishBuddyDatabase() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Spanish Buddy storage is not configured.");
  return env.DB;
}

export async function ensureSpanishBuddySchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_sync_profiles (
      owner_id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Mi biblioteca',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_lessons (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL DEFAULT 'notes',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_items (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      learning_type TEXT NOT NULL DEFAULT 'word',
      spanish TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT '',
      explanation TEXT NOT NULL DEFAULT '',
      example TEXT NOT NULL DEFAULT '',
      accepted_answers TEXT NOT NULL DEFAULT '[]',
      provenance TEXT NOT NULL DEFAULT 'course',
      mastery INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_attempts (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      correct INTEGER NOT NULL,
      quality TEXT NOT NULL DEFAULT 'incorrect',
      mastery_before INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_topics (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      canonical_key TEXT NOT NULL,
      title TEXT NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(owner_id, canonical_key)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_item_topics (
      owner_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(owner_id, item_id, topic_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_answer_cache (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      item_id TEXT NOT NULL DEFAULT '',
      exercise_type TEXT NOT NULL,
      prompt_normalized TEXT NOT NULL,
      expected_normalized TEXT NOT NULL,
      learner_normalized TEXT NOT NULL,
      verdict TEXT NOT NULL,
      feedback TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'model',
      hit_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_ai_usage (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cached_input_tokens INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_exercise_variants (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      item_content_hash TEXT NOT NULL DEFAULT '',
      generator_version TEXT NOT NULL DEFAULT 'v1',
      quality_status TEXT NOT NULL DEFAULT 'active',
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_practice_sessions (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'adaptive',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_variant_usage (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      shown_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_lessons_owner_idx ON spanish_buddy_lessons(owner_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_items_owner_idx ON spanish_buddy_items(owner_id, next_review_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_items_lesson_idx ON spanish_buddy_items(lesson_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_topics_owner_idx ON spanish_buddy_topics(owner_id, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_item_topics_owner_idx ON spanish_buddy_item_topics(owner_id, topic_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_answer_cache_owner_idx ON spanish_buddy_answer_cache(owner_id, learner_normalized)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_ai_usage_owner_idx ON spanish_buddy_ai_usage(owner_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_exercise_variants_owner_idx ON spanish_buddy_exercise_variants(owner_id, exercise_type, use_count)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_exercise_variants_lesson_idx ON spanish_buddy_exercise_variants(lesson_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_practice_sessions_owner_idx ON spanish_buddy_practice_sessions(owner_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_variant_usage_owner_idx ON spanish_buddy_variant_usage(owner_id, shown_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_variant_usage_variant_idx ON spanish_buddy_variant_usage(variant_id, shown_at)"),
  ]);

  const profileColumns = await db.prepare("PRAGMA table_info(spanish_buddy_sync_profiles)").all<{ name: string }>();
  if (!(profileColumns.results ?? []).some((column) => column.name === "name")) {
    await db.prepare("ALTER TABLE spanish_buddy_sync_profiles ADD COLUMN name TEXT NOT NULL DEFAULT 'Mi biblioteca'").run();
  }
  const columns = await db.prepare("PRAGMA table_info(spanish_buddy_items)").all<{ name: string }>();
  if (!(columns.results ?? []).some((column) => column.name === "learning_type")) {
    await db.prepare("ALTER TABLE spanish_buddy_items ADD COLUMN learning_type TEXT NOT NULL DEFAULT 'word'").run();
  }
  const variantColumns = await db.prepare("PRAGMA table_info(spanish_buddy_exercise_variants)").all<{ name: string }>();
  const variantColumnNames = new Set((variantColumns.results ?? []).map((column) => column.name));
  const missingVariantColumns = [
    ["item_content_hash", "TEXT NOT NULL DEFAULT ''"],
    ["generator_version", "TEXT NOT NULL DEFAULT 'v1'"],
    ["quality_status", "TEXT NOT NULL DEFAULT 'active'"],
    ["last_used_at", "TEXT"],
  ].filter(([name]) => !variantColumnNames.has(name));
  for (const [name, definition] of missingVariantColumns) {
    await db.prepare(`ALTER TABLE spanish_buddy_exercise_variants ADD COLUMN ${name} ${definition}`).run();
  }
}

type UnlinkedGrammarItem = {
  id: string;
  spanish: string;
  explanation: string;
};

export async function ensureSpanishBuddyTopicsForOwner(db: D1Database, ownerId: string) {
  const { learningTopicKey } = await import("./spanish-buddy");
  const result = await db.prepare(
    `SELECT i.id, i.spanish, i.explanation
     FROM spanish_buddy_items i
     LEFT JOIN spanish_buddy_item_topics it ON it.item_id = i.id AND it.owner_id = i.owner_id
     WHERE i.owner_id = ? AND i.kind = 'grammar' AND it.item_id IS NULL`,
  ).bind(ownerId).all<UnlinkedGrammarItem>();

  const statements = (result.results ?? []).flatMap((item) => {
    const key = learningTopicKey(item.spanish);
    if (!key) return [];
    const topicId = crypto.randomUUID();
    return [
      db.prepare(
        `INSERT INTO spanish_buddy_topics (id, owner_id, canonical_key, title, explanation)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(owner_id, canonical_key) DO UPDATE SET
           title = CASE WHEN length(excluded.title) > length(title) THEN excluded.title ELSE title END,
           explanation = CASE WHEN length(excluded.explanation) > length(explanation) THEN excluded.explanation ELSE explanation END,
           updated_at = CURRENT_TIMESTAMP`,
      ).bind(topicId, ownerId, key, item.spanish, item.explanation),
      db.prepare(
        `INSERT OR IGNORE INTO spanish_buddy_item_topics (owner_id, item_id, topic_id)
         SELECT ?, ?, id FROM spanish_buddy_topics WHERE owner_id = ? AND canonical_key = ?`,
      ).bind(ownerId, item.id, ownerId, key),
    ];
  });
  if (statements.length) await db.batch(statements);
}

type OpenAIUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
};

export async function recordSpanishBuddyAiUsage(
  db: D1Database,
  ownerId: string,
  operation: "extract" | "evaluate" | "practice",
  model: string,
  usage?: OpenAIUsage,
) {
  if (!usage) return;
  await db.prepare(
    `INSERT INTO spanish_buddy_ai_usage
     (id, owner_id, operation, model, input_tokens, output_tokens, cached_input_tokens, reasoning_tokens, total_tokens)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    ownerId,
    operation,
    model,
    Math.max(0, usage.input_tokens ?? 0),
    Math.max(0, usage.output_tokens ?? 0),
    Math.max(0, usage.input_tokens_details?.cached_tokens ?? 0),
    Math.max(0, usage.output_tokens_details?.reasoning_tokens ?? 0),
    Math.max(0, usage.total_tokens ?? 0),
  ).run();
}

function parseCookies(request: Request) {
  return Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((value) => value.trim().split("="))
      .filter(([key, value]) => Boolean(key && value)),
  );
}

export function getOwner(request: Request) {
  const existing = parseCookies(request)[OWNER_COOKIE];
  if (existing && OWNER_PATTERN.test(existing)) {
    return { ownerId: existing, setCookie: null };
  }

  const ownerId = crypto.randomUUID();
  return {
    ownerId,
    setCookie: spanishBuddyOwnerCookie(request, ownerId),
  };
}

export function spanishBuddyOwnerCookie(request: Request, ownerId: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${OWNER_COOKIE}=${ownerId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`;
}

export function jsonWithOwner(
  body: unknown,
  status: number,
  setCookie: string | null,
) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (setCookie) headers.set("Set-Cookie", setCookie);
  return Response.json(body, { status, headers });
}
