import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtDate, NoAccess } from "@/components/safety/ui";
import { InspectionRunner, RaiseReportButton } from "@/components/safety/InspectionForms";

type Item = { id: string; label: string; critical?: boolean };
type Result = { itemId: string; label: string; result: string; note: string; critical?: boolean; reportId?: string };

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const i = await prisma.inspection.findFirst({ where: { id, organizationId: v.organizationId }, include: { template: true, site: true } });
  if (!i) notFound();
  const canRun = v.isSafetyTeam || (v.employeeId !== null && i.assigneeId === v.employeeId) || (v.isSupervisor && v.siteId === i.siteId);
  if (!canRun) return <NoAccess what="this inspection" />;
  const results = i.results as unknown as Result[];
  const linkedActions = await prisma.correctiveAction.findMany({ where: { organizationId: v.organizationId, inspectionId: i.id }, select: { id: true, number: true, title: true } });
  const reportIds = results.map((r) => r.reportId).filter((x): x is string => Boolean(x));
  const linkedReports = reportIds.length ? await prisma.safetyReport.findMany({ where: { id: { in: reportIds }, organizationId: v.organizationId }, select: { id: true, number: true } }) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div>
        <Link href="/dashboard/inspections" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Inspections</Link>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">{i.template.name}</h1>
        <p className="text-sm text-ink-500">{i.site.name} · due {fmtDate(i.dueDate)}</p>
      </div>
      {i.status === "SCHEDULED" ? (
        <InspectionRunner inspectionId={i.id} items={i.template.items as unknown as Item[]} />
      ) : (
        <Card>
          <CardHeader title="Completed" subtitle={`Submitted ${fmtDate(i.completedAt)}`} />
          <CardBody className="space-y-3">
            <ul className="divide-y divide-ink-200">
              {results.map((r) => (
                <li key={r.itemId} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-900">{r.label}</p>
                    {r.note && <p className="text-xs text-ink-500">{r.note}</p>}
                    {r.result === "FAIL" && (
                      <div className="mt-1 space-y-0.5 text-xs">
                        {linkedActions.filter((a) => a.title.startsWith(`Fix: ${r.label}`.slice(0, 160))).map((a) => (
                          <p key={a.id}><Link href={`/dashboard/actions/${a.id}`} className="font-medium text-orchid-deep hover:text-oxblood">Action A-{a.number}</Link></p>
                        ))}
                        {r.reportId && linkedReports.find((x) => x.id === r.reportId) ? (
                          <p><Link href={`/dashboard/reports/${r.reportId}`} className="font-medium text-orchid-deep hover:text-oxblood">Report SR-{String(linkedReports.find((x) => x.id === r.reportId)!.number).padStart(4, "0")}</Link></p>
                        ) : (
                          <RaiseReportButton inspectionId={i.id} itemId={r.itemId} />
                        )}
                      </div>
                    )}
                  </div>
                  <Badge tone={r.result === "PASS" ? "green" : r.result === "FAIL" ? "red" : "neutral"}>{r.result === "NA" ? "N/A" : r.result === "PASS" ? "Pass" : "Fail"}</Badge>
                </li>
              ))}
            </ul>
            {i.notes && <p className="text-sm text-ink-700">{i.notes}</p>}
            <p className="text-xs text-ink-400">Failed items can become corrective actions, and any hazard worth tracking on its own can be filed as a report.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
