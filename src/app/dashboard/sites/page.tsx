import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { OPEN_ACTION_STATUSES, SITE_KINDS } from "@/lib/safety/pack";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { dueLabel, EmptyState, NoAccess, PageHeader } from "@/components/safety/ui";
import { SiteActiveToggle, SiteEditor } from "@/components/safety/SettingsForms";

export default async function SitesPage() {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return <NoAccess what="site management" />;
  const now = new Date();
  const [sites, people] = await Promise.all([
    prisma.site.findMany({ where: { organizationId: v.organizationId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  const [openReports, overdueActions, nextInsp, headcount] = await Promise.all([
    prisma.safetyReport.groupBy({ by: ["siteId"], where: { organizationId: v.organizationId, status: { not: "CLOSED" } }, _count: { _all: true } }),
    prisma.correctiveAction.findMany({ where: { organizationId: v.organizationId, status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: now }, report: { isNot: null } }, select: { report: { select: { siteId: true } } } }),
    prisma.inspection.findMany({ where: { organizationId: v.organizationId, status: "SCHEDULED" }, orderBy: { dueDate: "asc" }, select: { siteId: true, dueDate: true } }),
    prisma.employee.groupBy({ by: ["siteId"], where: { organizationId: v.organizationId }, _count: { _all: true } }),
  ]);
  const openBySite = new Map(openReports.map((r) => [r.siteId, r._count._all]));
  const headBySite = new Map(headcount.map((r) => [r.siteId, r._count._all]));
  const overdueBySite = new Map<string | null, number>();
  for (const a of overdueActions) overdueBySite.set(a.report?.siteId ?? null, (overdueBySite.get(a.report?.siteId ?? null) ?? 0) + 1);
  const nextBySite = new Map<string, Date>();
  for (const i of nextInsp) if (!nextBySite.has(i.siteId)) nextBySite.set(i.siteId, i.dueDate);
  const peopleOpts = people.map((p) => ({ id: p.id, name: p.user.name }));
  const leadName = (id: string | null) => (id ? peopleOpts.find((p) => p.id === id)?.name ?? "—" : "None yet");

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Sites" subtitle="Jobsites, shops and yards. Reports, inspections and actions are organized by site." actions={<SiteEditor people={peopleOpts} trigger="Add a site" />} />
      {sites.length === 0 ? (
        <EmptyState title="No sites yet" body="Add the jobsites and shops your crews work at. Reports get routed to a site's safety lead, and inspections are scheduled per site." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sites.map((s) => {
            const next = nextBySite.get(s.id);
            const nd = next ? dueLabel(next, true) : null;
            return (
              <Card key={s.id} className={s.active ? "" : "opacity-60"}>
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-900">{s.name}</p><p className="text-xs text-ink-500">{SITE_KINDS.find((k) => k.key === s.kind)?.label}{s.address ? ` · ${s.address}` : ""}</p></div>
                    {!s.active && <Badge>Archived</Badge>}
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-ink-500">Safety lead</dt><dd className="text-sm text-ink-800">{leadName(s.safetyLeadId)}</dd></div>
                    <div><dt className="text-ink-500">People based here</dt><dd className="text-sm text-ink-800">{headBySite.get(s.id) ?? 0}</dd></div>
                    <div><dt className="text-ink-500">Open reports</dt><dd className="text-sm text-ink-800">{openBySite.get(s.id) ?? 0}</dd></div>
                    <div><dt className="text-ink-500">Overdue actions</dt><dd className={`text-sm ${(overdueBySite.get(s.id) ?? 0) > 0 ? "font-medium text-danger" : "text-ink-800"}`}>{overdueBySite.get(s.id) ?? 0}</dd></div>
                    <div className="col-span-2"><dt className="text-ink-500">Next inspection</dt><dd className={`text-sm ${nd?.overdue ? "font-medium text-danger" : "text-ink-800"}`}>{nd ? nd.text : "None scheduled"}</dd></div>
                  </dl>
                  <div className="flex gap-4 border-t border-ink-100 pt-3"><SiteEditor site={{ id: s.id, name: s.name, address: s.address, kind: s.kind, safetyLeadId: s.safetyLeadId }} people={peopleOpts} trigger="Edit" /><SiteActiveToggle siteId={s.id} active={s.active} /></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
