import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMetrics, DEFAULT_TARGETS, readSavedTargets, readTargets, reportTrend, rangeLabel, type MetricsInput } from "../../src/lib/safety/metrics";

const NOW = new Date(Date.UTC(2026, 9, 3, 12, 0, 0));
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - days * 86_400_000 - hours * 3_600_000);
const day = (n: number) => new Date(Date.UTC(2026, 9, 3 + n));

const base = (over: Partial<MetricsInput> = {}): MetricsInput => ({
  now: NOW, days: 30, siteId: null,
  sites: [{ id: "A", name: "Alpha", active: true, safetyLeadId: "p1" }, { id: "B", name: "Bravo", active: true, safetyLeadId: null }],
  people: [
    { id: "p1", name: "Ana", siteId: "A", departmentId: "c1", crew: "Crew 1" },
    { id: "p2", name: "Ben", siteId: "A", departmentId: "c1", crew: "Crew 1" },
    { id: "p3", name: "Cy", siteId: "B", departmentId: "c1", crew: "Crew 1" },
  ],
  reports: [], actions: [], inspections: [], talks: [], certTypes: [], certRecords: [], incidents: [], investigations: [],
  targets: DEFAULT_TARGETS, categoryLabel: (k) => k, ...over,
});

const report = (id: string, o: Partial<MetricsInput["reports"][number]> = {}) => ({ id, type: "HAZARD", category: "FALLS", severity: "MEDIUM", status: "NEW", siteId: "A", ownerId: "p1", createdAt: ago(3), acknowledgedAt: null, respondBy: null, ...o });

test("targets: only what was saved is reported as saved", () => {
  assert.deepEqual(readSavedTargets({ ackHours: 8, junk: 3 }), { ackHours: 8 });
  assert.deepEqual(readSavedTargets(undefined), {});
});

test("targets: saved values are used, bad ones fall back to the defaults", () => {
  assert.deepEqual(readTargets(null), DEFAULT_TARGETS);
  const t = readTargets({ ackHours: 8, certPct: 150, talkAckPct: "x", overdueActions: -1, responsePct: 80 });
  assert.equal(t.ackHours, 8);
  assert.equal(t.responsePct, 80);
  assert.equal(t.certPct, DEFAULT_TARGETS.certPct, "over 100% is ignored");
  assert.equal(t.talkAckPct, DEFAULT_TARGETS.talkAckPct, "text is ignored");
  assert.equal(t.overdueActions, DEFAULT_TARGETS.overdueActions, "negative is ignored");
});

test("trend: every bar carries the exact span it covers, with no gaps or overlaps, so a click can open its reports", () => {
  const t = reportTrend([], 90, NOW);
  for (let i = 1; i < t.length; i++) assert.equal(t[i].from, t[i - 1].to);
  assert.equal(new Date(t[t.length - 1].to).getTime(), NOW.getTime() + 1);
  assert.match(t[0].range, /^[A-Z][a-z]{2} \d{1,2}( – (\d{1,2}|[A-Z][a-z]{2} \d{1,2}))?$/);
  assert.equal(rangeLabel(Date.UTC(2026, 6, 5), Date.UTC(2026, 6, 11)), "Jul 5 – 11");
  assert.equal(rangeLabel(Date.UTC(2026, 6, 28), Date.UTC(2026, 7, 3)), "Jul 28 – Aug 3");
  assert.equal(rangeLabel(Date.UTC(2026, 6, 5), Date.UTC(2026, 6, 5)), "Jul 5");
});

