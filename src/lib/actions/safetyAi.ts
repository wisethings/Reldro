"use server";

import { fail } from "@/lib/actionResult";
import { prisma } from "@/lib/prisma";
import { canRunIncident, canSeeInvestigation, canSeeReport, reportWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { checkRateLimit } from "@/lib/rateLimit";
import { actionStatusInfo, categoryLabel, getPack, OPEN_ACTION_STATUSES, SITE_KINDS } from "@/lib/safety/pack";
import { startOfTodayUTC } from "@/lib/safety/dates";
import {
  draftCloseout,
  draftInvestigationQuestions,
  draftLesson,
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

/** Keeps a stuck client or a curious user from running up model costs. Returns a failure to hand back, or null when fine. */
async function limit(userId: string) {
  return (await checkRateLimit(`safety-ai:${userId}`, 40, 60)) ? null : fail("You have used many AI drafts in the last hour. Try again later.");
}

export async function aiStructureReport(text: string): Promise<ReportDraft> {
  const v = await requireViewer();
  const limited = await limit(v.userId);
  if (limited) return limited;
  if (text.trim().length < 5) return fail("Add a few words first, then draft details.");
  return structureReportDraft(text, getPack());
}

async function factsFor(reportId: string) {
  const v = await requireViewer();
  const report = await prisma.safetyReport.findFirst({ where: { id: reportId, organizationId: v.organizationId }, include: { site: true, investigation: true, incident: { include: { responders: true } } } });
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
  if (!report.investigation || !canSeeInvestigation(v, report.investigation)) return fail("You do not have access to this investigation.");
  const limited = await limit(v.userId);
  if (limited) return limited;
  return draftInvestigationQuestions(facts, report.investigation.facts);
}

export async function aiSummarizeInvestigation(reportId: string): Promise<SummaryDraft> {
  const { v, report, facts } = await factsFor(reportId);
  const limited = await limit(v.userId);
  if (limited) return limited;
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
  if (!v.isSafetyTeam) return fail("Only the safety team can draft cross-site summaries.");
  const limited = await limit(v.userId);
  if (limited) return limited;
  const since = new Date(Date.now() - windowDays * 86400_000);
  const pack = getPack();
  const [reports, investigations, overdue] = await Promise.all([
    prisma.safetyReport.findMany({ where: { ...reportWhere(v), createdAt: { gte: since } }, include: { site: true } }),
    prisma.investigation.findMany({ where: { organizationId: v.organizationId, openedAt: { gte: since } }, select: { contributingFactors: true } }),
    prisma.correctiveAction.count({ where: { organizationId: v.organizationId, status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: startOfTodayUTC() } } }),
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
  if (!v.isSafetyTeam && !v.isSupervisor) return fail("Only the safety team or supervisors can draft talks.");
  const limited = await limit(v.userId);
  if (limited) return limited;
  if (!topic.trim()) return fail("Enter a topic first.");
  if (sourceMaterial.trim().length < 40) return fail("Paste your approved material, such as a procedure, a policy excerpt, or a past lesson. The outline is based only on this material.");
  return draftToolboxTalk({ topic: topic.trim(), sourceMaterial });
}

/** Draft closeout for the incident workspace. Built only from what responders recorded; the response lead edits and submits it. */
export async function aiDraftCloseout(reportId: string): Promise<SummaryDraft> {
  const { v, report, facts } = await factsFor(reportId);
  const incident = await prisma.incidentResponse.findUnique({ where: { reportId }, include: { responders: true } });
  if (!incident) return fail("This report has no incident response.");
  if (!canRunIncident(v, { ...report, incident })) return fail("Only the response lead or safety team can draft a closeout.");
  const limited = await limit(v.userId);
  if (limited) return limited;
  const [events, actions] = await Promise.all([
    // Restricted notes (medical or personal detail) are left out of the draft on purpose.
    prisma.reportEvent.findMany({ where: { reportId, restricted: false, type: { in: ["DECISION", "UPDATE"] } }, orderBy: { createdAt: "asc" } }),
    prisma.correctiveAction.findMany({ where: { reportId }, orderBy: { number: "asc" } }),
  ]);
  const line = (e: { createdAt: Date; message: string }) => `${e.createdAt.toISOString().slice(0, 16).replace("T", " ")} ${e.message}`;
  return draftCloseout({
    facts,
    incident: { openedAt: incident.openedAt, summary: incident.summary, decisions: events.filter((e) => e.type === "DECISION").map(line), updates: events.filter((e) => e.type === "UPDATE").map(line) },
    actions: actions.map((a) => ({ number: a.number, title: a.title, status: actionStatusInfo(a.status).label })),
    investigation: report.investigation && canSeeInvestigation(v, report.investigation) ? { status: report.investigation.status, contributingFactors: report.investigation.contributingFactors } : report.investigation ? { status: report.investigation.status, contributingFactors: [] } : null,
  });
}

/** A de-identified lesson draft. It uses only the topic, the investigator's selected factors and action titles, never the free-text report. */
export async function aiDraftLesson(reportId: string): Promise<SummaryDraft> {
  const { v, report } = await factsFor(reportId);
  if (!v.isSafetyTeam) return fail("Only the safety team can draft shared lessons.");
  const limited = await limit(v.userId);
  if (limited) return limited;
  const [actions, people] = await Promise.all([
    prisma.correctiveAction.findMany({ where: { reportId, status: { not: "CANCELLED" } }, orderBy: { number: "asc" }, select: { title: true } }),
    prisma.user.findMany({ where: { organizationId: v.organizationId }, select: { name: true } }),
  ]);
  const site = report.siteId ? await prisma.site.findUnique({ where: { id: report.siteId }, select: { kind: true } }) : null;
  return draftLesson({
    categoryLabel: categoryLabel(report.category, getPack()),
    siteKind: SITE_KINDS.find((k) => k.key === site?.kind)?.label.split(" /")[0] ?? "work site",
    factors: report.investigation?.contributingFactors ?? [],
    actionTitles: actions.map((a) => a.title),
    namesToScrub: people.map((p) => p.name),
  });
}
