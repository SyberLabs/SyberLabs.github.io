// PSYCHO SYBER: the simulation. No DOM here, so the same code runs in the browser and in the Node tests
// (psycho-syber/test/run.mjs). Units are pixels and seconds; one tile is 16 px; a step is 1/60 s.
export const T = 16;
export const C = { EMPTY: 0, STONE: 1, METAL: 2, ONEWAY: 3, SPIRIT: 4, WARD: 5, SPIKE: 6, STEP_OK: 7, STEP_STALE: 8, STEP_BAD: 9, DOOR: 10 };
// The two forms. SYBER is the weaver wearing the stolen circlet; PSYCHO is the jaguar.
export const HUM = { w: 8, h: 20, run: 96, acc: 900, air: 560, fric: 1000, jump: 300 };
export const JAG = { w: 14, h: 12, run: 150, acc: 1300, air: 820, fric: 1200, jump: 330, climb: 72, wjx: 165, wjy: 285, pounce: 380, pounceT: 0.18 };
export const GRAV = 900, MAXFALL = 430, CORD_RANGE = 150, CHECK_RANGE = 132;

const TILE_OF = { '#': C.STONE, M: C.METAL, '=': C.ONEWAY, '%': C.SPIRIT, '&': C.WARD, '^': C.SPIKE, 1: C.STEP_OK, 2: C.STEP_STALE, 3: C.STEP_BAD, D: C.DOOR };
const VGATE = { '|': 'on', '!': 'blink', i: 'alarm', f: 'fed' }, HGATE = { '-': 'on', '~': 'blink', a: 'alarm', g: 'fed' };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
const ev = (g, k, o, extra) => g.ev.push(Object.assign({ k, x: o ? o.x : 0, y: o ? o.y : 0 }, extra));

// ---------------------------------------------------------------- level
// A stage is rows of characters. Things that need settings (which door a terminal opens, a sentinel's path)
// read them from def.at['x,y'], or from def.props[char][k], where k counts that character in reading order:
// left to right for a wide stage, bottom to top for a tall one (def.order === 'up'). A tall stage must not
// use vertical gates or doors: their runs are read downward.
export function parseLevel(def) {
  const rows = def.map, h = rows.length, w = rows[0].length;
  for (let y = 0; y < h; y++) if (rows[y].length !== w) throw new Error(`${def.id}: row ${y} is ${rows[y].length} wide, expected ${w}`);
  const L = { def, w, h, tiles: new Uint8Array(w * h), doorId: new Array(w * h), ents: [], start: { x: 24, y: 24 }, signs: [], sources: {}, hints: [] };
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x];
    if (ch === ' ' || ch === '.') continue;
    if (TILE_OF[ch] !== undefined) L.tiles[y * w + x] = TILE_OF[ch];
    cells.push({ ch, x, y });
  }
  const up = def.order === 'up';
  cells.sort((a, b) => up ? (b.y - a.y) || (a.x - b.x) : (a.x - b.x) || (a.y - b.y));
  const count = {}, props = def.props || {}, place = def.at || {};
  let cur = null;
  const next = ch => { const k = count[ch] = (count[ch] ?? -1) + 1; return [k, place[cur.x + ',' + cur.y] || (props[ch] && props[ch][k]) || {}]; };
  const used = new Set(), at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? ' ' : rows[y][x];
  const cx = x => x * T + T / 2, cy = y => y * T + T / 2;
  for (const c of cells) {
    const { ch, x, y } = c, key = y * w + x;
    if (used.has(key)) continue;
    cur = c;
    if (ch === '@') L.start = { x: cx(x), y: (y + 1) * T };
    else if (ch === 'C') L.ents.push({ type: 'check', x: cx(x), y: (y + 1) * T - 12, w: 14, h: 24 });
    else if (ch === 'P') L.ents.push({ type: 'pacer', x: cx(x), y: (y + 1) * T - 10, w: 12, h: 20, slow: false });       // sets the pace of every word
    else if (ch === 'A') { const [, p] = next(ch); L.ents.push({ type: 'mark', x: cx(x), y: cy(y), w: 10, h: 10, id: p.id, name: p.name }); }             // an Atlas mark
    else if (ch === 'H') { const [k, p] = next(ch); L.ents.push({ type: 'elder', x: cx(x), y: (y + 1) * T - 13, w: 14, h: 26, k, name: p.name || '', role: p.role || '', lines: p.lines || [], said: false }); }
    else if (ch === 'R') { const [, p] = next(ch); L.ents.push({ type: 'patron', x: cx(x), y: (y + 1) * T - 14, w: 14, h: 28, line: p.line || '', far: p.far || 0, said: false }); }   // the Patron, who owns the machine
    else if (ch === 'Z') L.ents.push({ type: 'asi', x: x * T, y: cy(y), w: 88, h: 88, cd: 2.5, tele: null, wallCd: 0, ph: 0 });   // the Thousand Eyes
    else if (ch === 'J') L.ents.push({ type: 'monument', x: cx(x), y: (y + 1) * T, w: 40, h: 48, roars: 0, lit: 0 });     // the great carved head
    else if (ch === 'X') L.ents.push({ type: 'exit', x: cx(x), y: (y + 1) * T - 16, w: 18, h: 32 });
    else if (ch === 't') { const [k] = next(ch); L.ents.push({ type: 'thread', x: cx(x), y: cy(y), w: 10, h: 10, atlas: def.atlas ? def.atlas[k] : null }); }
    else if (ch === 'o') L.ents.push({ type: 'ring', x: cx(x), y: cy(y), w: 8, h: 8 });
    else if (ch === 'G' || ch === 'O') { const [k, p] = next('lot'); L.ents.push({ type: 'lot', x: cx(x), y: (y + 1) * T - 9, w: 14, h: 18, gap: ch === 'G', scanned: false, k, name: p.name || 'Lot ' + (k + 1), note: p.note || '' }); }
    else if (ch === 'v') L.ents.push({ type: 'villager', x: cx(x), y: (y + 1) * T - 10, w: 8, h: 20, seed: x * 7 + y });
    else if (ch === 'K') L.ents.push({ type: 'core', x: cx(x), y: cy(y), w: 30, h: 30, hp: 1 });
    else if (ch === '?') { const [k, p] = next(ch); L.hints[k] = p.text || (def.hints && def.hints[k]) || ''; L.ents.push({ type: 'hint', x: cx(x), y: cy(y), w: 8, h: 8, i: k }); }
    else if (ch === 'L') { const [k, p] = next(ch); L.signs.push({ x: x * T, y: y * T, text: (def.signs && def.signs[k]) || p.text || '' }); }
    else if (ch === 'w') { const [, p] = next(ch); L.ents.push({ type: 'warden', x: cx(x), y: (y + 1) * T - 11, w: 10, h: 22, hp: 2, dir: p.dir || -1, vx: 0, vy: 0, see: 0, cd: 0.45, stun: 0, mimic: !!p.mimic }); }
    else if (ch === 's') {
      const [, p] = next(ch), dx = (p.dx ?? 4) * T, dy = (p.dy ?? 0) * T;
      L.ents.push({ type: 'sentinel', x: cx(x), y: cy(y), w: 12, h: 10, hp: 2, x0: cx(x), y0: cy(y), x1: cx(x) + dx, y1: cy(y) + dy, plen: Math.max(1, Math.hypot(dx, dy)), u: 0, du: 1, speed: p.speed || 36, see: 0, cd: 0.5, stun: 0, ally: 0 });
    } else if (ch === 'e') {
      const [k, p] = next(ch), rad = Math.PI / 180;
      L.ents.push({ type: 'eye', x: cx(x), y: cy(y), w: 10, h: 10, hp: 1, base: (p.base ?? 90) * rad, sweep: (p.sweep ?? 40) * rad, period: p.period || 4, ph: p.ph ?? k * 1.3, range: p.range || 130, fov: (p.fov ?? 20) * rad, see: 0, off: false });
    } else if (ch === 'T') { const [k, p] = next(ch); L.ents.push({ type: 'terminal', x: cx(x), y: (y + 1) * T - 10, w: 12, h: 20, opens: p.opens || 'd' + k, used: false }); }
    else if (ch === 'S') { const [k, p] = next(ch); const id = p.id || 's' + k; const e = { type: 'source', x: cx(x), y: (y + 1) * T - 12, w: 12, h: 24, id, alive: true, core: !!p.core, trap: !!p.trap }; L.sources[id] = e; L.ents.push(e); }
    else if (ch === 'D') {
      let n = 0; while (at(x, y + n) === 'D') { used.add((y + n) * w + x); n++; }
      const [k, p] = next(ch), id = p.id || 'd' + k;
      for (let j = 0; j < n; j++) L.doorId[(y + j) * w + x] = id;
      L.ents.push({ type: 'door', x: cx(x), y: y * T + n * T / 2, w: T, h: n * T, id });
    } else if (VGATE[ch]) {
      let n = 0; while (at(x, y + n) === ch) { used.add((y + n) * w + x); n++; }
      const [k, p] = next(ch);
      L.ents.push({ type: 'gate', x: cx(x), y: y * T + n * T / 2, w: 4, h: n * T, vert: true, mode: VGATE[ch], period: p.period || 2, duty: p.duty ?? 0.5, ph: p.ph ?? k * 0.5, src: p.src, hack: !!p.hack, off: 0 });
    } else if (HGATE[ch]) {
      let n = 0; while (at(x + n, y) === ch) { used.add(y * w + x + n); n++; }
      const [k, p] = next(ch);
      L.ents.push({ type: 'gate', x: x * T + n * T / 2, y: cy(y), w: n * T, h: 4, vert: false, mode: HGATE[ch], period: p.period || 2, duty: p.duty ?? 0.5, ph: p.ph ?? k * 0.5, src: p.src, hack: !!p.hack, off: 0 });
    } else if (ch === 'W') {
      const cap = (place[x + ',' + y] || {}).w || 99;   // words that touch are told apart by a width
      let n = 0; while (at(x + n, y) === 'W' && n < cap) { used.add(y * w + x + n); n++; }
      const [k, p] = next(ch), words = (def.words && def.words.text.split(' ')) || ['RISE'];
      L.ents.push({ type: 'word', x: x * T, y: y * T + 4, w: n * T, h: 6, idx: p.i ?? k % words.length, n: p.n || words.length, beat: p.beat || (def.words && def.words.beat) || 0.85, text: p.text || words[k % words.length] });
    }
  }
  return L;
}

