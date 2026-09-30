import test from "node:test";
import assert from "node:assert/strict";
import { dayStartIn, daysUntil, isOverdue, qualStatus, startOfTodayUTC } from "../../src/lib/safety/dates";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-10-03T15:30:00Z");

test("something due today is not overdue until the day has passed", () => {
  assert.equal(isOverdue(at("2026-10-03T00:00:00Z"), NOW), false);
  assert.equal(isOverdue(at("2026-10-03T23:59:00Z"), NOW), false);
  assert.equal(isOverdue(at("2026-10-02T23:59:00Z"), NOW), true);
  assert.equal(isOverdue(null, NOW), false);
});

test("daysUntil counts calendar days, not 24-hour blocks", () => {
  assert.equal(daysUntil(at("2026-10-03T00:00:00Z"), NOW), 0);
  assert.equal(daysUntil(at("2026-10-04T00:00:00Z"), NOW), 1);
  assert.equal(daysUntil(at("2026-10-10T18:00:00Z"), NOW), 7);
  assert.equal(daysUntil(at("2026-10-01T00:00:00Z"), NOW), -2);
});

test("day windows start at midnight UTC", () => {
  assert.equal(startOfTodayUTC(NOW).toISOString(), "2026-10-03T00:00:00.000Z");
  assert.equal(dayStartIn(8, NOW).toISOString(), "2026-10-11T00:00:00.000Z");
});

test("qualification status: expired after its day, soon within 30 days, else current", () => {
  assert.equal(qualStatus(at("2026-10-02T00:00:00Z"), NOW), "expired");
  assert.equal(qualStatus(at("2026-10-03T00:00:00Z"), NOW), "soon");
  assert.equal(qualStatus(at("2026-11-02T00:00:00Z"), NOW), "soon");
  assert.equal(qualStatus(at("2026-11-03T00:00:00Z"), NOW), "current");
  assert.equal(qualStatus(null, NOW), "current");
});
