import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OrgProfileForm } from "@/components/settings/OrgProfileForm";
import { changeSubscriptionTier } from "@/lib/actions/settings";
import { isStripeConfigured, priceIdForTier } from "@/lib/stripe";
import { describeAuditAction } from "@/lib/audit";
import { ensureDefaultPointsRules, ensureDefaultRewardCatalog, getRewardsDashboardStats } from "@/lib/rewards";
import { PointsRulesTable } from "@/components/settings/PointsRulesTable";
import { RewardCatalogAdmin } from "@/components/settings/RewardCatalogAdmin";
import { StatTile } from "@/components/ui/StatTile";

const TIERS = [
  { tier: "STARTER" as const, name: "Starter", price: 499, blurb: "For smaller teams." },
  { tier: "GROWTH" as const, name: "Growth", price: 1500, blurb: "For growing organizations." },
  { tier: "ENTERPRISE" as const, name: "Enterprise", price: 5000, blurb: "Custom pricing available." },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;

  await Promise.all([ensureDefaultPointsRules(session.organizationId), ensureDefaultRewardCatalog(session.organizationId)]);

  const [org, subscription, invoices, auditLogs, pointsRules, rewardItems, rewardsStats] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.organizationId } }),
    prisma.subscription.findUnique({ where: { organizationId: session.organizationId } }),
    prisma.invoice.findMany({ where: { organizationId: session.organizationId }, orderBy: { issuedAt: "desc" }, take: 5 }),
    prisma.auditLog.findMany({
      where: { organizationId: session.organizationId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.pointsRule.findMany({ where: { organizationId: session.organizationId }, orderBy: { key: "asc" } }),
    prisma.rewardItem.findMany({ where: { organizationId: session.organizationId }, orderBy: { pointCost: "asc" } }),
    getRewardsDashboardStats(session.organizationId),
  ]);
  if (!org) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Organization profile, billing, and permissions.</p>
      </div>

      <Card>
        <CardHeader title="Organization profile" />
        <CardBody>
          <OrgProfileForm org={org} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Billing"
          subtitle={subscription ? `Current plan: ${subscription.tier} · $${subscription.pricePerMonth}/mo` : "No active subscription"}
        />
        <CardBody className="space-y-3">
          {params.checkout === "success" && (
            <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">
              Payment successful. Your plan updates as soon as Stripe confirms the subscription.
            </p>
          )}
          {params.checkout === "cancelled" && (
            <p className="rounded-lg bg-olive-soft px-3 py-2 text-sm text-olive">Checkout cancelled — your plan wasn't changed.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => {
              const willCheckout = isStripeConfigured() && Boolean(priceIdForTier(t.tier));
              return (
                <div key={t.tier} className={`rounded-lg border p-4 ${subscription?.tier === t.tier ? "border-brand-600 bg-brand-50" : "border-ink-200"}`}>
                  <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                  <p className="text-lg font-semibold text-ink-900">${t.price}<span className="text-xs font-normal text-ink-500">/mo</span></p>
                  <p className="text-xs text-ink-500">{t.blurb}</p>
                  <form action={changeSubscriptionTier.bind(null, t.tier)} className="mt-3">
                    <button
                      disabled={subscription?.tier === t.tier}
                      className="w-full rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40"
                    >
                      {subscription?.tier === t.tier ? "Current plan" : willCheckout ? "Switch plan" : "Switch plan (demo)"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-ink-400">
            Expert-help engagements are billed separately; Reldro takes a platform fee from those transactions.
            {isStripeConfigured()
              ? " Plan changes are processed by Stripe."
              : " Stripe isn't configured in this environment yet, so plan changes here update the record directly without a real charge."}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent invoices" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm text-ink-800">{inv.description}</p>
                <p className="text-xs text-ink-500">{inv.issuedAt.toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-900">${(inv.amount / 100).toLocaleString()}</span>
                <Badge tone={inv.status === "PAID" ? "green" : "amber"}>{inv.status.toLowerCase()}</Badge>
              </div>
            </div>
          ))}
          {invoices.length === 0 && <p className="p-5 text-sm text-ink-500">No invoices yet.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Activity log" subtitle="Sensitive actions taken on this organization, most recent first." />
        <CardBody className="divide-y divide-ink-200 p-0">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink-800">{describeAuditAction(log.action)}</p>
                <p className="text-xs text-ink-500">{log.user?.name ?? "System"} · {log.createdAt.toLocaleString()}</p>
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && <p className="p-5 text-sm text-ink-500">No activity recorded yet.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Reward program" subtitle="Real, org-wide totals - not attributed ROI, since that needs longitudinal data this demo doesn't have" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Total points issued" value={rewardsStats.totalPointsIssued.toLocaleString()} />
            <StatTile label="Total points redeemed" value={rewardsStats.totalPointsRedeemed.toLocaleString()} />
            <StatTile label="Outstanding balance" value={rewardsStats.outstandingBalance.toLocaleString()} />
            <StatTile label="Redemptions" value={rewardsStats.redemptionCount} />
            <StatTile label="Recognitions given" value={rewardsStats.recognitionCount} />
            <StatTile
              label="Participation"
              value={`${rewardsStats.participatingEmployees} / ${rewardsStats.totalEmployees}`}
              helpText="Employees with at least one point transaction"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Reward rules" subtitle="Which behaviors earn points, and how much - never logins or time in the app" />
        <PointsRulesTable rules={pointsRules} />
      </Card>

      <Card>
        <CardHeader title="Reward catalog" subtitle="What employees can redeem points for" />
        <CardBody>
          <RewardCatalogAdmin items={rewardItems} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Permissions" />
        <CardBody className="space-y-2 text-sm text-ink-700">
          <p>Company admins have full organization access. Employees see only their own profile, learning, and assigned workflows.</p>
          <p>Each organization's data is fully isolated — no user can access another organization's records.</p>
        </CardBody>
      </Card>
    </div>
  );
}