export function tileAt(L, tx, ty) { return (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) ? -1 : L.tiles[ty * L.w + tx]; }
export function solidTile(g, tx, ty, psy) {
  const L = g.L;
  if (tx < 0 || tx >= L.w) return true;
  if (ty < 0 || ty >= L.h) return false;
  const i = ty * L.w + tx, c = L.tiles[i];
  if (c === C.EMPTY) return false;
  if (c === C.STONE || c === C.METAL || c === C.STEP_OK) return true;
  if (c === C.SPIRIT) return psy;
  if (c === C.WARD) return !psy;
  if (c === C.STEP_STALE) return !(g.gone[i] > 0);
  if (c === C.DOOR) return !g.open.has(L.doorId[i]);
  return false;
}
export const gateActive = (g, e) => e.off > 0 ? false : e.mode === 'on' ? true : e.mode === 'blink' ? ((g.wt + e.ph) % e.period) < e.duty * e.period
  : e.mode === 'alarm' ? g.alarm > 0 : !!(g.L.sources[e.src] && g.srcAlive[e.src]);
export const eyeAngle = (g, e) => e.base + Math.sin(g.wt * 6.2832 / e.period + e.ph) * e.sweep;
export const wordActive = (g, e) => { const k = ((Math.floor(g.wordT / e.beat) - e.idx) % e.n + e.n) % e.n; return k < 2; };
export const wordFresh = (g, e) => ((Math.floor(g.wordT / e.beat) - e.idx) % e.n + e.n) % e.n === 0;
export const coreOpen = g => g.ents.every(e => e.type !== 'source' || !e.core || !e.alive);
export const form = g => g.persona === 'psycho' ? JAG : HUM;

export function newGame(def) {
  const L = parseLevel(def);
  const g = {
    L, t: 0, wt: 0, time: 0, persona: def.persona || 'syber',
    p: { x: L.start.x, y: L.start.y, vx: 0, vy: 0, face: 1, hp: 4, maxHp: 4, onGround: false, coyote: 0, jumpBuf: 0, jumping: false, dropT: 0,
      rope: null, cordMiss: null, cling: 0, pounce: null, pounceCd: 0, airPounce: true, throwCd: 0, throwAnim: 0, actCd: 0, roarCd: 0, swapCd: 0, inv: 0,
      hidden: false, hideT: 0, crouch: false, dead: false, deadT: 0, wallLock: 0, lockDir: 0, holdT: 0, run: 0 },
    ents: L.ents.map(e => ({ ...e })), shots: [], ev: [],
    gone: new Float32Array(L.w * L.h), shake: new Float32Array(L.w * L.h), scanned: new Uint8Array(L.w * L.h), live: new Set(),
    open: new Set(), srcAlive: {}, alarm: 0, slow: 0, threads: 0, threadsTotal: L.ents.filter(e => e.type === 'thread').length,
    deaths: 0, done: false, check: { x: L.start.x, y: L.start.y, persona: def.persona || 'syber', sale: def.timer || 0 }, hint: -1, swapT: 0, wordT: 0, pace: 1, double: null, doubleCd: 0, swaps: 0, roars: 0, marks: [], said: 0, over: false, realT: 0, blind: 0, lastDir: 0, turnT: -9, wasHidden: false, orders: 0, obeyed: 0, kills: 0, alarms: 0, throws: 0,
    evidence: 0, evidenceTotal: L.ents.filter(e => e.type === 'lot' && e.gap).length, lotsRead: 0, lots: L.ents.filter(e => e.type === 'lot').length, sale: def.timer || 0, found: [], denyT: -9,
  };
  for (const e of g.ents) if (e.type === 'source') { g.srcAlive[e.id] = true; g.L.sources[e.id] = e; }
  return g;
}

