"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { addReportEvent, audit, isoOrNull, nextActionNumber, nextReportNumber, requireViewer } from "@/lib/safety/context";
import { routeReport } from "@/lib/safety/routing";
import { getPack, guessCategory } from "@/lib/safety/pack";

export type InspectionFormState = { error?: string; success?: string } | undefined;
type TemplateItem = { id: string; label: string; critical?: boolean };

export async function addStarterTemplates() {
  const v = await requireViewer();
  if (!v.isSafetyTeam) throw new Error("Only the safety team can add checklists.");
  const pack = getPack();
  const existing = await prisma.inspectionTemplate.findMany({ where: { organizationId: v.organizationId }, select: { name: true } });
  const have = new Set(existing.map((e) => e.name));
  for (const t of pack.inspectionTemplates) {
    if (have.has(t.name)) continue;
    await prisma.inspectionTemplate.create({
      data: {
        organizationId: v.organizationId,
        name: t.name,
        kind: t.kind,
        frequencyDays: t.frequencyDays,
        items: t.items.map((it, i) => ({ id: `i${i + 1}`, label: it.label, critical: Boolean(it.critical) })),
      },
    });
  }
  await audit(v, "safety.settings_changed", "InspectionTemplate", "starter", { starter: true });
  revalidatePath("/dashboard/inspections");
}

export async function createTemplate(_prev: InspectionFormState, formData: FormData): Promise<InspectionFormState> {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return { error: "Only the safety team can create checklists." };
  const name = String(formData.get("name") ?? "").trim();
  const items = String(formData.get("items") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40);
  if (!name) return { error: "Name the checklist." };
  if (items.length === 0) return { error: "Add at least one checklist item, one per line." };
  const kind = ["SITE_INSPECTION", "READINESS", "OBSERVATION"].includes(String(formData.get("kind"))) ? String(formData.get("kind")) : "SITE_INSPECTION";
  const freq = Math.round(Number(formData.get("frequencyDays")) || 0);
  await prisma.inspectionTemplate.create({
    data: {
      organizationId: v.organizationId,
      name: name.slice(0, 120),
      kind,
      frequencyDays: freq > 0 ? freq : null,
      items: items.map((label, i) => ({ id: `i${i + 1}`, label: label.replace(/^\*\s*/, ""), critical: label.startsWith("*") })),
    },
  });
  await audit(v, "safety.settings_changed", "InspectionTemplate", name, { created: true });
  revalidatePath("/dashboard/inspections");
  return { success: "Checklist created. Prefix a line with * to mark it critical." };
}

export async function deleteTemplate(templateId: string) {
  const v = await requireViewer();
  if (!v.isSafetyTeam) throw new Error("Only the safety team can delete checklists.");
  const t = await prisma.inspectionTemplate.findFirst({ where: { id: templateId, organizationId: v.organizationId } });
  if (!t) throw new Error("Checklist not found.");
  await prisma.inspectionTemplate.delete({ where: { id: templateId } });
  await audit(v, "safety.settings_changed", "InspectionTemplate", templateId, { deleted: t.name });
  revalidatePath("/dashboard/inspections");
}

export async function scheduleInspection(_prev: InspectionFormState, formData: FormData): Promise<InspectionFormState> {
  const v = await requireViewer();
  if (!v.isSafetyTeam && !v.isSupervisor) return { error: "Only the safety team or a supervisor can schedule inspections." };
  const template = await prisma.inspectionTemplate.findFirst({ where: { id: String(formData.get("templateId") ?? ""), organizationId: v.organizationId } });
  const site = await prisma.site.findFirst({ where: { id: String(formData.get("siteId") ?? ""), organizationId: v.organizationId, active: true } });
  const dueDate = isoOrNull(formData.get("dueDate"));
  if (!template) return { error: "Choose a checklist." };
  if (!site) return { error: "Choose a site." };
  if (!dueDate) return { error: "Choose a due date." };
  if (!v.isSafetyTeam && site.id !== v.siteId) return { error: "Supervisors can schedule inspections for their own site only." };
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  if (assigneeId) {
    const a = await prisma.employee.findFirst({ where: { id: assigneeId, organizationId: v.organizationId } });
    if (!a) return { error: "Owner not found." };
  }
  const created = await prisma.inspection.create({ data: { organizationId: v.organizationId, templateId: template.id, siteId: site.id, assigneeId, dueDate } });
  await audit(v, "safety.inspection_completed", "Inspection", created.id, { scheduled: true });
  revalidatePath("/dashboard/inspections");
  revalidatePath("/dashboard/overview");
  return { success: "Inspection scheduled." };
}

