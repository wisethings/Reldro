import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, OPEN_ACTION_STATUSES, reportTypeLabel } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { NoAccess, PageHeader } from "@/components/safety/ui";
import { ThemesSummaryDraft } from "@/components/safety/AiDraftButtons";

function Bars({ rows, empty = "Nothing to show yet." }: { rows: { label: string; count: number }[]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,12rem),1fr,2rem] items-center gap-3 text-sm">
          <span className="truncate text-ink-700">{r.label}</span>
          <span className="h-2 rounded-full bg-surface-sunken"><span className="block h-2 rounded-full bg-orchid-deep" style={{ width: `${(r.count / max) * 100}%` }} /></span>
          <span className="text-right tabular-nums text-ink-600">{r.count}</span>
        </li>
      ))}
    </ul>
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
    prisma.safetyReport.findMany({ where: { organizationId: v.organizationId, createdAt: { gte: since } }, include: { site: true } }),
    prisma.investigation.findMany({ where: { organizationId: v.organizationId, openedAt: { gte: since } }, select: { contributingFactors: true } }),
    prisma.correctiveAction.findMany({ where: { organizationId: v.organizationId, createdAt: { gte: since } } }),
    prisma.investigation.findMany({ where: { organizationId: v.organizationId, shareLesson: true }, include: { report: { select: { category: true } } }, orderBy: { completedAt: "desc" }, take: 10 }),
    prisma.incidentResponse.findMany({ where: { organizationId: v.organizationId, openedAt: { gte: since } }, select: { status: true, openedAt: true, resolvedAt: true, standDownReason: true } }),
  ]);

  const byCategory = tally(reports.map((r) => categoryLabel(r.category, pack)));
  const bySite = tally(reports.map((r) => r.site?.name ?? "No site"));
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
  const overdue = open.filter((a) => a.dueDate && a.dueDate < now);
  const verified = actions.filter((a) => a.status === "VERIFIED" && a.verifiedAt);
  const avgDaysToVerify = verified.length ? Math.round(verified.reduce((s, a) => s + (a.verifiedAt!.getTime() - a.createdAt.getTime()) / 86400_000, 0) / verified.length) : null;
  const ackHours = reports.filter((r) => r.acknowledgedAt).map((r) => (r.acknowledgedAt!.getTime() - r.createdAt.getTime()) / 3600_000).sort((a, b) => a - b);
  const medianAck = ackHours.length ? ackHours[Math.floor(ackHours.length / 2)] : null;
  const incidentsResolved = incidents.filter((i) => i.status === "RESOLVED" && !i.standDownReason);
  const incidentsStoodDown = incidents.filter((i) => i.standDownReason).length;
  const incidentsOpen = incidents.filter((i) => i.status !== "RESOLVED").length;
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Insights"
        subtitle="Patterns across sites, teams and topics. These are counts of what was reported, not a measure of how safe any site is."
        actions={<Link href={`/api/safety/export/reports?days=${days}`} className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">Export reports (CSV)</Link>}
      />
      <div className="flex gap-2">
        {[30, 90, 365].map((n) => <Link key={n} href={`?days=${n}`} className={chip(days === n)}>Last {n === 365 ? "year" : `${n} days`}</Link>)}
      </div>

      <details className="rounded-xl border border-ink-200 bg-white p-4 text-sm text-ink-700">
        <summary className="cursor-pointer font-medium text-ink-900">How to read this page</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>These are counts of what people reported. More reports can mean more people feel able to speak up, not that a site got less safe.</li>
          <li>A site with few reports isn't necessarily safe; it may be quiet, small or under-reporting.</li>
          <li>With small numbers, two similar reports can look like a pattern by chance. Check the reports before acting.</li>
          <li>Anonymous and confidential reports are included in the counts but never tied to a person here.</li>
          <li>Nothing on this page certifies that a site or process is safe or compliant with any regulation.</li>
        </ul>
      </details>

      <Card>
        <CardHeader title="Recurring themes" subtitle="A short written summary of the numbers below. A draft to check against them." />
        <CardBody><ThemesSummaryDraft days={days} /></CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card><CardHeader title="Repeated hazards" subtitle="Same topic at the same site, two or more times" /><CardBody><Bars rows={repeats} empty="No repeats in this period." /></CardBody></Card>
        <Card><CardHeader title="Reports by topic" /><CardBody><Bars rows={byCategory.slice(0, 8)} /></CardBody></Card>
        <Card><CardHeader title="Reports by site" /><CardBody><Bars rows={bySite.slice(0, 8)} /></CardBody></Card>
        <Card><CardHeader title="Reports by kind" subtitle="Near misses and hazards reported early give a chance to fix things before someone is hurt. The mix shows what people chose to report, not everything that happened." /><CardBody><Bars rows={byType} /></CardBody></Card>
        <Card><CardHeader title="Contributing factors in investigations" /><CardBody><Bars rows={factors.slice(0, 8)} empty="No investigations with selected factors yet." /></CardBody></Card>
        <Card>
          <CardHeader title="Response" subtitle="How the team is handling what comes in" />
          <CardBody>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div><dt className="text-xs text-ink-500">Median hours to acknowledge</dt><dd className="text-2xl font-medium tabular-nums text-ink-900">{medianAck === null ? "—" : medianAck < 10 ? medianAck.toFixed(1) : Math.round(medianAck)}</dd></div>
              <div><dt className="text-xs text-ink-500">Incident responses opened</dt><dd className="text-2xl font-medium tabular-nums text-ink-900">{incidents.length}</dd></div>
              <div><dt className="text-xs text-ink-500">Still open</dt><dd className="text-2xl font-medium tabular-nums text-ink-900">{incidentsOpen}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-400">{incidentsResolved.length} resolved with a closeout{incidentsStoodDown ? `, ${incidentsStoodDown} stood down as not needing one` : ""}. Acknowledgement time uses reports that have been acknowledged.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Corrective actions" />
          <CardBody>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div><dt className="text-xs text-ink-500">Open</dt><dd className="text-2xl font-medium tabular-nums text-ink-900">{open.length}</dd></div>
              <div><dt className="text-xs text-ink-500">Overdue</dt><dd className={`text-2xl font-medium tabular-nums ${overdue.length ? "text-danger" : "text-ink-900"}`}>{overdue.length}</dd></div>
              <div><dt className="text-xs text-ink-500">Avg days to verify</dt><dd className="text-2xl font-medium tabular-nums text-ink-900">{avgDaysToVerify ?? "—"}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-400">From actions created in this period. Verified means someone confirmed the fix is in place.</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Shared lessons" subtitle="De-identified lessons the safety team chose to share with everyone." />
        <CardBody>
          {lessons.length === 0 ? <p className="text-sm text-ink-500">None shared yet. Complete an investigation and write a lesson without names or personal details.</p> : (
            <ul className="space-y-3">{lessons.map((l) => <li key={l.id} className="text-sm text-ink-800"><span className="mr-2 rounded bg-surface-sunken px-1.5 py-0.5 text-[11px] text-ink-600">{categoryLabel(l.report.category, pack)}</span>{l.lessonText}</li>)}</ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
