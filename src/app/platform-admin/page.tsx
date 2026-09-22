import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Link from "next/link";

export default async function PlatformAdminOverview() {
  const [orgCount, userCount, pendingSpecialists, approvedSpecialists, activeProjects, subscriptions] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.specialist.count({ where: { approved: false } }),
    prisma.specialist.count({ where: { approved: true } }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.findMany(),
  ]);

  const mrr = subscriptions.reduce((sum, s) => sum + s.pricePerMonth, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Platform overview</h1>
        <p className="text-sm text-ink-500">Global visibility across every organization on Reldro.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Organizations" value={orgCount} />
        <StatTile label="Total users" value={userCount} />
        <StatTile label="Approved specialists" value={approvedSpecialists} />
        <StatTile label="Active expert-help projects" value={activeProjects} />
        <StatTile label="MRR (subscriptions)" value={`$${mrr.toLocaleString()}`} />
      </div>

      {pendingSpecialists > 0 && (
        <Card>
          <CardHeader title="Action needed" />
          <CardBody>
            <p className="text-sm text-ink-700">
              {pendingSpecialists} specialist application{pendingSpecialists > 1 ? "s" : ""} awaiting approval.
            </p>
            <Link href="/platform-admin/specialists" className="mt-2 inline-block text-xs font-medium text-brand-700 hover:text-brand-800">
              Review specialists →
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
