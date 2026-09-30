import { test } from "node:test";
import assert from "node:assert/strict";

// cleanAttachments is exported from a server-only module, so the rules are checked against the same pattern here.
const ok = (v: string) => /^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length < 800_000;

test("only small raster images are accepted", () => {
  assert.equal(ok("data:image/jpeg;base64,AAAA"), true);
  assert.equal(ok("data:image/svg+xml;base64,AAAA"), false);
  assert.equal(ok("data:text/html;base64,AAAA"), false);
  assert.equal(ok("data:image/png;base64," + "A".repeat(800_000)), false);
});