export async function completeInspection(_prev: InspectionFormState, formData: FormData): Promise<InspectionFormState> {
  const v = await requireViewer();
  const inspection = await prisma.inspection.findFirst({
    where: { id: String(formData.get("inspectionId") ?? ""), organizationId: v.organizationId },
    include: { template: true, site: true },
  });
  if (!inspection) return { error: "Inspection not found." };
  const canRun = v.isSafetyTeam || (v.employeeId !== null && inspection.assigneeId === v.employeeId) || (v.isSupervisor && v.siteId === inspection.siteId);
  if (!canRun) return { error: "You do not have access to run this inspection." };
  if (inspection.status === "COMPLETED") return { error: "This inspection is already complete." };

  const items = inspection.template.items as unknown as TemplateItem[];
  const results = items.map((it) => {
    const r = String(formData.get(`result_${it.id}`) ?? "");
    return { itemId: it.id, label: it.label, critical: Boolean(it.critical), result: ["PASS", "FAIL", "NA"].includes(r) ? r : "", note: String(formData.get(`note_${it.id}`) ?? "").trim().slice(0, 500) };
  });
  if (results.some((r) => r.result === "")) return { error: "Mark every item Pass, Fail, or N/A before submitting." };

  await prisma.inspection.update({
    where: { id: inspection.id },
    data: { status: "COMPLETED", results, notes: String(formData.get("notes") ?? "").trim().slice(0, 2000), completedById: v.employeeId, completedAt: new Date() },
  });

  const failures = results.filter((r) => r.result === "FAIL");
  if (failures.length && formData.get("createActions") === "on") {
    for (const f of failures) {
      const due = new Date(Date.now() + (f.critical ? 2 : 7) * 86400_000);
      await prisma.correctiveAction.create({
        data: {
          organizationId: v.organizationId,
          number: await nextActionNumber(v.organizationId),
          inspectionId: inspection.id,
          title: `Fix: ${f.label}`.slice(0, 160),
          description: `Found during "${inspection.template.name}" at ${inspection.site.name}.${f.note ? ` Note: ${f.note}` : ""}`,
          priority: f.critical ? "HIGH" : "MEDIUM",
          status: "PROPOSED",
          ownerId: inspection.site.safetyLeadId,
          dueDate: due,
          proposedById: v.employeeId,
        },
      });
    }
  }
  if (inspection.template.frequencyDays) {
    await prisma.inspection.create({
      data: {
        organizationId: v.organizationId,
        templateId: inspection.templateId,
        siteId: inspection.siteId,
        assigneeId: inspection.assigneeId,
        dueDate: new Date(inspection.dueDate.getTime() + inspection.template.frequencyDays * 86400_000),
      },
    });
  }
  await audit(v, "safety.inspection_completed", "Inspection", inspection.id, { failed: failures.length });
  revalidatePath("/dashboard/inspections");
  revalidatePath("/dashboard/actions");
  revalidatePath("/dashboard/overview");
  return { success: failures.length ? `Submitted. ${failures.length} failed item${failures.length === 1 ? "" : "s"}${formData.get("createActions") === "on" ? " turned into proposed actions" : ""}.` : "Submitted. No failed items." };
}

type StoredResult = { itemId: string; label: string; critical?: boolean; result: string; note: string; reportId?: string };

/**
 * Turns one failed inspection item into a hazard report, so it gets routed, owned and tracked like
 * any other hazard. The item's proposed action (if any) is attached to the new report instead of
 * staying a separate record. Does not open an incident response: an inspection finding is a hazard, not an emergency.
 */
export async function raiseReportFromInspection(inspectionId: string, itemId: string): Promise<string> {
  const v = await requireViewer();
  const inspection = await prisma.inspection.findFirst({ where: { id: inspectionId, organizationId: v.organizationId }, include: { template: true, site: true } });
  if (!inspection) throw new Error("Inspection not found.");
  const canRun = v.isSafetyTeam || (v.employeeId !== null && inspection.assigneeId === v.employeeId) || (v.isSupervisor && v.siteId === inspection.siteId);
  if (!canRun) throw new Error("You do not have access to this inspection.");
  if (inspection.status !== "COMPLETED") throw new Error("Complete the inspection first.");
  const results = inspection.results as unknown as StoredResult[];
  const item = results.find((r) => r.itemId === itemId);
  if (!item || item.result !== "FAIL") throw new Error("That item did not fail.");
  if (item.reportId) throw new Error("A report has already been filed for this item.");

  const pack = getPack();
  const description = `Found during "${inspection.template.name}" at ${inspection.site.name}: ${item.label}.${item.note ? ` Inspector's note: ${item.note}` : ""}`;
  const category = guessCategory(`${item.label} ${item.note}`, pack);
  const severity = item.critical ? "HIGH" : "MEDIUM";
  const routing = await routeReport({ organizationId: v.organizationId, siteId: inspection.siteId, category, severity, createdAt: new Date() });

  const report = await prisma.safetyReport.create({
    data: {
      organizationId: v.organizationId,
      number: await nextReportNumber(v.organizationId),
      type: "HAZARD",
      category,
      title: `Failed inspection item: ${item.label}`.slice(0, 120),
      description,
      siteId: inspection.siteId,
      occurredAt: inspection.completedAt ?? new Date(),
      severity,
      status: routing.ownerId ? "ASSIGNED" : "NEW",
      privacy: "NAMED",
      reporterId: v.employeeId,
      ownerId: routing.ownerId,
      respondBy: routing.respondBy,
      inspectionId: inspection.id,
    },
  });
  await addReportEvent({ reportId: report.id, type: "CREATED", message: `Report created from a failed inspection item (${inspection.template.name}).`, actor: { name: v.name, employeeId: v.employeeId } });
  await addReportEvent({ reportId: report.id, type: "ASSIGNED", message: routing.ownerId ? "Assigned to the site's owner." : "No owner matched. Waiting for the safety team to assign an owner." });
  // Attach the item's existing proposed action to the report so the hazard has one home.
  await prisma.correctiveAction.updateMany({
    where: { organizationId: v.organizationId, inspectionId: inspection.id, reportId: null, title: { startsWith: `Fix: ${item.label}`.slice(0, 160) } },
    data: { reportId: report.id },
  });
  await prisma.inspection.update({ where: { id: inspection.id }, data: { results: results.map((r) => (r.itemId === itemId ? { ...r, reportId: report.id } : r)) } });
  await audit(v, "safety.report_created", "SafetyReport", report.id, { number: report.number, fromInspection: inspection.id });
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/overview");
  revalidatePath(`/dashboard/inspections/${inspection.id}`);
  return report.id;
}