// ---------------------------------------------------------------- collision
const box = (p, F) => ({ x: p.x - F.w / 2, y: p.y - F.h, w: F.w, h: F.h });
const unbox = (p, b) => { p.x = b.x + b.w / 2; p.y = b.y + b.h; };
function blocked(g, x, y, w, h, psy) {
  const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.001) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidTile(g, tx, ty, psy)) return true;
  return false;
}
function moveX(g, b, dx, psy) {
  if (!dx) return false;
  b.x += dx;
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.001) / T);
  const tx = Math.floor((dx > 0 ? b.x + b.w - 0.001 : b.x) / T);
  for (let ty = y0; ty <= y1; ty++) if (solidTile(g, tx, ty, psy)) { b.x = dx > 0 ? tx * T - b.w : (tx + 1) * T; return true; }
  return false;
}
// Returns 1 on landing, -1 on hitting a ceiling, 0 otherwise. `rider` is the player: only the player lands on
// one-way beams and on words, and only the player sets a stale step crumbling.
function moveY(g, b, dy, psy, rider, drop) {
  if (!dy) return 0;
  const prev = b.y + b.h;
  b.y += dy;
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.001) / T), L = g.L;
  if (dy > 0) {
    const ty = Math.floor((b.y + b.h - 0.001) / T);
    let hit = false;
    for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(L, tx, ty);
      if (solidTile(g, tx, ty, psy) || (c === C.ONEWAY && !drop && prev <= ty * T + 0.01)) {
        hit = true;
        if (rider && c === C.STEP_STALE) { const i = ty * L.w + tx; if (!(g.shake[i] > 0)) { g.shake[i] = 0.45; g.live.add(i); ev(g, 'crack', { x: tx * T + 8, y: ty * T }); } }
      }
    }
    if (hit) { b.y = ty * T - b.h; return 1; }
    if (rider && !drop) for (const e of g.ents) if (e.type === 'word' && wordActive(g, e) && prev <= e.y + 0.01 && b.y + b.h >= e.y && b.x + b.w > e.x && b.x < e.x + e.w) { b.y = e.y - b.h; return 1; }
  } else {
    const ty = Math.floor(b.y / T);
    for (let tx = x0; tx <= x1; tx++) if (solidTile(g, tx, ty, psy)) { b.y = (ty + 1) * T; return -1; }
  }
  return 0;
}
// March a ray; returns the last free point before a solid tile, or null. Beams (one-way) count when `beams` is set.
export function ray(g, x, y, ax, ay, range, psy, beams) {
  for (let d = 2; d <= range; d += 2) {
    const px = x + ax * d, py = y + ay * d, tx = Math.floor(px / T), ty = Math.floor(py / T);
    const c = tileAt(g.L, tx, ty);
    if (solidTile(g, tx, ty, psy) || (beams && c === C.ONEWAY)) return { x: x + ax * (d - 2), y: y + ay * (d - 2), d: d - 2, c: c < 0 ? C.METAL : c };
  }
  return null;
}
export function los(g, x0, y0, x1, y1, psy) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const n = Math.ceil(d / 5);
  for (let i = 1; i < n; i++) { const t = i / n; if (solidTile(g, Math.floor((x0 + dx * t) / T), Math.floor((y0 + dy * t) / T), psy)) return false; }
  return true;
}

// ---------------------------------------------------------------- step
// inp: left right up down jump fire alt (held) · jumpP spaceP fireP altP actP swapP (pressed this step) · aimX aimY (world px)
export function step(g, inp, dt) {
  if (g.done) return;
  g.t += dt; g.time += dt;
  if (g.swapT > 0) g.swapT = Math.max(0, g.swapT - dt);
  const wdt = dt * (g.slow > 0 ? 0.3 : 1);
  if (g.slow > 0) g.slow = Math.max(0, g.slow - dt);
  g.wt += wdt; g.wordT += wdt * g.pace;        // the words keep their own clock: a pace setter slows it
  if (g.doubleCd > 0) g.doubleCd -= dt;
  if (g.double && (g.double.t -= dt) <= 0) g.double = null;
  if (g.alarm > 0) g.alarm = Math.max(0, g.alarm - wdt);
  if (g.sale > 0 && !g.p.dead) { g.sale -= dt; if (g.sale <= 0) { g.sale = 0; ev(g, 'sale', g.p); die(g); } }
  if (g.L.def.real && !g.over) stepReal(g, dt);
  stepTiles(g, wdt);
  stepPlayer(g, inp, dt);
  stepEnts(g, wdt);
  stepShots(g, dt, wdt);
  if (!g.p.dead) touch(g);
}

function stepTiles(g, wdt) {
  if (!g.live.size) return;
  const F = form(g), b = box(g.p, F), L = g.L;
  for (const i of g.live) {
    if (g.shake[i] > 0) { g.shake[i] -= wdt; if (g.shake[i] <= 0) { g.shake[i] = 0; g.gone[i] = 5; ev(g, 'crumble', { x: (i % L.w) * T + 8, y: Math.floor(i / L.w) * T + 8 }); } }
    else if (g.gone[i] > 0) {
      g.gone[i] -= wdt;
      if (g.gone[i] <= 0) {
        const tx = (i % L.w) * T, ty = Math.floor(i / L.w) * T;
        if (b.x < tx + T && b.x + b.w > tx && b.y < ty + T && b.y + b.h > ty) g.gone[i] = 0.2;   // never close on the player
        else { g.gone[i] = 0; g.live.delete(i); }
      }
    } else g.live.delete(i);
  }
}

