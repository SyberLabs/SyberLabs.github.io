// Browser smoke test: serves the built site (dist/) with the game's live files laid over it, opens the page in
// headless Chromium and takes screenshots. Usage:
//   PW_REQUIRE_FROM=/opt/npm-tools/package.json PW_EXECUTABLE=/usr/bin/google-chrome node psycho-syber/test/browser.mjs <outDir> [scenario]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
const require = createRequire(process.env.PW_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const root = resolve('.'), out = process.argv[2] || 'shots', scenario = process.argv[3] || 'title';
mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  for (const base of p.startsWith('/psycho-syber/') ? [root, join(root, 'dist')] : [join(root, 'dist'), root]) {
    const f = join(base, p);
    if (existsSync(f) && statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(await readFile(f)); return; }
  }
  res.writeHead(404); res.end('not found');
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.PW_EXECUTABLE || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--disable-default-apps'] });
const size = process.env.SIZE ? process.env.SIZE.split('x').map(Number) : [1440, 900];
const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => { if (!r.url().includes('fonts.g')) errors.push('requestfailed: ' + r.url()); });
const shot = async name => { await page.screenshot({ path: `${out}/${name}.png` }); };
const view = async name => { await page.locator('#ps-view').screenshot({ path: `${out}/${name}.png` }); };
const wait = ms => page.waitForTimeout(ms);
const S = {
  async title() {
    await page.goto(BASE + '/psycho-syber/', { waitUntil: 'load' }); await wait(1500);
    console.log('webgl', await page.evaluate(() => window.__ps.webgl), 'state', await page.evaluate(() => window.__ps.state));
    await shot('title-syber');
    await page.keyboard.press('Shift'); await wait(250); await shot('title-wipe'); await wait(900); await shot('title-psycho');
    await page.keyboard.press('Shift'); await wait(900);
    await page.click('#ps-start'); await wait(700); await shot('card'); await wait(4200);
    await page.keyboard.press('Enter'); await wait(600); await shot('play-start');
  },
  // jump straight into a stage: STAGE=n FORM=psycho AT=x,y (tiles)
  async stage() {
    const n = process.env.STAGE || '1';
    await page.goto(`${BASE}/psycho-syber/?stage=${n}&go=1${process.env.FORM ? '&form=' + process.env.FORM : ''}`, { waitUntil: 'load' }); await wait(600);
    const at = (process.env.AT || '').split(';').filter(Boolean);
    let i = 0;
    for (const a of at.length ? at : ['']) {
      if (a) { const [x, y, f] = a.split(','); await page.evaluate(([x, y, f]) => { const g = window.__ps.g; g.p.x = x * 16; g.p.y = y * 16; g.p.vy = 0; if (f) g.persona = f === 'p' ? 'psycho' : 'syber'; document.getElementById('ps-stage').classList.toggle('is-psycho', g.persona === 'psycho'); document.getElementById('ps-stage').classList.toggle('is-syber', g.persona !== 'psycho'); window.__ps.cam.x = x * 16 - 240; }, [+x, +y, f]); }
      await page.mouse.move(size[0] * 0.62, size[1] * 0.5); await wait(900);
      await view(`stage${n}-${i++}`);
    }
  },
  // Every stage from its card to the next one: the scripted run plays each stage inside the page up to its last
  // entry, then a held key walks into the exit, so the page's own cards, lists and ending are what is checked.
  async flow() {
    await page.goto(BASE + '/psycho-syber/', { waitUntil: 'load' }); await wait(800);
    const n = await page.evaluate(() => window.__ps.STAGES.length);
    await page.click('#ps-start'); await wait(300);
    for (let i = 0; i < n; i++) {
      console.log('card:', await page.evaluate(() => [document.getElementById('ps-card-kicker').textContent, document.getElementById('ps-card-title').textContent].join(' / ')));
      await page.keyboard.press('Enter'); await wait(300);
      const r = await page.evaluate(async i => {
        const { play } = await import('/psycho-syber/test/bot.mjs'), { SCRIPTS } = await import('/psycho-syber/test/scripts.mjs');
        const ps = window.__ps, s = SCRIPTS[ps.STAGES[i].id], r = play(ps.g, s.slice(0, -1));
        return { state: ps.state, why: r.why, x: Math.round(ps.g.p.x / 16), deaths: ps.g.deaths };
      }, i);
      if (r.why !== 'script ended before the exit') { console.log('  bot failed:', JSON.stringify(r)); break; }
      await wait(700); await view(`flow${i + 1}-play`);
      await page.keyboard.down('d');
      await page.waitForFunction(() => window.__ps.state === 'card', null, { timeout: 15000 });
      await page.keyboard.up('d'); await wait(900); await view(`flow${i + 1}-clear`);   // the card ignores input for its first 0.7 s
      console.log('  cleared:', await page.evaluate(() => [...document.querySelectorAll('#ps-card-stats div')].map(d => d.textContent).join(' | ') + ' · go: ' + document.getElementById('ps-card-go').textContent + ' · link: ' + document.getElementById('ps-card-link').textContent + ' -> ' + document.getElementById('ps-card-link').getAttribute('href') + ' · atlas shown: ' + !document.getElementById('ps-card-atlas').hidden + ' found ' + document.querySelectorAll('#ps-card-atlas .is-found').length + '/' + document.querySelectorAll('#ps-card-atlas li').length));
      await page.click('#ps-card-go'); await wait(400);
    }
    await wait(5200); await view('flow-end');
    console.log('end:', await page.evaluate(() => window.__ps.state + ' · ' + [...document.querySelectorAll('#ps-end-stats div')].map(d => d.textContent).join(' | ')));
    await page.click('#ps-again'); await wait(500);
    console.log('again:', await page.evaluate(() => window.__ps.state + ' · continue shown: ' + !document.getElementById('ps-continue').hidden + ' · ' + document.getElementById('ps-continue').textContent));
  },
  // The social card, og/psycho-syber.png: one frame held halfway through a change of form, so both looks show.
  //   ... node psycho-syber/test/browser.mjs og og       (run from the repository root; writes og/psycho-syber.png)
  async og() {
    await page.setViewportSize({ width: 1200, height: 739 });
    await page.goto(`${BASE}/psycho-syber/?stage=1&go=1`, { waitUntil: 'load' }); await wait(500);
    await page.mouse.move(600, 400);
    await page.evaluate(() => {
      const ps = window.__ps, g = ps.g, T = 16;
      g.p.x = 109.5 * T; g.p.y = 19 * T; g.p.vx = g.p.vy = 0; g.p.face = 1; g.persona = 'psycho'; ps.cam.x = g.p.x - 240;
      const w = g.ents.find(e => e.type === 'warden'); w.x = 116 * T; w.dir = -1;
      ps.wipe = 0.21;
      for (const id of ['ps-hud', 'ps-hint', 'ps-toast']) document.getElementById(id).style.visibility = 'hidden';
    });
    await wait(450);
    const frame = (await page.locator('#ps-view').screenshot()).toString('base64');
    const card = await ctx.newPage(); await card.setViewportSize({ width: 1200, height: 630 });
    await card.setContent(`<!doctype html><meta charset="utf-8"><style>
      html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #02070a; }
      .f { position: absolute; left: 0; top: -22px; width: 1200px; height: 675px; image-rendering: pixelated; }
      .s { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(2,7,10,.96) 0, rgba(2,7,10,.86) 22%, rgba(2,7,10,0) 38%); }
      .t { position: absolute; left: 64px; bottom: 34px; right: 64px; color: #e3f3fc; }
      h1 { margin: 0 0 10px; font: 500 70px/.9 "JetBrains Mono", "DejaVu Sans Mono", monospace; letter-spacing: 2px; }
      h1 i { font: italic 400 76px/.9 "Instrument Serif", "Liberation Serif", Georgia, serif; letter-spacing: 0; padding-right: 10px; background: linear-gradient(90deg, #ff5fa2, #ffb347, #fff2a8, #5dffb0, #b388ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
      h1 b { font-weight: 500; color: #4cc0f5; text-shadow: 0 0 34px rgba(2,151,222,.9); }
      p { margin: 0; font: 400 25px/1.3 "Instrument Sans", "DejaVu Sans", Arial, sans-serif; color: #c8dbe6; }
      .k { position: absolute; left: 64px; top: 44px; font: 500 20px/1 "JetBrains Mono", "DejaVu Sans Mono", monospace; letter-spacing: 5px; color: #e3f3fc; text-shadow: 0 0 12px #02070a, 0 0 4px #02070a; }
    </style><img class="f" src="data:image/png;base64,${frame}"><div class="s"></div><div class="k">SYBERLABS / GAME</div>
    <div class="t"><h1><i>PSYCHO</i> <b>SYBER</b></h1><p>A browser game in five stages, one for each project. Shift changes your form.</p></div>`);
    await card.waitForTimeout(300);
    await card.screenshot({ path: `${out}/psycho-syber.png` });
    await card.close();
  },
  async page() { await page.goto(BASE + '/psycho-syber/', { waitUntil: 'load' }); await wait(1200); await page.screenshot({ path: `${out}/page-full.png`, fullPage: true }); },
};
await S[scenario]();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close(); server.close();
