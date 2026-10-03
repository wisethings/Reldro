import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Netlify DB (Neon) doesn't expose a copyable connection string in its
  // dashboard by design — it's only resolvable at runtime via this SDK call.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getConnectionString } = require("@netlify/database");
    return getConnectionString();
  } catch {
    return undefined;
  }
}

// PRISMA_QUERY_LOG=1 prints every query with its duration, for finding slow or repeated queries. Off by default.
const logQueries = process.env.PRISMA_QUERY_LOG === "1";

function createClient() {
  if (logQueries) {
    const client = new PrismaClient({ datasourceUrl: resolveDatabaseUrl(), log: [{ emit: "event", level: "query" }, "error"] });
    // The event overloads are only typed for clients built with `emit: "event"`, so go through a loose type.
    (client as unknown as { $on: (e: string, cb: (q: { duration: number; query: string }) => void) => void }).$on("query", (q) => console.log(`[q] ${q.duration}ms ${q.query.replace(/\s+/g, " ").slice(0, 160)}`));
    return client;
  }
  return new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