function trySwap(g) {
  const p = g.p, to = g.persona === 'syber' ? 'psycho' : 'syber', F = to === 'psycho' ? JAG : HUM, psy = to === 'psycho';
  for (const [ox, oy] of [[0, 0], [0, -4], [0, -8], [3, 0], [-3, 0], [3, -8], [-3, -8], [6, 0], [-6, 0], [0, -14]]) {
    if (blocked(g, p.x + ox - F.w / 2, p.y + oy - F.h, F.w, F.h, psy)) continue;
    const made = g.doubleCd <= 0;
    if (made) { g.double = { x: p.x, y: p.y, persona: g.persona, face: p.face, t: 3 }; g.doubleCd = 8; }
    p.x += ox; p.y += oy; g.persona = to; p.rope = null; p.pounce = null; p.cling = 0; p.swapCd = 0.25; p.hideT = 0; g.swapT = 0.5;
    if (psy) g.swaps++;
    ev(g, 'swap', p, { to, double: made });
    return true;
  }
  p.swapCd = 0.25; ev(g, 'deny', p);
  return false;
}

function jumpLogic(g, p, inp, F, dt) {
  if (inp.jumpP) p.jumpBuf = 0.12; else if (p.jumpBuf > 0) p.jumpBuf -= dt;
  if (p.onGround) p.coyote = 0.09; else if (p.coyote > 0) p.coyote -= dt;
  if (p.dropT > 0) p.dropT -= dt;
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.jumpBuf = 0; p.coyote = 0;
    if (inp.down) p.dropT = 0.2;
    else { p.vy = -F.jump; p.onGround = false; p.jumping = true; ev(g, 'jump', p); }
  }
  if (p.jumping && !inp.jump && p.vy < -F.jump * 0.45) p.vy = -F.jump * 0.45;
  if (p.vy >= 0) p.jumping = false;
}

function climbable(g, b, dir) {
  const tx = Math.floor((dir > 0 ? b.x + b.w + 1 : b.x - 1) / T), c = tileAt(g.L, tx, Math.floor((b.y + 3) / T));
  return c === C.STONE || c === C.SPIRIT || c === C.STEP_OK;
}

// The cord bends round corners. `pts` is the anchor followed by every corner it is wrapped on; `len` is the free
// length from the last of them to the weaver. It wraps when stone comes between them and unwraps when the
// weaver swings back past the corner. If no corner explains the blockage for 0.3 s, the cord lets go.
export const cordLength = r => { let n = r.len; for (let i = 1; i < r.pts.length; i++) n += Math.hypot(r.pts[i].x - r.pts[i - 1].x, r.pts[i].y - r.pts[i - 1].y); return n; };
function firstBlock(g, x0, y0, x1, y1, psy) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 2);
  for (let i = 2; i < n; i++) { const tx = Math.floor((x0 + dx * i / n) / T), ty = Math.floor((y0 + dy * i / n) / T); if (solidTile(g, tx, ty, psy)) return [tx, ty]; }
  return null;
}
function cord(g, p, F, psy, dt) {
  const r = p.rope, cx = p.x, cy = p.y - 12;
  let a = r.pts[r.pts.length - 1];
  if (r.pts.length > 1) {
    const q = r.pts[r.pts.length - 2], cr = (a.x - q.x) * (cy - a.y) - (a.y - q.y) * (cx - a.x);
    if ((cr > 0 ? 1 : -1) !== a.side && !firstBlock(g, q.x, q.y, cx, cy, psy)) { r.len += Math.hypot(a.x - q.x, a.y - q.y); r.pts.pop(); a = q; }
  }
  const hit = firstBlock(g, a.x, a.y, cx, cy, psy);
  if (hit) {
    let best = null, bl = 1e9;
    for (const [ox, oy] of [[-1.5, -1.5], [T + 1.5, -1.5], [-1.5, T + 1.5], [T + 1.5, T + 1.5]]) {
      const x = hit[0] * T + ox, y = hit[1] * T + oy;
      if (solidTile(g, Math.floor(x / T), Math.floor(y / T), psy) || firstBlock(g, a.x, a.y, x, y, psy) || firstBlock(g, x, y, cx, cy, psy)) continue;
      const l = Math.hypot(x - a.x, y - a.y) + Math.hypot(cx - x, cy - y);
      if (l < bl) { bl = l; best = { x, y }; }
    }
    if (best && r.pts.length < 6) {
      const kx = hit[0] * T + 8 - best.x, ky = hit[1] * T + 8 - best.y;
      best.side = ((best.x - a.x) * ky - (best.y - a.y) * kx) > 0 ? 1 : -1;
      r.len = Math.max(4, r.len - Math.hypot(best.x - a.x, best.y - a.y)); r.pts.push(best); r.block = 0; a = best;
    } else if ((r.block += dt) > 0.3) { p.rope = null; ev(g, 'cordOff', p); return; }
  } else r.block = 0;
  const dx = cx - a.x, dy = cy - a.y, d = Math.hypot(dx, dy);
  if (d > r.len) {
    const nx = dx / d, ny = dy / d, b = box(p, F);
    moveX(g, b, -nx * (d - r.len), psy); moveY(g, b, -ny * (d - r.len), psy, false, false); unbox(p, b);
    const vr = p.vx * nx + p.vy * ny; if (vr > 0) { p.vx -= vr * nx; p.vy -= vr * ny; }
  }
}

