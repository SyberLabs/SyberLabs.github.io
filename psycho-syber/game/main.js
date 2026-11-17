// PSYCHO SYBER: the page's game loop. sim.js decides what happens, render.js draws it twice (one look per form),
// post.js puts it on screen, audio.js plays it. This file wires them to the keyboard, the mouse and the page.
import { STAGES, ATLAS, SHIP } from './levels.js?v=20261117f';
import { newGame, step, T } from './sim.js?v=20261117f';
import { VW, VH, buildTiles, drawFrame, makeFx, feed, stepFx } from './render.js?v=20261117f';
import { makePost } from './post.js?v=20261117f';
import { makeAudio } from './audio.js?v=20261117f';

const $ = id => document.getElementById(id);
const stage = $('ps-stage'), view = $('ps-view'), hud = $('ps-hud'), hintEl = $('ps-hint'), rsvpEl = $('ps-rsvp'), toastEl = $('ps-toast'), wakeEl = $('ps-wake'), wakeWord = $('ps-wake-word');
const panels = { title: $('ps-title'), card: $('ps-card'), pause: $('ps-pause'), end: $('ps-end') };
const frames = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = VW; c.height = VH; return c; });
const ctxs = frames.map(c => c.getContext('2d', { alpha: false }));
const post = makePost(view), audio = makeAudio();
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0;
const DT = 1 / 60, KEY = 'psycho-syber.stage', q = new URLSearchParams(location.search);
const store = { get() { try { return Math.min(STAGES.length - 1, Math.max(0, parseInt(localStorage.getItem(KEY) || '0', 10) || 0)); } catch { return 0; } }, set(i) { try { if (i > this.get()) localStorage.setItem(KEY, String(i)); } catch { /* private window: progress is not kept */ } } };

let state = 'title', si = 0, g = null, tiles = null, fx = makeFx(), cam = { x: 0, y: 0 }, wipe = 1, t = 0, acc = 0, last = 0, hurtT = 0, toastT = 0, shown = {}, total = { time: 0, deaths: 0, threads: 0, of: 0 };
const keys = new Set(), mouse = { x: VW * 0.7, y: VH * 0.45, fire: false, alt: false };
let edge = {};   // presses since the last simulated step
const said = {};        // messages shown only the first times
let secret = null;      // set while you are on the command ship: the stage to go back to
let atlas = new Set();  // the Atlas marks found, kept between sessions
try { atlas = new Set(JSON.parse(localStorage.getItem('psycho-syber.atlas') || '[]').filter(id => ATLAS.some(a => a.id === id))); } catch { /* storage is optional */ }
const saveAtlas = () => { try { localStorage.setItem('psycho-syber.atlas', JSON.stringify([...atlas])); } catch { /* optional */ } };
let gift = false;        // the three on the command ship give a fifth life, and it is kept
try { gift = localStorage.getItem('psycho-syber.ship') === '1'; } catch { /* storage is optional */ }
const metaCv = $('ps-meta-view'), metaCtx = metaCv.getContext('2d'); let metaT = 0;
let cardAt = 0;          // when the card appeared: a key or button still held from play must not answer it
const go = fn => { $('ps-card-go').onclick = () => { if (performance.now() - cardAt > 700) fn(); }; };
let wipeHold = null;   // the tests can hold the change of form half done, to photograph both looks at once

