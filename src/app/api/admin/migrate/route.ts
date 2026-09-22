import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SCHEMA_SQL } from "@/lib/schema-sql";

// One-time setup endpoint that creates the schema on a database whose
// connection string can't be reached from outside the deployed runtime
// (Netlify DB). Guarded by a secret so it can't be triggered by anyone else.
// Supports GET with a ?secret= query param so it can be triggered by simply
// visiting the URL in a browser, not just via curl/POST.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  if (!expected) return false;
  const header = request.headers.get("x-seed-secret");
  const query = request.nextUrl.searchParams.get("secret");
  return header === expected || query === expected;
}

async function runMigration() {
  const statements = SCHEMA_SQL.split(";\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const results: { statement: string; ok: boolean; error?: string }[] = [];

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      results.push({ statement: statement.slice(0, 60), ok: true });
    } catch (error) {
      results.push({ statement: statement.slice(0, 60), ok: false, error: String(error) });
    }
  }

  const failed = results.filter((r) => !r.ok);
  return { total: results.length, failed: failed.length, results };
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
