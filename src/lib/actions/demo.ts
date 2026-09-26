"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { destinationForRole } from "@/lib/auth/roleHome";
import { ensureSchemaMigrated } from "@/lib/runMigration";

// The only two identities this action will ever authenticate as, checked
// server-side. Without this, loginAsDemo was a generic "log in as this
// email, no password" primitive - the UI only ever offered these two
// buttons, but the server action itself would happily create a full session
// for ANY email in the database, including a real admin's, since it's a
// server action and therefore callable directly, independent of the UI that
// happens to only bind it to these two.
const DEMO_EMAILS = ["admin@havenbrook.com", "priya.shah@havenbrook.com"];

/**
 * Demo-only shortcut so reviewers can see the product populated with real
 * data without typing credentials. Hard-restricted to the two seeded demo
 * emails above - never trust the caller to only ask for those.
 */
export async function loginAsDemo(email: string) {
  await ensureSchemaMigrated();
  if (!DEMO_EMAILS.includes(email)) redirect("/login?error=demo-unavailable");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true, specialist: true },
  });
  if (!user) redirect("/login?error=demo-unavailable");

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    employeeId: user.employee?.id ?? null,
    specialistId: user.specialist?.id ?? null,
  });

  redirect(destinationForRole(user.role));
}
