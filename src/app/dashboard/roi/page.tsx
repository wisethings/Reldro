import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { RoiExplorer } from "@/components/roi/RoiExplorer";

export default async function RoiPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

  const latestMonth = await prisma.rOIMetric.findFirst({
    where: { organizationId: session.organizationId },
    orderBy: { month: "desc" },
    select: { month: true },
  });

  const metrics = latestMonth
    ? await prisma.rOIMetric.findMany({
        where: { organizationId: session.organizationId, month: latestMonth.month },
        orderBy: { annualValue: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">ROI</h1>
        <p className="text-sm text-ink-500">The business case behind your AI adoption program.</p>
      </div>
      <RoiExplorer workflows={metrics.map((m) => ({ label: m.workflowLabel, investment: m.investment, annualValue: m.annualValue }))} />
      {metrics.length === 0 && <p className="text-sm text-ink-500">No ROI data yet — adopt workflows to start tracking value.</p>}
    </div>
  );
}
