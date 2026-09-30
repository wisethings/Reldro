"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canManageReport, canSeeInvestigation, canSeeReport } from "@/lib/safety/access";
import { addReportEvent, audit, requireViewer } from "@/lib/safety/context";
import { getPack } from "@/lib/safety/pack";

export type InvestigationFormState = { error?: string; success?: string } | undefined;

async function loadInvestigation(investigationId: string) {
  const v = await requireViewer();
  const inv = await prisma.investigation.findFirst({ where: { id: investigationId, organizationId: v.organizationId }, include: { report: true } });
  if (!inv || !canSeeInvestigation(v, inv) || !canSeeReport(v, inv.report)) throw new Error("Investigation not found.");
  return { v, inv };
}

export async function startInvestigation(reportId: string) {
  const v = await requireViewer();
  const report = await prisma.safetyReport.findFirst({ where: { id: reportId, organizationId: v.organizationId } });
  if (!report || !canManageReport(v, report)) throw new Error("Only the owner or safety team can open an investigation.");
  const existing = await prisma.investigation.findUnique({ where: { reportId } });
  if (existing) return existing.id;
  const inv = await prisma.investigation.create({
    data: { reportId, organizationId: v.organizationId, leadId: v.employeeId ?? report.ownerId, status: "OPEN" },
  });
  await prisma.safetyReport.update({ where: { id: reportId }, data: { status: "INVESTIGATING", acknowledgedAt: report.acknowledgedAt ?? new Date() } });
  await addReportEvent({ reportId, type: "INVESTIGATION", message: "Investigation opened.", actor: { name: v.name, employeeId: v.employeeId } });
  await audit(v, "safety.investigation_updated", "Investigation", inv.id, { opened: true });
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/investigations");
  revalidatePath("/dashboard/overview");
  return inv.id;
}

export async function saveInvestigation(_prev: InvestigationFormState, formData: FormData): Promise<InvestigationFormState> {
  const { v, inv } = await loadInvestigation(String(formData.get("investigationId") ?? ""));
  if (inv.status === "COMPLETE" && !v.isSafetyTeam) return { error: "This investigation is complete." };
  const pack = getPack();
  const factors = formData.getAll("factor").map(String).filter((f) => pack.contributingFactors.includes(f));
  const lessonText = String(formData.get("lessonText") ?? "").trim().slice(0, 2000);
  const shareLesson = formData.get("shareLesson") === "on";
  if (shareLesson && !v.isSafetyTeam) return { error: "Only the safety team can publish a shared lesson." };
  if (shareLesson && !lessonText) return { error: "Write the lesson text, without names or personal details, before publishing it." };

  await prisma.investigation.update({
    where: { id: inv.id },
    data: {
      facts: String(formData.get("facts") ?? "").trim().slice(0, 6000),
      sequenceNotes: String(formData.get("sequenceNotes") ?? "").trim().slice(0, 6000),
      contributingFactors: factors,
      rootCauseNotes: String(formData.get("rootCauseNotes") ?? "").trim().slice(0, 6000),
      lessonText,
      shareLesson,
    },
  });
  await audit(v, "safety.investigation_updated", "Investigation", inv.id, { saved: true });
  revalidatePath(`/dashboard/investigations/${inv.id}`);
  return { success: "Saved." };
}

export async function setInvestigationStatus(investigationId: string, status: string) {
  const { v, inv } = await loadInvestigation(investigationId);
  if (!["OPEN", "IN_REVIEW", "COMPLETE"].includes(status)) throw new Error("Unknown status.");
  if (status === "COMPLETE") {
    if (!v.isSafetyTeam) throw new Error("Only the safety team can mark an investigation complete.");
    if (!inv.facts.trim()) throw new Error("Record the facts before completing.");
    if (inv.contributingFactors.length === 0) throw new Error("Select at least one contributing factor before completing.");
    if (!inv.rootCauseNotes.trim()) throw new Error("Write the investigator's root-cause reasoning before completing. Reldro does not fill this in.");
  }
  await prisma.investigation.update({ where: { id: inv.id }, data: { status, completedAt: status === "COMPLETE" ? new Date() : null } });
  await addReportEvent({ reportId: inv.reportId, type: "INVESTIGATION", message: `Investigation marked ${status === "COMPLETE" ? "complete" : status === "IN_REVIEW" ? "in review" : "open"}.`, actor: { name: v.name, employeeId: v.employeeId } });
  await audit(v, "safety.investigation_updated", "Investigation", inv.id, { status });
  revalidatePath(`/dashboard/investigations/${inv.id}`);
  revalidatePath("/dashboard/investigations");
  revalidatePath("/dashboard/overview");
}

