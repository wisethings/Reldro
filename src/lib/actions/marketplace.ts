"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { sendEmail, expertHelpRequestEmailHtml } from "@/lib/email";

const STAGE_ORDER = ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT", "OPTIMIZATION"] as const;

/**
 * Company-facing "get expert help" request. No specialist is chosen by the
 * company — this creates an unassigned engagement (status OPEN, no
 * specialistId) that shows up in the platform admin's request queue, where
 * a specialist is matched and assigned behind the scenes via
 * `assignSpecialistToProject`.
 */
const ENGAGEMENT_MODEL_LABEL: Record<string, string> = {
  advisory: "Strategic advisory",
  implementation: "Hands-on implementation",
  augmentation: "Embedded team augmentation",
  unsure: "Not sure yet",
};

const URGENCY_LABEL: Record<string, string> = {
  exploratory: "Exploratory — just scoping",
  planned: "Planned initiative (next quarter)",
  time_sensitive: "Time-sensitive (this month)",
  urgent: "Urgent",
};

/**
 * Company-facing "get expert help" request. Modeled on a proper inbound
 * consulting intake (objective, current situation, engagement model,
 * urgency) rather than a single free-text box, so the platform admin has
 * enough to actually match a specialist without a back-and-forth. No
 * specialist is chosen by the company — this creates an unassigned
 * engagement (status OPEN, no specialistId) that shows up in the platform
 * admin's request queue, where a specialist is matched and assigned behind
 * the scenes via `assignSpecialistToProject`.
 */
export async function requestExpertHelp(params: {
  opportunityId?: string;
  workflowId?: string;
  objective: string;
  challenges: string;
  engagementModel?: string;
  urgency?: string;
  budget?: number;
  timeline?: string;
  ccEmails?: string[];
}) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId! } });

  const opportunity = params.opportunityId
    ? await prisma.opportunity.findUnique({ where: { id: params.opportunityId } })
    : null;
  const workflow = params.workflowId
    ? await prisma.workflow.findUnique({ where: { id: params.workflowId } })
    : null;

  const title = opportunity?.title ?? workflow?.title ?? "AI implementation request";
  const engagementModelLabel = params.engagementModel ? ENGAGEMENT_MODEL_LABEL[params.engagementModel] : undefined;
  const urgencyLabel = params.urgency ? URGENCY_LABEL[params.urgency] : undefined;
  const ccEmails = (params.ccEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);

  const description = [
    `Objective: ${params.objective}`,
    `Current situation: ${params.challenges}`,
    engagementModelLabel ? `Preferred engagement model: ${engagementModelLabel}` : null,
    urgencyLabel ? `Urgency: ${urgencyLabel}` : null,
    params.timeline ? `Target timeline: ${params.timeline}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const project = await prisma.project.create({
    data: {
      organizationId: session.organizationId!,
      opportunityId: params.opportunityId ?? undefined,
      workflowId: params.workflowId ?? opportunity?.workflowId ?? undefined,
      title,
      description: description || "New AI implementation request.",
      stage: "DISCOVERY",
      status: "OPEN",
      budget: params.budget,
      ccEmails,
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.sub,
    action: "expert_help.requested",
    entityType: "Project",
    entityId: project.id,
    metadata: { title, ccEmails },
  });

  const { sent } = await sendEmail({
    to: session.email,
    cc: ccEmails,
    subject: `We've received your request: ${title}`,
    html: expertHelpRequestEmailHtml({
      requesterName: session.name,
      orgName: org?.name ?? "your organization",
      title,
      objective: params.objective,
      challenges: params.challenges,
      engagementModel: engagementModelLabel,
      urgency: urgencyLabel,
      timeline: params.timeline,
      budget: params.budget,
      ccEmails,
    }),
  });

  revalidatePath("/dashboard/opportunities");
  revalidatePath("/dashboard/expert-help");
  revalidatePath("/platform-admin/requests");
  return { projectId: project.id, emailSent: sent };
}

/**
 * Platform admin assigns a specialist to an open request, which is what
 * turns it into a real engagement the specialist sees in their project list.
 */
export async function assignSpecialistToProject(projectId: string, specialistId: string) {
  const session = await requireRole(["PLATFORM_ADMIN"]);
  const now = new Date();

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      specialistId,
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

  await logAudit({
    organizationId: project.organizationId,
    userId: session.sub,
    action: "specialist.assigned",
    entityType: "Project",
    entityId: projectId,
    metadata: { specialistId },
  });

  revalidatePath("/platform-admin/requests");
  revalidatePath(`/dashboard/projects/${projectId}`);
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
