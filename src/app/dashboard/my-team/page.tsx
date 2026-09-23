import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { StatTile } from "@/components/ui/StatTile";
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

export default async function MyTeamPage() {
  const session = await requireSession();
  if (!session.employeeId) redirect("/dashboard/overview");

  const me = await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } });
  if (!me?.isDepartmentAdmin) redirect("/dashboard/overview");

  const teammates = await prisma.employee.findMany({
    where: { organizationId: me.organizationId, departmentId: me.departmentId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  const teammateIds = teammates.map((e) => e.id);
  const [activity, teamGaps, attentionList] = await Promise.all([
    getEmployeeActivity(teammateIds),
    getTeamGaps(teammateIds),
    getEmployeesNeedingAttention(teammateIds),
  ]);
  const employeeById = new Map(teammates.map((e) => [e.id, e]));

  const activeCount = teammates.filter((e) => {
    const a = activity.get(e.id);
    return a?.lastActiveAt && Date.now() - a.lastActiveAt.getTime() < 30 * 24 * 60 * 60 * 1000;
  }).length;
  const totalLessons = teammates.reduce((sum, e) => sum + (activity.get(e.id)?.lessonsCompleted ?? 0), 0);
  const avgFluency = teammates.length
    ? Math.round(teammates.reduce((sum, e) => sum + (e.aiFluencyScore ?? 0), 0) / teammates.length)
    : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">My Team</h1>
        <p className="text-sm text-ink-500">{me.department?.name ?? "Your department"} · {teammates.length} people</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Active in last 30 days" value={`${activeCount} / ${teammates.length}`} />
        <StatTile label="Lessons completed" value={totalLessons} />
        <StatTile label="Average AI fluency" value={avgFluency} />
      </div>

      {teamGaps.length > 0 && (
        <Card>
          <CardHeader title="Team gaps" subtitle="Average AI fluency by skill, across teammates who've completed an assessment" />
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
                    <p className="text-xs text-ink-500">{a.summary}</p>
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
        <CardHeader title="Team roster" subtitle="Real activity, not a snapshot from onboarding" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {teammates.map((e) => {
            const stats = activity.get(e.id);
            return (
              <div key={e.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/dashboard/team/${e.id}`} className="truncate text-sm font-medium text-ink-900 hover:text-orchid-deep">
                    {e.user.name}
                  </Link>
                  <p className="text-xs text-ink-500">{e.jobTitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-ink-400">{formatLastActive(stats?.lastActiveAt ?? null)}</span>
                  <Badge tone="neutral">{stats?.lessonsCompleted ?? 0} lesson{stats?.lessonsCompleted === 1 ? "" : "s"}</Badge>
                  {e.aiFluencyScore !== null && <Badge tone="brand">Fluency {e.aiFluencyScore}</Badge>}
                </div>
              </div>
            );
          })}
          {teammates.length === 0 && <p className="p-6 text-sm text-ink-500">No one else is in your department yet.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
