"use server";

import { fail } from "@/lib/actionResult";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { deliverInvite, generateTempPassword, type InviteDelivery } from "@/lib/invites";
import { logAudit } from "@/lib/audit";
import { seatBlockMessage } from "@/lib/seats";

export type FormState = { success?: boolean; error?: string } | undefined;

export async function updateOrgProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required." };

  await prisma.organization.update({
    where: { id: session.organizationId! },
    data: {
      name,
      industry: String(formData.get("industry") ?? ""),
      size: String(formData.get("size") ?? ""),
      geography: String(formData.get("geography") ?? ""),
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export type CreateDepartmentState = { error?: string; success?: boolean } | undefined;

export async function createDepartment(_prevState: CreateDepartmentState, formData: FormData): Promise<CreateDepartmentState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Crew name is required." };

  const existing = await prisma.department.findUnique({
    where: { organizationId_name: { organizationId: session.organizationId!, name } },
  });
  if (existing) return { error: "A crew with that name already exists." };

  await prisma.department.create({ data: { organizationId: session.organizationId!, name } });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/training");
  return { success: true };
}

/** Renames a crew. People keep their assignment; only the label changes. */
export async function renameDepartment(departmentId: string, newName: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = newName.trim().slice(0, 80);
  if (!name) return fail("Crew name is required.");
  const dept = await prisma.department.findFirst({ where: { id: departmentId, organizationId: session.organizationId! } });
  if (!dept) return fail("Crew not found.");
  if (dept.name === name) return;
  const clash = await prisma.department.findUnique({ where: { organizationId_name: { organizationId: session.organizationId!, name } } });
  if (clash) return fail("A crew with that name already exists.");
  await prisma.department.update({ where: { id: dept.id }, data: { name } });
  await logAudit({ organizationId: session.organizationId!, userId: session.sub, action: "safety.settings_changed", entityType: "Department", entityId: dept.id, metadata: { renamed: true } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/training");
}

/** Deletes a crew. People in it are kept and simply have no crew until an admin assigns another. */
export async function deleteDepartment(departmentId: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const dept = await prisma.department.findFirst({ where: { id: departmentId, organizationId: session.organizationId! } });
  if (!dept) return fail("Crew not found.");
  await prisma.$transaction([
    prisma.employee.updateMany({ where: { departmentId: dept.id }, data: { departmentId: null } }),
    prisma.department.delete({ where: { id: dept.id } }),
  ]);
  await logAudit({ organizationId: session.organizationId!, userId: session.sub, action: "safety.settings_changed", entityType: "Department", entityId: dept.id, metadata: { deleted: true } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/training");
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

  const noSeat = await seatBlockMessage(session.organizationId!);
  if (noSeat) return { error: noSeat };

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
