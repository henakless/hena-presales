const OWNER_COOKIE = "sb_owner";
const OWNER_PATTERN = /^[a-f0-9-]{36}$/i;

export async function getSpanishBuddyDatabase() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Spanish Buddy storage is not configured.");
  return env.DB;
}

export async function ensureSpanishBuddySchema(db: D1Database) {
  await db.batch([
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
      spanish TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT '',
      explanation TEXT NOT NULL DEFAULT '',
      example TEXT NOT NULL DEFAULT '',
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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_lessons_owner_idx ON spanish_buddy_lessons(owner_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_items_owner_idx ON spanish_buddy_items(owner_id, next_review_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sb_items_lesson_idx ON spanish_buddy_items(lesson_id)"),
  ]);
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
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return {
    ownerId,
    setCookie: `${OWNER_COOKIE}=${ownerId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`,
  };
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
