"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { deliverInvite, generateTempPassword, type InviteDelivery } from "@/lib/invites";
import { logAudit } from "@/lib/audit";

export type ProvisionOrgState = ({ error?: string } & InviteDelivery) | undefined;

/**
 * Sales-led provisioning: a platform admin creates the organization and its
 * first COMPANY_ADMIN account after a demo conversation, rather than a
 * prospect self-registering. Mirrors the employee-invite pattern (temp
 * password emailed, or shown here if the email could not be sent).
 */
export async function provisionOrganization(_prevState: ProvisionOrgState, formData: FormData): Promise<ProvisionOrgState> {
  await requireRole(["PLATFORM_ADMIN"]);

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

  const delivery = await deliverInvite({
    to: adminEmail,
    name: adminName,
    orgName: org.name,
    subject: "Your Reldro workspace is ready",
    tempPassword,
  });
  await logAudit({ organizationId: org.id, action: "admin.invited", entityType: "Organization", entityId: org.id, metadata: { provisionedBy: "platform-admin" } });

  revalidatePath("/platform-admin/organizations");
  return delivery;
}
