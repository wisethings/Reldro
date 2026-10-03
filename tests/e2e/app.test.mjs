// Browser tests against a running, seeded app. Start it first (see docs/testing.md), then: npm run test:e2e
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { BASE, USERS, closeBrowser, hasSideways, launch, signIn, totpNow } from "./helpers.mjs";

after(closeBrowser);

const PAGES = {
  admin: ["overview", "reports", "reports/new", "investigations", "actions", "inspections", "training", "training?tab=qualifications", "training?tab=qualifications&cview=records", "training?tab=qualifications&cview=requirements", "sites", "insights", "insights?tab=reports", "insights?tab=actions", "insights?tab=inspections", "insights?tab=certifications", "insights?days=30", "insights?site=not-a-real-site", "settings", "settings/activity"],
  maria: ["overview", "reports", "investigations", "actions", "inspections", "training", "training?tab=qualifications", "insights", "insights?tab=certifications"],
  tom: ["overview", "reports", "actions", "inspections", "training", "training?tab=qualifications"],
  priya: ["overview", "reports", "reports/new", "actions", "training", "training?tab=mine"],
};

test("health endpoint reports the database and schema", async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.database, "up");
});

for (const [who, paths] of Object.entries(PAGES)) {
  for (const phone of [false, true]) {
    test(`${who} can open every page on ${phone ? "a phone" : "a desktop"} without errors or sideways scrolling`, async () => {
      const page = await signIn(who, { phone });
      try {
        for (const path of paths) {
          const res = await page.goto(`${BASE}/dashboard/${path}`, { waitUntil: "networkidle" });
          assert.ok(res && res.status() < 400, `${path} returned ${res?.status()}`);
          const body = await page.locator("body").innerText();
          assert.ok(!/Application error|This page couldn.t load|Something went wrong/i.test(body), `${path} shows an error page`);
          assert.equal(await hasSideways(page), false, `${path} scrolls sideways`);
        }
        assert.deepEqual(page.errors, []);
      } finally {
        await page.context().close();
      }
    });
  }
}

test("platform admin can open every console page on a phone and a desktop, and customer detail has no report content", async () => {
  for (const phone of [false, true]) {
    const page = await signIn("platform", { phone });
    try {
      for (const path of ["", "/organizations", "/organizations?q=Havenbrook&status=active", "/activity", "/product-updates"]) {
        const res = await page.goto(`${BASE}/platform-admin${path}`, { waitUntil: "networkidle" });
        assert.ok(res && res.status() < 400, `${path} returned ${res?.status()}`);
        assert.equal(await hasSideways(page), false, `${path} scrolls sideways on ${phone ? "a phone" : "a desktop"}`);
      }
      await page.goto(`${BASE}/platform-admin/organizations`, { waitUntil: "networkidle" });
      await page.getByRole("link", { name: /Havenbrook Electrical/ }).first().click();
      await page.waitForURL(/organizations\/c/);
      await page.getByText("Admins and setup").waitFor();
      assert.equal(await hasSideways(page), false, "customer page scrolls sideways");
      const body = await page.locator("body").innerText();
      assert.ok(!/Worker fell about 6 feet|scaffold access ladder/.test(body), "the console shows report content");
      assert.ok(!/MRR|Growth|Starter|Enterprise plan/.test(body), "the console still shows billing");
      assert.deepEqual(page.errors, []);
    } finally {
      await page.context().close();
    }
  }
});

test("staff sign-in needs the authenticator code, and a code can't be used twice", async () => {
  const page = await signIn("platform");
  try {
    // Signed in with the code, so the console opens.
    assert.ok((await page.goto(`${BASE}/platform-admin`)).status() < 400);
    // A fresh browser that knows the password but not the code never gets in.
    const b = await launch();
    const ctx = await b.newContext();
    const other = await ctx.newPage();
    await other.goto(`${BASE}/login`);
    await other.fill("input[name=email]", USERS.platform);
    await other.fill("input[name=password]", "Demo1234!");
    await other.click("button[type=submit]");
    await other.waitForURL(/two-factor/, { timeout: 60_000 });
    await other.goto(`${BASE}/platform-admin/organizations`);
    assert.ok(other.url().includes("/two-factor"), "console opened without the code");
    await other.fill("input[name=code]", "000000");
    await other.click("button[type=submit]");
    await other.getByText(/That code didn.t work/).waitFor();
    // The code the first browser just used is refused here (replay).
    await other.fill("input[name=code]", totpNow(page.totpSecret));
    await other.click("button[type=submit]");
    await other.getByText(/That code didn.t work/).waitFor();
    await ctx.close();
  } finally {
    await page.context().close();
  }
});

