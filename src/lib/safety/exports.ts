import "server-only";
import { prisma } from "@/lib/prisma";
import { categoryLabel, getPack, reportTypeLabel, severityInfo } from "./pack";
import { isOverdue } from "./dates";
import { requirementsFor, STATE_LABEL } from "./certifications";
import { doneBy } from "./metrics";
import { datasetSpec } from "./exportSpec";
import type { Viewer } from "./access";

const DAY = 86_400_000;
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const stamp = (d: Date | null | undefined) => (d ? d.toISOString().replace("T", " ").slice(0, 16) : "");

export type Table = { rows: Record<string, string | number>[]; fileLabel: string };

/**
 * Rows for one export dataset, scoped to one site or all sites. Reporter names are deliberately never included, so
 * confidential and anonymous reports stay that way; titles and descriptions are exported as written.
 */
export async function buildDataset(v: Viewer, dataset: string, opts: { siteId: string | null; days: number }): Promise<Table | null> {
  const spec = datasetSpec(dataset);
  if (!spec) return null;
  const orgId = v.organizationId;
  const now = new Date();
  const since = new Date(now.getTime() - opts.days * DAY);
  const [sites, people] = await Promise.all([
    prisma.site.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { organizationId: orgId }, select: { id: true, siteId: true, departmentId: true, department: { select: { name: true } }, user: { select: { name: true } } } }),
  ]);
  const siteId = opts.siteId && sites.some((s) => s.id === opts.siteId) ? opts.siteId : null;
  const siteName = (id: string | null) => sites.find((s) => s.id === id)?.name ?? "";
  const who = new Map(people.map((p) => [p.id, p.user.name]));
  const scopedPeople = siteId ? people.filter((p) => p.siteId === siteId) : people;
  const pack = getPack();
  const fileLabel = `${spec.key}${siteId ? `-${siteName(siteId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : ""}`;

  if (dataset === "reports") {
    const rows = await prisma.safetyReport.findMany({
      where: { organizationId: orgId, createdAt: { gte: since }, ...(siteId ? { siteId } : {}) },
      select: { number: true, createdAt: true, occurredAt: true, type: true, category: true, severity: true, severityConfirmedAt: true, status: true, siteId: true, locationNote: true, injuryInvolved: true, ownerId: true, respondBy: true, acknowledgedAt: true, closedAt: true, title: true, description: true, incident: { select: { status: true } } },
      orderBy: { number: "asc" },
    });
    return {
      fileLabel,
      rows: rows.map((r) => ({
        reference: `SR-${String(r.number).padStart(4, "0")}`, reported: stamp(r.createdAt), occurred: stamp(r.occurredAt), kind: reportTypeLabel(r.type), topic: categoryLabel(r.category, pack),
        seriousness: severityInfo(r.severity).label, confirmed: r.severityConfirmedAt ? "Yes" : "No (suggested)", status: r.status, incident: r.incident?.status ?? "", site: siteName(r.siteId),
        location: r.locationNote, injury: r.injuryInvolved ? "Yes" : "No", owner: r.ownerId ? who.get(r.ownerId) ?? "" : "", responseDue: stamp(r.respondBy),
        hoursToAck: r.acknowledgedAt ? Math.round(((r.acknowledgedAt.getTime() - r.createdAt.getTime()) / 3_600_000) * 10) / 10 : "", closed: stamp(r.closedAt), title: r.title, description: r.description,
      })),
    };
  }

  if (dataset === "actions") {
    const siteInspections = siteId ? await prisma.inspection.findMany({ where: { organizationId: orgId, siteId }, select: { id: true } }) : [];
    const scope = siteId ? { OR: [{ report: { siteId } }, { inspectionId: { in: siteInspections.map((i) => i.id) } }] } : {};
    const rows = await prisma.correctiveAction.findMany({
      where: { organizationId: orgId, AND: [scope, { OR: [{ createdAt: { gte: since } }, { dueDate: { gte: since } }, { status: { in: ["PROPOSED", "APPROVED", "IN_PROGRESS", "COMPLETED"] } }] }] },
      select: { number: true, title: true, priority: true, status: true, ownerId: true, dueDate: true, inspectionId: true, createdAt: true, completedAt: true, verifiedAt: true, report: { select: { number: true, siteId: true } } },
      orderBy: { number: "asc" },
    });
    const inspIds = [...new Set(rows.map((r) => r.inspectionId).filter((x): x is string => Boolean(x)))];
    const inspSite = new Map((inspIds.length ? await prisma.inspection.findMany({ where: { id: { in: inspIds } }, select: { id: true, siteId: true } }) : []).map((i) => [i.id, i.siteId]));
    return {
      fileLabel,
      rows: rows.map((r) => {
        const open = ["PROPOSED", "APPROVED", "IN_PROGRESS", "COMPLETED"].includes(r.status);
        return {
          reference: `A-${r.number}`, title: r.title, priority: severityInfo(r.priority).label, status: r.status, owner: r.ownerId ? who.get(r.ownerId) ?? "" : "", due: day(r.dueDate), overdue: open && isOverdue(r.dueDate, now) ? "Yes" : "No",
          site: siteName(r.report?.siteId ?? (r.inspectionId ? inspSite.get(r.inspectionId) ?? null : null)), from: r.report ? `SR-${String(r.report.number).padStart(4, "0")}` : r.inspectionId ? "Inspection" : "",
          created: day(r.createdAt), completed: day(r.completedAt), verified: day(r.verifiedAt), daysToVerify: r.verifiedAt ? Math.round((r.verifiedAt.getTime() - r.createdAt.getTime()) / DAY) : "",
        };
      }),
    };
  }

  if (dataset === "inspections") {
    const rows = await prisma.inspection.findMany({
      where: { organizationId: orgId, ...(siteId ? { siteId } : {}), OR: [{ dueDate: { gte: since } }, { status: "SCHEDULED" }] },
      select: { siteId: true, dueDate: true, status: true, completedAt: true, assigneeId: true, results: true, template: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    });
    return {
      fileLabel,
      rows: rows.map((i) => {
        const results = (Array.isArray(i.results) ? i.results : []) as { result: string; label: string }[];
        const checked = results.filter((r) => r.result !== "NA");
        const failed = checked.filter((r) => r.result === "FAIL");
        const onTime = i.status === "COMPLETED" && i.completedAt ? (doneBy(i.completedAt, i.dueDate) ? "Yes" : "No") : "";
        return { checklist: i.template.name, site: siteName(i.siteId), due: day(i.dueDate), status: i.status === "COMPLETED" ? "Completed" : isOverdue(i.dueDate, now) ? "Overdue" : "Scheduled", onTime, completed: stamp(i.completedAt), assignee: i.assigneeId ? who.get(i.assigneeId) ?? "" : "", checked: i.status === "COMPLETED" ? checked.length : "", failed: i.status === "COMPLETED" ? failed.length : "", failedItems: failed.map((f) => f.label).join("; ") };
      }),
    };
  }

  if (dataset === "talks") {
    const talks = await prisma.toolboxTalk.findMany({
      where: { organizationId: orgId, scheduledFor: { gte: since, lte: now }, ...(siteId ? { OR: [{ siteId }, { siteId: null }] } : {}) },
      select: { title: true, siteId: true, scheduledFor: true, acknowledgements: { select: { employeeId: true, acknowledgedAt: true } } },
      orderBy: { scheduledFor: "desc" },
    });
    const rows: Record<string, string | number>[] = [];
    for (const t of talks) {
      const group = (t.siteId ? people.filter((p) => p.siteId === t.siteId) : scopedPeople);
      const acks = new Map(t.acknowledgements.map((a) => [a.employeeId, a.acknowledgedAt]));
      for (const p of group) rows.push({ talk: t.title, scheduled: day(t.scheduledFor), person: p.user.name, site: siteName(p.siteId), crew: p.department?.name ?? "", acknowledged: acks.has(p.id) ? "Yes" : "No", acknowledgedAt: stamp(acks.get(p.id)) });
    }
    return { fileLabel, rows };
  }

  if (dataset === "certifications") {
    const [types, records] = await Promise.all([
      prisma.certificationType.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, requiredScope: true, requiredSiteIds: true, requiredCrewIds: true } }),
      prisma.qualification.findMany({ where: { organizationId: orgId, employeeId: { in: scopedPeople.map((p) => p.id) } }, select: { id: true, employeeId: true, typeId: true, name: true, expiresOn: true, issuedOn: true, certificateNumber: true, verifiedAt: true } }),
    ]);
    const extra = new Map(records.map((r) => [r.id, r]));
    const typeName = new Map(types.map((t) => [t.id, t.name]));
    const personOf = new Map(people.map((p) => [p.id, p]));
    const reqs = requirementsFor(types, scopedPeople, records, now);
    return {
      fileLabel,
      rows: reqs.map((r) => {
        const p = personOf.get(r.employeeId)!;
        const rec = r.record ? extra.get(r.record.id) : null;
        return { person: p.user.name, site: siteName(p.siteId), crew: p.department?.name ?? "", certification: typeName.get(r.typeId) ?? "", state: STATE_LABEL[r.state], issued: day(rec?.issuedOn), expires: day(rec?.expiresOn), certificateNumber: rec?.certificateNumber ?? "", verified: rec?.verifiedAt ? "Yes" : r.record ? "No" : "" };
      }).sort((a, b) => String(a.person).localeCompare(String(b.person)) || String(a.certification).localeCompare(String(b.certification))),
    };
  }
  return null;
}
