import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/** Best-effort client IP for Server Actions, which don't get a request object directly. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  // Behind Cloudflare, Netlify sees Cloudflare's edge address, so the visitor's real address is in CF-Connecting-IP.
  // Only trusted once TRUST_CLOUDFLARE_IP=true is set (after the proxy is live), because anyone who reaches the
  // origin directly could otherwise send their own value.
  if (process.env.TRUST_CLOUDFLARE_IP === "true") {
    const cf = h.get("cf-connecting-ip")?.trim();
    if (cf && /^[0-9a-fA-F:.]{3,45}$/.test(cf)) return cf;
  }
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
