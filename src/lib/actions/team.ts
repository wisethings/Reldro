"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { deliverInvite, generateTempPassword, type InviteDelivery } from "@/lib/invites";
import { logAudit } from "@/lib/audit";

export type FormState = ({ error?: string } & InviteDelivery) | undefined;

export async function inviteEmployee(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const departmentId = String(formData.get("departmentId") ?? "");
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const siteId = String(formData.get("siteId") ?? "");

  if (!name || !email || !jobTitle) return { error: "Name, email, and job title are required." };

  // The <select> only ever lists this admin's own departments, but the
  // server action has to enforce that too - otherwise a crafted request with
  // another org's departmentId would corrupt that org's department roster.
  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department || department.organizationId !== session.organizationId) {
      return { error: "That department wasn't found." };
    }
  }

  if (siteId) {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site || site.organizationId !== session.organizationId) return { error: "That site wasn't found." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId! } });

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "EMPLOYEE",
      organizationId: session.organizationId,
      employee: {
        create: {
          organizationId: session.organizationId!,
          departmentId: departmentId || null,
          siteId: siteId || null,
          jobTitle,
        },
      },
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "employee.invited",
    entityType: "User",
    entityId: newUser.id,
    metadata: { name, email, jobTitle },
  });

  const delivery = await deliverInvite({
    to: email,
    name,
    orgName: org?.name ?? "Reldro",
    subject: `You're invited to ${org?.name ?? "Reldro"} on Reldro`,
    tempPassword,
  });

  revalidatePath("/dashboard/training");
  return delivery;
}
