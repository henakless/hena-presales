import {
  ensureSpanishBuddySchema,
  getOwner,
  getSpanishBuddyDatabase,
  jsonWithOwner,
  spanishBuddyOwnerCookie,
} from "../../../../lib/spanish-buddy-server";

export const runtime = "edge";

const MIN_PASSPHRASE_LENGTH = 16;
const MAX_PASSPHRASE_LENGTH = 160;
const MAX_LIBRARY_NAME_LENGTH = 60;
const DEFAULT_LIBRARY_NAME = "Mi biblioteca";

type SyncProfile = {
  owner_id: string;
  name: string;
};

function bytesToUuid(bytes: Uint8Array) {
  const value = bytes.slice(0, 16);
  value[6] = (value[6] & 0x0f) | 0x50;
  value[8] = (value[8] & 0x3f) | 0x80;
  const hex = [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function syncedOwnerId(passphrase: string) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`spanish-buddy-sync-v2\0${passphrase.normalize("NFKC")}`),
  );
  return bytesToUuid(new Uint8Array(digest));
}

function normalizedLibraryName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_LIBRARY_NAME_LENGTH);
}

const ownedTables = [
  "spanish_buddy_lessons",
  "spanish_buddy_items",
  "spanish_buddy_topics",
  "spanish_buddy_item_topics",
  "spanish_buddy_attempts",
  "spanish_buddy_answer_cache",
  "spanish_buddy_ai_usage",
  "spanish_buddy_exercise_variants",
  "spanish_buddy_practice_sessions",
  "spanish_buddy_variant_usage",
];

function moveLibraryStatements(db: D1Database, sourceOwnerId: string, targetOwnerId: string, mergeTopics: boolean) {
  const topicMergeStatements = mergeTopics ? [
    db.prepare(
      `UPDATE spanish_buddy_item_topics
       SET topic_id = (
         SELECT target.id
         FROM spanish_buddy_topics source
         JOIN spanish_buddy_topics target ON target.owner_id = ? AND target.canonical_key = source.canonical_key
         WHERE source.id = spanish_buddy_item_topics.topic_id AND source.owner_id = ?
       )
       WHERE owner_id = ? AND EXISTS (
         SELECT 1
         FROM spanish_buddy_topics source
         JOIN spanish_buddy_topics target ON target.owner_id = ? AND target.canonical_key = source.canonical_key
         WHERE source.id = spanish_buddy_item_topics.topic_id AND source.owner_id = ?
       )`,
    ).bind(targetOwnerId, sourceOwnerId, sourceOwnerId, targetOwnerId, sourceOwnerId),
    db.prepare(
      `DELETE FROM spanish_buddy_topics
       WHERE owner_id = ? AND EXISTS (
         SELECT 1 FROM spanish_buddy_topics target
         WHERE target.owner_id = ? AND target.canonical_key = spanish_buddy_topics.canonical_key
       )`,
    ).bind(sourceOwnerId, targetOwnerId),
  ] : [];

  return [
    ...topicMergeStatements,
    ...ownedTables.map((table) => db.prepare(
      `UPDATE ${table} SET owner_id = ? WHERE owner_id = ?`,
    ).bind(targetOwnerId, sourceOwnerId)),
  ];
}

export async function GET(request: Request) {
  const { ownerId, setCookie } = getOwner(request);
  try {
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const profile = await db.prepare(
      "SELECT owner_id, name FROM spanish_buddy_sync_profiles WHERE owner_id = ?",
    ).bind(ownerId).first<SyncProfile>();
    return jsonWithOwner({ synced: Boolean(profile), name: profile?.name ?? "" }, 200, setCookie);
  } catch (error) {
    console.error("Spanish Buddy sync status failed", error);
    return jsonWithOwner({ synced: false, name: "" }, 200, setCookie);
  }
}

