"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { sendEmail, expertHelpRequestEmailHtml, projectMemberAddedEmailHtml } from "@/lib/email";
import type { ProjectStage } from "@prisma/client";

const STAGE_ORDER = ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT", "OPTIMIZATION"] as const;

/**
 * Every project action below touches one specific project, so this is the
 * one place that decides who's allowed near it: the org it belongs to, the
 * specialist assigned to it, or a platform admin. Without this, any signed-in
 * user could message, retask, or advance the stage of any project in the
 * system just by knowing its id.
 */
async function requireProjectAccess(projectId: string) {
  const session = await requireSession();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true, specialistId: true },
  });
  if (!project) redirect("/dashboard/overview");

  const isOrgMember = session.organizationId === project.organizationId;
  const isAssignedSpecialist = Boolean(session.specialistId) && session.specialistId === project.specialistId;
  const isPlatformAdmin = session.role === "PLATFORM_ADMIN";
  if (!isOrgMember && !isAssignedSpecialist && !isPlatformAdmin) redirect("/dashboard/overview");

  return { session, project, isOrgMember, isPlatformAdmin };
}

/** Adding/removing project team members is a company-admin action, not something any project participant can do. */
async function requireProjectAdmin(projectId: string) {
  const { session, project, isPlatformAdmin } = await requireProjectAccess(projectId);
  const isOrgAdmin = session.role === "COMPANY_ADMIN" && session.organizationId === project.organizationId;
  if (!isOrgAdmin && !isPlatformAdmin) redirect("/dashboard/overview");
  return { session, project };
}

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
  exploratory: "Exploratory: just scoping",
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
  const { session } = await requireProjectAccess(projectId);
  if (!body.trim()) return;

  await prisma.message.create({
    data: { projectId, senderUserId: session.sub, body },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateTaskStatus(taskId: string, status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE") {
  const existing = await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId }, select: { projectId: true } });
  await requireProjectAccess(existing.projectId);
  const task = await prisma.projectTask.update({ where: { id: taskId }, data: { status } });
  revalidatePath(`/dashboard/projects/${task.projectId}`);
}

export async function advanceProjectStage(projectId: string, stage: (typeof STAGE_ORDER)[number]) {
  await requireProjectAccess(projectId);
  await prisma.project.update({ where: { id: projectId }, data: { stage } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleMilestone(milestoneId: string, completed: boolean) {
  const existing = await prisma.projectMilestone.findUniqueOrThrow({ where: { id: milestoneId }, select: { projectId: true } });
  await requireProjectAccess(existing.projectId);
  const milestone = await prisma.projectMilestone.update({ where: { id: milestoneId }, data: { completed } });
  revalidatePath(`/dashboard/projects/${milestone.projectId}`);
}

export async function addProjectTask(projectId: string, title: string) {
  await requireProjectAccess(projectId);
  const trimmed = title.trim();
  if (!trimmed) return;

  const count = await prisma.projectTask.count({ where: { projectId } });
  await prisma.projectTask.create({ data: { projectId, title: trimmed, status: "TODO", order: count + 1 } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addProjectMilestone(projectId: string, title: string, dueDate: string, stage: ProjectStage) {
  await requireProjectAccess(projectId);
  const trimmed = title.trim();
  if (!trimmed || !dueDate) return;

  await prisma.projectMilestone.create({
    data: { projectId, title: trimmed, dueDate: new Date(dueDate), stage, completed: false },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addProjectDeliverable(projectId: string, name: string, url: string) {
  await requireProjectAccess(projectId);
  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  if (!trimmedName || !trimmedUrl) return;

  await prisma.projectDeliverable.create({ data: { projectId, name: trimmedName, url: trimmedUrl } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

/**
 * Loops an internal colleague into an expert-help engagement alongside the
 * assigned specialist. Company-admin only, and only for employees at the
 * project's own organization.
 */
export async function addProjectMember(projectId: string, employeeId: string) {
  const { session, project } = await requireProjectAdmin(projectId);

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
  if (!employee || employee.organizationId !== project.organizationId) return;

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_employeeId: { projectId, employeeId } },
  });
  if (existing) return;

  await prisma.projectMember.create({ data: { projectId, employeeId } });

  await logAudit({
    organizationId: project.organizationId,
    userId: session.sub,
    action: "project.member_added",
    entityType: "Project",
    entityId: projectId,
    metadata: { employeeId },
  });

  const fullProject = await prisma.project.findUnique({ where: { id: projectId }, select: { title: true } });
  const host = (await headers()).get("host");
  await sendEmail({
    to: employee.user.email,
    subject: `You've been added to a project: ${fullProject?.title ?? "Reldro project"}`,
    html: projectMemberAddedEmailHtml({
      name: employee.user.name,
      projectTitle: fullProject?.title ?? "a Reldro project",
      projectUrl: `https://${host}/dashboard/projects/${projectId}`,
    }),
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function removeProjectMember(projectId: string, employeeId: string) {
  const { session, project } = await requireProjectAdmin(projectId);

  await prisma.projectMember.deleteMany({ where: { projectId, employeeId } });

  await logAudit({
    organizationId: project.organizationId,
    userId: session.sub,
    action: "project.member_removed",
    entityType: "Project",
    entityId: projectId,
    metadata: { employeeId },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}
