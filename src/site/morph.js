/* The hero line: Reliable agents. -> Creative agents. -> Creative humans. One word changes per step: the outgoing
   word scatters back into defocused light while the incoming one condenses out of it, letter by letter. It plays
   once and rests on "Creative humans." Line 1 is the adjective, line 2 the noun; the noun carries the spectrum
   (each letter paints its own slice of one gradient, so per-letter transforms never blank the word, which is what
   blanked the old gradient-on-parent text in WebKit), and once it rests the spectrum flows and a spark crosses it
   every few seconds.

   Markup (src/App.jsx Morph): .home-morph > .home-morph__slot (one per line) > .home-morph__w (one per word, the
   resting one marked .is-rest) > .home-morph__l (one per letter, with its scatter in --dx/--dy/--r). Without
   JavaScript or under reduced motion only the resting words show, as plain text. mountMorph(h1) -> { destroy() } */

const STEP_A = 2000;          // ms after the entrance: line 1 turns (Reliable -> Creative)
const STEP_B = 4100;          // ms after the entrance: line 2 turns (agents. -> humans.), after a longer hold on the pivot
const SWAP = 460;             // ms between the outgoing word starting to scatter and the incoming one condensing: a left-to-right wipe, not a jumble
const FLOW_MS = 16000, GLINT_MS = 7000, SWEEP = 0.22;

export function mountMorph(h1) {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!h1) return { destroy() {} };
  if (reduced) { h1.classList.add('is-static'); return { destroy() {} }; }
  const slots = [...h1.querySelectorAll('.home-morph__slot')];
  const words = slots.map(s => [...s.querySelectorAll('.home-morph__w')]); // [ [Reliable, Creative], [agents., humans.] ]
  if (slots.length !== 2 || words.some(w => w.length !== 2)) return { destroy() {} };
  const noun = slots[1];

  // each noun letter's offset within its word, so its slice of the spectrum lines up with its neighbours'
  const measure = () => {
    for (const w of words[1]) {
      w.style.setProperty('--mw', w.offsetWidth + 'px');
      for (const l of w.querySelectorAll('.home-morph__l')) l.style.setProperty('--mx', l.offsetLeft + 'px');
    }
  };
  h1.classList.add('is-live');
  measure();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
  ro?.observe(h1);

  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const show = (w, on) => { w.classList.toggle('is-in', on); w.classList.toggle('is-out', !on); };
  let active = words[1][0], t0 = 0, raf = 0, dead = false, lastWrite = 0, flowStart = 0;

  // the spectrum on the visible noun: flows continuously, and a spark sweeps it every GLINT_MS once the line rests
  let restedAt = Infinity;
  const frame = now => {
    raf = 0; if (dead) return;
    if (!document.hidden) {
      const W = active.offsetWidth || 1, t = now - flowStart;
      const flow = -((t % FLOW_MS) / FLOW_MS) * 2 * W;
      const g = now - restedAt, p = g < 0 ? 1 : (g % GLINT_MS) / GLINT_MS, sweeping = p < SWEEP + .01;
      const glint = p < SWEEP ? -W + 2 * W * (p / SWEEP) : W;
      if (sweeping || now - lastWrite > 31) {
        lastWrite = now;
        for (const l of active.querySelectorAll('.home-morph__l')) {
          const x = l.offsetLeft;
          l.style.backgroundPosition = `${(glint - x).toFixed(1)}px 0, ${(flow - x).toFixed(1)}px 0`;
        }
      }
    }
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (dead) return;
    measure();
    t0 = performance.now(); flowStart = t0;
    h1.classList.add('is-playing');
    show(words[0][0], true); show(words[1][0], true);                 // Reliable agents.
    at(STEP_A, () => show(words[0][0], false));                       // Reliable scatters...
    at(STEP_A + SWAP, () => show(words[0][1], true));                 // ...Creative condenses: Creative agents.
    at(STEP_B, () => show(words[1][0], false));                       // agents. scatters...
    at(STEP_B + SWAP, () => { active = words[1][1]; show(active, true); }); // ...humans. condenses: Creative humans.
    at(STEP_B + SWAP + 1300, () => { restedAt = performance.now(); h1.classList.add('is-rest'); });
    raf = requestAnimationFrame(frame);
  };
  // start once the webfonts are in (so the letters measure true) and the hero is on screen
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); (document.fonts?.ready || Promise.resolve()).then(() => at(250, start)); } }) : null;
  if (io) io.observe(h1); else start();

  return {
    destroy() {
      dead = true; timers.forEach(clearTimeout); if (raf) cancelAnimationFrame(raf);
      io?.disconnect(); ro?.disconnect();
      h1.classList.remove('is-live', 'is-playing', 'is-rest');
    },
  };
}
