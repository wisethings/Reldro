import { test } from "node:test";
import assert from "node:assert/strict";
import { tableBreakpoint } from "../../src/lib/tableLayout";

test("a table only turns into columns once the columns fit next to the sidebar", () => {
  // Reports (safety team): six columns, about 870px of fixed width.
  assert.equal(tableBreakpoint("minmax(0,1fr) 6.5rem 10.5rem 13rem 9rem 4.5rem"), "xl");
  // Reports (workers): four columns.
  assert.equal(tableBreakpoint("minmax(0,1fr) 11rem minmax(9rem,14rem) 5rem"), "lg");
  // A very small table can use columns on a tablet.
  assert.equal(tableBreakpoint("minmax(0,1fr) 5rem"), "md");
  // Wider than anything fits at 1280: wait for the biggest screens rather than cut a column off.
  assert.equal(tableBreakpoint("minmax(0,1fr) 20rem 20rem 20rem"), "2xl");
});

test("more columns never switch earlier than fewer columns", () => {
  const order = ["md", "lg", "xl", "2xl"];
  const a = order.indexOf(tableBreakpoint("minmax(0,1fr) 8rem 9rem"));
  const b = order.indexOf(tableBreakpoint("minmax(0,1fr) 8rem 9rem 9rem 9rem"));
  assert.ok(b >= a);
});
