import crypto from "node:crypto";

/*
 * SERVER ONLY. Importing this from a client component is a build error by
 * construction — `node:crypto` cannot be bundled for the browser — and it must
 * stay that way: the key lives in the environment, never in shipped JS.
 */

/**
 * Encryption at rest for the two things in this database that would do real
 * damage if it leaked: client portal passwords and client infrastructure
 * credentials (hosting, domain registrar, analytics).
 *
 * Both were stored as readable text. Anyone with read access to the database —
 * a leaked service-role key, a compromised admin account, a careless backup —
 * would have every client's infrastructure, not just ours.
 *
 * AES-256-GCM: authenticated, so a tampered ciphertext fails to decrypt rather
 * than silently returning wrong plaintext.
 *
 * Format: `enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>`
 * The version marker means a future key rotation or algorithm change can be
 * rolled out without a big-bang migration.
 */

const MARKER = "enc:v1:";

/**
 * 32 raw bytes, supplied base64 or hex.
 *   openssl rand -base64 32
 *
 * Deliberately read at call time rather than module load, so a missing key is
 * an error at the point of use with a message that says what to do — not a
 * crash on boot that takes the whole app down.
 */
function key(): Buffer {
  const raw = process.env.CREDENTIALS_KEY?.trim();
  if (!raw) {
    throw new Error(
      "CREDENTIALS_KEY is not set. Generate one with `openssl rand -base64 32` " +
        "and add it to your environment before storing credentials."
    );
  }

  const buf = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (buf.length !== 32) {
    throw new Error(
      `CREDENTIALS_KEY must decode to 32 bytes (got ${buf.length}). ` +
        "Generate one with `openssl rand -base64 32`."
    );
  }
  return buf;
}

/** True when a stored value is already ciphertext. */
export const isEncrypted = (v: unknown): boolean =>
  typeof v === "string" && v.startsWith(MARKER);

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12); // 96-bit nonce, the GCM standard
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${MARKER}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/**
 * Decrypts a stored value.
 *
 * A value with no marker is legacy plaintext written before this existed, and
 * is returned as-is so nothing breaks while the old rows age out. Anything that
 * fails to decrypt returns null rather than throwing — a credential we cannot
 * read must not take a page down.
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!isEncrypted(stored)) return stored; // legacy plaintext

  try {
    const [ivB64, tagB64, ctB64] = stored.slice(MARKER.length).split(":");
    if (!ivB64 || !tagB64 || !ctB64) return null;

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (e) {
    console.error("Could not decrypt a stored secret:", e);
    return null;
  }
}

/**
 * Encrypts, but never lets a failure block the operation it belongs to.
 *
 * Creating a client account matters more than storing the admin's convenience
 * copy of the password: the password still reaches the client by email either
 * way. Returns null when the key is missing, which stores nothing rather than
 * falling back to plaintext.
 */
export function tryEncrypt(plain: string): string | null {
  try {
    return encryptSecret(plain);
  } catch (e) {
    console.error(
      "Refusing to store a secret in plaintext — set CREDENTIALS_KEY. Nothing was saved.",
      e
    );
    return null;
  }
}

/**
 * The password an admin is still allowed to see.
 *
 * Returns null once the window has passed, so the panel can offer a reset
 * instead of a reveal. The row keeps its ciphertext until the cron purges it —
 * expiry is enforced here as well as there, because a cron that fails must not
 * quietly extend how long a password stays readable.
 */
export function revealPreview(row: {
  portal_password_preview?: string | null;
  password_preview_expires_at?: string | null;
} | null | undefined): string | null {
  if (!row?.portal_password_preview) return null;
  if (
    row.password_preview_expires_at &&
    new Date(row.password_preview_expires_at).getTime() < Date.now()
  ) {
    return null;
  }
  return decryptSecret(row.portal_password_preview);
}

/** A credential pair on a project: hosting, domain, analytics, and so on. */
export type Credential = { label: string; username?: string; secret?: string; url?: string; note?: string };

/** Encrypts only the secret of each credential — labels stay readable for listing. */
export function encryptCredentials(items: Credential[]): Credential[] {
  return items.map((c) => ({
    ...c,
    secret: c.secret ? (tryEncrypt(c.secret) ?? "") : "",
  }));
}

export function decryptCredentials(items: Credential[] | null | undefined): Credential[] {
  return (items ?? []).map((c) => ({ ...c, secret: decryptSecret(c.secret ?? null) ?? "" }));
}
