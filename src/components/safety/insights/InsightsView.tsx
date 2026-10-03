import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { ThemesSummaryDraft } from "@/components/safety/AiDraftButtons";
import { severityInfo, reportTypeLabel } from "@/lib/safety/pack";
import type { InsightsData } from "@/lib/safety/insightsData";
import { Bars, Block, Delta, Figure, Figures, GapList, KpiGrid, SiteTable, TrendChart } from "./parts";
import { ExportPanel, TargetsForm } from "./controls";
import { ListToolbar } from "@/components/safety/ListToolbar";
import { Pagination, paginate } from "@/components/safety/Pagination";

export const TABS = [
  { key: "overview", label: "Overview" },
  { key: "sites", label: "Sites" },
  { key: "reports", label: "Reports" },
  { key: "actions", label: "Corrective actions" },
  { key: "inspections", label: "Inspections and training" },
  { key: "certifications", label: "Certifications" },
  { key: "setup", label: "Targets and export" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];
export const readTab = (raw: string | undefined): TabKey => (TABS.find((t) => t.key === raw)?.key ?? "overview");

const OVERVIEW_SITES = 5;
const periodLabel = (days: number) => (days === 365 ? "over the last year" : `over the last ${days} days`);
const stateLabel = { expired: "Expired", missing: "Missing", expiring: "Expires soon" } as const;
const stateTone = { expired: "text-danger", missing: "text-danger", expiring: "text-amber-deep" } as const;

/** The Sites tab compares sites with each other, so a single site's own page has no use for it. */
export function InsightsTabs({ tab, hrefFor, withSites = true }: { tab: TabKey; hrefFor: (tab: TabKey) => string; withSites?: boolean }) {
  return (
    <nav aria-label="Insights sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="seg-group w-max max-w-none">
        {TABS.filter((t) => withSites || t.key !== "sites").map((t) => (
          <QueryLink key={t.key} scroll={false} href={hrefFor(t.key)} aria-current={tab === t.key ? "page" : undefined} className={`seg whitespace-nowrap ${tab === t.key ? "seg-on" : "seg-off"}`}>{t.label}</QueryLink>
        ))}
      </div>
    </nav>
  );
}

/**
 * One body of numbers for the company-wide Insights page and for each site's own page. With a site chosen, every figure is
 * limited to that site; without one, it also shows the sites side by side.
 */
export type SitesView = { q: string; sort: string; page: string | undefined };
const SITE_SORTS = [
  { value: "", label: "Worst first" },
  { value: "name", label: "Name" },
  { value: "reports", label: "Most reports" },
];

export function InsightsView({ data, tab: requested, days, isAdmin, lessons = [], sitesView = { q: "", sort: "", page: undefined } }: { data: InsightsData; tab: TabKey; days: number; isAdmin: boolean; lessons?: { id: string; topic: string; text: string }[]; sitesView?: SitesView }) {
  const { metrics: m, targets } = data;
  const siteId = m.scope.siteId;
  const tab: TabKey = requested === "sites" && siteId ? "overview" : requested;
  const where = periodLabel(days);
  const reportsHref = (extra = "") => `/dashboard/reports?status=all${siteId ? `&site=${siteId}` : ""}${extra}`;

  if (tab === "overview") {
    return (
      <div className="space-y-4">
        <KpiGrid kpis={m.kpis} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title="Close these first" note="What is overdue, unowned, or about to lapse right now, worst first.">
            <GapList gaps={m.gaps} empty={siteId ? "Nothing needs attention at this site right now." : "Nothing needs attention right now."} />
          </Block>
          <Block title="Reports over time" note={`${m.reports.total} ${m.reports.total === 1 ? "report" : "reports"} ${where}. ${m.reports.prevTotal > 0 || m.reports.total > 0 ? "" : ""}`}>
            <TrendChart points={m.reports.trend} periodLabel={where} siteId={siteId} />
            <p className="mt-2 text-xs"><Delta now={m.reports.total} before={m.reports.prevTotal} days={days} goodWhenDown={false} /></p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4">
              <Figure label="Open now" value={m.reports.openNow} note={m.reports.aging.old ? `${m.reports.aging.old} over 30 days` : undefined} />
              <Figure label="Incident responses" value={m.reports.incidents.total} note={m.reports.incidents.open ? `${m.reports.incidents.open} still open` : undefined} />
              <Figure label="Investigations" value={m.investigations.opened} note={`${m.investigations.completed} completed`} />
            </dl>
          </Block>
        </div>
        {!siteId && m.sites.length > 0 && (
          <Block title="Sites compared" note={m.sites.length > OVERVIEW_SITES ? `The ${OVERVIEW_SITES} sites that need the most attention, of ${m.sites.length}.` : "Worst first. Select a site to open its own page with the same numbers, limited to that site."}>
            <SiteTable rows={m.sites.slice(0, OVERVIEW_SITES)} days={days} />
            {m.sites.length > OVERVIEW_SITES && (
              <p className="mt-3 border-t border-ink-100 pt-3 text-sm"><QueryLink scroll={false} href={`/dashboard/insights?tab=sites${days !== 90 ? `&days=${days}` : ""}`} className="font-medium text-orchid-deep hover:text-oxblood">Compare all {m.sites.length} sites →</QueryLink></p>
            )}
          </Block>
        )}
        <p className="text-xs text-ink-500">
          Targets are your own and do not show that a site is safe or meets any regulation.{" "}
          <QueryLink scroll={false} href={`${siteId ? `/dashboard/sites/${siteId}` : "/dashboard/insights"}?tab=setup${days !== 90 ? `&days=${days}` : ""}`} className="font-medium text-orchid-deep hover:text-oxblood">Change targets, export data, and how to read these numbers →</QueryLink>
        </p>
      </div>
    );
  }

  if (tab === "sites") {
    const q = sitesView.q.trim().toLowerCase();
    const sort = SITE_SORTS.some((o) => o.value === sitesView.sort) ? sitesView.sort : "";
    let rows = q ? m.sites.filter((r) => r.name.toLowerCase().includes(q)) : [...m.sites];
    if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "reports") rows.sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name));
    const { rows: pageRows, page } = paginate(rows, sitesView.page);
    const hrefFor = (n: number) => {
      const sp = new URLSearchParams({ tab: "sites" });
      if (days !== 90) sp.set("days", String(days));
      if (sitesView.q.trim()) sp.set("q", sitesView.q.trim());
      if (sort) sp.set("sort", sort);
      if (n > 1) sp.set("page", String(n));
      return `/dashboard/insights?${sp.toString()}`;
    };
    return (
      <div className="space-y-4">
        <ListToolbar searchParam="q" placeholder="Search sites" selects={[]} sort={{ param: "sort", label: "Sort sites", options: SITE_SORTS, }} pageParam="page" />
        <Block title="Sites compared" note={`${m.sites.length} active ${m.sites.length === 1 ? "site" : "sites"}. Select a site to open its own page with the same numbers, limited to that site.`}>
          <SiteTable rows={pageRows} days={days} empty={q ? "No site matches that search." : undefined} />
        </Block>
        <Pagination page={page} total={rows.length} hrefFor={hrefFor} noun="sites" />
      </div>
    );
  }

  if (tab === "setup") {
    return (
      <div className="space-y-4">
        {isAdmin && (
          <Block title="Your targets" note="These are the bars your own numbers are judged against, for every site. Change them to match your company's standards. Nothing here is a regulatory limit.">
            <TargetsForm saved={data.saved} />
          </Block>
        )}
        <Block title="Export data" note="Download the rows behind these numbers as a spreadsheet.">
          <ExportPanel siteId={siteId} siteName={m.scope.siteName} days={days} />
        </Block>
        <Block title="How to read these numbers">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
            <li>Reporting patterns reflect both workplace conditions and how comfortable people feel reporting. Fewer reports do not mean fewer hazards, and more reports do not mean more hazards.</li>
            <li>With small numbers, two similar reports can look like a pattern by chance. Read the reports before acting.</li>
            <li>Anonymous and confidential reports are counted here but are never tied to a person.</li>
            <li>Targets are your own. Meeting them does not show that a site is safe or meets any regulation.</li>
          </ul>
        </Block>
      </div>
    );
  }

  if (tab === "reports") {
    const r = m.reports;
    return (
      <div className="space-y-4">
        <Figures label="Reporting figures">
          <Figure label="Reports" value={r.total} note={<Delta now={r.total} before={r.prevTotal} days={days} goodWhenDown={false} />} />
          <Figure label="Open now" value={r.openNow} note={r.aging.old ? `${r.aging.old} open over 30 days` : undefined} />
          <Figure label="No owner" value={r.unownedOpen} tone={r.unownedOpen ? "bad" : undefined} />
          <Figure label="Past response deadline" value={r.responseOverdueNow} tone={r.responseOverdueNow ? "bad" : undefined} />
          <Figure label="Median hours to acknowledge" value={r.medianAckHours === null ? "—" : r.medianAckHours} />
          <Figure label="Incident responses" value={r.incidents.total} note={r.incidents.open ? `${r.incidents.open} still open` : r.incidents.avgDaysToResolve !== null ? `${r.incidents.avgDaysToResolve} days to resolve` : undefined} />
        </Figures>
        <Block title="Reports over time" note={`${r.total} ${r.total === 1 ? "report" : "reports"} ${where}.`}>
          <TrendChart points={r.trend} periodLabel={where} siteId={siteId} />
        </Block>
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title="Repeated hazards" note="Same topic at the same site, two or more times. The strongest signal on this page.">
            <Bars rows={r.repeats} empty="No repeats in this period." />
          </Block>
          {!siteId ? (
            <Block title="Reports by site" note="Select a site to open its own page.">
              <Bars rows={r.bySite.slice(0, 8).map((s) => ({ label: s.label, count: s.count, href: s.siteId ? `/dashboard/sites/${s.siteId}?days=${days}&tab=reports` : undefined }))} />
            </Block>
          ) : (
            <Block title="Open reports by age" note="How long open reports have been waiting.">
              <Bars rows={[{ label: "Under 7 days", count: r.aging.fresh }, { label: "7 to 30 days", count: r.aging.mid }, { label: "Over 30 days", count: r.aging.old }]} />
            </Block>
          )}
          <Block title="Reports by topic"><Bars rows={r.byCategory.slice(0, 8)} /></Block>
          <Block title="Reports by seriousness" note="As suggested or confirmed. The safety team confirms seriousness."><Bars rows={r.bySeverity.map((s) => ({ label: severityInfo(s.label).label, count: s.count }))} /></Block>
          <Block title="Reports by kind" note="Near misses and hazards reported early give a chance to fix a problem before someone is hurt. The mix shows what people chose to report, not everything that happened.">
            <Bars rows={r.byType.map((t) => ({ label: reportTypeLabel(t.label), count: t.count }))} />
          </Block>
          <Block title="Contributing factors in investigations" note={`${m.investigations.opened} opened, ${m.investigations.completed} completed${m.investigations.avgDaysToComplete !== null ? `, ${m.investigations.avgDaysToComplete} days on average to complete` : ""}.`}>
            <Bars rows={m.investigations.factors.slice(0, 8)} empty="No investigations with selected factors yet." />
          </Block>
        </div>
        <Block title="Summary of reported themes" note="A draft based on the reports in this period. Check it against the source reports before sharing.">
          <ThemesSummaryDraft days={days} siteId={siteId} />
        </Block>
        <Block title="Shared lessons" note="Lessons approved for sharing with your team. Check that personal details have been removed before publishing.">
          {lessons.length === 0 ? <p className="text-sm text-ink-500">No lessons have been shared yet. Complete an investigation, then write a lesson without names or personal details.</p> : (
            <ul className="divide-y divide-ink-100">{lessons.map((l) => <li key={l.id} className="py-2.5 text-sm text-ink-800"><span className="mr-2 rounded bg-surface-muted px-1.5 py-0.5 text-xs text-ink-600">{l.topic}</span>{l.text}</li>)}</ul>
          )}
        </Block>
        <p className="text-xs text-ink-500"><Link href={reportsHref()} className="font-medium text-orchid-deep hover:text-oxblood">Open the reports list{siteId ? ` for ${m.scope.siteName}` : ""} →</Link></p>
      </div>
    );
  }

  if (tab === "actions") {
    const a = m.actions;
    return (
      <div className="space-y-4">
        <Figures label="Corrective action figures">
          <Figure label="Open now" value={a.openNow} />
          <Figure label="Overdue" value={a.overdueNow} tone={a.overdueNow ? "bad" : "good"} />
          <Figure label="Done, waiting to be verified" value={a.readyToVerify} />
          <Figure label="Finished by their due date" value={a.onTimePct === null ? "—" : `${a.onTimePct}%`} note={a.dueInPeriod ? `${a.onTime} of ${a.dueInPeriod} due ${where}` : undefined} />
          <Figure label="Average days to verify" value={a.avgDaysToVerify ?? "—"} />
          <Figure label="Target for overdue" value={`${targets.overdueActions} or fewer`} />
        </Figures>
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title="Open actions by priority"><Bars rows={a.byPriority.map((p) => ({ label: severityInfo(p.label).label, count: p.count }))} empty="No open corrective actions." /></Block>
          <Block title="Overdue actions by owner" note="Who is holding the most overdue work. Offer help before pressure."><Bars rows={a.overdueByOwner} empty="Nothing is overdue." /></Block>
        </div>
        <p className="text-xs text-ink-500"><Link href="/dashboard/actions" className="font-medium text-orchid-deep hover:text-oxblood">Open the corrective actions list →</Link></p>
      </div>
    );
  }

  if (tab === "inspections") {
    const i = m.inspections, t = m.talks;
    return (
      <div className="space-y-4">
        <Figures label="Inspection and training figures">
          <Figure label="Inspections due" value={i.dueInPeriod} note={where} />
          <Figure label="Done by their due date" value={i.onTimePct === null ? "—" : `${i.onTimePct}%`} note={i.dueInPeriod ? `${i.onTime} of ${i.dueInPeriod}` : undefined} />
          <Figure label="Overdue now" value={i.overdueNow} tone={i.overdueNow ? "bad" : "good"} />
          <Figure label="Checklist items passed" value={i.passPct === null ? "—" : `${i.passPct}%`} note={i.itemsChecked ? `${i.itemsFailed} failed of ${i.itemsChecked}` : undefined} />
          <Figure label="Toolbox talks" value={t.count} note={where} />
          <Figure label="Talks acknowledged" value={t.ackPct === null ? "—" : `${t.ackPct}%`} note={t.eligible ? `${t.acked} of ${t.eligible}` : undefined} />
        </Figures>
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title="Checklist items that fail most" note="Failed items can become corrective actions."><Bars rows={i.topFailed} empty="No failed items in this period." /></Block>
          <Block title="Talks with the lowest acknowledgement" note="Share these first.">
            {t.lowest.length === 0 ? <p className="text-sm text-ink-500">No toolbox talks in this period.</p> : (
              <ul className="divide-y divide-ink-100">
                {t.lowest.map((x) => (
                  <li key={x.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-ink-800">{x.title}</span>
                    <span className={`shrink-0 tabular-nums ${x.pct < targets.talkAckPct ? "font-medium text-danger" : "text-ink-700"}`}>{x.pct}% <span className="text-xs text-ink-500">({x.acked} of {x.eligible})</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
        <p className="text-xs text-ink-500">
          <Link href="/dashboard/inspections" className="font-medium text-orchid-deep hover:text-oxblood">Inspections →</Link>
          <span aria-hidden className="mx-2 text-ink-300">·</span>
          <Link href="/dashboard/training" className="font-medium text-orchid-deep hover:text-oxblood">Toolbox talks →</Link>
        </p>
      </div>
    );
  }

  const c = m.certs;
  const cv = c.coverage;
  return (
    <div className="space-y-4">
      <Figures label="Certification figures">
        <Figure label="Required certifications held" value={cv.pct === null ? "—" : `${cv.pct}%`} note={cv.required ? `${cv.compliant} of ${cv.required}` : "None required yet"} tone={cv.pct !== null && cv.pct < targets.certPct ? "bad" : undefined} />
        <Figure label="Missing" value={cv.missing} tone={cv.missing ? "bad" : undefined} />
        <Figure label="Expired" value={cv.expired} tone={cv.expired ? "bad" : undefined} />
        <Figure label="Expiring in 30 days" value={cv.expiring} />
        <Figure label="People counted" value={c.people} note={siteId ? "At this site" : "Across all sites"} />
        <Figure label="Target" value={`${targets.certPct}%`} />
      </Figures>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="By certification" note="Lowest coverage first. The number is the people still missing or expired.">
          <Bars rows={c.byType.map((t) => ({ label: `${t.name}${t.pct !== null ? ` · ${t.pct}%` : ""}`, count: t.gaps }))} empty="No certifications are required yet. Set requirements on the Certifications page." />
        </Block>
        {!siteId ? (
          <Block title="By site" note="Share of required certifications held and in date.">
            <Bars unit="%" rows={m.sites.filter((s) => s.certPct !== null).sort((a, b) => (a.certPct ?? 0) - (b.certPct ?? 0)).map((s) => ({ label: s.name, count: s.certPct ?? 0, href: `/dashboard/sites/${s.id}?days=${days}&tab=certifications` }))} empty="No site has required certifications yet." />
          </Block>
        ) : (
          <Block title="What to do" note="Each expired or missing certification is a person who may not be allowed to do the work.">
            <p className="text-sm text-ink-700">Add or renew records on the <Link href={`/dashboard/training?tab=qualifications&cview=compliance&gsite=${siteId}`} className="font-medium text-orchid-deep hover:text-oxblood">compliance page</Link>.</p>
          </Block>
        )}
      </div>
      <Block title="People to follow up" note={c.problems.length === 40 ? "The first 40, expired and missing first. Export the full list below." : "Expired and missing first."}>
        {c.problems.length === 0 ? <p className="text-sm text-sage-deep">Everyone who needs a certification has a current one.</p> : (
          <ul className="divide-y divide-ink-100">
            {c.problems.map((p, idx) => (
              <li key={idx} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm">
                <span className="min-w-0"><span className="font-medium text-ink-900">{p.person}</span><span className="text-ink-500"> · {p.cert}{!siteId && p.site ? ` · ${p.site}` : ""}</span></span>
                <span className={`shrink-0 text-xs font-medium ${stateTone[p.state]}`}>{stateLabel[p.state]}{p.expiresOn ? ` ${p.expiresOn.toISOString().slice(0, 10)}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}
