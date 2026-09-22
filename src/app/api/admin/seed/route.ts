import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "../../../../../prisma/seed";

// One-time setup endpoint for populating demo data on a freshly deployed
// environment where the database can't be reached directly (e.g. Netlify
// DB, whose connection string is only resolvable at runtime). Guarded by a
// secret so it can't be triggered by anyone else.
export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-seed-secret");
  const expected = process.env.SEED_SECRET;

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await seedDatabase();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
