import { NextRequest, NextResponse } from "next/server";
import { secretMatches } from "@/lib/secret";
import { prisma } from "@/lib/prisma";

/**
 * Netlify DB (Neon) suspends its compute after a few minutes of inactivity.
 * The first query after that costs a multi-second "cold start" while Neon
 * wakes the instance back up - on a low-traffic site that's paid by
 * whichever visitor happens to load the first page after an idle spell,
 * and it's the single biggest source of "the app feels slow" complaints
 * that isn't fixable by optimizing app code.
 *
 * This endpoint does nothing but keep that compute warm. It has no effect
 * on its own - something has to call it on a schedule (this app has no
 * background job runner; see /api/cron/slack-digest for the same pattern).
 * Point an external cron (a free service like cron-job.org, a GitHub
 * Actions scheduled workflow, or Netlify's own scheduled functions) at
 * this URL every 4 minutes or so - more often than Neon's autosuspend
 * window - and the app stays warm for real visitors.
 */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  return secretMatches(request.headers.get("x-seed-secret"), expected) || secretMatches(request.nextUrl.searchParams.get("secret"), expected);
}

async function ping() {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, tookMs: Date.now() - start };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await ping());
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await ping());
}
