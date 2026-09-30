"use server";

import { fail } from "@/lib/actionResult";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canContributeToIncident, canRunIncident, canSeeReport } from "@/lib/safety/access";
import { addReportEvent, audit, cleanAttachments, isoOrNull, requireViewer } from "@/lib/safety/context";
import { describeNotify, notifyResponders, openIncidentOn } from "@/lib/safety/incident";
import { incidentStatusInfo, OPEN_ACTION_STATUSES } from "@/lib/safety/pack";

async function load(reportId: string) {
  const v = await requireViewer();
  const report = await prisma.safetyReport.findFirst({ where: { id: reportId, organizationId: v.organizationId }, include: { incident: { include: { responders: true } } } });
  if (!report || !canSeeReport(v, report)) throw new Error("Report not found.");
  return { v, report, incident: report.incident };
}

async function loadIncident(reportId: string) {
  const ctx = await load(reportId);
  if (!ctx.incident) throw new Error("This report has no incident response.");
  return { ...ctx, incident: ctx.incident };
}

function refresh(reportId: string) {
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/overview");
}

const actor = (v: { name: string; employeeId: string | null }) => ({ name: v.name, employeeId: v.employeeId });

/** Open the shared workspace for an event that needs a coordinated response. Only the safety team can start one by hand. */
export async function openIncident(reportId: string, leadId: string | null, reason: string): Promise<string> {
  const { v, report, incident } = await load(reportId);
  if (!v.isSafetyTeam) return fail("Only the safety team can open an incident response.");
  if (incident) return "An incident response is already open on this report.";
  if (report.status === "CLOSED") return fail("This report is closed. Reopen it before opening an incident response.");
  let lead: string | null = null;
  if (leadId) {
    const e = await prisma.employee.findFirst({ where: { id: leadId, organizationId: v.organizationId } });
    if (!e) return fail("That person is not in your company.");
    lead = e.id;
  } else if (report.ownerId) lead = report.ownerId;
  const res = await openIncidentOn({
    reportId,
    organizationId: v.organizationId,
    leadId: lead,
    openedBy: "MANUAL",
    openedById: v.employeeId,
    actor: actor(v),
    reason: reason.trim().slice(0, 300) || undefined,
  });
  await audit(v, "safety.report_updated", "SafetyReport", reportId, { incident: "opened" });
  refresh(reportId);
  return res.notice || "Incident response opened.";
}

export async function updateIncidentDetails(reportId: string, changes: { summary?: string; nextAction?: string; nextActionDueAt?: string | null; leadId?: string | null }) {
  const { v, report, incident } = await loadIncident(reportId);
  if (!canRunIncident(v, { ...report, incident })) return fail("Only the response lead or safety team can change these details.");
  if (incident.status === "RESOLVED") return fail("This incident is resolved. Reopen it to change it.");
  const data: { summary?: string; nextAction?: string; nextActionDueAt?: Date | null; leadId?: string | null } = {};
  const notes: string[] = [];
  if (changes.summary !== undefined && changes.summary.trim() !== incident.summary) {
    data.summary = changes.summary.trim().slice(0, 3000);
    notes.push("Situation summary updated.");
  }
  if (changes.nextAction !== undefined && changes.nextAction.trim() !== incident.nextAction) {
    data.nextAction = changes.nextAction.trim().slice(0, 500);
    notes.push(data.nextAction ? `Next action: ${data.nextAction}` : "Next action cleared.");
  }
  if (changes.nextActionDueAt !== undefined) {
    const due = changes.nextActionDueAt ? isoOrNull(changes.nextActionDueAt) : null;
    data.nextActionDueAt = due;
  }
  let notifyId: string | null = null;
  if (changes.leadId !== undefined && changes.leadId !== incident.leadId) {
    if (changes.leadId) {
      const e = await prisma.employee.findFirst({ where: { id: changes.leadId, organizationId: v.organizationId }, include: { user: { select: { name: true } } } });
      if (!e) return fail("That person is not in your company.");
      data.leadId = e.id;
      notes.push(`Response lead is now ${e.user.name}.`);
      notifyId = e.id;
    } else {
      data.leadId = null;
      notes.push("Response lead removed.");
    }
  }
  if (Object.keys(data).length === 0) return;
  await prisma.incidentResponse.update({ where: { id: incident.id }, data });
  if (notes.length) await addReportEvent({ reportId, type: "INCIDENT", message: notes.join(" "), actor: actor(v) });
  if (notifyId) await addReportEvent({ reportId, type: "INCIDENT", message: describeNotify(await notifyResponders({ reportId, employeeIds: [notifyId], reason: "lead assigned" })) });
  await audit(v, "safety.report_updated", "SafetyReport", reportId, { incident: "updated" });
  refresh(reportId);
}

