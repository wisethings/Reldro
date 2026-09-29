"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

export type ProfileState = { error?: string; success?: boolean } | undefined;

/**
 * Anyone can edit their own name and (if they have an employee record) job
 * title. Email and department stay admin-controlled: email is the login
 * identity, and department decides which content someone can see.
 */
export async function updateProfile(_prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();

  if (!name) return { error: "Name is required." };
  if (name.length > 100) return { error: "Name is too long." };
  if (session.employeeId && !jobTitle) return { error: "Job title is required." };
  if (jobTitle.length > 100) return { error: "Job title is too long." };

  await prisma.user.update({ where: { id: session.sub }, data: { name } });
  if (session.employeeId) {
    await prisma.employee.update({ where: { id: session.employeeId }, data: { jobTitle } });
  }

  // The name lives in the signed session cookie, so re-issue it or the old name would show until next login.
  await createSession({ ...session, name });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "account.profile_updated",
    entityType: "User",
    entityId: session.sub,
  });

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
