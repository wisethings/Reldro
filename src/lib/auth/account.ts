import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export type Account = {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
  employeeId: string | null;
  siteId: string | null;
  isSafetyLead: boolean;
  isDepartmentAdmin: boolean;
  orgName: string | null;
  onboardingDone: boolean;
  suspendedAt: Date | null;
};

type Row = {
  id: string; email: string; name: string; role: Role; organizationId: string | null;
  employeeId: string | null; siteId: string | null; isSafetyLead: boolean | null; isDepartmentAdmin: boolean | null;
  orgName: string | null; onboardingDone: boolean | null; suspendedAt: Date | null;
};

/**
 * Everything the request needs to know about the signed-in person - the account, their employee record and their
 * company - in a single round trip, and read once per request however many layouts, pages and guards ask for it.
 * (Separate lookups for each cost four sequential trips to the database before any page content could start.)
 */
export const loadAccount = cache(async (userId: string): Promise<Account | null> => {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT u."id", u."email", u."name", u."role"::text AS "role", u."organizationId",
           e."id" AS "employeeId", e."siteId", e."isSafetyLead", e."isDepartmentAdmin",
           o."name" AS "orgName", o."onboardingDone", o."suspendedAt"
    FROM "User" u
    LEFT JOIN "Employee" e ON e."userId" = u."id"
    LEFT JOIN "Organization" o ON o."id" = u."organizationId"
    WHERE u."id" = ${userId}
    LIMIT 1`;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id, email: r.email, name: r.name, role: r.role, organizationId: r.organizationId,
    employeeId: r.employeeId, siteId: r.siteId, isSafetyLead: Boolean(r.isSafetyLead), isDepartmentAdmin: Boolean(r.isDepartmentAdmin),
    orgName: r.orgName, onboardingDone: Boolean(r.onboardingDone), suspendedAt: r.suspendedAt,
  };
});
