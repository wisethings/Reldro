import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { CopyPromptButton } from "@/components/workflows/CopyPromptButton";
import { StepMedia } from "@/components/workflows/StepMedia";

export default async function TemplatesPage() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  const departments = await prisma.department.findMany({ where: { organizationId: session.organizationId } });
  const departmentNames = departments.map((d) => d.name);

  // Templates are just prompts pulled from workflow steps - both the seeded
  // catalog and any team-authored workflows. Department names aren't
  // globally unique, so without the organizationId check here, a step from
  // another org's team-authored workflow in a same-named department would
  // leak into this list.
  const steps = departmentNames.length
    ? await prisma.workflowStep.findMany({
        where: {
          aiPrompt: { not: null },
          workflow: {
            department: { in: departmentNames },
            OR: [{ organizationId: null }, { organizationId: session.organizationId }],
          },
        },
        include: { workflow: true },
        orderBy: [{ workflow: { department: "asc" } }, { workflow: { title: "asc" } }, { order: "asc" }],
      })
    : [];

  const byDepartment = new Map<string, typeof steps>();
  for (const step of steps) {
    const key = step.workflow.department;
    byDepartment.set(key, [...(byDepartment.get(key) ?? []), step]);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Templates</h1>
        <p className="text-sm text-ink-500">
          Ready-to-use AI prompts, pulled from the workflows relevant to your departments. Copy one straight into
          whatever tool you're using.
        </p>
      </div>

      {[...byDepartment.entries()].map(([department, deptSteps]) => (
        <div key={department}>
          <h2 className="mb-3 text-sm font-semibold text-ink-800">{department}</h2>
          <div className="space-y-3">
            {deptSteps.map((step) => (
              <Card key={step.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">{step.title}</p>
                      <Link href={`/dashboard/workflows/${step.workflow.id}`} className="text-xs text-orchid-deep hover:text-oxblood">
                        {step.workflow.title}
                      </Link>
                    </div>
                    <CopyPromptButton prompt={step.aiPrompt!} workflowStepId={step.id} />
                  </div>
                  <div className="mt-3 rounded-lg bg-ink-50 p-3">
                    <p className="font-mono text-xs text-ink-700">{step.aiPrompt}</p>
                  </div>
                  <StepMedia imageUrl={step.imageUrl} videoUrl={step.videoUrl} title={step.title} />
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {steps.length === 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">
              No templates yet for your departments — check back once your organization's workflows have prompts attached, or{" "}
              <Link href="/dashboard/workflows" className="text-orchid-deep hover:text-oxblood">
                browse the workflow library
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
