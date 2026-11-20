// ARENA in a browser: serves the built site (dist/) with the game's live files laid over it, opens
// /psycho-syber/arena/ in headless Chromium, plays a wave and a two-browser duel, and takes screenshots.
// Run by hand after `pnpm build:site` (CI has no browser):
//   PW_REQUIRE_FROM=/opt/npm-tools/package.json PW_EXECUTABLE=/usr/bin/google-chrome node psycho-syber/test/arena-browser.mjs <outDir> [waves|phone|duel|all]
// The duel runs between separate browser contexts on one machine, through the real relay Worker (workers/duel/)
// started here with `wrangler dev` (run `npm ci --prefix deploy` once), or one already running at ARENA_RELAY.
// Exit code 1 if any check fails.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
const require = createRequire(process.env.PW_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const root = resolve('.'), out = process.argv[2] || 'shots', which = process.argv[3] || 'all';
mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  for (const base of p.startsWith('/psycho-syber/') ? [root, join(root, 'dist')] : [join(root, 'dist'), root]) {
    const f = join(base, p);
    if (existsSync(f) && statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(await readFile(f)); return; }
  }
  res.writeHead(404); res.end('not found');
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`, URL_ARENA = BASE + '/psycho-syber/arena/';
const browser = await chromium.launch({ executablePath: process.env.PW_EXECUTABLE || undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-background-networking', '--disable-component-update'] });

let failed = 0;
const check = (name, ok, extra = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' · ' + extra : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const outside = [];
async function open(ctxOpts, url = URL_ARENA) {
  const { relay: to, ...opts } = ctxOpts;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage(); page.errors = [];
  if (to) await page.addInitScript(r => { window.__arenaRelay = r; }, to);
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) outside.push(r.url()); });
  page.on('websocket', w => { if (!to || !w.url().startsWith(to + '/duel/')) outside.push(w.url()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__arena && !document.getElementById('ar-gowave').disabled, null, { timeout: 30000 });
  return page;
}
const state = page => page.evaluate(() => ({ state: __arena.G.state, mode: __arena.G.mode, wave: __arena.G.wave, score: __arena.G.score, hp: __arena.P.hp, form: __arena.P.form, enemies: __arena.enemies.length, run: document.getElementById('ar-stage').classList.contains('run') }));
// advance the game by hand: headless frames are slow, and the rules do not care who calls update()
const step = (page, seconds, each = '') => page.evaluate(([s, src]) => { const f = src ? new Function('A', src) : null; for (let t = 0; t < s; t += 1 / 60) { if (__arena.G.state !== 'play') break; if (f) f(__arena); __arena.update(1 / 60); } }, [seconds, each]);

async function waves(tag, ctxOpts) {
  const page = await open(ctxOpts);
  await page.screenshot({ path: join(out, `arena-${tag}-title.png`) });
  const metrics = await page.evaluate(() => { const st = document.getElementById('ar-stage').getBoundingClientRect(), hd = document.querySelector('.sy-header').getBoundingClientRect(), c = document.getElementById('ar-c'); const small = [...document.querySelectorAll('#ar-stage *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).map(e => e.id || e.className); return { stageTop: st.top, headerBottom: hd.bottom, cw: c.width, ch: c.height, small, h1: document.querySelectorAll('h1').length, overflow: document.documentElement.scrollWidth - innerWidth }; });
  check(`${tag}: the stage starts under the header`, Math.abs(metrics.stageTop - metrics.headerBottom) < 2, JSON.stringify(metrics));
  check(`${tag}: no text in the stage is set below 12px`, metrics.small.length === 0, metrics.small.join(','));
  check(`${tag}: one h1, and no sideways scroll`, metrics.h1 === 1 && metrics.overflow <= 0);
  await page.click('#ar-gowave');
  await page.waitForFunction(() => __arena.G.state === 'play');
  let s = await state(page);
  check(`${tag}: Waves starts a game that covers the screen`, s.state === 'play' && s.mode === 'wave' && s.run, JSON.stringify(s));
  // stand still, aim at whatever is nearest and fire both weapons, changing form every two seconds
  await step(page, 4);
  await page.screenshot({ path: join(out, `arena-${tag}-play.png`) });
  await step(page, 45, `const P = A.P, e = A.enemies.find(e => !e.dead && e.spawnT <= 0); P.hp = 100;
    if (e) { const dx = e.pos.x - P.pos.x, dy = e.pos.y + e.h * 0.5 - (P.pos.y + 1.5), dz = e.pos.z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); A.In.mFire = true; } else A.In.mFire = false;
    if (Math.floor(A.G.time / 2) !== Math.floor((A.G.time - 1 / 60) / 2)) A.In.swapPressed = true;`);
  s = await state(page);
  check(`${tag}: enemies die, the score rises and a wave is cleared`, s.score > 0 && (s.wave >= 2 || s.state === 'pick'), JSON.stringify(s));
  if (s.state === 'pick') { await page.screenshot({ path: join(out, `arena-${tag}-pick.png`) }); await page.click('#ar-picks .pick'); await page.waitForFunction(() => __arena.G.state === 'play'); }
  await page.evaluate(() => __arena.pause());
  await page.screenshot({ path: join(out, `arena-${tag}-pause.png`) });
  s = await state(page);
  check(`${tag}: Pause keeps the whole screen, says Paused and offers Restart`, s.state === 'pause' && s.run && await page.evaluate(() => document.getElementById('ar-pause-lede').textContent === 'Paused.' && !document.getElementById('ar-restart').hidden));
  await page.click('#ar-quit');
  const back = await page.evaluate(() => ({ run: document.getElementById('ar-stage').classList.contains('run'), state: __arena.G.state, header: document.querySelector('.sy-header').getBoundingClientRect().height > 0 && getComputedStyle(document.documentElement).overflow !== 'hidden', privacy: !!document.querySelector('a[href="/privacy/"]') }));
  check(`${tag}: Leave the game brings back the page, its header and the privacy link`, !back.run && back.state === 'menu' && back.header && back.privacy, JSON.stringify(back));
  await page.evaluate(() => { __arena.startRun("wave"); __arena.P.inv = 0; __arena.hurtPlayer(500); });
  await step(page, 0.2);
  s = await state(page);
  check(`${tag}: health at zero ends the game`, s.state === 'dead', JSON.stringify(s));
  await page.screenshot({ path: join(out, `arena-${tag}-dead.png`) });
  check(`${tag}: no errors in the page`, page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
}

// The duel goes through the relay (workers/duel/). The test runs the real Worker with `wrangler dev` and points the
// two pages at it; only a page served from this machine may be pointed anywhere but its own site.
let relay = process.env.ARENA_RELAY || '', worker = null;
async function startRelay() {
  if (relay) return;
  const port = 8700 + Math.floor(Math.random() * 200);
  worker = spawn(resolve('deploy/node_modules/.bin/wrangler'), ['dev', '--config', 'workers/duel/wrangler.toml', '--port', String(port), '--ip', '127.0.0.1', '--var', 'ORIGINS:' + BASE], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  await new Promise((done, fail) => { const t = setTimeout(() => fail(new Error('wrangler dev did not start; run `npm ci --prefix deploy` first')), 90000); const on = d => { if (String(d).includes('Ready on')) { clearTimeout(t); done(); } }; worker.stdout.on('data', on); worker.stderr.on('data', on); worker.on('exit', () => fail(new Error('wrangler dev stopped'))); });
  relay = `ws://127.0.0.1:${port}`;
}
const player = (opts = {}, url) => open({ ...opts, relay }, url);
const dstate = page => page.evaluate(() => ({ state: __arena.G.state, mode: __arena.G.mode, seat: __arena.D.seat, form: __arena.P.form, phase: __arena.D.phase, round: __arena.D.round, score: __arena.D.score.join(':'), hp: __arena.P.hp, open: !!__arena.D.ws && __arena.D.ws.readyState === 1, run: document.getElementById('ar-stage').classList.contains('run'), said: document.getElementById('ar-duel-status').textContent }));
const until = (page, fn, ms = 20000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);

