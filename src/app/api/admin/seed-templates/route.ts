import { NextRequest, NextResponse } from "next/server";
import { seedDemoTemplates } from "@/lib/demoTemplateSeed";

// Same guard shape as /api/admin/patch-media and /api/admin/patch-personas -
// a one-time, safe-to-repeat content backfill for the Havenbrook demo org,
// not something that touches a real customer's own templates.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  if (!expected) return false;
  const header = request.headers.get("x-seed-secret");
  const query = request.nextUrl.searchParams.get("secret");
  return header === expected || query === expected;
}

async function runSeed(request: NextRequest) {
  try {
    const org = request.nextUrl.searchParams.get("org") || "Havenbrook";
    const result = await seedDemoTemplates(org);
    return NextResponse.json({ success: true, org, ...result });
  } catch (error) {
    console.error("seed-templates failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSeed(request);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSeed(request);
}
