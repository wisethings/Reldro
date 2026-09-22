import "server-only";
import Stripe from "stripe";
import type { SubscriptionTier } from "@prisma/client";

let client: Stripe | null = null;

/** Returns a Stripe client, or null if STRIPE_SECRET_KEY isn't configured yet. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Price IDs are supplied per-environment (test vs. live mode use different IDs). */
export function priceIdForTier(tier: SubscriptionTier): string | undefined {
  const map: Record<SubscriptionTier, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    GROWTH: process.env.STRIPE_PRICE_GROWTH,
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
  };
  return map[tier];
}