test("trend: weekly buckets for 30 and 90 days, calendar months for a year, counting serious reports separately", () => {
  const rs = [{ createdAt: ago(1), severity: "HIGH" }, { createdAt: ago(2), severity: "LOW" }, { createdAt: ago(20), severity: "CRITICAL" }];
  const weekly = reportTrend(rs, 30, NOW);
  assert.equal(weekly.length, 5);
  assert.equal(weekly.reduce((n, b) => n + b.count, 0), 3);
  assert.equal(weekly.reduce((n, b) => n + b.serious, 0), 2);
  assert.equal(weekly[weekly.length - 1].count, 2, "the newest bucket ends today");
  assert.equal(reportTrend(rs, 90, NOW).length, 13);
  const monthly = reportTrend(rs, 365, NOW);
  assert.equal(monthly.length, 12);
  assert.equal(monthly.reduce((n, b) => n + b.count, 0), 3);
  // A report from the very start of the year still lands in a bar, so the bars always add up to the total.
  const edge = reportTrend([{ createdAt: ago(364), severity: "LOW" }, { createdAt: ago(0), severity: "LOW" }], 365, NOW);
  assert.equal(edge.reduce((n, b) => n + b.count, 0), 2);
  assert.equal(edge[0].count, 1);
  assert.equal(edge[11].count, 1);
});

test("reports: response deadlines, overdue now, medians and the previous period", () => {
  const m = computeMetrics(base({
    reports: [
      report("1", { createdAt: ago(5), respondBy: ago(4), acknowledgedAt: ago(4, 2) }),                 // met
      report("2", { createdAt: ago(5), respondBy: ago(4), acknowledgedAt: ago(3) }),                    // acknowledged late
      report("3", { createdAt: ago(5), respondBy: ago(4), status: "ASSIGNED" }),                         // never acknowledged, overdue now
      report("4", { createdAt: ago(2), respondBy: day(1) }),                                             // not due yet
      report("5", { createdAt: ago(45), status: "CLOSED" }),                                             // previous period
      report("6", { createdAt: ago(1), ownerId: null }),                                                 // unowned
    ],
  }));
  assert.equal(m.reports.total, 5);
  assert.equal(m.reports.prevTotal, 1);
  assert.equal(m.reports.responseMet, 1);
  assert.equal(m.reports.responseMissed, 2);
  assert.equal(m.reports.responsePct, 33);
  assert.equal(m.reports.responseOverdueNow, 1);
  assert.equal(m.reports.unownedOpen, 1);
  assert.equal(m.reports.openNow, 5, "the closed one doesn't count as open");
  assert.equal(m.kpis.find((k) => k.key === "responsePct")!.status, "missed");
});

test("corrective actions: overdue now, and on-time share of those that fell due", () => {
  const act = (id: string, o: Partial<MetricsInput["actions"][number]>) => ({ id, status: "IN_PROGRESS", priority: "MEDIUM", dueDate: null, completedAt: null, verifiedAt: null, createdAt: ago(40), ownerId: "p1", siteId: "A", ...o });
  const m = computeMetrics(base({
    actions: [
      act("a", { dueDate: ago(5) }),                                                                        // overdue, still open
      act("b", { dueDate: ago(10), status: "VERIFIED", completedAt: ago(12), verifiedAt: ago(11) }),       // on time
      act("c", { dueDate: ago(10), status: "COMPLETED", completedAt: ago(2) }),                             // finished late
      act("d", { dueDate: day(3) }),                                                                        // not due
      act("g", { dueDate: day(20), status: "VERIFIED", completedAt: ago(1), verifiedAt: ago(0) }),             // finished early, due next month: not counted yet
      act("f", { dueDate: day(0) }),                                                                        // due today: not held against anyone yet
      act("e", { dueDate: ago(60) }),                                                                       // long overdue, outside the due window
    ],
  }));
  assert.equal(m.actions.overdueNow, 3);
  assert.equal(m.actions.dueInPeriod, 3, "a, b, c fell due in the last 30 days");
  assert.equal(m.actions.onTime, 1);
  assert.equal(m.actions.onTimePct, 33);
  assert.equal(m.actions.readyToVerify, 1);
  assert.equal(m.actions.overdueByOwner[0].count, 3);
  assert.ok(m.gaps.some((g) => g.id === "actions" && g.tone === "bad"));
});

