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
  const emergencyText = org?.emergencyInstructions.trim() ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Report a safety concern</h1>
        <p className="mt-0.5 text-sm text-ink-500">Report a hazard, near miss, injury, equipment issue, or other safety concern. Describe what you noticed in your own words.</p>
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
