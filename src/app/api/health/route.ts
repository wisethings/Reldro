import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SCHEMA_SQL_HASH } from "@/lib/runMigration";

export const dynamic = "force-dynamic";

/**
 * Public liveness check for uptime monitors and deploy smoke tests. Says whether the app can reach its database and
 * whether the schema is up to date. It exposes no data and no configuration.
 */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    let schema: "current" | "outdated" | "unknown" = "unknown";
    try {
      const rows = await prisma.$queryRaw<{ appliedHash: string }[]>`SELECT "appliedHash" FROM "_SchemaSyncState" WHERE id = 1`;
      schema = rows[0]?.appliedHash === SCHEMA_SQL_HASH ? "current" : "outdated";
    } catch {
      schema = "unknown";
    }
    return NextResponse.json({ status: "ok", database: "up", schema, tookMs: Date.now() - started }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded", database: "down", tookMs: Date.now() - started }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
