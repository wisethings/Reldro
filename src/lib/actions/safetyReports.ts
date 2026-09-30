"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManageReport, canSeeReport } from "@/lib/safety/access";
import { addReportEvent, audit, cleanAttachments, isoOrNull, nextReportNumber, requireViewer } from "@/lib/safety/context";
import { routeReport } from "@/lib/safety/routing";
import { getPack, reportStatusInfo, severityInfo, REPORT_TYPES } from "@/lib/safety/pack";

export type ReportFormState = { error?: string } | undefined;

function str(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

function defaultTitle(description: string) {
  const first = description.replace(/\s+/g, " ").split(/(?<=[.!?])\s/)[0] ?? description;
  return first.length > 80 ? first.slice(0, 79).trimEnd() + "…" : first;
}

export async function createReport(_prev: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const v = await requireViewer();
  const pack = getPack();

  const description = str(formData.get("description"));
  const type = str(formData.get("type"));
  if (!REPORT_TYPES.some((t) => t.key === type)) return { error: "Choose what kind of report this is." };
  if (description.length < 5) return { error: "Tell us briefly what happened or what you saw." };

  const category = pack.categories.some((c) => c.key === str(formData.get("category"))) ? str(formData.get("category")) : "OTHER";
  const severity = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(str(formData.get("severity"))) ? str(formData.get("severity")) : "MEDIUM";
  const privacy = ["NAMED", "CONFIDENTIAL", "ANONYMOUS"].includes(str(formData.get("privacy"))) ? str(formData.get("privacy")) : "NAMED";
  const occurredAt = isoOrNull(formData.get("occurredAt")) ?? new Date();
  if (occurredAt.getTime() > Date.now() + 5 * 60_000) return { error: "The time can't be in the future." };

  let siteId: string | null = str(formData.get("siteId")) || null;
  if (siteId) {
    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: v.organizationId, active: true } });
    if (!site) siteId = null;
  }

  const routing = await routeReport({ organizationId: v.organizationId, siteId, category, severity, createdAt: new Date() });
  const injuryInvolved = formData.get("injuryInvolved") === "on" || type === "INJURY";
  const attachments = cleanAttachments(formData.getAll("attachment"));
  const aiAssisted = formData.get("aiAssisted") === "1";
  const reporterId = privacy === "ANONYMOUS" ? null : v.employeeId;

  let created: { id: string; number: number } | null = null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    try {
      created = await prisma.safetyReport.create({
        data: {
          organizationId: v.organizationId,
          number: await nextReportNumber(v.organizationId),
          type,
          category,
          title: str(formData.get("title")).slice(0, 120) || defaultTitle(description),
          description: description.slice(0, 4000),
          transcript: str(formData.get("transcript")).slice(0, 4000) || null,
          siteId,
          occurredAt,
          severity,
          status: routing.ownerId ? "ASSIGNED" : "NEW",
          privacy,
          injuryInvolved,
          immediateAction: str(formData.get("immediateAction")).slice(0, 1000),
          attachments,
          reporterId,
          ownerId: routing.ownerId,
          respondBy: routing.respondBy,
          aiAssisted,
        },
        select: { id: true, number: true },
      });
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  if (!created) return { error: "Couldn't save the report. Please try again." };

  await addReportEvent({
    reportId: created.id,
    type: "CREATED",
    message: privacy === "ANONYMOUS" ? "Report filed anonymously." : "Report filed.",
    actor: privacy === "NAMED" ? { name: v.name, employeeId: v.employeeId } : null,
  });
  if (routing.ownerId) {
    const owner = await prisma.employee.findUnique({ where: { id: routing.ownerId }, include: { user: { select: { name: true } } } });
    await addReportEvent({
      reportId: created.id,
      type: "ASSIGNED",
      message: `Routed to ${owner?.user.name ?? "an owner"} ${routing.ruleId ? "by an escalation rule" : "as the site safety lead"}.`,
    });
  } else {
    await addReportEvent({ reportId: created.id, type: "ASSIGNED", message: "No owner matched. Waiting for the safety team to assign." });
  }
  if (aiAssisted) await addReportEvent({ reportId: created.id, type: "AI_DRAFT", message: "The reporter used an AI-assisted draft and confirmed the details." });
  await audit(v, "safety.report_created", "SafetyReport", created.id, { number: created.number, type, severity });

  revalidatePath("/dashboard/overview");
  revalidatePath("/dashboard/reports");
  redirect(`/dashboard/reports/submitted?n=${created.number}&anon=${privacy === "ANONYMOUS" ? 1 : 0}`);
}

async function loadReportForActor(reportId: string) {
  const v = await requireViewer();
  const report = await prisma.safetyReport.findFirst({ where: { id: reportId, organizationId: v.organizationId } });
  if (!report || !canSeeReport(v, report)) throw new Error("Report not found.");
  return { v, report };
}

