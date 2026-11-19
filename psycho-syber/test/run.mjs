// node psycho-syber/test/run.mjs [stage id] [--log]
// Builds every stage (which checks the maps) and plays each scripted run to the exit.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { STAGES, ATLAS, SHIP, ANOMALY, forTouch } from '../game/levels.js';
import { VOICE } from '../game/voice.js';
import { LINES, ABOUT, said } from './voice.mjs';
import { newGame, step, T, corrupted, bodiesTurned, gateActive, solidTile, hintText, DOUBLE_LIFE, DOUBLE_WAIT, LURE } from '../game/sim.js';
import { play } from './bot.mjs';
import { SCRIPTS } from './scripts.mjs';
const [only, route] = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(':') : [null], log = process.argv.includes('--log');
let failed = 0;
{ // every import between game modules, and the page's own two links, carry one and the same ?v= token:
  // without it a returning browser pairs a new file with an old one it still has cached
  const dir = new URL('../game/', import.meta.url), names = ['main.js', 'sim.js', 'levels.js', 'render.js', 'post.js', 'audio.js', 'font.js', 'voice.js'];
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
{ // The narrator. Every recording speaks the words its line has now, a stage is narrated whole or not at all, no
  // stray file is published, and the page says the voice is synthetic exactly while there are recordings.
  const dir = new URL('../voice/', import.meta.url), html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'), bad = [];
  const byId = new Map(LINES.map(l => [l.id, l])), files = existsSync(dir) ? readdirSync(dir) : [], used = new Set();
  for (const [id, e] of Object.entries(VOICE)) {
    const l = byId.get(id), file = String(e.src).split('?')[0]; used.add(file);
    if (!l) { bad.push(`${id}: a recording for a line that is not in the story`); continue; }
    if (e.said !== said(l.text) || e.words.length !== l.text.split(' ').length) bad.push(`${id}: the line has changed since it was recorded`);
    if (!files.includes(file)) bad.push(`${id}: ${file} is missing from psycho-syber/voice/`);
    if (e.words.some(([a, b], i) => !(a >= 0 && b > a) || (i && a < e.words[i - 1][0]))) bad.push(`${id}: its word times are out of order`);
  }
  for (const key of new Set(LINES.map(l => l.key))) { const all = LINES.filter(l => l.key === key), n = all.filter(l => VOICE[l.id]).length; if (n && n < all.length) bad.push(`${key}: ${n} of ${all.length} lines have a recording`); }
  for (const f of files) if (!used.has(f)) bad.push(`${f}: a file in psycho-syber/voice/ that no line uses`);
  const n = Object.keys(VOICE).length, told = html.includes(ABOUT);
  if (!html.includes('<!-- narrator: written by psycho-syber/test/voice.mjs -->') || !html.includes('<!-- /narrator -->')) bad.push('the page has lost its narrator markers');
  if (n && !told) bad.push('there are recordings and the page does not say the voice is synthetic');
  if (!n && /<h3[^>]*>Narrator<\/h3>/.test(html)) bad.push('the page describes a narrator and there are no recordings');
  if (bad.length) { failed++; console.log('FAIL: the narrator (run psycho-syber/test/voice.mjs to put it right)\n  ' + bad.join('\n  ')); }
  else console.log(n ? `narrator: ${n} of ${LINES.length} lines have a recording, and the page says the voice is synthetic` : 'narrator: no recordings, and the page describes no voice');
}
for (const def of [...STAGES, ANOMALY]) {   // the Anomalous System is not one of the six, and it is played the same way
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
    if (r.ok && !bad) console.log(`  ${name}: finished in ${(g.time).toFixed(1)} s of play · threads ${g.threads}/${g.threadsTotal} · hp ${g.p.hp} · changes of form ${g.swaps}${def.timer ? ` · evidence ${g.evidence}/${g.evidenceTotal} · ${g.sale.toFixed(0)} s left of ${def.timer}` : ''}${def.anomaly ? ` · corrupted ${(corrupted(g) * 100).toFixed(0)}% · bodies turned ${bodiesTurned(g)}/${g.L.bodies.length} · plants ${g.plants} · the cursor deleted ${g.cursor.deleted} copies and hit ${g.cursor.hits} times · the scan reached tile ${(g.scanX / T).toFixed(0)}` : ''}`);
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
  { // the double: a warden with a clear line to the form you left turns to it, even with its back to it. While the
    // double stands the warden holds still, does not fire and does not see you, though you stand in front of it
    const g = stage('lines'), w = of(g, 'warden')[0]; let bolts = 0; const count = g => { bolts += g.ev.filter(e => e.k === 'bolt').length; g.ev.length = 0; };
    g.p.x = w.x + 110; g.p.y = 20 * T; w.dir = -1; run(g, {}, 0.05);            // behind its back
    step(g, { ...idle, swapP: true }, 1 / 60); const made = !!g.double && g.double.t > DOUBLE_LIFE - 0.1 && Math.hypot(g.double.x - w.x, g.double.y - w.y) < LURE;
    run(g, {}, 0.2); const turned = w.lured === true && w.dir === 1, x0 = w.x;
    g.p.x = w.x + 60; run(g, {}, 1.5, count);                                   // in front of it, in plain view
    const unseen = w.see === 0 && bolts === 0 && g.p.hp === g.p.maxHp && Math.abs(w.x - x0) < 0.01 && !!g.double;
    run(g, {}, DOUBLE_LIFE - 1.5, count); const faded = !g.double && !w.lured;
    run(g, {}, 1.5, count);                                                     // and with the double gone it sees you there
    rule('a warden turns to the double you leave and neither sees you nor fires while it stands', made && turned && unseen && faded && bolts > 0);
  }
  { // stage 1, the first warden: it cannot see as far as the standing stone, a change of form there turns it, and the
    // other form goes under it and through the thread without being seen
    const g = stage('steps'), w = of(g, 'warden')[0], stone = of(g, 'check')[0]; let seen = 0, held = 0;
    g.p.x = stone.x + 30; g.p.y = 20 * T; run(g, {}, 6, () => { seen = Math.max(seen, w.see); });   // six seconds of its pacing, both ways
    const safe = seen === 0 && g.p.hp === g.p.maxHp, t0 = g.threads;
    step(g, { ...idle, swapP: true }, 1 / 60);
    run(g, { right: true }, 2.2, () => { seen = Math.max(seen, w.see); if (w.lured) held++; });
    rule('the first warden cannot see the standing stone, turns to a double left there, and does not see the other form go under it', safe && held > 120 && seen === 0 && g.threads === t0 + 1 && g.p.hp === g.p.maxHp && g.p.x > w.x + 40);
  }
  { // the numbers the player is told are the numbers in sim.js: on the page, in the message and in the hint
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'), main = readFileSync(new URL('../game/main.js', import.meta.url), 'utf8'), word = n => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n];
    const page = html.includes(`as a double for ${word(DOUBLE_LIFE)} seconds, at most once every ${word(DOUBLE_WAIT)}. A warden within ${LURE / T} tiles`) && html.split(`stands for ${DOUBLE_LIFE} seconds as a double`).length === 3;
    const game = main.includes(`as a double for ${word(DOUBLE_LIFE)} seconds`) && hintText(Object.assign(stage('steps'), { doubleCd: 1 }), 1).includes(`${word(DOUBLE_WAIT)} seconds after`);
    rule('the page and the game say how long a double stands, how often and how far, as sim.js has it', page && game);
  }
  { // a yard with one warden and one wall: a double holds the warden only within LURE and only with a clear line to it
    // (this fails if LURE is made endless, and if the line of sight is not asked for)
    const map = Array.from({ length: 8 }, (_, y) => y === 7 ? '#'.repeat(60) : y >= 3 ? ' '.repeat(26) + '#' + ' '.repeat(33) : ' '.repeat(60));
    map[6] = '  @' + ' '.repeat(23) + '#' + ' '.repeat(7) + 'w' + ' '.repeat(25);
    const left = x => { const g = newGame({ id: 'yard', map }), w = of(g, 'warden')[0]; g.p.x = x * T; g.p.y = 7 * T; run(g, {}, 0.05); step(g, { ...idle, swapP: true }, 1 / 60); run(g, {}, 0.1); return w.lured === true && w.watch === g.double; };
    rule('a double holds a warden only within its reach and with a clear line to it', left(30.5) && left(48.5) && !left(51) && !left(22.5) && LURE === 240);
  }
  { // the first warden's hint shows where what it says is safe and works, and not where the warden can see you
    const at = x => { const g = stage('steps'); g.p.x = x * T; g.p.y = 20 * T; run(g, {}, 0.05); return g.hint; };
    const down = stage('steps'); of(down, 'warden')[0].dead = true;
    rule('the hint at the first warden shows only out of its sight, and stops speaking of a warden that is down', at(18.5) === 1 && at(22.5) === 1 && at(25) !== 1 && at(28) !== 1 && /warden above/.test(hintText(stage('steps'), 1)) && !/above|is watching/.test(hintText(down, 1)));
  }
  { // the words on screen are about the body you are in: at the first wall the weaver is told the ring and the jaguar the climb
    const at = psy => { const g = stage('steps'); if (psy) g.persona = 'psycho'; g.p.x = 49 * T; g.p.y = 20 * T; run(g, {}, 0.1); return hintText(g); };
    const KEYS = /\b(Shift|Space|[Cc]lick|mouse|key|W|S|Q|A and D)\b/, bad = [];
    const states = [() => {}, g => { g.double = { t: 1 }; }, g => { g.doubleCd = 3; }, g => { for (const e of g.ents) if (e.type === 'warden') e.dead = true; }, g => { g.plants = 1; g.rotN.fill(1); }];   // every state a hint reads
    for (const def of [...STAGES, SHIP, ANOMALY]) for (const state of states) for (const persona of ['syber', 'psycho']) {
      const g = Object.assign(newGame(def), { persona }); state(g);
      g.L.hints.forEach((h, i) => { const t = hintText(g, i); if (!t) bad.push(`${def.id}: hint ${i} says nothing to ${persona}`); else if (KEYS.test(forTouch(t))) bad.push(`${def.id}: hint ${i} names a key on a touch screen: ${forTouch(t)}`); });
    }
    if (bad.length) console.log('  ' + [...new Set(bad)].join('\n  '));
    rule('a hint is about the form you are in', /ring/.test(at(false)) && !/climb/.test(at(false)) && /climb/.test(at(true)) && !/cord|ring/.test(at(true)));
    rule('every hint has a line for each form, and none names a key once it is said for touch', !bad.length);
  }
  { // the pace setter slows the words until it is checked again
    const g = stage('machu'), pc = of(g, 'pacer')[0];
    g.p.x = pc.x - 20; g.p.y = 34 * T; run(g, { actP: true, aim: pc }, 0.1); const slow = g.pace < 1 && pc.slow;
    const t0 = g.wordT; run(g, {}, 1); const dt = g.wordT - t0;
    run(g, { actP: true, aim: pc }, 0.1);
    rule('the pace setter slows every word until it is checked again', slow && dt < 0.4 && g.pace === 1);
  }
  { // the 21 Atlas marks are spread over the stages, each site once
    const ids = STAGES.flatMap(d => of(newGame(d), 'mark').map(e => e.id));
    rule('the stages hold each of the 21 Atlas marks once', ids.length === 21 && ATLAS.every(a => ids.filter(i => i === a.id).length === 1));
  }
  { // THE REAL BATTLE: nothing works on the Thousand Eyes, and nobody leaves
    const g = stage('real'), a = of(g, 'asi')[0]; let predicted = 0;
    for (let i = 0; i < 43 * 60 && !g.over; i++) { g.p.throwCd = 0; step(g, { ...idle, right: i % 240 < 120, left: i % 240 >= 120, jump: i % 50 < 20, fire: i % 30 === 0, fireP: i % 30 === 0, aimX: a.x, aimY: a.y }, 1 / 60); predicted += g.ev.filter(e => e.k === 'predicted').length; g.ev.length = 0; }
    rule('the last stage cannot be won', g.over && !g.done && !a.dead && predicted > 0 && g.time <= 40.1);
  }
  { // each Atlas mark found is a place the machine has no record of: the verdict comes one second later for each.
    // Standing still, the run ends by its shots first; with no health to lose, only the verdict ends it.
    const end = blind => { const g = stage('real'); g.blind = blind; let orders = 0; for (let i = 0; i < 70 * 60 && !g.over; i++) { g.p.inv = 1; step(g, idle, 1 / 60); orders += g.ev.filter(e => e.k === 'tele').length; g.ev.length = 0; } return [g.time, orders, g.over && !g.done]; };
    const [t0, o0, over0] = end(0), [t21, o21, over21] = end(21), [t99] = end(99);
    rule('the verdict comes at 40 seconds, and one second later for each Atlas mark found', over0 && over21 && Math.abs(t0 - 40) < 0.1 && Math.abs(t21 - 61) < 0.1 && Math.abs(t99 - 61) < 0.1);
    rule('the machine gives its order before the verdict', o0 >= 3 && o21 >= 3);
  }
  { // the Patron in the last room is a picture: the jaguar that reaches him passes through
    const g = stage('real'), pt = of(g, 'patron')[0]; g.persona = 'psycho'; g.p.x = pt.x; g.p.y = pt.y + 14; g.p.inv = 9; let seen = 0;
    for (let i = 0; i < 20; i++) { step(g, idle, 1 / 60); seen += g.ev.filter(e => e.k === 'picture').length; g.ev.length = 0; }
    rule('the Patron in the last room is only a picture', seen === 1 && !g.done);
  }
  { // the Patron speaks once as you come to the end of the Works
    const g = stage('works'), pt = of(g, 'patron')[0]; let lines = 0; g.p.x = pt.x - 400; g.p.y = 20 * T;
    for (const x of [pt.x - 400, pt.x - 200, pt.x - 190]) { g.p.x = x; step(g, idle, 1 / 60); lines += g.ev.filter(e => e.k === 'patron' && e.line).length; g.ev.length = 0; }
    rule('the Patron speaks once at the end of the Works', lines === 1);
  }
  { // the command ship: three figures speak, and the pad sets you down again
    const g = newGame(SHIP); run(g, { right: true }, 12);
    rule('the command ship has three who speak and a way back', g.said === 3 && g.done);
  }
  { // three roars at the great carved head call the ship
    const g = stage('steps'), m = of(g, 'monument')[0]; let called = false, omens = 0;
    g.persona = 'psycho'; g.p.x = m.x + 20; g.p.y = 20 * T;
    for (let n = 0; n < 3; n++) { step(g, { ...idle, actP: true }, 1 / 60); for (let i = 0; i < 8.2 * 60; i++) { step(g, idle, 1 / 60); } omens += g.ev.filter(e => e.k === 'omen').length; called = called || g.ev.some(e => e.k === 'abduct'); g.ev.length = 0; }
    rule('three roars at the great carved head call the ship', omens === 3 && called);
  }
  { // the jaguar can break a source with a pounce, and that raises the alarm
    const g = stage('lines'), src = of(g, 'source')[2];
    g.persona = 'psycho'; g.p.x = src.x - 34; g.p.y = 20 * T; run(g, {}, 0.1);
    step(g, { ...idle, fire: true, fireP: true, aimX: src.x, aimY: src.y }, 1 / 60); run(g, {}, 0.4);
    rule('a pounce breaks a source and raises the alarm', !src.alive && g.alarm > 0);
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
  // ---------------------------------------------------------------- THE ANOMALOUS SYSTEM
  const sys = def => newGame(def || ANOMALY), swap = g => step(g, { ...idle, swapP: true }, 1 / 60), bodyOf = (g, tx, ty) => g.L.body[ty * g.L.w + tx], foot = 18.7 * T;
  { // every change of form leaves a copy in there, and the six stages keep the wait of 8 seconds
    const g = sys(); swap(g); run(g, {}, 0.3); swap(g); run(g, {}, 0.3); swap(g);
    const s = stage('steps'); swap(s); run(s, {}, 0.3); swap(s);
    rule('inside the system every change of form leaves a copy, and the six stages keep their wait', g.copies.length === 3 && !!s.double && s.doubleCd > 7 && s.copies.length === 0 && s.plants === 0);
  }
  { // a copy at the foot of the boot block corrupts that block and nothing else, and its gate goes dark only when all of it has turned
    const g = sys(), gate = of(g, 'gate')[0], b = bodyOf(g, 19, 19);
    g.p.x = foot; swap(g);
    const woke = g.plants === 1 && g.scanX >= 0 && g.cursor.on; run(g, {}, 1.5);
    const half = g.rotN[b] > 0 && g.rotN[b] < g.L.bodies[b].n && gateActive(g, gate); run(g, {}, 3);
    rule('a copy corrupts the metal it touches, the corruption stays in that body, and its gate goes dark when the whole body has turned', woke && half && g.rotN[b] === g.L.bodies[b].n && !gateActive(g, gate) && g.rotN.filter(n => n > 0).length === 1);
  }
  { // the scan cleans what it passes, and the player it reaches goes back to the standing stone with the scan behind
    const g = sys(), gate = of(g, 'gate')[0], b = bodyOf(g, 19, 19);
    g.p.x = foot; swap(g); run(g, {}, 4.5);
    const dark = !gateActive(g, gate); g.p.x = 40 * T; g.scanX = 19 * T; g.scanCol = 19; run(g, {}, 0.5);
    const lit = gateActive(g, gate) && g.rotN[b] < g.L.bodies[b].n;
    g.scanX = g.p.x + 4; run(g, {}, 1.3);
    rule('the scan cleans what it passes and sends the player it reaches back to the standing stone', dark && lit && g.caught === 1 && g.deaths === 1 && !g.p.dead && g.scanX < g.p.x);
  }
  { // the cursor takes a copy before it comes for the player, and it does not see a player who hides
    const g = sys(), k = g.cursor; g.p.x = foot; swap(g);
    k.x = g.p.x - 30; k.y = g.p.y - 10; run(g, {}, 1);
    const took = k.deleted === 1 && k.hits === 0 && g.copies.length === 0;
    run(g, { down: true }, 4); const unseen = g.p.hidden && k.hits === 0;
    run(g, {}, 5);
    rule('the cursor deletes a copy before it comes for the player, and it does not see a player who hides', took && unseen && k.hits >= 1);
  }
  { // turned metal takes the cord and the claws; clean metal takes neither
    const g = sys(), throwCord = { ...idle, alt: true, altP: true, aimX: 21.5 * T, aimY: 12 * T };
    g.p.x = 17 * T; step(g, throwCord, 1 / 60);
    const refused = !g.p.rope;
    g.p.x = foot; swap(g); run(g, {}, 0.3); swap(g); run(g, {}, 2.5); g.p.x = 17 * T; step(g, throwCord, 1 / 60);
    const c = sys({ ...ANOMALY, anomaly: false }); c.p.x = foot; swap(c); let clung = false; run(c, { right: true, up: true, jump: true, jumpP: true }, 1.5, () => { clung = clung || !!c.p.cling; });
    rule('turned metal takes the cord and the claws, and clean metal takes neither', refused && !!g.p.rope && !clung && c.persona === 'psycho');
  }
  { // the first panel: a copy that touches no metal says so, a copy against the panel corrupts all of it with the system
    // asleep, corrupt it is climbed, and the system wakes once you are over it
    const g = sys(); swap(g); const said = g.ev.filter(e => e.k === 'idle').length; run(g, {}, 0.3); swap(g); run(g, {}, 0.3);
    g.p.x = 8.4 * T; run(g, {}, 0.05); swap(g); run(g, {}, 1.5);
    const b = bodyOf(g, 9, 19), asleep = g.plants === 1 && !g.woke && g.scanX < 0 && !g.cursor.on && g.rotN[b] === g.L.bodies[b].n && g.rotN.filter(n => n > 0).length === 1;
    const told = /corrupt/.test(hintText(g, 0)) && /Stand against/.test(hintText(sys(), 0));
    run(g, { right: true, up: true, jump: true, jumpP: true }, 3); run(g, { right: true }, 0.6);
    const over = g.p.x > 12 * T && g.woke && g.scanX >= 0 && g.cursor.on && g.deaths === 0;
    g.p.x = 15 * T; g.p.y = 20 * T; run(g, {}, 0.3); g.ev.length = 0; swap(g); const quiet = !g.ev.some(e => e.k === 'idle');   // no metal here either, and a copy has taken before: nothing is said
    g.scanX = 13 * T; run(g, {}, 0.1); const cleaned = g.rotN[b] === 0 && /Stand against/.test(hintText(g, 0));                  // the scan cleans the panel, and the hint says how to corrupt it again
    const walker = sys(); walker.p.x = 14 * T; run(walker, {}, 0.5);                                                             // past the panel with no copy on metal: still asleep
    rule('the first panel is corrupted and climbed with the system asleep, and the system wakes once you are over it', said === 1 && asleep && over);
    rule('the system does not wake without a copy on metal, and the panel\'s hint follows the panel', !walker.woke && walker.scanX < 0 && told && quiet && cleaned);
  }
  { // a gate that is always lit, and the door of the core
    const g = sys(), gate = of(g, 'gate')[0]; g.p.x = 20 * T; g.p.y = 8 * T; run(g, { right: true }, 1.5);
    const stopped = g.p.x < gate.x && g.p.hp < g.p.maxHp && gateActive(g, gate);
    const d = sys(); d.p.x = 179.5 * T; run(d, { right: true }, 1);
    rule('a lit gate stops the player until its body has turned, and the way out is shut until the core breaks', stopped && d.p.x < 181 * T && !d.done);
  }
  // ---- found by play (round 1 of the playtest, November 18, 2026)
  const inStone = g => { const p = g.p, w = g.persona === 'psycho' ? 14 : 8, h = g.persona === 'psycho' ? 12 : 20; for (let ty = Math.floor((p.y - h) / T); ty <= Math.floor((p.y - 0.001) / T); ty++) for (let tx = Math.floor((p.x - w / 2) / T); tx <= Math.floor((p.x + w / 2 - 0.001) / T); tx++) if (solidTile(g, tx, ty, g.persona === 'psycho')) return true; return false; };
  { // each wall the cord gets you over: walk into the wall until it stops you, aim at the ring, hold, reel in, let go
    const over = ['steps', 'lines', 'works', 'record'].map(id => {
      const g = stage(id), ring = of(g, 'ring')[0];
      g.p.x = ring.x - 60; g.p.y = 20 * T; run(g, { right: true }, 2);
      const foot = g.p.x; run(g, { alt: true, altP: true, aim: ring }, 0.1);
      const tied = !!g.p.rope && g.p.rope.pts[0].x === ring.x && g.p.rope.pts[0].y === ring.y;
      run(g, { alt: true, up: true, aim: ring }, 3); run(g, {}, 1);
      return tied && foot < ring.x && g.p.onGround && g.p.y <= 15 * T && g.deaths === 0;
    });
    rule('the ring over each wall is in reach from the foot of the wall', over.every(Boolean));
  }
  { // R on the cord: back at the standing stone, alive and whole. In the last room it does nothing.
    const g = stage('steps'), ring = of(g, 'ring')[0];
    g.p.x = ring.x - 50; g.p.y = 20 * T; run(g, {}, 0.1); run(g, { alt: true, altP: true, aim: ring }, 0.3); const tied = !!g.p.rope;
    step(g, { ...idle, alt: true, aimX: ring.x, aimY: ring.y, resetP: true }, 1 / 60); run(g, { alt: true, aim: ring }, 1.5);
    const back = !g.p.dead && g.p.hp === g.p.maxHp && g.p.x === g.check.x && g.p.y === g.check.y && g.deaths === 1 && !inStone(g);
    const r = stage('real'); step(r, { ...idle, resetP: true }, 1 / 60); run(r, {}, 0.5);
    rule('R returns you to the standing stone alive, and does nothing in the last room', tied && back && !r.p.dead && !r.over);
  }
  { // a cord hooked inside the low tunnel under the dais and reeled in must leave the weaver outside it
    const g = stage('works'); let inside = 0, tied = false;
    for (const [x, ax] of [[136.25, 130], [127.75, 134]]) {
      g.p.x = x * T; g.p.y = 22 * T; g.p.rope = null; g.p.vx = g.p.vy = 0; run(g, {}, 0.2);
      const aim = { x: ax * T, y: 22 * T }; run(g, { alt: true, altP: true, aim }, 0.1); tied = tied || !!g.p.rope;
      run(g, { alt: true, up: true, aim }, 5, g => { if (inStone(g)) inside++; }); run(g, {}, 0.3);
    }
    rule('a cord reeled in at a tunnel mouth never pulls the weaver into stone', tied && inside === 0);
  }
  { // the jaguar takes hold of stone from the ground when up is held: a stick pushed up is not a jump
    const g = stage('steps'); g.persona = 'psycho'; g.p.x = 151 * T; g.p.y = 20 * T; run(g, {}, 0.2);
    run(g, { right: true, up: true }, 4);
    rule('the jaguar climbs from the ground with up held and no jump', g.p.onGround && g.p.y <= 12 * T + 1);
  }
  { // the place the machine orders you to is one the form you are in can reach, and the ending knows how the run ended
    const obey = psy => { const g = stage('real'), a = of(g, 'asi')[0]; if (psy) g.persona = 'psycho';
      for (let i = 0; i < 45 * 60 && !g.over; i++) { g.p.inv = 1; const d = a.tele ? a.tele.x - g.p.x : 0; step(g, { ...idle, right: d > 3, left: d < -3 }, 1 / 60); g.ev.length = 0; }
      return g.orders >= 3 && g.obeyed === g.orders && g.judged; };
    const fall = stage('real'); for (let i = 0; i < 45 * 60 && !fall.over; i++) step(fall, idle, 1 / 60);
    rule('each form can stand where the machine orders, when it answers at once', obey(false) && obey(true));
    rule('a run that ends before the verdict is not marked as judged', fall.over && !fall.judged && fall.time < 39);
  }
  { // the ending counts every change of form; a weaver's run is still held to none into the jaguar
    const g = stage('lines'); run(g, {}, 0.1); step(g, { ...idle, swapP: true }, 1 / 60); run(g, {}, 0.4); step(g, { ...idle, swapP: true }, 1 / 60);
    rule('every change of form is counted for the ending', g.shifts === 2 && g.swaps === 1);
  }
  { // a way that ends at a wall says so: under the last stair of stage 1, and at both ends of stage 2's ravine
    const at = (id, x, y) => { const g = stage(id); g.p.x = x * T; g.p.y = y * T; run(g, {}, 0.1); return g.hint >= 0 && !!g.L.hints[g.hint]; };
    rule('a dead end shows a hint', at('steps', 247.5, 20) && at('machu', 40.5, 34) && at('machu', 26.5, 34));
  }
  { // down and jump: through a beam, but on stone it is a jump, so a player who is hiding can jump away
    const g = stage('lines'); g.p.x = 6 * T; g.p.y = 20 * T; run(g, { down: true }, 0.4); const hid = g.p.hidden;
    step(g, { ...idle, down: true, jump: true, jumpP: true }, 1 / 60); run(g, { down: true, jump: true }, 0.15); const rose = g.p.y < 20 * T - 12;
    const m = stage('machu'); m.p.x = 19.5 * T; m.p.y = 39 * T; run(m, {}, 0.2); const on = m.p.onGround && m.p.y === 39 * T;
    step(m, { ...idle, down: true, jump: true, jumpP: true }, 1 / 60); run(m, { down: true }, 0.6);
    rule('down and jump drops through a beam and jumps from stone', hid && rose && on && m.p.y === 41 * T);
  }
  { // a fall from the upper words of the first climb lands on a perch halfway up, and not at the foot
    const drop = (x, y) => { const g = stage('machu'); g.p.x = x * T; g.p.y = y * T; run(g, {}, 9); return g.p.y / T; };
    rule('a fall from the upper words lands on a perch', drop(13.5, 31) === 32 && drop(13.5, 27) === 32 && drop(9.5, 33) === 34 && drop(9.5, 29) === 34);
  }
}
process.exit(failed ? 1 : 0);
