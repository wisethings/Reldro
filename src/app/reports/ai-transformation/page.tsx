import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getOrgTrend, getLatestOrgSnapshot, getRealAdoptionMetrics } from "@/lib/queries/adoption";
import { getOrgValueCapture } from "@/lib/queries/value";
import { getAiWaste } from "@/lib/queries/waste";
import { maturityBand } from "@/lib/scoring";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";
import { PrintReportButton } from "@/components/reports/PrintReportButton";

/**
 * A leadership-facing summary of the org's AI transformation progress -
 * real numbers pulled from the same queries the Overview/Analytics/ROI
 * pages use, laid out for printing (the "Download as PDF" button is just
 * the browser's native print-to-PDF, so this never depends on a headless
 * browser or PDF library in the serverless runtime). Deliberately outside
 * /dashboard so it renders without the app shell/sidebar.
 */
export default async function AiTransformationReportPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const organizationId = session.organizationId;

  const [org, trend, latest, metrics, workflowsDeployed, opportunitiesCount, activeInitiatives, activeProjects, valueCapture, waste, topOpportunities] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      getOrgTrend(organizationId, 6),
      getLatestOrgSnapshot(organizationId),
      getRealAdoptionMetrics(organizationId),
      prisma.organizationWorkflow.count({ where: { organizationId, status: { in: DEPLOYED_STATUSES } } }),
      prisma.opportunity.count({ where: { organizationId } }),
      prisma.initiative.count({ where: { organizationId, status: "IN_PROGRESS" } }),
      prisma.project.count({ where: { organizationId, status: "ACTIVE" } }),
      getOrgValueCapture(organizationId),
      getAiWaste(organizationId),
      prisma.opportunity.findMany({
        where: { organizationId, status: { in: ["IDENTIFIED", "PLANNED"] } },
        orderBy: { estAnnualValue: "desc" },
        take: 5,
        include: { department: true },
      }),
    ]);

  const score = latest?.aiAdoptionScore ?? 0;
  const band = maturityBand(score);
  const generatedAt = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/dashboard/analytics" className="text-sm font-medium text-ink-500 hover:text-ink-800">
          ← Back to Analytics
        </Link>
        <PrintReportButton />
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-ink-200 pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">AI Transformation Report</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink-900">{org?.name}</h1>
            <p className="mt-1 text-sm text-ink-500">Generated {generatedAt}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-semibold text-ink-900">{score}</p>
            <p className="text-xs text-ink-500">AI Adoption Score / 100</p>
            <p className="mt-1 text-xs font-medium text-orchid-deep">{band.label}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink-600">{band.description}</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ReportStat label="Employees actively using AI" value={`${metrics.activeUsers} / ${metrics.totalUsers}`} />
          <ReportStat label="AI adoption" value={`${metrics.adoptionPct}%`} />
          <ReportStat label="AI workflows deployed" value={String(workflowsDeployed)} />
          <ReportStat label="Est. monthly hours saved" value={metrics.hoursSavedMonthly.toLocaleString()} />
          <ReportStat label="AI opportunities identified" value={String(opportunitiesCount)} />
          <ReportStat label="Active AI initiatives" value={String(activeInitiatives)} />
          <ReportStat label="Active specialist projects" value={String(activeProjects)} />
          <ReportStat label="Company size" value={org?.size ?? "-"} />
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ink-900">Adoption score over time</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs text-ink-500">
                <th className="pb-2 font-medium">Month</th>
                <th className="pb-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((t) => (
                <tr key={t.month} className="border-b border-ink-100">
                  <td className="py-1.5 text-ink-700">{t.month}</td>
                  <td className="py-1.5 font-medium text-ink-900">{t.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Value capture</h2>
            <p className="mt-2 text-2xl font-semibold text-ink-900">${(valueCapture.capturedValue / 1000).toFixed(0)}k / yr</p>
            <p className="text-xs text-ink-500">captured of ${(valueCapture.potentialValue / 1000).toFixed(0)}k/yr identified potential</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink-900">AI waste (last 30 days)</h2>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{waste.wastePct}%</p>
            <p className="text-xs text-ink-500">of AI activity happening outside a standardized, measured workflow</p>
          </div>
        </div>

        {topOpportunities.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-ink-900">Top unrealized opportunities</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs text-ink-500">
                  <th className="pb-2 font-medium">Opportunity</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium">Est. annual value</th>
                </tr>
              </thead>
              <tbody>
                {topOpportunities.map((o) => (
                  <tr key={o.id} className="border-b border-ink-100">
                    <td className="py-1.5 text-ink-700">{o.title}</td>
                    <td className="py-1.5 text-ink-500">{o.department?.name ?? "Cross-functional"}</td>
                    <td className="py-1.5 font-medium text-ink-900">${(o.estAnnualValue / 1000).toFixed(0)}k/yr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-10 text-[11px] text-ink-400">Reldro · AI adoption OS · Real product data, not simulated figures.</p>
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 p-3 print:border-ink-300">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}
