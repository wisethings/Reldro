import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { OrgProfileForm } from "@/components/settings/OrgProfileForm";
import { describeAuditAction } from "@/lib/audit";
import { ensureDefaultPointsRules, ensureDefaultRewardCatalog, getRewardsDashboardStats } from "@/lib/rewards";
import { PointsRulesTable } from "@/components/settings/PointsRulesTable";
import { RewardCatalogAdmin } from "@/components/settings/RewardCatalogAdmin";
import { StatTile } from "@/components/ui/StatTile";

export default async function SettingsPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

  await Promise.all([ensureDefaultPointsRules(session.organizationId), ensureDefaultRewardCatalog(session.organizationId)]);

  const [org, subscription, auditLogs, pointsRules, rewardItems, rewardsStats] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.organizationId } }),
    prisma.subscription.findUnique({ where: { organizationId: session.organizationId } }),
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
          subtitle={
            subscription
              ? `Current plan: ${subscription.tier.charAt(0) + subscription.tier.slice(1).toLowerCase()}`
              : "No active subscription"
          }
        />
        <CardBody className="space-y-2">
          <p className="text-sm text-ink-700">
            Reldro plans are tailored to your organization. Your account manager handles plan changes, seat count, and
            invoicing directly.
          </p>
          <p className="text-xs text-ink-400">Expert-help engagements are billed separately from your subscription.</p>
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
          <p>Each organization's data is fully isolated. No user can access another organization's records.</p>
        </CardBody>
      </Card>
    </div>
  );
}
