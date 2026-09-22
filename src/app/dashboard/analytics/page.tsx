import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getOrgTrend } from "@/lib/queries/adoption";
import { getToolUsageBreakdown, getWorkflowAdoptionBreakdown, getTrainingCompletionRate } from "@/lib/queries/analytics";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { AdoptionTrendChart } from "@/components/charts/AdoptionTrendChart";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default async function AnalyticsPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const organizationId = session.organizationId;

  const [trend, deptSnapshots, toolUsage, workflowStatuses, trainingCompletion, employeeCount, latestOrgSnapshot, usageEventCount] =
    await Promise.all([
      getOrgTrend(organizationId, 6),
      prisma.adoptionMetricSnapshot.findMany({
        where: { organizationId, department: { not: null } },
        orderBy: { month: "desc" },
        take: 20,
      }),
      getToolUsageBreakdown(organizationId),
      getWorkflowAdoptionBreakdown(organizationId),
      getTrainingCompletionRate(organizationId),
      prisma.employee.count({ where: { organizationId } }),
      prisma.adoptionMetricSnapshot.findFirst({ where: { organizationId, department: null }, orderBy: { month: "desc" } }),
      prisma.aIUsageEvent.count({ where: { organizationId } }),
    ]);

  const latestMonth = deptSnapshots[0]?.month;
  const currentDeptSnapshots = deptSnapshots.filter((s) => s.month.getTime() === latestMonth?.getTime());

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">AI Adoption Analytics</h1>
          <p className="text-sm text-ink-500">Are employees actually adopting AI?</p>
        </div>
        <Link href="/dashboard/roi" className="text-xs font-medium text-orchid-deep hover:text-oxblood">
          View ROI →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active AI users" value={`${latestOrgSnapshot?.activeUsers ?? 0} / ${employeeCount}`} />
        <StatTile label="AI-assisted actions logged" value={usageEventCount.toLocaleString()} />
        <StatTile label="Training completion" value={`${trainingCompletion}%`} />
        <StatTile label="Hours saved / month" value={(latestOrgSnapshot?.hoursSavedMonthly ?? 0).toLocaleString()} />
      </div>

      <Card>
        <CardHeader title="Adoption over time" subtitle="Org-wide AI Adoption Score" />
        <CardBody>
          <AdoptionTrendChart data={trend.map((t) => ({ month: t.month, score: t.score }))} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Adoption by department" subtitle="Share of employees actively using AI" />
        <CardBody>
          <BarComparisonChart
            data={currentDeptSnapshots.map((s) => ({ label: s.department ?? "", value: s.adoptionPct }))}
            unit="%"
          />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Adoption by tool" subtitle="Logged AI-assisted actions" />
          <CardBody>
            {toolUsage.length > 0 ? (
              <BarComparisonChart data={toolUsage} dataKey="value" labelKey="label" unit=" actions" />
            ) : (
              <p className="text-sm text-ink-500">No usage events logged yet.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Workflow adoption status" />
          <CardBody className="space-y-2">
            {workflowStatuses.map((w) => (
              <div key={w.status} className="flex items-center justify-between text-sm">
                <Badge>{w.status.replace("_", " ").toLowerCase()}</Badge>
                <span className="font-medium text-ink-900">{w.count}</span>
              </div>
            ))}
            {workflowStatuses.length === 0 && <p className="text-sm text-ink-500">No workflows tracked yet.</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
