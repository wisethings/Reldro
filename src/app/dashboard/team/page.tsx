import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InviteEmployeeForm } from "@/components/team/InviteEmployeeForm";
import { getEmployeeActivity } from "@/lib/queries/team";

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
  const activity = await getEmployeeActivity(employees.map((e) => e.id));

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

      <Card>
        <CardBody className="divide-y divide-ink-200 p-0">
          {employees.map((e) => {
            const stats = activity.get(e.id);
            return (
              <div key={e.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{e.user.name}</p>
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
