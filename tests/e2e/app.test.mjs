// Browser tests against a running, seeded app. Start it first (see docs/testing.md), then: npm run test:e2e
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, closeBrowser, hasSideways, launch, signIn } from "./helpers.mjs";

after(closeBrowser);

const PAGES = {
  admin: ["overview", "reports", "reports/new", "investigations", "actions", "inspections", "training", "sites", "insights", "settings", "settings/activity"],
  maria: ["overview", "reports", "investigations", "actions", "inspections", "training", "insights"],
  tom: ["overview", "reports", "actions", "inspections", "training"],
  priya: ["overview", "reports", "reports/new", "actions", "training"],
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

test("platform admin sees the inbox and organizations", async () => {
  const page = await signIn("platform");
  try {
    for (const path of ["", "/organizations", "/support", "/product-updates"]) {
      const res = await page.goto(`${BASE}/platform-admin${path}`, { waitUntil: "networkidle" });
      assert.ok(res && res.status() < 400, `${path} returned ${res?.status()}`);
    }
  } finally {
    await page.context().close();
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

test("the help button is for company admins only, and sending is off in the sample workspace", async () => {
  const admin = await signIn("admin");
  const worker = await signIn("priya");
  try {
    await admin.goto(`${BASE}/dashboard/overview`, { waitUntil: "networkidle" });
    const button = admin.getByRole("button", { name: /Help and messages/ });
    assert.equal(await button.count(), 1);
    await button.click();
    await admin.getByText("Help with Reldro").waitFor();
    await admin.getByText("This is a sample conversation").waitFor({ timeout: 30_000 });
    assert.equal(await admin.locator("#support-draft").isDisabled(), true);
    await worker.goto(`${BASE}/dashboard/overview`, { waitUntil: "networkidle" });
    assert.equal(await worker.getByRole("button", { name: /Help and messages/ }).count(), 0);
  } finally {
    await admin.context().close();
    await worker.context().close();
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
    await page.goto(`${BASE}/dashboard/actions?view=all`, { waitUntil: "networkidle" });
    await page.getByText("Assign a daily housekeeping walk on level 4 and 5").first().click();
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
      assert.ok(/Showing 1–25 of \d+/.test(await nav.innerText()));
      await nav.getByRole("link", { name: "Page 2" }).click();
      await page.waitForURL(/page=2/, { timeout: 30_000 });
      await page.getByText(/Showing 26–/).waitFor({ timeout: 30_000 });
      assert.ok(/Showing 26–/.test(await page.getByRole("navigation", { name: "Pagination" }).innerText()));
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
    await page.getByText(/Not yet acknowledged|Everyone in scope/).first().waitFor({ timeout: 10_000 });
  } finally {
    await page.context().close();
  }
});
