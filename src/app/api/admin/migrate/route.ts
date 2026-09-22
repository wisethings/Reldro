import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SCHEMA_SQL } from "@/lib/schema-sql";

// One-time setup endpoint that creates the schema on a database whose
// connection string can't be reached from outside the deployed runtime
// (Netlify DB). Guarded by a secret so it can't be triggered by anyone else.
export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-seed-secret");
  const expected = process.env.SEED_SECRET;

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  return NextResponse.json({ total: results.length, failed: failed.length, results });
}
