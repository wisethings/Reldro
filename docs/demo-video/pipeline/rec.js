// Records each demo scene as a frame sequence (CDP screencast) + a concat list with real durations.
// usage: node rec.js [sceneId ...]
const { chromium } = require('/home/user/Reldro/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const D = __dirname; const B = 'http://localhost:3100';
const dur = JSON.parse(fs.readFileSync(D + '/durations.json'));
const R17 = fs.readFileSync(D + '/r17.txt', 'utf8').trim();
const INV = 'cmurp917s005628hny9y7cxm9', ACT = 'cmurp917z005g28hnxkhrrkkc';
const LEAD = 0.35, TAIL = 0.9;
const total = (id) => +(dur[id] + LEAD + TAIL).toFixed(2);

const CURSOR_JS = `(() => {
  const mk = () => {
    if (document.getElementById('__cur')) return;
    const touch = window.__TOUCH;
    const c = document.createElement('div'); c.id = '__cur';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform;';
    c.innerHTML = touch
      ? '<div style="width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(138,74,126,.28);border:2px solid rgba(138,74,126,.8)"></div>'
      : '<svg width="26" height="26" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M4 2l15 9.2-6.4 1.6 3.6 6.6-2.8 1.5-3.6-6.6L4.5 19z" fill="#2A0A0C" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    let p = {}; try { p = JSON.parse(sessionStorage.getItem('__cp') || '{}'); } catch (e) {}
    const set = (x, y) => { c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; try { sessionStorage.setItem('__cp', JSON.stringify({ x, y })); } catch (e) {} };
    set(p.x ?? 640, p.y ?? 360);
    addEventListener('mousemove', (e) => set(e.clientX, e.clientY), true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;border:2px solid #8A4A7E;left:' + (e.clientX - 6) + 'px;top:' + (e.clientY - 6) + 'px;width:12px;height:12px;opacity:.9;transition:all .5s ease-out';
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.cssText += ';left:' + (e.clientX - 24) + 'px;top:' + (e.clientY - 24) + 'px;width:48px;height:48px;opacity:0'; });
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.documentElement) mk(); addEventListener('DOMContentLoaded', mk);
  const st = document.createElement('style');
  st.textContent = 'button[aria-label^="Help and messages"]{display:none!important} nextjs-portal{display:none!important} html{scroll-behavior:auto}';
  const addSt = () => (document.head || document.documentElement).appendChild(st);
  if (document.documentElement) addSt(); else addEventListener('DOMContentLoaded', addSt);
})();`;

async function newPage(browser, who, phone) {
  const ctx = await browser.newContext(phone
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: `${D}/${who}.json` }
    : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, storageState: `${D}/${who}.json` });
  await ctx.addInitScript(`window.__TOUCH=${phone ? 'true' : 'false'};`);
  await ctx.addInitScript(CURSOR_JS);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  return { ctx, page };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function helpers(page) {
  let pos = { x: 640, y: 360 };
  const h = {
    async glide(x, y, ms = 700) {
      const s = Math.max(8, Math.round(ms / 16)); const a = pos;
      for (let i = 1; i <= s; i++) { const t = ease(i / s); await page.mouse.move(a.x + (x - a.x) * t, a.y + (y - a.y) * t); await sleep(ms / s); }
      pos = { x, y };
    },
    async center(loc, dx = 0.5, dy = 0.5) { const b = await loc.boundingBox(); return { x: b.x + b.width * dx, y: b.y + b.height * dy }; },
    async point(loc, ms = 800, dx = 0.5, dy = 0.5) { const c = await h.center(loc, dx, dy); await h.glide(c.x, c.y, ms); },
    async click(loc, ms = 800, dx = 0.5, dy = 0.5) { await h.point(loc, ms, dx, dy); await sleep(120); await page.mouse.down(); await sleep(60); await page.mouse.up(); },
    async scrollMainTo(y, ms = 1500) {
      await page.evaluate(([y, ms]) => new Promise((res) => {
        const m = document.querySelector('main'); const y0 = m.scrollTop; const t0 = performance.now();
        const f = (n) => { const t = Math.min(1, (n - t0) / ms); const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; m.scrollTop = y0 + (y - y0) * e; t < 1 ? requestAnimationFrame(f) : res(); };
        requestAnimationFrame(f);
      }), [y, ms]);
    },
    async scrollIntoCenter(loc, ms = 1200) {
      await loc.evaluate((el, ms) => new Promise((res) => {
        let sc = el.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
        if (!sc) return res();
        const r = el.getBoundingClientRect(); const sr = sc.getBoundingClientRect();
        const target = sc.scrollTop + (r.top - sr.top) - sc.clientHeight / 2 + r.height / 2; const y0 = sc.scrollTop; const t0 = performance.now();
        const f = (n) => { const t = Math.min(1, (n - t0) / ms); const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; sc.scrollTop = y0 + (target - y0) * e; t < 1 ? requestAnimationFrame(f) : res(); };
        requestAnimationFrame(f);
      }), ms);
    },
    get pos() { return pos; }, set pos(v) { pos = v; },
  };
  return h;
}

