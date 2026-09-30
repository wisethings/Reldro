"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionWhere, canSeeReport } from "@/lib/safety/access";
import { addReportEvent, audit, cleanAttachments, isoOrNull, nextActionNumber, requireViewer } from "@/lib/safety/context";
import { actionStatusInfo } from "@/lib/safety/pack";
import { sendEmail, getAppUrl, escapeHtml } from "@/lib/email";

export type ActionFormState = { error?: string; success?: string } | undefined;

async function loadAction(actionId: string) {
  const v = await requireViewer();
  const action = await prisma.correctiveAction.findFirst({ where: { id: actionId, ...actionWhere(v) } });
  if (!action) throw new Error("Action not found.");
  return { v, action };
}

const isOwner = (v: { employeeId: string | null }, a: { ownerId: string | null }) => v.employeeId !== null && a.ownerId === v.employeeId;

async function logOnReport(actionReportId: string | null, message: string, v: { name: string; employeeId: string | null }) {
  if (actionReportId) await addReportEvent({ reportId: actionReportId, type: "ACTION", message, actor: { name: v.name, employeeId: v.employeeId } });
}

export async function createAction(_prev: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const v = await requireViewer();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the action a short title." };

  const reportId = String(formData.get("reportId") ?? "") || null;
  let report = null;
  if (reportId) {
    report = await prisma.safetyReport.findFirst({ where: { id: reportId, organizationId: v.organizationId }, include: { incident: { include: { responders: true } } } });
    if (!report || !canSeeReport(v, report)) return { error: "Report not found." };
  } else if (!v.isSafetyTeam) {
    return { error: "Actions are created from a report or inspection." };
  }

  const ownerId = String(formData.get("ownerId") ?? "") || null;
  if (ownerId) {
    const owner = await prisma.employee.findFirst({ where: { id: ownerId, organizationId: v.organizationId } });
    if (!owner) return { error: "Owner not found." };
  }
  const priority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(formData.get("priority"))) ? String(formData.get("priority")) : "MEDIUM";
  const dueDate = isoOrNull(formData.get("dueDate"));
  const approvedNow = v.isSafetyTeam;

  let created: { id: string; number: number } | null = null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    try {
      created = await prisma.correctiveAction.create({
        data: {
          organizationId: v.organizationId,
          number: await nextActionNumber(v.organizationId),
          reportId,
          title: title.slice(0, 160),
          description: String(formData.get("description") ?? "").trim().slice(0, 3000),
          priority,
          ownerId,
          dueDate,
          status: approvedNow ? "APPROVED" : "PROPOSED",
          proposedById: v.employeeId,
          approvedById: approvedNow ? v.employeeId : null,
          approvedAt: approvedNow ? new Date() : null,
        },
        select: { id: true, number: true },
      });
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  if (!created) return { error: "Couldn't save the action. Please try again." };

  if (report) {
    await logOnReport(report.id, `Corrective action A-${created.number} ${approvedNow ? "created and approved" : "proposed"}: ${title}.`, v);
    if (["NEW", "ASSIGNED"].includes(report.status)) await prisma.safetyReport.update({ where: { id: report.id }, data: { status: "ACTIONS_OPEN" } });
  }
  await audit(v, "safety.action_updated", "CorrectiveAction", created.id, { created: true, status: approvedNow ? "APPROVED" : "PROPOSED" });
  revalidatePath("/dashboard/actions");
  if (reportId) revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/overview");
  return { success: approvedNow ? "Action created." : "Action proposed. The safety team will review it." };
}

export async function approveAction(actionId: string) {
  const { v, action } = await loadAction(actionId);
  if (!v.isSafetyTeam) throw new Error("Only the safety team can approve actions.");
  if (action.status !== "PROPOSED") return;
  await prisma.correctiveAction.update({ where: { id: actionId }, data: { status: "APPROVED", approvedById: v.employeeId, approvedAt: new Date() } });
  await logOnReport(action.reportId, `Corrective action A-${action.number} approved.`, v);
  await audit(v, "safety.action_updated", "CorrectiveAction", actionId, { status: "APPROVED" });
  refresh(action);
}

export async function startAction(actionId: string) {
  const { v, action } = await loadAction(actionId);
  if (!v.isSafetyTeam && !isOwner(v, action)) throw new Error("Only the owner or safety team can start this action.");
  if (!["APPROVED"].includes(action.status)) throw new Error("Only approved actions can be started.");
  await prisma.correctiveAction.update({ where: { id: actionId }, data: { status: "IN_PROGRESS" } });
  await logOnReport(action.reportId, `Corrective action A-${action.number} started.`, v);
  await audit(v, "safety.action_updated", "CorrectiveAction", actionId, { status: "IN_PROGRESS" });
  refresh(action);
}

export async function completeAction(_prev: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const { v, action } = await loadAction(String(formData.get("actionId") ?? ""));
  if (!v.isSafetyTeam && !isOwner(v, action)) return { error: "Only the owner or safety team can mark this done." };
  if (!["APPROVED", "IN_PROGRESS"].includes(action.status)) return { error: "This action can't be completed from its current status." };
  const notes = String(formData.get("completionNotes") ?? "").trim();
  if (!notes) return { error: "Describe what was done so it can be verified." };
  const evidence = cleanAttachments(formData.getAll("evidence"));
  await prisma.correctiveAction.update({
    where: { id: action.id },
    data: { status: "COMPLETED", completionNotes: notes.slice(0, 3000), evidence, completedAt: new Date() },
  });
  await logOnReport(action.reportId, `Corrective action A-${action.number} marked done. Waiting for verification.`, v);
  await audit(v, "safety.action_updated", "CorrectiveAction", action.id, { status: "COMPLETED" });
  refresh(action);
  return { success: "Marked done. It stays open until someone verifies it." };
}

