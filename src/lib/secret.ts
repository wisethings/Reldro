import { createHash, timingSafeEqual } from "crypto";

/** Compares a supplied secret with the expected one in constant time, so response timing reveals nothing about it. */
export function secretMatches(given: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