export async function acknowledgeReport(reportId: string) {
  const { v, report } = await loadReportForActor(reportId);
  if (!canManageReport(v, report)) throw new Error("Only the owner or safety team can acknowledge a report.");
  if (report.acknowledgedAt) return;
  await prisma.safetyReport.update({ where: { id: reportId }, data: { acknowledgedAt: new Date() } });
  await addReportEvent({ reportId, type: "ACKNOWLEDGED", message: "Report acknowledged.", actor: { name: v.name, employeeId: v.employeeId } });
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/overview");
}

export async function assignReport(reportId: string, ownerId: string | null) {
  const { v, report } = await loadReportForActor(reportId);
  if (!v.isSafetyTeam) throw new Error("Only the safety team can assign reports.");
  let ownerName = "nobody";
  if (ownerId) {
    const owner = await prisma.employee.findFirst({ where: { id: ownerId, organizationId: v.organizationId }, include: { user: { select: { name: true } } } });
    if (!owner) throw new Error("Owner not found.");
    ownerName = owner.user.name;
  }
  await prisma.safetyReport.update({
    where: { id: reportId },
    data: { ownerId, status: report.status === "NEW" && ownerId ? "ASSIGNED" : report.status },
  });
  await addReportEvent({ reportId, type: "ASSIGNED", message: ownerId ? `Assigned to ${ownerName}.` : "Owner removed.", actor: { name: v.name, employeeId: v.employeeId } });
  await audit(v, "safety.report_updated", "SafetyReport", reportId, { ownerId });
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/overview");
}

export async function updateTriage(reportId: string, changes: { severity?: string; category?: string; type?: string }) {
  const { v, report } = await loadReportForActor(reportId);
  if (!canManageReport(v, report)) throw new Error("Only the owner or safety team can change these details.");
  const pack = getPack();
  const data: { severity?: string; category?: string; type?: string } = {};
  const notes: string[] = [];
  if (changes.severity && changes.severity !== report.severity && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(changes.severity)) {
    data.severity = changes.severity;
    notes.push(`Severity changed from ${severityInfo(report.severity).label} to ${severityInfo(changes.severity).label}.`);
  }
  if (changes.category && changes.category !== report.category && pack.categories.some((c) => c.key === changes.category)) {
    data.category = changes.category;
    notes.push("Category changed.");
  }
  if (changes.type && changes.type !== report.type && REPORT_TYPES.some((t) => t.key === changes.type)) {
    data.type = changes.type;
    notes.push("Report type changed.");
  }
  if (notes.length === 0) return;
  await prisma.safetyReport.update({ where: { id: reportId }, data });
  await addReportEvent({ reportId, type: "STATUS", message: notes.join(" "), actor: { name: v.name, employeeId: v.employeeId } });
  await audit(v, "safety.report_updated", "SafetyReport", reportId, data);
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/overview");
}

export async function addComment(reportId: string, message: string, restricted: boolean) {
  const { v, report } = await loadReportForActor(reportId);
  const text = message.trim().slice(0, 2000);
  if (!text) throw new Error("Write a comment first.");
  const isRestricted = restricted && v.isSafetyTeam;
  await addReportEvent({ reportId: report.id, type: "COMMENT", message: text, actor: { name: v.name, employeeId: v.employeeId }, restricted: isRestricted });
  revalidatePath(`/dashboard/reports/${reportId}`);
}

export async function setReportStatus(reportId: string, status: string) {
  const { v, report } = await loadReportForActor(reportId);
  if (!canManageReport(v, report)) throw new Error("Only the owner or safety team can change status.");
  if (!["NEW", "ASSIGNED", "INVESTIGATING", "ACTIONS_OPEN", "CLOSED"].includes(status)) throw new Error("Unknown status.");
  if (status === "CLOSED") {
    const open = await prisma.correctiveAction.count({ where: { reportId, status: { in: ["PROPOSED", "APPROVED", "IN_PROGRESS", "COMPLETED"] } } });
    if (open > 0) throw new Error(`${open} corrective action${open === 1 ? " is" : "s are"} not verified yet. Verify or cancel them before closing.`);
    const inv = await prisma.investigation.findUnique({ where: { reportId } });
    if (inv && inv.status !== "COMPLETE") throw new Error("Complete the investigation before closing this report.");
  }
  await prisma.safetyReport.update({
    where: { id: reportId },
    data: { status, closedAt: status === "CLOSED" ? new Date() : null },
  });
  await addReportEvent({ reportId, type: "STATUS", message: `Status set to ${reportStatusInfo(status).label}.`, actor: { name: v.name, employeeId: v.employeeId } });
  await audit(v, "safety.report_updated", "SafetyReport", reportId, { status });
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/overview");
}
