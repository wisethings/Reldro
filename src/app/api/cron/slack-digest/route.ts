import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigestsForAllOrgs } from "@/lib/integrations/slackDigest";

/**
 * Sends the weekly Slack digest to every org with a connected Slack
 * workspace. This app has no background job runner, so this is a
 * secret-guarded endpoint meant to be triggered on a schedule by an
 * external cron (e.g. a free cron service hitting this URL weekly) rather
 * than something that runs itself. Same auth pattern as /api/admin/migrate.
 */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  if (!expected) return false;
  const header = request.headers.get("x-seed-secret");
  const query = request.nextUrl.searchParams.get("secret");
  return header === expected || query === expected;
}

async function run() {
  const results = await sendWeeklyDigestsForAllOrgs();
  return {
    total: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await run());
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await run());
}
