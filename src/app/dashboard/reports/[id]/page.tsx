import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canContributeToIncident, canManageReport, canRunIncident, canSeeInvestigation, canSeeReport, canSeeReporter, isResponder, visibleEvents } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { categoryLabel, getPack, OPEN_ACTION_STATUSES, reportTypeLabel, SEVERITIES } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionStatusBadge, dueLabel, fmtDate, fmtDateTime, InvestigationStatusBadge, Photos, ReportStatusBadge, SeverityBadge } from "@/components/safety/ui";
import { ReportControls } from "@/components/safety/ReportControls";
import { CommentBox } from "@/components/safety/CommentBox";
import { ActionForm } from "@/components/safety/ActionForm";
import { TimelineSummaryDraft } from "@/components/safety/AiDraftButtons";
import { IncidentPanel } from "@/components/safety/IncidentPanel";
import { LocalTime } from "@/components/safety/LocalTime";
import { CloseoutForm, OpenIncidentForm, ReporterMessageBox } from "@/components/safety/IncidentControls";

const EVENT_LABEL: Record<string, { text: string; cls: string }> = {
  UPDATE: { text: "Update", cls: "bg-sky-soft text-sky-deep" },
  DECISION: { text: "Decision", cls: "bg-orchid-soft text-orchid-deep" },
  EVIDENCE: { text: "Evidence", cls: "bg-sage text-sage-deep" },
  INCIDENT: { text: "Incident", cls: "bg-coral-soft text-danger" },
  MESSAGE_TO_REPORTER: { text: "To reporter", cls: "bg-teal-soft text-teal-deep" },
  REPORTER_REPLY: { text: "From reporter", cls: "bg-gold-soft text-gold-deep" },
};

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireViewer();
  const { id } = await params;
  const report = await prisma.safetyReport.findFirst({
    where: { id, organizationId: v.organizationId },
    include: { site: true, investigation: true, incident: { include: { responders: true } }, actions: { orderBy: { number: "asc" } }, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!report || !canSeeReport(v, report)) notFound();

  const pack = getPack();
  const manage = canManageReport(v, report);
  const showReporter = canSeeReporter(v, report);
  const isOwnReport = v.employeeId !== null && report.reporterId === v.employeeId;
  const inc = report.incident;
  const runIncident = canRunIncident(v, report);
  const contribute = canContributeToIncident(v, report);
  const onTeam = Boolean(inc) && (v.isSafetyTeam || isResponder(v, report) || manage || (v.isSupervisor && v.siteId === report.siteId));
  const people = manage || v.isSupervisor || inc
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

  const events = visibleEvents(v, report, report.events);
  const inv = report.investigation;
  const invAccess = inv ? canSeeInvestigation(v, inv) : false;
  const late = report.respondBy && !report.acknowledgedAt && report.respondBy < new Date() && report.status !== "CLOSED";
  const canPropose = v.isSafetyTeam || v.isSupervisor || manage;
  const shownActions = report.actions;
  const now = new Date();
  const actionCounts = {
    total: shownActions.length,
    open: shownActions.filter((a) => OPEN_ACTION_STATUSES.includes(a.status)).length,
    overdue: shownActions.filter((a) => OPEN_ACTION_STATUSES.includes(a.status) && a.dueDate && a.dueDate < now).length,
    verified: shownActions.filter((a) => a.status === "VERIFIED").length,
  };
  const inspection = report.inspectionId ? await prisma.inspection.findFirst({ where: { id: report.inspectionId, organizationId: v.organizationId }, include: { template: { select: { name: true } } } }) : null;
  const fromInspection = inspection && v.isSafetyTeam ? inspection : null;
  const isReporterOnly = isOwnReport && !manage && !v.isSupervisor && !isResponder(v, report);

  return (
    <div className="min-h-full bg-surface-muted">
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-8 sm:py-8">
      <div>
        <Link href="/dashboard/reports" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Reports</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="tabular-nums text-xs text-ink-400">SR-{String(report.number).padStart(4, "0")}</span>
          {!isReporterOnly && <SeverityBadge severity={report.severity} suggested={!report.severityConfirmedAt} />}
          <ReportStatusBadge status={report.status} />
          <Badge>{reportTypeLabel(report.type)}</Badge>
          {inc && onTeam && <Badge tone={inc.status === "RESOLVED" ? "green" : "red"}>Incident response{inc.status === "RESOLVED" ? " (resolved)" : ""}</Badge>}
          {report.injuryInvolved && <Badge tone="red">Injury involved</Badge>}
          {report.privacy !== "NAMED" && <Badge tone="blue">{report.privacy === "ANONYMOUS" ? "Anonymous" : "Confidential"}</Badge>}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{report.title}</h1>
      </div>

      {late && (
        <p role="status" className="rounded-lg border border-amber-deep/25 bg-amber-soft px-4 py-3 text-sm text-amber-deep">
          Response overdue. The safety team was due to acknowledge this report by {fmtDateTime(report.respondBy)}.
        </p>
      )}
      {isOwnReport && report.status !== "CLOSED" && !manage && (
        <p className="rounded-lg bg-sage px-4 py-3 text-sm text-sage-deep">Thank you for reporting this. The safety team has the report{report.ownerId ? ` and it is with ${nameOf(report.ownerId) ?? "an owner"}` : ""}. Updates appear in the timeline.</p>
      )}

      {inc && onTeam && (
        <IncidentPanel
          reportId={report.id}
          severity={report.severity}
          severityConfirmed={Boolean(report.severityConfirmedAt)}
          siteName={report.site?.name ?? null}
          locationNote={report.locationNote}
          incident={{ status: inc.status, summary: inc.summary, nextAction: inc.nextAction, nextActionDueAt: inc.nextActionDueAt, openedAt: inc.openedAt, openedBy: inc.openedBy, leadId: inc.leadId, standDownReason: inc.standDownReason }}
          openedByName={inc.openedById ? nameOf(inc.openedById) : null}
          leadName={nameOf(inc.leadId)}
          responders={inc.responders.map((r) => ({ employeeId: r.employeeId, name: nameOf(r.employeeId) ?? "Someone", role: r.role }))}
          people={people.map((p) => ({ id: p.id, name: p.user.name }))}
          canRun={runIncident}
          canContribute={contribute}
          isSafetyTeam={v.isSafetyTeam}
          investigation={inv ? { id: inv.id, status: inv.status, accessible: invAccess, factors: invAccess ? inv.contributingFactors : [] } : null}
          actionCounts={actionCounts}
        />
      )}

      <Card tone="plain">
        <CardHeader title="What was reported" />
        <CardBody className="space-y-4">
          <p className="whitespace-pre-wrap text-sm text-ink-800">{report.description}</p>
          {report.immediateAction && (
            <div>
              <p className="text-xs font-medium text-ink-500">Action taken right away</p>
              <p className="text-sm text-ink-800">{report.immediateAction}</p>
            </div>
          )}
          <Photos items={report.attachments} />
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-ink-500">Topic</dt><dd>{categoryLabel(report.category, pack)}</dd></div>
            <div><dt className="text-xs text-ink-500">Where</dt><dd>{report.site?.name ?? "Site not specified"}{report.locationNote ? <span className="block text-xs text-ink-500">{report.locationNote}</span> : null}</dd></div>
            <div><dt className="text-xs text-ink-500">When</dt><dd><LocalTime value={report.occurredAt} withYear /></dd></div>
            <div><dt className="text-xs text-ink-500">Reported by</dt><dd>{report.reporterId === null ? "Anonymous (name not saved)" : showReporter ? nameOf(report.reporterId) ?? "—" : "Name not shared"}</dd></div>
            <div><dt className="text-xs text-ink-500">Owner</dt><dd>{nameOf(report.ownerId) ?? "No owner"}</dd></div>
            <div><dt className="text-xs text-ink-500">Response due</dt><dd>{report.respondBy ? fmtDateTime(report.respondBy) : "No rule matched"}{report.acknowledgedAt ? ` · acknowledged ${fmtDateTime(report.acknowledgedAt)}` : ""}</dd></div>
          </dl>
          {fromInspection && (
            <p className="text-sm text-ink-700">
              Raised from a failed item on{" "}
              <Link href={`/dashboard/inspections/${fromInspection.id}`} className="font-medium text-orchid-deep hover:text-oxblood">{fromInspection.template.name}</Link>.
            </p>
          )}
          {report.reporterId === null && manage && (
            <p className="rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-700">
              This reporter submitted without a name and holds a private case code. They see your messages only when they check the follow-up page with that code, so a reply may take time.
            </p>
          )}
          {report.aiAssisted && <p className="text-xs text-ink-400">The reporter used an AI draft and reviewed the details before submitting.</p>}
        </CardBody>
      </Card>

      {manage && (
        <Card tone="plain">
          <CardHeader title="Response" subtitle="Acknowledge, assign, and track this report." />
          <CardBody>
            <ReportControls
              reportId={report.id}
              status={report.status}
              severity={report.severity}
              severityConfirmed={Boolean(report.severityConfirmedAt)}
              category={report.category}
              ownerId={report.ownerId}
              acknowledged={Boolean(report.acknowledgedAt)}
              hasInvestigation={Boolean(inv)}
              isSafetyTeam={v.isSafetyTeam}
              people={people.map((p) => ({ id: p.id, name: p.user.name }))}
              severities={SEVERITIES.map((s) => ({ key: s.key, label: s.label }))}
              categories={pack.categories.map((c) => ({ key: c.key, label: c.label }))}
            />
            {v.isSafetyTeam && !inc && report.status !== "CLOSED" && (
              <div className="mt-4 border-t border-ink-200 pt-4">
                <p className="mb-2 text-xs text-ink-600">Most reports do not need an incident response. For a serious event, open a shared workspace with a response lead and a timeline.</p>
                <OpenIncidentForm reportId={report.id} people={people.map((p) => ({ id: p.id, name: p.user.name }))} defaultLeadId={report.ownerId} />
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {inv && (
        <Card tone="plain">
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

      <Card id="actions" className="scroll-mt-20">
        <CardHeader title="Corrective actions" subtitle="Fixes and follow-up tasks linked to this report." />
        <CardBody className="space-y-4">
          {shownActions.length === 0 ? (
            <p className="text-sm text-ink-500">No corrective actions yet.</p>
          ) : (
            <ul className="divide-y divide-ink-200/60 overflow-hidden rounded-lg bg-surface-muted">
              {shownActions.map((a) => {
                const due = dueLabel(a.dueDate, OPEN_ACTION_STATUSES.includes(a.status));
                return (
                  <li key={a.id}>
                    <Link href={`/dashboard/actions/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-hover">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900"><span className="tabular-nums text-xs text-ink-400">A-{a.number}</span> {a.title}</p>
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
            <details className="border-t border-ink-100 pt-3">
              <summary className="cursor-pointer text-sm font-medium text-ink-800">{v.isSafetyTeam ? "Add a corrective action" : "Propose a corrective action"}</summary>
              <div className="mt-3">
                <ActionForm reportId={report.id} people={people.map((p) => ({ id: p.id, name: p.user.name }))} severities={SEVERITIES.map((s) => ({ key: s.key, label: s.label }))} isSafetyTeam={v.isSafetyTeam} />
              </div>
            </details>
          )}
        </CardBody>
      </Card>

      <Card tone="plain">
        <CardHeader title="Timeline" subtitle="Events in time order." />
        <CardBody className="space-y-4">
          {manage && (
            <TimelineSummaryDraft reportId={report.id} />
          )}
          <ol className="space-y-4">
            {events.map((e) => {
              const label = EVENT_LABEL[e.type];
              const files = Array.isArray(e.attachments) ? (e.attachments as unknown[]) : [];
              return (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.type === "DECISION" ? "bg-brand-700" : e.type === "UPDATE" ? "bg-blue-500" : e.type === "INCIDENT" ? "bg-danger" : "bg-ink-300"}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-ink-800">
                      {label && <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${label.cls}`}>{label.text}</span>}
                      {e.message}
                      {e.restricted && <span className="ml-2 rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-600">Safety team only</span>}
                      {e.type === "AI_DRAFT" && <span className="ml-2 rounded bg-orchid-soft px-1.5 py-0.5 text-[10px] font-medium text-orchid-deep">AI-assisted</span>}
                    </p>
                    {files.length > 0 && <div className="mt-2"><Photos items={files} /></div>}
                    <p className="text-xs text-ink-500">{e.actorName ? `${e.actorName} · ` : ""}<LocalTime value={e.createdAt} /></p>
                  </div>
                </li>
              );
            })}
          </ol>
          {report.status !== "CLOSED" && (
            <div>
              <p className="mb-1 text-xs font-medium text-ink-600">{isReporterOnly ? "Reply to the safety team" : "Add a note or question"}</p>
              <CommentBox reportId={report.id} canRestrict={v.isSafetyTeam} />
            </div>
          )}
          {(runIncident || manage) && report.status !== "CLOSED" && (
            <div className="border-t border-ink-200 pt-4">
              <p className="mb-1 text-xs font-medium text-ink-600">Message the reporter</p>
              <ReporterMessageBox reportId={report.id} anonymous={report.reporterId === null} />
            </div>
          )}
          {report.closedAt && <p className="text-xs text-ink-400">Closed {fmtDate(report.closedAt)}</p>}
        </CardBody>
      </Card>

      {inc && onTeam && runIncident && (
        <Card tone="plain">
          <CardHeader title="Closeout" subtitle={inc.status === "RESOLVED" ? "How this response ended." : "Close out the response when the immediate situation is under control."} />
          <CardBody>
            <CloseoutForm reportId={report.id} resolved={inc.status === "RESOLVED"} closeoutSummary={inc.closeoutSummary} standDownReason={inc.standDownReason} openActions={actionCounts.open} />
            {inv && invAccess && (
              <p className="mt-4 text-xs text-ink-600">
                To share a lesson with crews without personal details, use the lesson section of the{" "}
                <Link href={`/dashboard/investigations/${inv.id}`} className="font-medium text-orchid-deep hover:text-oxblood">investigation</Link>.
              </p>
            )}
          </CardBody>
        </Card>
      )}
      {inc && onTeam && !runIncident && inc.status === "RESOLVED" && inc.closeoutSummary && (
        <Card tone="plain">
          <CardHeader title="Closeout" />
          <CardBody><p className="whitespace-pre-wrap text-sm text-ink-800">{inc.closeoutSummary}</p></CardBody>
        </Card>
      )}
    </div>
    </div>
  );
}
