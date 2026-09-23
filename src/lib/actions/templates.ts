"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";

/** Logs a real usage event when someone copies a prompt template. */
export async function logTemplateCopy(workflowStepId: string) {
  const session = await requireSession();
  if (!session.employeeId || !session.organizationId) return;

  const step = await prisma.workflowStep.findUnique({ where: { id: workflowStepId }, include: { workflow: true } });
  if (!step) return;

  await prisma.aIUsageEvent.create({
    data: {
      organizationId: session.organizationId,
      employeeId: session.employeeId,
      tool: step.workflow.title,
      eventType: "template_copied",
    },
  });
}