async function duel() {
  const tag = 'duel';
  const a = await player();
  await a.click('#ar-goduel');
  check(`${tag}: nothing is connected until a button is pressed`, await a.evaluate(() => !__arena.D.ws));
  await a.click('#ar-duel-make');
  await until(a, () => /^[A-HJ-NP-Z2-9]{6}$/.test(document.getElementById('ar-duel-code').textContent));
  const code = await a.textContent('#ar-duel-code'), link = await a.inputValue('#ar-duel-invite');
  check(`${tag}: Start a duel shows a six-character code and a link that carries it`, /^[A-HJ-NP-Z2-9]{6}$/.test(code) && link === URL_ARENA + '#j=' + code, `${code} ${link}`);
  await a.screenshot({ path: join(out, 'arena-duel-code.png') });

  const c = await player();
  await c.click('#ar-goduel'); await c.fill('#ar-duel-in', 'ZZZ222'); await c.click('#ar-duel-answer');
  await until(c, () => /No duel has that code/.test(document.getElementById('ar-duel-status').textContent), 8000);
  check(`${tag}: a code nobody started is refused in words`, /No duel has that code/.test(await c.textContent('#ar-duel-status')), await c.textContent('#ar-duel-status'));
  await c.fill('#ar-duel-in', 'hello'); await c.click('#ar-duel-answer');
  check(`${tag}: text that is not a code is not sent`, /six letters and digits/.test(await c.textContent('#ar-duel-status')));

  const b = await player({}, link);
  const got = await b.evaluate(() => ({ state: __arena.G.state, got: !document.getElementById('ar-duel-got').hidden, code: document.getElementById('ar-duel-got-code').textContent, ws: !!__arena.D.ws }));
  check(`${tag}: opening the link shows the code and connects nothing until Join is pressed`, got.state === 'duel' && got.got && got.code === code && !got.ws, JSON.stringify(got));
  await b.click('#ar-duel-accept');
  await Promise.all([a, b].map(p => until(p, () => __arena.G.mode === 'duel' && __arena.G.state === 'play', 30000)));
  let sa = await dstate(a), sb = await dstate(b);
  check(`${tag}: both browsers are in round one, one as Psycho and one as Syber`, sa.round === 1 && sb.round === 1 && sa.form !== sb.form && sa.seat === 0 && sb.seat === 1, JSON.stringify([sa, sb]));
  check(`${tag}: the address bar no longer holds the code`, !(await b.evaluate(() => location.hash)));

  await c.fill('#ar-duel-in', code.toLowerCase().replace(/(...)/, '$1 ')); await c.click('#ar-duel-answer');
  await until(c, () => /already has two players/.test(document.getElementById('ar-duel-status').textContent), 8000);
  check(`${tag}: a third player is told the duel is full`, /already has two players/.test(await c.textContent('#ar-duel-status')), await c.textContent('#ar-duel-status'));
  await c.context().close();

  // the relay runs the countdown in real time; the pages' own frames are slow, so the test also steps them by hand
  const advance = s => Promise.all([a, b].map(p => step(p, s)));
  const live = async () => { await Promise.all([a, b].map(p => until(p, () => __arena.D.phase === 'live' || __arena.G.state === 'duelend', 15000))); await advance(0.3); await sleep(250); await advance(0.2); };
  await live();
  const seen = await a.evaluate(() => { const r = __arena.D.rival; return r ? { buf: __arena.D.buf.length, phase: __arena.D.phase } : null; });
  check(`${tag}: the relay starts the round and each side receives the other's position`, !!seen && seen.buf > 0 && seen.phase === 'live', JSON.stringify(seen));
  await a.screenshot({ path: join(out, 'arena-duel-live.png') });

  // a duel does not pause: the panel says so, has no Restart, and positions keep going out from under it
  const before = await b.evaluate(() => { __arena.pause(); return __arena.D.seq; });
  await sleep(2500);
  const held = await b.evaluate(() => ({ state: __arena.G.state, seq: __arena.D.seq, text: document.getElementById('ar-pause-lede').textContent, restart: document.getElementById('ar-restart').hidden, back: document.getElementById('ar-resume').textContent }));
  check(`${tag}: the panel in a duel says the duel goes on, and it does`, held.state === 'pause' && held.seq > before && /does not pause/.test(held.text) && held.restart && held.back === 'Back to the duel', JSON.stringify({ ...held, before }));
  await b.click('#ar-resume');

  // whoever is Psycho stands next to the other and fires at their feet until the relay ends the round
  const fight = async () => {
    const fa = await a.evaluate(() => __arena.P.form), hunter = fa === 0 ? a : b, prey = fa === 0 ? b : a;
    const at = await prey.evaluate(() => ({ x: __arena.P.pos.x, y: __arena.P.pos.y, z: __arena.P.pos.z }));
    await hunter.evaluate(p => { const A = __arena; A.P.pos.set(p.x + 3, p.y, p.z); A.P.vel.set(0, 0, 0); }, at);
    await step(hunter, 0.1); await step(prey, 0.1); await sleep(250); await step(hunter, 0.2);
    for (let i = 0; i < 60; i++) {
      const done = await hunter.evaluate(() => { const A = __arena; if (A.D.phase !== 'live') return true; const r = A.D.rival; if (!r) return true; const P = A.P, dx = r.pos.x - P.pos.x, dy = r.pos.y + 0.2 - (P.pos.y + 1.5), dz = r.pos.z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); P.vel.set(0, 0, 0); A.fireRocket(); return false; });
      if (done) break; await step(hunter, 0.4); await sleep(80); await step(prey, 0.1); await sleep(80);
    }
    return { hunter, prey };
  };
  const first = await fight();
  sa = await dstate(a); sb = await dstate(b);
  check(`${tag}: the relay ends the round when health runs out, and both browsers have its score`, sa.phase === 'end' && sb.phase === 'end' && sa.score === sb.score && /^(1:0|0:1)$/.test(sa.score) && (await first.prey.evaluate(() => __arena.P.hp)) === 0, JSON.stringify([sa.score, sb.score, sa.phase, sb.phase]));

  await live();
  // a connection that drops: the page takes its seat back with the token the relay gave it
  await b.evaluate(() => __arena.D.ws.close());
  const back = await until(b, () => !!__arena.D.ws && __arena.D.ws.readyState === 1 && __arena.D.retry === 0 && __arena.D.token, 8000);
  sa = await dstate(a); sb = await dstate(b);
  check(`${tag}: a dropped connection comes back to the same seat and the same round`, back && sb.seat === 1 && sb.round === 2 && sa.round === 2 && sb.state === 'play' && sa.state === 'play' && sb.phase === 'live', JSON.stringify([sa, sb]));

  for (let round = 2; round <= 9; round++) {
    if (await a.evaluate(() => __arena.G.state === 'duelend' || __arena.D.over)) break;
    await live(); if (await a.evaluate(() => __arena.D.over)) break;
    await fight(); await advance(0.2); await sleep(300);
  }
  for (let i = 0; i < 8 && !(await a.evaluate(() => __arena.G.state === 'duelend')); i++) { await advance(1); await sleep(150); }
  await Promise.all([a, b].map(p => until(p, () => __arena.G.state === 'duelend', 20000)));
  sa = await dstate(a); sb = await dstate(b);
  const [x, y] = sa.score.split(':').map(Number);
  check(`${tag}: the duel ends at five rounds with the same score in both browsers`, sa.state === 'duelend' && sb.state === 'duelend' && sa.score === sb.score && Math.max(x, y) === 5, JSON.stringify([sa.score, sb.score, sa.state, sb.state]));
  await a.screenshot({ path: join(out, 'arena-duel-end.png') });
  await b.click('#ar-de-again');
  await Promise.all([a, b].map(p => until(p, () => __arena.G.state === 'play' && __arena.D.round === 1, 20000)));
  sa = await dstate(a); sb = await dstate(b);
  check(`${tag}: either player's rematch starts round one again`, sa.round === 1 && sb.round === 1 && sa.score === '0:0' && sa.state === 'play' && sb.state === 'play', JSON.stringify([sa.score, sa.state, sb.state]));

  // a player who leaves: the other is told at once and gets the page back
  await b.evaluate(() => __arena.pause()); await b.click('#ar-quit');
  const told = await until(a, () => __arena.G.state === 'duel' && /left the duel/.test(document.getElementById('ar-duel-status').textContent), 6000);
  sa = await dstate(a);
  check(`${tag}: when one player leaves, the other is told and gets the page back`, told && !sa.run && !sa.open, JSON.stringify(sa));
  check(`${tag}: no errors in either page`, a.errors.length + b.errors.length === 0, [...a.errors, ...b.errors].join(' | '));
  await b.context().close();

  // the same page starts another duel; this time the second player types the code and then vanishes
  await a.click('#ar-duel-make');
  await until(a, () => { const t = document.getElementById('ar-duel-code').textContent; return /^[A-HJ-NP-Z2-9]{6}$/.test(t) && !document.getElementById('ar-duel-wait').hidden && __arena.D.code === t; });
  const code2 = await a.evaluate(() => __arena.D.code);
  const d = await player({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await d.click('#ar-goduel'); await d.screenshot({ path: join(out, 'arena-duel-phone-panel.png') });
  await d.fill('#ar-duel-in', code2.toLowerCase()); await d.click('#ar-duel-answer');
  const both = (await Promise.all([a, d].map(p => until(p, () => __arena.G.mode === 'duel' && __arena.G.state === 'play', 30000)))).every(Boolean);
  check(`${tag}: a second duel starts from the same page, joined by a typed code on a phone-sized screen`, code2 !== code && both, `${code} ${code2}`);
  await d.context().close();
  const gone = await until(a, () => __arena.G.state === 'duel' && /left the duel/.test(document.getElementById('ar-duel-status').textContent), 25000);
  check(`${tag}: a player who vanishes is given twelve seconds, then the other is told`, gone, JSON.stringify(await dstate(a)));
  await a.context().close();

  // the relay itself, asked from outside a page: only the site's own origin is let in, and one address cannot open duels without end
  const knock = (path, origin) => new Promise(done => { const ws = new WebSocket(relay + path, origin === null ? undefined : { headers: { Origin: origin } }); const t = setTimeout(() => { done('silent'); ws.close(); }, 5000); ws.onmessage = e => { clearTimeout(t); const m = JSON.parse(e.data); done(m[0] === 'e' ? m[1] : m[0]); ws.close(); }; ws.onerror = () => { clearTimeout(t); done('refused'); }; });
  const strangers = await Promise.all([knock('/duel/new', 'https://evil.example'), knock('/duel/new', BASE + '.evil.example'), knock('/duel/new', null), knock('/duel/join/' + code2, 'https://evil.example')]);
  check(`${tag}: the relay refuses a request that does not come from the site's own pages`, strangers.every(r => r === 'refused'), strangers.join(' '));
  const flood = []; for (let i = 0; i < 9; i++) flood.push(await knock('/duel/new', BASE));
  check(`${tag}: the relay stops one address from opening duels without end`, flood[0] === 'w' && flood.includes('busy') && flood.lastIndexOf('w') < flood.indexOf('busy'), flood.join(' '));
}

if (which === 'all' || which === 'waves') await waves('desktop', {});
if (which === 'all' || which === 'phone') await waves('phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
if (which === 'all' || which === 'duel') { await startRelay(); try { await duel(); } finally { if (worker) worker.kill(); } }
check('the page asked nothing of any other site', outside.length === 0, [...new Set(outside)].join(' '));
await browser.close(); server.close();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
