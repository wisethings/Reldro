import { redirect } from "next/navigation";
import { Building2, CreditCard, History, Gift, Sliders, ShoppingBag, Layers, Eye, ShieldCheck, Lock } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { AdminRow } from "@/components/settings/AdminRow";
import { OrgProfileForm } from "@/components/settings/OrgProfileForm";
import { AddDepartmentForm } from "@/components/settings/AddDepartmentForm";
import { InviteAdminForm } from "@/components/settings/InviteAdminForm";
import { DepartmentIsolationToggle } from "@/components/settings/DepartmentIsolationToggle";
import { describeAuditAction } from "@/lib/audit";
import { ensureDefaultPointsRules, ensureDefaultRewardCatalog, getRewardsDashboardStats } from "@/lib/rewards";
import { PointsRulesTable } from "@/components/settings/PointsRulesTable";
import { RewardCatalogAdmin } from "@/components/settings/RewardCatalogAdmin";
import { StatTile } from "@/components/ui/StatTile";

export default async function SettingsPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

  await Promise.all([ensureDefaultPointsRules(session.organizationId), ensureDefaultRewardCatalog(session.organizationId)]);

  const [org, auditLogs, pointsRules, rewardItems, rewardsStats, departments, admins] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.organizationId } }),
    prisma.auditLog.findMany({
      where: { organizationId: session.organizationId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.pointsRule.findMany({ where: { organizationId: session.organizationId }, orderBy: { key: "asc" } }),
    prisma.rewardItem.findMany({ where: { organizationId: session.organizationId }, orderBy: { pointCost: "asc" } }),
    getRewardsDashboardStats(session.organizationId),
    prisma.department.findMany({ where: { organizationId: session.organizationId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { organizationId: session.organizationId, role: "COMPANY_ADMIN" }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!org) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Organization profile, billing, and permissions.</p>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<Building2 size={18} />} tone="orchid" />} title="Organization profile" />
        <CardBody>
          <OrgProfileForm org={org} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<CreditCard size={18} />} tone="olive" />} title="Billing" />
        <CardBody className="space-y-2">
          <p className="text-sm text-ink-700">
            Reldro plans are tailored to your organization. Your account manager handles plan changes, seat count, and
            invoicing directly.
          </p>
          <p className="text-xs text-ink-400">Expert-help engagements are billed separately from your subscription.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<History size={18} />} tone="sage" />} title="Activity log" subtitle="Sensitive actions taken on this organization, most recent first." />
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
        <CardHeader icon={<IconBadge icon={<Gift size={18} />} tone="coral" />} title="Reward program" subtitle="Org-wide totals, not attributed ROI, since that needs longitudinal data this demo doesn't have" />
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
        <CardHeader icon={<IconBadge icon={<Sliders size={18} />} tone="orchid" />} title="Reward rules" subtitle="Which behaviors earn points, and how much - never logins or time in the app" />
        <PointsRulesTable rules={pointsRules} />
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<ShoppingBag size={18} />} tone="olive" />} title="Reward catalog" subtitle="What employees can redeem points for" />
        <CardBody>
          <RewardCatalogAdmin items={rewardItems} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<Layers size={18} />} tone="sage" />} title="Departments" subtitle="Add a department so you can invite employees into it and scope workflows and lessons to it." />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {departments.map((d) => (
              <span key={d.id} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">
                {d.name}
              </span>
            ))}
            {departments.length === 0 && <p className="text-sm text-ink-500">No departments yet.</p>}
          </div>
          <AddDepartmentForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<Eye size={18} />} tone="coral" />} title="Department visibility" subtitle="Control whether one department's employees can see another department's workflows and lessons." />
        <CardBody>
          <DepartmentIsolationToggle enabled={org.departmentIsolationEnabled} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<ShieldCheck size={18} />} tone="orchid" />} title="Admins" subtitle="Company admins have full organization access. Add more so no single account is a bottleneck." />
        <CardBody className="space-y-4">
          <div className="divide-y divide-ink-200">
            {admins.map((a) => (
              <AdminRow key={a.id} admin={{ id: a.id, name: a.name, email: a.email, pending: a.lastLoginAt === null }} isSelf={a.id === session.sub} />
            ))}
          </div>
          <InviteAdminForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<Lock size={18} />} tone="sage" />} title="Permissions" />
        <CardBody className="space-y-2 text-sm text-ink-700">
          <p>Company admins have full organization access. Department leads manage and can view their own department's team-authored workflows and lessons - a department can have more than one lead. Employees see only their own profile, learning, and assigned workflows.</p>
          <p>Each organization's data is fully isolated. No user can access another organization's records.</p>
        </CardBody>
      </Card>
    </div>
  );
}
