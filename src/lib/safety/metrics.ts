import { isOverdue, startOfDayUTC } from "./dates";
import { coverage, requirementsFor, type CertPerson, type CertRecord, type CertType, type Requirement } from "./certifications";

/**
 * Everything the Insights and site pages show, computed from plain rows in one place so the page, the exports and the
 * tests agree. Nothing here touches the database: callers load the rows (for one site or for all of them) and pass them in.
 */

export type Targets = {
  /** Median hours from report to first acknowledgement, at most. */
  ackHours: number;
  /** Share of reports acknowledged by their response deadline, at least (%). */
  responsePct: number;
  /** Corrective actions allowed to be overdue right now, at most. */
  overdueActions: number;
  /** Share of corrective actions finished by their due date, at least (%). */
  actionOnTimePct: number;
  /** Share of inspections completed by their due date, at least (%). */
  inspectionOnTimePct: number;
  /** Share of people who acknowledged the toolbox talks they were asked to, at least (%). */
  talkAckPct: number;
  /** Share of required certifications held and not expired, at least (%). */
  certPct: number;
};

export const DEFAULT_TARGETS: Targets = { ackHours: 24, responsePct: 90, overdueActions: 0, actionOnTimePct: 85, inspectionOnTimePct: 95, talkAckPct: 90, certPct: 95 };

/** The largest value each target may take. Shared by the form and by `readTargets`, so they can't disagree. */
export const TARGET_LIMITS: Record<keyof Targets, number> = { ackHours: 720, responsePct: 100, overdueActions: 1000, actionOnTimePct: 100, inspectionOnTimePct: 100, talkAckPct: 100, certPct: 100 };

/** Only the targets this company actually set, ignoring anything missing or out of range so a bad value can never break the page. */
export function readSavedTargets(raw: unknown): Partial<Targets> {
  const out: Partial<Targets> = {};
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_TARGETS) as (keyof Targets)[]) {
    const n = src[key];
    if (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= TARGET_LIMITS[key]) out[key] = n;
  }
  return out;
}

/** The targets in force: what the company set, and the defaults for everything else. */
export function readTargets(raw: unknown): Targets {
  return { ...DEFAULT_TARGETS, ...readSavedTargets(raw) };
}

export type SiteRef = { id: string; name: string; active: boolean; safetyLeadId: string | null };
export type PersonRef = { id: string; name: string; siteId: string | null; departmentId: string | null; crew: string | null };
export type ReportRow = { id: string; type: string; category: string; severity: string; status: string; siteId: string | null; ownerId: string | null; createdAt: Date; acknowledgedAt: Date | null; respondBy: Date | null };
export type ActionRow = { id: string; status: string; priority: string; dueDate: Date | null; completedAt: Date | null; verifiedAt: Date | null; createdAt: Date; ownerId: string | null; siteId: string | null };
export type InspectionRow = { id: string; siteId: string; status: string; dueDate: Date; completedAt: Date | null; results: { result: string; label: string }[] };
export type TalkRow = { id: string; title: string; siteId: string | null; scheduledFor: Date; ackedBy: string[] };
export type IncidentRow = { siteId: string | null; status: string; openedAt: Date; resolvedAt: Date | null; standDownReason: string };
export type InvestigationRow = { siteId: string | null; status: string; openedAt: Date; completedAt: Date | null; factors: string[] };

export type MetricsInput = {
  now: Date;
  days: number;
  /** null = all sites. */
  siteId: string | null;
  sites: SiteRef[];
  people: PersonRef[];
  /** Reports created in the previous period, this period, or still open: the loader fetches that union. */
  reports: ReportRow[];
  actions: ActionRow[];
  inspections: InspectionRow[];
  talks: TalkRow[];
  certTypes: CertType[];
  certRecords: CertRecord[];
  incidents: IncidentRow[];
  investigations: InvestigationRow[];
  targets: Targets;
  categoryLabel: (key: string) => string;
};

