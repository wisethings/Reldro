import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  computePriorityScore,
  computeEffortScore,
  opportunityQuadrant,
  QUADRANT_LABELS,
  type MatrixQuadrant,
} from "@/lib/scoring";
import { redirect } from "next/navigation";

const IMPACT_TONE = { LOW: "neutral", MEDIUM: "amber", HIGH: "green" } as const;
const COMPLEXITY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;
const QUADRANT_ORDER: MatrixQuadrant[] = ["quick-win", "major-project", "fill-in", "reconsider"];

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; impact?: string; complexity?: string; view?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;
  const view = params.view === "matrix" ? "matrix" : "list";

  const [opportunities, departments] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        organizationId: session.organizationId,
        departmentId: params.department || undefined,
        impact: (params.impact as "LOW" | "MEDIUM" | "HIGH") || undefined,
        complexity: (params.complexity as "LOW" | "MEDIUM" | "HIGH") || undefined,
      },
      include: { department: true },
    }),
    prisma.department.findMany({ where: { organizationId: session.organizationId } }),
  ]);

  const enriched = opportunities
    .map((o) => ({
      o,
      priority: computePriorityScore(o),
      effort: computeEffortScore(o.complexity, o.riskScore),
      quadrant: opportunityQuadrant(o),
    }))
    .sort((a, b) => b.priority - a.priority);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Opportunities</h1>
          <p className="text-sm text-ink-500">{enriched.length} AI opportunities identified across your organization.</p>
        </div>
        <div className="flex rounded-lg border border-ink-200 p-0.5 text-xs font-medium">
          <Link href={`?${new URLSearchParams({ ...params, view: "list" }).toString()}`} className={`rounded-md px-3 py-1.5 ${view === "list" ? "bg-ink-900 text-white" : "text-ink-600"}`}>
            List
          </Link>
          <Link href={`?${new URLSearchParams({ ...params, view: "matrix" }).toString()}`} className={`rounded-md px-3 py-1.5 ${view === "matrix" ? "bg-ink-900 text-white" : "text-ink-600"}`}>
            Matrix
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-3">
        <input type="hidden" name="view" value={view} />
        <select name="department" defaultValue={params.department ?? ""} className="rounded-lg border border-ink-300 px-3 py-2 text-sm">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="impact" defaultValue={params.impact ?? ""} className="rounded-lg border border-ink-300 px-3 py-2 text-sm">
          <option value="">All impact levels</option>
          <option value="HIGH">High impact</option>
          <option value="MEDIUM">Medium impact</option>
          <option value="LOW">Low impact</option>
        </select>
        <select name="complexity" defaultValue={params.complexity ?? ""} className="rounded-lg border border-ink-300 px-3 py-2 text-sm">
          <option value="">All complexity</option>
          <option value="LOW">Low complexity</option>
          <option value="MEDIUM">Medium complexity</option>
          <option value="HIGH">High complexity</option>
        </select>
        <button className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800">Filter</button>
      </form>

      {view === "matrix" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {QUADRANT_ORDER.map((q) => (
            <Card key={q}>
              <div className="border-b border-ink-200 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900">{QUADRANT_LABELS[q]}</p>
                <p className="text-xs text-ink-500">{enriched.filter((e) => e.quadrant === q).length} opportunities</p>
              </div>
              <CardBody className="space-y-2 p-3">
                {enriched
                  .filter((e) => e.quadrant === q)
                  .map(({ o }) => (
                    <Link key={o.id} href={`/dashboard/opportunities/${o.id}`} className="block rounded-lg border border-ink-200 p-3 hover:border-brand-300 hover:bg-brand-50/40">
                      <p className="text-sm font-medium text-ink-900">{o.title}</p>
                      <p className="text-xs text-ink-500">{o.department?.name ?? "Cross-functional"} · ${(o.estAnnualValue / 1000).toFixed(0)}k/yr</p>
                    </Link>
                  ))}
                {enriched.filter((e) => e.quadrant === q).length === 0 && (
                  <p className="p-3 text-xs text-ink-400">Nothing here right now.</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="divide-y divide-ink-200 p-0">
            {enriched.length === 0 && <p className="p-6 text-sm text-ink-500">No opportunities match these filters.</p>}
            {enriched.map(({ o, priority, quadrant }) => (
              <Link
                key={o.id}
                href={`/dashboard/opportunities/${o.id}`}
                className="flex flex-col gap-2 px-5 py-4 hover:bg-ink-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{o.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{o.department?.name ?? "Cross-functional"} · {QUADRANT_LABELS[quadrant]}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {o.recommendedSpecialist && <Badge tone="blue">Specialist recommended</Badge>}
                    <Badge tone={IMPACT_TONE[o.impact]}>{o.impact.toLowerCase()} impact</Badge>
                    <Badge tone={COMPLEXITY_TONE[o.complexity]}>{o.complexity.toLowerCase()} complexity</Badge>
                    <Badge>{o.status.replace("_", " ").toLowerCase()}</Badge>
                  </div>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-sm font-semibold text-ink-900">${(o.estAnnualValue / 1000).toFixed(0)}k/yr</p>
                  <p className="text-[11px] text-ink-500">{o.estHoursSavedMonthly} hrs/mo</p>
                  <p className="mt-1 text-[11px] font-medium text-orchid-deep">Priority {priority}</p>
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
