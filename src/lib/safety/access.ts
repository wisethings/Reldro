import "server-only";
import type { Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/session";
import { loadAccount } from "@/lib/auth/account";

/**
 * Who can see and do what. One place, used by every page and action, so
 * privacy behavior is not re-derived screen by screen.
 *
 *  - Safety team = company admin or an employee flagged isSafetyLead.
 *    Sees every report, investigation, statement and action.
 *  - Supervisor = department (crew) lead. Sees reports and actions for their
 *    own site, plus anything assigned to or filed by them.
 *  - Worker = everyone else. Sees only their own reports and what is
 *    assigned to them, plus toolbox talks and shared lessons.
 */
export type Viewer = {
  userId: string;
  name: string;
  organizationId: string;
  employeeId: string | null;
  siteId: string | null;
  isAdmin: boolean;
  isSafetyLead: boolean;
  isSupervisor: boolean;
  isSafetyTeam: boolean;
};

export async function loadViewer(session: SessionPayload): Promise<Viewer> {
  // Read once per request and shared with the session check and the dashboard layout.
  const employee = session.employeeId ? await loadAccount(session.sub) : null;
  const isAdmin = session.role === "COMPANY_ADMIN";
  const isSafetyLead = Boolean(employee?.isSafetyLead);
  return {
    userId: session.sub,
    name: session.name,
    organizationId: session.organizationId!,
    employeeId: session.employeeId,
    siteId: employee?.siteId ?? null,
    isAdmin,
    isSafetyLead,
    isSupervisor: Boolean(employee?.isDepartmentAdmin),
    isSafetyTeam: isAdmin || isSafetyLead,
  };
}

/** The incident fields that affect who can see a report. Load `incident: { include: { responders: true } }` with the report. */
export type IncidentLike = { leadId: string | null; responders: { employeeId: string }[] } | null | undefined;

type ReportLike = { reporterId: string | null; ownerId: string | null; siteId: string | null; privacy: string; incident?: IncidentLike };

/** On the incident response team (lead or a named responder). */
export function isResponder(v: Viewer, r: ReportLike): boolean {
  if (!v.employeeId || !r.incident) return false;
  return r.incident.leadId === v.employeeId || r.incident.responders.some((x) => x.employeeId === v.employeeId);
}

export function canSeeReport(v: Viewer, r: ReportLike): boolean {
  if (v.isSafetyTeam) return true;
  if (!v.employeeId) return false;
  if (r.reporterId === v.employeeId || r.ownerId === v.employeeId) return true;
  if (isResponder(v, r)) return true;
  return v.isSupervisor && v.siteId !== null && r.siteId === v.siteId;
}

/** Edit the incident (summary, next action, people, status, closeout): the safety team or the response lead. */
export function canRunIncident(v: Viewer, r: ReportLike): boolean {
  return v.isSafetyTeam || (v.employeeId !== null && r.incident?.leadId === v.employeeId);
}

/** Post updates, decisions, notes and evidence in the incident workspace. */
export function canContributeToIncident(v: Viewer, r: ReportLike): boolean {
  return Boolean(r.incident) && (v.isSafetyTeam || isResponder(v, r) || canManageReport(v, r));
}

type EventLike = { restricted: boolean; type: string; toReporter: boolean; actorId: string | null };

/**
 * The timeline entries a viewer may read. Restricted notes are safety-team only. Someone who only
 * filed the report (not owner, supervisor or responder) sees the plain progress steps, messages
 * addressed to them, and their own replies, not internal working notes.
 */
export function visibleEvents<T extends EventLike>(v: Viewer, r: ReportLike, events: T[]): T[] {
  if (v.isSafetyTeam) return events;
  const open = events.filter((e) => !e.restricted);
  const reporterOnly =
    v.employeeId !== null && r.reporterId === v.employeeId && r.ownerId !== v.employeeId && !isResponder(v, r) && !(v.isSupervisor && v.siteId !== null && r.siteId === v.siteId);
  if (!reporterOnly) return open;
  return open.filter((e) => ["CREATED", "ACKNOWLEDGED", "STATUS", "REPORTER_REPLY"].includes(e.type) || e.toReporter || e.actorId === v.employeeId);
}

/** Who filed it. Confidential reports show the reporter only to the safety team (and to the reporter); anonymous reports store no reporter at all. */
export function canSeeReporter(v: Viewer, r: ReportLike): boolean {
  if (r.reporterId === null) return false;
  if (v.isSafetyTeam || r.reporterId === v.employeeId) return true;
  if (r.privacy === "CONFIDENTIAL") return false;
  return canSeeReport(v, r);
}

export function canManageReport(v: Viewer, r: ReportLike): boolean {
  return v.isSafetyTeam || (v.employeeId !== null && r.ownerId === v.employeeId);
}

/** Investigations (facts, statements, root-cause notes) are limited to the safety team and the named lead. */
export function canSeeInvestigation(v: Viewer, inv: { leadId: string | null }): boolean {
  return v.isSafetyTeam || (v.employeeId !== null && inv.leadId === v.employeeId);
}

/** Prisma filter for the reports a viewer may list. */
export function reportWhere(v: Viewer): Prisma.SafetyReportWhereInput {
  const base: Prisma.SafetyReportWhereInput = { organizationId: v.organizationId };
  if (v.isSafetyTeam) return base;
  if (!v.employeeId) return { ...base, id: "__none__" };
  const or: Prisma.SafetyReportWhereInput[] = [{ reporterId: v.employeeId }, { ownerId: v.employeeId }];
  if (v.isSupervisor && v.siteId) or.push({ siteId: v.siteId });
  or.push({ incident: { OR: [{ leadId: v.employeeId }, { responders: { some: { employeeId: v.employeeId } } }] } });
  return { ...base, OR: or };
}

/** Actions a viewer may list: everything for the safety team; otherwise ones they own or that belong to a report they can see. */
export function actionWhere(v: Viewer): Prisma.CorrectiveActionWhereInput {
  const base: Prisma.CorrectiveActionWhereInput = { organizationId: v.organizationId };
  if (v.isSafetyTeam) return base;
  if (!v.employeeId) return { ...base, id: "__none__" };
  const or: Prisma.CorrectiveActionWhereInput[] = [{ ownerId: v.employeeId }, { proposedById: v.employeeId }];
  if (v.isSupervisor && v.siteId) or.push({ report: { siteId: v.siteId } });
  or.push({ report: { incident: { OR: [{ leadId: v.employeeId }, { responders: { some: { employeeId: v.employeeId } } }] } } });
  return { ...base, OR: or };
}

export function canApproveOrVerifyAction(v: Viewer): boolean {
  return v.isSafetyTeam;
}
