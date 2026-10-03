import { test } from "node:test";
import assert from "node:assert/strict";
import { ago, agoInline, seatsText } from "../../src/lib/platformFormat";

const now = Date.UTC(2026, 9, 3, 12, 0, 0);
const at = (ms: number) => new Date(now - ms);

test("ago reads naturally at each scale", () => {
  assert.equal(ago(null, now), "Never");
  assert.equal(ago(at(30_000), now), "Just now");
  assert.equal(ago(at(5 * 60_000), now), "5 min ago");
  assert.equal(ago(at(3 * 3600_000), now), "3 hours ago");
  assert.equal(ago(at(12 * 86400_000), now), "12 days ago");
  assert.equal(ago(at(90 * 86400_000), now), "Jul 5, 2026");
});

test("agoInline keeps dates capitalised inside a sentence", () => {
  assert.equal(agoInline(at(30_000), now), "just now");
  assert.equal(agoInline(at(2 * 86400_000), now), "2 days ago");
  assert.equal(agoInline(at(90 * 86400_000), now), "on Jul 5, 2026");
});

test("seat text", () => {
  assert.equal(seatsText(12, 25), "12 of 25 seats");
  assert.equal(seatsText(1, null), "1 person");
  assert.equal(seatsText(12, null), "12 people");
});
