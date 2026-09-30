import test from "node:test";
import assert from "node:assert/strict";
import { fail, isFail, unwrap } from "../../src/lib/actionResult";
import { secretMatches } from "../../src/lib/secret";

test("a returned failure survives serialization and is turned back into an error on the client", () => {
  const sent = JSON.parse(JSON.stringify(fail("3 corrective actions are not verified yet.")));
  assert.ok(isFail(sent));
  assert.throws(() => unwrap(sent), /3 corrective actions are not verified yet/);
});

test("unwrap passes normal results through untouched", () => {
  assert.equal(unwrap("abc"), "abc");
  assert.deepEqual(unwrap({ message: "ok" }), { message: "ok" });
  assert.equal(unwrap(undefined), undefined);
  assert.equal(isFail(null), false);
});

test("secretMatches compares exactly and never matches an empty secret", () => {
  assert.equal(secretMatches("s3cret", "s3cret"), true);
  assert.equal(secretMatches("s3cre", "s3cret"), false);
  assert.equal(secretMatches("", ""), false);
  assert.equal(secretMatches(null, "s3cret"), false);
  assert.equal(secretMatches("s3cret", undefined), false);
});
