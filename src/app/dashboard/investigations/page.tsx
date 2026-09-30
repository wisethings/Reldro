import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, severityRank } from "@/lib/safety/pack";
import { DataRow, DataTable } from "@/components/safety/Table";
import { EmptyHero, fmtShort, InvestigationStatusBadge, NoAccess, PageHeader, SeverityBadge } from "@/components/safety/ui";

import { StatStrip } from "@/components/safety/Dashboard";
export default async function InvestigationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const v = await requireViewer();
  const { status = "active" } = await searchParams;
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
  const list = await prisma.investigation.findMany({ where, include: { report: { include: { site: true } } }, orderBy: { openedAt: "desc" } });
  list.sort((a, b) => severityRank(b.report.severity) - severityRank(a.report.severity));

  const chip = (active: boolean) => `rounded-full border px-2.5 py-1 text-xs font-medium ${active ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`;

  const orgWhere = { organizationId: v.organizationId, ...(v.isSafetyTeam ? {} : { leadId: v.employeeId ?? "__none__" }) };
  const [sOpen, sReview, sDone, sShared] = await Promise.all([
    prisma.investigation.count({ where: { ...orgWhere, status: "OPEN" } }),
    prisma.investigation.count({ where: { ...orgWhere, status: "IN_REVIEW" } }),
    prisma.investigation.count({ where: { ...orgWhere, status: "COMPLETE", completedAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
    prisma.investigation.count({ where: { ...orgWhere, shareLesson: true } }),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Investigations" subtitle="Review what happened, identify contributing factors, and track steps to reduce the chance of it happening again." />
      <StatStrip items={[
        { label: "Open", value: sOpen, href: "?status=active" },
        { label: "In review", value: sReview, href: "?status=active" },
        { label: "Completed in the last 30 days", value: sDone, href: "?status=complete" },
        { label: "Lessons shared", value: sShared },
      ]} />
      <div className="flex gap-2">
        <Link href="?status=active" className={chip(status === "active")}>Active</Link>
        <Link href="?status=complete" className={chip(status === "complete")}>Complete</Link>
        <Link href="?status=all" className={chip(status === "all")}>All</Link>
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
                  <p className="truncate text-[13px] font-medium text-ink-900">{i.report.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500"><span className="font-mono">SR-{String(i.report.number).padStart(4, "0")}</span> · {categoryLabel(i.report.category, pack)}</p>
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
    </div>
  );
}
