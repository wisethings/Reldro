import { NextRequest, NextResponse } from "next/server";
import { patchDemoPersonas } from "@/lib/patchDemoPersonas";

// Same guard shape as /api/admin/patch-media - a one-time, safe-to-repeat
// content backfill an already-deployed database can pick up without a
// destructive full reseed.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  if (!expected) return false;
  const header = request.headers.get("x-seed-secret");
  const query = request.nextUrl.searchParams.get("secret");
  return header === expected || query === expected;
}

async function runPatch() {
  try {
    const result = await patchDemoPersonas();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("patch-personas failed:", error);
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
