import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { InviteEmployeeForm } from "@/components/team/InviteEmployeeForm";
import { getEmployeeActivity } from "@/lib/queries/team";
import { getTeamGaps, getEmployeesNeedingAttention } from "@/lib/queries/teamInsights";
import { getTeamRewardsSummary, getPointsBalances } from "@/lib/rewards";

function formatLastActive(date: Date | null) {
  if (!date) return "Never active";
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Active today";
  if (days === 1) return "Active yesterday";
  if (days <= 30) return `Active ${days}d ago`;
  return "Inactive 30+ days";
}

export default async function TeamPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

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

  const leaderboard = employees
    .map((e) => ({ employee: e, points: pointsBalances.get(e.id) ?? 0 }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Team</h1>
        <p className="text-sm text-ink-500">{employees.length} employees across {departments.length} departments.</p>
      </div>

      <Card>
        <CardHeader title="Invite an employee" />
        <CardBody>
          <InviteEmployeeForm departments={departments} />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
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
          <CardHeader title="Reward leaderboard" subtitle="Top point balances across the organization, from real learning, workflow adoption, and recognition" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {leaderboard.map((row, i) => (
              <Link
                key={row.employee.id}
                href={`/dashboard/team/${row.employee.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-sm font-semibold text-ink-400">{i + 1}</span>
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
          <CardHeader title="Organization skill gaps" subtitle="Average AI fluency by skill, across employees who've completed an assessment" />
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
          <CardHeader title="Employees needing attention" subtitle="Flagged automatically based on real activity" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {attentionList.map((a) => {
              const emp = employeeById.get(a.employeeId);
              if (!emp) return null;
              return (
                <div key={a.employeeId} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{emp.user.name}</p>
                    <p className="text-xs text-ink-500">{a.summary} · {emp.department?.name ?? "No department"}</p>
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
        <CardBody className="divide-y divide-ink-200 p-0">
          {employees.map((e) => {
            const stats = activity.get(e.id);
            return (
              <div key={e.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/dashboard/team/${e.id}`} className="truncate text-sm font-medium text-ink-900 hover:text-orchid-deep">
                    {e.user.name}
                  </Link>
                  <p className="text-xs text-ink-500">{e.jobTitle} · {e.department?.name ?? "No department"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-ink-400">{formatLastActive(stats?.lastActiveAt ?? null)}</span>
                  <Badge tone="neutral">{stats?.lessonsCompleted ?? 0} lesson{stats?.lessonsCompleted === 1 ? "" : "s"}</Badge>
                  {e.aiFluencyScore !== null && <Badge tone="brand">Fluency {e.aiFluencyScore}</Badge>}
                  {(pointsBalances.get(e.id) ?? 0) > 0 && <Badge tone="green">{(pointsBalances.get(e.id) ?? 0).toLocaleString()} pts</Badge>}
                  {e.isDepartmentAdmin && <Badge>Dept admin</Badge>}
                </div>
              </div>
            );
          })}
          {employees.length === 0 && <p className="p-6 text-sm text-ink-500">No employees yet.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
