import { redirect } from "next/navigation";
import { Building2, HardHat, History, Layers, ShieldCheck, Siren, LifeBuoy } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { categoryLabel, getPack, severityInfo, SEVERITIES } from "@/lib/safety/pack";
import { describeAuditAction } from "@/lib/audit";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { OrgProfileForm } from "@/components/settings/OrgProfileForm";
import { AddDepartmentForm } from "@/components/settings/AddDepartmentForm";
import { InviteAdminForm } from "@/components/settings/InviteAdminForm";
import { AdminRow } from "@/components/settings/AdminRow";
import { DeleteRuleButton, EscalationRuleForm, SetupSupportForm } from "@/components/safety/SettingsForms";

export default async function SettingsPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const orgId = session.organizationId;
  const pack = getPack();

  const [org, auditLogs, crews, admins, rules, sites, people] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.auditLog.findMany({ where: { organizationId: orgId }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.department.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { organizationId: orgId, role: "COMPANY_ADMIN" }, orderBy: { createdAt: "asc" } }),
    prisma.escalationRule.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } }),
    prisma.site.findMany({ where: { organizationId: orgId, active: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { organizationId: orgId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  if (!org) redirect("/login");
  const nameOf = (id: string | null) => (id ? people.find((p) => p.id === id)?.user.name ?? "Someone" : null);
  const siteName = (id: string | null) => (id ? sites.find((s) => s.id === id)?.name ?? "A site" : null);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Company details, who gets notified, and who has admin access.</p>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<Building2 size={18} />} tone="orchid" />} title="Company" />
        <CardBody><OrgProfileForm org={org} /></CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<Siren size={18} />} tone="coral" />} title="Escalation rules" subtitle="Who gets a new report, how fast it needs an acknowledgement, and who is alerted if it doesn't get one. The most specific matching rule wins." />
        <CardBody className="space-y-5">
          {rules.length === 0 ? (
            <p className="rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink-600">No rules yet. New reports go to the safety lead of their site, or stay unassigned if a site has none. Reports that are unassigned appear on the Overview for the safety team.</p>
          ) : (
            <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200">
              {rules.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                  <p className="text-ink-800">
                    <strong>{severityInfo(r.minSeverity).label}</strong> or higher{r.category ? ` · ${categoryLabel(r.category, pack)}` : ""}{r.siteId ? ` · ${siteName(r.siteId)}` : ""}: assign to {nameOf(r.ownerId) ?? "the site safety lead"}, acknowledge within {r.respondWithinHours}h{r.escalateToId ? `, then alert ${nameOf(r.escalateToId)}` : ""}.
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
        <CardHeader icon={<IconBadge icon={<Layers size={18} />} tone="sage" />} title="Crews" subtitle="Groups such as a prewire crew or service team. Sites and roles are managed under People and Sites." />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {crews.map((d) => <span key={d.id} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">{d.name}</span>)}
            {crews.length === 0 && <p className="text-sm text-ink-500">No crews yet.</p>}
          </div>
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
        <CardHeader icon={<IconBadge icon={<LifeBuoy size={18} />} tone="olive" />} title="Optional: setup and advisor help" subtitle="Reldro works without this. If you'd like a hand configuring sites, rules or checklists, or want to talk through a safety program with an advisor, ask here. It's a paid add-on scoped and priced separately." />
        <CardBody><SetupSupportForm /></CardBody>
      </Card>

      <Card>
        <CardHeader icon={<IconBadge icon={<History size={18} />} tone="sage" />} title="Activity log" subtitle="Who changed what, most recent first." />
        <CardBody className="divide-y divide-ink-200 p-0">
          {auditLogs.map((log) => (
            <div key={log.id} className="px-4 py-3 sm:px-5">
              <p className="truncate text-sm text-ink-800">{describeAuditAction(log.action)}</p>
              <p className="text-xs text-ink-500">{log.user?.name ?? "System"} · {log.createdAt.toLocaleString()}</p>
            </div>
          ))}
          {auditLogs.length === 0 && <p className="p-5 text-sm text-ink-500">No activity recorded yet.</p>}
        </CardBody>
      </Card>

      <p className="flex items-center gap-2 px-1 text-xs text-ink-400"><HardHat size={14} /> Your data stays in your organization. Reldro staff don't see reports or investigations unless you ask for help and grant access.</p>
    </div>
  );
}
