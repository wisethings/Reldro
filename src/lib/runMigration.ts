import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { SCHEMA_SQL } from "@/lib/schema-sql";

const SCHEMA_SQL_HASH = crypto.createHash("sha256").update(SCHEMA_SQL).digest("hex");

// Postgres error codes for "this already exists" (duplicate_object /
// duplicate_table) - expected and harmless every time this re-runs the full
// schema, since most statements were already applied by an earlier run.
// Only failures outside this set are worth ever looking at.
const ALREADY_EXISTS_CODES = ["42710", "42P07"];

function isAlreadyExists(error: string): boolean {
  return ALREADY_EXISTS_CODES.some((code) => error.includes(`Code: \`${code}\``));
}

export async function runMigration() {
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

// Next.js speculatively executes dashboard pages during `next build` itself
// (to probe whether each route can be static), which would otherwise run
// this against the database from inside the build - the one environment
// the original /api/admin/migrate design explicitly can't rely on reaching
// the (Netlify DB) connection string from. Skip entirely during that phase;
// the real, deployed runtime still runs it on the first real request.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Runs the ~270-statement schema patch only when it hasn't already been
 * applied. Without this, every fresh serverless instance would pay for a
 * full sequential scan of every statement ever added to schema-sql.ts -
 * each one its own network round trip to the database - before it could
 * serve its first request. On a cold start that's easily several seconds of
 * a login button silently doing nothing, which reads as "broken" and gets
 * clicked repeatedly. A one-row marker keyed by a hash of the SQL turns the
 * steady-state case (nothing changed since the schema last synced) into two
 * fast queries instead of hundreds.
 */
async function syncIfNeeded(): Promise<void> {
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "_SchemaSyncState" ("id" INTEGER PRIMARY KEY DEFAULT 1, "appliedHash" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`;

  const rows = await prisma.$queryRaw<
    { appliedHash: string }[]
  >`SELECT "appliedHash" FROM "_SchemaSyncState" WHERE id = 1`;
  if (rows[0]?.appliedHash === SCHEMA_SQL_HASH) return;

  const result = await runMigration();
  if (!result.healthy) {
    console.error("Auto schema sync had failures:", result.failures);
    return; // don't record success - the next request will retry the full sync
  }

  await prisma.$executeRaw`
    INSERT INTO "_SchemaSyncState" (id, "appliedHash", "updatedAt") VALUES (1, ${SCHEMA_SQL_HASH}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET "appliedHash" = EXCLUDED."appliedHash", "updatedAt" = CURRENT_TIMESTAMP
  `;
}

let migrationPromise: Promise<void> | null = null;

/**
 * Self-healing schema sync. Every schema change in this project ships as an
 * idempotent SQL patch appended to schema-sql.ts, meant to be applied by
 * visiting /api/admin/migrate after each deploy - but forgetting that one
 * manual step has repeatedly taken the entire app down with "Unknown
 * argument" / "column does not exist" errors on every page, since new code
 * queries columns a not-yet-migrated production database doesn't have yet.
 *
 * Calling this at the top of every session-creating and session-reading
 * entry point applies the same patch automatically, once per warm server
 * instance (memoized), so a deploy can no longer outrun its own migration.
 * A failure clears the memo so the next request retries instead of caching
 * a broken state forever, and is never allowed to throw - schema sync is a
 * best-effort side effect, not something that should itself crash a page.
 */
export async function ensureSchemaMigrated(): Promise<void> {
  if (isBuildPhase) return;
  if (!migrationPromise) {
    migrationPromise = syncIfNeeded().catch((error) => {
      console.error("Auto schema sync failed:", error);
      migrationPromise = null;
    });
  }
  await migrationPromise;
}
