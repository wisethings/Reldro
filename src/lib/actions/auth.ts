"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { destinationForRole } from "@/lib/auth/roleHome";

export type FormState = { error?: string } | undefined;

export async function login(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true, specialist: true },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    employeeId: user.employee?.id ?? null,
    specialistId: user.specialist?.id ?? null,
  });

  const org = user.organizationId
    ? await prisma.organization.findUnique({ where: { id: user.organizationId } })
    : null;

  redirect(org && !org.onboardingDone ? "/onboarding" : destinationForRole(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