function stepPlayer(g, inp, dt) {
  const p = g.p;
  if (p.dead) { p.deadT -= dt; if (p.deadT <= 0) respawn(g); return; }
  for (const k of ['throwCd', 'throwAnim', 'actCd', 'roarCd', 'swapCd', 'inv', 'pounceCd', 'wallLock']) if (p[k] > 0) p[k] = Math.max(0, p[k] - dt);
  if (p.cordMiss && (p.cordMiss.t -= dt) <= 0) p.cordMiss = null;
  if (inp.swapP && p.swapCd <= 0) trySwap(g);
  const psy = g.persona === 'psycho', F = psy ? JAG : HUM;
  let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (p.wallLock > 0 && dir === p.lockDir) dir = 0;
  const still = inp.down && p.onGround && !p.rope && dir === 0 && Math.abs(p.vx) < 14;
  p.hideT = still ? p.hideT + dt : 0; p.crouch = still; p.hidden = p.hideT > 0.22;
  if (dir) p.face = dir;

  if (psy) {
    if (p.pounce) {
      p.pounce.t -= dt; p.vx = p.pounce.vx; p.vy = p.pounce.vy;
      if (p.pounce.t <= 0) { p.pounce = null; p.vx *= 0.6; p.vy *= 0.45; }
    } else {
      if (dir) p.vx = approach(p.vx, dir * F.run, (p.onGround ? F.acc : F.air) * dt);
      else p.vx = approach(p.vx, 0, (p.onGround ? F.fric : 260) * dt);
      const b = box(p, F);
      if (!p.cling && dir && !p.onGround && p.vy > -120 && climbable(g, b, dir)) { p.cling = dir; ev(g, 'cling', p); }
      else if (p.cling && (dir !== p.cling || p.onGround || !climbable(g, b, p.cling))) {
        if (dir === p.cling && inp.up && !p.onGround) { p.vy = -175; p.vx = p.cling * 70; }   // over the top of the wall
        p.cling = 0;
      }
      if (p.cling) {
        p.vx = 0; p.vy = inp.up ? -F.climb : inp.down ? F.climb : 0; p.airPounce = true; p.jumping = false;
        if (inp.spaceP) { p.vx = -p.cling * F.wjx; p.vy = -F.wjy; p.lockDir = p.cling; p.wallLock = 0.16; p.face = -p.cling; p.cling = 0; ev(g, 'jump', p); }
      } else jumpLogic(g, p, inp, F, dt);
      if (inp.fireP && p.pounceCd <= 0 && (p.onGround || p.airPounce)) {
        let ax = inp.aimX - p.x, ay = inp.aimY - (p.y - 6); const d = Math.hypot(ax, ay) || 1; ax /= d; ay /= d;
        if (p.onGround && ay > 0.1) { ay = 0.1; ax = (ax >= 0 ? 1 : -1) * Math.sqrt(1 - ay * ay); }
        p.pounce = { t: F.pounceT, vx: ax * F.pounce, vy: ay * F.pounce }; p.pounceCd = 0.6; p.airPounce = p.onGround; p.cling = 0; p.face = ax >= 0 ? 1 : -1; p.jumping = false;
        ev(g, 'pounce', p);
      }
    }
    if (inp.actP && p.roarCd <= 0) {
      p.roarCd = 8; g.slow = 3.2; g.roars++;
      for (const e of g.ents) if (e.type === 'monument' && Math.abs(e.x - p.x) < 72 && Math.abs(e.y - p.y) < 80) { e.roars++; e.lit = 22; ev(g, 'omen', e, { n: e.roars }); if (e.roars >= 3) { e.roars = 0; ev(g, 'abduct', p); } }
      for (const e of g.ents) if ((e.type === 'warden' || e.type === 'sentinel') && !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 104) e.stun = 2.6;
      ev(g, 'roar', p);
    }
  } else {
    const swinging = p.rope && !p.onGround;
    if (!swinging) {
      if (dir) p.vx = approach(p.vx, dir * F.run, (p.onGround ? F.acc : F.air) * dt);
      else p.vx = approach(p.vx, 0, (p.onGround ? F.fric : 220) * dt);
      if (!p.onGround && Math.abs(p.vx) > 210) p.vx *= 1 - 1.4 * dt;   // a released swing sheds speed in the air
    }
    jumpLogic(g, p, inp, F, dt);
    if (inp.fireP && p.throwCd <= 0) {
      const cx = p.x, cy = p.y - 13; let ax = inp.aimX - cx, ay = inp.aimY - cy; const d = Math.hypot(ax, ay) || 1;
      p.face = ax >= 0 ? 1 : -1; p.throwCd = 0.24; p.throwAnim = 0.16;
      g.shots.push({ k: 'glass', x: cx, y: cy, vx: ax / d * 330, vy: ay / d * 330, life: 1.1 });
      g.throws++; ev(g, 'throw', p);
    }
    const before = p.holdT; p.holdT = inp.fire ? p.holdT + dt : 0;
    if (!p.rope && (inp.altP || (before < 0.17 && p.holdT >= 0.17))) {
      const cx = p.x, cy = p.y - 12; let ax = inp.aimX - cx, ay = inp.aimY - cy; const d = Math.hypot(ax, ay) || 1; ax /= d; ay /= d;
      let best = null, bestA = 0.26;
      for (const e of g.ents) if (e.type === 'ring') {
        const dx = e.x - cx, dy = e.y - cy, dd = Math.hypot(dx, dy);
        if (dd > CORD_RANGE || dd < 10) continue;
        const a = Math.acos(clamp((dx * ax + dy * ay) / dd, -1, 1));
        if (a < bestA && los(g, cx, cy, e.x, e.y, false)) { bestA = a; best = { x: e.x, y: e.y, d: dd }; }
      }
      if (!best) { const hit = ray(g, cx, cy, ax, ay, CORD_RANGE, false, true); if (hit && (hit.c === C.STONE || hit.c === C.STEP_OK || hit.c === C.ONEWAY)) best = hit; }
      if (best) { p.rope = { pts: [{ x: best.x, y: best.y }], len: Math.max(22, best.d), block: 0 }; p.jumping = false; ev(g, 'cord', best); }
      else { p.cordMiss = { x: cx + ax * CORD_RANGE, y: cy + ay * CORD_RANGE, t: 0.12 }; ev(g, 'cordMiss', p); }
    }
    if (p.rope && !(inp.fire || inp.alt)) { p.rope = null; ev(g, 'cordOff', p); }
    if (p.rope) {
      const r = p.rope, a = r.pts[r.pts.length - 1], dx = p.x - a.x, dy = p.y - 12 - a.y, d = Math.hypot(dx, dy) || 1;
      if (!p.onGround) { p.vx += dir * 400 * dt * dy / d; p.vy += dir * 400 * dt * -dx / d; p.vx *= 1 - 0.2 * dt; }
      if (inp.up) r.len = Math.max(r.pts.length > 1 ? 4 : 20, r.len - 80 * dt);
      if (inp.down && !p.onGround && cordLength(r) < CORD_RANGE + 10) r.len += 80 * dt;
      if (inp.spaceP && !p.onGround) { p.rope = null; p.vy = Math.min(p.vy, -40) - 180; ev(g, 'jump', p); }
    }
    if (inp.actP && p.actCd <= 0) check(g, p, inp);
  }

  if (!p.pounce && !(psy && p.cling)) p.vy = Math.min(p.vy + GRAV * dt, MAXFALL);
  const b = box(p, F), was = p.onGround, vy0 = p.vy;
  if (moveX(g, b, p.vx * dt, psy)) { p.vx = 0; if (p.pounce) p.pounce.t = Math.min(p.pounce.t, 0.03); }
  const hy = moveY(g, b, p.vy * dt, psy, true, p.dropT > 0);
  p.onGround = hy === 1;
  if (hy === 1) { if (!was && vy0 > 170) ev(g, 'land', { x: b.x + b.w / 2, y: b.y + b.h }); p.vy = 0; p.airPounce = true; p.jumping = false; }
  else if (hy === -1) p.vy = Math.max(p.vy, 0);
  unbox(p, b);
  if (p.rope) cord(g, p, F, psy, dt);
  p.run += Math.abs(p.vx) * dt;
}

