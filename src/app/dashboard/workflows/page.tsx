import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { Avatar } from "@/components/ui/Avatar";
import { CardArrow } from "@/components/ui/CardArrow";
import { ProgressBar } from "@/components/ui/Progress";
import { SearchSortBar } from "@/components/ui/SearchSortBar";
import { getWorkflowDeploymentStatsForOrg, type WorkflowDeploymentStats } from "@/lib/queries/workflowDeployment";
import { WORKFLOW_STATUS_LABEL, WORKFLOW_STATUS_TONE } from "@/lib/workflowLifecycle";
import { departmentVisibilityFilter } from "@/lib/departmentVisibility";
import { getCategoryIcon } from "@/lib/data/categoryIcon";
import { getHiddenIds } from "@/lib/queries/hidden";

const DIFFICULTY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;
const SORT_OPTIONS = [
  { value: "relevant", label: "Most relevant" },
  { value: "adoption", label: "Highest adoption" },
  { value: "title", label: "A to Z" },
];
const UNFILTERED_PAGE_SIZE = 4;

type WorkflowRow = { id: string; title: string; summary: string; department: string; difficulty: keyof typeof DIFFICULTY_TONE; timeSavedMinutes: number; organizationId: string | null; createdByName: string };

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; q?: string; sort?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sort = params.sort ?? "relevant";

  const [employee, org] = await Promise.all([
    session.employeeId
      ? prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
      : Promise.resolve(null),
    prisma.organization.findUnique({ where: { id: session.organizationId }, select: { departmentIsolationEnabled: true } }),
  ]);
  const visibleDepartment = departmentVisibilityFilter(session, Boolean(org?.departmentIsolationEnabled), employee);
  const selectedDepartment = visibleDepartment ?? params.department;
  // The chip row has to list every department regardless of which one is
  // currently selected, so it stays clickable between departments - querying
  // it from the already department-filtered `workflows` below (the previous
  // bug) meant selecting a department collapsed the row down to just that
  // one department, since it was the only one left in that filtered list.
  const hiddenWorkflowIds = await getHiddenIds(session.organizationId, "WORKFLOW");
  const [workflows, allDepartmentRows] = await Promise.all([
    prisma.workflow.findMany({
      where: {
        id: { notIn: hiddenWorkflowIds },
        OR: [{ organizationId: null }, { organizationId: session.organizationId }],
        department: selectedDepartment || undefined,
      },
      orderBy: { title: "asc" },
      include: { steps: { select: { id: true } } },
    }),
    prisma.workflow.findMany({
      where: {
        id: { notIn: hiddenWorkflowIds },
        OR: [{ organizationId: null }, { organizationId: session.organizationId }],
        department: visibleDepartment,
      },
      select: { department: true },
      distinct: ["department"],
    }),
  ]);
  const canAuthorWorkflows = session.role === "COMPANY_ADMIN" || Boolean(employee?.isDepartmentAdmin);
  const statsByWorkflow = await getWorkflowDeploymentStatsForOrg(session.organizationId, workflows);

  const lowerQ = q.toLowerCase();
  const searched = lowerQ
    ? workflows.filter((w) => w.title.toLowerCase().includes(lowerQ) || w.summary.toLowerCase().includes(lowerQ))
    : workflows;

  const departments = allDepartmentRows.map((d) => d.department).sort();
  const byDepartment = new Map<string, WorkflowRow[]>();
  for (const w of searched) {
    byDepartment.set(w.department, [...(byDepartment.get(w.department) ?? []), w]);
  }

  function sortRows(rows: WorkflowRow[]): WorkflowRow[] {
    const sorted = [...rows];
    if (sort === "adoption") sorted.sort((a, b) => statsByWorkflow.get(b.id)!.adoptionPct - statsByWorkflow.get(a.id)!.adoptionPct);
    else if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (sort !== "relevant") query.set("sort", sort);
  const baseQuery = query.toString();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Workflow library</h1>
          <p className="text-sm text-ink-500">AI-enabled versions of the processes your teams run every day.</p>
        </div>
        {canAuthorWorkflows && (
          <Link
            href="/dashboard/workflows/manage"
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Create a workflow for your team →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/workflows${baseQuery ? `?${baseQuery}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!params.department ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
          >
            All departments
          </Link>
          {departments.map((d) => (
            <Link
              key={d}
              href={`/dashboard/workflows?department=${encodeURIComponent(d)}${baseQuery ? `&${baseQuery}` : ""}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.department === d ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
            >
              {d}
            </Link>
          ))}
        </div>
      </div>

      <SearchSortBar sortOptions={SORT_OPTIONS} placeholder="Search workflows..." />

      {[...byDepartment.entries()].map(([dept, rawItems]) => {
        const items = sortRows(rawItems);
        const truncate = !params.department && items.length > UNFILTERED_PAGE_SIZE;
        const shown = truncate ? items.slice(0, UNFILTERED_PAGE_SIZE) : items;
        return (
          <div key={dept}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-800">
                {dept} <span className="font-normal text-ink-400">({items.length} workflow{items.length === 1 ? "" : "s"})</span>
              </h2>
              {truncate && (
                <Link
                  href={`/dashboard/workflows?department=${encodeURIComponent(dept)}${baseQuery ? `&${baseQuery}` : ""}`}
                  className="text-xs font-medium text-orchid-deep hover:text-oxblood"
                >
                  View all →
                </Link>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((w) => {
                const stats = statsByWorkflow.get(w.id)!;
                const Icon = getCategoryIcon(`${w.title} ${w.summary}`);
                return <WorkflowCard key={w.id} workflow={w} stats={stats} Icon={Icon} />;
              })}
            </div>
          </div>
        );
      })}

      {byDepartment.size === 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">No workflows match {q ? `"${q}"` : "this filter"}.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function WorkflowCard({
  workflow: w,
  stats,
  Icon,
}: {
  workflow: WorkflowRow;
  stats: WorkflowDeploymentStats;
  Icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <Link href={`/dashboard/workflows/${w.id}`}>
      <Card className="h-full transition-colors hover:border-brand-300">
        <CardBody>
          <div className="flex items-start justify-between gap-2">
            <IconBadge icon={<Icon size={18} />} tone="orchid" />
            <Badge tone={WORKFLOW_STATUS_TONE[stats.status]}>{WORKFLOW_STATUS_LABEL[stats.status]}</Badge>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink-900">{w.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-500">{w.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone={DIFFICULTY_TONE[w.difficulty]}>{w.difficulty.toLowerCase()}</Badge>
            <Badge>{w.timeSavedMinutes} min/day saved</Badge>
            <Badge>{w.department}</Badge>
            {w.organizationId && <Badge tone="brand">Team-authored{w.createdByName ? ` · ${w.createdByName}` : ""}</Badge>}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-200 pt-3">
            <div className="flex items-center gap-2">
              <Avatar name={stats.ownerName ?? "?"} size={28} />
              <div>
                <p className="text-[11px] text-ink-400">Owner</p>
                <p className="text-xs font-medium text-ink-800">{stats.ownerName ?? "Unassigned"}</p>
              </div>
            </div>
            <div className="min-w-[90px] flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-ink-400">Adoption</span>
                <span className="font-medium text-ink-800">
                  {stats.adoptionPct}% ({stats.activeAdopters}/{stats.eligibleEmployees})
                </span>
              </div>
              <ProgressBar value={stats.adoptionPct} className="mt-1" />
            </div>
            <CardArrow />
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
