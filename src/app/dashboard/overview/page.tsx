import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { actionWhere, reportWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { escalationTargetFor } from "@/lib/safety/routing";
import { categoryLabel, getPack, OPEN_ACTION_STATUSES, severityRank } from "@/lib/safety/pack";
import { Badge } from "@/components/ui/Badge";
import { ActionStatusBadge, dueLabel, fmtDate, ReportStatusBadge, SeverityBadge } from "@/components/safety/ui";
import { Queue, QueueRow } from "@/components/safety/Queue";

const ACTIVE_REPORT = ["NEW", "ASSIGNED", "INVESTIGATING", "ACTIONS_OPEN"];

/** Active incident responses this person is part of: all of them for the safety team, otherwise ones they lead, are on, or that are at the site they supervise. */
async function loadActiveIncidents(v: Awaited<ReturnType<typeof requireViewer>>) {
  const mine = v.employeeId
    ? [{ leadId: v.employeeId }, { responders: { some: { employeeId: v.employeeId } } }, ...(v.isSupervisor && v.siteId ? [{ report: { siteId: v.siteId } }] : [])]
    : [];
  if (!v.isSafetyTeam && mine.length === 0) return [];
  const rows = await prisma.incidentResponse.findMany({
    where: { organizationId: v.organizationId, status: { not: "RESOLVED" }, ...(v.isSafetyTeam ? {} : { OR: mine }) },
    include: { report: { include: { site: true } } },
    orderBy: { openedAt: "asc" },
    take: 10,
  });
  const leads = await prisma.employee.findMany({ where: { id: { in: rows.map((r) => r.leadId).filter((x): x is string => Boolean(x)) } }, include: { user: { select: { name: true } } } });
  const leadName = new Map(leads.map((l) => [l.id, l.user.name]));
  rows.sort((a, b) => severityRank(b.report.severity) - severityRank(a.report.severity));
  return rows.map((r) => ({ ...r, leadName: r.leadId ? leadName.get(r.leadId) ?? null : null }));
}

function IncidentQueue({ incidents, always }: { incidents: Awaited<ReturnType<typeof loadActiveIncidents>>; always: boolean }) {
  if (incidents.length === 0 && !always) return null;
  return (
    <Queue title="Active incident responses" count={incidents.length} href="/dashboard/reports?status=incidents" tone="alert" empty="No incident responses are open. They appear here when a serious event needs a coordinated response.">
      {incidents.map((i) => {
        const late = i.nextActionDueAt && i.nextActionDueAt < new Date();
        return (
          <QueueRow
            key={i.id}
            href={`/dashboard/reports/${i.reportId}`}
            title={i.report.title}
            meta={`SR-${String(i.report.number).padStart(4, "0")} · ${i.report.site?.name ?? "No site"} · Lead: ${i.leadName ?? "none yet"}${i.nextAction ? ` · Next: ${i.nextAction}` : ""}${late ? " (overdue)" : ""}`}
            right={<SeverityBadge severity={i.report.severity} suggested={!i.report.severityConfirmedAt} />}
          />
        );
      })}
    </Queue>
  );
}

export default async function OverviewPage() {
  const v = await requireViewer();
  const now = new Date();
  const soon = new Date(Date.now() + 7 * 86400_000);
  const in30 = new Date(Date.now() + 30 * 86400_000);
  const pack = getPack();

  const org = await prisma.organization.findUnique({ where: { id: v.organizationId }, select: { name: true } });
  const firstName = v.name.split(" ")[0];

  // ---- WORKER HOME -------------------------------------------------------
  if (!v.isSafetyTeam && !v.isSupervisor) {
    const [myReports, myActions, talks, acked, inspections, quals] = await Promise.all([
      prisma.safetyReport.findMany({ where: { ...reportWhere(v), status: { in: ACTIVE_REPORT } }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.correctiveAction.findMany({ where: { AND: [actionWhere(v), { ownerId: v.employeeId ?? "__none__", status: { in: OPEN_ACTION_STATUSES } }] }, orderBy: { dueDate: "asc" }, take: 5 }),
      prisma.toolboxTalk.findMany({ where: { organizationId: v.organizationId, scheduledFor: { gte: new Date(Date.now() - 30 * 86400_000) }, OR: [{ siteId: null }, { siteId: v.siteId ?? "__none__" }] }, orderBy: { scheduledFor: "desc" }, take: 10 }),
      prisma.talkAcknowledgement.findMany({ where: { employeeId: v.employeeId ?? "__none__" }, select: { talkId: true } }),
      prisma.inspection.findMany({ where: { organizationId: v.organizationId, status: "SCHEDULED", assigneeId: v.employeeId ?? "__none__" }, include: { template: true, site: true }, orderBy: { dueDate: "asc" }, take: 5 }),
      prisma.qualification.findMany({ where: { employeeId: v.employeeId ?? "__none__", expiresOn: { lte: in30 } }, orderBy: { expiresOn: "asc" } }),
    ]);
    const activeIncidents = await loadActiveIncidents(v);
    const ackedIds = new Set(acked.map((a) => a.talkId));
    const toAck = talks.filter((t) => !ackedIds.has(t.id));

    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Hi {firstName}</h1>
          <p className="text-sm text-ink-500">{org?.name}</p>
        </div>
        <Link href="/dashboard/reports/new" className="flex items-center justify-center gap-3 rounded-2xl bg-brand-700 px-6 py-6 text-lg font-semibold text-white shadow-sm hover:bg-brand-800">
          <Plus size={26} /> Report something
        </Link>
        <p className="-mt-2 text-center text-xs text-ink-500">A hazard, near miss, injury or anything that doesn't feel right. About a minute.</p>

        <IncidentQueue incidents={activeIncidents} always={false} />
        <Queue title="Toolbox talks to acknowledge" count={toAck.length} href="/dashboard/training" tone="alert" empty="You're up to date.">
          {toAck.slice(0, 3).map((t) => <QueueRow key={t.id} href="/dashboard/training" title={t.title} meta={fmtDate(t.scheduledFor)} right={<Badge tone="amber">Needs you</Badge>} />)}
        </Queue>
        <Queue title="My open reports" count={myReports.length} href="/dashboard/reports" empty="You have no open reports.">
          {myReports.map((r) => <QueueRow key={r.id} href={`/dashboard/reports/${r.id}`} title={r.title} meta={`SR-${String(r.number).padStart(4, "0")} · ${fmtDate(r.createdAt)}`} right={<ReportStatusBadge status={r.status} />} />)}
        </Queue>
        <Queue title="Actions assigned to me" count={myActions.length} href="/dashboard/actions" tone="alert" empty="Nothing assigned to you.">
          {myActions.map((a) => { const d = dueLabel(a.dueDate, true); return <QueueRow key={a.id} href={`/dashboard/actions/${a.id}`} title={a.title} meta={d.text} right={<ActionStatusBadge status={a.status} />} />; })}
        </Queue>
        {inspections.length > 0 && (
          <Queue title="Inspections assigned to me" count={inspections.length} href="/dashboard/inspections" empty="">
            {inspections.map((i) => <QueueRow key={i.id} href={`/dashboard/inspections/${i.id}`} title={`${i.template.name} · ${i.site.name}`} meta={dueLabel(i.dueDate, true).text} />)}
          </Queue>
        )}
        {quals.length > 0 && (
          <Queue title="My qualifications needing renewal" count={quals.length} tone="alert" empty="">
            {quals.map((q) => <li key={q.id} className="px-4 py-2.5 text-sm sm:px-5"><span className="font-medium text-ink-900">{q.name}</span> <span className="text-ink-500">{q.expiresOn && q.expiresOn < now ? "expired" : "expires"} {fmtDate(q.expiresOn)}</span></li>)}
          </Queue>
        )}
      </div>
    );
  }

  // ---- SUPERVISOR + SAFETY TEAM -----------------------------------------
  const scopedReports = reportWhere(v);
  const scopedActions = actionWhere(v);
  const scopedSite = v.isSafetyTeam ? {} : { siteId: v.siteId ?? "__none__" };

  const activeIncidents = await loadActiveIncidents(v);
  const [unassigned, overdueResponse, investigations, overdueActions, awaiting, proposed, inspections, qualsExpiring, talks, empCount, byCategory] = await Promise.all([
    prisma.safetyReport.findMany({ where: { AND: [scopedReports, { status: { in: ["NEW"] } }] }, orderBy: { createdAt: "asc" }, include: { site: true }, take: 6 }),
    prisma.safetyReport.findMany({ where: { AND: [scopedReports, { status: { in: ["NEW", "ASSIGNED"] }, acknowledgedAt: null, respondBy: { lt: now } }] }, orderBy: { respondBy: "asc" }, include: { site: true }, take: 6 }),
    v.isSafetyTeam ? prisma.investigation.findMany({ where: { organizationId: v.organizationId, status: { in: ["OPEN", "IN_REVIEW"] } }, include: { report: { include: { site: true } } }, take: 20 }) : Promise.resolve([]),
    prisma.correctiveAction.findMany({ where: { AND: [scopedActions, { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: now } }] }, orderBy: { dueDate: "asc" }, take: 6 }),
    v.isSafetyTeam ? prisma.correctiveAction.findMany({ where: { organizationId: v.organizationId, status: "COMPLETED" }, orderBy: { completedAt: "asc" }, take: 6 }) : Promise.resolve([]),
    v.isSafetyTeam ? prisma.correctiveAction.findMany({ where: { organizationId: v.organizationId, status: "PROPOSED" }, orderBy: { createdAt: "asc" }, take: 6 }) : Promise.resolve([]),
    prisma.inspection.findMany({ where: { organizationId: v.organizationId, status: "SCHEDULED", dueDate: { lte: soon }, ...scopedSite }, include: { template: true, site: true }, orderBy: { dueDate: "asc" }, take: 8 }),
    prisma.qualification.findMany({ where: { organizationId: v.organizationId, expiresOn: { lte: in30 }, ...(v.isSafetyTeam ? {} : { employeeId: { in: (await prisma.employee.findMany({ where: { organizationId: v.organizationId, siteId: v.siteId ?? "__none__" }, select: { id: true } })).map((e) => e.id) } }) }, orderBy: { expiresOn: "asc" }, take: 8 }),
    prisma.toolboxTalk.findMany({ where: { organizationId: v.organizationId, scheduledFor: { gte: new Date(Date.now() - 14 * 86400_000) } }, include: { _count: { select: { acknowledgements: true } } }, orderBy: { scheduledFor: "desc" }, take: 3 }),
    prisma.employee.count({ where: { organizationId: v.organizationId } }),
    v.isSafetyTeam ? prisma.safetyReport.groupBy({ by: ["category"], where: { organizationId: v.organizationId, createdAt: { gte: new Date(Date.now() - 90 * 86400_000) } }, _count: { _all: true } }) : Promise.resolve([]),
  ]);

  investigations.sort((a, b) => severityRank(b.report.severity) - severityRank(a.report.severity));
  const employees = await prisma.employee.findMany({ where: { id: { in: [...qualsExpiring.map((q) => q.employeeId)] } }, include: { user: { select: { name: true } } } });
  const empName = new Map(employees.map((e) => [e.id, e.user.name]));
  const escalations = await Promise.all(overdueResponse.map(async (r) => ({ r, to: await escalationTargetFor({ organizationId: v.organizationId, siteId: r.siteId, category: r.category, severity: r.severity }) })));
  const targetIds = escalations.map((e) => e.to).filter((x): x is string => Boolean(x));
  const targets = await prisma.employee.findMany({ where: { id: { in: targetIds } }, include: { user: { select: { name: true } } } });
  const targetName = new Map(targets.map((t) => [t.id, t.user.name]));
  const topCats = [...byCategory].sort((a, b) => b._count._all - a._count._all).slice(0, 5);
  const maxCat = Math.max(1, ...topCats.map((c) => c._count._all));

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{v.isSafetyTeam ? "Safety overview" : "Your site"}</h1>
          <p className="text-sm text-ink-500">{org?.name} · what needs attention today</p>
        </div>
      </div>

      <IncidentQueue incidents={activeIncidents} always={v.isSafetyTeam} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Queue title="Response overdue" count={overdueResponse.length} href="/dashboard/reports?status=open" tone="alert" empty="Every report has been acknowledged within its response time.">
          {escalations.map(({ r, to }) => (
            <QueueRow key={r.id} href={`/dashboard/reports/${r.id}`} title={r.title} meta={`${r.site?.name ?? "No site"} · due ${fmtDate(r.respondBy)}${to ? ` · escalate to ${targetName.get(to) ?? "a lead"}` : " · no escalation contact set"}`} right={<SeverityBadge severity={r.severity} />} />
          ))}
        </Queue>
        <Queue title="New and unassigned reports" count={unassigned.length} href="/dashboard/reports?status=open" tone="alert" empty="No new reports waiting.">
          {unassigned.map((r) => <QueueRow key={r.id} href={`/dashboard/reports/${r.id}`} title={r.title} meta={`${categoryLabel(r.category, pack)} · ${r.site?.name ?? "No site"} · ${fmtDate(r.createdAt)}`} right={<SeverityBadge severity={r.severity} />} />)}
        </Queue>
        {v.isSafetyTeam && (
          <Queue title="Active investigations" count={investigations.length} href="/dashboard/investigations" empty="No open investigations.">
            {investigations.slice(0, 6).map((i) => <QueueRow key={i.id} href={`/dashboard/investigations/${i.id}`} title={i.report.title} meta={`${i.report.site?.name ?? "No site"} · opened ${fmtDate(i.openedAt)}`} right={<SeverityBadge severity={i.report.severity} />} />)}
          </Queue>
        )}
        <Queue title="Overdue corrective actions" count={overdueActions.length} href="/dashboard/actions?view=overdue" tone="alert" empty="No overdue actions.">
          {overdueActions.map((a) => <QueueRow key={a.id} href={`/dashboard/actions/${a.id}`} title={a.title} meta={dueLabel(a.dueDate, true).text} right={<ActionStatusBadge status={a.status} />} />)}
        </Queue>
        {v.isSafetyTeam && (
          <Queue title="Actions waiting on you" count={awaiting.length + proposed.length} href="/dashboard/actions?view=attention" empty="No actions waiting for approval or verification.">
            {[...proposed, ...awaiting].slice(0, 6).map((a) => <QueueRow key={a.id} href={`/dashboard/actions/${a.id}`} title={a.title} meta={a.status === "PROPOSED" ? "Proposed. Needs approval" : "Marked done. Needs verification"} right={<ActionStatusBadge status={a.status} />} />)}
          </Queue>
        )}
        <Queue title="Inspections due in 7 days" count={inspections.length} href="/dashboard/inspections" tone="alert" empty="No inspections due soon.">
          {inspections.map((i) => { const d = dueLabel(i.dueDate, true); return <QueueRow key={i.id} href={`/dashboard/inspections/${i.id}`} title={`${i.template.name} · ${i.site.name}`} meta={d.text} right={d.overdue ? <Badge tone="red">Overdue</Badge> : undefined} />; })}
        </Queue>
        <Queue title="Qualifications expiring within 30 days" count={qualsExpiring.length} href="/dashboard/training?tab=qualifications" tone="alert" empty="No qualifications need renewal.">
          {qualsExpiring.map((q) => <QueueRow key={q.id} href="/dashboard/training?tab=qualifications" title={`${empName.get(q.employeeId) ?? "Someone"} · ${q.name}`} meta={`${q.expiresOn && q.expiresOn < now ? "Expired" : "Expires"} ${fmtDate(q.expiresOn)}`} />)}
        </Queue>
        <Queue title="Recent toolbox talks" count={talks.length} href="/dashboard/training" empty="No toolbox talks in the last two weeks.">
          {talks.map((t) => <QueueRow key={t.id} href="/dashboard/training" title={t.title} meta={fmtDate(t.scheduledFor)} right={<span className="text-xs text-ink-500 tabular-nums">{t._count.acknowledgements}/{empCount} acknowledged</span>} />)}
        </Queue>
      </div>

      {v.isSafetyTeam && topCats.length > 0 && (
        <div className="rounded-xl border border-ink-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Reports by topic, last 90 days</h2>
            <Link href="/dashboard/insights" className="text-xs font-medium text-orchid-deep hover:text-oxblood">See patterns →</Link>
          </div>
          <ul className="mt-3 space-y-2">
            {topCats.map((c) => (
              <li key={c.category} className="grid grid-cols-[minmax(0,14rem),1fr,2rem] items-center gap-3 text-sm">
                <span className="truncate text-ink-700">{categoryLabel(c.category, pack)}</span>
                <span className="h-2 rounded-full bg-surface-sunken"><span className="block h-2 rounded-full bg-orchid-deep" style={{ width: `${(c._count._all / maxCat) * 100}%` }} /></span>
                <span className="text-right tabular-nums text-ink-600">{c._count._all}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