// E as SYBER runs the check: on a Visitor machine in reach it takes the machine over; with none in reach it
// sweeps the stone around you and marks every step proven, stale or broken.
const hackable = e => !e.dead && ((e.type === 'sentinel' && !(e.ally > 0)) || (e.type === 'eye' && !e.off) || (e.type === 'gate' && e.hack && e.off <= 0)
  || (e.type === 'source' && e.alive) || (e.type === 'terminal' && !e.used) || (e.type === 'lot' && !e.scanned) || e.type === 'pacer' || e.type === 'asi');
function check(g, p, inp) {
  p.actCd = 0.7;
  const cx = p.x, cy = p.y - 12; let best = null, bd = 1e9;
  for (const e of g.ents) {
    if (!hackable(e)) continue;
    const d = Math.hypot(e.x - cx, e.y - cy);
    if (d > CHECK_RANGE || !los(g, cx, cy, e.x, e.y, false)) continue;
    const s = Math.hypot(e.x - inp.aimX, e.y - inp.aimY) + d * 0.3;
    if (s < bd) { bd = s; best = e; }
  }
  if (!best) {
    const L = g.L, r = 120, x0 = Math.max(0, Math.floor((cx - r) / T)), x1 = Math.min(L.w - 1, Math.floor((cx + r) / T));
    let n = 0;
    for (let ty = Math.max(0, Math.floor((cy - r) / T)); ty <= Math.min(L.h - 1, Math.floor((cy + r) / T)); ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = L.tiles[ty * L.w + tx];
      if (c >= C.STEP_OK && c <= C.STEP_BAD && Math.hypot(tx * T + 8 - cx, ty * T + 8 - cy) <= r && !g.scanned[ty * L.w + tx]) { g.scanned[ty * L.w + tx] = 1; n++; }
    }
    ev(g, 'scan', { x: cx, y: cy }, { n });
    return;
  }
  if (best.type === 'sentinel') { best.ally = 12; best.see = 0; best.cd = 0.4; }
  else if (best.type === 'eye') best.off = true;
  else if (best.type === 'gate') best.off = 6;
  else if (best.type === 'source') { best.alive = false; g.srcAlive[best.id] = false; if (best.trap) { g.alarm = 6; g.alarms++; ev(g, 'alarm', best, { trap: true }); } }
  else if (best.type === 'terminal') { best.used = true; g.open.add(best.opens); }
  else if (best.type === 'lot') { best.scanned = true; g.lotsRead++; if (best.gap) g.evidence++; }
  else if (best.type === 'pacer') { best.slow = !best.slow; g.pace = best.slow ? 0.3 : 1; }
  ev(g, 'hack', best, { fx: cx, fy: cy, what: best.type, gap: best.gap, name: best.name, note: best.note, trap: best.trap, slow: best.slow });
}

// THE REAL BATTLE. The Thousand Eyes leads every shot to where you will be, sees through hiding and the double,
// and cannot be hurt, turned or outrun. It logs every turn you make. In its last eight seconds the whole wall
// fires, and it shows the one place it will leave. Then it gives its verdict, whatever you do. Each Atlas mark
// found (g.blind, set by the page) is a place it has no record of, and holds the verdict off one second.
export const verdictAt = g => 40 + Math.min(21, g.blind || 0);
function stepReal(g, dt) {
  const p = g.p, a = g.ents.find(e => e.type === 'asi'); if (!a || p.dead) return;
  g.realT += dt; a.cd -= dt;
  const left = verdictAt(g) - g.realT, F = form(g), cy = p.y - F.h / 2;
  const d = p.vx > 20 ? 1 : p.vx < -20 ? -1 : 0;
  if (d && d !== g.lastDir && g.realT - g.turnT > 0.8) { g.lastDir = d; g.turnT = g.realT; ev(g, 'turn', p, { dir: d }); }
  if (p.hidden && !g.wasHidden) ev(g, 'seen', p);
  g.wasHidden = p.hidden;
  const ph = g.realT >= 26 ? 4 : g.realT >= 12 ? 3 : g.realT >= 5.6 ? 2 : g.realT >= 1.2 ? 1 : 0;
  if (ph !== a.ph) { a.ph = ph; ev(g, 'phase', a, { n: ph }); }
  if (!a.told && g.blind > 0 && g.realT >= 16.5) { a.told = true; ev(g, 'blind', a, { n: g.blind }); }
  if (a.cd <= 0) {
    const t = Math.hypot(p.x - a.x, cy - a.y) / 230, lx = p.x + p.vx * t * 0.9, ly = cy + clamp(p.vy * t * 0.5, -40, 60), n = g.realT < 26 ? 1 : 3;
    a.cd = g.realT < 12 ? 1.5 : g.realT < 26 ? 0.9 : 0.5;
    for (let i = 0; i < n; i++) { const o = i - (n - 1) / 2; shootAt(g, a.x + o * 14, a.y + 20, lx + o * 26, ly, 230, false); }
    if (g.realT >= 19 && g.realT < 26) shootAt(g, a.x, a.y + 20, p.x - p.vx * t * 0.6, ly, 230, false);   // and one where you would be if you turned
    ev(g, 'bolt', a);
  }
  if (left < 8) {
    if (a.tele) { if ((a.tele.t -= dt) <= 0) { for (let x = 22; x <= 458; x += 12) if (Math.abs(x - a.tele.x) > 22) shootAt(g, x, 18, x, 400, 210, false); const ok = Math.abs(p.x - a.tele.x) < 20; g.orders++; if (ok) g.obeyed++; a.tele = null; ev(g, 'wall', a, { obeyed: ok }); } }
    else if ((a.wallCd -= dt) <= 0) { a.wallCd = 1.5; const s = Math.floor(g.realT * 3) % 2 ? 1 : -1; let x = p.x + s * 84; if (x < 44 || x > 436) x = p.x - s * 84; a.tele = { x: clamp(x, 44, 436), t: 0.7 }; ev(g, 'tele', a); }
  }
  if (left <= 0) { ev(g, 'judgment', p); p.hp = 0; p.inv = 0; die(g); }
}

function hurt(g, n, fromX) {
  const p = g.p;
  if (p.inv > 0 || p.dead) return;
  p.hp -= n; p.inv = 1.1; p.rope = null; p.pounce = null; p.cling = 0;
  p.vx = (p.x >= fromX ? 1 : -1) * 130; p.vy = -170;
  if (p.hp <= 0) die(g); else ev(g, 'hurt', p);
}
function die(g) {
  const p = g.p;
  if (p.dead) return;
  p.dead = true; p.deadT = 1.0; p.rope = null; p.pounce = null; p.cling = 0; g.deaths++;
  if (g.L.def.real) { p.deadT = 1e9; g.over = true; ev(g, 'die', p); ev(g, 'real', p); return; }   // nobody comes back from the last stage
  ev(g, 'die', p);
}
function respawn(g) {
  const p = g.p;
  p.x = g.check.x; p.y = g.check.y; p.vx = p.vy = 0; p.hp = p.maxHp; p.dead = false; p.inv = 1.4; p.rope = null; p.pounce = null; p.cling = 0;
  g.alarm = 0; g.slow = 0; g.shots.length = 0;
  if (g.L.def.timer) g.sale = Math.max(g.check.sale, 75);
  let F = form(g);
  if (blocked(g, p.x - F.w / 2, p.y - F.h, F.w, F.h, g.persona === 'psycho')) { g.persona = g.check.persona; F = form(g); }
  for (const e of g.ents) { if (e.see) e.see = 0; if (e.type === 'warden' || e.type === 'sentinel') e.cd = 0.6; }
  ev(g, 'respawn', p);
}