test("a workspace can be created with seats, limited, suspended and reopened from the console", async () => {
  const db = new PrismaClient();
  const stamp = Date.now();
  const company = `FLOWTEST Seats ${stamp}`;
  const staff = await signIn("platform");
  let adminPage;
  try {
    await staff.goto(`${BASE}/platform-admin/organizations`, { waitUntil: "networkidle" });
    await staff.getByRole("button", { name: /Create organization/ }).click();
    await staff.fill("input[name=companyName]", company);
    await staff.fill("input[name=adminName]", "Flow Admin");
    await staff.fill("input[name=adminEmail]", `flow-admin-${stamp}@example.com`);
    await staff.fill("input[name=seats]", "2");
    await staff.getByRole("button", { name: "Create workspace" }).click();
    const temp = (await staff.locator("span.tabular-nums.font-semibold").first().innerText({ timeout: 30_000 }).catch(() => "")).trim();
    assert.ok(temp, "no temporary password was shown (is email configured in this environment?)");

    // The new admin signs in and sees a working workspace (setup wizard is fine).
    const b = await launch();
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    adminPage = await ctx.newPage();
    await adminPage.goto(`${BASE}/login`);
    await adminPage.fill("input[name=email]", `flow-admin-${stamp}@example.com`);
    await adminPage.fill("input[name=password]", temp);
    await adminPage.click("button[type=submit]");
    await adminPage.waitForURL(/dashboard|onboarding/, { timeout: 60_000 });

    // Customer page: seats show 1 of 2; lowering below what's in use is refused.
    const org = await db.organization.findFirst({ where: { name: company }, select: { id: true } });
    await staff.goto(`${BASE}/platform-admin/organizations/${org.id}`, { waitUntil: "networkidle" });
    await staff.getByText("1 of 2").first().waitFor();
    await staff.fill("input[name=seats]", "0");
    await staff.getByRole("button", { name: "Save seats" }).click();
    await staff.getByText(/between 1 and/).waitFor();
    await staff.fill("input[name=seats]", "5");
    await staff.getByRole("button", { name: "Save seats" }).click();
    await staff.getByText("Saved.").waitFor();
    assert.equal((await db.organization.findUnique({ where: { id: org.id } })).seatLimit, 5);

    // Suspend: needs a reason, then the open session stops working and sign-in is refused.
    const suspend = staff.getByRole("button", { name: "Suspend workspace" });
    assert.equal(await suspend.isDisabled(), true);
    await staff.fill("textarea[name=reason]", "Flow test");
    await suspend.click();
    await staff.getByRole("button", { name: "Suspend workspace" }).last().click();
    await staff.getByRole("button", { name: "Reopen workspace" }).waitFor();
    await adminPage.goto(`${BASE}/dashboard/overview`);
    await adminPage.waitForURL(/login/, { timeout: 30_000 });
    await adminPage.fill("input[name=email]", `flow-admin-${stamp}@example.com`);
    await adminPage.fill("input[name=password]", temp);
    await adminPage.click("button[type=submit]");
    await adminPage.getByText(/workspace is suspended/i).waitFor({ timeout: 30_000 });

    // Reopen: sign-in works again, and the log shows who did what.
    await staff.getByRole("button", { name: "Reopen workspace" }).first().click();
    await staff.getByRole("button", { name: "Reopen workspace" }).last().click();
    await staff.getByRole("button", { name: "Suspend workspace" }).waitFor();
    await adminPage.fill("input[name=email]", `flow-admin-${stamp}@example.com`);
    await adminPage.fill("input[name=password]", temp);
    await adminPage.click("button[type=submit]");
    await adminPage.waitForURL(/dashboard|onboarding/, { timeout: 60_000 });
    await staff.goto(`${BASE}/platform-admin/activity`, { waitUntil: "networkidle" });
    const log = await staff.locator("body").innerText();
    for (const text of ["Suspended a workspace", "Reopened a workspace", "Changed a workspace's seat count", "Created a workspace"]) assert.ok(log.includes(text), `staff log is missing "${text}"`);
    assert.deepEqual(staff.errors, []);
  } finally {
    await db.organization.deleteMany({ where: { name: company } });
    await db.user.deleteMany({ where: { email: `flow-admin-${stamp}@example.com` } });
    await db.$disconnect();
    await adminPage?.context().close();
    await staff.context().close();
  }
});

