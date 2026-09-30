import { test } from "node:test";
import assert from "node:assert/strict";
import { canSeeReport, canSeeReporter, canRunIncident, canContributeToIncident, visibleEvents, type Viewer } from "../../src/lib/safety/access";
import { getPack, suggestSeverity, guessCategory } from "../../src/lib/safety/pack";

const PACK = getPack();
const base: Viewer = { userId: "u", name: "N", organizationId: "o", employeeId: "e1", siteId: "s1", isAdmin: false, isSafetyLead: false, isSupervisor: false, isSafetyTeam: false };
const worker = base;
const supervisor: Viewer = { ...base, employeeId: "e2", isSupervisor: true };
const admin: Viewer = { ...base, employeeId: null, isAdmin: true, isSafetyTeam: true };
const report = { reporterId: "e9", ownerId: null, siteId: "s1", privacy: "NAMED" };

test("a worker only sees their own reports", () => {
  assert.equal(canSeeReport(worker, report), false);
  assert.equal(canSeeReport(worker, { ...report, reporterId: "e1" }), true);
});

test("a supervisor sees reports at their own site only", () => {
  assert.equal(canSeeReport(supervisor, report), true);
  assert.equal(canSeeReport(supervisor, { ...report, siteId: "other" }), false);
});

test("the safety team sees everything", () => {
  assert.equal(canSeeReport(admin, { ...report, siteId: "other" }), true);
});

test("a named responder can see the report and contribute, but not run the incident", () => {
  const r = { ...report, siteId: "other", incident: { leadId: "e5", responders: [{ employeeId: "e1" }] } };
  assert.equal(canSeeReport(worker, r), true);
  assert.equal(canContributeToIncident(worker, r), true);
  assert.equal(canRunIncident(worker, r), false);
  assert.equal(canRunIncident({ ...worker, employeeId: "e5" }, r), true);
});

test("a confidential reporter is hidden from supervisors but not from the safety team or themselves", () => {
  const conf = { ...report, privacy: "CONFIDENTIAL" };
  assert.equal(canSeeReporter(supervisor, conf), false);
  assert.equal(canSeeReporter(admin, conf), true);
  assert.equal(canSeeReporter({ ...worker, employeeId: "e9" }, conf), true);
});

test("an anonymous report never reveals a reporter", () => {
  assert.equal(canSeeReporter(admin, { ...report, reporterId: null, privacy: "ANONYMOUS" }), false);
});

test("restricted notes stay with the safety team, and reporters see progress and messages to them only", () => {
  const events = [
    { restricted: true, type: "COMMENT", toReporter: false, actorId: null },
    { restricted: false, type: "COMMENT", toReporter: false, actorId: "x" },
    { restricted: false, type: "CREATED", toReporter: false, actorId: null },
    { restricted: false, type: "MESSAGE_TO_REPORTER", toReporter: true, actorId: "x" },
  ];
  const mine = { ...report, reporterId: "e1", siteId: "other" };
  assert.equal(visibleEvents(admin, mine, events).length, 4);
  assert.deepEqual(visibleEvents(worker, mine, events).map((e) => e.type), ["CREATED", "MESSAGE_TO_REPORTER"]);
  assert.equal(visibleEvents(supervisor, { ...report, ownerId: "e2" }, events).some((e) => e.restricted), false);
});

test("severity is only ever a suggestion, and injuries and falls raise it", () => {
  assert.equal(suggestSeverity("stepped on a nail", "CONCERN", false, PACK), "LOW");
  assert.notEqual(suggestSeverity("worker fell from the scaffold and hurt an ankle", "INJURY", true, PACK), "LOW");
});

test("categories are guessed from plain words", () => {
  assert.equal(guessCategory("the ladder feet slid on the wet floor", PACK), "LADDERS_LIFTS");
  assert.equal(guessCategory("nothing recognisable here", PACK), "OTHER");
});
