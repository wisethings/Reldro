import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OrganizationsHeader } from "@/components/platform-admin/CreateOrgToggle";

export default async function PlatformOrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    include: { employees: true, subscription: true, sites: { where: { active: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <OrganizationsHeader count={organizations.length} />
      <Card tone="plain">
        <CardBody className="divide-y divide-ink-200 p-0">
          {organizations.map((org) => (
            <div key={org.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{org.name}</p>
                <p className="text-xs text-ink-500">{org.industry || "Trade not set"} · {org.employees.length} people · {org.sites.length} site{org.sites.length === 1 ? "" : "s"}</p>
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
