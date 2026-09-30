"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { deliverInvite, generateTempPassword, type InviteDelivery } from "@/lib/invites";

export type ResendInviteResult = ({ error?: string } & InviteDelivery) | undefined;

/**
 * Issues a fresh temporary password and re-sends the invite. Only allowed
 * while the invite is still pending (the person has never logged in) -
 * otherwise this would silently reset a working account's password.
 */
export async function resendInvite(userId: string): Promise<ResendInviteResult> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.organizationId !== session.organizationId || (user.role !== "COMPANY_ADMIN" && user.role !== "EMPLOYEE")) {
    return { error: "User not found." };
  }
  if (user.lastLoginAt) return { error: "This person has already logged in, so there's no pending invite to resend." };

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(tempPassword), failedLoginAttempts: 0, lockedUntil: null },
  });

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId! } });
  const orgName = org?.name ?? "Reldro";
  const delivery = await deliverInvite({
    to: user.email,
    name: user.name,
    orgName,
    subject: user.role === "COMPANY_ADMIN" ? `You're invited to administer ${orgName} on Reldro` : `You're invited to ${orgName} on Reldro`,
    tempPassword,
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "invite.resent",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email, emailSent: Boolean(delivery.emailSent) },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/training");
  return delivery;
}

export async function removeCompanyAdmin(userId: string): Promise<{ error?: string }> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (userId === session.sub) return { error: "You can't remove your own account." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.organizationId !== session.organizationId || user.role !== "COMPANY_ADMIN") {
    return { error: "Admin not found." };
  }

  const adminCount = await prisma.user.count({ where: { organizationId: session.organizationId, role: "COMPANY_ADMIN" } });
  if (adminCount <= 1) return { error: "This is the only admin. Invite another admin first." };

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    // Project messages they sent reference the account and can't be orphaned.
    return { error: "This admin has sent project messages, so the account can't be deleted." };
  }

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "admin.removed",
    entityType: "User",
    entityId: userId,
    metadata: { name: user.name, email: user.email },
  });

  revalidatePath("/dashboard/settings");
  return {};
}
