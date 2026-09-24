import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/Progress";
import { RoiExplorer } from "@/components/roi/RoiExplorer";
import { getOrgValueCapture, getDepartmentValueCapture } from "@/lib/queries/value";
import { getAdoptionFunnel } from "@/lib/queries/funnel";

export default async function RoiPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

  const [valueCapture, departmentValues, funnel, subscription, latestMonth] = await Promise.all([
    getOrgValueCapture(session.organizationId),
    getDepartmentValueCapture(session.organizationId),
    getAdoptionFunnel(session.organizationId),
    prisma.subscription.findUnique({ where: { organizationId: session.organizationId } }),
    prisma.rOIMetric.findFirst({ where: { organizationId: session.organizationId }, orderBy: { month: "desc" }, select: { month: true } }),
  ]);

  const metrics = latestMonth
    ? await prisma.rOIMetric.findMany({
        where: { organizationId: session.organizationId, month: latestMonth.month },
        orderBy: { annualValue: "desc" },
      })
    : [];

  const annualSubscriptionCost = subscription ? subscription.pricePerMonth * 12 : null;
  const realRoiMultiple =
    annualSubscriptionCost && annualSubscriptionCost > 0
      ? Math.round((valueCapture.capturedValue / annualSubscriptionCost) * 10) / 10
      : null;

  const maxFunnelCount = funnel.stages[0]?.count || 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">ROI</h1>
        <p className="text-sm text-ink-500">The business case behind your AI adoption program.</p>
      </div>

      <Card>
        <CardHeader
          title="Real value capture"
          subtitle="Computed directly from your actual opportunities and adopted workflows"
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Estimated potential value" value={`$${Math.round(valueCapture.potentialValue / 1000)}k`} />
            <StatTile label="Captured annual value" value={`$${Math.round(valueCapture.capturedValue / 1000)}k`} />
            <StatTile label="Remaining potential" value={`$${Math.round(valueCapture.remainingValue / 1000)}k`} />
            <StatTile label="Capture rate" value={`${valueCapture.captureRatePct}%`} />
          </div>
          {realRoiMultiple !== null ? (
            <p className="mt-4 text-sm text-ink-600">
              Captured value is <span className="font-semibold text-ink-900">{realRoiMultiple}x</span> your annual
              Reldro subscription cost (${annualSubscriptionCost!.toLocaleString()}/yr).
            </p>
          ) : (
            <p className="mt-4 text-xs text-ink-400">Add a subscription to see captured value relative to platform cost.</p>
          )}
        </CardBody>
      </Card>

      {departmentValues.length > 0 && (
        <Card>
          <CardHeader title="Value by department" subtitle="Potential vs. captured, ranked by potential value" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {departmentValues.map((d) => (
              <div key={d.department} className="px-5 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-900">{d.department}</span>
                  <span className="text-ink-600">
                    ${Math.round(d.capturedValue / 1000)}k captured / ${Math.round(d.potentialValue / 1000)}k potential
                  </span>
                </div>
                <ProgressBar value={d.captureRatePct} className="mt-1.5" tone={d.captureRatePct >= 50 ? "green" : "amber"} />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="AI adoption funnel" subtitle="How far employees get through the adoption journey" />
        <CardBody className="space-y-3">
          {funnel.stages.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{s.label}</span>
                <span className="font-medium text-ink-900">{s.count}</span>
              </div>
              <ProgressBar value={s.count} max={maxFunnelCount} className="mt-1" />
            </div>
          ))}
          <p className="pt-2 text-xs text-ink-500">
            The last stage annualizes to <span className="font-medium text-ink-800">${Math.round(funnel.annualizedValue / 1000)}k</span> in captured value.
          </p>
        </CardBody>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-ink-900">Scenario model</h2>
        <p className="text-xs text-ink-500">
          A planning tool for stress-testing assumptions and a business case. It doesn't measure real captured value.
        </p>
        <div className="mt-3">
          <RoiExplorer workflows={metrics.map((m) => ({ label: m.workflowLabel, investment: m.investment, annualValue: m.annualValue }))} />
          {metrics.length === 0 && <p className="mt-3 text-sm text-ink-500">No scenario data yet.</p>}
        </div>
      </div>
    </div>
  );
}