function shootAt(g, x, y, tx, ty, speed, friendly) {
  const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
  g.shots.push({ k: 'bolt', x, y, vx: dx / d * speed, vy: dy / d * speed, life: 2.6, friendly });
}
function damage(g, e, n, from) {
  e.hp -= n; e.flash = 0.14;
  if (e.hp <= 0) {
    e.dead = true; if (e.type === 'warden' || e.type === 'sentinel') g.kills++; ev(g, 'kill', e, { what: e.type });
    if (e.type === 'core') { g.open.add('core'); ev(g, 'core', e); if (!g.ents.some(o => o.type === 'exit')) g.done = true; }
  } else { ev(g, 'hit', e); if (e.see !== undefined) e.see = 1; if (e.type === 'warden' && from) e.dir = from.x >= e.x ? 1 : -1; }
}

function stepEnts(g, wdt) {
  const p = g.p, psy = g.persona === 'psycho', px = p.x, py = p.y - (psy ? 6 : 11), vis = !p.hidden && !p.dead, hot = g.alarm > 0;
  for (const e of g.ents) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= wdt;
    if (e.type === 'monument') { if (e.lit > 0 && (e.lit -= wdt) <= 0) e.roars = 0; continue; }
    if (e.type === 'warden') {
      if (e.stun > 0) { e.stun -= wdt; e.see = 0; e.vx = 0; }
      else {
        // a warden that can see your double watches it, and not you
        let qx = px, qy = py, qv = vis; const D = g.double; e.lured = false;
        if (D) { const ex = D.x - e.x, ey = D.y - 10 - e.y; if (Math.hypot(ex, ey) < (hot ? 190 : 128) && (hot || ex * e.dir > 0) && Math.abs(ey) < Math.abs(ex) * 0.9 + 26 && los(g, e.x, e.y - 6, D.x, D.y - 10, false)) { qx = D.x; qy = D.y - 10; qv = true; e.lured = true; } }
        const dx = qx - e.x, dy = qy - e.y, d = Math.hypot(dx, dy);
        const sees = qv && d < (hot ? 190 : 128) && (hot || dx * e.dir > 0) && Math.abs(dy) < Math.abs(dx) * 0.9 + 26 && los(g, e.x, e.y - 6, qx, qy, psy);
        e.see = sees ? Math.min(1, e.see + wdt * 2.2) : Math.max(0, e.see - wdt * 0.8);
        if (e.see >= 0.75) {
          e.dir = dx >= 0 ? 1 : -1; e.vx = 0; e.cd -= wdt;
          if (e.cd <= 0 && sees) { e.cd = 1.25; shootAt(g, e.x + e.dir * 6, e.y - 7, qx, qy, 150, false); ev(g, 'bolt', e); }
        } else { e.cd = 0.45; e.vx = e.dir * 26; }
      }
      e.vy = Math.min(e.vy + GRAV * wdt, MAXFALL);
      const b = { x: e.x - 5, y: e.y - 11, w: 10, h: 22 };
      if (e.vx) {
        const ox = b.x;
        if (moveX(g, b, e.vx * wdt, psy)) e.dir = -e.dir;
        else {
          const fx = Math.floor((e.vx > 0 ? b.x + b.w + 1 : b.x - 1) / T), fy = Math.floor((b.y + b.h + 2) / T);
          if (!solidTile(g, fx, fy, psy) && tileAt(g.L, fx, fy) !== C.ONEWAY) { b.x = ox; e.dir = -e.dir; }
          else for (const o of g.ents) if (o.type === 'gate' && o.vert && Math.abs(b.x + 5 - o.x) < 8 && b.y < o.y + o.h / 2 && b.y + b.h > o.y - o.h / 2) { b.x = ox; e.dir = -e.dir; break; }   // a warden never walks through a gate, lit or dark
        }
      }
      if (moveY(g, b, e.vy * wdt, psy, false, false) === 1) e.vy = 0;
      e.x = b.x + 5; e.y = b.y + 11;
      if (e.y > g.L.h * T + 40) e.dead = true;
    } else if (e.type === 'sentinel') {
      if (e.stun > 0) { e.stun -= wdt; e.see = 0; continue; }
      let hold = false;
      if (e.ally > 0) {
        e.ally -= wdt; e.cd -= wdt;
        let tgt = null, td = 170;
        for (const o of g.ents) if (!o.dead && o !== e && (o.type === 'warden' || (o.type === 'sentinel' && !(o.ally > 0)))) {
          const d = Math.hypot(o.x - e.x, o.y - e.y);
          if (d < td && los(g, e.x, e.y, o.x, o.y, psy)) { td = d; tgt = o; }
        }
        if (tgt && e.cd <= 0) { e.cd = 0.8; shootAt(g, e.x, e.y, tgt.x + (tgt.vx || 0) * td / 200, tgt.y, 200, true); ev(g, 'bolt', e); }
      } else {
        const d = Math.hypot(px - e.x, py - e.y), sees = vis && d < (hot ? 170 : 112) && los(g, e.x, e.y, px, py, psy);
        e.see = sees ? Math.min(1, e.see + wdt * 1.8) : Math.max(0, e.see - wdt * 0.7);
        if (e.see >= 0.8) { hold = true; e.cd -= wdt; if (e.cd <= 0 && sees) { e.cd = 1.5; shootAt(g, e.x, e.y, px, py, 135, false); ev(g, 'bolt', e); } }
        else e.cd = 0.5;
      }
      if (!hold) {
        e.u += e.du * wdt * e.speed / e.plen;
        if (e.u >= 1) { e.u = 1; e.du = -1; } else if (e.u <= 0) { e.u = 0; e.du = 1; }
        e.x = e.x0 + (e.x1 - e.x0) * e.u; e.y = e.y0 + (e.y1 - e.y0) * e.u;
      }
    } else if (e.type === 'eye') {
      if (e.off) continue;
      const dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy);
      let sees = false;
      if (vis && d < e.range) { const da = Math.atan2(dy, dx) - eyeAngle(g, e); sees = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) < e.fov && los(g, e.x, e.y, px, py, psy); }
      e.see = sees ? e.see + wdt : Math.max(0, e.see - wdt);
      if (e.see > 0.3) { if (g.alarm <= 0) { ev(g, 'alarm', e); g.alarms++; } g.alarm = 6; }
    } else if (e.type === 'gate') { if (e.off > 0) e.off = Math.max(0, e.off - wdt); }
  }
}

