"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireRole, requireSession } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { awardPoints } from "@/lib/rewards";
import { checkAndAwardCertifications } from "@/lib/queries/certifications";
import type { WorkflowAdoptionStatus } from "@prisma/client";

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

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "workflow.adopted",
    entityType: "Workflow",
    entityId: workflowId,
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath("/dashboard/workflows");
  revalidatePath("/dashboard/overview");
}

/**
 * Company-admin control over the full deployment lifecycle (Learn -> Pilot
 * -> In progress -> Adopted -> Optimizing -> Complete), separate from the
 * one-click "Adopt workflow" button any employee can use. This is what lets
 * an admin explicitly pilot a workflow before rolling it out, or mark one
 * as optimizing/complete once it's mature.
 */
export async function setWorkflowStage(workflowId: string, status: WorkflowAdoptionStatus) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  await prisma.organizationWorkflow.upsert({
    where: { organizationId_workflowId: { organizationId, workflowId } },
    update: { status, adoptedAt: status === "ADOPTED" ? new Date() : undefined },
    create: { organizationId, workflowId, status, adoptedAt: status === "ADOPTED" ? new Date() : undefined },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "workflow.stage_changed",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { status },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath("/dashboard/workflows");
  revalidatePath("/dashboard/overview");
}

export async function setWorkflowOwner(workflowId: string, ownerId: string | null) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  await prisma.organizationWorkflow.upsert({
    where: { organizationId_workflowId: { organizationId, workflowId } },
    update: { ownerId },
    create: { organizationId, workflowId, ownerId },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "workflow.owner_assigned",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { ownerId },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath("/dashboard/workflows");
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
    // The caller also passes a workflowId alongside workflowStepId, but
    // never verified to actually be the step's own workflow - trust the
    // step's real relation instead for anything that affects points or
    // dedupe, so a mismatched pair can't misattribute an award to a
    // workflow the employee never touched.
    const step = await prisma.workflowStep.findUniqueOrThrow({ where: { id: workflowStepId }, include: { workflow: true } });
    const actualWorkflowId = step.workflowId;

    const priorWorkflowIds = new Set(
      (
        await prisma.workflowStepCompletion.findMany({
          where: { employeeId: session.employeeId },
          select: { workflowStep: { select: { workflowId: true } } },
        })
      ).map((s) => s.workflowStep.workflowId)
    );
    const isNewWorkflowForEmployee = !priorWorkflowIds.has(actualWorkflowId);

    await prisma.workflowStepCompletion.create({ data: { employeeId: session.employeeId, workflowStepId } });
    await prisma.aIUsageEvent.create({
      data: {
        organizationId: session.organizationId!,
        employeeId: session.employeeId,
        tool: step.workflow.title,
        eventType: "workflow_step_completed",
      },
    });

    if (isNewWorkflowForEmployee) {
      const organizationId = session.organizationId!;
      const distinctWorkflowCount = priorWorkflowIds.size + 1;
      await awardPoints({
        employeeId: session.employeeId,
        organizationId,
        ruleKey: "workflow_first_adopted",
        reason: "Used your first AI workflow",
        entityType: "Workflow",
        entityId: actualWorkflowId,
        dedupeKey: "workflow_first_adopted",
      });
      if (distinctWorkflowCount === 3) {
        await awardPoints({
          employeeId: session.employeeId,
          organizationId,
          ruleKey: "workflow_three_adopted",
          reason: "Used 3 different AI workflows",
          entityType: "Workflow",
          entityId: actualWorkflowId,
          dedupeKey: "workflow_three_adopted",
        });
      }
      await checkAndAwardCertifications(session.employeeId);
    }
  }

  revalidatePath(`/dashboard/workflows/${workflowId}`);
}
