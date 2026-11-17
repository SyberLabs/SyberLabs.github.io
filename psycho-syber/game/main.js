// PSYCHO SYBER: the page's game loop. sim.js decides what happens, render.js draws it twice (one look per form),
// post.js puts it on screen, audio.js plays it. This file wires them to the keyboard, the mouse and the page.
import { STAGES, ATLAS } from './levels.js';
import { newGame, step, T } from './sim.js';
import { VW, VH, buildTiles, drawFrame, makeFx, feed, stepFx } from './render.js';
import { makePost } from './post.js';
import { makeAudio } from './audio.js';

const $ = id => document.getElementById(id);
const stage = $('ps-stage'), view = $('ps-view'), hud = $('ps-hud'), hintEl = $('ps-hint'), rsvpEl = $('ps-rsvp'), toastEl = $('ps-toast');
const panels = { title: $('ps-title'), card: $('ps-card'), pause: $('ps-pause'), end: $('ps-end') };
const frames = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = VW; c.height = VH; return c; });
const ctxs = frames.map(c => c.getContext('2d', { alpha: false }));
const post = makePost(view), audio = makeAudio();
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0;
const DT = 1 / 60, KEY = 'psycho-syber.stage';
const store = { get() { try { return Math.min(STAGES.length - 1, Math.max(0, parseInt(localStorage.getItem(KEY) || '0', 10) || 0)); } catch { return 0; } }, set(i) { try { if (i > this.get()) localStorage.setItem(KEY, String(i)); } catch { /* private window: progress is not kept */ } } };

let state = 'title', si = 0, g = null, tiles = null, fx = makeFx(), cam = { x: 0, y: 0 }, wipe = 1, t = 0, acc = 0, last = 0, hurtT = 0, toastT = 0, shown = {}, total = { time: 0, deaths: 0, threads: 0, of: 0 };
const keys = new Set(), mouse = { x: VW * 0.7, y: VH * 0.45, fire: false, alt: false };
let edge = {};   // presses since the last simulated step
let cardAt = 0;          // when the card appeared: a key or button still held from play must not answer it
const go = fn => { $('ps-card-go').onclick = () => { if (performance.now() - cardAt > 700) fn(); }; };
let wipeHold = null;   // the tests can hold the change of form half done, to photograph both looks at once