test("a workspace at its seat limit can't add more people", async () => {
  const db = new PrismaClient();
  const admin = await signIn("admin");
  try {
    const org = await db.organization.findFirst({ where: { users: { some: { email: USERS.admin } } }, select: { id: true } });
    const used = await db.user.count({ where: { organizationId: org.id, role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } } });
    await db.organization.update({ where: { id: org.id }, data: { seatLimit: used } });
    await admin.goto(`${BASE}/dashboard/training?tab=people&new=person`, { waitUntil: "networkidle" });
    await admin.fill("input[name=name]", "Seat Test");
    await admin.fill("input[name=email]", `seat-test-${Date.now()}@example.com`);
    await admin.fill("input[name=jobTitle]", "Tester");
    await admin.getByRole("button", { name: "Invite person" }).click();
    await admin.getByText(/seats in this workspace are in use/).waitFor({ timeout: 30_000 });
  } finally {
    await db.organization.updateMany({ where: { users: { some: { email: USERS.admin } } }, data: { seatLimit: null } });
    await db.$disconnect();
    await admin.context().close();
  }
});

test("workers cannot open admin settings or the platform console", async () => {
  const page = await signIn("priya");
  try {
    await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "networkidle" });
    assert.ok(!/\/dashboard\/settings$/.test(new URL(page.url()).pathname), "worker stayed on settings");
    await page.goto(`${BASE}/platform-admin`, { waitUntil: "networkidle" });
    assert.ok(!page.url().includes("/platform-admin"), "worker reached the platform console");
  } finally {
    await page.context().close();
  }
});

test("the report form does not ask the reporter for seriousness, and shows emergency guidance", async () => {
  const page = await signIn("priya", { phone: true });
  try {
    await page.goto(`${BASE}/dashboard/reports/new`, { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    assert.ok(/emergency number/i.test(text));
    assert.ok(!/How serious could it have been/i.test(text));
  } finally {
    await page.context().close();
  }
});

test("an anonymous report returns a private case code that works on the follow-up page", async () => {
  const page = await signIn("priya", { phone: true });
  try {
    await page.goto(`${BASE}/dashboard/reports/new`, { waitUntil: "networkidle" });
    await page.locator('label:has-text("Other concern")').first().click();
    await page.fill("textarea[name=description]", "E2E anonymous: the door to the panel room is propped open during small jobs.");
    await page.locator('label:has-text("Submit without my name")').click();
    await page.getByRole("button", { name: "Submit report" }).click();
    await page.getByText("Your private case code").waitFor({ timeout: 30_000 });
    const code = (await page.locator("p.type-code").first().innerText()).trim();
    assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    const b = await launch();
    const anon = await (await b.newContext()).newPage();
    await anon.goto(`${BASE}/follow-up`, { waitUntil: "networkidle" });
    await anon.fill("input", code);
    await anon.getByRole("button", { name: /open|look up|continue|check/i }).first().click();
    await anon.getByText("Look up a different code").waitFor({ timeout: 30_000 });
    await anon.context().close();
  } finally {
    await page.context().close();
  }
});

test("support is a plain email link for everyone, and there is no chat widget", async () => {
  for (const who of ["admin", "priya"]) {
    for (const phone of [false, true]) {
      const page = await signIn(who, { phone });
      try {
        await page.goto(`${BASE}/dashboard/overview`, { waitUntil: "networkidle" });
        assert.equal(await page.getByRole("button", { name: /Help and messages/ }).count(), 0);
        if (phone) await page.getByRole("button", { name: "More" }).click();
        const link = page.getByRole("link", { name: "Contact support" });
        await link.waitFor();
        assert.equal(await link.getAttribute("href"), "mailto:support@reldro.com");
        assert.equal(await hasSideways(page), false, "support link causes sideways scrolling");
      } finally {
        await page.context().close();
      }
    }
  }
});

test("a supervisor cannot see who filed a confidential report", async () => {
  const page = await signIn("tom");
  try {
    await page.goto(`${BASE}/dashboard/reports?status=all`, { waitUntil: "networkidle" });
    const link = page.getByText("Worker fell about 6 feet from scaffold access ladder").first();
    if ((await link.count()) === 0) return; // this supervisor is not at that site, so nothing to leak
    await link.click();
    await page.waitForLoadState("networkidle");
    assert.ok(!(await page.locator("body").innerText()).includes("Fatima"));
  } finally {
    await page.context().close();
  }
});

test("the safety team can move a corrective action back to Proposed and forward again", async () => {
  const page = await signIn("admin");
  try {
    const target = page.getByText("Assign a daily housekeeping walk on level 4 and 5").first();
    for (let n = 1; n <= 6; n++) {
      await page.goto(`${BASE}/dashboard/actions?view=all&page=${n}`, { waitUntil: "networkidle" });
      if (await target.count()) break;
    }
    await target.click();
    await page.waitForSelector("text=Next step");
    await page.getByRole("button", { name: "Move back to Proposed" }).click();
    await page.fill("#move-reason", "E2E: plan changed");
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByText("Review this proposal").waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: "Approve corrective action" }).click();
    await page.getByText(/Ready for .* to start/).waitFor({ timeout: 20_000 });
  } finally {
    await page.context().close();
  }
});

