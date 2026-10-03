import "server-only";
import { prisma } from "@/lib/prisma";
import { categoryLabel, getPack } from "./pack";
import { computeMetrics, readSavedTargets, readTargets, type Metrics, type Targets } from "./metrics";
import type { Viewer } from "./access";

const DAY = 86_400_000;
export const PERIODS = [30, 90, 365] as const;
export const readDays = (raw: string | undefined): number => (PERIODS.includes(Number(raw) as (typeof PERIODS)[number]) ? Number(raw) : 90);

export type InsightsData = { metrics: Metrics; targets: Targets; saved: Partial<Targets>; sites: { id: string; name: string; active: boolean }[] };

/**
 * Loads the rows for one site (or every site) and turns them into the numbers the Insights and site pages show.
 * Only counts and names the safety team may already see are returned; report text and statements never leave this module.
 */
export async function loadInsights(v: Viewer, opts: { siteId: string | null; days: number }): Promise<InsightsData> {
  const orgId = v.organizationId;
  const now = new Date();
  const since = new Date(now.getTime() - opts.days * DAY);
  const prevSince = new Date(since.getTime() - opts.days * DAY);
  const pack = getPack();

  const sites = await prisma.site.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, active: true, safetyLeadId: true }, orderBy: { name: "asc" } });
  // A site id that isn't this company's is treated as "all sites", never as someone else's data.
  const siteId = opts.siteId && sites.some((s) => s.id === opts.siteId) ? opts.siteId : null;
  const reportSite = siteId ? { siteId } : {};
  const open = ["PROPOSED", "APPROVED", "IN_PROGRESS", "COMPLETED"];

  const siteInspections = siteId ? await prisma.inspection.findMany({ where: { organizationId: orgId, siteId }, select: { id: true } }) : [];
  const actionScope = siteId ? { OR: [{ report: { siteId } }, { inspectionId: { in: siteInspections.map((i) => i.id) } }] } : {};

  const [org, employees, reports, actions, inspections, talks, certTypes, incidents, investigations] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { kpiTargets: true } }),
    prisma.employee.findMany({ where: { organizationId: orgId, ...(siteId ? { siteId } : {}) }, select: { id: true, siteId: true, departmentId: true, department: { select: { name: true } }, user: { select: { name: true } } } }),
    prisma.safetyReport.findMany({
      where: { organizationId: orgId, ...reportSite, OR: [{ createdAt: { gte: prevSince } }, { status: { not: "CLOSED" } }] },
      select: { id: true, type: true, category: true, severity: true, status: true, siteId: true, ownerId: true, createdAt: true, acknowledgedAt: true, respondBy: true },
    }),
    prisma.correctiveAction.findMany({
      where: { organizationId: orgId, AND: [actionScope, { OR: [{ createdAt: { gte: prevSince } }, { status: { in: open } }, { dueDate: { gte: since } }] }] },
      select: { id: true, status: true, priority: true, dueDate: true, completedAt: true, verifiedAt: true, createdAt: true, ownerId: true, inspectionId: true, report: { select: { siteId: true } } },
    }),
    prisma.inspection.findMany({
      where: { organizationId: orgId, ...(siteId ? { siteId } : {}), OR: [{ dueDate: { gte: prevSince } }, { status: "SCHEDULED" }] },
      select: { id: true, siteId: true, status: true, dueDate: true, completedAt: true, results: true },
    }),
    prisma.toolboxTalk.findMany({
      where: { organizationId: orgId, scheduledFor: { gte: since }, ...(siteId ? { OR: [{ siteId }, { siteId: null }] } : {}) },
      select: { id: true, title: true, siteId: true, scheduledFor: true, acknowledgements: { select: { employeeId: true } } },
    }),
    prisma.certificationType.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, requiredScope: true, requiredSiteIds: true, requiredCrewIds: true } }),
    prisma.incidentResponse.findMany({ where: { organizationId: orgId, ...(siteId ? { report: { siteId } } : {}), openedAt: { gte: since } }, select: { status: true, openedAt: true, resolvedAt: true, standDownReason: true, report: { select: { siteId: true } } } }),
    prisma.investigation.findMany({ where: { organizationId: orgId, ...(siteId ? { report: { siteId } } : {}), OR: [{ openedAt: { gte: since } }, { completedAt: { gte: since } }] }, select: { status: true, openedAt: true, completedAt: true, contributingFactors: true, report: { select: { siteId: true } } } }),
  ]);

  const certRecords = employees.length
    ? await prisma.qualification.findMany({ where: { organizationId: orgId, employeeId: { in: employees.map((e) => e.id) } }, select: { id: true, employeeId: true, typeId: true, name: true, expiresOn: true, issuedOn: true } })
    : [];

  // Actions from an inspection belong to that inspection's site; look those up so the per-site rows count them too.
  const inspectionIds = [...new Set(actions.map((a) => a.inspectionId).filter((x): x is string => Boolean(x)))];
  const inspSite = new Map(
    (inspectionIds.length ? await prisma.inspection.findMany({ where: { id: { in: inspectionIds } }, select: { id: true, siteId: true } }) : []).map((i) => [i.id, i.siteId]),
  );

  const metrics = computeMetrics({
    now, days: opts.days, siteId,
    sites,
    people: employees.map((e) => ({ id: e.id, name: e.user.name, siteId: e.siteId, departmentId: e.departmentId, crew: e.department?.name ?? null })),
    reports,
    actions: actions.map((a) => ({ id: a.id, status: a.status, priority: a.priority, dueDate: a.dueDate, completedAt: a.completedAt, verifiedAt: a.verifiedAt, createdAt: a.createdAt, ownerId: a.ownerId, siteId: a.report?.siteId ?? (a.inspectionId ? inspSite.get(a.inspectionId) ?? null : null) })),
    inspections: inspections.map((i) => ({ id: i.id, siteId: i.siteId, status: i.status, dueDate: i.dueDate, completedAt: i.completedAt, results: (Array.isArray(i.results) ? i.results : []) as { result: string; label: string }[] })),
    talks: talks.map((t) => ({ id: t.id, title: t.title, siteId: t.siteId, scheduledFor: t.scheduledFor, ackedBy: t.acknowledgements.map((a) => a.employeeId) })),
    certTypes, certRecords,
    incidents: incidents.map((i) => ({ siteId: i.report.siteId, status: i.status, openedAt: i.openedAt, resolvedAt: i.resolvedAt, standDownReason: i.standDownReason })),
    investigations: investigations.map((i) => ({ siteId: i.report.siteId, status: i.status, openedAt: i.openedAt, completedAt: i.completedAt, factors: i.contributingFactors })),
    targets: readTargets(org?.kpiTargets),
    categoryLabel: (key) => categoryLabel(key, pack),
  });

  return { metrics, targets: readTargets(org?.kpiTargets), saved: readSavedTargets(org?.kpiTargets), sites: sites.map((s) => ({ id: s.id, name: s.name, active: s.active })) };
}
