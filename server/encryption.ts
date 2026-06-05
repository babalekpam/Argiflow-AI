import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    // No key configured — return a deterministic zero-key so reads of existing
    // plaintext still work. Credentials will NOT be encrypted at rest until
    // ENCRYPTION_KEY is set. Log a warning once at startup.
    if (process.env.NODE_ENV === "production") {
      console.warn("[Encryption] ENCRYPTION_KEY is not set — credentials stored in plaintext. Set this env var immediately.");
    }
    return Buffer.alloc(32, 0);
  }
  // Derive a 32-byte key from whatever the operator provides
  return scryptSync(raw, "argiflow-credential-salt-v1", 32);
}

let _key: Buffer | null = null;
function key(): Buffer {
  if (!_key) _key = getKey();
  return _key;
}

export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return plaintext ?? null;
  // Already encrypted — idempotent
  if (plaintext.startsWith(PREFIX)) return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decrypt(value: string | null | undefined): string | null {
  if (value == null || value === "") return value ?? null;
  if (!value.startsWith(PREFIX)) return value; // plaintext — backwards-compat

  const payload = value.slice(PREFIX.length);
  const parts = payload.split(":");
  if (parts.length !== 3) return value; // malformed — return as-is

  try {
    const [ivHex, tagHex, ctHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const ct = Buffer.from(ctHex, "hex");
    const decipher = createDecipheriv(ALGO, key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    // Decryption failed (wrong key, corrupted data) — return null rather than
    // crashing the request. Operator should investigate.
    console.error("[Encryption] Failed to decrypt a credential field — check ENCRYPTION_KEY");
    return null;
  }
}