export type Tally = { label: string; count: number };
export type KpiStatus = "met" | "missed" | "nodata";
export type Kpi = { key: keyof Targets; label: string; value: number | null; display: string; target: string; status: KpiStatus; note: string; href?: string };
export type Gap = { id: string; text: string; count: number; href: string; tone: "bad" | "warn" };
export type SiteRow = {
  id: string; name: string; active: boolean; hasLead: boolean;
  reports: number; openReports: number; responseOverdue: number; responsePct: number | null;
  overdueActions: number; inspectionsOverdue: number; inspectionPct: number | null;
  talkPct: number | null; certPct: number | null; certProblems: number;
  missedTargets: number;
};
export type CertProblem = { person: string; site: string | null; cert: string; state: "expired" | "missing" | "expiring"; expiresOn: Date | null };

export type Metrics = {
  scope: { siteId: string | null; siteName: string | null; days: number };
  reports: {
    total: number; prevTotal: number; openNow: number; unownedOpen: number; responseOverdueNow: number;
    aging: { fresh: number; mid: number; old: number };
    medianAckHours: number | null; responsePct: number | null; responseMet: number; responseMissed: number;
    byType: Tally[]; bySeverity: Tally[]; byCategory: Tally[]; bySite: (Tally & { siteId: string | null })[];
    trend: { label: string; count: number; serious: number }[];
    repeats: Tally[];
    incidents: { total: number; open: number; avgDaysToResolve: number | null };
  };
  investigations: { opened: number; completed: number; avgDaysToComplete: number | null; factors: Tally[] };
  actions: { openNow: number; overdueNow: number; readyToVerify: number; dueInPeriod: number; onTime: number; onTimePct: number | null; avgDaysToVerify: number | null; byPriority: Tally[]; overdueByOwner: Tally[] };
  inspections: { dueInPeriod: number; onTime: number; late: number; overdueNow: number; onTimePct: number | null; itemsChecked: number; itemsFailed: number; passPct: number | null; topFailed: Tally[] };
  talks: { count: number; ackPct: number | null; acked: number; eligible: number; lowest: { id: string; title: string; pct: number; acked: number; eligible: number }[] };
  certs: { coverage: ReturnType<typeof coverage>; byType: { name: string; required: number; compliant: number; pct: number | null; gaps: number }[]; problems: CertProblem[]; expiringSoon: number; people: number };
  sites: SiteRow[];
  kpis: Kpi[];
  gaps: Gap[];
};

const DAY = 86_400_000;

