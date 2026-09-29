import Link from "next/link";
import { redirect } from "next/navigation";
import type { ProjectStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { CardArrow } from "@/components/ui/CardArrow";
import { SearchSortBar } from "@/components/ui/SearchSortBar";
import { getCategoryIcon } from "@/lib/data/categoryIcon";

const STATUS_TONE = { OPEN: "amber", PROPOSED: "blue", ACTIVE: "green", COMPLETED: "neutral", CANCELLED: "neutral" } as const;
const STATUS_LABEL = {
  OPEN: "Awaiting match",
  PROPOSED: "Specialist assigned",
  ACTIVE: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;
const STATUS_ORDER: ProjectStatus[] = ["OPEN", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED"];
const SORT_OPTIONS = [
  { value: "recent", label: "Most recent" },
  { value: "title", label: "A to Z" },
];

export default async function ExpertHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";
  const employee = session.employeeId ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } }) : null;
  if (!isCompanyAdmin && !employee?.isDepartmentAdmin) redirect("/dashboard/overview");
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "recent";
  const statusFilter = params.status as ProjectStatus | undefined;

  const requests = await prisma.project.findMany({
    where: {
      organizationId: session.organizationId,
      // A department lead only sees expert-help requests tied to their own
      // department's opportunity/workflow - a company admin sees every
      // request across the org, same boundary as authoring workflows/lessons.
      ...(isCompanyAdmin
        ? {}
        : {
            OR: [
              { opportunity: { department: { name: employee?.department?.name ?? "__none__" } } },
              { workflow: { department: employee?.department?.name ?? "__none__" } },
            ],
          }),
    },
    include: { specialist: { include: { user: true } }, opportunity: { include: { department: true } }, workflow: true },
    orderBy: { createdAt: "desc" },
  });

  const countsByStatus = new Map<ProjectStatus, number>();
  for (const r of requests) countsByStatus.set(r.status, (countsByStatus.get(r.status) ?? 0) + 1);

  const filtered = requests
    .filter((r) => !statusFilter || r.status === statusFilter)
    .filter((r) => !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  const sorted = sort === "title" ? [...filtered].sort((a, b) => a.title.localeCompare(b.title)) : filtered;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Expert Help</h1>
          <p className="text-sm text-ink-500">
            When a workflow or opportunity is too complex to implement alone, request help and our team will match you
            with a vetted AI specialist.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/expert-help"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!statusFilter ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
        >
          All requests ({requests.length})
        </Link>
        {STATUS_ORDER.filter((s) => countsByStatus.has(s)).map((s) => (
          <Link
            key={s}
            href={`/dashboard/expert-help?status=${s}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statusFilter === s ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
          >
            {STATUS_LABEL[s]} ({countsByStatus.get(s)})
          </Link>
        ))}
      </div>

      <SearchSortBar sortOptions={SORT_OPTIONS} placeholder="Search requests..." />

      <Card>
        <CardBody className="divide-y divide-ink-200 p-0">
          {sorted.length === 0 && (
            <div className="p-6 text-sm text-ink-500">
              {requests.length === 0
                ? 'No requests yet. Open an opportunity or a high-complexity workflow and use "Request expert help" to get started.'
                : "No requests match these filters."}
            </div>
          )}
          {sorted.map((r) => {
            const department = r.opportunity?.department?.name ?? r.workflow?.department ?? null;
            const Icon = getCategoryIcon(`${r.title} ${r.description}`);
            return (
              <Link key={r.id} href={`/dashboard/projects/${r.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-ink-50">
                <IconBadge icon={<Icon size={18} />} tone="orchid" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{r.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{r.description}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {department && <Badge>{department}</Badge>}
                    <span className="text-[11px] text-ink-400">
                      {r.specialist ? `Matched with ${r.specialist.user.name}` : "Not yet matched"} · {r.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                <CardArrow />
              </Link>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
