import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { prisma } from "@/lib/prisma";
import { reportWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, reportTypeLabel, REPORT_STATUSES, SEVERITIES } from "@/lib/safety/pack";
import { DataRow, DataTable } from "@/components/safety/Table";
import { ReportFilters } from "@/components/safety/ReportFilters";
import { EmptyHero, fmtShort, PageHeader, ReportProgress, ReportStatusBadge, SeverityBadge } from "@/components/safety/ui";

const STATUS_GROUPS: Record<string, string[] | undefined> = { open: ["NEW", "ASSIGNED", "INVESTIGATING", "ACTIONS_OPEN"], closed: ["CLOSED"] };

import { PAGE_SIZE, Pagination, readPage } from "@/components/safety/Pagination";
import { REPORT_LIST_FIELDS } from "@/lib/safety/selects";
import { LIST_PAGE } from "@/components/ui/layout";
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; severity?: string; site?: string; q?: string; page?: string; attention?: string }> }) {
  const v = await requireViewer();
  const p = await searchParams;
  const pack = getPack();
  const status = p.status ?? "open";

  const nowD = new Date();
  const attention = p.attention === "overdue" || p.attention === "unowned" ? p.attention : "";
  // Every clause sits inside AND, so search and filters can only narrow what this person may see, never widen it.
  const where = {
    AND: [
      reportWhere(v),
      attention === "overdue"
        ? { status: { in: ["NEW", "ASSIGNED"] }, acknowledgedAt: null, respondBy: { lt: nowD } }
        : attention === "unowned"
          ? { ownerId: null, status: { not: "CLOSED" } }
          : status === "incidents"
            ? { incident: { status: { not: "RESOLVED" } } }
            : STATUS_GROUPS[status] ? { status: { in: STATUS_GROUPS[status]! } } : status !== "all" ? { status } : {},
      ...(p.severity ? [{ severity: p.severity }] : []),
      ...(p.site ? [{ siteId: p.site }] : []),
      ...(p.q ? [{ OR: [{ title: { contains: p.q, mode: "insensitive" as const } }, { description: { contains: p.q, mode: "insensitive" as const } }] }] : []),
    ],
  };
  const total = await prisma.safetyReport.count({ where });
  const page = Math.min(readPage(p.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const [reports, sites] = await Promise.all([
    prisma.safetyReport.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { ...REPORT_LIST_FIELDS, site: true, incident: { select: { status: true } } } }),
    v.isSafetyTeam ? prisma.site.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const owners = await prisma.employee.findMany({ where: { id: { in: reports.map((r) => r.ownerId).filter((x): x is string => Boolean(x)) } }, include: { user: { select: { name: true } } } });
  const ownerName = new Map(owners.map((o) => [o.id, o.user.name]));

  const qs = (over: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    // Changing a filter starts again at page 1; only page links pass `page`.
    const merged = { status, attention: attention || undefined, severity: p.severity, site: p.site, q: p.q, page: undefined, ...over };
    for (const [k, val] of Object.entries(merged)) if (val) sp.set(k, val);
    return `?${sp.toString()}`;
  };
  const staff = v.isSafetyTeam || v.isSupervisor;
  const title = v.isSafetyTeam ? "Reports" : v.isSupervisor ? "Reports" : "My reports";

  const scoped = reportWhere(v);
  const [sOpen, sLate, sNoOwner, sClosed] = await Promise.all([
    prisma.safetyReport.count({ where: { AND: [scoped, { status: { in: STATUS_GROUPS.open! } }] } }),
    prisma.safetyReport.count({ where: { AND: [scoped, { status: { in: ["NEW", "ASSIGNED"] }, acknowledgedAt: null, respondBy: { lt: nowD } }] } }),
    prisma.safetyReport.count({ where: { AND: [scoped, { ownerId: null, status: { not: "CLOSED" } }] } }),
    prisma.safetyReport.count({ where: { AND: [scoped, { status: "CLOSED", closedAt: { gte: new Date(Date.now() - 30 * 86400_000) } }] } }),
  ]);
  const filtered = Boolean(p.severity || p.site || p.q || attention);
  const metric = (label: string, value: number, href: string, on: boolean, hot = false) => (
    <QueryLink
      key={label}
      href={href}
      aria-current={on ? "true" : undefined}
      className={`flex flex-1 items-baseline gap-2 px-3.5 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${on ? "bg-orchid-soft/60" : "hover:bg-surface-hover"}`}
    >
      <span className={`text-lg font-semibold tabular-nums ${hot && value > 0 ? "text-danger" : "text-ink-900"}`}>{value}</span>
      <span className={`text-xs ${on ? "font-medium text-orchid-deep" : "text-ink-600"}`}>{label}</span>
    </QueryLink>
  );

  return (
    <div className={LIST_PAGE}>
      <PageHeader
        title={title}
        subtitle={v.isSafetyTeam ? "Hazards, near misses, injuries, and other safety concerns reported across your sites." : v.isSupervisor ? "Safety concerns reported at your site, and ones you submitted." : "Safety concerns you submitted, and what happened next."}
      />
      {staff && (
        <nav aria-label="Quick filters" className="grid grid-cols-2 divide-x divide-y divide-ink-100 overflow-hidden surface sm:flex sm:divide-y-0">
          {metric("Open", sOpen, qs({ status: "open", attention: undefined, severity: undefined, site: undefined, q: undefined }), status === "open" && !attention && !filtered)}
          {metric("Response overdue", sLate, qs({ status: "open", attention: "overdue" }), attention === "overdue", true)}
          {metric("Without an owner", sNoOwner, qs({ status: "open", attention: "unowned" }), attention === "unowned", true)}
          {metric("Closed in the last 30 days", sClosed, qs({ status: "closed", attention: undefined }), status === "closed" && !attention)}
        </nav>
      )}

      <ReportFilters
        statuses={[{ value: "open", label: "Open" }, { value: "incidents", label: "Incident responses" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }]}
        severities={SEVERITIES.map((s) => ({ value: s.key, label: s.label }))}
        sites={sites.map((s) => ({ value: s.id, label: s.name }))}
        showSeverity={staff}
      />

      {reports.length === 0 ? (
        filtered ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink-900">No reports match these filters</p>
            <p className="mt-1 text-sm text-ink-600">Try a different search, or clear the filters to see everything.</p>
          </div>
        ) : (
          <EmptyHero
            kind="reports"
            title={status === "open" ? "No open reports" : status === "incidents" ? "No open incident responses" : "No reports here yet"}
            body={staff ? "Reports will appear here when someone raises a safety concern." : "When you submit a report, you can follow it here."}
            steps={v.isSafetyTeam ? [
              { href: "/dashboard/reports/new", title: "Submit a test report", body: "Try the report form the way a worker would on a phone." },
              { href: "/dashboard/sites", title: "Add your sites", body: "Reports are assigned to a site's safety lead." },
              { href: "/dashboard/settings", title: "Set escalation rules", body: "Choose who is alerted when a report is not acknowledged in time." },
            ] : []}
          />
        )
      ) : (
        <DataTable
          columns={staff ? ["Report", "Seriousness", "Status", "Site", "Owner", "Occurred"] : ["Report", "Status", "Site", "Occurred"]}
          template={staff ? "minmax(0,1fr) 6.5rem 10.5rem 13rem 9rem 4.5rem" : "minmax(0,1fr) 11rem minmax(9rem,14rem) 5rem"}
        >
          {reports.map((r) => {
            const late = Boolean(r.respondBy && !r.acknowledgedAt && r.respondBy < nowD && r.status !== "CLOSED");
            const incident = Boolean(r.incident && r.incident.status !== "RESOLVED");
            const unowned = !r.ownerId && r.status !== "CLOSED";
            const tone = incident || late ? "urgent" : unowned ? "warn" : undefined;
            const flags = (
              <>
                {incident && <span className="shrink-0 font-semibold text-danger">Incident response</span>}
                {late && <span className="shrink-0 font-semibold text-danger">Response overdue</span>}
              </>
            );
            const sev = <SeverityBadge severity={r.severity} suggested={!r.severityConfirmedAt} compact />;
            const ownerCell = r.ownerId ? ownerName.get(r.ownerId) ?? "Assigned" : <span className={unowned ? "font-medium text-amber-deep" : "text-ink-500"}>No owner</span>;
            const cells = staff
              ? [sev, <ReportStatusBadge key="s" status={r.status} />, <span key="site" className="text-ink-600">{r.site?.name ?? "Site not given"}</span>, ownerCell, <span key="d" className="text-ink-600">{fmtShort(r.occurredAt)}</span>]
              : [<span key="s" className="block"><ReportStatusBadge status={r.status} /><ReportProgress status={r.status} /></span>, <span key="site" className="line-clamp-2 text-ink-700" title={r.site?.name}>{r.site?.name ?? "Site not given"}</span>, <span key="d" className="text-xs text-ink-500">{fmtShort(r.occurredAt)}</span>];
            return (
              <DataRow
                key={r.id}
                href={`/dashboard/reports/${r.id}`}
                tone={tone}
                template={staff ? "minmax(0,1fr) 6.5rem 10.5rem 13rem 9rem 4.5rem" : "minmax(0,1fr) 11rem minmax(9rem,14rem) 5rem"}
                main={
                  <>
                    <p title={r.title} className={`${staff ? "truncate" : "line-clamp-2"} text-sm font-semibold text-ink-900`}>{r.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                      <span className="shrink-0 tabular-nums text-ink-400">SR-{String(r.number).padStart(4, "0")}</span>
                      <span aria-hidden className="text-ink-300">·</span>
                      <span className="min-w-0 truncate">{reportTypeLabel(r.type)}<span className="hidden md:inline"> · {categoryLabel(r.category, pack)}</span></span>
                      <span className="hidden shrink-0 items-center gap-2 md:flex">{(incident || late) && <span aria-hidden className="text-ink-300">·</span>}{flags}</span>
                    </div>
                  </>
                }
                chips={
                  <>
                    {staff && sev}
                    <ReportStatusBadge status={r.status} />
                    {unowned && <span className="text-xs font-medium text-amber-deep">No owner</span>}
                    {incident && <span className="text-xs font-semibold text-danger">Incident response</span>}
                    {late && <span className="text-xs font-semibold text-danger">Response overdue</span>}
                    <span className="text-xs text-ink-500">{r.site?.name ?? "Site not given"} · {fmtShort(r.occurredAt)}</span>
                  </>
                }
                cells={cells}
              />
            );
          })}
        </DataTable>
      )}
      {staff && reports.some((r) => !r.severityConfirmedAt) && <p className="text-xs text-ink-500">A dashed outline means the seriousness is a suggestion that no responder has confirmed yet.</p>}
      <Pagination page={page} total={total} noun="reports" hrefFor={(n) => qs({ page: n > 1 ? String(n) : undefined })} />
    </div>
  );
}