const sceneDefs = {
  async s1(page, at, h) { // overview, after the title card
    await h.glide(900, 300, 0); await at(0.6); await h.glide(560, 575, 1400); await at(2.6); await h.point(page.getByText('Open workspace').first(), 1200); await at(5.2); await h.scrollMainTo(260, 1800);
  },
  async s3(page, at, h) { // reports queue -> incident workspace
    await at(0.8); await h.point(page.getByText('Response overdue').first(), 1000, 0.5, 0.5);
    await at(2.4); await h.glide(760, 470, 1000); await at(4.2);
    await h.click(page.getByText('Worker fell about 6 feet').first(), 1100);
    await page.waitForURL(/reports\/c/, { timeout: 15000 }); await page.waitForLoadState('networkidle');
    await at(7.0); await h.glide(900, 400, 900); await at(8.2); await h.scrollMainTo(380, 1800);
  },
  async s4(page, at, h) { // investigation
    await at(0.8); await h.point(page.locator('textarea').first(), 1000, 0.5, 0.3);
    await at(3.0); await h.scrollMainTo(560, 2000);
    await at(5.2); await h.point(page.getByText('Equipment condition or availability'), 1000);
    await at(7.6); await h.scrollMainTo(1010, 1800);
  },
  async s5(page, at, h) { // corrective action
    await at(0.8); await h.point(page.getByText('Ready to verify').nth(1), 1100, 0.5, 0.5);
    await at(2.2); await h.scrollMainTo(450, 1400);
    await at(4.0); await h.click(page.getByRole('button', { name: 'Verify the fix' }), 1100);
    await at(5.2); await h.scrollMainTo(0, 900);
  },
  async s6(page, at, h) { // inspections -> talk -> compliance
    await at(0.8); await h.point(page.getByText('Weekly jobsite safety walk').first(), 1000);
    await at(2.4); await page.goto(B + '/dashboard/training', { waitUntil: 'networkidle' });
    await at(3.2); await h.point(page.getByText('Needs acknowledgement').first().or(page.getByText('Needs acknowledgment').first()), 1000);
    await at(5.4); await h.click(page.getByRole('link', { name: /^Certifications/ }).or(page.getByRole('button', { name: /^Certifications/ })).first(), 1000);
    await page.waitForLoadState('networkidle');
    await at(7.4); await h.point(page.getByText('Missing').first(), 1000);
    await at(9.0); await h.point(page.getByText('Forklift').first(), 1000);
  },
  async s7(page, at, h) { // sites
    await at(0.8); await h.point(page.getByText('Next inspection').first(), 1200);
    await at(3.2); await h.point(page.getByText('Needs attention').nth(2), 1100);
    await at(4.8); await h.scrollMainTo(180, 1200);
  },
};

const startUrls = {
  s1: '/dashboard/overview', s3: '/dashboard/reports', s4: `/dashboard/investigations/${INV}`, s5: `/dashboard/actions/${ACT}`,
  s6: '/dashboard/inspections', s7: '/dashboard/sites',
};

async function record(browser, id, { who = 'admin', phone = false, start, len, run }) {
  const out = `${D}/frames/${id}`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const { ctx, page } = await newPage(browser, who, phone);
  await page.goto(B + start, { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  const h = helpers(page);
  const cdp = await ctx.newCDPSession(page);
  const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    const t = Date.now(); const file = `${out}/f${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const t0 = Date.now();
  await cdp.send('Page.startScreencast', phone ? { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688 } : { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 });
  const at = async (t) => { const w = t * 1000 - (Date.now() - t0); if (w > 0) await sleep(w); };
  try { await run(page, at, h); } catch (e) { console.log(id, 'SCENE ERROR', e.message.split('\n')[0]); }
  await at(len);
  await cdp.send('Page.stopScreencast');
  const tEnd = t0 + len * 1000; await sleep(100);
  // concat list with real durations
  let lines = ''; const fr = frames.filter((f) => f.t <= tEnd);
  fr.forEach((f, i) => { const from = i === 0 ? t0 : f.t; const to = i + 1 < fr.length ? fr[i + 1].t : tEnd; lines += `file '${f.file}'\nduration ${Math.max(0.001, (to - from) / 1000).toFixed(3)}\n`; });
  lines += `file '${fr[fr.length - 1].file}'\n`;
  fs.writeFileSync(`${out}/list.txt`, lines);
  console.log(id, 'frames', fr.length, 'len', len);
  await ctx.close();
}

(async () => {
  const want = process.argv.slice(2);
  const on = (id) => !want.length || want.includes(id);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--hide-scrollbars'] });
  // s1 records only the part after the title card
  if (on('s1')) await record(browser, 's1', { start: startUrls.s1, len: total('s1') - 4.2, run: async (p, at, h) => sceneDefs.s1(p, (t) => at(t), h) });
  if (on('s2')) await record(browser, 's2', { who: 'priya', phone: true, start: '/dashboard/reports/new', len: total('s2'), run: sceneS2 });
  for (const id of ['s3', 's4', 's5', 's6', 's7']) if (on(id)) await record(browser, id, { start: startUrls[id], len: total(id), run: (p, at, h) => sceneDefs[id](p, at, h) });
  await browser.close();
})();

async function sceneS2(page, at, h) {
  const tap = async (loc, ms = 700) => { await h.click(loc, ms); };
  await at(0.9); await h.glide(195, 560, 600);
  await h.scrollIntoCenter(page.getByText('What are you reporting?'), 1100);
  await at(2.4); await tap(page.locator('label').filter({ hasText: /^Hazard/ }).first(), 700);
  await at(3.6); await h.scrollIntoCenter(page.locator('#description'), 900);
  await at(4.6); await tap(page.locator('#description'), 600);
  await page.keyboard.type('The cover over the floor opening at grid C4 is missing again. Someone could step right into it.', { delay: 38 });
  await at(9.0); await h.point(page.getByRole('button', { name: /Speak instead/ }), 700);
  await at(10.0); await h.scrollIntoCenter(page.getByText('Photos', {exact:false}).filter({hasText:'optional'}).first(), 1000);
  await at(11.6); await h.scrollIntoCenter(page.getByText('Share my name with the safety team only').first(), 1000);
  await at(12.8); await tap(page.locator('label').filter({ hasText: 'Submit without my name' }).first(), 600);
}
