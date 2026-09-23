"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail, orgProvisionedEmailHtml } from "@/lib/email";
import type { DemoRequestStatus } from "@prisma/client";

function generateTempPassword() {
  return `Reldro-${Math.random().toString(36).slice(2, 8)}!`;
}

export type ProvisionOrgState = { error?: string; emailSent?: boolean; tempPassword?: string } | undefined;

/**
 * Sales-led provisioning: a platform admin creates the organization and its
 * first COMPANY_ADMIN account after a demo conversation, rather than a
 * prospect self-registering. Mirrors the employee-invite pattern (temp
 * password emailed, or shown here if email isn't configured).
 */
export async function provisionOrganization(_prevState: ProvisionOrgState, formData: FormData): Promise<ProvisionOrgState> {
  await requireRole(["PLATFORM_ADMIN"]);

  const demoRequestId = String(formData.get("demoRequestId") ?? "").trim() || undefined;
  const companyName = String(formData.get("companyName") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim();
  const geography = String(formData.get("geography") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();

  if (!companyName || !adminName || !adminEmail) {
    return { error: "Company name, admin name, and admin email are required." };
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) return { error: "An account with that email already exists." };

  const org = await prisma.organization.create({
    data: { name: companyName, industry, size, revenueRange: "", geography, businessModel: "", goals: [] },
  });

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.create({
    data: { name: adminName, email: adminEmail, passwordHash, role: "COMPANY_ADMIN", organizationId: org.id },
  });

  if (demoRequestId) {
    await prisma.demoRequest.update({ where: { id: demoRequestId }, data: { status: "CONVERTED", organizationId: org.id } });
  }

  const host = (await headers()).get("host");
  const { sent } = await sendEmail({
    to: adminEmail,
    subject: "Your Reldro workspace is ready",
    html: orgProvisionedEmailHtml({ name: adminName, orgName: org.name, loginUrl: `https://${host}/login`, tempPassword }),
  });

  revalidatePath("/platform-admin/organizations");
  revalidatePath("/platform-admin/demo-requests");
  return sent ? { emailSent: true } : { tempPassword };
}

export async function setDemoRequestStatus(demoRequestId: string, status: DemoRequestStatus) {
  await requireRole(["PLATFORM_ADMIN"]);
  await prisma.demoRequest.update({ where: { id: demoRequestId }, data: { status } });
  revalidatePath("/platform-admin/demo-requests");
}

export async function approveSpecialist(specialistId: string) {
  await requireRole(["PLATFORM_ADMIN"]);
  await prisma.specialist.update({ where: { id: specialistId }, data: { approved: true } });
  revalidatePath("/platform-admin/specialists");
}

export async function rejectSpecialist(specialistId: string) {
  await requireRole(["PLATFORM_ADMIN"]);
  await prisma.specialist.update({ where: { id: specialistId }, data: { approved: false } });
  revalidatePath("/platform-admin/specialists");
}

export async function toggleFeaturedSpecialist(specialistId: string, featured: boolean) {
  await requireRole(["PLATFORM_ADMIN"]);
  await prisma.specialist.update({ where: { id: specialistId }, data: { featured } });
  revalidatePath("/platform-admin/specialists");
}
