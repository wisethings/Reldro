import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { reportWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, reportTypeLabel, REPORT_STATUSES, SEVERITIES } from "@/lib/safety/pack";
import { DataRow, DataTable } from "@/components/safety/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyHero, fmtShort, PageHeader, ReportStatusBadge, SeverityBadge } from "@/components/safety/ui";

const STATUS_GROUPS: Record<string, string[] | undefined> = { open: ["NEW", "ASSIGNED", "INVESTIGATING", "ACTIONS_OPEN"], closed: ["CLOSED"] };

import { StatStrip } from "@/components/safety/Dashboard";
import { PAGE_SIZE, Pagination, readPage } from "@/components/safety/Pagination";
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; severity?: string; site?: string; q?: string; page?: string }> }) {
  const v = await requireViewer();
  const p = await searchParams;
  const pack = getPack();
  const status = p.status ?? "open";

  const where = {
    ...reportWhere(v),
    ...(status === "incidents"
      ? { incident: { status: { not: "RESOLVED" } } }
      : STATUS_GROUPS[status] ? { status: { in: STATUS_GROUPS[status]! } } : status !== "all" ? { status } : {}),
    ...(p.severity ? { severity: p.severity } : {}),
    ...(p.site ? { siteId: p.site } : {}),
    ...(p.q ? { OR: [{ title: { contains: p.q, mode: "insensitive" as const } }, { description: { contains: p.q, mode: "insensitive" as const } }] } : {}),
  };
  const total = await prisma.safetyReport.count({ where });
  const page = Math.min(readPage(p.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const [reports, sites] = await Promise.all([
    prisma.safetyReport.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { site: true, incident: { select: { status: true } } } }),
    v.isSafetyTeam ? prisma.site.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const owners = await prisma.employee.findMany({ where: { id: { in: reports.map((r) => r.ownerId).filter((x): x is string => Boolean(x)) } }, include: { user: { select: { name: true } } } });
  const ownerName = new Map(owners.map((o) => [o.id, o.user.name]));

  const qs = (over: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    // Changing a filter starts again at page 1; only page links pass `page`.
    const merged = { status, severity: p.severity, site: p.site, q: p.q, page: undefined, ...over };
    for (const [k, val] of Object.entries(merged)) if (val) sp.set(k, val);
    return `?${sp.toString()}`;
  };
  const chip = (active: boolean) => `rounded-full border px-2.5 py-1 text-xs font-medium ${active ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`;
  const staff = v.isSafetyTeam || v.isSupervisor;
  const title = v.isSafetyTeam ? "Reports" : v.isSupervisor ? "Reports" : "My reports";

  const nowD = new Date();
  const scoped = reportWhere(v);
  const [sOpen, sLate, sNoOwner, sClosed] = await Promise.all([
    prisma.safetyReport.count({ where: { AND: [scoped, { status: { in: STATUS_GROUPS.open! } }] } }),
    prisma.safetyReport.count({ where: { AND: [scoped, { status: { in: ["NEW", "ASSIGNED"] }, acknowledgedAt: null, respondBy: { lt: nowD } }] } }),
    prisma.safetyReport.count({ where: { AND: [scoped, { ownerId: null, status: { not: "CLOSED" } }] } }),
    prisma.safetyReport.count({ where: { AND: [scoped, { status: "CLOSED", closedAt: { gte: new Date(Date.now() - 30 * 86400_000) } }] } }),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title={title}
        subtitle={v.isSafetyTeam ? "Hazards, near misses, injuries, and other safety concerns reported across your sites." : v.isSupervisor ? "Safety concerns reported at your site, and ones you submitted." : "Safety concerns you submitted, and what happened next."}
      />
      {(v.isSafetyTeam || v.isSupervisor) && (
        <StatStrip items={[
          { label: "Open reports", value: sOpen, href: qs({ status: "open" }) },
          { label: "Response overdue", value: sLate, href: qs({ status: "open" }), alert: sLate > 0 },
          { label: "Without an owner", value: sNoOwner, href: qs({ status: "open" }), alert: sNoOwner > 0 },
          { label: "Closed in the last 30 days", value: sClosed, href: qs({ status: "closed" }) },
        ]} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href={qs({ status: "open" })} className={chip(status === "open")}>Open</Link>
        <Link href={qs({ status: "incidents" })} className={chip(status === "incidents")}>Incident responses</Link>
        <Link href={qs({ status: "closed" })} className={chip(status === "closed")}>Closed</Link>
        <Link href={qs({ status: "all" })} className={chip(status === "all")}>All</Link>
        <span className="mx-1 h-4 w-px bg-ink-200" />
        {(v.isSafetyTeam || v.isSupervisor) && SEVERITIES.map((s) => (
          <Link key={s.key} href={qs({ severity: p.severity === s.key ? undefined : s.key })} className={chip(p.severity === s.key)}>{s.label}</Link>
        ))}
        {v.isSafetyTeam && sites.length > 0 && (
          <form className="ml-auto">
            <input type="hidden" name="status" value={status} />
            <select name="site" defaultValue={p.site ?? ""} className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs" aria-label="Filter by site">
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="ml-2 rounded-lg border border-ink-200 px-3 py-1.5 text-xs">Apply</button>
          </form>
        )}
      </div>

      {reports.length === 0 ? (
        <EmptyHero
          kind="reports"
          title={status === "open" ? "No open reports" : status === "incidents" ? "No open incident responses" : "No reports match these filters"}
          body={v.isSafetyTeam || v.isSupervisor ? "Reports will appear here when someone raises a safety concern." : "When you submit a report, you can follow it here."}
          steps={v.isSafetyTeam ? [
            { href: "/dashboard/reports/new", title: "Submit a test report", body: "Try the report form the way a worker would on a phone." },
            { href: "/dashboard/sites", title: "Add your sites", body: "Reports are assigned to a site's safety lead." },
            { href: "/dashboard/settings", title: "Set escalation rules", body: "Choose who is alerted when a report is not acknowledged in time." },
          ] : []}
        />
      ) : (
        <DataTable
          columns={staff ? ["Report", "Seriousness", "Status", "Site", "Owner", "Occurred"] : ["Report", "Status", "Site", "Occurred"]}
          template={staff ? "minmax(0,1fr) 9rem 9.5rem 10rem 7rem 3.5rem" : "minmax(0,1fr) 9.5rem 11rem 4.5rem"}
        >
          {reports.map((r) => {
            const late = r.respondBy && !r.acknowledgedAt && r.respondBy < new Date() && r.status !== "CLOSED";
            const flags = (
              <>
                {r.incident && r.incident.status !== "RESOLVED" && <Badge tone="red">Incident response</Badge>}
                {late && <Badge tone="red">Response overdue</Badge>}
              </>
            );
            // On wide screens the Owner column already says "No owner", so this chip is for the stacked phone row only.
            const noOwner = !r.ownerId && r.status !== "CLOSED" && <Badge tone="gold">No owner</Badge>;
            const sev = <SeverityBadge severity={r.severity} suggested={!r.severityConfirmedAt} />;
            const cells = staff
              ? [sev, <ReportStatusBadge key="s" status={r.status} />, r.site?.name ?? "Site not given", (r.ownerId && ownerName.get(r.ownerId)) || "No owner", fmtShort(r.occurredAt)]
              : [<ReportStatusBadge key="s" status={r.status} />, r.site?.name ?? "Site not given", fmtShort(r.occurredAt)];
            return (
              <DataRow
                key={r.id}
                href={`/dashboard/reports/${r.id}`}
                template={staff ? "minmax(0,1fr) 9rem 9.5rem 10rem 7rem 3.5rem" : "minmax(0,1fr) 9.5rem 11rem 4.5rem"}
                main={
                  <>
                    <p title={r.title} className="truncate text-[13px] font-medium text-ink-900">{r.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                      <span className="shrink-0 font-mono">SR-{String(r.number).padStart(4, "0")}</span>
                      <span className="min-w-0 truncate">{reportTypeLabel(r.type)}<span className="hidden md:inline"> · {categoryLabel(r.category, pack)}</span></span>
                      <span className="hidden shrink-0 items-center gap-1.5 md:flex">{flags}</span>
                    </div>
                  </>
                }
                chips={
                  <>
                    {staff && sev}
                    <ReportStatusBadge status={r.status} />
                    {noOwner}
                    {flags}
                    <span className="text-xs text-ink-500">{r.site?.name ?? "Site not given"} · {fmtShort(r.occurredAt)}</span>
                  </>
                }
                cells={cells}
              />
            );
          })}
        </DataTable>
      )}
      <Pagination page={page} total={total} noun="reports" hrefFor={(n) => qs({ page: n > 1 ? String(n) : undefined })} />
    </div>
  );
}
