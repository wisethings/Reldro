import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { INSPECTION_KIND_LABEL } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { dueLabel, EmptyState, fmtDate, PageHeader } from "@/components/safety/ui";
import { DeleteTemplateButton, ScheduleInspectionForm, StarterTemplatesButton, TemplateForm } from "@/components/safety/InspectionForms";

import { StatStrip } from "@/components/safety/Dashboard";
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

  const inspScope = v.isSafetyTeam ? {} : v.isSupervisor && v.siteId ? { siteId: v.siteId } : { assigneeId: v.employeeId ?? "__none__" };
  const d30 = new Date(Date.now() - 30 * 86400_000);
  const [sDue, sLate, sDone, doneRows] = await Promise.all([
    prisma.inspection.count({ where: { organizationId: v.organizationId, status: "SCHEDULED", dueDate: { lte: new Date(Date.now() + 7 * 86400_000) }, ...inspScope } }),
    prisma.inspection.count({ where: { organizationId: v.organizationId, status: "SCHEDULED", dueDate: { lt: new Date() }, ...inspScope } }),
    prisma.inspection.count({ where: { organizationId: v.organizationId, status: "COMPLETED", completedAt: { gte: d30 }, ...inspScope } }),
    prisma.inspection.findMany({ where: { organizationId: v.organizationId, status: "COMPLETED", completedAt: { gte: d30 }, ...inspScope }, select: { results: true } }),
  ]);
  const sFailed = doneRows.reduce((n, r) => n + (r.results as { result: string }[]).filter((x) => x.result === "FAIL").length, 0);
  return (
    <div className="min-h-full bg-surface-muted">
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader title="Inspections" subtitle="Schedule recurring site inspections and job-start checks. Failed items can become corrective actions." />
      <StatStrip items={[
        { label: "Due in the next 7 days", value: sDue },
        { label: "Overdue", value: sLate, alert: sLate > 0 },
        { label: "Completed in the last 30 days", value: sDone },
        { label: "Failed items in the last 30 days", value: sFailed },
      ]} />

      <Card tone="plain">
        <CardHeader title="Due and upcoming" />
        {upcoming.length === 0 ? (
          <CardBody><p className="text-sm font-medium text-ink-800">No inspections scheduled</p><p className="mt-0.5 text-sm text-ink-500">{canSchedule ? "Schedule an inspection or create a checklist to get started." : "Inspections assigned to you will appear here."}</p></CardBody>
        ) : (
          <ul className="divide-y divide-ink-200">
            {upcoming.map((i) => {
              const d = dueLabel(i.dueDate, true);
              return (
                <li key={i.id}>
                  <Link href={`/dashboard/inspections/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-hover sm:px-5">
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
        <Card tone="plain">
          <CardHeader title="Schedule an inspection" subtitle="Choose a checklist, site, owner, and due date." />
          <CardBody>
            {templates.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-600">You do not have any checklists yet. Start with the standard set for specialty contractors (a weekly site walk, a job-start readiness check, and a quick observation), then edit them or add your own.</p>
                {v.isSafetyTeam && <StarterTemplatesButton />}
              </div>
            ) : (
              <ScheduleInspectionForm templates={templates.map((t) => ({ id: t.id, name: t.name }))} sites={sites.map((s) => ({ id: s.id, name: s.name }))} people={people.map((p) => ({ id: p.id, name: p.user.name }))} />
            )}
          </CardBody>
        </Card>
      )}

      {recent.length > 0 ? (
        <Card tone="plain">
          <CardHeader title="Recently completed" />
          <ul className="divide-y divide-ink-200">
            {recent.map((i) => {
              const failed = (i.results as { result: string }[]).filter((r) => r.result === "FAIL").length;
              return (
                <li key={i.id}>
                  <Link href={`/dashboard/inspections/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-hover sm:px-5">
                    <div><p className="text-sm font-medium text-ink-900">{i.template.name}</p><p className="text-xs text-ink-500">{i.site.name} · {fmtDate(i.completedAt)}</p></div>
                    {failed > 0 ? <Badge tone="red">{failed} failed</Badge> : <Badge tone="green">No failed items</Badge>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : upcoming.length === 0 && !canSchedule ? (
        <EmptyState title="No inspections assigned to you" body="Inspections assigned to you will appear here." />
      ) : null}

      {v.isSafetyTeam && (
        <Card tone="plain">
          <CardHeader title="Checklists" subtitle="Checklists used to run inspections." />
          <CardBody className="space-y-4">
            {templates.length > 0 && (
              <ul className="divide-y divide-ink-200/60 overflow-hidden rounded-lg bg-surface-muted">
                {templates.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>{t.name} <span className="text-xs text-ink-400">· {(t.items as unknown[]).length} items{t.frequencyDays ? ` · every ${t.frequencyDays} days` : ""}</span></span>
                    <DeleteTemplateButton templateId={t.id} />
                  </li>
                ))}
              </ul>
            )}
            <details className="rounded-lg bg-surface-muted p-3"><summary className="cursor-pointer text-sm font-medium text-ink-800">Create a checklist</summary><div className="mt-3"><TemplateForm /></div></details>
          </CardBody>
        </Card>
      )}
    </div>
    </div>
  );
}
