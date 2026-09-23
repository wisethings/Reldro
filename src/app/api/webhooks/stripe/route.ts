import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import type { SubscriptionTier } from "@prisma/client";

const TIER_PRICE: Record<SubscriptionTier, number> = { STARTER: 499, GROWTH: 1500, ENTERPRISE: 5000 };

/**
 * Stripe webhook: this is the actual source of truth for subscription
 * state once Stripe is configured. Register this URL
 * (https://<your-domain>/api/webhooks/stripe) in the Stripe dashboard under
 * Developers > Webhooks, subscribed to: checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted,
 * invoice.paid, invoice.payment_failed.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: `Invalid signature: ${error}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId;
      const tier = session.metadata?.tier as SubscriptionTier | undefined;
      if (!organizationId || !tier || !session.subscription || !session.customer) break;

      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

      await prisma.subscription.upsert({
        where: { organizationId },
        update: {
          tier,
          status: "ACTIVE",
          pricePerMonth: TIER_PRICE[tier],
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          currentPeriodEnd: new Date(stripeSub.items.data[0].current_period_end * 1000),
        },
        create: {
          organizationId,
          tier,
          status: "ACTIVE",
          seats: 25,
          pricePerMonth: TIER_PRICE[tier],
          currentPeriodEnd: new Date(stripeSub.items.data[0].current_period_end * 1000),
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        },
      });

      await logAudit({
        organizationId,
        action: "subscription.tier_changed",
        entityType: "Subscription",
        metadata: { tier, source: "stripe_checkout" },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING"> = {
        active: "ACTIVE",
        trialing: "TRIALING",
        past_due: "PAST_DUE",
        unpaid: "PAST_DUE",
        canceled: "CANCELLED",
        incomplete_expired: "CANCELLED",
      };
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: statusMap[sub.status] ?? "ACTIVE",
          currentPeriodEnd: new Date(sub.items.data[0].current_period_end * 1000),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "CANCELLED" },
      });
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;
      const subscription = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
      if (!subscription) break;

      await prisma.invoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        update: { status: event.type === "invoice.paid" ? "PAID" : "OVERDUE" },
        create: {
          organizationId: subscription.organizationId,
          amount: invoice.amount_paid || invoice.amount_due,
          status: event.type === "invoice.paid" ? "PAID" : "OVERDUE",
          issuedAt: new Date(invoice.created * 1000),
          dueAt: invoice.due_date ? new Date(invoice.due_date * 1000) : new Date(invoice.created * 1000),
          description: invoice.lines.data[0]?.description ?? `${subscription.tier} plan - monthly subscription`,
          stripeInvoiceId: invoice.id,
        },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