export async function setInvestigationLead(investigationId: string, leadId: string | null) {
  const { v, inv } = await loadInvestigation(investigationId);
  if (!v.isSafetyTeam) throw new Error("Only the safety team can change the lead.");
  if (leadId) {
    const lead = await prisma.employee.findFirst({ where: { id: leadId, organizationId: v.organizationId } });
    if (!lead) throw new Error("Lead not found.");
  }
  await prisma.investigation.update({ where: { id: inv.id }, data: { leadId } });
  await audit(v, "safety.investigation_updated", "Investigation", inv.id, { leadId });
  revalidatePath(`/dashboard/investigations/${inv.id}`);
}

export async function addStatement(_prev: InvestigationFormState, formData: FormData): Promise<InvestigationFormState> {
  const { v, inv } = await loadInvestigation(String(formData.get("investigationId") ?? ""));
  const content = String(formData.get("content") ?? "").trim();
  const providedBy = String(formData.get("providedBy") ?? "").trim();
  if (!content) return { error: "Write the statement first." };
  await prisma.investigationStatement.create({
    data: { investigationId: inv.id, content: content.slice(0, 4000), providedBy: (providedBy || "Witness").slice(0, 120), addedByName: v.name },
  });
  await audit(v, "safety.investigation_updated", "Investigation", inv.id, { statementAdded: true });
  revalidatePath(`/dashboard/investigations/${inv.id}`);
  return { success: "Statement added." };
}

export async function deleteStatement(statementId: string) {
  const v = await requireViewer();
  const st = await prisma.investigationStatement.findUnique({ where: { id: statementId }, include: { investigation: true } });
  if (!st || st.investigation.organizationId !== v.organizationId || !canSeeInvestigation(v, st.investigation)) throw new Error("Statement not found.");
  await prisma.investigationStatement.delete({ where: { id: statementId } });
  await audit(v, "safety.investigation_updated", "Investigation", st.investigationId, { statementRemoved: true });
  revalidatePath(`/dashboard/investigations/${st.investigationId}`);
}

export async function addQuestions(investigationId: string, texts: string[], aiDrafted: boolean) {
  const { v, inv } = await loadInvestigation(investigationId);
  const clean = texts.map((t) => t.trim().slice(0, 500)).filter(Boolean).slice(0, 10);
  if (clean.length === 0) return;
  await prisma.investigationQuestion.createMany({ data: clean.map((text) => ({ investigationId: inv.id, text, aiDrafted })) });
  if (aiDrafted) await addReportEvent({ reportId: inv.reportId, type: "AI_DRAFT", message: `${clean.length} AI-drafted investigation question${clean.length === 1 ? "" : "s"} added after review.`, actor: { name: v.name, employeeId: v.employeeId }, restricted: true });
  revalidatePath(`/dashboard/investigations/${inv.id}`);
}

export async function answerQuestion(questionId: string, answer: string) {
  const v = await requireViewer();
  const q = await prisma.investigationQuestion.findUnique({ where: { id: questionId }, include: { investigation: true } });
  if (!q || q.investigation.organizationId !== v.organizationId || !canSeeInvestigation(v, q.investigation)) throw new Error("Question not found.");
  await prisma.investigationQuestion.update({ where: { id: questionId }, data: { answer: answer.trim().slice(0, 3000) } });
  revalidatePath(`/dashboard/investigations/${q.investigationId}`);
}

export async function deleteQuestion(questionId: string) {
  const v = await requireViewer();
  const q = await prisma.investigationQuestion.findUnique({ where: { id: questionId }, include: { investigation: true } });
  if (!q || q.investigation.organizationId !== v.organizationId || !canSeeInvestigation(v, q.investigation)) throw new Error("Question not found.");
  await prisma.investigationQuestion.delete({ where: { id: questionId } });
  revalidatePath(`/dashboard/investigations/${q.investigationId}`);
}

/** Records that a person took an AI-drafted summary into the investigation (the draft itself is not stored). */
export async function noteAiDraftUsed(investigationId: string, kind: string) {
  const { v, inv } = await loadInvestigation(investigationId);
  await addReportEvent({ reportId: inv.reportId, type: "AI_DRAFT", message: `AI-drafted ${kind} was copied into the investigation for editing.`, actor: { name: v.name, employeeId: v.employeeId }, restricted: true });
}