export async function setIncidentStatus(reportId: string, status: "ACTIVE" | "MONITORING") {
  const { v, report, incident } = await loadIncident(reportId);
  if (!canRunIncident(v, { ...report, incident })) return fail("Only the response lead or safety team can change the response status.");
  if (incident.status === status) return;
  await prisma.incidentResponse.update({ where: { id: incident.id }, data: { status, resolvedAt: null } });
  await addReportEvent({ reportId, type: "INCIDENT", message: `Response status: ${incidentStatusInfo(status).label}.`, actor: actor(v) });
  refresh(reportId);
}

export async function addResponder(reportId: string, employeeId: string, role: string) {
  const { v, report, incident } = await loadIncident(reportId);
  if (!canRunIncident(v, { ...report, incident })) return fail("Only the response lead or safety team can add responders.");
  const e = await prisma.employee.findFirst({ where: { id: employeeId, organizationId: v.organizationId }, include: { user: { select: { name: true } } } });
  if (!e) return fail("That person is not in your company.");
  if (incident.leadId === e.id || incident.responders.some((r) => r.employeeId === e.id)) return fail(`${e.user.name} is already on the response team.`);
  const cleanRole = role.trim().slice(0, 60);
  await prisma.incidentResponder.create({ data: { incidentId: incident.id, employeeId: e.id, role: cleanRole } });
  await addReportEvent({ reportId, type: "INCIDENT", message: `${e.user.name} added to the response team${cleanRole ? ` as ${cleanRole}` : ""}.`, actor: actor(v) });
  await addReportEvent({ reportId, type: "INCIDENT", message: describeNotify(await notifyResponders({ reportId, employeeIds: [e.id], reason: "you're on the team" })) });
  refresh(reportId);
}

export async function removeResponder(reportId: string, employeeId: string) {
  const { v, report, incident } = await loadIncident(reportId);
  if (!canRunIncident(v, { ...report, incident })) return fail("Only the response lead or safety team can remove responders.");
  const row = incident.responders.find((r) => r.employeeId === employeeId);
  if (!row) return;
  await prisma.incidentResponder.delete({ where: { id: row.id } });
  const p = await prisma.employee.findUnique({ where: { id: employeeId }, include: { user: { select: { name: true } } } });
  await addReportEvent({ reportId, type: "INCIDENT", message: `${p?.user.name ?? "A responder"} removed from the response team.`, actor: actor(v) });
  refresh(reportId);
}

/** An update, decision, note or evidence entry on the shared timeline. Restricted entries are visible to the safety team only. */
export async function postIncidentEntry(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const { v, report, incident } = await loadIncident(reportId);
  if (!canContributeToIncident(v, { ...report, incident })) return fail("You are not on this response team.");
  if (incident.status === "RESOLVED") return fail("This incident is resolved. Reopen it to add to the timeline.");
  const kind = String(formData.get("kind") ?? "UPDATE");
  if (!["UPDATE", "DECISION", "EVIDENCE", "COMMENT"].includes(kind)) return fail("Unknown entry type.");
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const attachments = cleanAttachments(formData.getAll("attachment"), 4);
  if (!message && attachments.length === 0) return fail("Add some text first.");
  if (kind === "EVIDENCE" && attachments.length === 0) return fail("Add at least one photo for a photo entry.");
  // Only the safety team may mark an entry restricted (medical or personal detail); everyone else's entries are shared with the team.
  const restricted = v.isSafetyTeam && formData.get("restricted") === "on";
  await addReportEvent({ reportId, type: kind, message: message || "Photo added.", actor: actor(v), restricted, attachments });
  await audit(v, "safety.report_updated", "SafetyReport", reportId, { entry: kind, restricted });
  refresh(reportId);
}

