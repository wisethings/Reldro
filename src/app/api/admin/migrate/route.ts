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

// Postgres error codes for "this already exists" (duplicate_object /
// duplicate_table) - expected and harmless every time this endpoint re-runs
// the full schema, since most statements were already applied by an earlier
// run. Only failures outside this set are worth ever looking at.
const ALREADY_EXISTS_CODES = ["42710", "42P07"];

function isAlreadyExists(error: string): boolean {
  return ALREADY_EXISTS_CODES.some((code) => error.includes(`Code: \`${code}\``));
}

async function runMigration() {
  const statements = SCHEMA_SQL.split(";\n")
    .map((s) => s.trim())
    .filter(Boolean);

  let appliedNow = 0;
  let alreadyApplied = 0;
  const failures: { statement: string; error: string }[] = [];

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      appliedNow++;
    } catch (error) {
      const message = String(error);
      if (isAlreadyExists(message)) {
        alreadyApplied++;
      } else {
        failures.push({ statement: statement.slice(0, 80), error: message });
      }
    }
  }

  return {
    total: statements.length,
    appliedNow,
    alreadyApplied,
    failed: failures.length,
    healthy: failures.length === 0,
    failures,
  };
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
