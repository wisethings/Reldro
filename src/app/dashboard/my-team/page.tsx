import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { getEmployeeActivity } from "@/lib/queries/team";

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
  const activity = await getEmployeeActivity(teammates.map((e) => e.id));

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

      <Card>
        <CardHeader title="Team roster" subtitle="Real activity, not a snapshot from onboarding" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {teammates.map((e) => {
            const stats = activity.get(e.id);
            return (
              <div key={e.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{e.user.name}</p>
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
