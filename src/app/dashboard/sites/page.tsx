import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { getPack, OPEN_ACTION_STATUSES, SITE_KINDS } from "@/lib/safety/pack";
import { dueLabel, EmptyState, NoAccess } from "@/components/safety/ui";
import { paginate, Pagination } from "@/components/safety/Pagination";
import { SiteActiveToggle, SiteEditor } from "@/components/safety/SettingsForms";
import { startOfTodayUTC } from "@/lib/safety/dates";
import { LIST_PAGE } from "@/components/ui/layout";

export default async function SitesPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; page?: string }> }) {
  const { view: view0, q, page: pageParam } = await searchParams;
  const v = await requireViewer();
  if (!v.isSafetyTeam) return <NoAccess what="site management" />;
  const now = new Date();
  const [sites, people] = await Promise.all([
    prisma.site.findMany({ where: { organizationId: v.organizationId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  const [openReports, overdueActions, nextInsp, headcount] = await Promise.all([
    prisma.safetyReport.groupBy({ by: ["siteId"], where: { organizationId: v.organizationId, status: { not: "CLOSED" } }, _count: { _all: true } }),
    prisma.correctiveAction.findMany({ where: { organizationId: v.organizationId, status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: startOfTodayUTC() }, report: { isNot: null } }, select: { report: { select: { siteId: true } } } }),
    prisma.inspection.groupBy({ by: ["siteId"], where: { organizationId: v.organizationId, status: "SCHEDULED" }, _min: { dueDate: true } }),
    prisma.employee.groupBy({ by: ["siteId"], where: { organizationId: v.organizationId }, _count: { _all: true } }),
  ]);
  const openBySite = new Map(openReports.map((r) => [r.siteId, r._count._all]));
  const headBySite = new Map(headcount.map((r) => [r.siteId, r._count._all]));
  const overdueBySite = new Map<string | null, number>();
  for (const a of overdueActions) overdueBySite.set(a.report?.siteId ?? null, (overdueBySite.get(a.report?.siteId ?? null) ?? 0) + 1);
  const nextBySite = new Map<string, Date>();
  for (const i of nextInsp) if (i._min.dueDate) nextBySite.set(i.siteId, i._min.dueDate);
  const peopleOpts = people.map((p) => ({ id: p.id, name: p.user.name, hint: p.jobTitle }));
  const leadName = (id: string | null) => (id ? peopleOpts.find((p) => p.id === id)?.name ?? "Unknown" : null);
  const kinds = SITE_KINDS.map((k) => ({ key: k.key, label: k.label }));

  type Health = "attention" | "track" | "nolead" | "archived";
  const rows = sites.map((s) => {
    const next = nextBySite.get(s.id);
    const nd = next ? dueLabel(next, true) : null;
    const open = openBySite.get(s.id) ?? 0;
    const overdue = overdueBySite.get(s.id) ?? 0;
    const inspectionLate = Boolean(nd?.overdue);
    const health: Health = !s.active ? "archived" : overdue > 0 || inspectionLate ? "attention" : !s.safetyLeadId ? "nolead" : "track";
    return { s, nd, open, overdue, inspectionLate, health, lead: leadName(s.safetyLeadId), people: headBySite.get(s.id) ?? 0 };
  });
  const active = rows.filter((r) => r.health !== "archived");
  const totals = { sites: active.length, open: active.reduce((n, r) => n + r.open, 0), overdue: active.reduce((n, r) => n + r.overdue, 0) };
  const needsAttention = active.filter((r) => r.health === "attention").length;

  const view = view0 === "attention" || view0 === "track" ? view0 : "all";
  const term = (q ?? "").trim().toLowerCase();
  const shown = rows.filter((r) => (view === "all" ? true : view === "attention" ? r.health === "attention" : r.health === "track" || r.health === "nolead") && (!term || `${r.s.name} ${r.s.address}`.toLowerCase().includes(term)));
  const { rows: pageSites, page } = paginate(shown, pageParam, 12);
  const siteHref = (n: number) => { const sp = new URLSearchParams(); if (view !== "all") sp.set("view", view); if (q) sp.set("q", q); if (n > 1) sp.set("page", String(n)); return `?${sp.toString()}`; };
  const showTools = sites.length > 3;
  const chip = (on: boolean) => `rounded-md px-3 py-1 text-xs font-medium transition-colors ${on ? "bg-white text-ink-900 shadow-[0_0_0_1px_rgba(42,10,12,0.08)]" : "text-ink-600 hover:text-ink-900"}`;
  const HEALTH = {
    attention: { label: "Needs attention", edge: "bg-danger", text: "text-danger", dot: "bg-danger" },
    nolead: { label: "No safety lead", edge: "bg-gold-deep/70", text: "text-gold-deep", dot: "bg-gold-deep" },
    track: { label: "On track", edge: "bg-sage-deep/60", text: "text-sage-deep", dot: "bg-sage-deep" },
    archived: { label: "Archived", edge: "bg-ink-200", text: "text-ink-500", dot: "bg-ink-300" },
  } as const;

  return (
    <div className={LIST_PAGE}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Sites</h1>
          <p className="mt-0.5 text-sm text-ink-500">Manage the jobsites, shops, and yards where your crews work. Reports, inspections, and corrective actions are organized by site.</p>
          {sites.length > 0 && (
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-medium text-ink-900">{totals.sites} {totals.sites === 1 ? "site" : "sites"}</span>
              <span aria-hidden className="mx-2 text-ink-300">·</span>{totals.open} open {totals.open === 1 ? "report" : "reports"}
              <span aria-hidden className="mx-2 text-ink-300">·</span>
              <span className={totals.overdue > 0 ? "font-medium text-danger" : ""}>{totals.overdue} overdue {totals.overdue === 1 ? "action" : "actions"}</span>
            </p>
          )}
        </div>
        <SiteEditor people={peopleOpts} trigger="Add a site" siteExample={getPack().siteExample} kinds={kinds} />
      </div>

      {showTools && (
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filter sites" className="flex rounded-lg bg-ink-100 p-0.5 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:whitespace-nowrap">
            <QueryLink href="?" className={chip(view === "all")}>All</QueryLink>
            <QueryLink href="?view=attention" className={chip(view === "attention")}>Needs attention{needsAttention > 0 ? ` (${needsAttention})` : ""}</QueryLink>
            <QueryLink href="?view=track" className={chip(view === "track")}>On track</QueryLink>
          </div>
          <form className="relative min-w-[10rem] flex-1 sm:max-w-xs" role="search">
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            <label className="sr-only" htmlFor="site-search">Search sites</label>
            <input id="site-search" name="q" defaultValue={q ?? ""} type="search" placeholder="Search sites" className="h-8 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-xs outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
          </form>
        </div>
      )}

      {sites.length === 0 ? (
        <EmptyState title="No sites yet" body="Add the jobsites and shops your crews work at. Reports are assigned to a site's safety lead, and inspections are scheduled by site." />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 bg-white px-6 py-10 text-center text-sm text-ink-600">No sites match. <QueryLink href="?" className="font-medium text-orchid-deep hover:text-oxblood">Show all sites</QueryLink></p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pageSites.map(({ s, nd, open, overdue, health, lead, people: headcountHere }) => {
            const h = HEALTH[health];
            const reportsHref = `/dashboard/reports?status=open&site=${s.id}`;
            return (
              <article key={s.id} className={`group relative overflow-hidden surface transition-shadow hover:border-ink-300 hover:shadow-[0_1px_2px_rgba(42,10,12,0.05),0_4px_14px_-6px_rgba(42,10,12,0.08)] ${s.active ? "" : "opacity-70"}`}>
                <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${h.edge}`} />
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-ink-900">
                      <Link href={reportsHref} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-500">{s.name}</Link>
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-ink-500">{SITE_KINDS.find((k) => k.key === s.kind)?.label}{s.address ? ` · ${s.address}` : ""}</p>
                  </div>

                  <div>
                    <p className={`flex items-center gap-1.5 text-sm font-medium ${h.text}`}><span aria-hidden className={`h-2 w-2 rounded-full ${h.dot}`} />{h.label}{health === "attention" && !s.safetyLeadId && <span className="font-normal text-ink-600"> · no safety lead</span>}</p>
                    <p className="mt-1 text-sm text-ink-700">
                      <Link href={reportsHref} className="relative z-10 hover:underline">{open} open {open === 1 ? "report" : "reports"}</Link>
                      <span aria-hidden className="mx-1.5 text-ink-300">·</span>
                      <span className={overdue > 0 ? "font-medium text-danger" : "text-ink-500"}>{overdue === 0 ? "no overdue actions" : `${overdue} overdue corrective ${overdue === 1 ? "action" : "actions"}`}</span>
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 border-t border-ink-100 pt-3 text-sm">
                    <span className="text-ink-500">Next inspection</span>
                    <span className={nd?.overdue ? "font-medium text-danger" : nd ? "text-ink-800" : "text-ink-500"}>{nd ? nd.text : "None scheduled"}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <p className="min-w-0 truncate text-xs text-ink-500">
                      {lead ? <><span className="text-ink-700">{lead}</span> · safety lead</> : <span className="text-gold-deep">No safety lead assigned</span>} · {headcountHere} {headcountHere === 1 ? "person" : "people"}
                    </p>
                    <span aria-hidden className="text-xs font-medium text-orchid-deep group-hover:text-oxblood">View site →</span>
                  </div>
                </div>
                <div className="card-footer relative z-10 flex items-center gap-1 px-3 py-2.5 text-xs sm:px-4">
                  <SiteEditor site={{ id: s.id, name: s.name, address: s.address, kind: s.kind, safetyLeadId: s.safetyLeadId }} people={peopleOpts} trigger="Edit" siteExample={getPack().siteExample} kinds={kinds} />
                  <SiteActiveToggle siteId={s.id} active={s.active} />
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Pagination page={page} total={shown.length} pageSize={12} noun="sites" hrefFor={siteHref} />
    </div>
  );
}