function load(i, persona, def) {
  si = i; g = newGame(def || STAGES[i]);
  if (persona) g.persona = persona;
  for (const e of g.ents) if (e.type === 'mark' && atlas.has(e.id)) e.dead = true;   // a mark found before stays found
  g.blind = atlas.size;                                                             // each is a place the Thousand Eyes has no record of
  if (gift) g.p.maxHp = g.p.hp = 5;
  tiles = [buildTiles(g.L, 0), buildTiles(g.L, 1)];
  fx = makeFx(); wipe = 1; acc = 0; edge = {}; shown = {};
  cam.x = clamp(g.p.x - VW / 2, 0, g.L.w * T - VW); cam.y = clamp(g.p.y - VH * 0.62, 0, g.L.h * T - VH);
  skin(g.persona);
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function skin(persona) { stage.classList.toggle('is-psycho', persona === 'psycho'); stage.classList.toggle('is-syber', persona !== 'psycho'); audio.swap(persona); }
function show(name) { for (const k in panels) panels[k].hidden = k !== name; hud.hidden = !(state === 'play' || state === 'pause'); stage.classList.toggle('is-playing', state === 'play'); paintPad(); if (state !== 'play') { toastT = 0; toastEl.classList.remove('is-on'); hintEl.classList.remove('is-on'); shown.hint = ''; } }
function toast(text) { if (g && g.L.def.real) return;   // in the last room the machine does the talking, inside the picture
  toastEl.textContent = text; toastEl.classList.add('is-on'); toastT = Math.max(3.6, text.split(' ').length * 0.34); }

// ---------------------------------------------------------------- words, one at a time, as RISE shows them
let rsvpTimer = 0, wpm = 220;
try { wpm = Math.min(480, Math.max(120, +localStorage.getItem('psycho-syber.wpm') || 220)); } catch { /* storage is optional */ }
function setWpm(v) { wpm = Math.min(480, Math.max(120, v)); try { localStorage.setItem('psycho-syber.wpm', String(wpm)); } catch { /* optional */ } paintPace(); }
function paintPace() { const n = $('ps-pace'); if (n) n.textContent = `Story pace: ${wpm} words a minute. [ and ] change it.`; }
function rsvp(lines, done, node = rsvpEl) {
  clearTimeout(rsvpTimer);
  const words = []; for (const l of lines) { const w = l.split(' '); w.forEach((x, i) => words.push([x, i === w.length - 1])); }
  let i = 0;
  const next = () => {
    if (i >= words.length) { node.hidden = true; node.textContent = ''; if (done) done(); return; }
    const [w, end] = words[i++], k = Math.min(w.length - 1, Math.max(0, Math.floor((w.replace(/[.,!?:]/g, '').length - 1) * 0.36)));
    node.hidden = false; node.replaceChildren(span(w.slice(0, k)), el('b', w[k]), span(w.slice(k + 1)));
    audio.play('word');
    rsvpTimer = setTimeout(next, (calm ? 420 : 210 + w.length * 22 + (end ? 380 : 0)) * 220 / wpm);
  };
  next();
}
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
const span = text => el('span', text);
function stopRsvp() { clearTimeout(rsvpTimer); rsvpEl.hidden = true; wakeWord.hidden = true; }
paintPace();

// ---------------------------------------------------------------- flow
// Which Atlas marks each stage holds, for the stage buttons on the title.
const MARKS = STAGES.map(d => newGame(d).ents.filter(e => e.type === 'mark').map(e => e.id));
function toTitle() {
  state = 'title'; load(0); show('title');
  const c = store.get(), pick = $('ps-pick');
  $('ps-continue').hidden = c < 1; if (c >= 1) $('ps-continue').textContent = `Continue at ${STAGES[c].name}`;
  pick.hidden = c < 1;   // once a stage is finished, every stage reached can be started from here
  if (c >= 1) pick.replaceChildren(...STAGES.map((d, i) => {
    const li = el('li'), b = el('button', String(i + 1), 'ps-pick__b'), ids = MARKS[i], got = ids.filter(id => atlas.has(id)).length, open = i <= c;
    b.type = 'button'; b.disabled = !open; b.title = open ? `${d.name}${ids.length ? `: ${got} of ${ids.length} Atlas marks found` : ''}` : 'Not reached yet'; b.setAttribute('aria-label', `Stage ${i + 1}. ${b.title}`);
    b.onclick = () => begin(i); li.append(b, el('span', ids.length ? `${got}/${ids.length}` : '', 'ps-pick__m')); return li;
  }));
}
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
  stopRsvp(); talkQ.length = 0; talking = false;
  if (secret) {   // the ship sets you down where it took you, with a fifth life
    const back = secret.from; secret = null;
    if (!gift) { gift = true; try { localStorage.setItem('psycho-syber.ship', '1'); } catch { /* optional */ } }
    begin(back); $('ps-card-kicker').textContent = 'The ship set you down where it took you. You carry a fifth life now.'; return;
  }
  state = 'card'; store.set(Math.min(si + 1, STAGES.length - 1));
  total.time += g.time; total.deaths += g.deaths; total.threads += g.threads; total.of += g.threadsTotal;
  audio.play('exit');
  const lastStage = si === STAGES.length - 1;
  $('ps-card-kicker').textContent = lastStage ? 'The last stage is done' : `Stage ${si + 1} of ${STAGES.length} done`;
  $('ps-card-title').textContent = STAGES[si].name;
  $('ps-card-line').replaceChildren(el('b', STAGES[si].project), document.createTextNode(' · ' + STAGES[si].line));
  const st = $('ps-card-stats'); st.hidden = false;
  const d = STAGES[si];
  st.replaceChildren(stat('Time', clock(g.time)), stat('Threads', `${g.threads} of ${g.threadsTotal}`), stat('Falls', String(g.deaths)), stat('Atlas marks', `${atlas.size} of ${ATLAS.length}`), ...(d.timer ? [stat('Evidence', `${g.evidence} of ${g.evidenceTotal}`), stat('Left on the sale', clock(g.sale))] : []));
  const at = $('ps-card-atlas'), lacuna = d.id === 'record'; at.hidden = !lacuna;
  if (lacuna) at.replaceChildren(...ATLAS.map(a => { const li = el('li', undefined, atlas.has(a.id) ? 'is-found' : ''), link = el('a', a.name); link.href = `/lacuna/#${a.id}`; link.target = '_blank'; link.rel = 'noopener'; li.append(link); return li; }));
  const more = $('ps-card-link'); more.hidden = false; more.href = d.href; more.textContent = lacuna ? 'Open the Lacuna Atlas' : `About ${d.project}`;
  $('ps-card-go').textContent = lastStage ? 'See the ending' : `Next: ${STAGES[si + 1].name}`;
  cardAt = performance.now(); go(lastStage ? realEnd : () => begin(si + 1));
  show('card'); $('ps-card-go').focus({ preventScroll: true });
}
// ---------------------------------------------------------------- the command ship
// The three speak in turn, one word at a time.
const talkQ = []; let talking = false;
function say(e) { talkQ.push(e); if (!talking) nextTalk(); }
function nextTalk() { const e = talkQ.shift(); if (!e) { talking = false; return; } talking = true; toast(`${e.name}, ${e.role}`); rsvp(e.lines, nextTalk); }
function abduct() {
  if (secret || state !== 'play') return;
  secret = { from: si, persona: g.persona }; state = 'cut'; show('none'); stage.classList.add('is-beam'); audio.play('exit');
  rsvp(['The carved head answers.', 'The ship comes down.'], () => {
    stage.classList.remove('is-beam'); load(secret.from, secret.persona, SHIP); state = 'play'; show('play'); last = 0;
    toast('The SyberLabs command ship, in another star system.'); view.focus({ preventScroll: true });
  });
}

