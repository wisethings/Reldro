import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { CreateInitiativeForm } from "@/components/initiatives/CreateInitiativeForm";

export default async function NewInitiativePage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

  const [departments, employees] = await Promise.all([
    prisma.department.findMany({ where: { organizationId: session.organizationId }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { organizationId: session.organizationId },
      include: { user: true, department: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/initiatives" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Initiatives
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">New initiative</h1>
        <p className="text-sm text-ink-500">A cross-functional AI adoption program with owners, a timeline, and measurable KPIs.</p>
      </div>

      <Card>
        <CardBody>
          <CreateInitiativeForm
            departmentOptions={departments.map((d) => d.name)}
            employeeOptions={employees.map((e) => ({ id: e.id, name: e.user.name, department: e.department?.name ?? "" }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
