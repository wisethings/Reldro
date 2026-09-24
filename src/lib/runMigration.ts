import "server-only";
import { prisma } from "@/lib/prisma";
import { SCHEMA_SQL } from "@/lib/schema-sql";

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
    migrationPromise = runMigration()
      .then((result) => {
        if (!result.healthy) {
          console.error("Auto schema sync had failures:", result.failures);
        }
      })
      .catch((error) => {
        console.error("Auto schema sync failed:", error);
        migrationPromise = null;
      });
  }
  await migrationPromise;
}
