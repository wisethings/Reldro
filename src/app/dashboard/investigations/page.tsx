import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, severityRank } from "@/lib/safety/pack";
import { DataRow, DataTable } from "@/components/safety/Table";
import { EmptyHero, fmtShort, InvestigationStatusBadge, NoAccess, PageHeader, SeverityBadge } from "@/components/safety/ui";

import { StatStrip } from "@/components/safety/Dashboard";
import { PAGE_SIZE, Pagination, readPage } from "@/components/safety/Pagination";
import { LIST_PAGE } from "@/components/ui/layout";
export default async function InvestigationsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const v = await requireViewer();
  const { status = "active", page: pageParam } = await searchParams;
  const pack = getPack();
  const where = {
    organizationId: v.organizationId,
    ...(v.isSafetyTeam ? {} : { leadId: v.employeeId ?? "__none__" }),
    ...(status === "active" ? { status: { in: ["OPEN", "IN_REVIEW"] } } : status === "complete" ? { status: "COMPLETE" } : {}),
  };
  if (!v.isSafetyTeam && !v.employeeId) return <NoAccess what="investigations" />;
  if (!v.isSafetyTeam) {
    // Only people who lead at least one investigation get this section; everyone else sees the no-access state.
    const leads = await prisma.investigation.count({ where: { organizationId: v.organizationId, leadId: v.employeeId } });
    if (leads === 0) return <NoAccess what="investigations" />;
  }
  // Highest severity first, then newest. Severity is ranked in code, so rank a light list of ids and load only the page shown.
  const ranked = await prisma.investigation.findMany({ where, select: { id: true, openedAt: true, report: { select: { severity: true } } }, orderBy: { openedAt: "desc" } });
  ranked.sort((a, b) => severityRank(b.report.severity) - severityRank(a.report.severity));
  const total = ranked.length;
  const page = Math.min(readPage(pageParam), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const pageIds = ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => r.id);
  const loaded = await prisma.investigation.findMany({ where: { id: { in: pageIds } }, include: { report: { include: { site: true } } } });
  const list = pageIds.map((id) => loaded.find((l) => l.id === id)).filter((l): l is (typeof loaded)[number] => Boolean(l));

  const chip = (active: boolean) => `pill ${active ? "pill-on" : "pill-off"}`;

  const orgWhere = { organizationId: v.organizationId, ...(v.isSafetyTeam ? {} : { leadId: v.employeeId ?? "__none__" }) };
  const [sOpen, sReview, sDone, sShared] = await Promise.all([
    prisma.investigation.count({ where: { ...orgWhere, status: "OPEN" } }),
    prisma.investigation.count({ where: { ...orgWhere, status: "IN_REVIEW" } }),
    prisma.investigation.count({ where: { ...orgWhere, status: "COMPLETE", completedAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
    prisma.investigation.count({ where: { ...orgWhere, shareLesson: true } }),
  ]);
  return (
    <div className={LIST_PAGE}>
      <PageHeader title="Investigations" subtitle="Review what happened, identify contributing factors, and track steps to reduce the chance of it happening again." />
      <StatStrip items={[
        { label: "Open", value: sOpen, href: "?status=active" },
        { label: "In review", value: sReview, href: "?status=active" },
        { label: "Completed in the last 30 days", value: sDone, href: "?status=complete" },
        { label: "Lessons shared", value: sShared },
      ]} />
      <div className="flex gap-2">
        <QueryLink href="?status=active" className={chip(status === "active")}>Active</QueryLink>
        <QueryLink href="?status=complete" className={chip(status === "complete")}>Complete</QueryLink>
        <QueryLink href="?status=all" className={chip(status === "all")}>All</QueryLink>
        <span className="ml-auto self-center text-xs text-ink-500">Sorted by severity, highest first.</span>
      </div>
      {list.length === 0 ? (
        <EmptyHero kind="investigations" title={status === "active" ? "No active investigations" : "No investigations match this filter"} body="Start an investigation from a report when it needs a closer review." steps={[{ href: "/dashboard/reports", title: "Review open reports", body: "Open a report and choose Open investigation when it needs a closer look." }]} />
      ) : (
        <DataTable columns={["Investigation", "Seriousness", "Status", "Site", "Opened"]} template="minmax(0,1fr) 8.5rem 8rem 12rem 5rem">
          {list.map((i) => (
            <DataRow
              key={i.id}
              href={`/dashboard/investigations/${i.id}`}
              template="minmax(0,1fr) 8.5rem 8rem 12rem 5rem"
              main={
                <>
                  <p title={i.report.title} className="truncate text-sm font-medium text-ink-900">{i.report.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500"><span className="tabular-nums">SR-{String(i.report.number).padStart(4, "0")}</span> · {categoryLabel(i.report.category, pack)}</p>
                </>
              }
              chips={
                <>
                  <SeverityBadge severity={i.report.severity} suggested={!i.report.severityConfirmedAt} />
                  <InvestigationStatusBadge status={i.status} />
                  <span className="text-xs text-ink-500">{i.report.site?.name ?? "Site not given"} · opened {fmtShort(i.openedAt)}</span>
                </>
              }
              cells={[
                <SeverityBadge key="s" severity={i.report.severity} suggested={!i.report.severityConfirmedAt} />,
                <InvestigationStatusBadge key="t" status={i.status} />,
                i.report.site?.name ?? "Site not given",
                fmtShort(i.openedAt),
              ]}
            />
          ))}
        </DataTable>
      )}
      <Pagination page={page} total={total} noun="investigations" hrefFor={(n) => `?status=${status}${n > 1 ? `&page=${n}` : ""}`} />
    </div>
  );
}
