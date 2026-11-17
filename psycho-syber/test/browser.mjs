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
    // with keys, nothing written for touch may show: not the title line, the Pause list, the pad or the skip line
    console.log('touch-only lines hidden with keys:', await page.evaluate(() => [...document.querySelectorAll('.ps-for-touch')].every(n => getComputedStyle(n).display === 'none') && [...document.querySelectorAll('.ps-for-keys')].every(n => getComputedStyle(n).display !== 'none') && document.getElementById('ps-pad').hidden));
    await page.click('#ps-start'); await wait(300);
    for (let i = 0; i < n; i++) {
      if (await page.evaluate(i => !!window.__ps.STAGES[i].real, i)) {
        console.log('card:', await page.evaluate(() => [document.getElementById('ps-card-kicker').textContent, document.getElementById('ps-card-title').textContent].join(' / ')));
        await page.keyboard.press('Enter'); await wait(1500); await view('flow-real-play');
        await page.evaluate(() => { window.__ps.g.realT = 37.5; }); await wait(1500); await view('flow-real-order');
        await page.waitForFunction(() => window.__ps.state === 'meta', null, { timeout: 8000 });
        for (const [ms, name] of [[900, 'meta-1'], [1300, 'meta-16'], [1500, 'meta-1024'], [3000, 'meta-read'], [5000, 'meta-read2']]) { await wait(ms); await shot('flow-' + name); }
        await page.waitForFunction(() => !document.getElementById('ps-wake').hidden, null, { timeout: 12000 }); await wait(1500); await shot('flow-wake'); await wait(6200); await shot('flow-wake2');
        console.log('  title while the page is dark:', await page.title());
        await page.waitForFunction(() => window.__ps.state === 'end', null, { timeout: 15000 });
        break;
      }
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
    await wait(600); await view('flow-end');
    console.log('title after:', await page.title());
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
    <div class="t"><h1><i>PSYCHO</i> <b>SYBER</b></h1><p>A browser game in six stages. Shift changes your form.</p></div>`);
    await card.waitForTimeout(300);
    await card.screenshot({ path: `${out}/psycho-syber.png` });
    await card.close();
  },
  // THE REAL BATTLE: the room in both looks, each answer of the machine, the picture of the Patron.
  async real() {
    await page.goto(`${BASE}/psycho-syber/?stage=6&go=1`, { waitUntil: 'load' }); await wait(2600);
    await page.mouse.move(size[0] * 0.5, size[1] * 0.3); await view('real-0');
    await page.mouse.down(); await wait(60); await page.mouse.up(); await wait(900); await view('real-glass');
    await page.keyboard.down('d'); await wait(1400); await page.keyboard.up('d'); await page.keyboard.press('e'); await wait(700); await view('real-check');
    await page.keyboard.press('Shift'); await wait(1200); await view('real-jaguar');
    await page.keyboard.press('e'); await wait(900); await view('real-roar');
    await page.evaluate(() => { const g = window.__ps.g; g.p.x = 26.5 * 16; g.p.y = 6 * 16; g.p.vx = g.p.vy = 0; }); await wait(700); await view('real-picture');
    await page.keyboard.press('Shift'); await wait(400);
    await page.evaluate(() => { const g = window.__ps.g; g.blind = 7; g.realT = 38.95; g.p.hp = 4; g.p.inv = 9; g.p.x = 200; g.p.y = 240; }); await wait(450); await view('real-order');
    await wait(1200); await view('real-wall');
    console.log('log:', await page.evaluate(() => JSON.stringify({ realT: window.__ps.g.realT.toFixed(1), orders: window.__ps.g.orders, hp: window.__ps.g.p.hp, state: window.__ps.state })));
  },
  // The way to the command ship: three roars at the great carved head, the three on the deck, and the way back.
  async ship() {
    await page.goto(`${BASE}/psycho-syber/?stage=1&go=1&form=psycho`, { waitUntil: 'load' }); await wait(600);
    await page.evaluate(() => { const g = window.__ps.g; g.p.x = 13 * 16; g.p.y = 20 * 16; });
    for (let i = 0; i < 3; i++) { await page.evaluate(() => { window.__ps.g.p.roarCd = 0; }); await page.keyboard.press('e'); await wait(700); await view('ship-omen' + (i + 1)); }
    await wait(900); await view('ship-beam'); console.log('state during the beam:', await page.evaluate(() => window.__ps.state));
    await page.waitForFunction(() => window.__ps.g.L.def.id === 'ship' && window.__ps.state === 'play', null, { timeout: 12000 }); await wait(800); await view('ship-deck');
    await page.keyboard.down('d'); await wait(1100); await page.keyboard.up('d'); await wait(1500); await view('ship-talk1');
    await page.keyboard.press('Shift'); await wait(900); await view('ship-deck-psycho'); await page.keyboard.press('Shift'); await wait(600);
    await page.keyboard.down('d');
    await page.waitForFunction(() => window.__ps.state === 'card', null, { timeout: 20000 });
    await page.keyboard.up('d'); await wait(900); await view('ship-back');
    console.log('back:', await page.evaluate(() => [window.__ps.state, document.getElementById('ps-card-title').textContent, localStorage.getItem('psycho-syber.ship'), window.__ps.g.p.maxHp, window.__ps.g.said].join(' · ')));
  },
  // Touch: a phone held sideways and upright. Fingers are sent through the browser's own touch input, so the
  // page's pointer handlers are what is checked: the stick, the three buttons, a tap to throw, and a cord that
  // stays tied after the finger lifts.
  async touch() {
    const land = process.env.SIZE ? size : [844, 390];
    const tctx = await browser.newContext({ viewport: { width: land[0], height: land[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const tp = await tctx.newPage(); tp.on('pageerror', e => errors.push('pageerror: ' + e.message));
    const cdp = await tctx.newCDPSession(tp), W = ms => tp.waitForTimeout(ms), snap = name => tp.screenshot({ path: `${out}/touch-${name}.png` });
    const finger = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id: id || 0 })) });
    const center = sel => tp.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
    const tap = async sel => { const [x, y] = await center(sel); await finger('touchStart', [[x, y]]); await W(60); await finger('touchEnd', []); await W(120); };
    const G = fn => tp.evaluate(fn);
    await tp.goto(BASE + '/psycho-syber/', { waitUntil: 'load' }); await W(1200);
    console.log('touch mode:', await G(() => window.__ps.touch), '· keys line shown:', await G(() => getComputedStyle(document.querySelector('.ps-for-keys')).display), '· touch line shown:', await G(() => getComputedStyle(document.querySelector('.ps-for-touch')).display));
    await snap('title');
    await finger('touchStart', [[land[0] * 0.2, land[1] * 0.3]]); await W(50); await finger('touchEnd', []); await W(900);
    console.log('a tap on the title changed form to:', await G(() => window.__ps.g.persona)); await snap('title-psycho');
    await finger('touchStart', [[land[0] * 0.2, land[1] * 0.3]]); await W(50); await finger('touchEnd', []); await W(700);
    await tap('#ps-start'); await W(600); await snap('card');
    console.log('card state:', await G(() => window.__ps.state), '· stage takes the screen:', await G(() => document.getElementById('ps-stage').classList.contains('is-immersive')));
    await W(900); await tap('#ps-card-go'); await W(700);
    console.log('play state:', await G(() => window.__ps.state), '· pad hidden:', await G(() => document.getElementById('ps-pad').hidden));
    await snap('play');
    // the stick: hold right
    const [sx, sy] = await center('#ps-stick'), x0 = await G(() => window.__ps.g.p.x);
    await finger('touchStart', [[sx, sy, 1]]); await W(40); await finger('touchMove', [[sx + 40, sy, 1]]); await W(1200); await snap('walk');
    // a second finger on Jump while the first still holds the stick
    const [jx, jy] = await center('#ps-b-jump'); await finger('touchMove', [[sx + 40, sy, 1], [jx, jy, 2]].slice(0, 1)); await finger('touchStart', [[sx + 40, sy, 1], [jx, jy, 2]]); await W(120);
    const vy = await G(() => window.__ps.g.p.vy); await finger('touchEnd', [[sx + 40, sy, 1]]); await W(500); await finger('touchEnd', []); await W(300);
    console.log('stick right moved the weaver by', Math.round(await G(() => window.__ps.g.p.x) - x0), 'px · jump while walking gave vy', Math.round(vy), '· pad after release:', JSON.stringify(await G(() => window.__ps.pad)));
    await tap('#ps-b-form'); await W(700); console.log('Form ->', await G(() => window.__ps.g.persona));
    await tap('#ps-b-act'); await W(500); console.log('E as the jaguar -> roars', await G(() => window.__ps.g.roars), '· button reads', await G(() => document.getElementById('ps-b-act-t').textContent)); await snap('jaguar');
    await tap('#ps-b-form'); await W(900);
    // a tap on the picture throws glass
    const before = await G(() => window.__ps.g.throws); await finger('touchStart', [[land[0] * 0.6, land[1] * 0.35]]); await W(50); await finger('touchEnd', []); await W(300);
    console.log('a tap on the picture threw', await G(() => window.__ps.g.throws) - before, 'glass');
    // the cord: stand under the first ring, press and hold on it, lift the finger: it stays tied. A tap lets go.
    await G(() => { const g = window.__ps.g; g.p.x = 51 * 16; g.p.y = 16 * 16; g.p.vx = g.p.vy = 0; }); await W(900);
    const ring = await G(() => { const ps = window.__ps, e = ps.g.ents.find(e => e.type === 'ring'), r = document.getElementById('ps-view').getBoundingClientRect(); return [r.left + (e.x - ps.cam.x) / 480 * r.width, r.top + (e.y - ps.cam.y) / 270 * r.height, Math.round(e.x / 16), Math.round(e.y / 16), Math.round(ps.g.p.x / 16), Math.round(ps.g.p.y / 16)]; });
    await finger('touchStart', [[ring[0], ring[1]]]); await W(450); const roped = await G(() => !!window.__ps.g.p.rope); await finger('touchEnd', []); await W(400);
    console.log('ring at tile', ring.slice(2, 4).join(','), 'player at', ring.slice(4).join(','), '· held press tied the cord:', roped, '· still tied after the finger lifted:', await G(() => !!window.__ps.g.p.rope && window.__ps.tied)); await snap('cord');
    await finger('touchStart', [[ring[0] + 30, ring[1] + 40]]); await W(50); await finger('touchEnd', []); await W(300);
    console.log('a tap let it go:', await G(() => !window.__ps.g.p.rope && !window.__ps.tied));
    await tap('#ps-b-pause'); await W(400); console.log('pause ->', await G(() => window.__ps.state)); await snap('pause');
    await tap('#ps-resume'); await W(400);
    // a phone held upright: the stage is drawn sideways along the long edge. The screen's down is the picture's right.
    await tp.setViewportSize({ width: land[1], height: land[0] }); await W(900); await snap('turned');
    const vr = await G(() => { const v = document.getElementById('ps-view').getBoundingClientRect(); return [Math.round(v.left), Math.round(v.top), Math.round(v.width), Math.round(v.height)]; });
    console.log('upright phone: drawn sideways:', await G(() => window.__ps.turned), '· picture on screen', JSON.stringify(vr), '· sideways scroll:', await G(() => document.documentElement.scrollWidth - innerWidth));
    await G(() => { const g = window.__ps.g; g.p.x = 4 * 16; g.p.y = 20 * 16; g.p.vx = g.p.vy = 0; }); await W(300);
    const [tx, ty] = await center('#ps-stick'), x1 = await G(() => window.__ps.g.p.x);
    await finger('touchStart', [[tx, ty, 1]]); await W(40); await finger('touchMove', [[tx, ty + 40, 1]]); await W(900);
    const walked = Math.round(await G(() => window.__ps.g.p.x) - x1); await finger('touchMove', [[tx - 40, ty, 1]]); await W(120);
    const down = await G(() => window.__ps.pad.down && !window.__ps.pad.right); await finger('touchEnd', []); await W(200);
    console.log('  finger down the screen walked right by', walked, 'px · finger to the screen\'s left is the stick down:', down);
    // a tap three quarters along the picture and two fifths down it: on the screen that is down from the top, and in from the right
    await finger('touchStart', [[vr[0] + vr[2] * (1 - 0.4), vr[1] + vr[3] * 0.75]]); await W(50); await finger('touchEnd', []); await W(200);
    console.log('  a tap landed at', await G(() => [Math.round(window.__ps.mouse.x), Math.round(window.__ps.mouse.y)].join(',')), 'of 480,270 (aimed for 360,108)');
    await tap('#ps-b-pause'); await W(400); await snap('turned-pause');
    await tap('#ps-turn'); await W(500); console.log('  Play upright ->', await G(() => [window.__ps.turned, document.getElementById('ps-stage').className, document.getElementById('ps-turn').textContent].join(' · ')));
    await tap('#ps-resume'); await W(500); await snap('upright');
    const box = await G(() => { const v = document.getElementById('ps-view').getBoundingClientRect(), j = document.getElementById('ps-b-jump').getBoundingClientRect(); return { view: [Math.round(v.left), Math.round(v.top), Math.round(v.width), Math.round(v.height)], jump: [Math.round(j.left), Math.round(j.top), Math.round(j.width)] }; });
    console.log('upright:', JSON.stringify(box), '· sideways scroll:', await G(() => document.documentElement.scrollWidth - innerWidth));
    await tap('#ps-b-pause'); await W(400); await snap('upright-pause'); await tap('#ps-turn'); await W(300); await tap('#ps-resume'); await W(300);
    console.log('  Play sideways ->', await G(() => window.__ps.turned));
    // the card after THE RECORD, with the Atlas list, upright and sideways; then the last stage sideways
    await tp.goto(BASE + '/psycho-syber/?stage=5&go=1', { waitUntil: 'load' }); await W(900);
    await G(() => { const g = window.__ps.g, x = g.ents.find(e => e.type === 'exit'); g.evidence = g.evidenceTotal; g.p.x = x.x; g.p.y = x.y + 16; }); await W(1200); await snap('turned-card5');
    await tp.setViewportSize({ width: land[0], height: land[1] }); await W(700); await snap('card5');
    await tap('#ps-card-go'); await W(900); await tap('#ps-card-go'); await W(2600); await snap('real');
    await G(() => { window.__ps.g.realT = 39.2; window.__ps.g.p.inv = 9; }); await W(1500); await snap('real-order');
    await tp.waitForFunction(() => !document.getElementById('ps-wake').hidden, null, { timeout: 30000 }); await W(1700); await snap('wake');
    await finger('touchStart', [[200, 200]]); await W(50); await finger('touchEnd', []); await W(700);
    console.log('a tap skipped the last words ->', await G(() => window.__ps.state)); await snap('end');
    await tp.setViewportSize({ width: land[1], height: land[0] }); await W(700); await snap('turned-end');
    await tap('#ps-again'); await W(600);
    await tp.goto(BASE + '/psycho-syber/', { waitUntil: 'load' }); await W(1200); await snap('upright-title');
    await tap('#ps-start'); await W(1500); await snap('turned-card'); await tap('#ps-card-go'); await W(600);
    await tap('#ps-b-sound'); await W(200); console.log('sound button -> muted', await G(() => window.__ps.audio.muted)); await tap('#ps-b-sound'); await W(200);
    await tap('#ps-b-pause'); await W(300); await tap('#ps-quit'); await W(600);
    console.log('title again:', await G(() => window.__ps.state), '· stage back in the page:', await G(() => !document.getElementById('ps-stage').classList.contains('is-immersive') && !window.__ps.turned));
    await tctx.close();
  },
  // The story text on a stage's card: every phrase must sit in the middle of the picture and stay where it is while
  // its words arrive. STAGE=n picks the stage. Prints each phrase with how far its middle is from the picture's.
  async story() {
    await page.goto(`${BASE}/psycho-syber/?stage=${process.env.STAGE || 1}`, { waitUntil: 'load' }); await wait(150);
    const seen = new Map(); let shots = 0;
    for (let i = 0; i < 400; i++) {
      const r = await page.evaluate(() => { const n = document.getElementById('ps-rsvp'), v = document.getElementById('ps-view').getBoundingClientRect(); if (n.hidden || !n.firstChild) return null; const g = document.createRange(); g.selectNodeContents(n); const b = g.getBoundingClientRect(); return { text: n.textContent, on: n.querySelectorAll('.is-on').length, of: n.children.length, off: +((b.left + b.right) / 2 - (v.left + v.right) / 2).toFixed(1), left: Math.round(b.left), width: Math.round(b.width), size: parseFloat(getComputedStyle(n).fontSize), lines: Math.round(b.height / (parseFloat(getComputedStyle(n).fontSize) * 1.08)) }; });
      if (!r) { if (seen.size && i > 40) break; await wait(40); continue; }
      const e = seen.get(r.text) || { ...r, moved: false, first: r.on }; if (e.left !== r.left || e.width !== r.width) e.moved = true; e.last = r.on; seen.set(r.text, e);
      if (r.on === r.of && !e.shot && shots < 3 && (seen.size === 2 || seen.size === 4 || seen.size === 7)) { e.shot = true; shots++; await view(`story-${size[0]}-${shots}`); }
      await wait(40);
    }
    for (const [text, e] of seen) console.log(`${e.off === 0 && !e.moved ? 'ok ' : 'BAD'} "${text}" · ${e.of} words · middle off by ${e.off} px · ${e.moved ? 'MOVED' : 'did not move'} · ${e.lines} line${e.lines > 1 ? 's' : ''} · ${e.size}px`);
    console.log(`${seen.size} phrases, ${[...seen.values()].filter(e => Math.abs(e.off) > 1 || e.moved).length} off centre or moved`);
  },
  // The title once stages are finished: a button for each stage reached, with its Atlas marks. SIZE=390x844 for a phone.
  async pick() {
    await page.goto(BASE + '/psycho-syber/', { waitUntil: 'load' }); await wait(500);
    await page.evaluate(() => { localStorage.setItem('psycho-syber.stage', '3'); localStorage.setItem('psycho-syber.atlas', JSON.stringify(['paracas', 'rapanui', 'sacsay', 'canyon'])); });
    await page.reload({ waitUntil: 'load' }); await wait(1200); await shot('pick-' + size[0]);
    console.log('buttons:', await page.evaluate(() => [...document.querySelectorAll('#ps-pick li')].map(li => `${li.firstChild.textContent}${li.firstChild.disabled ? ' (locked)' : ''} ${li.lastChild.textContent} [${li.firstChild.title}]`).join(' · ')));
    await page.click('#ps-pick li:nth-child(3) button'); await wait(500);
    console.log('third button ->', await page.evaluate(() => [window.__ps.state, document.getElementById('ps-card-kicker').textContent, document.getElementById('ps-card-title').textContent].join(' / ')));
    await page.evaluate(() => { localStorage.setItem('psycho-syber.atlas', JSON.stringify([...document.querySelectorAll('.ps-sites a')].map(a => a.getAttribute('href').split('#')[1]))); });
    await page.goto(BASE + '/psycho-syber/?stage=6&go=1', { waitUntil: 'load' }); await wait(600);
    console.log('all marks:', await page.evaluate(() => window.__ps.atlas.size), '· verdict at', await page.evaluate(() => 40 + window.__ps.g.blind));
    await page.evaluate(() => { window.__ps.g.realT = 16.4; window.__ps.g.p.inv = 9; }); await wait(1400); await view('real-all21');
    await page.evaluate(() => { window.__ps.g.p.inv = 0; window.__ps.g.p.hp = 0; window.__ps.g.p.y = 999; }); await page.waitForFunction(() => window.__ps.state === 'meta', null, { timeout: 8000 });
    await page.keyboard.press('Escape'); await wait(400); console.log('last panel says:', await page.evaluate(() => document.getElementById('ps-end-kicker').textContent)); await view('end-all21');
  },
  // The page's own copy, section by section, at the size given: SIZE=390x844 for a phone.
  async copy() {
    await page.goto(BASE + '/psycho-syber/', { waitUntil: 'load' }); await wait(1200);
    for (const [name, sel] of [['game', '[aria-labelledby=game-title]'], ['forms', '[aria-labelledby=forms-title]'], ['stages', '#stages'], ['atlas', '#atlas'], ['real', '#real'], ['limits', '[aria-labelledby=limits-title]']]) await page.locator(sel).screenshot({ path: `${out}/copy-${name}-${size[0]}.png` });
    console.log('overflow:', await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  },
  async page() { await page.goto(BASE + '/psycho-syber/', { waitUntil: 'load' }); await wait(1200); await page.screenshot({ path: `${out}/page-full.png`, fullPage: true }); },
};
await S[scenario]();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close(); server.close();
