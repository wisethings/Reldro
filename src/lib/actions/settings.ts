"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { deliverInvite, generateTempPassword, type InviteDelivery } from "@/lib/invites";
import { logAudit } from "@/lib/audit";

export type FormState = { success?: boolean; error?: string } | undefined;

export async function updateOrgProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required." };

  const hourlyRateRaw = String(formData.get("blendedHourlyRate") ?? "").trim();
  const blendedHourlyRate = hourlyRateRaw ? Number(hourlyRateRaw) : undefined;
  if (blendedHourlyRate !== undefined && (!Number.isFinite(blendedHourlyRate) || blendedHourlyRate <= 0)) {
    return { error: "Enter a valid blended hourly rate." };
  }

  await prisma.organization.update({
    where: { id: session.organizationId! },
    data: {
      name,
      industry: String(formData.get("industry") ?? ""),
      size: String(formData.get("size") ?? ""),
      geography: String(formData.get("geography") ?? ""),
      blendedHourlyRate,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Value estimates ($/year) are computed once, at opportunity-creation time,
 * from that org's blendedHourlyRate at the time - changing the rate in
 * Settings doesn't retroactively touch existing Opportunity rows on its own.
 * This applies the org's *current* rate to every existing opportunity's
 * already-stored estHoursSavedMonthly, so an admin who corrects an
 * unrealistic default doesn't have to wait for new opportunities to see it
 * reflected. Uses a single UPDATE (not a per-row loop) since the formula is
 * the same for every row.
 */
export async function recalculateOpportunityValues(): Promise<{ updated: number }> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { blendedHourlyRate: true } });

  const updated = await prisma.$executeRaw`
    UPDATE "Opportunity"
    SET "estAnnualValue" = ROUND("estHoursSavedMonthly" * 12 * ${org.blendedHourlyRate})::integer
    WHERE "organizationId" = ${organizationId}
  `;

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "settings.value_estimates_recalculated",
    entityType: "Organization",
    entityId: organizationId,
    metadata: { blendedHourlyRate: org.blendedHourlyRate, updated },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/opportunities");
  revalidatePath("/dashboard/roi");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/overview");
  return { updated };
}

export async function setDepartmentIsolation(enabled: boolean) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  await prisma.organization.update({
    where: { id: session.organizationId! },
    data: { departmentIsolationEnabled: enabled },
  });
  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: enabled ? "settings.department_isolation_enabled" : "settings.department_isolation_disabled",
    entityType: "Organization",
    entityId: session.organizationId,
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/workflows");
  revalidatePath("/dashboard/learn");
  revalidatePath("/dashboard/templates");
}

export type CreateDepartmentState = { error?: string; success?: boolean } | undefined;

export async function createDepartment(_prevState: CreateDepartmentState, formData: FormData): Promise<CreateDepartmentState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Department name is required." };

  const existing = await prisma.department.findUnique({
    where: { organizationId_name: { organizationId: session.organizationId!, name } },
  });
  if (existing) return { error: "A department with that name already exists." };

  await prisma.department.create({ data: { organizationId: session.organizationId!, name } });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/team");
  return { success: true };
}

export type InviteAdminState = ({ error?: string } & InviteDelivery) | undefined;

/**
 * Invites another company admin for the same organization - a plain User
 * with role COMPANY_ADMIN, no Employee record, mirroring how the org's
 * first admin is provisioned. Lets an org run with more than one admin
 * instead of a single account being a bottleneck (or single point of loss).
 */
export async function inviteCompanyAdmin(_prevState: InviteAdminState, formData: FormData): Promise<InviteAdminState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name || !email) return { error: "Name and email are required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId! } });

  const newUser = await prisma.user.create({
    data: { name, email, passwordHash, role: "COMPANY_ADMIN", organizationId: session.organizationId },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "admin.invited",
    entityType: "User",
    entityId: newUser.id,
    metadata: { name, email },
  });

  const delivery = await deliverInvite({
    to: email,
    name,
    orgName: org?.name ?? "Reldro",
    subject: `You're invited to administer ${org?.name ?? "your organization"} on Reldro`,
    tempPassword,
  });

  revalidatePath("/dashboard/settings");
  return delivery;
}
