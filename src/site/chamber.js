/* The hero chamber: a short reading about SyberLabs, performed in the middle of Plate I the way RISE's Stream view
   performs a text. Each line arrives word by word in its own caption, holds, and lifts away as the next arrives,
   and the reading loops.

   Only opacity and transform change (the words and captions are composited layers), so it costs the main thread a
   few DOM writes per line. It pauses off screen, in a background tab, and while the Atlas covers the page.
   Without JavaScript or under reduced motion the figure shows one line, still (the markup's own .is-still line).

   Markup (src/App.jsx Chamber): figure.home-chamber > .home-chamber__stage (captions are added here).
   mountChamber(figure, lines) -> { destroy() } */

const WORD = 105;      // ms between words arriving
const ARRIVE = 560;    // ms for one word to settle
const HOLD = 1250;     // ms a line holds once its last word has settled, plus 90ms per word to read it
const LEAVE = 520;     // ms for a line to lift away (the next one starts arriving as it does)
const GAP = 1400;      // ms of quiet before the reading starts over

const lineMs = words => (words - 1) * WORD + ARRIVE + HOLD + words * 90;

export function mountChamber(fig, lines) {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stage = fig?.querySelector('.home-chamber__stage');
  if (!stage || !lines?.length || reduced || !fig.animate) return { destroy() {} };

  const words = lines.map(l => l.split(' ').length);
  let i = 0, timer = 0, cur = null, visible = false, dead = false;
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

  // one step of the reading: show line i, schedule the next (or the restart)
  const step = () => {
    if (dead) return;
    if (i >= lines.length) {
      if (cur) { cur.classList.add('is-out'); const c = cur; setTimeout(() => c.remove(), LEAVE + 60); cur = null; }
      timer = setTimeout(() => { if (dead) return; i = 0; step(); }, GAP);
      return;
    }
    show(i);
    const ms = lineMs(words[i]); i++;
    timer = setTimeout(step, ms);
  };

  const run = () => { if (!dead && !paused()) step(); };
  // stop between lines and resume from the start of the line that was playing
  const halt = () => { clearTimeout(timer); timer = 0; i = Math.max(0, i - 1); };
  let running = false;
  const sync = () => {
    const want = !paused();
    if (want && !running) { running = true; fig.classList.add('is-live'); run(); }
    else if (!want && running) { running = false; halt(); }
  };

  fig.classList.add('is-js');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.25 }) : null;
  if (io) io.observe(fig); else { visible = true; sync(); }
  const mo = new MutationObserver(sync);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);

  return {
    destroy() {
      dead = true; clearTimeout(timer);
      io?.disconnect(); mo.disconnect(); document.removeEventListener('visibilitychange', sync);
      stage.querySelectorAll('.home-chamber__line:not(.is-still)').forEach(n => n.remove());
      fig.classList.remove('is-js', 'is-live');
    },
  };
}
