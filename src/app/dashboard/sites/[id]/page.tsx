import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { QueryLink } from "@/components/ui/QueryLink";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, SITE_KINDS } from "@/lib/safety/pack";
import { NoAccess } from "@/components/safety/ui";
import { loadInsights, readDays } from "@/lib/safety/insightsData";
import { InsightsTabs, InsightsView, readTab, type TabKey } from "@/components/safety/insights/InsightsView";
import { LIST_PAGE } from "@/components/ui/layout";

/** One site's own page: the same Insights numbers, limited to this site, with shortcuts to its reports, actions, inspections and certifications. */
export default async function SitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string; tab?: string }> }) {
  const v = await requireViewer();
  if (!v.isSafetyTeam) return <NoAccess what="site pages" />;
  const { id } = await params;
  const p = await searchParams;
  const site = await prisma.site.findFirst({ where: { id, organizationId: v.organizationId } });
  if (!site) notFound();
  const days = readDays(p.days);
  const tab = readTab(p.tab);
  const [data, lead, people] = await Promise.all([
    loadInsights(v, { siteId: site.id, days }),
    site.safetyLeadId ? prisma.employee.findUnique({ where: { id: site.safetyLeadId }, select: { user: { select: { name: true } } } }) : Promise.resolve(null),
    prisma.employee.count({ where: { organizationId: v.organizationId, siteId: site.id } }),
  ]);
  const pack = getPack();
  const lessons = tab === "reports"
    ? (await prisma.investigation.findMany({ where: { organizationId: v.organizationId, shareLesson: true, report: { siteId: site.id } }, include: { report: { select: { category: true } } }, orderBy: { completedAt: "desc" }, take: 10 }))
        .map((l) => ({ id: l.id, topic: categoryLabel(l.report.category, pack), text: l.lessonText }))
    : [];

  const href = (over: { tab?: TabKey; days?: number }) => {
    const q = new URLSearchParams();
    const t = over.tab ?? tab, d = over.days ?? days;
    if (t !== "overview") q.set("tab", t);
    if (d !== 90) q.set("days", String(d));
    const s = q.toString();
    return `/dashboard/sites/${site.id}${s ? `?${s}` : ""}`;
  };
  const seg = (active: boolean) => `seg ${active ? "seg-on" : "seg-off"}`;
  const link = "inline-flex min-h-9 items-center rounded-full border border-ink-300 bg-white px-3.5 text-xs font-medium text-ink-800 hover:bg-surface-hover";

  return (
    <div className={LIST_PAGE}>
      <div className="space-y-2">
        <Link href="/dashboard/sites" className="inline-flex items-center gap-1 text-xs font-medium text-orchid-deep hover:text-oxblood"><ChevronLeft size={14} aria-hidden /> Sites</Link>
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-ink-900">{site.name}{!site.active && <span className="ml-2 align-middle text-sm font-normal text-ink-500">Archived</span>}</h1>
        <p className="text-sm text-ink-500">
          {[SITE_KINDS.find((k) => k.key === site.kind)?.label, site.address, lead ? `Safety lead: ${lead.user.name}` : "No safety lead assigned", `${people} ${people === 1 ? "person" : "people"}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/reports?status=all&site=${site.id}`} className={link}>Reports</Link>
        <Link href={`/dashboard/inspections?q=${encodeURIComponent(site.name)}`} className={link}>Inspections</Link>
        <Link href={`/dashboard/training?tab=qualifications&cview=compliance&gsite=${site.id}`} className={link}>Certifications</Link>
        <Link href={`/dashboard/insights?site=${site.id}`} className={link}>Open in Insights</Link>
      </div>
      <div role="group" aria-label="Time period" className="seg-group w-fit">
        {[30, 90, 365].map((n) => <QueryLink key={n} scroll={false} href={href({ days: n })} className={seg(days === n)} aria-pressed={days === n}>{n === 365 ? "Last year" : `${n} days`}</QueryLink>)}
      </div>
      <InsightsTabs tab={tab} hrefFor={(t) => href({ tab: t })} />
      <InsightsView data={data} tab={tab} days={days} isAdmin={v.isAdmin} lessons={lessons} />
    </div>
  );
}
