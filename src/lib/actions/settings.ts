"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

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
