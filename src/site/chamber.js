/* The hero chamber: a short reading about SyberLabs, performed in the middle of Plate I the way RISE's Stream view
   performs a text. Each line arrives word by word in its own caption, holds, and lifts away as the next arrives;
   a progress rail and a running clock sit beneath, and the reading loops.

   Only opacity and transform change (the words and captions are composited layers), so it costs the main thread a
   few DOM writes per line. It pauses off screen, in a background tab, and while the Atlas covers the page.
   Without JavaScript or under reduced motion the figure shows one line, still (the markup's own .is-still line).

   Markup (src/App.jsx Chamber): figure.home-chamber > .home-chamber__stage (captions are added here) +
   figcaption.home-chamber__bar > .home-chamber__rail > i, .home-chamber__clock.
   mountChamber(figure, lines) -> { destroy() } */

const WORD = 105;      // ms between words arriving
const ARRIVE = 560;    // ms for one word to settle
const HOLD = 1250;     // ms a line holds once its last word has settled, plus 90ms per word to read it
const LEAVE = 520;     // ms for a line to lift away (the next one starts arriving as it does)
const GAP = 1400;      // ms of quiet before the reading starts over

const lineMs = words => (words - 1) * WORD + ARRIVE + HOLD + words * 90;
const clock = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function mountChamber(fig, lines) {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stage = fig?.querySelector('.home-chamber__stage'), rail = fig?.querySelector('.home-chamber__rail i'), out = fig?.querySelector('.home-chamber__clock');
  if (!stage || !lines?.length || reduced || !fig.animate) return { destroy() {} };

  const words = lines.map(l => l.split(' ').length);
  const starts = []; let total = 0;
  for (const n of words) { starts.push(total); total += lineMs(n); }

  let i = 0, t0 = 0, elapsed = 0, timer = 0, tick = 0, cur = null, visible = false, dead = false, railAnim = null;
  const paused = () => !visible || document.hidden || document.documentElement.classList.contains('sy-atlas-open');

  const caption = text => {
    const p = document.createElement('p');
    p.className = 'home-chamber__line';
    text.split(' ').forEach((w, k) => {
      const s = document.createElement('span');
      s.textContent = w; s.style.setProperty('--k', k);
      p.append(s, ' ');
    });
    return p;
  };

  const show = n => {
    const prev = cur;
    if (prev) { prev.classList.add('is-out'); setTimeout(() => prev.remove(), LEAVE + 60); }
    cur = caption(lines[n]);
    stage.append(cur);
    void cur.offsetWidth; // start from the hidden state
    cur.classList.add('is-in');
  };

  const setClock = () => { if (out) out.textContent = `${clock(Math.min(elapsed, total))} / ${clock(total)}`; };

  // one step of the reading: show line i, schedule the next (or the restart)
  const step = () => {
    if (dead) return;
    if (i >= lines.length) {
      if (cur) { cur.classList.add('is-out'); const c = cur; setTimeout(() => c.remove(), LEAVE + 60); cur = null; }
      timer = setTimeout(() => { if (dead) return; i = 0; elapsed = 0; startRail(); step(); }, GAP);
      return;
    }
    show(i);
    const ms = lineMs(words[i]); i++;
    timer = setTimeout(step, ms);
  };

  const startRail = () => {
    if (!rail) return;
    railAnim?.cancel();
    railAnim = rail.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: total, easing: 'linear', fill: 'forwards' });
  };

  const run = () => {
    if (dead || paused()) return;
    t0 = performance.now() - elapsed;
    if (railAnim) railAnim.play(); else startRail();
    tick = setInterval(() => { elapsed = performance.now() - t0; setClock(); }, 500);
    step();
  };
  const halt = () => {
    clearTimeout(timer); clearInterval(tick); timer = tick = 0;
    railAnim?.pause();
    // resume from the start of the line that was playing
    i = Math.max(0, i - 1); elapsed = starts[i] || 0;
    if (railAnim) railAnim.currentTime = elapsed;
    setClock();
  };
  let running = false;
  const sync = () => {
    const want = !paused();
    if (want && !running) { running = true; fig.classList.add('is-live'); run(); }
    else if (!want && running) { running = false; halt(); }
  };

  fig.classList.add('is-js');
  setClock();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.25 }) : null;
  if (io) io.observe(fig); else { visible = true; sync(); }
  const mo = new MutationObserver(sync);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);

  return {
    destroy() {
      dead = true; clearTimeout(timer); clearInterval(tick); railAnim?.cancel();
      io?.disconnect(); mo.disconnect(); document.removeEventListener('visibilitychange', sync);
      stage.querySelectorAll('.home-chamber__line:not(.is-still)').forEach(n => n.remove());
      fig.classList.remove('is-js', 'is-live');
    },
  };
}
