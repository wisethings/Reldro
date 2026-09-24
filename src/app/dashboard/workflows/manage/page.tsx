import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CreateWorkflowForm } from "@/components/workflows/CreateWorkflowForm";

export default async function ManageWorkflowsPage() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  const employee = session.employeeId
    ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
    : null;
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";
  const canAuthorWorkflows = isCompanyAdmin || Boolean(employee?.isDepartmentAdmin);
  if (!canAuthorWorkflows) redirect("/dashboard/workflows");

  const [workflows, departments] = await Promise.all([
    prisma.workflow.findMany({
      where: { organizationId: session.organizationId },
      include: { steps: { select: { id: true } } },
      orderBy: { department: "asc" },
    }),
    prisma.department.findMany({ where: { organizationId: session.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/workflows" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Workflow library
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">Team workflows</h1>
        <p className="text-sm text-ink-500">
          {isCompanyAdmin
            ? "Create AI-enabled workflows for any department, using your own team's real processes and tools."
            : `Create workflows for ${employee?.department?.name ?? "your team"}. Only your department's employees will see these.`}
        </p>
      </div>

      <Card>
        <CardHeader title="New workflow" subtitle="Describe the process, then add its steps on the next screen." />
        <CardBody>
          <CreateWorkflowForm
            lockDepartment={isCompanyAdmin ? null : employee?.department?.name ?? null}
            departmentOptions={departments.map((d) => d.name)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your workflows" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {workflows.map((w) => (
            <Link
              key={w.id}
              href={`/dashboard/workflows/manage/${w.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-ink-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{w.title}</p>
                <p className="text-xs text-ink-500">{w.department} · {w.steps.length} step{w.steps.length === 1 ? "" : "s"}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-orchid-deep">Manage →</span>
            </Link>
          ))}
          {workflows.length === 0 && <p className="p-6 text-sm text-ink-500">No team-authored workflows yet. Create one above.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
