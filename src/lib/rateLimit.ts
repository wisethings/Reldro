import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/** Best-effort client IP for Server Actions, which don't get a request object directly. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const nf = h.get("x-nf-client-connection-ip");
  if (nf) return nf;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

/**
 * Fixed-window rate limiter backed by RateLimitHit. Returns false (and does
 * not record a hit) once `limit` hits have already landed within the
 * trailing `windowMinutes` for this key. Opportunistically prunes its own
 * old rows so the table doesn't grow unbounded.
 */
export async function checkRateLimit(key: string, limit: number, windowMinutes: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60_000);
  const recent = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: windowStart } } });
  if (recent >= limit) return false;
  await prisma.rateLimitHit.create({ data: { key } });
  await prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: windowStart } } }).catch(() => {});
  return true;
}
