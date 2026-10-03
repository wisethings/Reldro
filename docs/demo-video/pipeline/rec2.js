// Records each demo scene as a frame sequence (CDP screencast) + a concat list with real durations.
// usage: node rec.js [sceneId ...]
const { chromium } = require('/home/user/Reldro/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const D = __dirname; const B = 'http://localhost:3100';

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


const plan = JSON.parse(fs.readFileSync(D + '/plan.json'));
const LEN = Object.fromEntries(plan.segs.map((s) => [s.id, s.len]));
const R3 = 'cmurskskc0033h4zpo1asmitl', INV = 'cmursksm70056h4zprfyzlsow', ACT = 'cmursksmj005gh4zp8zwkpg66';
const sc = (n) => (page) => page; // placeholder

const defs = {
  ov: { start: '/dashboard/overview', run: async (p, at, h, L) => { await h.glide(900, 300, 0); await at(0.3); await h.glide(560, 580, 1100); await at(1.6); await h.scrollMainTo(240, 1000); } },
  phone: { who: 'priya', phone: true, start: '/dashboard/reports/new', run: async (p, at, h, L) => {
    await at(0.1); await h.glide(195, 560, 300);
    await h.scrollIntoCenter(p.getByText('What are you reporting?'), 500);
    await at(0.8); await h.click(p.locator('label').filter({ hasText: /^Hazard/ }).first(), 400);
    await at(1.4); await h.scrollIntoCenter(p.locator('#description'), 500);
    await at(1.9); await h.click(p.locator('#description'), 350);
    await p.keyboard.type('Floor opening at ', { delay: 15 });
    await p.keyboard.insertText('grid C4 has no cover.');
    await at(4.0); await h.scrollIntoCenter(p.getByText('How should we identify you?'), 600);
    await at(4.9); await h.click(p.getByRole('button', { name: 'Submit report' }), 450);
  } },
  acts: { start: '/dashboard/actions', run: async (p, at, h, L) => {
    await at(0.5); await h.point(p.locator('td:visible, div:visible').filter({ hasText: /^\d+ days overdue/ }).first(), 1000, 0.3, 0.5);
    await at(2.0); await h.point(p.locator('span:visible').filter({ hasText: /^Ready to verify$/ }).first(), 1000);
    await at(3.6); await h.glide(1100, 520, 900); await at(4.6); await h.scrollMainTo(200, 1200);
  } },
  queue: { start: '/dashboard/reports', run: async (p, at, h, L) => {
    await at(0.4); await h.point(p.getByText('Owner', { exact: true }).first(), 900);
    await at(1.8); await h.glide(1000, 440, 900); await at(2.9); await h.glide(780, 380, 500);
  } },
  detail: { start: '/dashboard/reports/' + R3, run: async (p, at, h, L) => {
    await at(0.5); await h.point(p.getByText('Maria Delgado').first(), 1000, 0.3, 0.5);
    await at(2.0); await h.point(p.getByText('Response due'), 900, 0.3, 0.5);
  } },
  linked: { start: '/dashboard/reports/' + R3, pre: async (p) => { await p.evaluate(() => document.querySelector('main').scrollTo(0, 480)); await p.waitForTimeout(300); }, run: async (p, at, h, L) => {
    await at(0.4); await h.point(p.getByText('Open the investigation workspace'), 1000, 0.3, 0.5);
    await at(2.1); await h.point(p.getByText('Require cut-resistant gloves').first(), 1000, 0.4, 0.5);
    await at(3.6); await h.point(p.getByText('Verified', { exact: true }).first(), 800);
  } },
  inv: { start: '/dashboard/investigations/' + INV, run: async (p, at, h, L) => {
    await at(0.3); await h.scrollMainTo(560, 1500);
    await at(2.2); await h.point(p.getByText('Equipment condition or availability'), 900);
    await at(3.6); await h.point(p.locator('textarea').nth(2), 900, 0.5, 0.4);
    await at(4.6); await h.scrollMainTo(760, 900);
  } },
  act: { start: '/dashboard/actions/' + ACT, run: async (p, at, h, L) => {
    await at(0.4); await h.point(p.getByText('Ready to verify').nth(1), 900);
    await at(1.2); await h.scrollMainTo(450, 1100);
    await at(2.6); await h.click(p.getByRole('button', { name: 'Verify the fix' }), 1000);
    await at(3.8); await h.scrollMainTo(0, 900);
  } },
  insp: { start: '/dashboard/inspections', run: async (p, at, h, L) => {
    await at(0.3); await h.point(p.getByText('Weekly jobsite safety walk').first(), 800);
    await at(1.5); await h.point(p.getByText('Recently completed'), 700, 0.2, 0.5);
    await at(2.5); await h.click(p.getByText('Recently completed'), 500, 0.2, 0.5);
  } },
  talks: { start: '/dashboard/training', run: async (p, at, h, L) => {
    await at(0.4); await h.point(p.getByText('Ladder setup and inspection').first(), 1000);
    await at(1.8); await h.point(p.getByText('Needs acknowledgment').first(), 900);
    await at(3.1); await h.scrollMainTo(260, 1000);
  } },
  comp: { start: '/dashboard/training?tab=qualifications&cview=compliance', run: async (p, at, h, L) => {
    await at(0.3); await h.point(p.getByText('Missing', { exact: true }).first(), 800);
    await at(1.4); await h.point(p.getByText('Forklift').first(), 800);
    await at(2.6); await h.glide(1000, 500, 700);
  } },
  sites: { start: '/dashboard/sites', run: async (p, at, h, L) => {
    await at(0.5); await h.point(p.getByText('Next inspection').first(), 1100);
    await at(1.9); await h.point(p.getByText('Needs attention').nth(2), 900);
    await at(3.2); await h.scrollMainTo(240, 1000);
  } },
  insights: { start: '/dashboard/insights', run: async (p, at, h, L) => {
    const bars = async () => { const b = await p.locator('figure svg[role=img]').first().boundingBox(); return (f) => ({ x: b.x + b.width * f, y: b.y + b.height * 0.5 }); };
    await at(0.4); await h.point(p.getByText('Time to acknowledge').first(), 900, 0.3, 0.5);
    await at(1.5); await h.point(p.getByText('Close these first'), 800, 0.3, 0.5);
    await at(2.4); await h.scrollIntoCenter(p.locator('figure').first(), 1000);
    await at(3.6); const g = await bars(); await h.glide(g(0.55).x, g(0.55).y, 700);
    await at(4.5); await h.glide(g(0.9).x, g(0.9).y, 500);
    await at(5.3); await h.glide(g(0.895).x, g(0.895).y, 350); await sleep(150); await page_click(p);
    await at(6.6); await h.glide(1000, 560, 400);
  } },
};

async function page_click(p) { await p.mouse.down(); await sleep(60); await p.mouse.up(); }

async function record(browser, id) {
  const d = defs[id]; const len = LEN[id];
  const out = `${D}/frames/${id}`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const phone = !!d.phone; const { ctx, page } = await newPage(browser, d.who || 'admin', phone);
  await page.goto(B + d.start, { waitUntil: 'networkidle' }); if (d.pre) await d.pre(page); await page.waitForTimeout(400);
  const h = helpers(page); const cdp = await ctx.newCDPSession(page);
  const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    const t = Date.now(); const file = `${out}/f${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const t0 = Date.now();
  await cdp.send('Page.startScreencast', phone ? { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688 } : { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 });
  const at = async (t) => { const w = t * 1000 - (Date.now() - t0); if (w > 0) await sleep(w); };
  try { await d.run(page, at, h, len); } catch (e) { console.log(id, 'SEGMENT ERROR', e.message.split('\n')[0]); }
  const late = (Date.now() - t0) / 1000; if (late > len) console.log(id, 'OVERRAN by', (late - len).toFixed(2));
  await at(len);
  await cdp.send('Page.stopScreencast');
  const tEnd = t0 + len * 1000; await sleep(100);
  let lines = ''; const fr = frames.filter((f) => f.t <= tEnd);
  fr.forEach((f, i) => { const from = i === 0 ? t0 : f.t; const to = i + 1 < fr.length ? fr[i + 1].t : tEnd; lines += `file '${f.file}'\nduration ${Math.max(0.001, (to - from) / 1000).toFixed(3)}\n`; });
  lines += `file '${fr[fr.length - 1].file}'\n`;
  fs.writeFileSync(`${out}/list.txt`, lines);
  console.log(id, 'frames', fr.length, 'len', len);
  await ctx.close();
}

(async () => {
  const want = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--hide-scrollbars'] });
  const order = ['ov', 'acts', 'queue', 'detail', 'linked', 'inv', 'insp', 'talks', 'comp', 'sites', 'insights', 'phone', 'act'];
  for (const id of order) if (!want.length || want.includes(id)) await record(browser, id);
  await browser.close();
})();
