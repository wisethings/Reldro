import crypto from "node:crypto";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

export const BASE = process.env.BASE_URL || "http://localhost:3100";
export const PASSWORD = "Demo1234!";
export const USERS = {
  admin: "admin@havenbrook.com",
  maria: "maria.delgado@havenbrook.com",
  tom: "tom.brennan@havenbrook.com",
  priya: "priya.shah@havenbrook.com",
  platform: "platform@reldro.com",
};

let browser;
export async function launch() {
  browser ??= await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  return browser;
}
export async function closeBrowser() {
  await browser?.close();
  browser = undefined;
}

/** RFC 6238 code for a base32 secret, so the staff two-factor step can be completed without a phone. */
export function totpNow(secret) {
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0; const bytes = [];
  for (const ch of secret) { value = (value << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = crypto.createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000).padStart(6, "0");
}

/** Gives the test a clean slate for the staff account: no authenticator yet and no earlier attempts counted. */
async function resetStaffTwoFactor() {
  const db = new PrismaClient();
  try {
    await db.user.update({ where: { email: USERS.platform }, data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null } });
    await db.rateLimitHit.deleteMany({ where: { key: { startsWith: "totp:" } } });
  } finally {
    await db.$disconnect();
  }
}

/** Signs in and returns a page. `phone` uses a 390px-wide touch viewport. */
export async function signIn(who, { phone = false } = {}) {
  if (who === "platform") await resetStaffTwoFactor();
  const b = await launch();
  const context = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true } : { viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(`${BASE}/login`);
  await page.fill("input[name=email]", USERS[who]);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  if (who === "platform") {
    // Reldro staff get a second step: set up the authenticator on first use, then enter the current code.
    await page.waitForURL(/two-factor/, { timeout: 60_000 });
    const secret = (await page.getByTestId("totp-secret").innerText()).trim();
    await page.fill("input[name=code]", totpNow(secret));
    await page.click("button[type=submit]");
    await page.waitForURL(/platform-admin/, { timeout: 60_000 });
    page.totpSecret = secret;
    return page;
  }
  await page.waitForURL(/dashboard|platform-admin|onboarding/, { timeout: 60_000 });
  return page;
}

export async function hasSideways(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || (document.querySelector("main")?.scrollWidth ?? 0) > (document.querySelector("main")?.clientWidth ?? 0) + 1);
}
