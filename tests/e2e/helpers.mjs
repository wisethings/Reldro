import { chromium } from "playwright";

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

/** Signs in and returns a page. `phone` uses a 390px-wide touch viewport. */
export async function signIn(who, { phone = false } = {}) {
  const b = await launch();
  const context = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true } : { viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(`${BASE}/login`);
  await page.fill("input[name=email]", USERS[who]);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/dashboard|platform-admin|onboarding/, { timeout: 60_000 });
  return page;
}

export async function hasSideways(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || (document.querySelector("main")?.scrollWidth ?? 0) > (document.querySelector("main")?.clientWidth ?? 0) + 1);
}