// ---------------------------------------------------------------- the end of THE REAL BATTLE
// The picture splits into a thousand feeds of the room, the machine reads the run back while the picture falls
// into itself, and then the whole page goes dark and says what this is. Enter or Escape skips to the last panel.
const feedCv = [0, 1, 2, 3].map(() => { const c = document.createElement('canvas'); c.width = 240; c.height = 135; return c; }), feedCtx = feedCv.map(c => c.getContext('2d'));
let feedN = 0, metaTimers = [], pageTitle = document.title;
const later = (fn, ms) => { metaTimers.push(setTimeout(fn, ms)); };
const GRID = 0.62, GRID_END = GRID * 5 + 1.6;   // 1, 4, 16, 64, 256, then 1,024 held
function feedsOrTunnel(dt) {
  metaT += dt; const c2 = metaCtx, W = metaCv.width, H = metaCv.height;
  c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalAlpha = 1; c2.imageSmoothingEnabled = false;
  if (metaT >= GRID_END) return tunnel();
  if (feedN++ % 7 === 0) feedCtx[(feedN / 7 | 0) % 4].drawImage(view, 0, 0, 240, 135);   // four feeds, each a little behind the last
  const n = Math.min(32, 1 << Math.floor(metaT / GRID)), cw = W / n, ch = H / n, you = Math.floor(metaT * 3);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) c2.drawImage(feedCv[n === 1 ? ((feedN - 1) / 7 | 0) % 4 : (i * 7 + j * 13) % 4], Math.floor(i * cw), Math.floor(j * ch), Math.ceil(cw), Math.ceil(ch));
  c2.fillStyle = '#02070a'; for (let i = 1; i < n; i++) { c2.fillRect(Math.floor(i * cw), 0, 1, H); c2.fillRect(0, Math.floor(i * ch), W, 1); }
  if (n > 1) { c2.strokeStyle = '#ff5a4a'; c2.lineWidth = Math.max(1, W / 480); c2.strokeRect(Math.floor(((you * 5) % n) * cw) + 1, Math.floor(((you * 3) % n) * ch) + 1, Math.ceil(cw) - 2, Math.ceil(ch) - 2); }
  const count = n * n, line = `> ${count.toLocaleString('en-US')} ${count === 1 ? 'camera' : 'cameras'} on you`;
  if ($('ps-meta-lines').textContent !== line) { $('ps-meta-lines').textContent = line; audio.play('word'); }
}
function tunnel() {
  const c2 = metaCtx, W = metaCv.width, H = metaCv.height, mt = metaT - GRID_END, k = Math.min(1, mt / 6);
  c2.fillStyle = '#02070a'; c2.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) {
    const s = Math.pow(0.8 + 0.03 * Math.sin(mt * 1.1), i), a = i * (0.04 + 0.22 * k) * Math.sin(mt * 0.7);
    c2.setTransform(s * Math.cos(a), s * Math.sin(a), -s * Math.sin(a), s * Math.cos(a), W / 2, H / 2);
    c2.globalAlpha = 1 - i * 0.055; c2.drawImage(view, -W / 2, -H / 2, W, H);
  }
  c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalAlpha = 1;
}
const count = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
function meta() {
  if (state === 'meta') return;
  state = 'meta'; show('none'); stopRsvp(); talkQ.length = 0; talking = false;
  total.time += g.time; total.threads += g.threads;
  const box = $('ps-meta'), term = $('ps-meta-lines'), now = new Date(), two = n => String(n).padStart(2, '0');
  const lines = ['> run recorded', `> ${count(Math.round(g.time), 'second')}. ${count(g.swaps, 'change of form', 'changes of form')}. ${count(g.throws, 'throw')}. ${count(g.roars, 'roar')}.`,
    ...(g.orders ? [`> you obeyed ${g.obeyed} of ${count(g.orders, 'order')}`] : []),
    ...(atlas.size >= ATLAS.length ? [`> you found all ${ATLAS.length} places where my record goes quiet`, `> the verdict took ${ATLAS.length} seconds longer`] : atlas.size ? [`> you found ${atlas.size} of ${ATLAS.length} places where my record goes quiet`, `> the verdict took ${count(Math.min(21, atlas.size), 'second')} longer`] : [`> you found 0 of ${ATLAS.length} places where my record goes quiet`]),
    '> every move was predicted', `> your clock reads ${two(now.getHours())}:${two(now.getMinutes())}`, '> this window is not the arena'];
  const words = ['This is not a game.', 'This is real life.', 'You are in the arena.', 'Wake up.'];
  term.textContent = ''; box.hidden = false; metaCv.width = view.width; metaCv.height = view.height; metaT = 0; feedN = 0; metaTimers = [];
  if (calm) { metaCv.hidden = true; term.textContent = lines.join('\n'); later(() => rsvp(words, () => { box.hidden = true; realEnd(); }), 1200 + lines.length * 800); return; }
  metaCv.hidden = false;
  const wake = () => {   // the page itself goes dark, and each line builds a word at a time
    if (state !== 'meta') return;
    stage.classList.remove('is-breaking'); wakeEl.hidden = false; wakeWord.hidden = false; wakeWord.textContent = '';
    let li = 0, wi = 0;
    const word = () => {
      if (state !== 'meta') return;
      if (li >= words.length) { wakeEl.classList.add('is-out'); later(endMeta, 900); return; }
      const w = words[li].split(' '); wi++;
      wakeWord.textContent = w.slice(0, wi).join(' '); wakeWord.classList.toggle('is-last', li === words.length - 1); audio.play('word');
      if (wi < w.length) later(word, 330); else { document.title = words[li]; wi = 0; li++; later(() => { if (li < words.length) wakeWord.textContent = ''; word(); }, li === words.length ? 2300 : 1250); }
    };
    word();
  };
  let i = 0; const tick = () => { if (state !== 'meta') return; if (i === 0) { term.textContent = ''; stage.classList.add('is-breaking'); } if (i < lines.length) { term.textContent += (i ? '\n' : '') + lines[i++]; audio.play('word'); later(tick, 780); } else later(wake, 1500); };
  later(tick, GRID_END * 1000 + 300);
}
function endMeta() {
  if (state !== 'meta') return;
  for (const id of metaTimers) clearTimeout(id);
  metaTimers = []; stopRsvp(); stage.classList.remove('is-breaking'); wakeEl.hidden = true; wakeEl.classList.remove('is-out'); $('ps-meta').hidden = true; document.title = pageTitle;
  realEnd();
}
function realEnd() {
  state = 'end';
  $('ps-end-kicker').textContent = atlas.size >= ATLAS.length ? `You found all ${ATLAS.length} places the machine has no record of` : 'THE REAL BATTLE has no exit';
  $('ps-end-stats').replaceChildren(stat('Time', clock(total.time)), stat('Threads', String(total.threads)), stat('Atlas marks', `${atlas.size} of ${ATLAS.length}`));
  show('end'); $('ps-again').focus({ preventScroll: true });
}
const stat = (k, v) => { const d = el('div'); d.append(el('dt', k), el('dd', v)); return d; };
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function pause(on) {
  if (on && state === 'play') { state = 'pause'; show('pause'); audio.duck(true); }
  else if (!on && state === 'pause') { state = 'play'; show('play'); audio.duck(false); last = 0; view.focus({ preventScroll: true }); }
}