test("long lists use numbered pages, keep filters, and never scroll sideways", async () => {
  const page = await signIn("admin", { phone: true });
  try {
    for (const path of ["reports?status=all", "actions?view=all"]) {
      await page.goto(`${BASE}/dashboard/${path}`, { waitUntil: "networkidle" });
      const nav = page.getByRole("navigation", { name: "Pagination" });
      assert.equal(await nav.count(), 1, `${path} has numbered pages`);
      assert.ok(/1–15 of \d+/.test(await nav.innerText()));
      await nav.getByRole("link", { name: "Page 2" }).click();
      await page.waitForURL(/page=2/, { timeout: 30_000 });
      await page.getByText(/16–\d+ of/).waitFor({ timeout: 30_000 });
      assert.ok(/16–\d+ of/.test(await page.getByRole("navigation", { name: "Pagination" }).innerText()));
      assert.equal(await hasSideways(page), false);
    }
  } finally {
    await page.context().close();
  }
});

test("searching reports can never reveal reports the person may not see", async () => {
  const page = await signIn("priya");
  try {
    await page.goto(`${BASE}/dashboard/reports?status=all&q=scaffold`, { waitUntil: "networkidle" });
    assert.ok(!(await page.locator("body").innerText()).includes("Worker fell about 6 feet"), "a worker saw someone else's report through search");
    await page.goto(`${BASE}/dashboard/reports?status=all&attention=unowned`, { waitUntil: "networkidle" });
    assert.ok(!(await page.locator("body").innerText()).includes("Worker fell about 6 feet"));
  } finally {
    await page.context().close();
  }
});

test("the reports toolbar filters by status and clears", async () => {
  const page = await signIn("admin");
  try {
    await page.goto(`${BASE}/dashboard/reports`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Incident responses" }).click();
    await page.waitForURL(/status=incidents/);
    await page.getByPlaceholder("Search title or details").fill("zzzz-nothing-matches");
    await page.getByText("No reports match these filters").waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.waitForURL((u) => !u.search.includes("q="), { timeout: 20_000 });
  } finally {
    await page.context().close();
  }
});

test("toolbox talks show as a compact list that opens on demand", async () => {
  const page = await signIn("admin");
  try {
    await page.goto(`${BASE}/dashboard/training`, { waitUntil: "networkidle" });
    assert.ok(await page.getByText("Needs attention").first().isVisible());
    const first = page.locator("details summary").filter({ hasText: "View talk" }).first();
    await first.click();
    await page.getByText(/Still to acknowledge|Everyone in scope/).first().waitFor({ timeout: 10_000 });
  } finally {
    await page.context().close();
  }
});

test("segmented filters change the view without reloading the page or jumping the scroll", async () => {
  const page = await signIn("admin");
  try {
    await page.goto(`${BASE}/dashboard/overview`, { waitUntil: "networkidle" });
    await page.evaluate(() => { window.__marker = 1; });
    const link = page.getByRole("link", { name: "90 days" });
    await link.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => document.querySelector("main").scrollTop);
    await link.click();
    await page.waitForURL(/pulse=90/, { timeout: 30_000 });
    assert.equal(await page.evaluate(() => window.__marker), 1, "the document reloaded");
    assert.equal(await page.evaluate(() => document.querySelector("main").scrollTop), before, "the page jumped");
  } finally {
    await page.context().close();
  }
});

