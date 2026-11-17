// node psycho-syber/test/run.mjs [stage id] [--log]
// Builds every stage (which checks the maps) and plays each scripted run to the exit.
import { readFileSync } from 'node:fs';
import { STAGES, ATLAS } from '../game/levels.js';
import { newGame, step, T } from '../game/sim.js';
import { play } from './bot.mjs';
import { SCRIPTS } from './scripts.mjs';
const [only, route] = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(':') : [null], log = process.argv.includes('--log');
let failed = 0;
{ // every import between game modules, and the page's own two links, carry one and the same ?v= token:
  // without it a returning browser pairs a new file with an old one it still has cached
  const dir = new URL('../game/', import.meta.url), names = ['main.js', 'sim.js', 'levels.js', 'render.js', 'post.js', 'audio.js', 'font.js'];
  const tokens = new Set(), bare = [];
  for (const n of names) for (const m of readFileSync(new URL(n, dir), 'utf8').matchAll(/from '\.\/[a-z]+\.js(\?v=([0-9a-z]+))?'/g)) m[2] ? tokens.add(m[2]) : bare.push(n);
  for (const m of readFileSync(new URL('../index.html', import.meta.url), 'utf8').matchAll(/(?:psycho-syber\.css|game\/main\.js)\?v=([0-9a-z]+)/g)) tokens.add(m[1]);
  if (bare.length || tokens.size !== 1) { failed++; console.log(`FAIL: game modules must share one ?v= token (found ${[...tokens].join(', ') || 'none'}${bare.length ? '; unversioned imports in ' + bare.join(', ') : ''})`); }
  else console.log(`version: every game import carries ?v=${[...tokens][0]}`);
}
{ // the 21 marks carry the ids and names of the Lacuna Atlas
  const src = readFileSync(new URL('../../src/lacuna/atlas/sites.js', import.meta.url), 'utf8');
  const real = [...src.matchAll(/\bid: "([^"]+)", slug: "[^"]+", name: "([^"]+)"/g)].map(m => m[1] + '|' + m[2]), mine = ATLAS.map(a => a.id + '|' + a.name);
  if (real.length !== 21 || real.join('\n') !== mine.join('\n')) { failed++; console.log('FAIL: ATLAS in levels.js differs from src/lacuna/atlas/sites.js\n  ' + real.filter(r => !mine.includes(r)).concat(mine.filter(r => !real.includes(r))).join('\n  ')); }
  else console.log(`atlas: ${mine.length} sites match src/lacuna/atlas/sites.js`);
}
for (const def of STAGES) {
  if (only && def.id !== only) continue;
  const g = newGame(def);
  const kinds = {}; for (const e of g.ents) kinds[e.type] = (kinds[e.type] || 0) + 1;
  console.log(`${def.id}: ${g.L.w}x${g.L.h} tiles · ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  const blank = g.L.hints.filter(h => !h).length + ((kinds.hint || 0) - g.L.hints.length); if (blank || (def.hints && def.hints.length !== (kinds.hint || 0))) { console.log(`  FAIL: ${kinds.hint || 0} hint markers, ${blank} without text`); failed++; }
  const routes = Object.keys(SCRIPTS).filter(k => k === def.id || k.startsWith(def.id + ':'));
  if (!routes.length) { console.log('  (no script)'); continue; }
  for (const key of routes) {
    if (route && key !== def.id + ':' + route) continue;
    const g = newGame(def), name = key.split(':')[1] || 'main', r = play(g, SCRIPTS[key], { log });
    const bad = r.ok && name === 'weaver' && g.swaps > 0 ? 'the weaver route took the jaguar\'s form' : r.ok && g.deaths > 0 ? 'the run died on the way' : '';
    if (r.ok && !bad) console.log(`  ${name}: finished in ${(g.time).toFixed(1)} s of play · threads ${g.threads}/${g.threadsTotal} · hp ${g.p.hp} · changes of form ${g.swaps}${def.timer ? ` · evidence ${g.evidence}/${g.evidenceTotal} · ${g.sale.toFixed(0)} s left of ${def.timer}` : ''}`);
    else { failed++; console.log(`  ${name}: FAIL: ${bad || r.why} at x ${r.x?.toFixed(2)} y ${r.y?.toFixed(2)} (${g.persona}, hp ${g.p.hp}, deaths ${g.deaths})`); }
  }
}
// Rules that no scripted run exercises, because a clean run never trips them.
if (!only) {
  const idle = { left: false, right: false, up: false, down: false, jump: false, fire: false, alt: false, aimX: 0, aimY: 0 };
  const run = (g, inp, secs, each) => { for (let i = 0; i < secs * 60; i++) { step(g, { ...idle, ...inp, aimX: inp.aim ? inp.aim.x : 0, aimY: inp.aim ? inp.aim.y : 0, actP: !!inp.actP && i === 0 }, 1 / 60); if (each) each(g); } };
  const stage = id => newGame(STAGES.find(s => s.id === id)), of = (g, type) => g.ents.filter(e => e.type === type);
  const rule = (name, ok) => { if (!ok) failed++; console.log(`rule: ${name}: ${ok ? 'holds' : 'FAIL'}`); };
  { // the far door of THE RECORD stays shut until every gap is found
    const g = stage('record'), x = of(g, 'exit')[0];
    g.p.x = x.x; g.p.y = x.y + 16; run(g, {}, 0.5);
    const shut = !g.done; g.evidence = g.evidenceTotal; run(g, {}, 0.2);
    rule('the far door opens only with all the evidence', shut && g.done);
  }
  { // the sale timer ends the attempt, and the next one gets at least 75 seconds
    const g = stage('record'); g.sale = 0.1; run(g, {}, 0.3);
    const closed = g.p.dead; run(g, {}, 1.2);
    rule('the sale closing sends you back with time to try again', closed && !g.p.dead && g.sale >= 73);
  }
  { // a lit gate cannot be walked through, hurt or not; it opens when its source is cut
    const g = stage('lines'), gate = of(g, 'gate')[0]; let max = 0;
    g.p.x = gate.x - 40; g.p.y = 20 * T; run(g, { right: true }, 4, g => { if (!g.p.dead) max = Math.max(max, g.p.x); });
    const held = max < gate.x && g.p.hp < 4;
    g.srcAlive[gate.src] = false; g.p.hp = 4; g.p.dead = false; g.p.x = gate.x - 40; g.p.y = 20 * T; run(g, { right: true }, 2);
    rule('a lit gate is a barrier until its source is cut', held && g.p.x > gate.x + 20);
  }
  { // the double: a warden that can see the form you left watches it, and the double fades after three seconds
    const g = stage('lines'), w = of(g, 'warden')[0];
    g.p.x = w.x - 90; g.p.y = 20 * T; w.dir = -1; run(g, {}, 0.05);
    step(g, { ...idle, swapP: true }, 1 / 60); const made = !!g.double;
    g.p.x = w.x + 300; run(g, {}, 0.2); const lured = w.lured === true;
    run(g, {}, 3.2);
    rule('a warden watches the double you leave behind', made && lured && !g.double && !w.lured);
  }
  { // the pace setter slows the words until it is checked again
    const g = stage('machu'), pc = of(g, 'pacer')[0];
    g.p.x = pc.x - 20; g.p.y = 34 * T; run(g, { actP: true, aim: pc }, 0.1); const slow = g.pace < 1 && pc.slow;
    const t0 = g.wordT; run(g, {}, 1); const dt = g.wordT - t0;
    run(g, { actP: true, aim: pc }, 0.1);
    rule('the pace setter slows every word until it is checked again', slow && dt < 0.4 && g.pace === 1);
  }
  { // a source that feeds nothing here is watched
    const g = stage('lines'), trap = of(g, 'source').find(e => e.trap);
    g.p.x = trap.x - 30; g.p.y = 20 * T; run(g, { actP: true, aim: trap }, 0.1);
    rule('checking a watched source raises the alarm', !trap.alive && g.alarm > 0);
  }
  { // the Approver cannot be broken while a source still feeds it
    const g = stage('works'), core = of(g, 'core')[0];
    g.p.x = core.x - 120; g.p.y = 18 * T; run(g, { fire: true, fireP: true, aim: core }, 1);
    const stood = !core.dead; for (const e of of(g, 'source')) { e.alive = false; g.srcAlive[e.id] = false; }
    for (let i = 0; i < 4 && !core.dead; i++) { g.p.throwCd = 0; step(g, { ...idle, fire: true, fireP: true, aimX: core.x, aimY: core.y - 10 }, 1 / 60); run(g, {}, 0.8); }
    rule('the Approver opens only when its three sources are cut', stood && core.dead && g.open.has('core') && !g.done);
  }
}
process.exit(failed ? 1 : 0);
