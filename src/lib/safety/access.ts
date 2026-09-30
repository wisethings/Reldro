import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth/session";

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
  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { siteId: true, isSafetyLead: true, isDepartmentAdmin: true },
      })
    : null;
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

type ReportLike = { reporterId: string | null; ownerId: string | null; siteId: string | null; privacy: string };

export function canSeeReport(v: Viewer, r: ReportLike): boolean {
  if (v.isSafetyTeam) return true;
  if (!v.employeeId) return false;
  if (r.reporterId === v.employeeId || r.ownerId === v.employeeId) return true;
  return v.isSupervisor && v.siteId !== null && r.siteId === v.siteId;
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
  return { ...base, OR: or };
}

/** Actions a viewer may list: everything for the safety team; otherwise ones they own or that belong to a report they can see. */
export function actionWhere(v: Viewer): Prisma.CorrectiveActionWhereInput {
  const base: Prisma.CorrectiveActionWhereInput = { organizationId: v.organizationId };
  if (v.isSafetyTeam) return base;
  if (!v.employeeId) return { ...base, id: "__none__" };
  const or: Prisma.CorrectiveActionWhereInput[] = [{ ownerId: v.employeeId }, { proposedById: v.employeeId }];
  if (v.isSupervisor && v.siteId) or.push({ report: { siteId: v.siteId } });
  return { ...base, OR: or };
}

export function canApproveOrVerifyAction(v: Viewer): boolean {
  return v.isSafetyTeam;
}
