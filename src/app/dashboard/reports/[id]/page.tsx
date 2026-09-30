import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManageReport, canSeeInvestigation, canSeeReport, canSeeReporter } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, OPEN_ACTION_STATUSES, reportTypeLabel, SEVERITIES } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionStatusBadge, dueLabel, fmtDate, fmtDateTime, InvestigationStatusBadge, Photos, ReportStatusBadge, SeverityBadge } from "@/components/safety/ui";
import { ReportControls } from "@/components/safety/ReportControls";
import { CommentBox } from "@/components/safety/CommentBox";
import { ActionForm } from "@/components/safety/ActionForm";
import { TimelineSummaryDraft } from "@/components/safety/AiDraftButtons";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const report = await prisma.safetyReport.findFirst({
    where: { id, organizationId: v.organizationId },
    include: { site: true, investigation: true, actions: { orderBy: { number: "asc" } }, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!report || !canSeeReport(v, report)) notFound();

  const pack = getPack();
  const manage = canManageReport(v, report);
  const showReporter = canSeeReporter(v, report);
  const isOwnReport = v.employeeId !== null && report.reporterId === v.employeeId;
  const people = manage || v.isSupervisor
    ? await prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } })
    : [];
  const personName = new Map(people.map((p) => [p.id, p.user.name]));
  const [reporter, owner] = await Promise.all([
    report.reporterId && showReporter && !personName.has(report.reporterId)
      ? prisma.employee.findUnique({ where: { id: report.reporterId }, include: { user: { select: { name: true } } } })
      : Promise.resolve(null),
    report.ownerId && !personName.has(report.ownerId) ? prisma.employee.findUnique({ where: { id: report.ownerId }, include: { user: { select: { name: true } } } }) : Promise.resolve(null),
  ]);
  const nameOf = (empId: string | null) => (empId ? personName.get(empId) ?? (reporter?.id === empId ? reporter.user.name : owner?.id === empId ? owner.user.name : "Someone") : null);

  const events = report.events.filter((e) => v.isSafetyTeam || !e.restricted);
  const inv = report.investigation;
  const invAccess = inv ? canSeeInvestigation(v, inv) : false;
  const late = report.respondBy && !report.acknowledgedAt && report.respondBy < new Date() && report.status !== "CLOSED";
  const canPropose = v.isSafetyTeam || v.isSupervisor || manage;
  const shownActions = report.actions;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div>
        <Link href="/dashboard/reports" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Reports</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-400">SR-{String(report.number).padStart(4, "0")}</span>
          <SeverityBadge severity={report.severity} />
          <ReportStatusBadge status={report.status} />
          <Badge>{reportTypeLabel(report.type)}</Badge>
          {report.injuryInvolved && <Badge tone="red">Injury involved</Badge>}
          {report.privacy !== "NAMED" && <Badge tone="blue">{report.privacy === "ANONYMOUS" ? "Anonymous" : "Confidential"}</Badge>}
        </div>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">{report.title}</h1>
      </div>

      {late && (
        <p role="status" className="rounded-lg bg-coral-soft px-4 py-3 text-sm text-danger">
          Response overdue. This report was due a response by {fmtDateTime(report.respondBy)} and hasn't been acknowledged.
        </p>
      )}
      {isOwnReport && report.status !== "CLOSED" && !manage && (
        <p className="rounded-lg bg-sage px-4 py-3 text-sm text-sage-deep">Thanks for reporting this. The safety team has it{report.ownerId ? ` and it's with ${nameOf(report.ownerId) ?? "an owner"}` : ""}. Updates will show below.</p>
      )}

      <Card>
        <CardHeader title="What was reported" />
        <CardBody className="space-y-4">
          <p className="whitespace-pre-wrap text-sm text-ink-800">{report.description}</p>
          {report.immediateAction && (
            <div>
              <p className="text-xs font-medium text-ink-500">Done right away</p>
              <p className="text-sm text-ink-800">{report.immediateAction}</p>
            </div>
          )}
          <Photos items={report.attachments} />
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-ink-500">Topic</dt><dd>{categoryLabel(report.category, pack)}</dd></div>
            <div><dt className="text-xs text-ink-500">Site</dt><dd>{report.site?.name ?? "Not specified"}</dd></div>
            <div><dt className="text-xs text-ink-500">When</dt><dd>{fmtDateTime(report.occurredAt)}</dd></div>
            <div><dt className="text-xs text-ink-500">Reported by</dt><dd>{report.reporterId === null ? "Anonymous" : showReporter ? nameOf(report.reporterId) ?? "—" : "Withheld (confidential)"}</dd></div>
            <div><dt className="text-xs text-ink-500">Owner</dt><dd>{nameOf(report.ownerId) ?? "Unassigned"}</dd></div>
            <div><dt className="text-xs text-ink-500">Response due</dt><dd>{report.respondBy ? fmtDateTime(report.respondBy) : "No rule matched"}{report.acknowledgedAt ? ` · acknowledged ${fmtDateTime(report.acknowledgedAt)}` : ""}</dd></div>
          </dl>
          {report.aiAssisted && <p className="text-[11px] text-ink-400">The reporter used an AI-assisted draft and confirmed the details before sending.</p>}
        </CardBody>
      </Card>

      {manage && (
        <Card>
          <CardHeader title="Response" subtitle="Acknowledge, route and track this report." />
          <CardBody>
            <ReportControls
              reportId={report.id}
              status={report.status}
              severity={report.severity}
              category={report.category}
              ownerId={report.ownerId}
              acknowledged={Boolean(report.acknowledgedAt)}
              hasInvestigation={Boolean(inv)}
              isSafetyTeam={v.isSafetyTeam}
              people={people.map((p) => ({ id: p.id, name: p.user.name }))}
              severities={SEVERITIES.map((s) => ({ key: s.key, label: s.label }))}
              categories={pack.categories.map((c) => ({ key: c.key, label: c.label }))}
            />
          </CardBody>
        </Card>
      )}

      {inv && (
        <Card>
          <CardHeader title="Investigation" action={<InvestigationStatusBadge status={inv.status} />} />
          <CardBody>
            {invAccess ? (
              <Link href={`/dashboard/investigations/${inv.id}`} className="text-sm font-medium text-orchid-deep hover:text-oxblood">Open the investigation workspace →</Link>
            ) : (
              <p className="text-sm text-ink-600">An investigation is {inv.status === "COMPLETE" ? "complete" : "under way"}. Details are limited to the safety team and the investigation lead.</p>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Corrective actions" subtitle="What will change because of this report." />
        <CardBody className="space-y-4">
          {shownActions.length === 0 ? (
            <p className="text-sm text-ink-500">No actions yet.</p>
          ) : (
            <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200">
              {shownActions.map((a) => {
                const due = dueLabel(a.dueDate, OPEN_ACTION_STATUSES.includes(a.status));
                return (
                  <li key={a.id}>
                    <Link href={`/dashboard/actions/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-ink-50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900"><span className="font-mono text-xs text-ink-400">A-{a.number}</span> {a.title}</p>
                        <p className={`text-xs ${due.overdue ? "font-medium text-danger" : "text-ink-500"}`}>{nameOf(a.ownerId) ?? "No owner"} · {due.text}</p>
                      </div>
                      <ActionStatusBadge status={a.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {canPropose && report.status !== "CLOSED" && (
            <details className="rounded-lg border border-ink-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-ink-800">{v.isSafetyTeam ? "Add a corrective action" : "Propose a corrective action"}</summary>
              <div className="mt-3">
                <ActionForm reportId={report.id} people={people.map((p) => ({ id: p.id, name: p.user.name }))} severities={SEVERITIES.map((s) => ({ key: s.key, label: s.label }))} isSafetyTeam={v.isSafetyTeam} />
              </div>
            </details>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Timeline" subtitle="Everything that happened, in order." />
        <CardBody className="space-y-4">
          {manage && (
            <TimelineSummaryDraft reportId={report.id} />
          )}
          <ol className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink-300" />
                <div className="min-w-0">
                  <p className="text-ink-800">
                    {e.message}
                    {e.restricted && <span className="ml-2 rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-600">Safety team only</span>}
                    {e.type === "AI_DRAFT" && <span className="ml-2 rounded bg-orchid-soft px-1.5 py-0.5 text-[10px] font-medium text-orchid-deep">AI-assisted</span>}
                  </p>
                  <p className="text-xs text-ink-400">{e.actorName ? `${e.actorName} · ` : ""}{fmtDateTime(e.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
          {report.status !== "CLOSED" && <CommentBox reportId={report.id} canRestrict={v.isSafetyTeam} />}
          {report.closedAt && <p className="text-xs text-ink-400">Closed {fmtDate(report.closedAt)}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
