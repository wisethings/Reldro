import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { INSPECTION_KIND_LABEL } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { dueLabel, EmptyState, fmtDate, PageHeader } from "@/components/safety/ui";
import { DeleteTemplateButton, ScheduleInspectionForm, StarterTemplatesButton, TemplateForm } from "@/components/safety/InspectionForms";

export default async function InspectionsPage() {
  const v = await requireViewer();
  const siteScope = v.isSafetyTeam ? {} : v.isSupervisor ? { siteId: v.siteId ?? "__none__" } : { assigneeId: v.employeeId ?? "__none__" };
  const canSchedule = v.isSafetyTeam || v.isSupervisor;

  const [upcoming, recent, templates, sites, people] = await Promise.all([
    prisma.inspection.findMany({ where: { organizationId: v.organizationId, status: "SCHEDULED", ...siteScope }, include: { template: true, site: true }, orderBy: { dueDate: "asc" }, take: 50 }),
    prisma.inspection.findMany({ where: { organizationId: v.organizationId, status: "COMPLETED", ...siteScope }, include: { template: true, site: true }, orderBy: { completedAt: "desc" }, take: 10 }),
    canSchedule ? prisma.inspectionTemplate.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canSchedule ? prisma.site.findMany({ where: { organizationId: v.organizationId, active: true, ...(v.isSafetyTeam ? {} : { id: v.siteId ?? "__none__" }) }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canSchedule ? prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Inspections" subtitle="Recurring site inspections, job-start readiness checks and quick observations. Failed items become corrective actions." />

      <Card>
        <CardHeader title="Due and upcoming" />
        {upcoming.length === 0 ? (
          <CardBody><p className="text-sm text-ink-500">Nothing scheduled.{canSchedule ? " Schedule one below." : ""}</p></CardBody>
        ) : (
          <ul className="divide-y divide-ink-200">
            {upcoming.map((i) => {
              const d = dueLabel(i.dueDate, true);
              return (
                <li key={i.id}>
                  <Link href={`/dashboard/inspections/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-ink-50 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{i.template.name}</p>
                      <p className="text-xs text-ink-500">{i.site.name} · {INSPECTION_KIND_LABEL[i.template.kind]}</p>
                    </div>
                    <span className={`text-xs font-medium ${d.overdue ? "text-danger" : "text-ink-600"}`}>{d.text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {canSchedule && (
        <Card>
          <CardHeader title="Schedule an inspection" />
          <CardBody>
            {templates.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-600">You don't have any checklists yet. Start with the standard set for specialty contractors (weekly site walk, job-start readiness, quick observation), then edit or add your own.</p>
                {v.isSafetyTeam && <StarterTemplatesButton />}
              </div>
            ) : (
              <ScheduleInspectionForm templates={templates.map((t) => ({ id: t.id, name: t.name }))} sites={sites.map((s) => ({ id: s.id, name: s.name }))} people={people.map((p) => ({ id: p.id, name: p.user.name }))} />
            )}
          </CardBody>
        </Card>
      )}

      {recent.length > 0 ? (
        <Card>
          <CardHeader title="Recently completed" />
          <ul className="divide-y divide-ink-200">
            {recent.map((i) => {
              const failed = (i.results as { result: string }[]).filter((r) => r.result === "FAIL").length;
              return (
                <li key={i.id}>
                  <Link href={`/dashboard/inspections/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-ink-50 sm:px-5">
                    <div><p className="text-sm font-medium text-ink-900">{i.template.name}</p><p className="text-xs text-ink-500">{i.site.name} · {fmtDate(i.completedAt)}</p></div>
                    {failed > 0 ? <Badge tone="red">{failed} failed</Badge> : <Badge tone="green">All clear</Badge>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : upcoming.length === 0 && !canSchedule ? (
        <EmptyState title="No inspections assigned to you" />
      ) : null}

      {v.isSafetyTeam && (
        <Card>
          <CardHeader title="Checklists" subtitle="The forms used for inspections." />
          <CardBody className="space-y-4">
            {templates.length > 0 && (
              <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200">
                {templates.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>{t.name} <span className="text-xs text-ink-400">· {(t.items as unknown[]).length} items{t.frequencyDays ? ` · every ${t.frequencyDays} days` : ""}</span></span>
                    <DeleteTemplateButton templateId={t.id} />
                  </li>
                ))}
              </ul>
            )}
            <details className="rounded-lg border border-ink-200 p-3"><summary className="cursor-pointer text-sm font-medium text-ink-800">Create a checklist</summary><div className="mt-3"><TemplateForm /></div></details>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
