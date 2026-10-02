import test from "node:test";
import assert from "node:assert/strict";
import { bestRecord, coverage, isRequired, requirementsFor, stateOf, suggestedExpiry, type CertRecord, type CertType } from "../../src/lib/safety/certifications";

const NOW = new Date("2026-10-03T12:00:00Z");
const d = (iso: string) => new Date(iso);
const type = (over: Partial<CertType> = {}): CertType => ({ id: "t1", name: "Aerial lift", requiredScope: "ALL", requiredSiteIds: [], requiredCrewIds: [], ...over });
const rec = (over: Partial<CertRecord> = {}): CertRecord => ({ id: "r1", employeeId: "e1", typeId: "t1", name: "Aerial lift", expiresOn: d("2027-01-01"), issuedOn: d("2025-01-01"), ...over });

test("requirement scope: none, everyone, or selected sites and crews", () => {
  const p = { siteId: "s1", departmentId: "c1" };
  assert.equal(isRequired(type({ requiredScope: "NONE" }), p), false);
  assert.equal(isRequired(type({ requiredScope: "ALL" }), p), true);
  assert.equal(isRequired(type({ requiredScope: "SELECTED", requiredSiteIds: ["s1"] }), p), true);
  assert.equal(isRequired(type({ requiredScope: "SELECTED", requiredCrewIds: ["c1"] }), p), true);
  assert.equal(isRequired(type({ requiredScope: "SELECTED", requiredSiteIds: ["s2"], requiredCrewIds: ["c2"] }), p), false);
  assert.equal(isRequired(type({ requiredScope: "SELECTED", requiredSiteIds: ["s1"] }), { siteId: null, departmentId: null }), false);
});

test("the longest-lasting record counts, and legacy free-text records match by name", () => {
  const records = [rec({ id: "old", expiresOn: d("2026-01-01") }), rec({ id: "new", expiresOn: d("2028-01-01") }), rec({ id: "legacy", typeId: null, name: " AERIAL LIFT ", expiresOn: d("2030-01-01") }), rec({ id: "other", employeeId: "e2" })];
  assert.equal(bestRecord(records, "e1", type())?.id, "legacy");
  assert.equal(bestRecord(records, "e3", type()), null);
  assert.equal(bestRecord([rec({ expiresOn: null })], "e1", type())?.expiresOn, null);
  assert.equal(bestRecord([rec({ id: "a", expiresOn: d("2027-01-01") }), rec({ id: "b", expiresOn: null })], "e1", type())?.id, "b", "no expiry lasts longest");
});

test("state follows the shared expiry rules", () => {
  assert.equal(stateOf(null, NOW), "missing");
  assert.equal(stateOf(rec({ expiresOn: d("2026-10-02") }), NOW), "expired");
  assert.equal(stateOf(rec({ expiresOn: d("2026-10-03") }), NOW), "expiring", "valid through the whole expiry day");
  assert.equal(stateOf(rec({ expiresOn: d("2026-11-01") }), NOW), "expiring");
  assert.equal(stateOf(rec({ expiresOn: d("2027-06-01") }), NOW), "valid");
  assert.equal(stateOf(rec({ expiresOn: null }), NOW), "valid");
});

test("coverage counts held-and-not-expired as compliant", () => {
  const people = [{ id: "e1", siteId: "s1", departmentId: null }, { id: "e2", siteId: "s1", departmentId: null }, { id: "e3", siteId: "s1", departmentId: null }, { id: "e4", siteId: "s2", departmentId: null }];
  const records = [rec({ employeeId: "e1" }), rec({ id: "r2", employeeId: "e2", expiresOn: d("2026-09-01") })];
  const reqs = requirementsFor([type({ requiredScope: "SELECTED", requiredSiteIds: ["s1"] })], people, records, NOW);
  assert.equal(reqs.length, 3, "e4 is at another site");
  const c = coverage(reqs);
  assert.deepEqual({ required: c.required, valid: c.valid, expired: c.expired, missing: c.missing, pct: c.pct }, { required: 3, valid: 1, expired: 1, missing: 1, pct: 33 });
  assert.equal(coverage([]).pct, null, "nothing required is not 0% or 100%");
});

test("suggested expiry adds months and clamps to the end of a short month", () => {
  assert.equal(suggestedExpiry(d("2026-10-03"), 24)?.toISOString().slice(0, 10), "2028-10-03");
  assert.equal(suggestedExpiry(d("2026-01-31"), 1)?.toISOString().slice(0, 10), "2026-02-28");
  assert.equal(suggestedExpiry(d("2024-01-31"), 1)?.toISOString().slice(0, 10), "2024-02-29");
  assert.equal(suggestedExpiry(d("2026-10-03"), null), null);
  assert.equal(suggestedExpiry(d("2026-10-03"), 0), null);
});
