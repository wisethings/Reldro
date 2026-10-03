const { chromium } = require('/home/user/Reldro/node_modules/playwright');
const D = __dirname; const B = 'http://localhost:3100';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [k, email] of [['admin', 'admin@havenbrook.com'], ['priya', 'priya.shah@havenbrook.com']]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
    await p.goto(B + '/login'); await p.fill('input[name=email]', email); await p.fill('input[name=password]', 'Demo1234!'); await p.click('button[type=submit]');
    await p.waitForURL(/dashboard/, { timeout: 60000 });
    await ctx.storageState({ path: `${D}/${k}.json` }); console.log(k, p.url());
    if (k === 'admin') {
      const urls = { ov: '/dashboard/overview', rep: '/dashboard/reports', inv: '/dashboard/investigations/cmunt6ha10056wgvw9kbo0mes', act: '/dashboard/actions/cmunt6hae005gwgvwzoj9hw8e', insp: '/dashboard/inspections', train: '/dashboard/training', comp: '/dashboard/training?tab=qualifications&cview=compliance', sites: '/dashboard/sites' };
      for (const [n, u] of Object.entries(urls)) { await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); await p.screenshot({ path: `${D}/pv-${n}.png` }); }
    } else {
      const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: `${D}/priya.json` }); const q = await c2.newPage();
      await q.goto(B + '/dashboard/reports/new', { waitUntil: 'networkidle' }); await q.screenshot({ path: `${D}/pv-new.png` });
    }
  }
  await b.close();
})();
