import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, HardHat, History, Layers, ShieldCheck, Siren, LifeBuoy, PhoneCall } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { categoryLabel, getPack, severityInfo, SEVERITIES } from "@/lib/safety/pack";
import { describeAuditAction } from "@/lib/audit";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LocalTime } from "@/components/safety/LocalTime";
import { IconBadge } from "@/components/ui/IconBadge";
import { OrgProfileForm } from "@/components/settings/OrgProfileForm";
import { AddDepartmentForm } from "@/components/settings/AddDepartmentForm";
import { CrewRow } from "@/components/settings/CrewRow";
import { InviteAdminForm } from "@/components/settings/InviteAdminForm";
import { AdminRow } from "@/components/settings/AdminRow";
import { DeleteRuleButton, EmergencyInstructionsForm, EscalationRuleForm, SetupSupportForm } from "@/components/safety/SettingsForms";

export default async function SettingsPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const orgId = session.organizationId;
  const pack = getPack();

  const [org, auditLogs, crews, admins, rules, sites, people] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.auditLog.findMany({ where: { organizationId: orgId }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.department.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { organizationId: orgId, role: "COMPANY_ADMIN" }, orderBy: { createdAt: "asc" } }),
    prisma.escalationRule.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } }),
    prisma.site.findMany({ where: { organizationId: orgId, active: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { organizationId: orgId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  if (!org) redirect("/login");
  const crewCounts = new Map<string, number>();
  for (const e of await prisma.employee.findMany({ where: { organizationId: orgId, departmentId: { not: null } }, select: { departmentId: true } })) crewCounts.set(e.departmentId!, (crewCounts.get(e.departmentId!) ?? 0) + 1);
  const nameOf = (id: string | null) => (id ? people.find((p) => p.id === id)?.user.name ?? "Someone" : null);
  const siteName = (id: string | null) => (id ? sites.find((s) => s.id === id)?.name ?? "A site" : null);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Manage company details, emergency instructions, escalation rules, and admin access.</p>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<Building2 size={18} />} tone="orchid" />} title="Company" />
        <CardBody><OrgProfileForm org={org} /></CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<PhoneCall size={18} />} tone="coral" />} title="Emergency instructions" subtitle="Shown to every reporter on the report form. Reldro does not contact emergency services, so this text should reflect your own plan." />
        <CardBody><EmergencyInstructionsForm initial={org.emergencyInstructions} /></CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<Siren size={18} />} tone="coral" />} title="Escalation rules" subtitle="Choose who receives a new report, how quickly it must be acknowledged, and who is alerted if it is not. The most specific matching rule applies." />
        <CardBody className="space-y-5">
          {rules.length === 0 ? (
            <p className="rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink-600">No rules yet. New reports go to the safety lead of their site. If a site has no safety lead, the report has no owner and appears on the Overview for the safety team.</p>
          ) : (
            <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200">
              {rules.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                  <p className="text-ink-800">
                    <strong>{severityInfo(r.minSeverity).label}</strong> or higher{r.category ? ` · ${categoryLabel(r.category, pack)}` : ""}{r.siteId ? ` · ${siteName(r.siteId)}` : ""}: assign to {nameOf(r.ownerId) ?? "the site safety lead"}, acknowledge within {r.respondWithinHours}h{r.escalateToId ? `, then alert ${nameOf(r.escalateToId)}` : ""}.
                    {r.openIncident && <span className="ml-1 rounded bg-coral-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">Opens an incident response</span>}
                  </p>
                  <DeleteRuleButton ruleId={r.id} />
                </li>
              ))}
            </ul>
          )}
          <details className="rounded-lg border border-ink-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-ink-800">Add a rule</summary>
            <div className="mt-3">
              <EscalationRuleForm
                severities={SEVERITIES.map((s) => ({ key: s.key, label: s.label }))}
                categories={pack.categories.map((c) => ({ key: c.key, label: c.label }))}
                sites={sites.map((s) => ({ id: s.id, name: s.name }))}
                people={people.map((p) => ({ id: p.id, name: p.user.name }))}
              />
            </div>
          </details>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<Layers size={18} />} tone="sage" />} title="Crews" subtitle="Groups such as a prewire crew or service team. Rename or delete a crew here. Sites and roles are managed under People & Training and Sites." />
        <CardBody className="space-y-4">
          {crews.length === 0 ? (
            <p className="text-sm text-ink-500">No crews yet. Add a crew below, such as a prewire crew or a service team.</p>
          ) : (
            <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200">
              {crews.map((d) => <CrewRow key={d.id} id={d.id} name={d.name} people={crewCounts.get(d.id) ?? 0} />)}
            </ul>
          )}
          <AddDepartmentForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<ShieldCheck size={18} />} tone="orchid" />} title="Company admins" subtitle="Admins see everything and manage settings. Add more so no single account is a bottleneck." />
        <CardBody className="space-y-4">
          <div className="divide-y divide-ink-200">
            {admins.map((a) => <AdminRow key={a.id} admin={{ id: a.id, name: a.name, email: a.email, pending: a.lastLoginAt === null }} isSelf={a.id === session.sub} />)}
          </div>
          <InviteAdminForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<LifeBuoy size={18} />} tone="olive" />} title="Optional setup and advisor help" subtitle="Get paid help setting up sites, escalation rules, or checklists, or talking through a safety program. Reldro works without it. Scope and price are agreed separately." />
        <CardBody><SetupSupportForm /></CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<History size={18} />} tone="sage" />} title="Activity log" subtitle="The latest changes in your workspace." />
        <CardBody className="divide-y divide-ink-200 p-0">
          {auditLogs.map((log) => (
            <div key={log.id} className="px-4 py-3 sm:px-5">
              <p className="truncate text-sm text-ink-800">{describeAuditAction(log.action)}</p>
              <p className="text-xs text-ink-500">{log.user?.name ?? "System"} · <LocalTime value={log.createdAt} /></p>
            </div>
          ))}
          {auditLogs.length === 0 && <p className="p-5 text-sm text-ink-500">No activity recorded yet.</p>}
          <Link href="/dashboard/settings/activity" className="flex items-center justify-between px-4 py-3 text-sm font-medium text-orchid-deep hover:bg-ink-50 hover:text-oxblood sm:px-5">
            View the full activity log, with filters <ArrowRight size={14} aria-hidden />
          </Link>
        </CardBody>
      </Card>

      <p className="flex items-center gap-2 px-1 text-xs text-ink-400"><HardHat size={14} /> Your reports and investigations stay within your company. The Reldro admin console shows account-level counts only, not report contents.</p>
    </div>
  );
}
