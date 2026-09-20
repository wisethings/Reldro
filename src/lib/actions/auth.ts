"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import type { Role } from "@prisma/client";

export type FormState = { error?: string } | undefined;

function destinationForRole(role: Role) {
  if (role === "PLATFORM_ADMIN") return "/platform-admin";
  if (role === "SPECIALIST") return "/dashboard/specialist";
  return "/dashboard/overview";
}

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

export async function signupOrganization(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();

  if (!name || !email || !password || !companyName) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);

  const org = await prisma.organization.create({
    data: {
      name: companyName,
      industry: "",
      size: "",
      revenueRange: "",
      geography: "",
      businessModel: "",
      goals: [],
    },
  });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "COMPANY_ADMIN",
      organizationId: org.id,
    },
  });

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: org.id,
    employeeId: null,
    specialistId: null,
  });

  redirect("/onboarding");
}
