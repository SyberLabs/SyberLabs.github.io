/* RISE Plus: "Hear the clock". Three public-domain lines on the page; pressing one has the browser's own
   speech engine read it, and each word appears on the word onset the engine reports (SpeechSynthesis
   `boundary` events), while the field behind the page pulses once per word (field.js listens for
   'sy-field-pulse'). The voice is chosen the way RISE's browser voice does: the page's language, a natural
   voice first, then Chrome's Google voice, then the one default voice.
   Nothing leaves the browser: no request is made, the text goes to the device's speech engine and nowhere else.
   Fallbacks, each said quietly in the status line: no speechSynthesis -> a timed reveal at reading pace;
   a voice that reports no word boundaries within 1.5 s -> the same timed reveal while it speaks.
   Under prefers-reduced-motion the words reveal and no pulse is sent. */
const host = document.querySelector('[data-hear]');
if (host) {
  const stage = host.querySelector('[data-words]'), status = host.querySelector('[data-status]');
  const buttons = [...host.querySelectorAll('.hear-line')];
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const synth = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window ? window.speechSynthesis : null;
  const BASE = status.textContent;
  const GOOGLE = /^Google\b/u;
  let run = null;

  const say = text => { status.textContent = text; };
  const pulse = k => { if (!reduced) dispatchEvent(new CustomEvent('sy-field-pulse', { detail: k })); };
  const words = text => { const out = [], re = /\S+/g; let m; while ((m = re.exec(text))) out.push({ w: m[0], at: m.index, el: null }); return out; };
  const indexAt = (list, ch) => { let i = -1; for (let j = 0; j < list.length; j++) { if (list[j].at <= ch) i = j; else break; } return i; };
  const layout = list => {
    stage.textContent = '';
    list.forEach((it, i) => { const s = document.createElement('span'); s.className = 'hear-w'; s.textContent = it.w; it.el = s; stage.appendChild(s); if (i < list.length - 1) stage.appendChild(document.createTextNode(' ')); });
  };
  const show = (list, i) => {
    for (let j = 0; j <= i; j++) { list[j].el.classList.add('is-on'); list[j].el.classList.toggle('is-now', j === i); }
    // a long word is a longer syllable: a slightly stronger pulse
    pulse(0.75 + Math.min(0.35, list[i].w.length / 24));
  };

  // RISE's rule (src/live/voices/browser.js chooseVoice): the page's language only, natural voices first, then Google, then the one default.
  function chooseVoice(voices, lang) {
    const tag = v => String(v || '').replace(/_/g, '-').toLowerCase(), wanted = tag(lang), base = wanted.split('-')[0];
    const exact = voices.filter(v => tag(v.lang) === wanted);
    const same = exact.length ? exact : voices.filter(v => tag(v.lang).split('-')[0] === base);
    const natural = same.filter(v => /\(Natural\)/u.test(v.name));
    if (natural.length) return natural.find(v => !/Multilingual/u.test(v.name)) || natural[0];
    const google = same.find(v => GOOGLE.test(v.name));
    if (google) return google;
    const defaults = same.filter(v => v.default === true);
    return defaults.length === 1 ? defaults[0] : null;
  }
  // voices load late in some browsers: wait for voiceschanged, at most 1.5 s
  const voices = () => new Promise(resolve => {
    const now = synth.getVoices(); if (now.length) return resolve(now);
    let t = 0; const done = () => { clearTimeout(t); synth.removeEventListener('voiceschanged', done); resolve(synth.getVoices()); };
    synth.addEventListener('voiceschanged', done, { once: true }); t = setTimeout(done, 1500);
  });

  // timed reveal at about 170 words a minute, a breath at punctuation
  function timed(list, from, onDone) {
    let i = from;
    const step = () => {
      if (!run) return;
      if (i >= list.length) { onDone(); return; }
      show(list, i);
      const d = 185 + 42 * list[i].w.length + (/[,;:.!?]$/.test(list[i].w) ? 240 : 0);
      i++; run.timer = setTimeout(step, d);
    };
    step();
  }

  function stop() {
    if (!run) return;
    const r = run; run = null;
    clearTimeout(r.timer); clearTimeout(r.watchdog);
    if (synth && r.utter) synth.cancel();
    r.list.forEach(x => { x.el.classList.add('is-on'); x.el.classList.remove('is-now'); });
    host.classList.remove('is-speaking');
    buttons.forEach(b => b.setAttribute('aria-pressed', 'false'));
    say(r.note || BASE);
  }

  async function play(button) {
    const was = run && run.button === button;
    stop();
    if (was) return;
    const text = button.dataset.text || button.textContent.trim();
    const list = words(text);
    layout(list);
    host.classList.add('is-speaking');
    button.setAttribute('aria-pressed', 'true');
    const r = run = { button, list, timer: 0, watchdog: 0, utter: null, note: '' };
    const finish = () => { if (run === r) { r.note = r.note || BASE; stop(); } };
    if (!synth) {
      r.note = 'No voice available here, so the words are paced by a timer at reading speed. Plus uses a premium ElevenLabs voice rendered once; same clock.';
      say('No voice available here; words paced by a timer.');
      timed(list, 0, finish);
      return;
    }
    const voice = chooseVoice(await voices(), document.documentElement.lang || 'en');
    if (run !== r) return;
    const u = r.utter = new SpeechSynthesisUtterance(text);
    u.lang = document.documentElement.lang || 'en'; u.rate = 0.95;
    if (voice) u.voice = voice;
    let heard = false, i = -1, fallback = false;
    say(`Speaking with ${voice ? voice.name : 'the browser’s default voice'}, on your device.`);
    u.onboundary = e => {
      if (e.name && e.name !== 'word') return;
      heard = true; clearTimeout(r.watchdog);
      if (fallback) return;
      const idx = indexAt(list, e.charIndex);
      if (idx > i) { i = idx; show(list, i); }
    };
    u.onend = finish;
    u.onerror = e => {
      if (run !== r) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return finish();
      if (!heard && !fallback) { r.note = 'No voice available here, so the words were paced by a timer. Plus uses a premium ElevenLabs voice rendered once; same clock.'; say('No voice available here; words paced by a timer.'); fallback = true; timed(list, i + 1, finish); }
      else finish();
    };
    // a voice that reports no word boundaries (network voices do not): pace the words by a timer while it speaks
    r.watchdog = setTimeout(() => {
      if (run !== r || heard) return;
      fallback = true;
      say(`${voice ? voice.name : 'This voice'} reports no word marks here; words paced by a timer while it speaks.`);
      timed(list, i + 1, () => { if (run !== r) return; if (!synth.speaking) finish(); else r.timer = setTimeout(() => finish(), 1500); });
    }, 1500);
    synth.cancel();
    synth.speak(u);
  }

  buttons.forEach(b => { b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => play(b)); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  addEventListener('pagehide', () => { stop(); if (synth) synth.cancel(); });
  host.classList.add('is-ready');
  if (!synth) host.classList.add('is-silent');
}
