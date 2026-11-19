// ARENA in a browser: serves the built site (dist/) with the game's live files laid over it, opens
// /psycho-syber/arena/ in headless Chromium, plays a wave and a two-browser duel, and takes screenshots.
// Run by hand after `pnpm build:site` (CI has no browser):
//   PW_REQUIRE_FROM=/opt/npm-tools/package.json PW_EXECUTABLE=/usr/bin/google-chrome node psycho-syber/test/arena-browser.mjs <outDir> [waves|phone|duel|all]
// The duel runs between two separate browser contexts on one machine. No STUN server is reachable from a sandbox,
// so each side waits its four seconds and the link opens on local addresses. Exit code 1 if any check fails.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
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
const browser = await chromium.launch({ executablePath: process.env.PW_EXECUTABLE || undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-background-networking', '--disable-component-update', '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'] });

let failed = 0;
const check = (name, ok, extra = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' · ' + extra : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const outside = [];
async function open(ctxOpts, url = URL_ARENA) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...ctxOpts });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) outside.push(r.url()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__arena && !document.getElementById('ar-gowave').disabled, null, { timeout: 30000 });
  return page;
}
const state = page => page.evaluate(() => ({ state: __arena.G.state, mode: __arena.G.mode, wave: __arena.G.wave, score: __arena.G.score, hp: __arena.P.hp, form: __arena.P.form, enemies: __arena.enemies.length, run: document.getElementById('ar-stage').classList.contains('run'), phase: __arena.D.phase, round: __arena.D.round, duel: __arena.D.score.join(':'), role: __arena.D.role }));
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