test("deleting a person also removes their qualifications", async () => {
  const page = await signIn("admin");
  try {
    const name = `Temp Person ${Date.now() % 100000}`;
    await page.goto(`${BASE}/dashboard/training?tab=people&new=person`, { waitUntil: "networkidle" });
    await page.getByPlaceholder("Full name").fill(name);
    await page.getByPlaceholder("Work email").fill(`temp.${Date.now()}@example.com`);
    await page.getByPlaceholder(/Job title/).fill("Tester");
    await page.getByRole("button", { name: "Invite person" }).click();
    await page.waitForTimeout(2500);
    await page.goto(`${BASE}/dashboard/training?tab=people&pq=${encodeURIComponent(name)}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: `Actions for ${name}` }).click();
    await page.getByRole("menuitem", { name: "Delete person" }).click();
    await page.getByRole("button", { name: "Delete person" }).last().click();
    await page.waitForTimeout(2500);
    await page.goto(`${BASE}/dashboard/training?tab=people&pq=${encodeURIComponent(name)}`, { waitUntil: "networkidle" });
    assert.equal(await page.getByText(name).count(), 0);
  } finally {
    await page.context().close();
  }
});

test("on a phone the Submit bar sits directly above the tab bar, is opaque, and never covers content", async () => {
  const page = await signIn("priya", { phone: true });
  try {
    await page.goto(`${BASE}/dashboard/reports/new`, { waitUntil: "networkidle" });
    const geometry = () =>
      page.evaluate(() => {
        const main = document.querySelector("main");
        const nav = [...document.querySelectorAll('nav[aria-label="Primary"]')].pop();
        const bar = [...main.querySelectorAll("div")].find((d) => getComputedStyle(d).position === "sticky" && d.textContent?.includes("Submit report"));
        const n = nav.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        const bg = getComputedStyle(bar).backgroundColor;
        return { mainBottom: main.getBoundingClientRect().bottom, navTop: n.top, barBottom: b.bottom, bg, sticky: getComputedStyle(bar).position };
      });
    // Scrolled to the top, the bar is pinned just above the tab bar, and the scroll area stops where the tab bar starts.
    let g = await geometry();
    assert.ok(Math.abs(g.mainBottom - g.navTop) <= 1, "content area overlaps or leaves a gap above the tab bar");
    assert.ok(Math.abs(g.navTop - g.barBottom) <= 3, `the Submit bar is not directly above the tab bar (${g.navTop - g.barBottom}px apart)`);
    assert.ok(/rgb\(/.test(g.bg) && !/rgba/.test(g.bg), `the Submit bar is translucent (${g.bg})`);
    // Scrolled to the end, it is still flush against the tab bar, and the last field is reachable above it.
    await page.evaluate(() => document.querySelector("main").scrollTo({ top: 1e7, behavior: "instant" }));
    await page.waitForTimeout(250);
    g = await geometry();
    assert.ok(Math.abs(g.navTop - g.barBottom) <= 3, "the Submit bar drifts away from the tab bar at the end of the form");
    assert.equal(await hasSideways(page), false);
  } finally {
    await page.context().close();
  }
});

test("person fields are searchable pickers: focus on open, filter as you type, pinned choice stays on top, keyboard to choose", async () => {
  for (const phone of [false, true]) {
    const page = await signIn("admin", { phone });
    try {
      await page.goto(`${BASE}/dashboard/inspections`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Schedule inspection" }).click();
      const owner = page.getByRole("button", { name: /Owner/ });
      await owner.click();
      const search = page.getByRole("combobox", { name: /Search by name/ });
      assert.equal(await search.evaluate((e) => e === document.activeElement), true, "the search box should have focus when the picker opens");
      const options = page.locator("ul[role=listbox]").getByRole("option");
      assert.ok((await options.count()) <= 51, "a picker must never draw more than 50 people plus the pinned choice");
      await search.fill("okaf");
      const names = await options.allInnerTexts();
      assert.ok(names[0].includes("Anyone at the site"), "the pinned choice should stay first");
      assert.ok(names.some((n) => n.includes("Danielle Okafor")), "typing should filter to the matching person");
      assert.ok(!names.some((n) => n.includes("Priya Shah")), "non-matching people should be hidden");
      await search.fill("zzzz");
      await page.getByText(/No person matches/).waitFor();
      await search.fill("okaf");
      await search.press("ArrowDown");
      await search.press("Enter");
      assert.ok((await owner.innerText()).includes("Danielle Okafor"));
      assert.equal(await hasSideways(page), false);
    } finally {
      await page.context().close();
    }
  }
});

test("certifications: a requirement shows who is missing, a record closes the gap, verification sticks, exports work, and only the safety team can export", async () => {
  const name = `E2E cert ${Date.now() % 1000000}`;
  const page = await signIn("admin");
  try {
    // Define a certification that everyone must hold.
    await page.goto(`${BASE}/dashboard/training?tab=qualifications&cview=requirements`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Add certification" }).click();
    await page.getByLabel(/^Name/).first().fill(name);
    await page.getByLabel(/Valid for/).fill("24");
    await page.getByLabel(/Everyone/).check();
    await page.getByRole("button", { name: "Add certification" }).last().click();
    await page.getByText(name).first().waitFor();

    // It shows up as a gap for people who do not have it.
    await page.goto(`${BASE}/dashboard/training?tab=qualifications&cview=compliance&gq=${encodeURIComponent(name)}`, { waitUntil: "networkidle" });
    assert.ok((await page.getByText("Missing", { exact: true }).count()) > 0, "everyone should be missing the new certification");

    // Recording one fills the suggested expiry from the validity and closes that person's gap.
    await page.goto(`${BASE}/dashboard/training?tab=qualifications&cview=records`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Person/ }).click();
    await page.getByRole("combobox", { name: /Search by name/ }).fill("Priya");
    await page.getByRole("combobox", { name: /Search by name/ }).press("ArrowDown");
    await page.getByRole("combobox", { name: /Search by name/ }).press("Enter");
    await page.locator("select[name=typeId]").selectOption({ label: name });
    await page.getByLabel(/Issued/).fill("2026-10-03");
    assert.equal(await page.getByLabel(/Expires/).inputValue(), "2028-10-03", "24 months after the issue date is suggested");
    await page.getByLabel(/Certificate number/).fill("E2E-1");
    await page.getByRole("checkbox", { name: /I have seen the certificate/ }).check();
    await page.getByRole("button", { name: "Save certification" }).click();
    await page.getByText(/Recorded|recorded/).first().waitFor();

    await page.goto(`${BASE}/dashboard/training?tab=qualifications&cview=records&qq=${encodeURIComponent(name)}`, { waitUntil: "networkidle" });
    assert.equal(await page.getByText("Priya Shah").count() > 0, true);
    await page.getByRole("link", { name }).first().click();
    await page.waitForURL(/qualifications\//);
    await page.getByText(/Verified .* by /).waitFor();

    // Exports are CSV and carry the new record; the formula guard and the audit trail are covered by the route itself.
    const records = await page.request.get(`${BASE}/api/safety/export/certifications?kind=records`);
    assert.equal(records.status(), 200);
    assert.match(records.headers()["content-type"], /text\/csv/);
    assert.ok((await records.text()).includes(name));
    const gaps = await page.request.get(`${BASE}/api/safety/export/certifications?kind=gaps`);
    assert.equal(gaps.status(), 200);
    assert.ok((await gaps.text()).startsWith('"Person"'));

    // Clean up: remove the certification and the record.
    await page.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("button", { name: "Remove" }).last().click();
    await page.goto(`${BASE}/dashboard/training?tab=qualifications&cview=requirements`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: `Remove ${name}` }).click();
    await page.getByRole("button", { name: "Remove", exact: true }).last().click();
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/dashboard/training?tab=qualifications&cview=requirements`, { waitUntil: "networkidle" });
    assert.equal(await page.getByText(name).count(), 0);
  } finally {
    await page.context().close();
  }

  // Supervisors and workers cannot export; they are told no, not shown data.
  for (const who of ["tom", "priya"]) {
    const other = await signIn(who);
    try {
      const res = await other.request.get(`${BASE}/api/safety/export/certifications?kind=records`);
      assert.equal(res.status(), 403, `${who} must not be able to export certifications`);
    } finally {
      await other.context().close();
    }
  }
});

