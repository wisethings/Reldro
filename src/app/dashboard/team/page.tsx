import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/Progress";
import { SearchSortBar } from "@/components/ui/SearchSortBar";
import { InviteEmployeeForm } from "@/components/team/InviteEmployeeForm";
import { DepartmentAdminToggle } from "@/components/team/DepartmentAdminToggle";
import { ViewAllDepartmentsToggle } from "@/components/team/ViewAllDepartmentsToggle";
import { getEmployeeActivity } from "@/lib/queries/team";
import { getTeamGaps, getEmployeesNeedingAttention } from "@/lib/queries/teamInsights";
import { getTeamRewardsSummary, getPointsBalances } from "@/lib/rewards";
import { UserPlus, Trophy, BarChart3, AlertTriangle, Users } from "lucide-react";

const PAGE_SIZE = 20;
const SORT_OPTIONS = [
  { value: "name", label: "A to Z" },
  { value: "fluency", label: "Highest fluency" },
  { value: "points", label: "Most points" },
  { value: "active", label: "Most recently active" },
];

function formatLastActive(date: Date | null) {
  if (!date) return "Never active";
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Active today";
  if (days === 1) return "Active yesterday";
  if (days <= 30) return `Active ${days}d ago`;
  return "Inactive 30+ days";
}

