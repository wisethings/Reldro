import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InviteEmployeeForm } from "@/components/team/InviteEmployeeForm";

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
        <CardBody className="divide-y divide-ink-100 p-0">
          {employees.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{e.user.name}</p>
                <p className="text-xs text-ink-500">{e.jobTitle} · {e.department?.name ?? "No department"}</p>
              </div>
              <div className="flex items-center gap-3">
                {e.aiFluencyScore !== null && <Badge tone="brand">Fluency {e.aiFluencyScore}</Badge>}
                {e.isDepartmentAdmin && <Badge>Dept admin</Badge>}
              </div>
            </div>
          ))}
          {employees.length === 0 && <p className="p-6 text-sm text-ink-500">No employees yet.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
