import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { ListOrdered, PlusCircle, Pencil } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { CreateWorkflowStepForm } from "@/components/workflows/CreateWorkflowStepForm";
import { WorkflowStepManageRow } from "@/components/workflows/WorkflowStepManageRow";
import { CreateWorkflowForm } from "@/components/workflows/CreateWorkflowForm";
import { DeleteWorkflowButton } from "@/components/workflows/DeleteWorkflowButton";

export default async function ManageWorkflowPage({ params }: { params: Promise<{ workflowId: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { workflowId } = await params;

  const [employee, workflow, departments, tools] = await Promise.all([
    session.employeeId
      ? prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
      : Promise.resolve(null),
    prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { order: "asc" } } },
    }),
    prisma.department.findMany({ where: { organizationId: session.organizationId }, orderBy: { name: "asc" } }),
    prisma.tool.findMany({
      where: { OR: [{ organizationId: null }, { organizationId: session.organizationId }] },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";
  const canAuthorWorkflows = isCompanyAdmin || Boolean(employee?.isDepartmentAdmin);
  if (!canAuthorWorkflows) redirect("/dashboard/workflows");
  if (!workflow || workflow.organizationId !== session.organizationId) notFound();
  // A department admin manages only their own team's workflows.
  if (!isCompanyAdmin && workflow.department !== employee?.department?.name) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/workflows/manage" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Team workflows
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{workflow.title}</h1>
            <p className="mt-1 text-sm text-ink-500">{workflow.department} · {workflow.summary}</p>
          </div>
          <DeleteWorkflowButton workflowId={workflow.id} />
        </div>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<Pencil size={18} />} tone="olive" />} title="Workflow details" subtitle="Edit the title, process, tools, and notes." />
        <CardBody>
          <CreateWorkflowForm
            workflow={workflow}
            lockDepartment={isCompanyAdmin ? null : employee?.department?.name ?? null}
            departmentOptions={departments.map((d) => d.name)}
            toolOptions={tools.map((t) => t.name)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<ListOrdered size={18} />} tone="orchid" />} title="Steps" subtitle="Shown to your team in this order." />
        <CardBody className="divide-y divide-ink-200 p-0">
          {workflow.steps.map((step) => (
            <WorkflowStepManageRow key={step.id} step={step} workflowId={workflow.id} />
          ))}
          {workflow.steps.length === 0 && <p className="p-5 text-sm text-ink-500">No steps yet. Add one below.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<PlusCircle size={18} />} tone="sage" />} title="Add a step" />
        <CardBody>
          <CreateWorkflowStepForm workflowId={workflow.id} />
        </CardBody>
      </Card>
    </div>
  );
}