export async function verifyAction(actionId: string) {
  const { v, action } = await loadAction(actionId);
  if (!v.isSafetyTeam) throw new Error("Only the safety team can verify completion.");
  if (action.status !== "COMPLETED") throw new Error("Only actions marked done can be verified.");
  await prisma.correctiveAction.update({ where: { id: actionId }, data: { status: "VERIFIED", verifiedById: v.employeeId, verifiedAt: new Date() } });
  await logOnReport(action.reportId, `Corrective action A-${action.number} verified complete.`, v);
  await audit(v, "safety.action_updated", "CorrectiveAction", actionId, { status: "VERIFIED" });
  refresh(action);
}

export async function reopenAction(actionId: string, reason: string) {
  const { v, action } = await loadAction(actionId);
  if (!v.isSafetyTeam) throw new Error("Only the safety team can send an action back.");
  if (!["COMPLETED", "VERIFIED"].includes(action.status)) throw new Error("This action isn't complete.");
  await prisma.correctiveAction.update({ where: { id: actionId }, data: { status: "IN_PROGRESS", verifiedAt: null, verifiedById: null, completedAt: null } });
  await logOnReport(action.reportId, `Corrective action A-${action.number} sent back${reason.trim() ? `: ${reason.trim().slice(0, 300)}` : "."}`, v);
  await audit(v, "safety.action_updated", "CorrectiveAction", actionId, { status: "IN_PROGRESS", reopened: true });
  refresh(action);
}

export async function cancelAction(actionId: string) {
  const { v, action } = await loadAction(actionId);
  if (!v.isSafetyTeam) throw new Error("Only the safety team can cancel actions.");
  if (["VERIFIED", "CANCELLED"].includes(action.status)) return;
  await prisma.correctiveAction.update({ where: { id: actionId }, data: { status: "CANCELLED" } });
  await logOnReport(action.reportId, `Corrective action A-${action.number} cancelled.`, v);
  await audit(v, "safety.action_updated", "CorrectiveAction", actionId, { status: "CANCELLED" });
  refresh(action);
}

export async function updateActionPlan(actionId: string, changes: { ownerId?: string | null; dueDate?: string | null }) {
  const { v, action } = await loadAction(actionId);
  if (!v.isSafetyTeam) throw new Error("Only the safety team can reassign or reschedule actions.");
  const data: { ownerId?: string | null; dueDate?: Date | null } = {};
  if (changes.ownerId !== undefined) {
    if (changes.ownerId) {
      const owner = await prisma.employee.findFirst({ where: { id: changes.ownerId, organizationId: v.organizationId } });
      if (!owner) throw new Error("Owner not found.");
    }
    data.ownerId = changes.ownerId;
  }
  if (changes.dueDate !== undefined) data.dueDate = changes.dueDate ? new Date(changes.dueDate) : null;
  await prisma.correctiveAction.update({ where: { id: actionId }, data });
  await logOnReport(action.reportId, `Corrective action A-${action.number} plan updated.`, v);
  await audit(v, "safety.action_updated", "CorrectiveAction", actionId, data as Record<string, unknown>);
  refresh(action);
}

/** Emails the owner a reminder (only if email is configured) and records it either way. */
export async function remindOwner(actionId: string): Promise<{ message: string }> {
  const { v, action } = await loadAction(actionId);
  if (!v.isSafetyTeam) throw new Error("Only the safety team can send reminders.");
  if (!action.ownerId) return { message: "This action has no owner to remind." };
  const owner = await prisma.employee.findUnique({ where: { id: action.ownerId }, include: { user: true } });
  if (!owner) return { message: "Owner not found." };
  const { sent } = await sendEmail({
    to: owner.user.email,
    subject: `Reminder: corrective action A-${action.number} is ${action.dueDate && action.dueDate < new Date() ? "overdue" : "due soon"}`,
    html: `<p>Hi ${escapeHtml(owner.user.name)},</p><p>${escapeHtml(action.title)} is assigned to you${action.dueDate ? ` and due ${action.dueDate.toDateString()}` : ""}. Status: ${escapeHtml(actionStatusInfo(action.status).label)}.</p><p><a href="${getAppUrl()}/dashboard/actions/${action.id}">Open the action</a></p>`,
  });
  await logOnReport(action.reportId, `Reminder ${sent ? "emailed" : "recorded (email isn't configured)"} for A-${action.number}.`, v);
  revalidatePath(`/dashboard/actions/${actionId}`);
  return { message: sent ? `Reminder emailed to ${owner.user.name}.` : "Reminder recorded. Email isn't configured, so nothing was sent." };
}

function refresh(action: { id: string; reportId: string | null }) {
  revalidatePath("/dashboard/actions");
  revalidatePath(`/dashboard/actions/${action.id}`);
  if (action.reportId) revalidatePath(`/dashboard/reports/${action.reportId}`);
  revalidatePath("/dashboard/overview");
}
