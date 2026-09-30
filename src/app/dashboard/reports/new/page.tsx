import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { getPack, REPORT_TYPES } from "@/lib/safety/pack";
import { ReportForm } from "@/components/safety/ReportForm";

export default async function NewReportPage() {
  const v = await requireViewer();
  const pack = getPack();
  const [sites, org] = await Promise.all([
    prisma.site.findMany({ where: { organizationId: v.organizationId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.organization.findUnique({ where: { id: v.organizationId }, select: { emergencyInstructions: true } }),
  ]);
  const emergencyText = org?.emergencyInstructions.trim() || "Call your local emergency number (911 in the US) and follow your site's emergency plan.";

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Report something</h1>
        <p className="mt-0.5 text-sm text-ink-500">Hazards, near misses, injuries or anything that doesn't feel right. It takes about a minute, and you don't need the right safety words.</p>
      </div>
      <ReportForm
        types={REPORT_TYPES.map((t) => ({ key: t.key, label: t.label, plain: t.plain }))}
        categories={pack.categories.map((c) => ({ key: c.key, label: c.label }))}
        sites={sites}
        defaultSiteId={v.siteId}
        emergencyText={emergencyText}
      />
    </div>
  );
}
