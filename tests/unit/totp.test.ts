import { test } from "node:test";
import assert from "node:assert/strict";
import { base32Decode, base32Encode, generateTotpSecret, openSecret, otpauthUrl, sealSecret, totpCode, totpStep, verifyTotp } from "../../src/lib/auth/totp";
process.env.AUTH_SECRET ||= "unit-test-secret";

// RFC 6238 appendix B test secret: the ASCII string "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

test("base32 round-trips", () => {
  const raw = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 17]);
  assert.deepEqual(base32Decode(base32Encode(raw)), raw);
  assert.equal(RFC_SECRET, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
});

test("codes match the RFC 6238 vectors (last six digits)", () => {
  assert.equal(totpCode(RFC_SECRET, totpStep(59_000)), "287082");
  assert.equal(totpCode(RFC_SECRET, totpStep(1_111_111_109_000)), "081804");
  assert.equal(totpCode(RFC_SECRET, totpStep(1_234_567_890_000)), "005924");
});

test("a code is accepted once, in its own step or one step either side", () => {
  const t = 1_700_000_000_000;
  const step = totpStep(t);
  const code = totpCode(RFC_SECRET, step);
  assert.equal(verifyTotp(RFC_SECRET, code, null, t), step);
  assert.equal(verifyTotp(RFC_SECRET, ` ${code.slice(0, 3)} ${code.slice(3)} `, null, t), step, "spaces are ignored");
  assert.equal(verifyTotp(RFC_SECRET, code, null, t + 30_000), step, "one step late");
  assert.equal(verifyTotp(RFC_SECRET, code, null, t + 90_000), null, "too old");
  assert.equal(verifyTotp(RFC_SECRET, code, step, t), null, "the same code can't be used twice");
  assert.equal(verifyTotp(RFC_SECRET, "12345", null, t), null);
  assert.equal(verifyTotp(RFC_SECRET, "abcdef", null, t), null);
});

test("secrets are stored sealed and can be opened again", () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  const sealed = sealSecret(secret);
  assert.ok(!sealed.includes(secret));
  assert.equal(openSecret(sealed), secret);
  assert.equal(openSecret("not.a.secret"), null);
  assert.match(otpauthUrl(secret, "a@b.com"), /^otpauth:\/\/totp\/Reldro:a%40b\.com\?secret=/);
});