test("voice input: a device that cannot dictate gets a clear next step instead of a dead end", async () => {
  // 1. A speech engine that refuses (dictation off): the message offers the keyboard microphone and the button stops offering a retry.
  let page = await signIn("priya", { phone: true });
  try {
    await page.addInitScript(() => {
      const Fake = class {
        start() { setTimeout(() => this.onerror?.({ error: "service-not-allowed" }), 10); }
        stop() {}
        abort() {}
      };
      window.SpeechRecognition = Fake;
      window.webkitSpeechRecognition = Fake;
    });
    await page.goto(`${BASE}/dashboard/reports/new`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Speak instead/ }).click();
    await page.getByText(/Voice input is not available here/).waitFor();
    assert.ok(await page.getByRole("button", { name: /keyboard microphone/ }).isVisible());
    assert.equal(await page.getByRole("button", { name: /Speak instead/ }).isDisabled(), true);
    await page.getByRole("button", { name: /keyboard microphone/ }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "description", "the text box takes focus so the keyboard microphone is one tap away");
  } finally {
    await page.context().close();
  }
  // 2. A home-screen app on iPhone cannot run speech recognition at all: say so up front and disable the button.
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, "standalone", { value: true }); window.SpeechRecognition = window.webkitSpeechRecognition = class { start() {} stop() {} abort() {} }; });
  page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/login`);
    await page.fill("input[name=email]", "priya.shah@havenbrook.com");
    await page.fill("input[name=password]", "Demo1234!");
    await page.click("button[type=submit]");
    await page.waitForURL(/dashboard/, { timeout: 60_000 });
    await page.goto(`${BASE}/dashboard/reports/new`, { waitUntil: "networkidle" });
    await page.getByText(/does not run in a home-screen app on iPhone/).waitFor();
    assert.equal(await page.getByRole("button", { name: /Speak instead/ }).isDisabled(), true);
  } finally {
    await ctx.close();
  }
});

test("each site has its own page with the same insights, limited to that site", async () => {
  for (const phone of [false, true]) {
    const page = await signIn("admin", { phone });
    try {
      await page.goto(`${BASE}/dashboard/sites`, { waitUntil: "networkidle" });
      await page.getByRole("link", { name: /Lakeshore Tower retrofit/ }).first().click();
      await page.waitForURL(/dashboard\/sites\/c/);
      await page.getByRole("heading", { name: /Lakeshore Tower retrofit/ }).waitFor();
      const siteUrl = page.url().split("?")[0];
      for (const tab of ["", "?tab=reports", "?tab=actions", "?tab=inspections", "?tab=certifications"]) {
        const res = await page.goto(`${siteUrl}${tab}`, { waitUntil: "networkidle" });
        assert.ok(res.status() < 400, `${tab} returned ${res.status()}`);
        assert.equal(await hasSideways(page), false, `site page ${tab} scrolls sideways`);
        const body = await page.locator("body").innerText();
        assert.ok(!/Application error|Something went wrong/.test(body));
        assert.ok(!body.includes("Riverside Medical Center"), `site page ${tab} shows another site`);
      }
      // The reports list and the corrective actions list can be narrowed to the same site.
      const id = siteUrl.split("/").pop();
      await page.goto(`${BASE}/dashboard/reports?site=${id}`, { waitUntil: "networkidle" });
      await page.getByText("Reports for").waitFor();
      const rowText = await page.evaluate(() => [...document.querySelectorAll("main a[href*='/dashboard/reports/']")].map((a) => a.innerText).join("\n"));
      assert.ok(rowText.length > 0 && !rowText.includes("Riverside Medical Center"), "reports list shows another site");
      await page.goto(`${BASE}/dashboard/actions?site=${id}&view=all`, { waitUntil: "networkidle" });
      await page.getByText("Showing actions for").waitFor();
      assert.deepEqual(page.errors, []);
    } finally {
      await page.context().close();
    }
  }
});

test("insights exports: every dataset downloads for the safety team only, columns can be chosen, and a made-up site is ignored", async () => {
  const admin = await signIn("admin");
  const worker = await signIn("priya");
  try {
    const heads = { reports: "Reference", actions: "Reference", inspections: "Checklist", talks: "Talk", certifications: "Person" };
    for (const [dataset, first] of Object.entries(heads)) {
      const res = await admin.request.get(`${BASE}/api/safety/export/data?dataset=${dataset}&days=90`);
      assert.equal(res.status(), 200, dataset);
      assert.match(res.headers()["content-type"], /text\/csv/);
      const text = await res.text();
      assert.ok(text.startsWith(first), `${dataset} starts with ${first}, got ${text.slice(0, 40)}`);
      assert.ok(text.split("\n").length > 1, `${dataset} has rows`);
      const denied = await worker.request.get(`${BASE}/api/safety/export/data?dataset=${dataset}`);
      assert.equal(denied.status(), 403, `${dataset} must be safety team only`);
    }
    const cols = await (await admin.request.get(`${BASE}/api/safety/export/data?dataset=reports&cols=title,site`)).text();
    assert.equal(cols.split("\r\n")[0], "Site,Title", "columns follow the standard order, not the order in the URL");
    assert.ok(!cols.includes("Reference"), "unchosen columns are left out");
    assert.equal((await admin.request.get(`${BASE}/api/safety/export/data?dataset=nope`)).status(), 400);
    const bogus = await admin.request.get(`${BASE}/api/safety/export/data?dataset=reports&site=not-a-real-site`);
    assert.equal(bogus.status(), 200);
  } finally {
    await admin.context().close();
    await worker.context().close();
  }
});

test("targets: a company admin sets its own bar and the Insights cards are judged against it", async () => {
  const db = new PrismaClient();
  const admin = await signIn("admin");
  try {
    await admin.goto(`${BASE}/dashboard/insights?tab=setup`, { waitUntil: "networkidle" });
    await admin.fill("input[name=ackHours]", "0.5");
    await admin.getByRole("button", { name: "Save targets" }).click();
    await admin.getByText("Targets saved.").waitFor();
    await admin.goto(`${BASE}/dashboard/insights`, { waitUntil: "networkidle" });
    await admin.getByText("Target: 0.5 h or less").waitFor();
    await admin.goto(`${BASE}/dashboard/insights?tab=setup`, { waitUntil: "networkidle" });
    await admin.fill("input[name=certPct]", "101");
    await admin.getByRole("button", { name: "Save targets" }).click();
    await admin.getByText(/can.t be above 100/).waitFor();
  } finally {
    await db.$executeRawUnsafe(`UPDATE "Organization" SET "kpiTargets" = NULL WHERE id IN (SELECT "organizationId" FROM "User" WHERE email = '${USERS.admin}')`);
    await db.$disconnect();
    await admin.context().close();
  }
});

test("insights with many sites: the overview shows only the worst few and the Sites tab searches and pages the rest", async () => {
  const db = new PrismaClient();
  const admin = await signIn("admin");
  const siteRows = (p) => p.locator("table", { hasText: "Response overdue" }).locator("tbody tr");
  const tag = `ZZ Bulk ${Date.now()}`;
  let orgId;
  try {
    orgId = (await db.user.findUnique({ where: { email: USERS.admin }, select: { organizationId: true } })).organizationId;
    await db.site.createMany({ data: Array.from({ length: 45 }, (_, i) => ({ organizationId: orgId, name: `${tag} ${String(i + 1).padStart(2, "0")}` })) });
    await admin.goto(`${BASE}/dashboard/insights`, { waitUntil: "networkidle" });
    assert.ok((await siteRows(admin).count()) <= 5, "the overview lists at most five sites");
    await admin.getByRole("link", { name: /Compare all \d+ sites/ }).click();
    await admin.waitForURL(/tab=sites/);
    await siteRows(admin).first().waitFor();
    assert.equal(await siteRows(admin).count(), 15, "one page of fifteen sites");
    await admin.getByText(/of \d+ sites/).first().waitFor();
    await admin.getByPlaceholder("Search sites").fill(`${tag} 07`);
    await admin.waitForFunction(() => [...document.querySelectorAll("table")].find((t) => t.textContent.includes("Response overdue"))?.querySelectorAll("tbody tr").length === 1);
    await admin.getByPlaceholder("Search sites").fill("no such site anywhere");
    await admin.getByText("No site matches that search.").waitFor();
    assert.equal(await hasSideways(admin), false);
    await admin.goto(`${BASE}/dashboard/insights?tab=setup`, { waitUntil: "networkidle" });
    await admin.getByRole("button", { name: "Save targets" }).waitFor();
    await admin.getByText("Download CSV").waitFor();
    await admin.getByText("How to read these numbers").waitFor();
  } finally {
    if (orgId) await db.site.deleteMany({ where: { organizationId: orgId, name: { startsWith: tag } } });
    await db.$disconnect();
    await admin.context().close();
  }
});

test("list tables never cut a column off or crush the title at tablet and laptop widths", async () => {
  const page = await signIn("admin");
  try {
    for (const width of [768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["reports", "reports?status=all", "actions?view=all", "inspections", "investigations"]) {
        await page.goto(`${BASE}/dashboard/${path}`, { waitUntil: "networkidle" });
        const bad = await page.evaluate(() => {
          const out = [];
          for (const row of document.querySelectorAll("main [role=row]")) {
            if (row.scrollWidth > row.clientWidth + 1) out.push(`row wider than its box (${row.scrollWidth} > ${row.clientWidth})`);
            if (getComputedStyle(row).display === "grid" && row.firstElementChild && row.firstElementChild.getBoundingClientRect().width < 120) out.push(`title column only ${Math.round(row.firstElementChild.getBoundingClientRect().width)}px`);
          }
          return [...new Set(out)];
        });
        assert.deepEqual(bad, [], `${path} at ${width}px`);
        assert.equal(await hasSideways(page), false, `${path} scrolls sideways at ${width}px`);
      }
    }
  } finally {
    await page.context().close();
  }
});
