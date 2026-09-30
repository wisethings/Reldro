import "server-only";
import { prisma } from "@/lib/prisma";
import { escapeHtml, getAppUrl, isEmailConfigured, sendEmail } from "@/lib/email";
import { addReportEvent } from "./context";

export type NotifyResult = { sent: number; failed: number; skippedReason: string | null };

/**
 * Tells named responders by email that they have been added to an incident response. The email
 * carries only the reference, site and a link, never the description, names or medical details.
 * Demo workspaces never send email. If email is not configured the result says so, and the
 * timeline records it, so nobody assumes a notification went out.
 */
export async function notifyResponders(params: { reportId: string; employeeIds: string[]; reason: string }): Promise<NotifyResult> {
  const report = await prisma.safetyReport.findUnique({ where: { id: params.reportId }, include: { site: true, organization: { select: { name: true, isDemo: true } } } });
  if (!report) return { sent: 0, failed: 0, skippedReason: "Report not found." };
  const ids = [...new Set(params.employeeIds)];
  if (ids.length === 0) return { sent: 0, failed: 0, skippedReason: "Nobody to notify." };
  if (report.organization.isDemo) return { sent: 0, failed: 0, skippedReason: "Sample workspace: no email is sent." };
  if (!isEmailConfigured()) return { sent: 0, failed: 0, skippedReason: "Email isn't set up for this workspace." };

  const people = await prisma.employee.findMany({ where: { id: { in: ids } }, include: { user: { select: { email: true, name: true } } } });
  const ref = `SR-${String(report.number).padStart(4, "0")}`;
  const link = `${getAppUrl()}/dashboard/reports/${report.id}`;
  let sent = 0;
  let failed = 0;
  for (const p of people) {
    const res = await sendEmail({
      to: p.user.email,
      subject: `${report.organization.name}: incident response ${params.reason} (${ref})`,
      html: `<p>Hi ${escapeHtml(p.user.name.split(" ")[0] ?? "there")},</p>
<p>You've been named on an incident response for <strong>${ref}</strong>${report.site ? ` at ${escapeHtml(report.site.name)}` : ""}.</p>
<p><a href="${link}">Open the incident workspace</a></p>
<p style="color:#666;font-size:12px">Details are not included in this email. Sign in to read them. Reldro does not contact emergency services. If someone needs urgent help, call your local emergency number.</p>`,
    });
    if (res.sent) sent++;
    else failed++;
  }
  return { sent, failed, skippedReason: null };
}

export function describeNotify(r: NotifyResult): string {
  if (r.skippedReason) return `No email sent. ${r.skippedReason} Responders will see this on their Overview.`;
  if (r.failed > 0) return `Email sent to ${r.sent}; ${r.failed} could not be delivered. Responders will see this on their Overview.`;
  return `Email notice sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}.`;
}

/**
 * Opens the incident workspace on a report. Idempotent: returns the existing one if there is one.
 * `openedBy` records whether a person or an escalation rule opened it.
 */
export async function openIncidentOn(params: {
  reportId: string;
  organizationId: string;
  leadId: string | null;
  responderIds?: string[];
  openedBy: "MANUAL" | "RULE";
  openedById: string | null;
  actor: { name: string; employeeId: string | null } | null;
  reason?: string;
}): Promise<{ id: string; created: boolean; notice: string }> {
  const existing = await prisma.incidentResponse.findUnique({ where: { reportId: params.reportId } });
  if (existing) return { id: existing.id, created: false, notice: "" };

  const incident = await prisma.incidentResponse.create({
    data: {
      organizationId: params.organizationId,
      reportId: params.reportId,
      leadId: params.leadId,
      openedBy: params.openedBy,
      openedById: params.openedById,
      nextAction: params.leadId ? "Confirm the situation is safe and assess how serious it is." : "Choose a response lead.",
    },
  });
  const responderIds = [...new Set((params.responderIds ?? []).filter((id) => id && id !== params.leadId))];
  for (const employeeId of responderIds) {
    await prisma.incidentResponder.create({ data: { incidentId: incident.id, employeeId, role: "Alerted by rule" } });
  }
  await addReportEvent({
    reportId: params.reportId,
    type: "INCIDENT",
    message:
      params.openedBy === "RULE"
        ? `Incident workspace opened automatically by an escalation rule${params.reason ? ` (${params.reason})` : ""}. Severity is still a suggestion until a responder confirms it.`
        : `Incident workspace opened${params.reason ? `: ${params.reason}` : ""}.`,
    actor: params.actor,
  });
  const notify = await notifyResponders({ reportId: params.reportId, employeeIds: [...(params.leadId ? [params.leadId] : []), ...responderIds], reason: "opened" });
  const notice = describeNotify(notify);
  await addReportEvent({ reportId: params.reportId, type: "INCIDENT", message: notice });
  return { id: incident.id, created: true, notice };
}
