import { test } from "node:test";
import assert from "node:assert/strict";
import { pageNumbers, readPage } from "../../src/components/safety/Pagination";

test("page numbers show the ends and the neighbours, with gaps", () => {
  assert.deepEqual(pageNumbers(1, 3), [1, 2, 3]);
  assert.deepEqual(pageNumbers(1, 20), [1, 2, 3, "gap", 20]);
  const mid = pageNumbers(10, 20);
  assert.equal(mid[0], 1);
  assert.equal(mid[mid.length - 1], 20);
  assert.ok(mid.includes(9) && mid.includes(10) && mid.includes(11));
  assert.equal(mid.filter((x) => x === "gap").length, 2);
});

test("the page parameter is always a safe whole number", () => {
  assert.equal(readPage(undefined), 1);
  assert.equal(readPage("abc"), 1);
  assert.equal(readPage("-4"), 1);
  assert.equal(readPage("0"), 1);
  assert.equal(readPage("3"), 3);
});
