"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import type { SubscriptionTier } from "@prisma/client";

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

const TIER_PRICE: Record<SubscriptionTier, number> = { STARTER: 499, GROWTH: 1500, ENTERPRISE: 5000 };

export async function changeSubscriptionTier(tier: SubscriptionTier) {
  const session = await requireRole(["COMPANY_ADMIN"]);

  await prisma.subscription.upsert({
    where: { organizationId: session.organizationId! },
    update: { tier, pricePerMonth: TIER_PRICE[tier] },
    create: {
      organizationId: session.organizationId!,
      tier,
      status: "ACTIVE",
      seats: 25,
      pricePerMonth: TIER_PRICE[tier],
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  revalidatePath("/dashboard/settings");
}
