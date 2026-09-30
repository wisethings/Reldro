import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { reportWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, reportTypeLabel, REPORT_STATUSES, SEVERITIES } from "@/lib/safety/pack";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, fmtDate, PageHeader, ReportStatusBadge, SeverityBadge } from "@/components/safety/ui";

const STATUS_GROUPS: Record<string, string[] | undefined> = { open: ["NEW", "ASSIGNED", "INVESTIGATING", "ACTIONS_OPEN"], closed: ["CLOSED"] };

import { StatStrip } from "@/components/safety/Dashboard";
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; severity?: string; site?: string; q?: string }> }) {
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
  const [reports, sites] = await Promise.all([
    prisma.safetyReport.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { site: true, incident: { select: { status: true } } } }),
    v.isSafetyTeam ? prisma.site.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const owners = await prisma.employee.findMany({ where: { id: { in: reports.map((r) => r.ownerId).filter((x): x is string => Boolean(x)) } }, include: { user: { select: { name: true } } } });
  const ownerName = new Map(owners.map((o) => [o.id, o.user.name]));

  const qs = (over: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { status, severity: p.severity, site: p.site, q: p.q, ...over };
    for (const [k, val] of Object.entries(merged)) if (val) sp.set(k, val);
    return `?${sp.toString()}`;
  };
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`;
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
        <EmptyState
          title={status === "open" ? "No open reports" : status === "incidents" ? "No open incident responses" : "No reports match these filters"}
          body={v.isSafetyTeam || v.isSupervisor ? "Reports will appear here when someone raises a safety concern." : "When you submit a report, you can follow it here."}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-ink-200">
            {reports.map((r) => {
              const late = r.respondBy && !r.acknowledgedAt && r.respondBy < new Date() && r.status !== "CLOSED";
              return (
                <li key={r.id}>
                  <Link href={`/dashboard/reports/${r.id}`} className="block px-4 py-3 hover:bg-ink-50 sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-xs text-ink-400">SR-{String(r.number).padStart(4, "0")}</span>
                      {(v.isSafetyTeam || v.isSupervisor) && <SeverityBadge severity={r.severity} suggested={!r.severityConfirmedAt} />}
                      <ReportStatusBadge status={r.status} />
                      {r.incident && r.incident.status !== "RESOLVED" && <Badge tone="red">Incident response</Badge>}
                      {!r.ownerId && r.status !== "CLOSED" && <Badge tone="amber">No owner</Badge>}
                      {late && <Badge tone="red">Response overdue</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink-900">{r.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {reportTypeLabel(r.type)} · {categoryLabel(r.category, pack)} · {r.site?.name ?? "Site not given"} · {fmtDate(r.occurredAt)}
                      {r.ownerId && ownerName.get(r.ownerId) ? ` · Owner: ${ownerName.get(r.ownerId)}` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {reports.length === 100 && <p className="text-center text-xs text-ink-400">Showing the 100 most recent reports. Use the filters to narrow the list.</p>}
    </div>
  );
}
