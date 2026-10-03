import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack } from "@/lib/safety/pack";
import { NoAccess } from "@/components/safety/ui";
import { loadInsights, readDays } from "@/lib/safety/insightsData";
import { InsightsTabs, InsightsView, readTab, type TabKey } from "@/components/safety/insights/InsightsView";
import { SiteScope } from "@/components/safety/insights/controls";
import { LIST_PAGE } from "@/components/ui/layout";

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ days?: string; tab?: string; site?: string; q?: string; sort?: string; page?: string }> }) {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return <NoAccess what="cross-site insights" />;
  const p = await searchParams;
  const days = readDays(p.days);
  const tab = readTab(p.tab);
  const data = await loadInsights(v, { siteId: p.site || null, days });
  const siteId = data.metrics.scope.siteId;
  const pack = getPack();

  const lessons = tab === "reports"
    ? (await prisma.investigation.findMany({ where: { organizationId: v.organizationId, shareLesson: true, ...(siteId ? { report: { siteId } } : {}) }, include: { report: { select: { category: true } } }, orderBy: { completedAt: "desc" }, take: 10 }))
        .map((l) => ({ id: l.id, topic: categoryLabel(l.report.category, pack), text: l.lessonText }))
    : [];

  const href = (over: { tab?: TabKey; days?: number }) => {
    const q = new URLSearchParams();
    const t = over.tab ?? tab, d = over.days ?? days;
    if (t !== "overview") q.set("tab", t);
    if (d !== 90) q.set("days", String(d));
    if (siteId) q.set("site", siteId);
    const s = q.toString();
    return `/dashboard/insights${s ? `?${s}` : ""}`;
  };
  const seg = (active: boolean) => `seg ${active ? "seg-on" : "seg-off"}`;

  return (
    <div className={LIST_PAGE}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Insights</h1>
        <p className="mt-0.5 max-w-2xl text-sm text-ink-500">
          {siteId ? <>Showing {data.metrics.scope.siteName} only. <Link href={`/dashboard/sites/${siteId}`} className="font-medium text-orchid-deep hover:text-oxblood">Open the site page →</Link></> : "Where every site stands against your own targets, and what to close first. Choose a site to see its numbers on their own."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SiteScope sites={data.sites.filter((s) => s.active)} value={siteId ?? ""} />
        <div role="group" aria-label="Time period" className="seg-group">
          {[30, 90, 365].map((n) => <QueryLink key={n} scroll={false} href={href({ days: n })} className={seg(days === n)} aria-pressed={days === n}>{n === 365 ? "Last year" : `${n} days`}</QueryLink>)}
        </div>
      </div>
      <InsightsTabs tab={tab === "sites" && siteId ? "overview" : tab} hrefFor={(t) => href({ tab: t })} withSites={!siteId} />
      <InsightsView data={data} tab={tab} days={days} isAdmin={v.isAdmin} lessons={lessons} sitesView={{ q: p.q ?? "", sort: p.sort ?? "", page: p.page }} />
    </div>
  );
}
