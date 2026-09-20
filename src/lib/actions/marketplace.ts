"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth/guards";

const STAGE_ORDER = ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT", "OPTIMIZATION"] as const;

export async function requestSpecialist(specialistId: string, opportunityId?: string, workflowId?: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);

  const specialist = await prisma.specialist.findUnique({ where: { id: specialistId }, include: { user: true } });
  const opportunity = opportunityId ? await prisma.opportunity.findUnique({ where: { id: opportunityId } }) : null;

  const title = opportunity?.title ?? `AI implementation with ${specialist?.user.name ?? "specialist"}`;
  const now = new Date();

  const project = await prisma.project.create({
    data: {
      organizationId: session.organizationId!,
      specialistId,
      opportunityId: opportunityId ?? undefined,
      workflowId: workflowId ?? opportunity?.workflowId ?? undefined,
      title,
      description: opportunity?.aiOpportunity ?? "New AI implementation engagement.",
      stage: "DISCOVERY",
      status: "PROPOSED",
      startDate: now,
      targetEndDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 60),
      milestones: {
        create: STAGE_ORDER.map((stage, i) => ({
          title: stage.replace("_", " "),
          stage,
          dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7 * (i + 1)),
          completed: false,
        })),
      },
      tasks: {
        create: [
          { title: "Kickoff call with stakeholders", status: "TODO", order: 1 },
          { title: "Audit current workflow and data sources", status: "TODO", order: 2 },
          { title: "Define success metrics", status: "TODO", order: 3 },
        ],
      },
    },
  });

  redirect(`/dashboard/projects/${project.id}`);
}

export async function postProjectMessage(projectId: string, body: string) {
  const session = await requireSession();
  if (!body.trim()) return;

  await prisma.message.create({
    data: { projectId, senderUserId: session.sub, body },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateTaskStatus(taskId: string, status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE") {
  await requireSession();
  const task = await prisma.projectTask.update({ where: { id: taskId }, data: { status } });
  revalidatePath(`/dashboard/projects/${task.projectId}`);
}

export async function advanceProjectStage(projectId: string, stage: (typeof STAGE_ORDER)[number]) {
  await requireSession();
  await prisma.project.update({ where: { id: projectId }, data: { stage } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleMilestone(milestoneId: string, completed: boolean) {
  await requireSession();
  const milestone = await prisma.projectMilestone.update({ where: { id: milestoneId }, data: { completed } });
  revalidatePath(`/dashboard/projects/${milestone.projectId}`);
}