async function duel(viaLink) {
  const tag = viaLink ? 'duel by reply link' : 'duel by pasted reply';
  const a = await open({});
  await a.click('#ar-goduel'); await a.click('#ar-duel-make');
  await a.waitForFunction(() => document.getElementById('ar-duel-invite').value.includes('#d='), null, { timeout: 15000 });
  const invite = await a.inputValue('#ar-duel-invite');
  check(`${tag}: an invite is a link to this page`, invite.startsWith(URL_ARENA + '#d=1o'), `${invite.length} characters`);
  await a.screenshot({ path: join(out, 'arena-duel-invite.png') });
  const b = await open({}, invite);
  const got = await b.evaluate(() => ({ state: __arena.G.state, got: !document.getElementById('ar-duel-got').hidden, pc: !!__arena.D.pc }));
  check(`${tag}: opening the invite shows it and contacts nothing until a press`, got.state === 'duel' && got.got && !got.pc, JSON.stringify(got));
  await b.click('#ar-duel-accept');
  await b.waitForFunction(() => document.getElementById('ar-duel-reply').value.includes('#r='), null, { timeout: 15000 });
  const reply = await b.inputValue('#ar-duel-reply');
  check(`${tag}: the reply is a link to this page`, reply.startsWith(URL_ARENA + '#r=1a'), `${reply.length} characters`);
  if (viaLink) {
    const tab = await a.context().newPage(); await tab.goto(reply, { waitUntil: 'load' });
    await tab.waitForFunction(() => /Reply delivered/.test(document.getElementById('ar-duel-status').textContent), null, { timeout: 15000 }).catch(() => { });
    check(`${tag}: a tab that opens the reply hands it to the tab with the invite`, /Reply delivered/.test(await tab.textContent('#ar-duel-status')), await tab.textContent('#ar-duel-status'));
    await tab.close();
  } else {
    await sleep(Number(process.env.ARENA_REPLY_WAIT || 0) * 1000);   // how long the reply sat in a message app
    await a.fill('#ar-duel-reply-in', reply); await a.click('#ar-duel-connect');
  }
  await Promise.all([a, b].map(p => p.waitForFunction(() => __arena.G.mode === 'duel' && __arena.G.state === 'play', null, { timeout: 30000 })));
  let sa = await state(a), sb = await state(b);
  check(`${tag}: both browsers are in round one, one as Psycho and one as Syber`, sa.round === 1 && sb.round === 1 && sa.form !== sb.form && sa.role === 'lead' && sb.role === 'join', JSON.stringify([sa, sb]));
  check(`${tag}: the address bar no longer holds the invite`, !(await b.evaluate(() => location.hash)));
  // Headless frames are slow and the game caps each frame at 34 ms, so the test advances both games by hand.
  const advance = s => Promise.all([a, b].map(p => step(p, s)));
  const live = () => a.evaluate(() => __arena.D.phase === 'live' || __arena.G.state === 'duelend');
  await advance(3.4); await sleep(300); await advance(0.2);
  const seen = await a.evaluate(() => { const r = __arena.D.rival; return r ? { x: r.pos.x, z: r.pos.z, buf: __arena.D.buf.length, phase: __arena.D.phase } : null; });
  check(`${tag}: the countdown ends and each side receives the other's position`, !!seen && seen.buf > 0 && seen.phase === 'live', JSON.stringify(seen));
  await a.screenshot({ path: join(out, 'arena-duel-live.png') });
  // a duel does not pause: the panel says so, has no Restart, and positions keep going out from under it
  const before = await b.evaluate(() => { __arena.pause(); return __arena.D.seq; });
  await sleep(2500);
  const held = await b.evaluate(() => ({ state: __arena.G.state, seq: __arena.D.seq, text: document.getElementById('ar-pause-lede').textContent, restart: document.getElementById('ar-restart').hidden, back: document.getElementById('ar-resume').textContent }));
  await b.screenshot({ path: join(out, 'arena-duel-panel.png') });
  check(`${tag}: the panel in a duel says the duel goes on, and it does`, held.state === 'pause' && held.seq > before && /does not pause/.test(held.text) && held.restart && held.back === 'Back to the duel', JSON.stringify({ ...held, before }));
  await b.click('#ar-resume');
  check(`${tag}: Back to the duel returns to it`, await b.evaluate(() => __arena.G.state === 'play'));
  // up to nine rounds: whoever is Psycho stands next to the other and fires at their feet
  for (let round = 1; round <= 9; round++) {
    for (let i = 0; i < 10 && !(await live()); i++) { await advance(1); await sleep(150); }
    if (await a.evaluate(() => __arena.G.state === 'duelend')) break;
    const fa = await a.evaluate(() => __arena.P.form), hunter = fa === 0 ? a : b, prey = fa === 0 ? b : a;
    const at = await prey.evaluate(() => ({ x: __arena.P.pos.x, y: __arena.P.pos.y, z: __arena.P.pos.z }));
    await hunter.evaluate(p => { const A = __arena; A.P.pos.set(p.x + 3, p.y, p.z); A.P.vel.set(0, 0, 0); }, at);
    await step(hunter, 0.1); await sleep(200); await step(hunter, 0.2);
    for (let i = 0; i < 60; i++) {
      const done = await hunter.evaluate(() => { const A = __arena; if (A.D.phase !== 'live') return true; const r = A.D.rival; if (!r) return true; const P = A.P, dx = r.pos.x - P.pos.x, dy = r.pos.y + 0.2 - (P.pos.y + 1.5), dz = r.pos.z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); P.vel.set(0, 0, 0); A.fireRocket(); return false; });
      if (done) break; await step(hunter, 0.4); await sleep(80); await step(prey, 0.1); await sleep(80);
    }
    await advance(0.2); await sleep(200);
  }
  for (let i = 0; i < 6 && !(await a.evaluate(() => __arena.G.state === 'duelend')); i++) { await advance(1); await sleep(150); }
  await Promise.all([a, b].map(p => p.waitForFunction(() => __arena.G.state === 'duelend', null, { timeout: 20000 }).catch(() => { })));
  sa = await state(a); sb = await state(b);
  const [x, y] = sa.duel.split(':').map(Number);
  check(`${tag}: the duel ends at five rounds with the same score in both browsers`, sa.state === 'duelend' && sb.state === 'duelend' && sa.duel === sb.duel && Math.max(x, y) === 5, JSON.stringify([sa.duel, sb.duel, sa.state, sb.state]));
  await a.screenshot({ path: join(out, 'arena-duel-end.png') });
  await b.click('#ar-de-again');
  await Promise.all([a, b].map(p => p.waitForFunction(() => __arena.G.state === 'play' && __arena.D.round === 1, null, { timeout: 20000 }).catch(() => { })));
  sa = await state(a); sb = await state(b);
  check(`${tag}: the second player's rematch starts round one again`, sa.round === 1 && sb.round === 1 && sa.duel === '0:0', JSON.stringify([sa.duel, sa.state, sb.state]));
  await b.context().close();
  await a.waitForFunction(() => __arena.G.state === 'duel' && /disconnected/.test(document.getElementById('ar-duel-status').textContent), null, { timeout: 15000 }).catch(() => { });
  const lost = await a.evaluate(() => ({ state: __arena.G.state, run: document.getElementById('ar-stage').classList.contains('run'), text: document.getElementById('ar-duel-status').textContent }));
  check(`${tag}: when one browser closes, the other is told and gets its page back`, lost.state === 'duel' && !lost.run && /disconnected/.test(lost.text), JSON.stringify(lost));
  check(`${tag}: no errors in either page`, a.errors.length + b.errors.length === 0, [...a.errors, ...b.errors].join(' | '));
  await a.context().close();
}

if (which === 'all' || which === 'waves') await waves('desktop', {});
if (which === 'all' || which === 'phone') await waves('phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
if (which === 'all' || which === 'duel') { await duel(false); await duel(true); }
check('the page asked nothing of any other site', outside.length === 0, [...new Set(outside)].join(' '));
await browser.close(); server.close();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
