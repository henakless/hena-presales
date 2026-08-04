import {
  inferTopicComponentRole,
  matchGrammarTopic,
  TOPIC_CONTENT_VERSION,
  topicIsReady,
  type GrammarTopicDefinition,
} from "./spanish-buddy-topics";

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
      summary TEXT NOT NULL DEFAULT '',
      definition TEXT NOT NULL DEFAULT '',
      use_cases TEXT NOT NULL DEFAULT '[]',
      formation TEXT NOT NULL DEFAULT '',
      examples TEXT NOT NULL DEFAULT '[]',
      common_mistakes TEXT NOT NULL DEFAULT '[]',
      quick_check TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      content_version TEXT NOT NULL DEFAULT 'v1',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(owner_id, canonical_key)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS spanish_buddy_item_topics (
      owner_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'concept',
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
  const topicColumns = await db.prepare("PRAGMA table_info(spanish_buddy_topics)").all<{ name: string }>();
  const topicColumnNames = new Set((topicColumns.results ?? []).map((column) => column.name));
  const missingTopicColumns = [
    ["summary", "TEXT NOT NULL DEFAULT ''"],
    ["definition", "TEXT NOT NULL DEFAULT ''"],
    ["use_cases", "TEXT NOT NULL DEFAULT '[]'"],
    ["formation", "TEXT NOT NULL DEFAULT ''"],
    ["examples", "TEXT NOT NULL DEFAULT '[]'"],
    ["common_mistakes", "TEXT NOT NULL DEFAULT '[]'"],
    ["quick_check", "TEXT NOT NULL DEFAULT '{}'"],
    ["status", "TEXT NOT NULL DEFAULT 'draft'"],
    ["content_version", "TEXT NOT NULL DEFAULT 'v1'"],
  ].filter(([name]) => !topicColumnNames.has(name));
  for (const [name, definition] of missingTopicColumns) {
    await db.prepare(`ALTER TABLE spanish_buddy_topics ADD COLUMN ${name} ${definition}`).run();
  }
  const itemTopicColumns = await db.prepare("PRAGMA table_info(spanish_buddy_item_topics)").all<{ name: string }>();
  if (!(itemTopicColumns.results ?? []).some((column) => column.name === "role")) {
    await db.prepare("ALTER TABLE spanish_buddy_item_topics ADD COLUMN role TEXT NOT NULL DEFAULT 'concept'").run();
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

type GrammarItemForTopic = {
  id: string;
  spanish: string;
  translation: string;
  explanation: string;
};

type StoredTopic = { id: string; canonical_key: string; content_version: string };
type StoredTopicLink = { item_id: string; canonical_key: string; role: string };

function topicInsertStatement(db: D1Database, ownerId: string, topic: GrammarTopicDefinition, id: string) {
  return db.prepare(
    `INSERT INTO spanish_buddy_topics
     (id, owner_id, canonical_key, title, explanation, summary, definition, use_cases, formation,
      examples, common_mistakes, quick_check, status, content_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    ownerId,
    topic.key,
    topic.title,
    topic.definition,
    topic.summary,
    topic.definition,
    JSON.stringify(topic.useCases),
    topic.formation,
    JSON.stringify(topic.examples),
    JSON.stringify(topic.commonMistakes),
    JSON.stringify(topic.quickCheck),
    topicIsReady(topic) ? "ready" : "draft",
    TOPIC_CONTENT_VERSION,
  );
}

function topicUpdateStatement(db: D1Database, ownerId: string, topic: GrammarTopicDefinition) {
  return db.prepare(
    `UPDATE spanish_buddy_topics
     SET title = ?, explanation = ?, summary = ?, definition = ?, use_cases = ?, formation = ?,
         examples = ?, common_mistakes = ?, quick_check = ?, status = ?, content_version = ?, updated_at = CURRENT_TIMESTAMP
     WHERE owner_id = ? AND canonical_key = ?`,
  ).bind(
    topic.title,
    topic.definition,
    topic.summary,
    topic.definition,
    JSON.stringify(topic.useCases),
    topic.formation,
    JSON.stringify(topic.examples),
    JSON.stringify(topic.commonMistakes),
    JSON.stringify(topic.quickCheck),
    topicIsReady(topic) ? "ready" : "draft",
    TOPIC_CONTENT_VERSION,
    ownerId,
    topic.key,
  );
}

export async function ensureSpanishBuddyTopicsForOwner(db: D1Database, ownerId: string) {
  const [itemResult, topicResult, linkResult] = await Promise.all([
    db.prepare(
      `SELECT id, spanish, translation, explanation
       FROM spanish_buddy_items WHERE owner_id = ? AND kind = 'grammar'`,
    ).bind(ownerId).all<GrammarItemForTopic>(),
    db.prepare(
      `SELECT id, canonical_key, content_version
       FROM spanish_buddy_topics WHERE owner_id = ?`,
    ).bind(ownerId).all<StoredTopic>(),
    db.prepare(
      `SELECT it.item_id, t.canonical_key, it.role
       FROM spanish_buddy_item_topics it
       JOIN spanish_buddy_topics t ON t.id = it.topic_id AND t.owner_id = it.owner_id
       WHERE it.owner_id = ?`,
    ).bind(ownerId).all<StoredTopicLink>(),
  ]);

  const items = itemResult.results ?? [];
  const existingTopics = new Map((topicResult.results ?? []).map((topic) => [topic.canonical_key, topic]));
  const existingLinks = new Map<string, StoredTopicLink[]>();
  for (const link of linkResult.results ?? []) {
    const links = existingLinks.get(link.item_id) ?? [];
    links.push(link);
    existingLinks.set(link.item_id, links);
  }

  const desiredByItem = new Map(items.map((item) => {
    const topic = matchGrammarTopic(item);
    return [item.id, topic ? { topic, role: inferTopicComponentRole(item) } : null] as const;
  }));
  const neededTopics = new Map<string, GrammarTopicDefinition>();
  for (const desired of desiredByItem.values()) if (desired) neededTopics.set(desired.topic.key, desired.topic);

  const statements: D1PreparedStatement[] = [];
  for (const topic of neededTopics.values()) {
    const existing = existingTopics.get(topic.key);
    if (!existing) statements.push(topicInsertStatement(db, ownerId, topic, crypto.randomUUID()));
    else if (existing.content_version !== TOPIC_CONTENT_VERSION) statements.push(topicUpdateStatement(db, ownerId, topic));
  }

  for (const item of items) {
    const desired = desiredByItem.get(item.id);
    const currentLinks = existingLinks.get(item.id) ?? [];
    const alreadyCorrect = desired
      ? currentLinks.length === 1 && currentLinks[0].canonical_key === desired.topic.key && currentLinks[0].role === desired.role
      : currentLinks.length === 0;
    if (alreadyCorrect) continue;
    statements.push(db.prepare(
      "DELETE FROM spanish_buddy_item_topics WHERE owner_id = ? AND item_id = ?",
    ).bind(ownerId, item.id));
    if (desired) {
      statements.push(db.prepare(
        `INSERT OR IGNORE INTO spanish_buddy_item_topics (owner_id, item_id, topic_id, role)
         SELECT ?, ?, id, ? FROM spanish_buddy_topics WHERE owner_id = ? AND canonical_key = ?`,
      ).bind(ownerId, item.id, desired.role, ownerId, desired.topic.key));
      statements.push(db.prepare(
        "UPDATE spanish_buddy_topics SET updated_at = CURRENT_TIMESTAMP WHERE owner_id = ? AND canonical_key = ?",
      ).bind(ownerId, desired.topic.key));
    }
  }
  statements.push(db.prepare(
    `DELETE FROM spanish_buddy_topics
     WHERE owner_id = ? AND NOT EXISTS (
       SELECT 1 FROM spanish_buddy_item_topics it WHERE it.owner_id = ? AND it.topic_id = spanish_buddy_topics.id
     )`,
  ).bind(ownerId, ownerId));
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
