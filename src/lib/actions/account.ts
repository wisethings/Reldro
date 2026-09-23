"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

export type FormState = { error?: string; success?: boolean } | undefined;

export async function changePassword(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.sub } });
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: user.id,
    action: "account.password_changed",
    entityType: "User",
    entityId: user.id,
  });

  return { success: true };
}
