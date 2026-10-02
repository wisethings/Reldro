import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { BadgeCheck, Bell, CalendarCheck, CalendarDays, CheckCircle2, ClipboardCheck, Clock, FileText, Megaphone, Plus, Search, TriangleAlert, UserRound, ChartNoAxesColumn } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { actionWhere, reportWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { actionStatusInfo, getPack, OPEN_ACTION_STATUSES, severityRank } from "@/lib/safety/pack";
import { Badge } from "@/components/ui/Badge";
import { ActionStatusBadge, dueLabel, fmtDate, fmtShort, ReportStatusBadge, SeverityBadge } from "@/components/safety/ui";
import { AcknowledgeButton } from "@/components/safety/TrainingForms";
import { Queue, QueueRow } from "@/components/safety/Queue";
import { ActivityList, FocusList, Panel, PulseLine, QuietActivity, SectionTitle, StatStrip, TextLink, UpcomingRow, type ActivityItem, type FocusEntry } from "@/components/safety/Dashboard";
import { dayStartIn, daysUntil, isOverdue, startOfTodayUTC } from "@/lib/safety/dates";
import { REPORT_LIST_FIELDS } from "@/lib/safety/selects";
import { GetStarted } from "@/components/safety/GetStarted";

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
  const today = startOfTodayUTC();
  const soon = dayStartIn(8); // through the end of the 7th day from today
  const in30 = dayStartIn(31);
  const pack = getPack();

  const org = await prisma.organization.findUnique({ where: { id: v.organizationId }, select: { name: true } });
  const firstName = v.name.split(" ")[0];

  // ---- WORKER HOME -------------------------------------------------------
  if (!v.isSafetyTeam && !v.isSupervisor) {
    const [myReports, myActions, talks, acked, inspections, quals] = await Promise.all([
      prisma.safetyReport.findMany({ where: { ...reportWhere(v), status: { in: ACTIVE_REPORT } }, orderBy: { createdAt: "desc" }, select: REPORT_LIST_FIELDS, take: 5 }),
      prisma.correctiveAction.findMany({ where: { AND: [actionWhere(v), { ownerId: v.employeeId ?? "__none__", status: { in: OPEN_ACTION_STATUSES } }] }, orderBy: { dueDate: "asc" }, take: 5 }),
      prisma.toolboxTalk.findMany({ where: { organizationId: v.organizationId, scheduledFor: { gte: new Date(Date.now() - 30 * 86400_000) }, OR: [{ siteId: null }, { siteId: v.siteId ?? "__none__" }] }, orderBy: { scheduledFor: "desc" }, take: 10 }),
      prisma.talkAcknowledgement.findMany({ where: { employeeId: v.employeeId ?? "__none__" }, select: { talkId: true } }),
      prisma.inspection.findMany({ where: { organizationId: v.organizationId, status: "SCHEDULED", assigneeId: v.employeeId ?? "__none__" }, include: { template: true, site: true }, orderBy: { dueDate: "asc" }, take: 5 }),
      prisma.qualification.findMany({ where: { employeeId: v.employeeId ?? "__none__", expiresOn: { lt: in30 } }, orderBy: { expiresOn: "asc" } }),
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

    const late = myActions.filter((a) => isOverdue(a.dueDate)).length;
    const expiredQuals = quals.filter((q) => isOverdue(q.expiresOn)).length;
    const needsAction = toAck.length + myActions.length + quals.length + inspections.length;
    const dueTone = (due: Date | null) => {
      if (!due) return "text-ink-500";
      const days = daysUntil(due);
      return days < 0 ? "font-semibold text-danger" : days <= 3 ? "font-semibold text-amber-deep" : "text-ink-600";
    };
    const rowCls = "flex min-h-[2.75rem] items-center justify-between gap-3 px-4 py-2 outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500";
    const SubHead = ({ id, title, count, href }: { id: string; title: string; count: number; href?: string }) => (
      <div id={id} className="flex scroll-mt-4 items-baseline justify-between gap-3 border-y border-ink-100 bg-surface-muted/60 px-4 py-1.5 first:border-t-0">
        <h3 className="text-xs font-semibold text-ink-700">{title}<span className="ml-1.5 font-normal tabular-nums text-ink-500">{count}</span></h3>
        {href && <Link href={href} className="text-xs font-medium text-orchid-deep hover:text-oxblood">View all →</Link>}
      </div>
    );

    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-4">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Hi {firstName}</h1>
          <p className="text-sm text-ink-500">{org?.name}</p>
        </div>
        <Link href="/dashboard/reports/new" className="group flex h-14 items-center justify-between gap-3 rounded-xl bg-brand-700 px-5 text-white outline-none hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
          <span className="flex items-center gap-2.5 text-sm font-semibold"><Plus size={18} aria-hidden /> Report a safety concern</span>
          <span className="hidden truncate text-xs text-white/75 sm:block">A hazard, near miss, injury, or equipment issue. Takes about a minute.</span>
          <span aria-hidden className="text-sm transition-transform group-hover:translate-x-0.5">→</span>
        </Link>

        <StatStrip
          large
          items={[
            { label: "Talks to acknowledge", value: toAck.length, href: "#talks" },
            { label: "Corrective actions assigned to me", value: myActions.length, href: "#actions", alert: late > 0 },
            { label: "Qualifications due for renewal", value: quals.length, href: "#quals", alert: expiredQuals > 0 },
            { label: "Open reports", value: myReports.length, href: "#reports" },
          ]}
        />

        <IncidentQueue incidents={activeIncidents} always={false} />

        <section aria-labelledby="action-needed" className="overflow-hidden surface">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <h2 id="action-needed" className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              {needsAction > 0 && <span aria-hidden className="h-2 w-2 rounded-full bg-amber-deep" />}Action needed
            </h2>
            <span className="text-xs text-ink-500">{needsAction > 0 ? `${needsAction} ${needsAction === 1 ? "item" : "items"}` : "All caught up"}</span>
          </div>

          <SubHead id="talks" title="Toolbox talks to acknowledge" count={toAck.length} href="/dashboard/training" />
          {toAck.length === 0 ? (
            <p className="px-4 py-2.5 text-sm text-ink-500">You have acknowledged all recent toolbox talks.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {toAck.slice(0, 3).map((t) => (
                <li key={t.id} className={rowCls}>
                  <Link href="/dashboard/training" className="min-w-0 flex-1 outline-none">
                    <p className="truncate text-sm font-medium text-ink-900">{t.title}</p>
                    <p className="text-xs text-ink-500">{fmtDate(t.scheduledFor)}</p>
                  </Link>
                  <AcknowledgeButton talkId={t.id} compact />
                </li>
              ))}
            </ul>
          )}

          <SubHead id="actions" title="Corrective actions assigned to me" count={myActions.length} href="/dashboard/actions" />
          {myActions.length === 0 ? (
            <p className="px-4 py-2.5 text-sm text-ink-500">No corrective actions are assigned to you.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {myActions.map((a) => {
                const d = dueLabel(a.dueDate, true);
                return (
                  <li key={a.id}>
                    <Link href={`/dashboard/actions/${a.id}`} className={rowCls}>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{a.title}</span>
                      <span className={`shrink-0 text-xs ${dueTone(a.dueDate)}`}>{d.text}</span>
                      <span className="hidden shrink-0 sm:block"><ActionStatusBadge status={a.status} /></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {quals.length > 0 && (
            <>
              <SubHead id="quals" title="Qualifications due for renewal" count={quals.length} />
              <ul className="divide-y divide-ink-100">
                {quals.map((q) => {
                  const expired = isOverdue(q.expiresOn);
                  return (
                    <li key={q.id} className="flex min-h-[2.75rem] flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">{q.name}</p>
                        <p className="text-xs text-ink-500">{expired ? "Expired" : "Expires"} {fmtDate(q.expiresOn)}. Ask your supervisor to arrange renewal.</p>
                      </div>
                      <Badge tone={expired ? "red" : "amber"}>{expired ? "Expired" : dueLabel(q.expiresOn, true).text.replace("Due", "Expires")}</Badge>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {inspections.length > 0 && (
            <>
              <SubHead id="inspections" title="Inspections assigned to me" count={inspections.length} href="/dashboard/inspections" />
              <ul className="divide-y divide-ink-100">
                {inspections.map((i) => (
                  <li key={i.id}>
                    <Link href={`/dashboard/inspections/${i.id}`} className={rowCls}>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{i.template.name} <span className="font-normal text-ink-500">· {i.site.name}</span></span>
                      <span className={`shrink-0 text-xs ${dueTone(i.dueDate)}`}>{dueLabel(i.dueDate, true).text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section id="reports" aria-labelledby="my-reports" className="scroll-mt-4 overflow-hidden surface">
            <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
              <h2 id="my-reports" className="text-sm font-semibold text-ink-900">My open reports</h2>
              <Link href="/dashboard/reports" className="text-xs font-medium text-orchid-deep hover:text-oxblood">View all →</Link>
            </div>
            {myReports.length === 0 ? (
              <p className="border-t border-ink-100 px-4 py-3 text-sm text-ink-500">You have no open reports. Reports you submit appear here.</p>
            ) : (
              <ul className="divide-y divide-ink-100 border-t border-ink-100">
                {myReports.map((r) => (
                  <li key={r.id}>
                    <Link href={`/dashboard/reports/${r.id}`} className={rowCls}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">{r.title}</span>
                        <span className="block text-xs text-ink-500"><span className="tabular-nums">SR-{String(r.number).padStart(4, "0")}</span> · {fmtDate(r.createdAt)}</span>
                      </span>
                      <ReportStatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="updates" className="overflow-hidden surface">
            <div className="px-4 py-2.5"><h2 id="updates" className="text-sm font-semibold text-ink-900">Updates on your reports</h2></div>
            {updates.length === 0 ? (
              <p className="border-t border-ink-100 px-4 py-3 text-sm text-ink-500">Nothing new. Updates appear here when the safety team responds.</p>
            ) : (
              <ul className="divide-y divide-ink-100 border-t border-ink-100">
                {updates.map((e) => (
                  <li key={e.id}>
                    <Link href={`/dashboard/reports/${e.report.id}`} className={rowCls}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink-900">{e.toReporter ? "The safety team sent you a message" : e.message}</span>
                        <span className="block truncate text-xs text-ink-500"><span className="tabular-nums">SR-{String(e.report.number).padStart(4, "0")}</span> · {e.report.title}</span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-500">{fmtShort(e.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ---- SUPERVISOR + SAFETY TEAM -----------------------------------------
  const scopedReports = reportWhere(v);
  const scopedActions = actionWhere(v);
  const siteScope = v.isSafetyTeam ? {} : { siteId: v.siteId ?? "__none__" };
  const siteEmployeeIds = v.isSafetyTeam ? null : (await prisma.employee.findMany({ where: { organizationId: v.organizationId, siteId: v.siteId ?? "__none__" }, select: { id: true } })).map((e) => e.id);
  const qualWhere = { organizationId: v.organizationId, expiresOn: { lt: in30 }, ...(siteEmployeeIds ? { employeeId: { in: siteEmployeeIds } } : {}) };
  const respWhere = { AND: [scopedReports, { status: { in: ["NEW", "ASSIGNED"] }, acknowledgedAt: null, respondBy: { lt: now } }] };
  const noOwnerWhere = { AND: [scopedReports, { ownerId: null, status: { not: "CLOSED" } }] };
  const overdueWhere = { AND: [scopedActions, { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: today } }] };
  const waitWhere = { organizationId: v.organizationId, status: { in: ["PROPOSED", "COMPLETED"] } };
  const invWhere = { organizationId: v.organizationId, status: { in: ["OPEN", "IN_REVIEW"] } };
  const inspWhere = { organizationId: v.organizationId, status: "SCHEDULED", dueDate: { lt: soon }, ...siteScope };
  const since = new Date(Date.now() - pulseDays * 86400_000);
  const before = new Date(Date.now() - 2 * pulseDays * 86400_000);
  const win = (from: Date, to: Date) => ({ gte: from, lt: to });
  const FEED_TYPES = ["CREATED", "ACKNOWLEDGED", "STATUS", "INCIDENT", "INVESTIGATION", "UPDATE", "DECISION", "ACTION"];

  const [
    activeIncidents, respCount, respItems, noOwnerCount, noOwnerItems, invCount, invFirst, overdueCount, overdueItems, waitCount, waitItems,
    inspCount, inspItems, qualCount, qualItems, talks, empCount, events, doneInspections,
    repNow, repPrev, invNow, invPrev, actNow, actPrev, inspNow, inspPrev, verNow, verPrev, incNow, incPrev,
  ] = await Promise.all([
    loadActiveIncidents(v),
    prisma.safetyReport.count({ where: respWhere }),
    prisma.safetyReport.findMany({ where: respWhere, orderBy: { respondBy: "asc" }, select: { ...REPORT_LIST_FIELDS, site: true }, take: 3 }),
    prisma.safetyReport.count({ where: noOwnerWhere }),
    prisma.safetyReport.findMany({ where: noOwnerWhere, orderBy: { createdAt: "asc" }, select: { ...REPORT_LIST_FIELDS, site: true }, take: 3 }),
    v.isSafetyTeam ? prisma.investigation.count({ where: invWhere }) : Promise.resolve(0),
    v.isSafetyTeam ? prisma.investigation.findFirst({ where: invWhere, orderBy: { openedAt: "asc" }, include: { report: true } }) : Promise.resolve(null),
    prisma.correctiveAction.count({ where: overdueWhere }),
    prisma.correctiveAction.findMany({ where: overdueWhere, orderBy: { dueDate: "asc" }, take: 3 }),
    v.isSafetyTeam ? prisma.correctiveAction.count({ where: waitWhere }) : Promise.resolve(0),
    v.isSafetyTeam ? prisma.correctiveAction.findMany({ where: waitWhere, orderBy: { updatedAt: "asc" }, take: 3 }) : Promise.resolve([]),
    prisma.inspection.count({ where: inspWhere }),
    prisma.inspection.findMany({ where: inspWhere, orderBy: { dueDate: "asc" }, include: { template: true, site: true }, take: 3 }),
    prisma.qualification.count({ where: qualWhere }),
    prisma.qualification.findMany({ where: qualWhere, orderBy: { expiresOn: "asc" }, take: 3 }),
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

  const qualPeople = qualItems.length ? await prisma.employee.findMany({ where: { id: { in: qualItems.map((q) => q.employeeId) } }, include: { user: { select: { name: true } } } }) : [];
  const personName = (id: string) => qualPeople.find((p) => p.id === id)?.user.name ?? "Someone";
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
    if (e.type === "CREATED") feed.push({ key: e.id, at: e.createdAt, icon: <FileText size={16} />, tint: "sky", text: `New report: ${e.report.title}`, meta: `${refOf(e.report.number)} · ${by.replace(/ · $/, "") || "Submitted"}`, href });
    else if (e.type === "ACKNOWLEDGED") feed.push({ key: e.id, at: e.createdAt, icon: <CheckCircle2 size={16} />, tint: "sage", text: "Report acknowledged", meta: `${by}${ref}`, href });
    else if (e.type === "INCIDENT") feed.push({ key: e.id, at: e.createdAt, icon: <Bell size={16} />, tint: "coral", text: e.message, meta: `${by}${ref}`, href });
    else if (e.type === "INVESTIGATION") feed.push({ key: e.id, at: e.createdAt, icon: <Search size={16} />, tint: "orchid", text: e.message, meta: `${by}${ref}`, href });
    else if (e.type === "ACTION") feed.push({ key: e.id, at: e.createdAt, icon: <ClipboardCheck size={16} />, tint: "indigo", text: e.message, meta: `${by}${ref}`, href });
    else if (e.type === "UPDATE" || e.type === "DECISION") feed.push({ key: e.id, at: e.createdAt, icon: <Bell size={16} />, tint: "amber", text: `${e.type === "DECISION" ? "Decision" : "Update"}: ${e.message.length > 110 ? `${e.message.slice(0, 109)}…` : e.message}`, meta: `${by}${ref}`, href });
    else if (e.type === "STATUS") feed.push({ key: e.id, at: e.createdAt, icon: <CheckCircle2 size={16} />, tint: "neutral", text: e.message, meta: `${by}${ref}`, href });
  }
  for (const i of doneInspections) {
    const failed = (i.results as { result: string }[]).filter((r) => r.result === "FAIL").length;
    feed.push({ key: `i${i.id}`, at: i.completedAt ?? i.createdAt, icon: <CalendarCheck size={16} />, tint: "teal", text: `${i.template.name} completed at ${i.site.name}`, meta: failed ? `${failed} failed item${failed === 1 ? "" : "s"}` : "No failed items", href: `/dashboard/inspections/${i.id}` });
  }
  for (const t of talks) feed.push({ key: `t${t.id}`, at: t.scheduledFor, icon: <Megaphone size={16} />, tint: "sky", text: `Toolbox talk: ${t.title}`, meta: `${t._count.acknowledgements} of ${empCount} acknowledged`, href: "/dashboard/training" });
  feed.sort((a, b) => b.at.getTime() - a.at.getTime());
  const recent = feed.slice(0, 8);

  const chip = (active: boolean) => `rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"}`;
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const overdueBy = (d: Date | null) => (d ? dueLabel(d, true).text : "");

  // The list the page exists for: specific items, most urgent first. Incidents and late responses come before the rest.
  const focus: FocusEntry[] = [
    ...activeIncidents.map((i): FocusEntry => ({
      key: `inc${i.id}`, tier: "urgent", title: i.report.title, tag: "Incident response",
      reason: `${i.report.site ? `${i.report.site.name} · ` : ""}Lead: ${i.leadName ?? "none yet"}${i.nextAction ? ` · Next: ${i.nextAction}` : ""}`,
      action: "Open workspace", href: `/dashboard/reports/${i.reportId}`,
    })),
    ...respItems.map((r): FocusEntry => ({ key: `resp${r.id}`, tier: "urgent", title: r.title, tag: "Response overdue", reason: `${r.site ? `${r.site.name} · ` : ""}not yet acknowledged`, action: "Respond", href: `/dashboard/reports/${r.id}` })),
    ...overdueItems.map((a): FocusEntry => ({ key: `od${a.id}`, tier: "overdue", title: a.title, tag: overdueBy(a.dueDate), reason: `Corrective action A-${a.number}`, action: "Open", href: `/dashboard/actions/${a.id}` })),
    ...noOwnerItems.map((r): FocusEntry => ({ key: `own${r.id}`, tier: "next", title: r.title, tag: "No owner", reason: `${r.site ? `${r.site.name} · ` : ""}new report`, action: "Assign an owner", href: `/dashboard/reports/${r.id}` })),
    ...waitItems.map((a): FocusEntry => ({ key: `wait${a.id}`, tier: "next", title: a.title, tag: a.status === "PROPOSED" ? "Needs approval" : "Ready to verify", reason: `Corrective action A-${a.number}`, action: a.status === "PROPOSED" ? "Review" : "Verify", href: `/dashboard/actions/${a.id}` })),
  ];
  const shown = focus.slice(0, 8);
  // Where to see everything, with a count only where it helps decide which list to open.
  const seeAll = [
    { n: activeIncidents.length, text: plural(activeIncidents.length, "incident response"), href: "/dashboard/reports?status=incidents" },
    { n: respCount, text: `${respCount} late ${respCount === 1 ? "response" : "responses"}`, href: "/dashboard/reports?status=open" },
    { n: overdueCount, text: `${overdueCount} overdue ${overdueCount === 1 ? "action" : "actions"}`, href: "/dashboard/actions?view=overdue" },
    { n: noOwnerCount, text: `${noOwnerCount} without an owner`, href: "/dashboard/reports?status=open" },
    { n: waitCount, text: `${waitCount} waiting on you`, href: "/dashboard/actions?view=attention" },
  ].filter((m) => m.n > 0);

  const summary = attention === 0
    ? "Nothing needs your attention right now."
    : `${plural(attention, "item")} ${attention === 1 ? "needs" : "need"} your attention${urgent ? `, ${activeIncidents.length + respCount} of them urgent` : ""}.`;

  // Coming up: dated items, soonest first, capped so it stays a glance.
  type Up = { key: string; at: number; when: string; title: string; detail?: string; href: string; warn: boolean };
  const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const up: Up[] = [
    ...inspItems.map((i): Up => ({ key: `i${i.id}`, at: i.dueDate.getTime(), when: isOverdue(i.dueDate) ? "Overdue" : shortDate(i.dueDate), title: `${i.template.name}`, detail: i.site.name, href: `/dashboard/inspections/${i.id}`, warn: isOverdue(i.dueDate) })),
    ...qualItems.map((q): Up => ({ key: `q${q.id}`, at: q.expiresOn?.getTime() ?? 0, when: isOverdue(q.expiresOn) ? "Expired" : q.expiresOn ? shortDate(q.expiresOn) : "", title: `${personName(q.employeeId)}: ${q.name}`, detail: "Qualification", href: "/dashboard/training?tab=qualifications", warn: Boolean(q.expiresOn && q.expiresOn < now) })),
  ].sort((a, b) => a.at - b.at).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{v.isSafetyTeam ? "Safety overview" : "Your site"}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-ink-600">
          <span aria-hidden className={`h-2 w-2 rounded-full ${attention === 0 ? "bg-sage-deep" : urgent ? "bg-danger" : "bg-amber-deep"}`} />
          {org?.name} · {summary}
        </p>
      </header>

      {v.isAdmin && <GetStarted organizationId={v.organizationId} />}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <section aria-labelledby="attention" className="surface p-4 sm:p-5">
          <SectionTitle>
            <span id="attention">Needs your attention</span>
          </SectionTitle>
          {shown.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink-200 px-5 py-8 text-center">
              <p className="text-sm font-medium text-ink-900">You’re caught up</p>
              <p className="mx-auto mt-1 max-w-[36ch] text-balance text-sm text-ink-600">Nothing is late or waiting on you. Upcoming work is on the right.</p>
            </div>
          ) : (
            <FocusList entries={shown} />
          )}
          {focus.length > shown.length && (
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
              <span>Showing {shown.length} of {attention}. See all:</span>
              {seeAll.map((m) => <Link key={m.text} href={m.href} className="font-medium text-orchid-deep hover:text-oxblood">{m.text}</Link>)}
            </p>
          )}
        </section>

        <aside aria-labelledby="coming-up" className="space-y-4">
          <section className="surface p-4 sm:p-5">
            <SectionTitle action={<TextLink href="/dashboard/inspections">All inspections</TextLink>}>
              <span id="coming-up">Coming up</span>
            </SectionTitle>
            {up.length === 0 ? (
              <p className="text-sm text-ink-500">No inspections due or qualifications expiring soon.</p>
            ) : (
              <ul className="-mx-1 divide-y divide-ink-100 px-1">
                {up.map((u) => <UpcomingRow key={u.key} href={u.href} when={u.when} title={u.title} detail={u.detail} warn={u.warn} />)}
              </ul>
            )}
            {v.isSafetyTeam && invCount > 0 && (
              <p className="mt-3 text-xs text-ink-600">
                <Link href="/dashboard/investigations" className="font-medium text-orchid-deep hover:text-oxblood">{plural(invCount, "investigation")} in progress →</Link>
              </p>
            )}
          </section>
        </aside>
      </div>

      <section className="mt-8 surface p-4 sm:p-5" aria-labelledby="recent">
        <SectionTitle action={<TextLink href="/dashboard/reports?status=all">View all reports</TextLink>}>
          <span id="recent">Recent activity</span>
        </SectionTitle>
        <QuietActivity items={recent.slice(0, 6)} empty="No recent activity yet. Updates appear here as reports come in and work moves." />
      </section>

      <section className="mt-8 surface p-5" aria-labelledby="pulse">
        <SectionTitle
          action={
            <div className="flex gap-0.5" role="group" aria-label="Time period">
              {[7, 30, 90].map((n) => <QueryLink key={n} href={`?pulse=${n}`} className={chip(pulseDays === n)} aria-pressed={pulseDays === n}>{n} days</QueryLink>)}
            </div>
          }
        >
          <span id="pulse">Last {pulseDays} days</span>
        </SectionTitle>
        <p className="mb-4 text-xs text-ink-500">Volume of what was reported and done. It does not show how safe a site is.</p>
        <PulseLine
          days={pulseDays}
          items={[
            { label: "Reports submitted", value: repNow, previous: repPrev },
            { label: "Investigations opened", value: invNow, previous: invPrev },
            { label: "Corrective actions created", value: actNow, previous: actPrev },
            { label: "Corrective actions verified", value: verNow, previous: verPrev },
            { label: "Inspections completed", value: inspNow, previous: inspPrev },
            { label: "Incident responses", value: incNow, previous: incPrev },
          ]}
        />
      </section>
    </div>
  );
}
