"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireRole, requireSession } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { awardPoints } from "@/lib/rewards";
import { checkAndAwardCertifications } from "@/lib/queries/certifications";
import { hasUnmetDependencies } from "@/lib/queries/workflowRelations";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";
import type { WorkflowAdoptionStatus } from "@prisma/client";

/**
 * Who's allowed to touch a specific workflow's deployment (owner/assignee/
 * checklist), beyond the company-admin-can-do-anything baseline: a
 * department lead for that workflow's own department, or whoever is
 * already its owner or assignee - the people actually accountable for or
 * doing the rollout, not just anyone in the company.
 */
async function canManageWorkflowDeployment(session: SessionPayload, workflowId: string): Promise<boolean> {
  if (session.role === "COMPANY_ADMIN") return true;
  if (!session.employeeId || !session.organizationId) return false;

  const [employee, orgWorkflow] = await Promise.all([
    prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } }),
    prisma.organizationWorkflow.findUnique({
      where: { organizationId_workflowId: { organizationId: session.organizationId, workflowId } },
    }),
  ]);

  if (orgWorkflow?.ownerId === session.employeeId || orgWorkflow?.assigneeId === session.employeeId) return true;

  if (employee?.isDepartmentAdmin) {
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId }, select: { department: true } });
    if (workflow?.department === employee.department?.name) return true;
  }

  return false;
}

export async function adoptWorkflow(workflowId: string) {
  const session = await requireOrganization();

  // The detail page already hides the "Adopt workflow" button while a
  // prerequisite is unmet, but a stale page (or a direct resubmit) could
  // still post this - checking here too keeps the guarantee real rather than
  // just a UI nicety.
  if (await hasUnmetDependencies(session.organizationId, workflowId)) {
    throw new Error("This workflow has a prerequisite that hasn't been adopted yet.");
  }

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

  if (DEPLOYED_STATUSES.includes(status) && (await hasUnmetDependencies(organizationId, workflowId))) {
    throw new Error("This workflow has a prerequisite that hasn't been adopted yet.");
  }

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
 * Assignee is distinct from owner - owner is who's accountable for the
 * rollout overall (company-admin/department-lead assigned), assignee is
 * whoever's actively doing the implementation work right now, the same
 * split Jira draws between a ticket's owner and assignee. Anyone can
 * assign this to themselves or un-assign themselves; assigning someone
 * else (or removing someone else's assignment) needs the same access as
 * managing the rest of that workflow's deployment.
 */
export async function setWorkflowAssignee(workflowId: string, assigneeId: string | null) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const organizationId = session.organizationId;

  const current = await prisma.organizationWorkflow.findUnique({
    where: { organizationId_workflowId: { organizationId, workflowId } },
    select: { assigneeId: true },
  });

  const isSelfChange = session.employeeId !== null && (assigneeId === session.employeeId || (assigneeId === null && current?.assigneeId === session.employeeId));
  if (!isSelfChange && !(await canManageWorkflowDeployment(session, workflowId))) {
    throw new Error("Only a company admin, this workflow's department lead, or its current assignee can change this.");
  }

  await prisma.organizationWorkflow.upsert({
    where: { organizationId_workflowId: { organizationId, workflowId } },
    update: { assigneeId },
    create: { organizationId, workflowId, assigneeId },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "workflow.assignee_changed",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { assigneeId },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath("/dashboard/workflows");
}

/**
 * The Implementation checklist's real completion state - see
 * WorkflowChecklistCompletion. itemIndex is the item's position in the
 * fixed checklist array rendered on the workflow detail page.
 */
export async function toggleChecklistItem(workflowId: string, itemIndex: number, completed: boolean) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const organizationId = session.organizationId;

  if (!(await canManageWorkflowDeployment(session, workflowId))) {
    throw new Error("Only a company admin, this workflow's department lead, its owner, or its assignee can update this checklist.");
  }

  if (completed) {
    await prisma.workflowChecklistCompletion.upsert({
      where: { organizationId_workflowId_itemIndex: { organizationId, workflowId, itemIndex } },
      update: {},
      create: { organizationId, workflowId, itemIndex, completedByName: session.name },
    });
  } else {
    await prisma.workflowChecklistCompletion.deleteMany({ where: { organizationId, workflowId, itemIndex } });
  }

  revalidatePath(`/dashboard/workflows/${workflowId}`);
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

const MAX_MINUTES_SAVED_PER_LOG = 480; // 8 hours - a sanity ceiling, not a real limit on any workflow

/**
 * Real, employee-reported time saved on a workflow - see
 * WorkflowTimeSavedLog for why this exists: the catalog's own
 * timeSavedMinutes is a flat editorial guess with no link to what anyone
 * actually experiences, and it's presented in the UI as if it were fact.
 * One entry per (employee, workflow); resubmitting updates their own figure
 * rather than creating a second one.
 */
export async function logWorkflowTimeSaved(workflowId: string, minutesSaved: number) {
  const session = await requireSession();
  if (!session.employeeId || !session.organizationId) redirect("/login");
  const organizationId = session.organizationId;

  if (!Number.isFinite(minutesSaved) || minutesSaved < 0 || minutesSaved > MAX_MINUTES_SAVED_PER_LOG) {
    throw new Error(`Enter a realistic number of minutes (0-${MAX_MINUTES_SAVED_PER_LOG}).`);
  }
  const rounded = Math.round(minutesSaved);

  await prisma.workflowTimeSavedLog.upsert({
    where: { employeeId_workflowId: { employeeId: session.employeeId, workflowId } },
    update: { minutesSaved: rounded },
    create: { organizationId, workflowId, employeeId: session.employeeId, minutesSaved: rounded },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "workflow.time_saved_logged",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { minutesSaved: rounded },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
}