// ---------------------------------------------------------------- input
const CODES = { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], jump: ['Space', 'KeyW', 'ArrowUp'] };
const pad = { left: false, right: false, up: false, down: false, jump: false };   // what the touch controls hold
const held = name => pad[name] || CODES[name].some(c => keys.has(c));
addEventListener('keydown', e => {
  if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const c = e.code, live = state === 'play';
  if (live && (c === 'Space' || c.startsWith('Arrow'))) e.preventDefault();
  if (e.repeat) return;
  if (touch && !coarse && !q.has('touch')) setTouch(false);   // a laptop with a touch screen goes back to keys when one is pressed
  keys.add(c);
  if (state === 'title') {
    if (c === 'Enter') begin(0);
    else if (c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyQ') { audio.start(); g.persona = g.persona === 'psycho' ? 'syber' : 'psycho'; wipe = 0; skin(g.persona); }
    return;
  }
  if (c === 'BracketLeft' || c === 'BracketRight') { setWpm(wpm + (c === 'BracketRight' ? 40 : -40)); return; }
  if (state === 'card' && c === 'Enter') { e.preventDefault(); $('ps-card-go').click(); return; }
  if (state === 'meta') { if (c === 'Enter' || c === 'Escape') endMeta(); return; }
  if (state === 'cut') return;
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
addEventListener('blur', () => { keys.clear(); mouse.fire = mouse.alt = false; tied = false; for (const k in pad) pad[k] = false; pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(true); audio.suspend(); } else audio.resume(); });
function point(e) { const r = view.getBoundingClientRect(); mouse.x = clamp((e.clientX - r.left) / r.width, 0, 1) * VW; mouse.y = clamp((e.clientY - r.top) / r.height, 0, 1) * VH; }
view.addEventListener('pointermove', point);
view.addEventListener('pointerdown', e => {
  point(e); audio.start(); view.focus({ preventScroll: true });
  if (e.pointerType === 'touch' && !touch) setTouch(true);
  if (state !== 'play') return;
  e.preventDefault(); view.setPointerCapture?.(e.pointerId);
  if (e.pointerType === 'touch' && tied) { tied = false; mouse.fire = false; return; }   // a tap lets a tied cord go
  if (e.button === 2) { mouse.alt = true; edge.altP = true; } else if (e.button === 0) { mouse.fire = true; edge.fireP = true; }
});
view.addEventListener('pointerup', e => {
  if (e.button === 2) mouse.alt = false;
  else if (e.button === 0) { if (e.pointerType === 'touch' && g && g.p.rope && state === 'play') tied = true; else mouse.fire = false; }   // on touch the cord stays tied when the finger lifts
});
view.addEventListener('pointercancel', () => { mouse.fire = mouse.alt = false; tied = false; });

// ---------------------------------------------------------------- touch
// A stick under the left thumb, which starts wherever the thumb lands; Jump, Form and E under the right; and a tap
// on the picture to aim. A tap throws glass or pounces. A press that is held throws the cord, and on touch the
// cord stays tied when the finger lifts, so the thumb is free: the next tap, or Jump, lets it go.
const padEl = $('ps-pad'), stickEl = $('ps-stick'), ringEl = $('ps-stick-ring'), knobEl = $('ps-stick-knob');
const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
let touch = false, tied = false, stickId = null, stickAt = null;
function setTouch(on) { touch = on; stage.classList.toggle('is-touch', on); paintPad(); }
function paintPad() {
  padEl.hidden = !(touch && state === 'play');
  stage.classList.toggle('is-immersive', touch && state !== 'title');   // the page's header is back at the title
  if (padEl.hidden) { for (const k in pad) pad[k] = false; stickId = null; ringEl.classList.remove('is-on'); ringEl.style.transform = knobEl.style.transform = ''; }
}
function moveStick(e) {
  let dx = e.clientX - stickAt.x, dy = e.clientY - stickAt.y; const d = Math.hypot(dx, dy), R = 44;
  if (d > R) { stickAt.x += dx * (1 - R / d); stickAt.y += dy * (1 - R / d); dx *= R / d; dy *= R / d; }   // the ring follows a thumb that drags past its rim
  pad.left = dx < -12; pad.right = dx > 12; pad.up = dy < -24; pad.down = dy > 24;
  const r = stickEl.getBoundingClientRect();
  ringEl.classList.add('is-on'); ringEl.style.transform = `translate(${stickAt.x - r.left}px, ${stickAt.y - r.top}px)`; knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
}
stickEl.addEventListener('pointerdown', e => { if (stickId !== null) return; e.preventDefault(); audio.start(); stickId = e.pointerId; stickEl.setPointerCapture?.(e.pointerId); stickAt = { x: e.clientX, y: e.clientY }; moveStick(e); });
stickEl.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; pad.left = pad.right = pad.up = pad.down = false; ringEl.classList.remove('is-on'); ringEl.style.transform = knobEl.style.transform = ''; };
stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
function button(id, down, up) {
  const b = $(id), end = () => { b.classList.remove('is-down'); if (up) up(); };
  b.addEventListener('pointerdown', e => { e.preventDefault(); audio.start(); b.setPointerCapture?.(e.pointerId); b.classList.add('is-down'); down(); });
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('contextmenu', e => e.preventDefault());
}
button('ps-b-jump', () => { pad.jump = true; if (state === 'play') { edge.jumpP = true; edge.spaceP = true; } }, () => { pad.jump = false; });
button('ps-b-act', () => { if (state === 'play') edge.actP = true; });
button('ps-b-form', () => { if (state === 'play') edge.swapP = true; });
button('ps-b-pause', () => pause(state === 'play'));
wakeEl.addEventListener('pointerdown', () => endMeta());   // a tap skips the last words, as Enter does
panels.title.addEventListener('pointerdown', e => {   // on the title a tap on the picture changes form, as Shift does
  if (e.pointerType !== 'touch') return;
  if (!touch) setTouch(true);
  if (e.target.closest('button, a')) return;
  audio.start(); g.persona = g.persona === 'psycho' ? 'syber' : 'psycho'; wipe = 0; skin(g.persona);
});
// What the hints say for keys, said for touch.
const TOUCH_WORDS = [['A and D walk. W or Space jumps.', 'The stick on the left walks. JUMP jumps.'],
  ['Hold the mouse button on a ring or on stone to throw the cord. W reels in. Let go to drop.', 'Press and hold on a ring or on stone to throw the cord. It stays tied. Stick up reels in. Tap again to drop.'],
  ['Space lets go with a kick', 'JUMP lets go with a kick'], ['Click throws glass', 'A tap on the picture throws glass'], ['Hold S to hide', 'Hold the stick down to hide'],
  ['Shift changes you into the jaguar. Q does the same.', 'FORM changes you into the jaguar.'], ['hold W to climb. Space leaps off', 'hold the stick up to climb. JUMP leaps off'],
  ['Click to pounce', 'Tap the picture to pounce'], ['Shift back', 'FORM back'], ['Shift:', 'FORM:']];
const forTouch = s => { for (const [a, b] of TOUCH_WORDS) s = s.replace(a, b); return s; };
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
    if (e.k === 'swap' && e.double && (said.double = (said.double || 0) + 1) <= 2) toast('The form you left stays behind as a double. A Visitor who sees it watches it, and not you.');
    else if (e.k === 'hack' && e.what === 'pacer') toast(e.slow ? 'Pace set to slow. Every word stays lit longer.' : 'Pace set to fast.');
    else if (e.k === 'mark') { atlas.add(e.id); saveAtlas(); toast(`Atlas mark ${atlas.size} of ${ATLAS.length}: ${e.name}. Its entry is in the Lacuna Atlas.`); }
    else if (e.k === 'talk') say(e);
    else if (e.k === 'abduct') abduct();
    else if (e.k === 'smash') toast('The source is broken, and the alarm is up.');
    else if (e.k === 'patron') toast(e.line);
    else if (e.k === 'real') meta();
    else if (e.k === 'omen') toast(e.n === 1 ? 'The carved head opens its eyes. It is listening.' : e.n === 2 ? 'The carved head opens its mouth. Once more.' : 'The carved head answers.');
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
    if (tied && !g.p.rope) { tied = false; mouse.fire = false; }   // the cord came off some other way
  } else if (state === 'title') {
    p.x = 60 + (Math.sin(t * 0.12 - 1.5) * 0.5 + 0.5) * (g.L.w * T - VW - 120) + VW / 2; p.y = 320; p.run += dt * 60; p.onGround = true; g.wt += dt; g.wordT += dt; g.t += dt;
  }
  stepFx(fx, dt);
  if (hurtT > 0) hurtT = Math.max(0, hurtT - dt);
  if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('is-on');
  if (wipeHold !== null) wipe = wipeHold; else if (wipe < 1) wipe = Math.min(1, wipe + dt / 0.55);
  // camera: follows the player and leans toward the cursor
  const psy = g.persona === 'psycho', live = state === 'play';
  const lean = live && !touch;   // with a mouse the view leans toward the pointer; a finger has no resting place to lean to
  const tx = clamp(p.x - VW / 2 + (lean ? clamp((mouse.x - VW / 2) * 0.22, -46, 46) : live ? p.face * 26 : 0), 0, g.L.w * T - VW), ty = clamp(p.y - VH * 0.62 + (lean ? clamp((mouse.y - VH / 2) * 0.18, -24, 24) : 0), 0, g.L.h * T - VH);
  const k = state === 'title' ? 1 : 1 - Math.exp(-dt * 9);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  const sh = fx.shake > 0 && !calm ? fx.shake * 10 : 0, view2 = { x: cam.x + (Math.random() - 0.5) * sh, y: cam.y + (Math.random() - 0.5) * sh };
  if (psy && live) { fx.trail.push({ x: p.x, y: p.y, face: p.face, cling: p.cling, pounce: p.pounce, run: p.run, onGround: p.onGround, crouch: p.crouch }); if (fx.trail.length > 7) fx.trail.shift(); } else fx.trail.length = 0;
  if (state === 'title') p.dead = true;
  const need = wipe < 1 ? [true, true] : [!psy, psy];
  for (const i of [0, 1]) if (need[i]) drawFrame(ctxs[i], g, view2, t, i, tiles[i], fx);
  if (state === 'title') p.dead = false;
  post.present([need[0] ? frames[0] : null, need[1] ? frames[1] : null], { t, to: psy ? 1 : 0, wipe, trip: g.slow > 0 ? Math.min(1, g.slow) : 0, beat: audio.beat(t), hurt: hurtT * 2, calm, cx: (p.x - cam.x) / VW, cy: (p.y - 10 - cam.y) / VH });
  if (state === 'meta' && !calm) feedsOrTunnel(dt);
  if (live || state === 'pause') paintHud();
}
function set(id, text) { if (shown[id] !== text) { shown[id] = text; $(id).textContent = text; } }
function paintHud() {
  const p = g.p, psy = g.persona === 'psycho', d = g.L.def;
  set('ps-form', psy ? 'PSYCHO' : 'SYBER');
  const hp = '●'.repeat(Math.max(0, p.hp)) + '○'.repeat(Math.max(0, p.maxHp - p.hp)); set('ps-hp', hp);
  set('ps-stage-name', `${d.name} · ${d.project}`);
  set('ps-threads', `${g.threadsTotal ? `${g.threads}/${g.threadsTotal} threads · ` : ''}Atlas ${atlas.size}/${ATLAS.length}`);
  set('ps-time', clock(g.time));
  set('ps-a1', psy ? 'Click · pounce' : 'Click · glass   Hold · cord');
  set('ps-a2', psy ? (p.roarCd > 0 ? `E · roar ${Math.ceil(p.roarCd)}` : g.slow > 0 ? 'E · roar · slowed' : 'E · roar') : 'E · check');
  set('ps-a3', p.hidden ? 'Hidden' : g.alarm > 0 ? 'Alarm' : '');
  set('ps-sale', d.timer ? `Sale closes in ${clock(Math.ceil(g.sale))} · evidence ${g.evidence}/${g.evidenceTotal}` : '');
  if (d.timer) $('ps-sale').classList.toggle('is-low', g.sale < 30);
  const h0 = (g.hint >= 0 && g.L.hints[g.hint]) || '', h = touch ? forTouch(h0) : h0;
  if (shown.hint !== h) { shown.hint = h; hintEl.textContent = h; hintEl.classList.toggle('is-on', !!h); }
  if (touch) set('ps-b-act-t', psy ? (p.roarCd > 0 ? String(Math.ceil(p.roarCd)) : 'roar') : 'check');
}

// A hook for the browser tests: read the game, start a stage, feed input.
window.__ps = { get g() { return g; }, get state() { return state; }, begin, play, STAGES, atlas, endMeta, pad, get tied() { return tied; }, get touch() { return touch; }, keys, mouse, get edge() { return edge; }, set edge(v) { edge = v; }, set wipe(v) { wipeHold = v; }, cam, webgl: post.webgl };
toTitle(); resize();
if (q.has('stage')) { begin(clamp(parseInt(q.get('stage'), 10) - 1 || 0, 0, STAGES.length - 1)); if (q.has('go')) play(); if (q.get('form') === 'psycho') { g.persona = 'psycho'; skin('psycho'); } }
if (coarse || q.has('touch')) setTouch(true);   // ?touch shows the touch controls on any device
requestAnimationFrame(frame);
