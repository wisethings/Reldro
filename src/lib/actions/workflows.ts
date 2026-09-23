"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireSession } from "@/lib/auth/guards";

export async function adoptWorkflow(workflowId: string) {
  const session = await requireOrganization();

  await prisma.organizationWorkflow.upsert({
    where: { organizationId_workflowId: { organizationId: session.organizationId, workflowId } },
    update: { status: "ADOPTED", adoptedAt: new Date() },
    create: {
      organizationId: session.organizationId,
      workflowId,
      status: "ADOPTED",
      adoptedAt: new Date(),
      usersAdopted: 1,
    },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath("/dashboard/workflows");
  revalidatePath("/dashboard/overview");
}

/**
 * Personal, per-employee step completion - this is what turns a workflow
 * from a document you read once into an interactive guide with real
 * progress. Each completion also logs a real AIUsageEvent, since actually
 * doing a step is exactly the kind of signal the adoption metrics should
 * be built on instead of a frozen guess.
 */
export async function toggleWorkflowStep(workflowStepId: string, workflowId: string) {
  const session = await requireSession();
  if (!session.employeeId) return;

  const existing = await prisma.workflowStepCompletion.findUnique({
    where: { employeeId_workflowStepId: { employeeId: session.employeeId, workflowStepId } },
  });

  if (existing) {
    await prisma.workflowStepCompletion.delete({ where: { id: existing.id } });
  } else {
    const [step] = await Promise.all([
      prisma.workflowStep.findUniqueOrThrow({ where: { id: workflowStepId }, include: { workflow: true } }),
      prisma.workflowStepCompletion.create({ data: { employeeId: session.employeeId, workflowStepId } }),
    ]);
    await prisma.aIUsageEvent.create({
      data: {
        organizationId: session.organizationId!,
        employeeId: session.employeeId,
        tool: step.workflow.title,
        eventType: "workflow_step_completed",
      },
    });
  }

  revalidatePath(`/dashboard/workflows/${workflowId}`);
}
