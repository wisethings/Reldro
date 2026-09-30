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
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Report a safety concern</h1>
        <p className="mt-0.5 text-sm text-ink-500">Report a hazard, near miss, injury, equipment issue, or other safety concern. Describe what you noticed in your own words.</p>
      </div>
      <div className="expand-panel p-5 sm:p-7">
      <ReportForm
        types={REPORT_TYPES.map((t) => ({ key: t.key, label: t.label, plain: t.plain }))}
        categories={pack.categories.map((c) => ({ key: c.key, label: c.label }))}
        sites={sites}
        defaultSiteId={v.siteId}
        emergencyText={emergencyText}
      />
      </div>
    </div>
  );
}
