import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ago } from "@/lib/platformFormat";

export const dynamic = "force-dynamic";

/**
 * Deliberately aggregate-only. Platform staff can see how many organizations,
 * people and reports exist, never the content of a customer's reports,
 * investigations or statements.
 */
export default async function PlatformAdminOverview() {
  const now = Date.now();
  const since = new Date(now - 30 * 86400_000);
  const [orgCount, onboarded, userCount, sites, reports30, seatSum, orgs, lastSeen] = await Promise.all([
    prisma.organization.count({ where: { isDemo: false } }),
    prisma.organization.count({ where: { isDemo: false, onboardingDone: true } }),
    prisma.user.count({ where: { role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] }, organization: { isDemo: false } } }),
    prisma.site.count({ where: { active: true, organization: { isDemo: false } } }),
    prisma.safetyReport.count({ where: { createdAt: { gte: since }, organization: { isDemo: false } } }),
    prisma.organization.aggregate({ where: { isDemo: false }, _sum: { seatLimit: true } }),
    prisma.organization.findMany({ where: { isDemo: false }, select: { id: true, name: true, createdAt: true, onboardingDone: true, suspendedAt: true }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.user.groupBy({ by: ["organizationId"], where: { role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } }, _max: { lastLoginAt: true } }),
  ]);
  const lastBy = new Map(lastSeen.map((l) => [l.organizationId, l._max.lastLoginAt]));

  // Accounts worth a look: suspended, still in setup a week after being created, or nobody has signed in for a month.
  const attention = orgs
    .map((o) => {
      const last = lastBy.get(o.id) ?? null;
      const age = (now - o.createdAt.getTime()) / 86400_000;
      if (o.suspendedAt) return { ...o, why: "Suspended", tone: "red" as const, last };
      if (!o.onboardingDone && age > 7) return { ...o, why: "Setup not finished", tone: "amber" as const, last };
      if (age > 14 && (!last || now - last.getTime() > 30 * 86400_000)) return { ...o, why: "No sign-ins in 30 days", tone: "gold" as const, last };
      return null;
    })
    .filter((o): o is NonNullable<typeof o> => o !== null)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Platform overview</h1>
        <p className="text-sm text-ink-500">Customers on Reldro. Counts only: report and investigation content stays inside each customer&apos;s organization. The sample workspace is left out.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatTile label="Organizations" value={orgCount} helpText={`${onboarded} finished setup`} />
        <StatTile label="People with accounts" value={userCount} />
        <StatTile label="Seats assigned" value={(seatSum._sum.seatLimit ?? 0).toLocaleString("en-US")} helpText="Across organizations with a limit set" />
        <StatTile label="Active sites" value={sites} />
        <StatTile label="Reports submitted, last 30 days" value={reports30} />
      </div>
      <Card tone="plain">
        <CardHeader title="Needs a look" subtitle="Suspended, stuck in setup, or gone quiet." />
        <CardBody className="p-0">
          {attention.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">Nothing right now.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {attention.map((o) => (
                <li key={o.id}>
                  <Link href={`/platform-admin/organizations/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-hover">
                    <span className="min-w-0 truncate text-sm font-medium text-ink-900">{o.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-ink-500">Last sign-in: {ago(o.last, now)}</span>
                      <Badge tone={o.tone}>{o.why}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