const tally = (keys: string[]): Tally[] => {
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export const pct = (part: number, whole: number): number | null => (whole === 0 ? null : Math.round((part / whole) * 100));
const avg = (nums: number[]): number | null => (nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null);
const median = (nums: number[]): number | null => {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const round1 = (n: number | null): number | null => (n === null ? null : Math.round(n * 10) / 10);
/** A due day counts as met all the way through that day. */
export const doneBy = (done: Date | null, due: Date | null): boolean => Boolean(done && due && done.getTime() < startOfDayUTC(due).getTime() + DAY);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;

/**
 * Report counts in equal slices that end today and together cover the whole period, oldest first: weeks for 30 and 90 days,
 * about a month each for a year. Because the slices cover the period exactly, the bars always add up to the total shown beside them.
 */
export function reportTrend(reports: Pick<ReportRow, "createdAt" | "severity">[], days: number, now: Date) {
  const isSerious = (s: string) => s === "HIGH" || s === "CRITICAL";
  const n = days > 120 ? 12 : Math.ceil(days / 7);
  const slice = (days * DAY) / n;
  const end = now.getTime() + 1;
  const buckets = Array.from({ length: n }, (_, i) => {
    const hi = end - (n - 1 - i) * slice;
    return { start: hi - slice, end: hi, label: short(new Date(hi - slice)), count: 0, serious: 0 };
  });
  for (const r of reports) {
    const t = r.createdAt.getTime();
    const b = buckets.find((x) => t >= x.start && t < x.end);
    if (b) { b.count++; if (isSerious(r.severity)) b.serious++; }
  }
  return buckets.map(({ label, count, serious }) => ({ label, count, serious }));
}

type Slice = Pick<MetricsInput, "reports" | "actions" | "inspections" | "talks" | "incidents" | "investigations">;

/** The scoped numbers that feed both the whole-page figures and each row of the site comparison. */
function core(input: MetricsInput, people: PersonRef[], slice: Slice) {
  const { now, days } = input;
  const since = new Date(now.getTime() - days * DAY);
  const prevSince = new Date(since.getTime() - days * DAY);
  const inWindow = slice.reports.filter((r) => r.createdAt >= since);
  const prev = slice.reports.filter((r) => r.createdAt >= prevSince && r.createdAt < since);
  const open = slice.reports.filter((r) => r.status !== "CLOSED");

  const withDeadline = inWindow.filter((r) => r.respondBy);
  const met = withDeadline.filter((r) => r.acknowledgedAt && r.acknowledgedAt <= r.respondBy!).length;
  const missed = withDeadline.filter((r) => (r.acknowledgedAt && r.acknowledgedAt > r.respondBy!) || (!r.acknowledgedAt && r.respondBy! < now)).length;
  const responseOverdueNow = slice.reports.filter((r) => ["NEW", "ASSIGNED"].includes(r.status) && !r.acknowledgedAt && r.respondBy && r.respondBy < now).length;

  const dayEnd = new Date(startOfDayUTC(now).getTime() + DAY);
  const openActions = slice.actions.filter((a) => ["PROPOSED", "APPROVED", "IN_PROGRESS", "COMPLETED"].includes(a.status));
  const overdueActions = openActions.filter((a) => isOverdue(a.dueDate, now));
  // "Due in the period" only counts actions whose due day is over, or that are already finished, so one due later today isn't held against anyone yet.
  const dueInPeriod = slice.actions.filter((a) => a.dueDate && a.status !== "CANCELLED" && a.dueDate >= since && a.dueDate < dayEnd && (a.completedAt || a.verifiedAt || isOverdue(a.dueDate, now)));
  const actionOnTime = dueInPeriod.filter((a) => doneBy(a.completedAt ?? a.verifiedAt, a.dueDate)).length;

  const insDue = slice.inspections.filter((i) => i.dueDate >= since && i.dueDate < dayEnd && (i.status === "COMPLETED" || isOverdue(i.dueDate, now)));
  const insOnTime = insDue.filter((i) => i.status === "COMPLETED" && doneBy(i.completedAt, i.dueDate)).length;
  const insOverdue = slice.inspections.filter((i) => i.status === "SCHEDULED" && isOverdue(i.dueDate, now)).length;

  const talksInWindow = slice.talks.filter((t) => t.scheduledFor >= since && t.scheduledFor <= now);
  let talkAcked = 0, talkEligible = 0;
  const talkRows = talksInWindow.map((t) => {
    const group = t.siteId ? people.filter((p) => p.siteId === t.siteId) : people;
    const ids = new Set(group.map((p) => p.id));
    const acked = t.ackedBy.filter((id) => ids.has(id)).length;
    talkAcked += acked; talkEligible += group.length;
    return { id: t.id, title: t.title, acked, eligible: group.length, pct: group.length ? Math.round((acked / group.length) * 100) : 100 };
  }).filter((t) => t.eligible > 0);

  return { since, inWindow, prev, open, met, missed, responseOverdueNow, openActions, overdueActions, dueInPeriod, actionOnTime, insDue, insOnTime, insOverdue, talkAcked, talkEligible, talkRows };
}

export function computeMetrics(input: MetricsInput): Metrics {
  const { now, days, siteId, sites, people, targets } = input;
  const siteName = (id: string | null) => (id ? sites.find((s) => s.id === id)?.name ?? "Unknown site" : "No site");
  const c = core(input, people, input);
  const personName = new Map(people.map((p) => [p.id, p.name]));

  // ---- reports
  const aging = { fresh: 0, mid: 0, old: 0 };
  for (const r of c.open) {
    const age = (now.getTime() - r.createdAt.getTime()) / DAY;
    if (age < 7) aging.fresh++; else if (age <= 30) aging.mid++; else aging.old++;
  }
  const ackHours = c.inWindow.filter((r) => r.acknowledgedAt).map((r) => (r.acknowledgedAt!.getTime() - r.createdAt.getTime()) / 3_600_000);
  const pairs = new Map<string, Tally>();
  for (const r of c.inWindow) {
    if (!r.siteId) continue;
    const k = `${r.category}|${r.siteId}`;
    const cur = pairs.get(k) ?? { label: siteId ? input.categoryLabel(r.category) : `${input.categoryLabel(r.category)} at ${siteName(r.siteId)}`, count: 0 };
    cur.count++;
    pairs.set(k, cur);
  }
  const repeats = [...pairs.values()].filter((p) => p.count >= 2).sort((a, b) => b.count - a.count).slice(0, 6);
  const incWindow = input.incidents.filter((i) => i.openedAt >= c.since);
  const resolved = incWindow.filter((i) => i.status === "RESOLVED" && i.resolvedAt && !i.standDownReason);
  const sevOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const bySite = tally(c.inWindow.map((r) => r.siteId ?? "")).map((t) => ({ label: t.label ? siteName(t.label) : "No site", count: t.count, siteId: t.label || null }));

  // ---- investigations
  const invWindow = input.investigations.filter((i) => i.openedAt >= c.since);
  const invDone = input.investigations.filter((i) => i.completedAt && i.completedAt >= c.since);

  // ---- actions
  const verified = input.actions.filter((a) => a.status === "VERIFIED" && a.verifiedAt && a.verifiedAt >= c.since);
  const ownerOverdue = tally(c.overdueActions.map((a) => (a.ownerId ? personName.get(a.ownerId) ?? "Unassigned" : "Unassigned")));

  // ---- inspections
  let itemsChecked = 0, itemsFailed = 0;
  const failedLabels: string[] = [];
  for (const i of input.inspections.filter((x) => x.status === "COMPLETED" && x.completedAt && x.completedAt >= c.since)) {
    for (const r of i.results) {
      if (r.result === "NA") continue;
      itemsChecked++;
      if (r.result === "FAIL") { itemsFailed++; failedLabels.push(r.label); }
    }
  }

  // ---- certifications (people in scope are already filtered by the loader)
  const reqs = requirementsFor(input.certTypes, people as CertPerson[], input.certRecords, now);
  const cov = coverage(reqs);
  const typeName = new Map(input.certTypes.map((t) => [t.id, t.name]));
  const byType = input.certTypes
    .map((t) => {
      const mine = reqs.filter((r) => r.typeId === t.id);
      const cv = coverage(mine);
      return { name: t.name, required: cv.required, compliant: cv.compliant, pct: cv.pct, gaps: cv.required - cv.compliant };
    })
    .filter((t) => t.required > 0)
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101) || b.gaps - a.gaps);
  const personById = new Map(people.map((p) => [p.id, p]));
  const problemOf = (r: Requirement): CertProblem | null => {
    if (r.state === "valid") return null;
    const who = personById.get(r.employeeId);
    return { person: who?.name ?? "Unknown", site: who?.siteId ? siteName(who.siteId) : null, cert: typeName.get(r.typeId) ?? "Certification", state: r.state, expiresOn: r.record?.expiresOn ?? null };
  };
  const rank = { expired: 0, missing: 1, expiring: 2 } as const;
  const problems = reqs.map(problemOf).filter((p): p is CertProblem => p !== null).sort((a, b) => rank[a.state] - rank[b.state] || a.person.localeCompare(b.person));

  // ---- per-site comparison
  const siteRows: SiteRow[] = sites
    .filter((s) => s.active && (!siteId || s.id === siteId))
    .map((s) => {
      const slice: Slice = {
        reports: input.reports.filter((r) => r.siteId === s.id),
        actions: input.actions.filter((a) => a.siteId === s.id),
        inspections: input.inspections.filter((i) => i.siteId === s.id),
        talks: input.talks.filter((t) => t.siteId === s.id || t.siteId === null),
        incidents: input.incidents.filter((i) => i.siteId === s.id),
        investigations: input.investigations.filter((i) => i.siteId === s.id),
      };
      const sitePeople = people.filter((p) => p.siteId === s.id);
      const k = core(input, sitePeople, slice);
      const sc = coverage(requirementsFor(input.certTypes, sitePeople as CertPerson[], input.certRecords, now));
      const row: SiteRow = {
        id: s.id, name: s.name, active: s.active, hasLead: Boolean(s.safetyLeadId),
        reports: k.inWindow.length, openReports: k.open.length, responseOverdue: k.responseOverdueNow, responsePct: pct(k.met, k.met + k.missed),
        overdueActions: k.overdueActions.length, inspectionsOverdue: k.insOverdue, inspectionPct: pct(k.insOnTime, k.insDue.length),
        talkPct: pct(k.talkAcked, k.talkEligible), certPct: sc.pct, certProblems: sc.expired + sc.missing, missedTargets: 0,
      };
      row.missedTargets =
        (row.responsePct !== null && row.responsePct < targets.responsePct ? 1 : 0) +
        (row.overdueActions > targets.overdueActions ? 1 : 0) +
        (row.inspectionPct !== null && row.inspectionPct < targets.inspectionOnTimePct ? 1 : 0) +
        (row.talkPct !== null && row.talkPct < targets.talkAckPct ? 1 : 0) +
        (row.certPct !== null && row.certPct < targets.certPct ? 1 : 0);
      return row;
    })
    .sort((a, b) => b.missedTargets - a.missedTargets || b.overdueActions - a.overdueActions || a.name.localeCompare(b.name));

  // ---- KPIs against the company's own targets
  const medianAck = round1(median(ackHours));
  const actionPct = pct(c.actionOnTime, c.dueInPeriod.length);
  const insPct = pct(c.insOnTime, c.insDue.length);
  const respPct = pct(c.met, c.met + c.missed);
  const talkPct = pct(c.talkAcked, c.talkEligible);
  const site = siteId ? `&site=${siteId}` : "";
  const insQ = siteId ? `site=${siteId}` : "";
  const kpi = (key: keyof Targets, label: string, value: number | null, display: string, target: string, ok: boolean | null, note: string, href?: string): Kpi => ({ key, label, value, display, target, status: ok === null ? "nodata" : ok ? "met" : "missed", note, href });
  const kpis: Kpi[] = [
    kpi("ackHours", "Time to acknowledge", medianAck, medianAck === null ? "—" : `${medianAck} h`, `${targets.ackHours} h or less`, medianAck === null ? null : medianAck <= targets.ackHours, "Median, report to first acknowledgement", `/dashboard/reports?status=all${site}`),
    kpi("responsePct", "Responded on time", respPct, respPct === null ? "—" : `${respPct}%`, `${targets.responsePct}% or more`, respPct === null ? null : respPct >= targets.responsePct, `${c.met} of ${c.met + c.missed} reports acknowledged by their deadline`, `/dashboard/reports?attention=overdue${site}`),
    kpi("overdueActions", "Overdue corrective actions", c.overdueActions.length, String(c.overdueActions.length), `${targets.overdueActions} or fewer`, c.overdueActions.length <= targets.overdueActions, "Open now and past their due date", `/dashboard/actions${siteId ? `?site=${siteId}` : ""}`),
    kpi("actionOnTimePct", "Actions finished on time", actionPct, actionPct === null ? "—" : `${actionPct}%`, `${targets.actionOnTimePct}% or more`, actionPct === null ? null : actionPct >= targets.actionOnTimePct, `${c.actionOnTime} of ${c.dueInPeriod.length} due in this period`),
    kpi("inspectionOnTimePct", "Inspections on time", insPct, insPct === null ? "—" : `${insPct}%`, `${targets.inspectionOnTimePct}% or more`, insPct === null ? null : insPct >= targets.inspectionOnTimePct, `${c.insOnTime} of ${c.insDue.length} due in this period`, `/dashboard/inspections${insQ ? `?${insQ}` : ""}`),
    kpi("talkAckPct", "Toolbox talks acknowledged", talkPct, talkPct === null ? "—" : `${talkPct}%`, `${targets.talkAckPct}% or more`, talkPct === null ? null : talkPct >= targets.talkAckPct, `${c.talkAcked} of ${c.talkEligible} people asked`, `/dashboard/training`),
    kpi("certPct", "Required certifications held", cov.pct, cov.pct === null ? "—" : `${cov.pct}%`, `${targets.certPct}% or more`, cov.pct === null ? null : cov.pct >= targets.certPct, `${cov.compliant} of ${cov.required} held and in date`, `/dashboard/training?tab=qualifications&cview=compliance${siteId ? `&gsite=${siteId}` : ""}`),
  ];

  // ---- gaps: what to close first
  const gaps: Gap[] = [];
  const add = (id: string, count: number, text: string, href: string, tone: Gap["tone"]) => { if (count > 0) gaps.push({ id, count, text, href, tone }); };
  add("resp", c.responseOverdueNow, `${c.responseOverdueNow} ${c.responseOverdueNow === 1 ? "report is" : "reports are"} past the response deadline and not acknowledged`, `/dashboard/reports?attention=overdue${site}`, "bad");
  add("unowned", c.open.filter((r) => !r.ownerId).length, `${c.open.filter((r) => !r.ownerId).length} open ${c.open.filter((r) => !r.ownerId).length === 1 ? "report has" : "reports have"} no owner`, `/dashboard/reports?attention=unowned${site}`, "bad");
  add("actions", c.overdueActions.length, `${c.overdueActions.length} corrective ${c.overdueActions.length === 1 ? "action is" : "actions are"} overdue`, `/dashboard/actions${siteId ? `?site=${siteId}` : ""}`, "bad");
  const ready = c.openActions.filter((a) => a.status === "COMPLETED").length;
  add("verify", ready, `${ready} ${ready === 1 ? "fix is" : "fixes are"} done and waiting to be verified`, `/dashboard/actions${siteId ? `?site=${siteId}` : ""}`, "warn");
  add("insp", c.insOverdue, `${c.insOverdue} ${c.insOverdue === 1 ? "inspection is" : "inspections are"} overdue`, `/dashboard/inspections?view=overdue${insQ ? `&${insQ}` : ""}`, "bad");
  add("certExp", cov.expired, `${cov.expired} required ${cov.expired === 1 ? "certification has" : "certifications have"} expired`, `/dashboard/training?tab=qualifications&cview=compliance${siteId ? `&gsite=${siteId}` : ""}`, "bad");
  add("certMiss", cov.missing, `${cov.missing} required ${cov.missing === 1 ? "certification is" : "certifications are"} missing`, `/dashboard/training?tab=qualifications&cview=compliance${siteId ? `&gsite=${siteId}` : ""}`, "bad");
  add("certSoon", cov.expiring, `${cov.expiring} ${cov.expiring === 1 ? "certification expires" : "certifications expire"} within 30 days`, `/dashboard/training?tab=qualifications&cview=compliance${siteId ? `&gsite=${siteId}` : ""}`, "warn");
  const lowTalks = c.talkRows.filter((t) => t.pct < targets.talkAckPct);
  add("talks", lowTalks.length, `${lowTalks.length} toolbox ${lowTalks.length === 1 ? "talk is" : "talks are"} below the ${targets.talkAckPct}% acknowledgement target`, `/dashboard/training`, "warn");
  add("repeat", repeats.length, `${repeats.length} repeated ${repeats.length === 1 ? "hazard" : "hazards"}: ${repeats.slice(0, 2).map((r) => `${r.label} (${r.count})`).join(", ")}`, `/dashboard/reports?status=all${site}`, "warn");
  if (!siteId) {
    const noLead = sites.filter((s) => s.active && !s.safetyLeadId).length;
    add("lead", noLead, `${noLead} ${noLead === 1 ? "site has" : "sites have"} no safety lead`, `/dashboard/sites`, "warn");
  }
  gaps.sort((a, b) => (a.tone === b.tone ? b.count - a.count : a.tone === "bad" ? -1 : 1));

  return {
    scope: { siteId, siteName: siteId ? siteName(siteId) : null, days },
    reports: {
      total: c.inWindow.length, prevTotal: c.prev.length, openNow: c.open.length, unownedOpen: c.open.filter((r) => !r.ownerId).length, responseOverdueNow: c.responseOverdueNow, aging,
      medianAckHours: medianAck, responsePct: respPct, responseMet: c.met, responseMissed: c.missed,
      byType: tally(c.inWindow.map((r) => r.type)), bySeverity: tally(c.inWindow.map((r) => r.severity)).sort((a, b) => sevOrder.indexOf(a.label) - sevOrder.indexOf(b.label)),
      byCategory: tally(c.inWindow.map((r) => input.categoryLabel(r.category))), bySite,
      trend: reportTrend(c.inWindow, days, now), repeats,
      incidents: { total: incWindow.length, open: incWindow.filter((i) => i.status !== "RESOLVED").length, avgDaysToResolve: round1(avg(resolved.map((i) => (i.resolvedAt!.getTime() - i.openedAt.getTime()) / DAY))) },
    },
    investigations: { opened: invWindow.length, completed: invDone.length, avgDaysToComplete: round1(avg(invDone.map((i) => (i.completedAt!.getTime() - i.openedAt.getTime()) / DAY))), factors: tally(invWindow.flatMap((i) => i.factors)) },
    actions: {
      openNow: c.openActions.length, overdueNow: c.overdueActions.length, readyToVerify: ready, dueInPeriod: c.dueInPeriod.length, onTime: c.actionOnTime, onTimePct: actionPct,
      avgDaysToVerify: round1(avg(verified.map((a) => (a.verifiedAt!.getTime() - a.createdAt.getTime()) / DAY))),
      byPriority: tally(c.openActions.map((a) => a.priority)).sort((a, b) => sevOrder.indexOf(a.label) - sevOrder.indexOf(b.label)), overdueByOwner: ownerOverdue.slice(0, 6),
    },
    inspections: {
      dueInPeriod: c.insDue.length, onTime: c.insOnTime, late: c.insDue.filter((i) => i.status === "COMPLETED" && !doneBy(i.completedAt, i.dueDate)).length, overdueNow: c.insOverdue, onTimePct: insPct,
      itemsChecked, itemsFailed, passPct: pct(itemsChecked - itemsFailed, itemsChecked), topFailed: tally(failedLabels).slice(0, 6),
    },
    talks: { count: c.talkRows.length, ackPct: talkPct, acked: c.talkAcked, eligible: c.talkEligible, lowest: [...c.talkRows].sort((a, b) => a.pct - b.pct).slice(0, 5) },
    certs: {
      coverage: cov, byType, problems: problems.slice(0, 40), expiringSoon: cov.expiring, people: people.length,
    },
    sites: siteRows,
    kpis,
    gaps,
  };
}