export async function POST(request: Request) {
  const { ownerId } = getOwner(request);
  let payload: { action?: unknown; passphrase?: unknown; name?: unknown };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return jsonWithOwner({ error: "No se han podido leer los datos de sincronización." }, 400, null);
  }

  if (payload.action === "disconnect") {
    return jsonWithOwner(
      { synced: false, name: "" },
      200,
      spanishBuddyOwnerCookie(request, crypto.randomUUID()),
    );
  }

  const action = payload.action === "rekey" ? "rekey" : "connect";
  const passphrase = typeof payload.passphrase === "string" ? payload.passphrase.trim() : "";
  const requestedName = normalizedLibraryName(payload.name);
  if (passphrase.length < MIN_PASSPHRASE_LENGTH || passphrase.length > MAX_PASSPHRASE_LENGTH) {
    return jsonWithOwner(
      { error: `Usa una frase de entre ${MIN_PASSPHRASE_LENGTH} y ${MAX_PASSPHRASE_LENGTH} caracteres.` },
      400,
      null,
    );
  }
  if (!requestedName) {
    return jsonWithOwner({ error: "Ponle un nombre a esta biblioteca." }, 400, null);
  }

  try {
    const targetOwnerId = await syncedOwnerId(passphrase);
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const [currentProfile, targetProfile] = await Promise.all([
      db.prepare(
        "SELECT owner_id, name FROM spanish_buddy_sync_profiles WHERE owner_id = ?",
      ).bind(ownerId).first<SyncProfile>(),
      db.prepare(
        "SELECT owner_id, name FROM spanish_buddy_sync_profiles WHERE owner_id = ?",
      ).bind(targetOwnerId).first<SyncProfile>(),
    ]);

    if (action === "rekey") {
      if (!currentProfile) {
        return jsonWithOwner({ error: "Esta biblioteca no está sincronizada todavía." }, 409, null);
      }

      if (ownerId === targetOwnerId) {
        await db.prepare(
          "UPDATE spanish_buddy_sync_profiles SET name = ? WHERE owner_id = ?",
        ).bind(requestedName, ownerId).run();
        return jsonWithOwner({ synced: true, name: requestedName }, 200, null);
      }

      if (targetProfile) {
        return jsonWithOwner(
          { error: "Esa frase ya pertenece a otra biblioteca. Elige una frase nueva para no mezclar contenidos." },
          409,
          null,
        );
      }

      await db.batch([
        ...moveLibraryStatements(db, ownerId, targetOwnerId, false),
        db.prepare("DELETE FROM spanish_buddy_sync_profiles WHERE owner_id = ?").bind(ownerId),
        db.prepare(
          "INSERT INTO spanish_buddy_sync_profiles (owner_id, name) VALUES (?, ?)",
        ).bind(targetOwnerId, requestedName),
      ]);

      return jsonWithOwner(
        { synced: true, name: requestedName },
        200,
        spanishBuddyOwnerCookie(request, targetOwnerId),
      );
    }

    if (currentProfile && ownerId !== targetOwnerId) {
      return jsonWithOwner(
        { error: "Esta biblioteca ya está sincronizada. Cambia su frase desde la opción de biblioteca conectada." },
        409,
        null,
      );
    }

    if (ownerId !== targetOwnerId) {
      await db.batch([
        ...moveLibraryStatements(db, ownerId, targetOwnerId, Boolean(targetProfile)),
        db.prepare(
          `INSERT OR IGNORE INTO spanish_buddy_sync_profiles (owner_id, name) VALUES (?, ?)`,
        ).bind(targetOwnerId, requestedName || DEFAULT_LIBRARY_NAME),
      ]);
    } else if (targetProfile) {
      await db.prepare(
        "UPDATE spanish_buddy_sync_profiles SET name = ? WHERE owner_id = ?",
      ).bind(requestedName, targetOwnerId).run();
    } else {
      await db.prepare(
        "INSERT INTO spanish_buddy_sync_profiles (owner_id, name) VALUES (?, ?)",
      ).bind(targetOwnerId, requestedName || DEFAULT_LIBRARY_NAME).run();
    }

    const name = targetProfile?.name ?? requestedName ?? DEFAULT_LIBRARY_NAME;
    return jsonWithOwner(
      { synced: true, name },
      200,
      spanishBuddyOwnerCookie(request, targetOwnerId),
    );
  } catch (error) {
    console.error("Spanish Buddy sync failed", error);
    return jsonWithOwner({ error: "No se ha podido sincronizar la biblioteca." }, 500, null);
  }
}
