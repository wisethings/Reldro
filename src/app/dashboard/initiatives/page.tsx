import Link from "next/link";
import { redirect } from "next/navigation";
import type { InitiativeStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { CardArrow } from "@/components/ui/CardArrow";
import { ProgressBar } from "@/components/ui/Progress";
import { SearchSortBar } from "@/components/ui/SearchSortBar";
import { getCategoryIcon } from "@/lib/data/categoryIcon";
import { INITIATIVE_STATUS_LABEL, INITIATIVE_STATUS_TONE } from "@/lib/initiativeLifecycle";

const SORT_OPTIONS = [
  { value: "relevant", label: "Most relevant" },
  { value: "progress", label: "Most progress" },
  { value: "title", label: "A to Z" },
];

type KPI = { label: string; baseline: number; current: number; target: number; unit: string };

export default async function InitiativesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "relevant";
  const statusFilter = params.status as InitiativeStatus | undefined;

  const initiatives = await prisma.initiative.findMany({
    where: { organizationId: session.organizationId },
    include: { members: true, workflows: true },
    orderBy: { startDate: "desc" },
  });

  const countsByStatus = new Map<InitiativeStatus, number>();
  for (const init of initiatives) countsByStatus.set(init.status, (countsByStatus.get(init.status) ?? 0) + 1);

  const enriched = initiatives
    .filter((init) => !statusFilter || init.status === statusFilter)
    .filter((init) => !q || init.name.toLowerCase().includes(q) || init.goalDescription.toLowerCase().includes(q))
    .map((init) => {
      const kpis = (init.kpis as unknown as KPI[]) ?? [];
      const primaryKpi = kpis[0] ?? null;
      const durationDays = Math.round((init.endDate.getTime() - init.startDate.getTime()) / (1000 * 60 * 60 * 24));
      let progressPct: number;
      if (primaryKpi) {
        const span = primaryKpi.target - primaryKpi.baseline || 1;
        progressPct = Math.max(0, Math.min(100, Math.round(((primaryKpi.current - primaryKpi.baseline) / span) * 100)));
      } else {
        const total = init.endDate.getTime() - init.startDate.getTime();
        const elapsed = Math.min(total, Math.max(0, Date.now() - init.startDate.getTime()));
        progressPct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
      }
      return { init, primaryKpi, durationDays, progressPct };
    });

  const sorted = [...enriched].sort((a, b) => {
    if (sort === "progress") return b.progressPct - a.progressPct;
    if (sort === "title") return a.init.name.localeCompare(b.init.name);
    return 0;
  });

  const STATUS_ORDER: InitiativeStatus[] = ["IN_PROGRESS", "COMPLETED", "PLANNED", "ON_HOLD"];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Initiatives</h1>
          <p className="text-sm text-ink-500">Cross-functional AI adoption programs with owners, timelines, and KPIs.</p>
        </div>
        {session.role === "COMPANY_ADMIN" && (
          <Link
            href="/dashboard/initiatives/new"
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Create initiative →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/initiatives"
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!statusFilter ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
          >
            All initiatives ({initiatives.length})
          </Link>
          {STATUS_ORDER.filter((s) => countsByStatus.has(s)).map((s) => (
            <Link
              key={s}
              href={`/dashboard/initiatives?status=${s}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statusFilter === s ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
            >
              {INITIATIVE_STATUS_LABEL[s]} ({countsByStatus.get(s)})
            </Link>
          ))}
        </div>
      </div>

      <SearchSortBar sortOptions={SORT_OPTIONS} placeholder="Search initiatives..." />

      <div className="grid gap-4 sm:grid-cols-2">
        {sorted.map(({ init, primaryKpi, durationDays, progressPct }) => {
          const Icon = getCategoryIcon(`${init.name} ${init.goalDescription}`);
          return (
            <Link key={init.id} href={`/dashboard/initiatives/${init.id}`}>
              <Card className="h-full transition-colors hover:border-brand-300">
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 gap-3">
                      <IconBadge icon={<Icon size={18} />} tone="orchid" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900">{init.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{init.goalDescription}</p>
                      </div>
                    </div>
                    <Badge tone={INITIATIVE_STATUS_TONE[init.status]}>{INITIATIVE_STATUS_LABEL[init.status]}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {init.departments.map((d) => (
                      <Badge key={d}>{d}</Badge>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                    {primaryKpi ? (
                      <>
                        <div>
                          <p className="font-semibold text-ink-900">{primaryKpi.target}{primaryKpi.unit}</p>
                          <p className="text-[11px] text-ink-400">target {primaryKpi.label.toLowerCase()}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-ink-900">
                            {primaryKpi.baseline !== primaryKpi.current ? `${primaryKpi.baseline}${primaryKpi.unit} → ${primaryKpi.current}${primaryKpi.unit}` : `${primaryKpi.current}${primaryKpi.unit}`}
                          </p>
                          <p className="text-[11px] text-ink-400">current</p>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <p className="font-semibold text-ink-900">{init.workflows.length}</p>
                        <p className="text-[11px] text-ink-400">workflows</p>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-ink-900">{durationDays} days</p>
                      <p className="text-[11px] text-ink-400">timeline</p>
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900">{init.members.length}</p>
                      <p className="text-[11px] text-ink-400">employees</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={progressPct} className="flex-1" />
                    <span className="shrink-0 text-[11px] font-medium text-ink-500">{progressPct}% complete</span>
                    <CardArrow />
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
        {sorted.length === 0 && <p className="text-sm text-ink-500">No initiatives match these filters.</p>}
      </div>
    </div>
  );
}
