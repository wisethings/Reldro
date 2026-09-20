"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";

export type FormState = { error?: string; tempPassword?: string } | undefined;

function generateTempPassword() {
  return `Reldro-${Math.random().toString(36).slice(2, 8)}!`;
}

export async function inviteEmployee(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const departmentId = String(formData.get("departmentId") ?? "");
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();

  if (!name || !email || !jobTitle) return { error: "Name, email, and job title are required." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.create({
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
          jobTitle,
        },
      },
    },
  });

  revalidatePath("/dashboard/team");
  return { tempPassword };
}
