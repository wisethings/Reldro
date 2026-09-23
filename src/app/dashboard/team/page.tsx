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
  const [activity, teamGaps, attentionList] = await Promise.all([
    getEmployeeActivity(employeeIds),
    getTeamGaps(employeeIds),
    getEmployeesNeedingAttention(employeeIds),
  ]);
  const employeeById = new Map(employees.map((e) => [e.id, e]));

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
          <CardHeader title="Employees needing attention" subtitle="Flagged from real activity, not a guess" />
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
