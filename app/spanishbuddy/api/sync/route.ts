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

export async function GET(request: Request) {
  const { ownerId, setCookie } = getOwner(request);
  try {
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const profile = await db.prepare(
      "SELECT owner_id FROM spanish_buddy_sync_profiles WHERE owner_id = ?",
    ).bind(ownerId).first<{ owner_id: string }>();
    return jsonWithOwner({ synced: Boolean(profile) }, 200, setCookie);
  } catch (error) {
    console.error("Spanish Buddy sync status failed", error);
    return jsonWithOwner({ synced: false }, 200, setCookie);
  }
}

export async function DELETE(request: Request) {
  const anonymousOwnerId = crypto.randomUUID();
  return jsonWithOwner(
    { synced: false },
    200,
    spanishBuddyOwnerCookie(request, anonymousOwnerId),
  );
}

export async function POST(request: Request) {
  const { ownerId } = getOwner(request);
  let payload: { passphrase?: unknown };
  try {
    payload = await request.json() as typeof payload;
  } catch {
    return jsonWithOwner({ error: "No se ha podido leer la frase de sincronización." }, 400, null);
  }

  const passphrase = typeof payload.passphrase === "string" ? payload.passphrase.trim() : "";
  if (passphrase.length < MIN_PASSPHRASE_LENGTH || passphrase.length > MAX_PASSPHRASE_LENGTH) {
    return jsonWithOwner(
      { error: `Usa una frase de entre ${MIN_PASSPHRASE_LENGTH} y ${MAX_PASSPHRASE_LENGTH} caracteres.` },
      400,
      null,
    );
  }

  try {
    const targetOwnerId = await syncedOwnerId(passphrase);
    const db = await getSpanishBuddyDatabase();
    await ensureSpanishBuddySchema(db);
    const currentProfile = await db.prepare(
      "SELECT owner_id FROM spanish_buddy_sync_profiles WHERE owner_id = ?",
    ).bind(ownerId).first<{ owner_id: string }>();

    if (currentProfile && ownerId !== targetOwnerId) {
      return jsonWithOwner(
        { error: "Esta biblioteca ya está sincronizada. No se puede cambiar su frase desde aquí." },
        409,
        null,
      );
    }

    if (ownerId !== targetOwnerId) {
      const ownedTables = [
        "spanish_buddy_lessons",
        "spanish_buddy_items",
        "spanish_buddy_attempts",
        "spanish_buddy_answer_cache",
        "spanish_buddy_ai_usage",
        "spanish_buddy_exercise_variants",
      ];
      await db.batch([
        ...ownedTables.map((table) => db.prepare(
          `UPDATE ${table} SET owner_id = ? WHERE owner_id = ?`,
        ).bind(targetOwnerId, ownerId)),
        db.prepare(
          "INSERT OR IGNORE INTO spanish_buddy_sync_profiles (owner_id) VALUES (?)",
        ).bind(targetOwnerId),
      ]);
    } else {
      await db.prepare(
        "INSERT OR IGNORE INTO spanish_buddy_sync_profiles (owner_id) VALUES (?)",
      ).bind(targetOwnerId).run();
    }

    return jsonWithOwner(
      { synced: true },
      200,
      spanishBuddyOwnerCookie(request, targetOwnerId),
    );
  } catch (error) {
    console.error("Spanish Buddy sync failed", error);
    return jsonWithOwner({ error: "No se ha podido sincronizar la biblioteca." }, 500, null);
  }
}
