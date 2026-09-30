import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";

/**
 * Deliberately aggregate-only. Platform staff can see how many organizations,
 * people and reports exist, never the content of a customer's reports,
 * investigations or statements.
 */
export default async function PlatformAdminOverview() {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [orgCount, onboarded, userCount, sites, reports30, subscriptions, supportOpen] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { onboardingDone: true } }),
    prisma.user.count({ where: { role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } } }),
    prisma.site.count({ where: { active: true } }),
    prisma.safetyReport.count({ where: { createdAt: { gte: since } } }),
    prisma.subscription.findMany(),
    prisma.auditLog.count({ where: { action: "setup_support.requested", createdAt: { gte: since } } }),
  ]);
  const mrr = subscriptions.reduce((sum, s) => sum + s.pricePerMonth, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Platform overview</h1>
        <p className="text-sm text-ink-500">Customers on Reldro. Counts only: report and investigation content stays inside each customer's organization.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Organizations" value={orgCount} helpText={`${onboarded} finished setup`} />
        <StatTile label="People with accounts" value={userCount} />
        <StatTile label="Active sites" value={sites} />
        <StatTile label="Reports submitted, last 30 days" value={reports30} />
        <StatTile label="MRR (subscriptions)" value={`$${mrr.toLocaleString()}`} />
      </div>
      {supportOpen > 0 && (
        <Card>
          <CardHeader icon={<IconBadge icon={<LifeBuoy size={18} />} tone="coral" />} title="Setup support requests" />
          <CardBody>
            <p className="text-sm text-ink-700">{supportOpen} request{supportOpen > 1 ? "s" : ""} for optional setup or advisor help in the last 30 days.</p>
            <Link href="/platform-admin/setup-support" className="mt-2 inline-block text-xs font-medium text-orchid-deep hover:text-oxblood">Review requests →</Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