test("inspections and talks", () => {
  const m = computeMetrics(base({
    inspections: [
      { id: "i1", siteId: "A", status: "COMPLETED", dueDate: ago(10), completedAt: ago(10), results: [{ result: "PASS", label: "Guards" }, { result: "FAIL", label: "Ladders" }, { result: "NA", label: "Crane" }] },
      { id: "i2", siteId: "A", status: "COMPLETED", dueDate: ago(10), completedAt: ago(5), results: [] },
      { id: "i3", siteId: "B", status: "SCHEDULED", dueDate: ago(2), completedAt: null, results: [] },
    ],
    talks: [
      { id: "t1", title: "Heat", siteId: null, scheduledFor: ago(5), ackedBy: ["p1", "p2"] },
      { id: "t2", title: "Ladders", siteId: "A", scheduledFor: ago(3), ackedBy: ["p1"] },
    ],
  }));
  assert.equal(m.inspections.dueInPeriod, 3);
  assert.equal(m.inspections.onTime, 1);
  assert.equal(m.inspections.late, 1);
  assert.equal(m.inspections.overdueNow, 1);
  assert.equal(m.inspections.itemsChecked, 2);
  assert.equal(m.inspections.itemsFailed, 1);
  assert.equal(m.inspections.passPct, 50);
  assert.deepEqual(m.inspections.topFailed, [{ label: "Ladders", count: 1 }]);
  // t1: 2 of 3 people; t2 is for site A only: 1 of 2
  assert.equal(m.talks.acked, 3);
  assert.equal(m.talks.eligible, 5);
  assert.equal(m.talks.ackPct, 60);
  assert.equal(m.talks.lowest[0].title, "Ladders");
});

test("certifications and the site comparison", () => {
  const m = computeMetrics(base({
    certTypes: [{ id: "c1", name: "First aid", requiredScope: "ALL", requiredSiteIds: [], requiredCrewIds: [] }],
    certRecords: [
      { id: "r1", employeeId: "p1", typeId: "c1", name: "First aid", expiresOn: day(200), issuedOn: ago(100) },
      { id: "r2", employeeId: "p2", typeId: "c1", name: "First aid", expiresOn: ago(3), issuedOn: ago(700) },
    ],
  }));
  assert.equal(m.certs.coverage.required, 3);
  assert.equal(m.certs.coverage.expired, 1);
  assert.equal(m.certs.coverage.missing, 1);
  assert.equal(m.certs.coverage.pct, 33);
  assert.deepEqual(m.certs.problems.map((p) => p.state), ["expired", "missing"]);
  const alpha = m.sites.find((s) => s.id === "A")!;
  assert.equal(alpha.certPct, 50);
  assert.equal(alpha.certProblems, 1);
  assert.equal(m.sites[0].missedTargets >= m.sites[1].missedTargets, true, "worst site first");
  assert.ok(m.gaps.some((g) => g.id === "lead"), "a site without a safety lead is called out");
  assert.ok(m.gaps.some((g) => g.id === "certExp" && g.href.includes("cview=compliance")));
});

test("scoped to one site: links carry the site, and the lead gap is not shown", () => {
  const m = computeMetrics(base({ siteId: "A", reports: [report("1", { respondBy: ago(1), status: "ASSIGNED" })] }));
  assert.equal(m.scope.siteName, "Alpha");
  assert.ok(m.gaps.find((g) => g.id === "resp")!.href.includes("site=A"));
  assert.equal(m.gaps.some((g) => g.id === "lead"), false);
  assert.equal(m.sites.length, 1);
});

test("an empty workspace has no data, not zeros that look like success", () => {
  const m = computeMetrics(base());
  assert.equal(m.kpis.find((k) => k.key === "responsePct")!.status, "nodata");
  assert.equal(m.kpis.find((k) => k.key === "inspectionOnTimePct")!.status, "nodata");
  assert.equal(m.kpis.find((k) => k.key === "certPct")!.status, "nodata");
  assert.equal(m.kpis.find((k) => k.key === "overdueActions")!.status, "met");
});
