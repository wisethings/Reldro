import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { describeAuditAction } from "@/lib/audit";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { LocalTime } from "@/components/safety/LocalTime";
import { ResendInviteButton, SeatLimitForm, SuspendControls } from "@/components/platform-admin/OrgControls";
import { ago, agoInline, seatsText } from "@/lib/platformFormat";
import { staffDetail } from "@/lib/platformAudit";

export const dynamic = "force-dynamic";

export default async function PlatformOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true, industry: true, size: true, geography: true, createdAt: true, onboardingDone: true, onboardingStep: true, seatLimit: true, suspendedAt: true, isDemo: true },
  });
  if (!org) notFound();

  const since = new Date(Date.now() - 30 * 86400_000);
  const [seatsUsed, admins, sites, departments, reports30, lastSignIn, staffLog] = await Promise.all([
    prisma.user.count({ where: { organizationId: id, role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } } }),
    prisma.user.findMany({ where: { organizationId: id, role: "COMPANY_ADMIN" }, select: { id: true, name: true, email: true, lastLoginAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.site.count({ where: { organizationId: id, active: true } }),
    prisma.department.count({ where: { organizationId: id } }),
    prisma.safetyReport.count({ where: { organizationId: id, createdAt: { gte: since } } }),
    prisma.user.aggregate({ where: { organizationId: id, role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } }, _max: { lastLoginAt: true } }),
    prisma.auditLog.findMany({ where: { organizationId: id, action: { startsWith: "platform." } }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/platform-admin/organizations" className="inline-flex items-center gap-1 text-xs font-medium text-orchid-deep hover:text-oxblood"><ChevronLeft size={14} aria-hidden /> Organizations</Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-ink-900">{org.name}</h1>
          {org.isDemo && <Badge tone="gold">Sample workspace</Badge>}
          {org.suspendedAt ? <Badge tone="red">Suspended</Badge> : org.onboardingDone ? <Badge tone="green">Active</Badge> : <Badge tone="amber">Setting up</Badge>}
        </div>
        <p className="text-sm text-ink-500">
          {[org.industry || "Trade not set", org.geography, `Created ${org.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Seats" value={seatsText(seatsUsed, org.seatLimit).replace(" seats", "")} helpText={org.seatLimit === null ? "No limit set" : "In use"} />
        <StatTile label="Active sites" value={sites} helpText={`${departments} department${departments === 1 ? "" : "s"}`} />
        <StatTile label="Reports, last 30 days" value={reports30} helpText="Count only" />
        <StatTile label="Last sign-in" value={<span className="text-lg">{ago(lastSignIn._max.lastLoginAt)}</span>} helpText="Anyone in the workspace" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card tone="plain">
          <CardHeader title="Seats" subtitle="How many people this workspace may have." />
          <CardBody>
            <SeatLimitForm orgId={org.id} limit={org.seatLimit} used={seatsUsed} />
          </CardBody>
        </Card>
        <Card tone="plain">
          <CardHeader title="Access" subtitle="Lock or reopen the workspace." />
          <CardBody>
            <SuspendControls orgId={org.id} name={org.name} suspended={Boolean(org.suspendedAt)} isDemo={org.isDemo} />
          </CardBody>
        </Card>
      </div>

      <Card tone="plain">
        <CardHeader title="Admins and setup" subtitle={org.onboardingDone ? "The first admin finished setup." : `The first admin has not finished setup (on step ${org.onboardingStep + 1}).`} />
        <CardBody className="p-0">
          <ul className="divide-y divide-ink-100">
            {admins.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{a.name}</p>
                  <p className="truncate text-xs text-ink-500">{a.email} · {a.lastLoginAt ? `Signed in ${agoInline(a.lastLoginAt)}` : "Never signed in"}</p>
                </div>
                {!a.lastLoginAt && !org.isDemo && <ResendInviteButton userId={a.id} />}
              </li>
            ))}
            {admins.length === 0 && <li className="px-5 py-4 text-sm text-ink-500">No admin accounts.</li>}
          </ul>
        </CardBody>
      </Card>

      <Card tone="plain">
        <CardHeader title="Recent staff activity" subtitle="What Reldro staff changed for this organization." />
        <CardBody className="p-0">
          {staffLog.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">Nothing yet.</p>
          ) : (
            <ol className="divide-y divide-ink-100">
              {staffLog.map((l) => (
                <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 sm:px-5">
                  <p className="min-w-0 text-sm text-ink-900"><span className="font-medium">{l.user?.name ?? "Reldro"}</span> · {describeAuditAction(l.action)}{staffDetail(l.action, l.metadata) && <span className="text-ink-500"> ({staffDetail(l.action, l.metadata)})</span>}</p>
                  <span className="shrink-0 text-xs text-ink-500"><LocalTime value={l.createdAt} /></span>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
