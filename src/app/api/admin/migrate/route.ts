import { NextRequest, NextResponse } from "next/server";
import { runMigration } from "@/lib/runMigration";

// Manual trigger for the same idempotent schema sync that now also runs
// automatically (see src/lib/runMigration.ts). Kept around for on-demand
// re-runs and for inspecting exactly what applied/failed. Guarded by a
// secret so it can't be triggered by anyone else. Supports GET with a
// ?secret= query param so it can be triggered by simply visiting the URL.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  if (!expected) return false;
  const header = request.headers.get("x-seed-secret");
  const query = request.nextUrl.searchParams.get("secret");
  return header === expected || query === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runMigration());
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runMigration());
}
