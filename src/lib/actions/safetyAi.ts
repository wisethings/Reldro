"use server";

import { prisma } from "@/lib/prisma";
import { canSeeInvestigation, canSeeReport, reportWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { checkRateLimit } from "@/lib/rateLimit";
import { categoryLabel, getPack, OPEN_ACTION_STATUSES } from "@/lib/safety/pack";
import {
  draftInvestigationQuestions,
  draftToolboxTalk,
  structureReportDraft,
  summarizeInvestigation,
  summarizeThemes,
  type QuestionDraft,
  type ReportDraft,
  type SummaryDraft,
} from "@/lib/safety/ai";

/**
 * Every function here returns a draft. Nothing is saved or acted on until a
 * person reviews it in the UI and chooses to use it.
 */

async function limit(userId: string) {
  // Keeps a stuck client or a curious user from running up model costs.
  if (!(await checkRateLimit(`safety-ai:${userId}`, 40, 60))) throw new Error("You've used a lot of AI drafts in the last hour. Please try again later.");
}

export async function aiStructureReport(text: string): Promise<ReportDraft> {
  const v = await requireViewer();
  await limit(v.userId);
  if (text.trim().length < 5) throw new Error("Add a few words first.");
  return structureReportDraft(text, getPack());
}

async function factsFor(reportId: string) {
  const v = await requireViewer();
  const report = await prisma.safetyReport.findFirst({ where: { id: reportId, organizationId: v.organizationId }, include: { site: true, investigation: true } });
  if (!report || !canSeeReport(v, report)) throw new Error("Report not found.");
  const facts = {
    number: report.number,
    type: report.type,
    category: report.category,
    severity: report.severity,
    title: report.title,
    description: report.description,
    siteName: report.site?.name ?? null,
    occurredAt: report.occurredAt,
    injuryInvolved: report.injuryInvolved,
    immediateAction: report.immediateAction,
  };
  return { v, report, facts };
}

export async function aiDraftQuestions(reportId: string): Promise<QuestionDraft> {
  const { v, report, facts } = await factsFor(reportId);
  if (!report.investigation || !canSeeInvestigation(v, report.investigation)) throw new Error("You don't have access to this investigation.");
  await limit(v.userId);
  return draftInvestigationQuestions(facts, report.investigation.facts);
}

export async function aiSummarizeInvestigation(reportId: string): Promise<SummaryDraft> {
  const { v, report, facts } = await factsFor(reportId);
  await limit(v.userId);
  const events = await prisma.reportEvent.findMany({
    where: { reportId, ...(v.isSafetyTeam ? {} : { restricted: false }) },
    orderBy: { createdAt: "asc" },
  });
  const inv = report.investigation && canSeeInvestigation(v, report.investigation) ? report.investigation : null;
  return summarizeInvestigation({
    facts,
    events: events.map((e) => ({ at: e.createdAt, message: e.message, actor: e.actorName })),
    investigation: inv ? { facts: inv.facts, sequenceNotes: inv.sequenceNotes, contributingFactors: inv.contributingFactors } : null,
  });
}

export async function aiSummarizeThemes(windowDays = 90): Promise<SummaryDraft> {
  const v = await requireViewer();
  if (!v.isSafetyTeam) throw new Error("Only the safety team can generate cross-site summaries.");
  await limit(v.userId);
  const since = new Date(Date.now() - windowDays * 86400_000);
  const pack = getPack();
  const [reports, investigations, overdue] = await Promise.all([
    prisma.safetyReport.findMany({ where: { ...reportWhere(v), createdAt: { gte: since } }, include: { site: true } }),
    prisma.investigation.findMany({ where: { organizationId: v.organizationId, openedAt: { gte: since } }, select: { contributingFactors: true } }),
    prisma.correctiveAction.count({ where: { organizationId: v.organizationId, status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: new Date() } } }),
  ]);
  const tally = (keys: string[]) => {
    const m = new Map<string, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  };
  const pairCounts = new Map<string, { category: string; site: string; count: number }>();
  for (const r of reports) {
    if (!r.site) continue;
    const key = `${r.category}|${r.siteId}`;
    const cur = pairCounts.get(key) ?? { category: categoryLabel(r.category, pack), site: r.site.name, count: 0 };
    cur.count++;
    pairCounts.set(key, cur);
  }
  return summarizeThemes({
    windowDays,
    byCategory: tally(reports.map((r) => categoryLabel(r.category, pack))).slice(0, 5),
    bySite: tally(reports.map((r) => r.site?.name ?? "No site")).slice(0, 5),
    topFactors: tally(investigations.flatMap((i) => i.contributingFactors)).slice(0, 5),
    overdueActions: overdue,
    repeatPairs: [...pairCounts.values()].filter((p) => p.count >= 2).sort((a, b) => b.count - a.count),
  });
}

export async function aiDraftToolboxTalk(topic: string, sourceMaterial: string): Promise<SummaryDraft> {
  const v = await requireViewer();
  if (!v.isSafetyTeam && !v.isSupervisor) throw new Error("Only the safety team or supervisors can draft talks.");
  await limit(v.userId);
  if (!topic.trim()) throw new Error("Enter a topic first.");
  if (sourceMaterial.trim().length < 40) throw new Error("Paste your approved material (a procedure, policy excerpt or past lesson) so the outline is based on it.");
  return draftToolboxTalk({ topic: topic.trim(), sourceMaterial });
}
