import { NextRequest, NextResponse } from "next/server";
import { patchDemoMedia } from "@/lib/patchDemoMedia";

// One-time content backfill, same shape and guard as /api/admin/seed - lets
// an already-deployed database pick up new illustration images on the
// global catalog without a destructive full reseed.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  if (!expected) return false;
  const header = request.headers.get("x-seed-secret");
  const query = request.nextUrl.searchParams.get("secret");
  return header === expected || query === expected;
}

async function runPatch() {
  try {
    const result = await patchDemoMedia();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("patch-media failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runPatch();
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runPatch();
}
