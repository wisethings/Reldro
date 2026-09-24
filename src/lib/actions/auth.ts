"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { destinationForRole } from "@/lib/auth/roleHome";
import { logAudit } from "@/lib/audit";

export type FormState = { error?: string } | undefined;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function login(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true, specialist: true },
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return { error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` };
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    if (user) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null;
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedUntil } });
      if (lockedUntil) {
        await logAudit({
          organizationId: user.organizationId,
          userId: user.id,
          action: "account.locked",
          entityType: "User",
          entityId: user.id,
          metadata: { minutes: LOCKOUT_MINUTES },
        });
        return { error: `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.` };
      }
    }
    return { error: "Invalid email or password." };
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
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