/** A message the reporter can read (on their report, or on the private follow-up page for anonymous reports). Sent by a person, never automatically. */
export async function messageReporter(reportId: string, message: string) {
  const { v, report, incident } = await load(reportId);
  const text = message.trim().slice(0, 2000);
  if (!text) return fail("Write a message first.");
  const allowed = v.isSafetyTeam || (v.employeeId !== null && report.ownerId === v.employeeId) || canRunIncident(v, { ...report, incident });
  if (!allowed) return fail("Only the owner, response lead or safety team can message the reporter.");
  await addReportEvent({ reportId, type: "MESSAGE_TO_REPORTER", message: text, actor: actor(v), toReporter: true });
  refresh(reportId);
}

export async function resolveIncident(reportId: string, closeoutSummary: string) {
  const { v, report, incident } = await loadIncident(reportId);
  if (!canRunIncident(v, { ...report, incident })) return fail("Only the response lead or safety team can close out an incident.");
  const summary = closeoutSummary.trim().slice(0, 4000);
  if (summary.length < 20) return fail("Write a short closeout summary first: what happened, what was decided, and what happens next.");
  const open = await prisma.correctiveAction.count({ where: { reportId, status: { in: OPEN_ACTION_STATUSES } } });
  await prisma.incidentResponse.update({ where: { id: incident.id }, data: { status: "RESOLVED", closeoutSummary: summary, resolvedAt: new Date(), nextAction: "", nextActionDueAt: null } });
  await addReportEvent({
    reportId,
    type: "INCIDENT",
    message: `Incident response resolved. ${open > 0 ? `${open} corrective action${open === 1 ? " is" : "s are"} still open and stay tracked on this report.` : "No corrective actions are open."}`,
    actor: actor(v),
  });
  await audit(v, "safety.report_updated", "SafetyReport", reportId, { incident: "resolved" });
  refresh(reportId);
}

export async function reopenIncident(reportId: string) {
  const { v, report, incident } = await loadIncident(reportId);
  if (!canRunIncident(v, { ...report, incident })) return fail("Only the response lead or safety team can reopen an incident.");
  if (incident.status !== "RESOLVED") return;
  await prisma.incidentResponse.update({ where: { id: incident.id }, data: { status: "MONITORING", resolvedAt: null } });
  if (report.status === "CLOSED") await prisma.safetyReport.update({ where: { id: reportId }, data: { status: "ACTIONS_OPEN", closedAt: null } });
  await addReportEvent({ reportId, type: "INCIDENT", message: "Incident response reopened.", actor: actor(v) });
  refresh(reportId);
}

/** "This wasn't an incident": closes the workspace with a reason so minor reports don't carry response overhead. */
export async function standDownIncident(reportId: string, reason: string) {
  const { v, report, incident } = await loadIncident(reportId);
  if (!canRunIncident(v, { ...report, incident })) return fail("Only the response lead or safety team can stand down an incident.");
  const why = reason.trim().slice(0, 500);
  if (why.length < 5) return fail("Say briefly why this does not need an incident response.");
  await prisma.incidentResponse.update({ where: { id: incident.id }, data: { status: "RESOLVED", standDownReason: why, closeoutSummary: incident.closeoutSummary || `Stood down: ${why}`, resolvedAt: new Date(), nextAction: "", nextActionDueAt: null } });
  await addReportEvent({ reportId, type: "INCIDENT", message: `Stood down as an incident response: ${why} The report continues as a normal report.`, actor: actor(v) });
  refresh(reportId);
}

