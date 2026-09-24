"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { destinationForRole } from "@/lib/auth/roleHome";
import { ensureSchemaMigrated } from "@/lib/runMigration";

/**
 * Demo-only shortcut so reviewers can see the product populated with real
 * data without typing credentials. Only works for the seeded demo emails.
 */
export async function loginAsDemo(email: string) {
  await ensureSchemaMigrated();
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
