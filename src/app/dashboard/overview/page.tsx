import Link from "next/link";
import { BadgeCheck, Bell, CalendarCheck, CalendarDays, CheckCircle2, ClipboardCheck, Clock, FileText, Megaphone, Plus, Search, TriangleAlert, UserRound, ChartNoAxesColumn } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { actionWhere, reportWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { actionStatusInfo, getPack, OPEN_ACTION_STATUSES, severityRank } from "@/lib/safety/pack";
import { Badge } from "@/components/ui/Badge";
import { ActionStatusBadge, dueLabel, fmtDate, ReportStatusBadge, SeverityBadge } from "@/components/safety/ui";
import { Queue, QueueRow } from "@/components/safety/Queue";
import { ActivityList, AttentionRow, Panel, PulseGrid, PulseItem, StatBar, StatCard, StatStrip, StatusBanner, type ActivityItem } from "@/components/safety/Dashboard";

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
    <Queue title="Active incident responses" count={incidents.length} href="/dashboard/reports?status=incidents" tone="alert" empty="No incident responses are open. One appears here when an event needs a coordinated response.">
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

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ pulse?: string }> }) {
  const v = await requireViewer();
  const { pulse: pulseParam } = await searchParams;
  const pulseDays = [7, 30, 90].includes(Number(pulseParam)) ? Number(pulseParam) : 30;
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
    const updates = v.employeeId
      ? await prisma.reportEvent.findMany({
          where: { restricted: false, report: { reporterId: v.employeeId }, OR: [{ type: { in: ["ACKNOWLEDGED", "STATUS"] } }, { toReporter: true }] },
          include: { report: { select: { id: true, number: true, title: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [];

    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Hi {firstName}</h1>
          <p className="text-sm text-ink-500">{org?.name}</p>
        </div>
        <Link href="/dashboard/reports/new" className="flex items-center justify-center gap-3 rounded-2xl bg-brand-700 px-6 py-6 text-lg font-semibold text-white shadow-sm hover:bg-brand-800">
          <Plus size={26} /> Report a safety concern
        </Link>
        <p className="-mt-2 text-center text-xs text-ink-500">A hazard, near miss, injury, equipment issue, or other concern. It takes about a minute.</p>

        <StatStrip
          items={[
            { label: "Open reports", value: myReports.length, href: "/dashboard/reports" },
            { label: "Corrective actions assigned to me", value: myActions.length, href: "/dashboard/actions", alert: myActions.some((a) => a.dueDate && a.dueDate < now) },
            { label: "Toolbox talks to acknowledge", value: toAck.length, href: "/dashboard/training" },
            { label: "Qualifications due for renewal", value: quals.length },
          ]}
        />
        <IncidentQueue incidents={activeIncidents} always={false} />
        {updates.length > 0 && (
          <Panel icon={<Bell size={20} />} tint="orchid" title="Updates on your reports" subtitle="What has happened since you submitted them.">
            <ActivityList
              empty=""
              items={updates.map((e) => ({
                key: e.id,
                at: e.createdAt,
                icon: e.toReporter ? <FileText size={16} /> : <CheckCircle2 size={16} />,
                tint: e.toReporter ? "orchid" : "sage",
                text: e.toReporter ? "The safety team sent you a message" : e.message,
                meta: `SR-${String(e.report.number).padStart(4, "0")} · ${e.report.title}`,
                href: `/dashboard/reports/${e.report.id}`,
              }))}
            />
          </Panel>
        )}
        <Queue title="Toolbox talks to acknowledge" count={toAck.length} href="/dashboard/training" tone="alert" empty="You have acknowledged all recent toolbox talks.">
          {toAck.slice(0, 3).map((t) => <QueueRow key={t.id} href="/dashboard/training" title={t.title} meta={fmtDate(t.scheduledFor)} right={<Badge tone="amber">Needs your acknowledgement</Badge>} />)}
        </Queue>
        <Queue title="My open reports" count={myReports.length} href="/dashboard/reports" empty="You have no open reports. Reports you submit appear here.">
          {myReports.map((r) => <QueueRow key={r.id} href={`/dashboard/reports/${r.id}`} title={r.title} meta={`SR-${String(r.number).padStart(4, "0")} · ${fmtDate(r.createdAt)}`} right={<ReportStatusBadge status={r.status} />} />)}
        </Queue>
        <Queue title="Corrective actions assigned to me" count={myActions.length} href="/dashboard/actions" tone="alert" empty="No corrective actions are assigned to you.">
          {myActions.map((a) => { const d = dueLabel(a.dueDate, true); return <QueueRow key={a.id} href={`/dashboard/actions/${a.id}`} title={a.title} meta={d.text} right={<ActionStatusBadge status={a.status} />} />; })}
        </Queue>
        {inspections.length > 0 && (
          <Queue title="Inspections assigned to me" count={inspections.length} href="/dashboard/inspections" empty="">
            {inspections.map((i) => <QueueRow key={i.id} href={`/dashboard/inspections/${i.id}`} title={`${i.template.name} · ${i.site.name}`} meta={dueLabel(i.dueDate, true).text} />)}
          </Queue>
        )}
        {quals.length > 0 && (
          <Queue title="My qualifications due for renewal" count={quals.length} tone="alert" empty="">
            {quals.map((q) => <li key={q.id} className="px-4 py-2.5 text-sm sm:px-5"><span className="font-medium text-ink-900">{q.name}</span> <span className="text-ink-500">{q.expiresOn && q.expiresOn < now ? "expired" : "expires"} {fmtDate(q.expiresOn)}</span></li>)}
          </Queue>
        )}
      </div>
    );
  }

  // ---- SUPERVISOR + SAFETY TEAM -----------------------------------------
  const scopedReports = reportWhere(v);
  const scopedActions = actionWhere(v);
  const siteScope = v.isSafetyTeam ? {} : { siteId: v.siteId ?? "__none__" };
  const siteEmployeeIds = v.isSafetyTeam ? null : (await prisma.employee.findMany({ where: { organizationId: v.organizationId, siteId: v.siteId ?? "__none__" }, select: { id: true } })).map((e) => e.id);
  const qualWhere = { organizationId: v.organizationId, expiresOn: { lte: in30 }, ...(siteEmployeeIds ? { employeeId: { in: siteEmployeeIds } } : {}) };
  const respWhere = { AND: [scopedReports, { status: { in: ["NEW", "ASSIGNED"] }, acknowledgedAt: null, respondBy: { lt: now } }] };
  const noOwnerWhere = { AND: [scopedReports, { ownerId: null, status: { not: "CLOSED" } }] };
  const overdueWhere = { AND: [scopedActions, { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: now } }] };
  const waitWhere = { organizationId: v.organizationId, status: { in: ["PROPOSED", "COMPLETED"] } };
  const invWhere = { organizationId: v.organizationId, status: { in: ["OPEN", "IN_REVIEW"] } };
  const inspWhere = { organizationId: v.organizationId, status: "SCHEDULED", dueDate: { lte: soon }, ...siteScope };
  const since = new Date(Date.now() - pulseDays * 86400_000);
  const before = new Date(Date.now() - 2 * pulseDays * 86400_000);
  const win = (from: Date, to: Date) => ({ gte: from, lt: to });
  const FEED_TYPES = ["CREATED", "ACKNOWLEDGED", "STATUS", "INCIDENT", "INVESTIGATION", "UPDATE", "DECISION", "ACTION"];

  const [
    activeIncidents, respCount, respFirst, noOwnerCount, noOwnerFirst, invCount, invFirst, overdueCount, overdueFirst, waitCount, waitFirst,
    inspCount, inspFirst, qualCount, qualFirst, talks, empCount, events, doneInspections,
    repNow, repPrev, invNow, invPrev, actNow, actPrev, inspNow, inspPrev, verNow, verPrev, incNow, incPrev,
  ] = await Promise.all([
    loadActiveIncidents(v),
    prisma.safetyReport.count({ where: respWhere }),
    prisma.safetyReport.findFirst({ where: respWhere, orderBy: { respondBy: "asc" }, include: { site: true } }),
    prisma.safetyReport.count({ where: noOwnerWhere }),
    prisma.safetyReport.findFirst({ where: noOwnerWhere, orderBy: { createdAt: "asc" }, include: { site: true } }),
    v.isSafetyTeam ? prisma.investigation.count({ where: invWhere }) : Promise.resolve(0),
    v.isSafetyTeam ? prisma.investigation.findFirst({ where: invWhere, orderBy: { openedAt: "asc" }, include: { report: true } }) : Promise.resolve(null),
    prisma.correctiveAction.count({ where: overdueWhere }),
    prisma.correctiveAction.findFirst({ where: overdueWhere, orderBy: { dueDate: "asc" } }),
    v.isSafetyTeam ? prisma.correctiveAction.count({ where: waitWhere }) : Promise.resolve(0),
    v.isSafetyTeam ? prisma.correctiveAction.findFirst({ where: waitWhere, orderBy: { updatedAt: "asc" } }) : Promise.resolve(null),
    prisma.inspection.count({ where: inspWhere }),
    prisma.inspection.findFirst({ where: inspWhere, orderBy: { dueDate: "asc" }, include: { template: true, site: true } }),
    prisma.qualification.count({ where: qualWhere }),
    prisma.qualification.findFirst({ where: qualWhere, orderBy: { expiresOn: "asc" } }),
    prisma.toolboxTalk.findMany({ where: { organizationId: v.organizationId, scheduledFor: { gte: new Date(Date.now() - 14 * 86400_000) } }, include: { _count: { select: { acknowledgements: true } } }, orderBy: { scheduledFor: "desc" }, take: 3 }),
    prisma.employee.count({ where: { organizationId: v.organizationId } }),
    prisma.reportEvent.findMany({
      where: { restricted: false, type: { in: FEED_TYPES }, report: scopedReports },
      include: { report: { select: { id: true, number: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.inspection.findMany({ where: { organizationId: v.organizationId, status: "COMPLETED", completedAt: { gte: new Date(Date.now() - 14 * 86400_000) }, ...siteScope }, include: { template: true, site: true }, orderBy: { completedAt: "desc" }, take: 4 }),
    prisma.safetyReport.count({ where: { AND: [scopedReports, { createdAt: win(since, new Date()) }] } }),
    prisma.safetyReport.count({ where: { AND: [scopedReports, { createdAt: win(before, since) }] } }),
    v.isSafetyTeam ? prisma.investigation.count({ where: { organizationId: v.organizationId, openedAt: win(since, new Date()) } }) : prisma.investigation.count({ where: { organizationId: v.organizationId, openedAt: win(since, new Date()), report: scopedReports } }),
    v.isSafetyTeam ? prisma.investigation.count({ where: { organizationId: v.organizationId, openedAt: win(before, since) } }) : prisma.investigation.count({ where: { organizationId: v.organizationId, openedAt: win(before, since), report: scopedReports } }),
    prisma.correctiveAction.count({ where: { AND: [scopedActions, { createdAt: win(since, new Date()) }] } }),
    prisma.correctiveAction.count({ where: { AND: [scopedActions, { createdAt: win(before, since) }] } }),
    prisma.inspection.count({ where: { organizationId: v.organizationId, status: "COMPLETED", completedAt: win(since, new Date()), ...siteScope } }),
    prisma.inspection.count({ where: { organizationId: v.organizationId, status: "COMPLETED", completedAt: win(before, since), ...siteScope } }),
    prisma.correctiveAction.count({ where: { AND: [scopedActions, { verifiedAt: win(since, new Date()) }] } }),
    prisma.correctiveAction.count({ where: { AND: [scopedActions, { verifiedAt: win(before, since) }] } }),
    prisma.incidentResponse.count({ where: { organizationId: v.organizationId, openedAt: win(since, new Date()), ...(v.isSafetyTeam ? {} : { report: scopedReports }) } }),
    prisma.incidentResponse.count({ where: { organizationId: v.organizationId, openedAt: win(before, since), ...(v.isSafetyTeam ? {} : { report: scopedReports }) } }),
  ]);

  const qualPerson = qualFirst ? await prisma.employee.findUnique({ where: { id: qualFirst.employeeId }, include: { user: { select: { name: true } } } }) : null;
  const refOf = (n: number) => `SR-${String(n).padStart(4, "0")}`;
  const topIncident = activeIncidents[0];

  const attention = activeIncidents.length + respCount + noOwnerCount + overdueCount + waitCount;
  const urgent = activeIncidents.length + respCount > 0;
  const parts = [
    activeIncidents.length ? `${activeIncidents.length} active incident response${activeIncidents.length === 1 ? "" : "s"}` : null,
    respCount ? `${respCount} report${respCount === 1 ? "" : "s"} past ${respCount === 1 ? "its" : "their"} response time` : null,
    noOwnerCount ? `${noOwnerCount} report${noOwnerCount === 1 ? "" : "s"} without an owner` : null,
    overdueCount ? `${overdueCount} overdue corrective action${overdueCount === 1 ? "" : "s"}` : null,
    waitCount ? `${waitCount} corrective action${waitCount === 1 ? "" : "s"} waiting for approval or verification` : null,
  ].filter(Boolean) as string[];

  // Recent activity: report events, completed inspections and toolbox talks, newest first.
  const feed: ActivityItem[] = [];
  for (const e of events) {
    if (/^(No email|Email|Sample workspace)/.test(e.message)) continue;
    const ref = `${refOf(e.report.number)} · ${e.report.title}`;
    const href = `/dashboard/reports/${e.report.id}`;
    const by = e.actorName ? `${e.actorName} · ` : "";
    if (e.type === "CREATED") feed.push({ key: e.id, at: e.createdAt, icon: <FileText size={16} />, tint: "orchid", text: `New report: ${e.report.title}`, meta: `${refOf(e.report.number)} · ${by.replace(/ · $/, "") || "Submitted"}`, href });
    else if (e.type === "ACKNOWLEDGED") feed.push({ key: e.id, at: e.createdAt, icon: <CheckCircle2 size={16} />, tint: "sage", text: "Report acknowledged", meta: `${by}${ref}`, href });
    else if (e.type === "INCIDENT") feed.push({ key: e.id, at: e.createdAt, icon: <Bell size={16} />, tint: "coral", text: e.message, meta: `${by}${ref}`, href });
    else if (e.type === "INVESTIGATION") feed.push({ key: e.id, at: e.createdAt, icon: <Search size={16} />, tint: "orchid", text: e.message, meta: `${by}${ref}`, href });
    else if (e.type === "ACTION") feed.push({ key: e.id, at: e.createdAt, icon: <ClipboardCheck size={16} />, tint: "gold", text: e.message, meta: `${by}${ref}`, href });
    else if (e.type === "UPDATE" || e.type === "DECISION") feed.push({ key: e.id, at: e.createdAt, icon: <Bell size={16} />, tint: "coral", text: `${e.type === "DECISION" ? "Decision" : "Update"}: ${e.message.length > 110 ? `${e.message.slice(0, 109)}…` : e.message}`, meta: `${by}${ref}`, href });
    else if (e.type === "STATUS") feed.push({ key: e.id, at: e.createdAt, icon: <CheckCircle2 size={16} />, tint: "neutral", text: e.message, meta: `${by}${ref}`, href });
  }
  for (const i of doneInspections) {
    const failed = (i.results as { result: string }[]).filter((r) => r.result === "FAIL").length;
    feed.push({ key: `i${i.id}`, at: i.completedAt ?? i.createdAt, icon: <CalendarCheck size={16} />, tint: "orchid", text: `${i.template.name} completed at ${i.site.name}`, meta: failed ? `${failed} failed item${failed === 1 ? "" : "s"}` : "No failed items", href: `/dashboard/inspections/${i.id}` });
  }
  for (const t of talks) feed.push({ key: `t${t.id}`, at: t.scheduledFor, icon: <Megaphone size={16} />, tint: "gold", text: `Toolbox talk: ${t.title}`, meta: `${t._count.acknowledgements} of ${empCount} acknowledged`, href: "/dashboard/training" });
  feed.sort((a, b) => b.at.getTime() - a.at.getTime());
  const recent = feed.slice(0, 8);

  const chip = (active: boolean) => `rounded-full border px-2.5 py-1 text-xs font-medium ${active ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`;

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-4 sm:p-5">
      <div>
        <h1 className="text-lg font-semibold text-ink-900">{v.isSafetyTeam ? "Safety overview" : "Your site"}</h1>
        <p className="text-sm text-ink-500">{org?.name} · what needs attention today</p>
      </div>

      <StatBar cols={v.isSafetyTeam ? 5 : 4}>
        <StatCard href="/dashboard/reports?status=incidents" icon={<Bell size={22} />} tint="coral" value={activeIncidents.length} label="Active incidents" alert={activeIncidents.length > 0} />
        <StatCard href="/dashboard/reports?status=open" icon={<Clock size={22} />} tint="coral" value={respCount} label="Response overdue" alert={respCount > 0} />
        <StatCard href="/dashboard/reports?status=open" icon={<UserRound size={22} />} tint="coral" value={noOwnerCount} label="Reports without an owner" alert={noOwnerCount > 0} />
        {v.isSafetyTeam && <StatCard href="/dashboard/investigations" icon={<Search size={22} />} tint="orchid" value={invCount} label="Active investigations" />}
        <StatCard href="/dashboard/actions?view=overdue" icon={<TriangleAlert size={22} />} tint="gold" value={overdueCount} label="Overdue actions" alert={overdueCount > 0} />
      </StatBar>

      {attention === 0 ? (
        <StatusBanner tone="calm" title="Nothing needs attention right now" body="There are no active incident responses, overdue items, or reports waiting for an owner. Upcoming deadlines are listed below." />
      ) : (
        <StatusBanner tone={urgent ? "urgent" : "watch"} title={`${attention} ${attention === 1 ? "item needs" : "items need"} attention`} body={`${parts.join(", ")}.`} />
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel icon={<TriangleAlert size={20} />} tint="coral" title="Needs attention" subtitle="Items that need a decision or follow-up.">
          <AttentionRow
            href="/dashboard/reports?status=incidents" icon={<Bell size={18} />} tint="coral" alert title="Active incident responses" count={activeIncidents.length}
            detail={topIncident ? `${topIncident.report.title} · Lead: ${topIncident.leadName ?? "none yet"}` : "No incident responses are open. One appears here when an event needs a coordinated response."}
          />
          <AttentionRow
            href={respFirst ? `/dashboard/reports/${respFirst.id}` : "/dashboard/reports?status=open"} icon={<Clock size={18} />} tint="coral" alert title="Response overdue" count={respCount}
            detail={respFirst ? `${respFirst.title} · ${respFirst.site?.name ?? "Site not given"}` : "Every report was acknowledged within its response time."}
          />
          <AttentionRow
            href={noOwnerFirst ? `/dashboard/reports/${noOwnerFirst.id}` : "/dashboard/reports?status=open"} icon={<UserRound size={18} />} tint="coral" alert title="New reports without an owner" count={noOwnerCount}
            detail={noOwnerFirst ? `${noOwnerFirst.title} · ${noOwnerFirst.site?.name ?? "Site not given"}` : "No new reports are waiting for an owner."}
          />
          {v.isSafetyTeam && (
            <AttentionRow
              href="/dashboard/actions?view=attention" icon={<ClipboardCheck size={18} />} tint="gold" title="Corrective actions waiting for you" count={waitCount}
              detail={waitFirst ? `${waitFirst.title} · ${waitFirst.status === "PROPOSED" ? "Needs approval" : actionStatusInfo(waitFirst.status).label}` : "No corrective actions are waiting for approval or verification."}
            />
          )}
          <AttentionRow
            href="/dashboard/actions?view=overdue" icon={<TriangleAlert size={18} />} tint="gold" alert title="Overdue corrective actions" count={overdueCount}
            detail={overdueFirst ? `${overdueFirst.title} · ${dueLabel(overdueFirst.dueDate, true).text}` : "No corrective actions are overdue."}
          />
        </Panel>

        <Panel icon={<CalendarDays size={20} />} tint="orchid" title="Upcoming and in progress" subtitle="Deadlines and work under way.">
          <AttentionRow
            href="/dashboard/inspections" icon={<CalendarDays size={18} />} tint="orchid" title="Inspections due in the next 7 days" count={inspCount}
            detail={inspFirst ? `${inspFirst.template.name} · ${inspFirst.site.name} · ${dueLabel(inspFirst.dueDate, true).text}` : "No inspections are due in the next 7 days."}
          />
          <AttentionRow
            href="/dashboard/training?tab=qualifications" icon={<BadgeCheck size={18} />} tint="sage" title="Qualifications expiring in the next 30 days" count={qualCount}
            detail={qualFirst ? `${qualPerson?.user.name ?? "Someone"} · ${qualFirst.name} · ${qualFirst.expiresOn && qualFirst.expiresOn < now ? "expired" : "expires"} ${fmtDate(qualFirst.expiresOn)}` : "No qualifications expire in the next 30 days."}
          />
          {v.isSafetyTeam && (
            <AttentionRow
              href="/dashboard/investigations" icon={<Search size={18} />} tint="orchid" title="Active investigations" count={invCount}
              detail={invFirst ? `${invFirst.report.title} · opened ${fmtDate(invFirst.openedAt)}` : "No investigations are active."}
            />
          )}
          <AttentionRow
            href="/dashboard/training" icon={<Megaphone size={18} />} tint="gold" title="Recent toolbox talks" count={talks.length}
            detail={talks[0] ? `${talks[0].title} · ${talks[0]._count.acknowledgements} of ${empCount} acknowledged` : "No toolbox talks in the last two weeks."}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel
          icon={<FileText size={20} />} tint="orchid" title="Recent activity" subtitle="Latest updates across reports, investigations, and corrective actions."
          action={<Link href="/dashboard/reports?status=all" className="shrink-0 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50">View all</Link>}
        >
          <ActivityList items={recent} empty="No recent activity. New activity appears here as reports are submitted, investigations are opened, or corrective actions are updated." />
        </Panel>

        <Panel
          icon={<ChartNoAxesColumn size={20} />} tint="orchid" title="Activity pulse" subtitle="Counts of what was reported and done. They show volume, not how safe a site is."
          action={
            <div className="flex shrink-0 gap-1" role="group" aria-label="Time period">
              {[7, 30, 90].map((n) => <Link key={n} href={`?pulse=${n}`} className={chip(pulseDays === n)} aria-pressed={pulseDays === n}>{n} days</Link>)}
            </div>
          }
        >
          <PulseGrid>
            <PulseItem icon={<FileText size={16} />} tint="orchid" value={repNow} previous={repPrev} days={pulseDays} label="Reports submitted" />
            <PulseItem icon={<Search size={16} />} tint="orchid" value={invNow} previous={invPrev} days={pulseDays} label="Investigations opened" />
            <PulseItem icon={<ClipboardCheck size={16} />} tint="gold" value={actNow} previous={actPrev} days={pulseDays} label="Corrective actions created" />
            <PulseItem icon={<CalendarCheck size={16} />} tint="orchid" value={inspNow} previous={inspPrev} days={pulseDays} label="Inspections completed" />
            <PulseItem icon={<CheckCircle2 size={16} />} tint="sage" value={verNow} previous={verPrev} days={pulseDays} label="Corrective actions verified" />
            <PulseItem icon={<Bell size={16} />} tint="coral" value={incNow} previous={incPrev} days={pulseDays} label="Incident responses opened" />
          </PulseGrid>
        </Panel>
      </div>
    </div>
  );
}
