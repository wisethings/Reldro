import bcrypt from "bcryptjs";

// 12 rounds is the current OWASP-recommended floor. Existing hashes made at a
// lower cost factor keep verifying correctly - bcrypt embeds its own cost in
// the hash string - so this only affects passwords hashed from here on.
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
