import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, OPEN_ACTION_STATUSES, reportTypeLabel } from "@/lib/safety/pack";
import { NoAccess } from "@/components/safety/ui";
import { ThemesSummaryDraft } from "@/components/safety/AiDraftButtons";
import { isOverdue } from "@/lib/safety/dates";
import { REPORT_LIST_FIELDS } from "@/lib/safety/selects";

function Bars({ rows, empty = "Nothing to show yet." }: { rows: { label: string; count: number; href?: string }[]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-1">
      {rows.map((r, i) => {
        const inner = (
          <>
            <span title={r.label} className={`min-w-0 text-sm leading-snug ${i === 0 ? "font-medium text-ink-900" : "text-ink-700"} line-clamp-2 break-words`}>{r.label}</span>
            <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-ink-100"><span className={`block h-full rounded-full ${i === 0 ? "bg-orchid-deep" : "bg-orchid-deep/55"}`} style={{ width: `${(r.count / max) * 100}%` }} /></span>
            <span className={`text-right text-sm tabular-nums ${i === 0 ? "font-semibold text-ink-900" : "text-ink-600"}`}>{r.count}</span>
          </>
        );
        const cls = "grid grid-cols-[minmax(0,1fr)_5.5rem_1.75rem] items-center gap-3 rounded-md px-1 py-1.5 sm:grid-cols-[minmax(0,1fr)_8rem_2rem]";
        return <li key={r.label}>{r.href ? <Link href={r.href} className={`${cls} hover:bg-surface-hover`}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
      })}
    </ul>
  );
}

function Block({ title, note, children, className = "" }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`surface p-5 ${className}`}>
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      {note && <p className="mt-0.5 text-xs leading-snug text-ink-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Figure({ label, value, tone, note }: { label: string; value: string | number; tone?: "bad"; note?: string }) {
  return (
    <div>
      <dd className={`text-2xl font-semibold tabular-nums ${tone === "bad" ? "text-danger" : "text-ink-900"}`}>{value}</dd>
      <dt className="text-xs text-ink-600">{label}</dt>
      {note && <p className="text-xs text-ink-400">{note}</p>}
    </div>
  );
}

const tally = (keys: string[]) => {
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
};

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return <NoAccess what="cross-site insights" />;
  const { days: d } = await searchParams;
  const days = [30, 90, 365].includes(Number(d)) ? Number(d) : 90;
  const since = new Date(Date.now() - days * 86400_000);
  const pack = getPack();
  const now = new Date();

  const [reports, investigations, actions, lessons, incidents] = await Promise.all([
    prisma.safetyReport.findMany({ where: { organizationId: v.organizationId, createdAt: { gte: since } }, select: { ...REPORT_LIST_FIELDS, site: true } }),
    prisma.investigation.findMany({ where: { organizationId: v.organizationId, openedAt: { gte: since } }, select: { contributingFactors: true } }),
    prisma.correctiveAction.findMany({ where: { organizationId: v.organizationId, createdAt: { gte: since } } }),
    prisma.investigation.findMany({ where: { organizationId: v.organizationId, shareLesson: true }, include: { report: { select: { category: true } } }, orderBy: { completedAt: "desc" }, take: 10 }),
    prisma.incidentResponse.findMany({ where: { organizationId: v.organizationId, openedAt: { gte: since } }, select: { status: true, openedAt: true, resolvedAt: true, standDownReason: true } }),
  ]);

  const byCategory = tally(reports.map((r) => categoryLabel(r.category, pack)));
  const siteIds = new Map(reports.filter((r) => r.site).map((r) => [r.site!.name, r.site!.id]));
  const bySite = tally(reports.map((r) => r.site?.name ?? "No site")).map((r) => ({ ...r, href: siteIds.get(r.label) ? `/dashboard/reports?status=all&site=${siteIds.get(r.label)}` : undefined }));
  const byType = tally(reports.map((r) => reportTypeLabel(r.type)));
  const factors = tally(investigations.flatMap((i) => i.contributingFactors));
  const pairs = new Map<string, { label: string; count: number }>();
  for (const r of reports) {
    if (!r.site) continue;
    const k = `${r.category}|${r.siteId}`;
    const cur = pairs.get(k) ?? { label: `${categoryLabel(r.category, pack)} at ${r.site.name}`, count: 0 };
    cur.count++;
    pairs.set(k, cur);
  }
  const repeats = [...pairs.values()].filter((p) => p.count >= 2).sort((a, b) => b.count - a.count).slice(0, 6);
  const open = actions.filter((a) => OPEN_ACTION_STATUSES.includes(a.status));
  const overdue = open.filter((a) => isOverdue(a.dueDate));
  const verified = actions.filter((a) => a.status === "VERIFIED" && a.verifiedAt);
  const avgDaysToVerify = verified.length ? Math.round(verified.reduce((s, a) => s + (a.verifiedAt!.getTime() - a.createdAt.getTime()) / 86400_000, 0) / verified.length) : null;
  const ackHours = reports.filter((r) => r.acknowledgedAt).map((r) => (r.acknowledgedAt!.getTime() - r.createdAt.getTime()) / 3600_000).sort((a, b) => a - b);
  const medianAck = ackHours.length ? ackHours[Math.floor(ackHours.length / 2)] : null;
  const incidentsResolved = incidents.filter((i) => i.status === "RESOLVED" && !i.standDownReason);
  const incidentsStoodDown = incidents.filter((i) => i.standDownReason).length;
  const incidentsOpen = incidents.filter((i) => i.status !== "RESOLVED").length;
  const seg = (active: boolean) => `rounded-md px-3 py-1 text-xs font-medium transition-colors ${active ? "bg-white text-ink-900 shadow-[0_0_0_1px_rgba(42,10,12,0.08)]" : "text-ink-600 hover:text-ink-900"}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Insights</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-ink-500">Review reporting and follow-up patterns across sites, teams, and topics. Report counts alone do not show how safe a site is.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Time period" className="flex rounded-lg bg-ink-100 p-0.5">
            {[30, 90, 365].map((n) => <QueryLink key={n} href={`?days=${n}`} className={seg(days === n)} aria-pressed={days === n}>{n === 365 ? "Last year" : `${n} days`}</QueryLink>)}
          </div>
          <Link href={`/api/safety/export/reports?days=${days}`} className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-surface-hover">Export reports (CSV)</Link>
        </div>
      </div>

      <section aria-label="Key figures" className="surface p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <Figure label="Reports" value={reports.length} />
          <Figure label="Median hours to acknowledge" value={medianAck === null ? "—" : medianAck < 10 ? medianAck.toFixed(1) : Math.round(medianAck)} />
          <Figure label="Incident responses" value={incidents.length} note={incidentsOpen ? `${incidentsOpen} still open` : undefined} />
          <Figure label="Corrective actions open" value={open.length} />
          <Figure label="Overdue" value={overdue.length} tone={overdue.length ? "bad" : undefined} />
          <Figure label="Avg days to verify" value={avgDaysToVerify ?? "—"} />
        </dl>
        <p className="mt-4 text-xs leading-snug text-ink-500">
          {incidentsResolved.length} incident {incidentsResolved.length === 1 ? "response" : "responses"} resolved with a closeout{incidentsStoodDown ? `, ${incidentsStoodDown} stood down as not needing one` : ""}. Acknowledgement time uses reports that have been acknowledged. Corrective action figures count actions created in this period; verified means someone confirmed the fix is in place.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Repeated hazards" note="Same topic at the same site, two or more times. The strongest signal on this page.">
          <Bars rows={repeats} empty="No repeats in this period." />
        </Block>
        <Block title="Reports by site" note="Select a site to open its reports.">
          <Bars rows={bySite.slice(0, 8)} />
        </Block>
        <Block title="Reports by topic"><Bars rows={byCategory.slice(0, 8)} /></Block>
        <Block title="Reports by kind" note="Reporting near misses and hazards early gives a chance to fix a problem before someone is hurt. The mix shows what people chose to report, not everything that happened.">
          <Bars rows={byType} />
        </Block>
        <Block title="Contributing factors in investigations" className="lg:col-span-2">
          <Bars rows={factors.slice(0, 8)} empty="No investigations with selected factors yet." />
        </Block>
      </div>

      <details className="group surface text-sm text-ink-700">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
          How to read this page
          <span aria-hidden className="text-ink-400 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <ul className="list-disc space-y-1 px-5 pb-4 pl-10 text-sm">
          <li>Reporting patterns can reflect both workplace conditions and how comfortable people feel reporting concerns.</li>
          <li>Fewer reports do not mean fewer hazards, and more reports do not mean more hazards.</li>
          <li>With small numbers, two similar reports can look like a pattern by chance. Read the reports before acting.</li>
          <li>Anonymous and confidential reports are counted here but are never tied to a person.</li>
          <li>Nothing on this page shows that a site or process is safe or meets any regulation.</li>
        </ul>
      </details>

      <section className="surface p-5">
        <h2 className="text-sm font-semibold text-ink-900">Summary of reported themes</h2>
        <p className="mt-0.5 text-xs text-ink-500">A draft based on the reports in this period. Check it against the source reports before sharing.</p>
        <div className="mt-3"><ThemesSummaryDraft days={days} /></div>
      </section>

      <Block title="Shared lessons" note="Lessons approved for sharing with your team. Check that personal details have been removed before publishing.">
        {lessons.length === 0 ? <p className="text-sm text-ink-500">No lessons have been shared yet. Complete an investigation, then write a lesson without names or personal details.</p> : (
          <ul className="divide-y divide-ink-100">{lessons.map((l) => <li key={l.id} className="py-2.5 text-sm text-ink-800"><span className="mr-2 rounded bg-surface-muted px-1.5 py-0.5 text-xs text-ink-600">{categoryLabel(l.report.category, pack)}</span>{l.lessonText}</li>)}</ul>
        )}
      </Block>
    </div>
  );
}