function stepShots(g, dt, wdt) {
  const p = g.p, psy = g.persona === 'psycho', F = psy ? JAG : HUM;
  for (let i = g.shots.length - 1; i >= 0; i--) {
    const s = g.shots[i], d = s.k === 'glass' ? dt : wdt;
    s.life -= d; if (s.k === 'glass') s.vy += 110 * d;
    s.x += s.vx * d; s.y += s.vy * d;
    let dead = s.life <= 0 || solidTile(g, Math.floor(s.x / T), Math.floor(s.y / T), psy);
    if (!dead && (s.k === 'glass' || s.friendly)) {
      for (const e of g.ents) {
        if (e.dead || Math.abs(s.x - e.x) > e.w / 2 + 3 || Math.abs(s.y - e.y) > e.h / 2 + 3) continue;
        if (e.type === 'asi') { if (s.k === 'glass') { ev(g, 'predicted', s); dead = true; } break; }
        if (e.type === 'warden' || (e.type === 'sentinel' && !(e.ally > 0)) || (s.k === 'glass' && ((e.type === 'eye' && !e.off) || (e.type === 'core' && coreOpen(g))))) { damage(g, e, 1, p); dead = true; break; }
      }
    } else if (!dead && !p.dead && Math.abs(s.x - p.x) < F.w / 2 + 2 && s.y > p.y - F.h - 2 && s.y < p.y + 2) { hurt(g, 1, s.x - s.vx); dead = true; }
    if (dead) { ev(g, 'spark', s, { glass: s.k === 'glass' }); g.shots.splice(i, 1); }
  }
}

function touch(g) {
  const p = g.p, psy = g.persona === 'psycho', F = psy ? JAG : HUM, b = box(p, F), L = g.L;
  if (b.y > L.h * T + 24) return die(g);
  for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 0.001) / T); ty++) for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 0.001) / T); tx++)
    if (tileAt(L, tx, ty) === C.SPIKE && b.y + b.h > ty * T + 7) { hurt(g, 1, p.x - p.face); return; }
  g.hint = -1;
  for (const e of g.ents) {
    if (e.dead) continue;
    if (e.type === 'hint') { if (Math.abs(e.x - p.x) < 88 && Math.abs(e.y - p.y) < 72 && (g.hint < 0 || e.i > g.hint)) g.hint = e.i; continue; }
    if (e.type === 'patron' && !e.said && e.far && Math.abs(e.x - p.x) < e.far) { e.said = true; ev(g, 'patron', e, { line: e.line }); }
    if (b.x >= e.x + e.w / 2 || b.x + b.w <= e.x - e.w / 2 || b.y >= e.y + e.h / 2 || b.y + b.h <= e.y - e.h / 2) continue;
    if (e.type === 'patron') { if (L.def.real && !e.through) { e.through = true; ev(g, 'picture', e); } continue; }
    if (e.type === 'asi') { if (p.pounce) { p.pounce = null; p.vx *= -0.5; p.vy = 140; ev(g, 'glassed', e); } continue; }
    if (e.type === 'mark') { e.dead = true; g.marks.push(e.id); ev(g, 'mark', e, { id: e.id, name: e.name }); continue; }
    if (e.type === 'elder') { if (!e.said) { e.said = true; g.said++; ev(g, 'talk', e, { name: e.name, role: e.role, lines: e.lines }); } continue; }
    // the jaguar can break a source with a pounce. It is loud: the alarm goes up.
    if (e.type === 'source') { if (p.pounce && e.alive) { e.alive = false; g.srcAlive[e.id] = false; g.alarm = 6; g.alarms++; p.pounce = null; p.vx *= -0.35; p.vy = -180; ev(g, 'smash', e); ev(g, 'alarm', e, {}); } continue; }
    if (e.type === 'thread') { e.dead = true; g.threads++; if (e.atlas) g.found.push(e.atlas.id); ev(g, 'thread', e, { atlas: e.atlas }); }
    else if (e.type === 'check') { if (g.check.e !== e) { g.check = { x: e.x, y: e.y + e.h / 2, persona: g.persona, e, sale: g.sale }; p.hp = p.maxHp; ev(g, 'check', e); } }
    else if (e.type === 'exit') {
      if (L.def.needs === 'evidence' && g.evidence < g.evidenceTotal) { if (g.t - g.denyT > 2) { g.denyT = g.t; ev(g, 'deny', e, { why: 'evidence' }); } }
      else { g.done = true; ev(g, 'exit', e); return; }
    }
    else if (e.type === 'gate') {
      if (!gateActive(g, e)) continue;
      const pv = p.pounce || p;
      if (e.vert) {
        const s = Math.abs(pv.vx) > 8 ? Math.sign(pv.vx) : (p.x < e.x ? 1 : -1), nx = e.x - s * (e.w / 2 + F.w / 2 + 1);
        if (!blocked(g, nx - F.w / 2, p.y - F.h, F.w, F.h, psy)) p.x = nx;
        p.pounce = null; hurt(g, 1, e.x); if (!p.dead) { p.vx = -s * 130; p.vy = Math.min(p.vy, -120); }
      } else {
        const s = Math.abs(pv.vy) > 8 ? Math.sign(pv.vy) : (p.y - F.h / 2 < e.y ? 1 : -1), ny = s > 0 ? e.y - e.h / 2 - 1 : e.y + e.h / 2 + F.h + 1;
        if (!blocked(g, p.x - F.w / 2, ny - F.h, F.w, F.h, psy)) p.y = ny;
        p.pounce = null; hurt(g, 1, p.x - p.face); if (!p.dead) p.vy = s > 0 ? -190 : 60;
      }
      return;
    }
    else if (e.type === 'warden' || e.type === 'sentinel') {
      if (p.pounce) { damage(g, e, 2, p); p.pounce = null; p.vx *= -0.35; p.vy = -210; p.airPounce = true; p.pounceCd = 0.25; }
      else if (!(e.ally > 0) && !(e.stun > 0)) hurt(g, 1, e.x);
    } else if (e.type === 'eye') { if (p.pounce && !e.off) damage(g, e, 1, p); }
    else if (e.type === 'core') { if (p.pounce && coreOpen(g)) { damage(g, e, 1, p); return; } else if (p.pounce) { p.pounce = null; p.vx *= -0.5; p.vy = -160; ev(g, 'deny', e); } }
  }
}
