import { NextRequest, NextResponse } from "next/server";
import { secretMatches } from "@/lib/secret";
import { seedDatabase } from "../../../../../prisma/seed";

// One-time setup endpoint for populating demo data on a freshly deployed
// environment where the database can't be reached directly (e.g. Netlify
// DB, whose connection string is only resolvable at runtime). Guarded by a
// secret so it can't be triggered by anyone else. Supports GET with a
// ?secret= query param so it can be triggered by simply visiting the URL.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  return secretMatches(request.headers.get("x-seed-secret"), expected) || secretMatches(request.nextUrl.searchParams.get("secret"), expected);
}

async function runSeed() {
  try {
    await seedDatabase();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSeed();
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSeed();
}