function load(i, persona) {
  si = i; g = newGame(STAGES[i]);
  if (persona) g.persona = persona;
  tiles = [buildTiles(g.L, 0), buildTiles(g.L, 1)];
  fx = makeFx(); wipe = 1; acc = 0; edge = {}; shown = {};
  cam.x = clamp(g.p.x - VW / 2, 0, g.L.w * T - VW); cam.y = clamp(g.p.y - VH * 0.62, 0, g.L.h * T - VH);
  skin(g.persona);
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function skin(persona) { stage.classList.toggle('is-psycho', persona === 'psycho'); stage.classList.toggle('is-syber', persona !== 'psycho'); audio.swap(persona); }
function show(name) { for (const k in panels) panels[k].hidden = k !== name; hud.hidden = !(state === 'play' || state === 'pause'); stage.classList.toggle('is-playing', state === 'play'); if (state !== 'play') { toastT = 0; toastEl.classList.remove('is-on'); hintEl.classList.remove('is-on'); shown.hint = ''; } }
function toast(text) { toastEl.textContent = text; toastEl.classList.add('is-on'); toastT = 3.6; }

// ---------------------------------------------------------------- words, one at a time, as RISE shows them
let rsvpTimer = 0;
function rsvp(lines, done) {
  clearTimeout(rsvpTimer);
  const words = []; for (const l of lines) { const w = l.split(' '); w.forEach((x, i) => words.push([x, i === w.length - 1])); }
  let i = 0;
  const next = () => {
    if (i >= words.length) { rsvpEl.hidden = true; rsvpEl.textContent = ''; if (done) done(); return; }
    const [w, end] = words[i++], k = Math.min(w.length - 1, Math.max(0, Math.floor((w.replace(/[.,!?:]/g, '').length - 1) * 0.36)));
    rsvpEl.hidden = false; rsvpEl.replaceChildren(span(w.slice(0, k)), el('b', w[k]), span(w.slice(k + 1)));
    audio.play('word');
    rsvpTimer = setTimeout(next, calm ? 420 : 210 + w.length * 22 + (end ? 380 : 0));
  };
  next();
}
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
const span = text => el('span', text);
function stopRsvp() { clearTimeout(rsvpTimer); rsvpEl.hidden = true; }

// ---------------------------------------------------------------- flow
function toTitle() { state = 'title'; load(0); show('title'); const c = store.get(); $('ps-continue').hidden = c < 1; if (c >= 1) $('ps-continue').textContent = `Continue at ${STAGES[c].name}`; }
function begin(i) {
  audio.start(); load(i); state = 'card';
  const d = STAGES[i];
  $('ps-card-kicker').textContent = `Stage ${i + 1} of ${STAGES.length}`;
  $('ps-card-title').textContent = d.name;
  $('ps-card-line').replaceChildren(el('b', d.project), document.createTextNode(' · ' + d.line));
  $('ps-card-stats').hidden = true; $('ps-card-atlas').hidden = true; $('ps-card-link').hidden = true; $('ps-card-go').textContent = 'Begin'; cardAt = 0; go(play);
  show('card'); rsvp(d.intro);
  view.focus({ preventScroll: true });
}
function play() { stopRsvp(); state = 'play'; show('play'); last = 0; audio.duck(false); view.focus({ preventScroll: true }); }
function clear() {
  state = 'card'; store.set(Math.min(si + 1, STAGES.length - 1));
  total.time += g.time; total.deaths += g.deaths; total.threads += g.threads; total.of += g.threadsTotal;
  audio.play('exit');
  const lastStage = si === STAGES.length - 1;
  $('ps-card-kicker').textContent = lastStage ? 'The last stage is done' : `Stage ${si + 1} of ${STAGES.length} done`;
  $('ps-card-title').textContent = STAGES[si].name;
  $('ps-card-line').replaceChildren(el('b', STAGES[si].project), document.createTextNode(' · ' + STAGES[si].line));
  const st = $('ps-card-stats'); st.hidden = false;
  const d = STAGES[si], marks = d.marks || 'Threads';
  st.replaceChildren(stat('Time', clock(g.time)), stat(marks, `${g.threads} of ${g.threadsTotal}`), stat('Falls', String(g.deaths)), ...(d.timer ? [stat('Evidence', `${g.evidence} of ${g.evidenceTotal}`), stat('Left on the sale', clock(g.sale))] : []));
  const at = $('ps-card-atlas'); at.hidden = !d.atlas;
  if (d.atlas) at.replaceChildren(...ATLAS.map(a => { const li = el('li', undefined, g.found.includes(a.id) ? 'is-found' : ''), link = el('a', a.name); link.href = `/lacuna/#${a.id}`; link.target = '_blank'; link.rel = 'noopener'; li.append(link); return li; }));
  const more = $('ps-card-link'); more.hidden = false; more.href = d.href; more.textContent = d.atlas ? 'Open the Lacuna Atlas' : `About ${d.project}`;
  $('ps-card-go').textContent = lastStage ? 'See the ending' : `Next: ${STAGES[si + 1].name}`;
  cardAt = performance.now(); go(lastStage ? ending : () => begin(si + 1));
  show('card'); $('ps-card-go').focus({ preventScroll: true });
}
function ending() {
  state = 'end'; show('none');   // the words first, alone on the picture; then the panel
  $('ps-end-stats').replaceChildren(stat('Time', clock(total.time)), stat('Threads and marks', `${total.threads} of ${total.of}`), stat('Falls', String(total.deaths)));
  rsvp(['The Approver is down.', 'A person approves now.', 'The evidence was delivered before the sale.', 'The story is invented.', 'The five projects are real.'], () => { if (state === 'end') { show('end'); $('ps-again').focus({ preventScroll: true }); } });
}
const stat = (k, v) => { const d = el('div'); d.append(el('dt', k), el('dd', v)); return d; };
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function pause(on) {
  if (on && state === 'play') { state = 'pause'; show('pause'); audio.duck(true); }
  else if (!on && state === 'pause') { state = 'play'; show('play'); audio.duck(false); last = 0; view.focus({ preventScroll: true }); }
}

// ---------------------------------------------------------------- input
const CODES = { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], jump: ['Space', 'KeyW', 'ArrowUp'] };
const held = name => CODES[name].some(c => keys.has(c));
addEventListener('keydown', e => {
  if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const c = e.code, live = state === 'play';
  if (live && (c === 'Space' || c.startsWith('Arrow'))) e.preventDefault();
  if (e.repeat) return;
  keys.add(c);
  if (state === 'title') {
    if (c === 'Enter') begin(0);
    else if (c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyQ') { audio.start(); g.persona = g.persona === 'psycho' ? 'syber' : 'psycho'; wipe = 0; skin(g.persona); }
    return;
  }
  if (state === 'card' && c === 'Enter') { e.preventDefault(); $('ps-card-go').click(); return; }
  if (state === 'end') { if ((c === 'Enter' || c === 'Escape') && panels.end.hidden) { stopRsvp(); show('end'); $('ps-again').focus({ preventScroll: true }); } return; }
  if (c === 'KeyM') { $('ps-mute').textContent = audio.mute() ? 'Sound off' : 'Sound on'; return; }
  if (c === 'Escape' || c === 'KeyP') { pause(state === 'play'); return; }
  if (!live) return;
  if (CODES.jump.includes(c)) edge.jumpP = true;
  if (c === 'Space') edge.spaceP = true;
  if (c === 'KeyE') edge.actP = true;
  if (c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyQ') edge.swapP = true;
  if (c === 'KeyR') { g.p.hp = 0; g.p.inv = 0; g.p.y = g.L.h * T + 200; }
  if (c === 'KeyF') { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen?.().catch(() => {}); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouse.fire = mouse.alt = false; pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(true); audio.suspend(); } else audio.resume(); });
function point(e) { const r = view.getBoundingClientRect(); mouse.x = clamp((e.clientX - r.left) / r.width, 0, 1) * VW; mouse.y = clamp((e.clientY - r.top) / r.height, 0, 1) * VH; }
view.addEventListener('pointermove', point);
view.addEventListener('pointerdown', e => {
  point(e); audio.start(); view.focus({ preventScroll: true });
  if (state !== 'play') return;
  e.preventDefault(); view.setPointerCapture?.(e.pointerId);
  if (e.button === 2) { mouse.alt = true; edge.altP = true; } else if (e.button === 0) { mouse.fire = true; edge.fireP = true; }
});
view.addEventListener('pointerup', e => { if (e.button === 2) mouse.alt = false; else if (e.button === 0) mouse.fire = false; });
view.addEventListener('pointercancel', () => { mouse.fire = mouse.alt = false; });
view.addEventListener('contextmenu', e => e.preventDefault());
$('ps-start').onclick = () => begin(0);
$('ps-continue').onclick = () => begin(store.get());
$('ps-resume').onclick = () => pause(false);
$('ps-restart').onclick = () => { begin(si); };
$('ps-quit').onclick = toTitle;
$('ps-again').onclick = () => { total = { time: 0, deaths: 0, threads: 0, of: 0 }; stopRsvp(); toTitle(); };
$('ps-mute').onclick = () => { audio.start(); $('ps-mute').textContent = audio.mute() ? 'Sound off' : 'Sound on'; };

// ---------------------------------------------------------------- the loop
function resize() {
  const r = view.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  const k = Math.max(1, Math.floor(Math.min(r.width * dpr / VW, r.height * dpr / VH)));
  if (view.width !== VW * k) { view.width = VW * k; view.height = VH * k; }
}
new ResizeObserver(resize).observe(view.parentElement);

function drain() {
  const psy = g.persona === 'psycho';
  for (const e of g.ev) {
    feed(fx, e, g); audio.play(e.k, psy);
    if (e.k === 'swap') { wipe = 0; skin(e.to); }
    else if (e.k === 'hurt' || e.k === 'die') hurtT = 0.5;
    else if (e.k === 'thread' && e.atlas) toast(`Atlas mark ${g.found.length} of ${ATLAS.length}: ${e.atlas.name}`);
    else if (e.k === 'hack' && e.what === 'lot') toast(e.gap ? `${e.name}. ${e.note}. Evidence ${g.evidence} of ${g.evidenceTotal}.` : `${e.name}. Its record is complete.`);
    else if (e.k === 'hack' && e.what === 'source' && e.trap) toast('That source fed nothing here. It was watched.');
    else if (e.k === 'deny' && e.why === 'evidence') toast(`This door takes the evidence when all ${g.evidenceTotal} gaps are found. You have ${g.evidence}.`);
    else if (e.k === 'sale') toast('The sale closed. You are back at the last standing stone.');
    else if (e.k === 'core') toast('The Approver is down. The door behind it is open.');
  }
  g.ev.length = 0;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = last ? Math.min(0.1, (now - last) / 1000) : DT; last = now; t += dt;
  if (!g) return;
  const p = g.p;
  if (state === 'play') {
    acc += dt; let first = true;
    while (acc >= DT) {
      const inp = { left: held('left'), right: held('right'), up: held('up'), down: held('down'), jump: held('jump'), fire: mouse.fire, alt: mouse.alt, aimX: cam.x + mouse.x, aimY: cam.y + mouse.y };
      if (first) { Object.assign(inp, edge); edge = {}; first = false; }
      step(g, inp, DT); drain(); acc -= DT;
      if (g.done) { clear(); break; }
    }
    audio.slow(g.slow > 0);
  } else if (state === 'title') {
    p.x = 60 + (Math.sin(t * 0.12 - 1.5) * 0.5 + 0.5) * (g.L.w * T - VW - 120) + VW / 2; p.y = 320; p.run += dt * 60; p.onGround = true; g.wt += dt; g.t += dt;
  }
  stepFx(fx, dt);
  if (hurtT > 0) hurtT = Math.max(0, hurtT - dt);
  if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('is-on');
  if (wipeHold !== null) wipe = wipeHold; else if (wipe < 1) wipe = Math.min(1, wipe + dt / 0.55);
  // camera: follows the player and leans toward the cursor
  const psy = g.persona === 'psycho', live = state === 'play';
  const tx = clamp(p.x - VW / 2 + (live ? clamp((mouse.x - VW / 2) * 0.22, -46, 46) : 0), 0, g.L.w * T - VW), ty = clamp(p.y - VH * 0.62 + (live ? clamp((mouse.y - VH / 2) * 0.18, -24, 24) : 0), 0, g.L.h * T - VH);
  const k = state === 'title' ? 1 : 1 - Math.exp(-dt * 9);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  const sh = fx.shake > 0 && !calm ? fx.shake * 10 : 0, view2 = { x: cam.x + (Math.random() - 0.5) * sh, y: cam.y + (Math.random() - 0.5) * sh };
  if (psy && live) { fx.trail.push({ x: p.x, y: p.y, face: p.face, cling: p.cling, pounce: p.pounce, run: p.run, onGround: p.onGround, crouch: p.crouch }); if (fx.trail.length > 7) fx.trail.shift(); } else fx.trail.length = 0;
  if (state === 'title') p.dead = true;
  const need = wipe < 1 ? [true, true] : [!psy, psy];
  for (const i of [0, 1]) if (need[i]) drawFrame(ctxs[i], g, view2, t, i, tiles[i], fx);
  if (state === 'title') p.dead = false;
  post.present([need[0] ? frames[0] : null, need[1] ? frames[1] : null], { t, to: psy ? 1 : 0, wipe, trip: g.slow > 0 ? Math.min(1, g.slow) : 0, beat: audio.beat(t), hurt: hurtT * 2, calm, cx: (p.x - cam.x) / VW, cy: (p.y - 10 - cam.y) / VH });
  if (live || state === 'pause') paintHud();
}
function set(id, text) { if (shown[id] !== text) { shown[id] = text; $(id).textContent = text; } }
function paintHud() {
  const p = g.p, psy = g.persona === 'psycho', d = STAGES[si];
  set('ps-form', psy ? 'PSYCHO' : 'SYBER');
  const hp = '●'.repeat(Math.max(0, p.hp)) + '○'.repeat(Math.max(0, p.maxHp - p.hp)); set('ps-hp', hp);
  set('ps-stage-name', `${d.name} · ${d.project}`);
  set('ps-threads', `${g.threads}/${g.threadsTotal} ${(d.marks || 'threads').toLowerCase()}`);
  set('ps-time', clock(g.time));
  set('ps-a1', psy ? 'Click · pounce' : 'Click · glass   Hold · cord');
  set('ps-a2', psy ? (p.roarCd > 0 ? `E · roar ${Math.ceil(p.roarCd)}` : g.slow > 0 ? 'E · roar · slowed' : 'E · roar') : 'E · check');
  set('ps-a3', p.hidden ? 'Hidden' : g.alarm > 0 ? 'Alarm' : '');
  set('ps-sale', d.timer ? `Sale closes in ${clock(Math.ceil(g.sale))} · evidence ${g.evidence}/${g.evidenceTotal}` : '');
  if (d.timer) $('ps-sale').classList.toggle('is-low', g.sale < 30);
  const h = (g.hint >= 0 && g.L.hints[g.hint]) || '';
  if (shown.hint !== h) { shown.hint = h; hintEl.textContent = h; hintEl.classList.toggle('is-on', !!h); }
}

// A hook for the browser tests: read the game, start a stage, feed input.
window.__ps = { get g() { return g; }, get state() { return state; }, begin, play, STAGES, keys, mouse, get edge() { return edge; }, set edge(v) { edge = v; }, set wipe(v) { wipeHold = v; }, cam, webgl: post.webgl };
const q = new URLSearchParams(location.search);
toTitle(); resize();
if (q.has('stage')) { begin(clamp(parseInt(q.get('stage'), 10) - 1 || 0, 0, STAGES.length - 1)); if (q.has('go')) play(); if (q.get('form') === 'psycho') { g.persona = 'psycho'; skin('psycho'); } }
if (matchMedia('(hover: none) and (pointer: coarse)').matches) $('ps-touch').hidden = false;
requestAnimationFrame(frame);
