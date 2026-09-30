import "server-only";
import crypto from "node:crypto";

// No 0/O/1/I so a code read aloud or copied by hand survives.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** A private case code like K7QF-3MXP-9WDA (~60 bits). Shown once to the reporter and stored only as a hash. */
export function generateFollowUpCode(): string {
  const bytes = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i % 4 === 3 && i < 11) out += "-";
  }
  return out;
}

export function normalizeFollowUpCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashFollowUpCode(code: string): string {
  const pepper = process.env.AUTH_SECRET ?? "";
  return crypto.createHash("sha256").update(`${pepper}:followup:${normalizeFollowUpCode(code)}`).digest("hex");
}
