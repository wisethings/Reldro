import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateOrgToggle } from "@/components/platform-admin/CreateOrgToggle";

export default async function PlatformOrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    include: { employees: true, subscription: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Organizations</h1>
          <p className="text-sm text-ink-500">{organizations.length} organizations on Reldro.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api/platform-admin/export/organizations"
            className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
          >
            Export CSV
          </Link>
          <CreateOrgToggle />
        </div>
      </div>
      <Card>
        <CardBody className="divide-y divide-ink-200 p-0">
          {organizations.map((org) => (
            <div key={org.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{org.name}</p>
                <p className="text-xs text-ink-500">{org.industry || "Industry not set"} · {org.employees.length} employees</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={org.onboardingDone ? "green" : "amber"}>{org.onboardingDone ? "Onboarded" : "Onboarding"}</Badge>
                {org.subscription && <Badge tone="brand">{org.subscription.tier}</Badge>}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
