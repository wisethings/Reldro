"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getStripe, priceIdForTier } from "@/lib/stripe";
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

/**
 * Switches plan. When Stripe is configured (STRIPE_SECRET_KEY + a price ID
 * for this tier), this redirects to a real Stripe Checkout session and the
 * Subscription row is updated by the webhook once payment succeeds - the
 * direct DB write below never runs for that path. Without Stripe configured
 * it falls back to a direct update so the demo keeps working unconfigured.
 */
export async function changeSubscriptionTier(tier: SubscriptionTier) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  const priceId = priceIdForTier(tier);
  const stripe = getStripe();
  if (stripe && priceId) {
    const [org, subscription] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
      prisma.subscription.findUnique({ where: { organizationId } }),
    ]);

    let customerId = subscription?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.email,
        name: org.name,
        metadata: { organizationId },
      });
      customerId = customer.id;
      await prisma.subscription.upsert({
        where: { organizationId },
        update: { stripeCustomerId: customerId },
        create: {
          organizationId,
          tier,
          status: "TRIALING",
          seats: 25,
          pricePerMonth: TIER_PRICE[tier],
          currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          stripeCustomerId: customerId,
        },
      });
    }

    const host = (await headers()).get("host");
    const baseUrl = `https://${host}`;
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/settings?checkout=success`,
      cancel_url: `${baseUrl}/dashboard/settings?checkout=cancelled`,
      metadata: { organizationId, tier },
      subscription_data: { metadata: { organizationId, tier } },
    });

    redirect(checkoutSession.url!);
  }

  await prisma.subscription.upsert({
    where: { organizationId },
    update: { tier, pricePerMonth: TIER_PRICE[tier] },
    create: {
      organizationId,
      tier,
      status: "ACTIVE",
      seats: 25,
      pricePerMonth: TIER_PRICE[tier],
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  revalidatePath("/dashboard/settings");
}