function isActive(date: Date | null | undefined) {
  return Boolean(date && Date.now() - date.getTime() < 30 * 24 * 60 * 60 * 1000);
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; status?: string; q?: string; sort?: string; page?: string }>;
}) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "name";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: session.organizationId },
      include: { user: true, department: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ where: { organizationId: session.organizationId } }),
  ]);
  const employeeIds = employees.map((e) => e.id);
  const [activity, teamGaps, attentionList, rewardsSummary, pointsBalances] = await Promise.all([
    getEmployeeActivity(employeeIds),
    getTeamGaps(employeeIds),
    getEmployeesNeedingAttention(employeeIds),
    getTeamRewardsSummary(employeeIds),
    getPointsBalances(employeeIds),
  ]);
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const activeCount = employees.filter((e) => isActive(activity.get(e.id)?.lastActiveAt)).length;

  const leaderboard = employees
    .map((e) => ({ employee: e, points: pointsBalances.get(e.id) ?? 0 }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  const filtered = employees
    .filter((e) => !params.department || e.department?.name === params.department)
    .filter((e) => {
      if (!params.status) return true;
      const active = isActive(activity.get(e.id)?.lastActiveAt);
      return params.status === "active" ? active : !active;
    })
    .filter((e) => !q || e.user.name.toLowerCase().includes(q) || e.jobTitle.toLowerCase().includes(q));

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "fluency") return (b.aiFluencyScore ?? -1) - (a.aiFluencyScore ?? -1);
    if (sort === "points") return (pointsBalances.get(b.id) ?? 0) - (pointsBalances.get(a.id) ?? 0);
    if (sort === "active") {
      const at = activity.get(a.id)?.lastActiveAt?.getTime() ?? 0;
      const bt = activity.get(b.id)?.lastActiveAt?.getTime() ?? 0;
      return bt - at;
    }
    return a.user.name.localeCompare(b.user.name);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = sorted.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const query = new URLSearchParams();
  if (params.department) query.set("department", params.department);
  if (params.status) query.set("status", params.status);
  if (q) query.set("q", q);
  if (sort !== "name") query.set("sort", sort);
  const baseQuery = query.toString();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Team</h1>
        <p className="text-sm text-ink-500">{employees.length} employees across {departments.length} departments.</p>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<UserPlus size={18} />} tone="orchid" />} title="Invite an employee" />
        <CardBody>
          <InviteEmployeeForm departments={departments} />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-500">Active team members</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{activeCount} / {employees.length}</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-500">AI points earned this month</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{rewardsSummary.pointsEarnedThisMonth.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-500">Certifications earned</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{rewardsSummary.certificationsEarned}</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-500">Recognitions received</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{rewardsSummary.recognitionsReceived}</p>
        </div>
      </div>

      {leaderboard.length > 0 && (
        <Card>
          <CardHeader icon={<IconBadge icon={<Trophy size={18} />} tone="olive" />} title="Reward leaderboard" subtitle="Top point balances across the organization, from learning, workflow adoption, and recognition" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {leaderboard.map((row, i) => (
              <Link
                key={row.employee.id}
                href={`/dashboard/team/${row.employee.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-sm font-semibold text-ink-400">{i + 1}</span>
                  <Avatar name={row.employee.user.name} size={28} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{row.employee.user.name}</p>
                    <p className="text-xs text-ink-500">{row.employee.department?.name ?? "No department"}</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-orchid-deep">{row.points.toLocaleString()} pts</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      {teamGaps.length > 0 && (
        <Card>
          <CardHeader icon={<IconBadge icon={<BarChart3 size={18} />} tone="orchid" />} title="Organization skill gaps" subtitle="Average AI fluency by skill, across employees who've completed an assessment" />
          <CardBody className="space-y-3">
            {teamGaps.map((g) => (
              <div key={g.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{g.label}</span>
                  <span className="font-medium text-ink-900">{g.averageScore}</span>
                </div>
                <ProgressBar value={g.averageScore} className="mt-1" tone={g.averageScore < 50 ? "amber" : "brand"} />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {attentionList.length > 0 && (
        <Card>
          <CardHeader icon={<IconBadge icon={<AlertTriangle size={18} />} tone="coral" />} title="Employees needing attention" subtitle="Flagged automatically based on activity" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {attentionList.map((a) => {
              const emp = employeeById.get(a.employeeId);
              if (!emp) return null;
              return (
                <div key={a.employeeId} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={emp.user.name} size={28} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{emp.user.name}</p>
                      <p className="text-xs text-ink-500">{a.summary} · {emp.department?.name ?? "No department"}</p>
                    </div>
                  </div>
                  <Link href={a.recommendationHref} className="shrink-0 text-xs font-medium text-orchid-deep hover:text-oxblood">
                    {a.recommendation} →
                  </Link>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader icon={<IconBadge icon={<Users size={18} />} tone="sage" />} title="Team roster" subtitle={`${sorted.length} of ${employees.length} employees`} />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/team${baseQuery ? `?${baseQuery}` : ""}`} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!params.department ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
              All departments
            </Link>
            {departments.map((d) => (
              <Link
                key={d.id}
                href={`/dashboard/team?department=${encodeURIComponent(d.name)}${baseQuery ? `&${baseQuery}` : ""}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.department === d.name ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
              >
                {d.name}
              </Link>
            ))}
            <span className="mx-1 my-auto h-4 w-px bg-ink-200" />
            <Link href={`/dashboard/team${params.department ? `?department=${encodeURIComponent(params.department)}` : ""}`} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!params.status ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
              All status
            </Link>
            <Link href={`/dashboard/team?status=active${params.department ? `&department=${encodeURIComponent(params.department)}` : ""}`} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.status === "active" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
              Active
            </Link>
            <Link href={`/dashboard/team?status=inactive${params.department ? `&department=${encodeURIComponent(params.department)}` : ""}`} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.status === "inactive" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
              Inactive
            </Link>
          </div>

          <SearchSortBar sortOptions={SORT_OPTIONS} placeholder="Search employees..." />
        </CardBody>
        <CardBody className="divide-y divide-ink-200 p-0">
          {pageRows.map((e) => {
            const stats = activity.get(e.id);
            return (
              <div key={e.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={e.user.name} size={28} />
                  <div className="min-w-0">
                    <Link href={`/dashboard/team/${e.id}`} className="truncate text-sm font-medium text-ink-900 hover:text-orchid-deep">
                      {e.user.name}
                    </Link>
                    <p className="text-xs text-ink-500">{e.jobTitle} · {e.department?.name ?? "No department"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-ink-400">{formatLastActive(stats?.lastActiveAt ?? null)}</span>
                  <Badge tone="neutral">{stats?.lessonsCompleted ?? 0} lesson{stats?.lessonsCompleted === 1 ? "" : "s"}</Badge>
                  {e.aiFluencyScore !== null && <Badge tone="brand">Fluency {e.aiFluencyScore}</Badge>}
                  {(pointsBalances.get(e.id) ?? 0) > 0 && <Badge tone="green">{(pointsBalances.get(e.id) ?? 0).toLocaleString()} pts</Badge>}
                  {e.isDepartmentAdmin && <Badge>Dept admin</Badge>}
                  {e.viewAllDepartments && <Badge tone="brand">All-dept. access</Badge>}
                  {e.departmentId && <DepartmentAdminToggle employeeId={e.id} isDepartmentAdmin={e.isDepartmentAdmin} />}
                  <ViewAllDepartmentsToggle employeeId={e.id} viewAllDepartments={e.viewAllDepartments} />
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <p className="p-6 text-sm text-ink-500">No employees match these filters.</p>}
        </CardBody>
        {totalPages > 1 && (
          <CardBody className="flex items-center justify-between border-t border-ink-200 text-xs text-ink-500">
            <span>
              Showing {(pageSafe - 1) * PAGE_SIZE + 1}-{Math.min(pageSafe * PAGE_SIZE, sorted.length)} of {sorted.length} employees
            </span>
            <div className="flex gap-2">
              <Link
                href={`/dashboard/team?${new URLSearchParams({ ...Object.fromEntries(query), page: String(pageSafe - 1) }).toString()}`}
                aria-disabled={pageSafe <= 1}
                className={`rounded-full border px-3 py-1 font-medium ${pageSafe <= 1 ? "pointer-events-none border-ink-100 text-ink-300" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
              >
                ← Prev
              </Link>
              <Link
                href={`/dashboard/team?${new URLSearchParams({ ...Object.fromEntries(query), page: String(pageSafe + 1) }).toString()}`}
                aria-disabled={pageSafe >= totalPages}
                className={`rounded-full border px-3 py-1 font-medium ${pageSafe >= totalPages ? "pointer-events-none border-ink-100 text-ink-300" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
              >
                Next →
              </Link>
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
