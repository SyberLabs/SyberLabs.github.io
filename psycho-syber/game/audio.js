// PSYCHO SYBER: sound, all of it synthesised in the browser with the Web Audio API. No samples are loaded.
// The music is slow and modal. One low note is held under everything, with a fifth over it and no third, so it
// is neither major nor minor. Over it a tune in A minor pentatonic, with one flattened second, moves in long
// notes. Two stems play it in step and changing form crossfades them, so the tune never restarts:
//   PSYCHO  the ground as a throat that opens and closes, a drum like a heart, seed rattles, a conch horn, and
//           the tune on two pipes a few cents apart with a fifth riding above them and a long dark echo
//   SYBER   the ground still and cold, a loom for a clock, small far lights, and the tune struck on stone
// Whistling jars (two tones a few hertz apart, one in each ear) come and go in both. Each stage sets its own
// pitch, pace and layers (SCENES). Every voice has something between 300 Hz and 2 kHz in it, because a phone's
// speaker gives little below that.
const NOTE = n => 110 * Math.pow(2, n / 12);                       // semitones above A2
const ROOT = [0, 0, 0, -2, 0, 0, 1, 0];                            // the ground under each bar: A A A G · A A B flat A
const TUNE = [[12, 0, 0, 0, 0, 0, 15, 0, 0, 0, 12, 0, 10, 0, 0, 0], [12, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 10, 0, 12, 0],
  [15, 0, 0, 0, 0, 0, 17, 0, 15, 0, 0, 0, 12, 0, 0, 0], [10, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 10, 0, 0, 7, 0],
  [19, 0, 0, 0, 0, 0, 17, 0, 0, 0, 15, 0, 17, 0, 0, 0], [19, 0, 0, 0, 0, 0, 0, 0, 22, 0, 19, 0, 17, 0, 15, 0],
  [13, 0, 0, 0, 0, 0, 0, 0, 13, 0, 12, 0, 10, 0, 0, 0], [12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 10, 0]];
const LIGHTS = [36, 39, 41, 43, 46, 48];                           // the pentatonic again, three octaves up
// bpm: the pace · tr: semitones from A · drums: 0 none, 1 the heart and the loom, 2 a beat on every count and
// iron struck · tune: how loud the tune is · jars: the whistling jars every other bar · dread: the last stage ·
// warm: a major third in the ground · hold: the ground alone
const SCENES = {
  title: { bpm: 66, tr: 0, drums: 1, tune: 1 }, steps: { bpm: 72, tr: 0, drums: 1, tune: 1 }, machu: { bpm: 76, tr: 5, drums: 1, tune: 1.1 },
  lines: { bpm: 68, tr: -5, drums: 1, tune: 1.1 }, works: { bpm: 84, tr: -2, drums: 2, tune: 0.8 }, record: { bpm: 60, tr: 3, drums: 0, tune: 1, jars: 1 },
  real: { bpm: 96, tr: 1, drums: 2, tune: 0, dread: 1 }, ship: { bpm: 56, tr: 7, drums: 0, tune: 1.1, warm: 1 }, end: { bpm: 60, tr: 1, drums: 0, tune: 0, hold: 1 },
  anomaly: { bpm: 62, tr: -7, drums: 1, tune: 0.7, dread: 1 },   // THE ANOMALOUS SYSTEM: the same score, a fourth lower and slower
};
const rnd = n => { let h = Math.imul(n | 0, 374761393) ^ 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function makeAudio() {
  const LEVEL = { syber: 1.15, psycho: 1 };
  const clips = new Map(), ready = new Map();   // the narrator's recordings, fetched and decoded once
  const SPOKEN = 0.17;   // the level every recording is brought to (the mean of its voiced part), whatever voice made it
  let voiceBus, speaking = 0, ducked = false, hold = 0;
  let ac = null, master, music, sfx, lp, stem = {}, noiseBuf, echo, echoS, timer = 0, stepN = 0, nextT = 0, lastKick = -1, muted = false, persona = 'syber', sc = SCENES.title, urge = 0;
  const step = () => 60 / (sc.bpm + (sc.dread ? urge * 34 : 0)) / 4;   // a sixteenth
  // On an iPhone, sound made this way is silenced by the ringer switch unless the page says it is playing audio.
  const session = () => { try { if (navigator.audioSession) navigator.audioSession.type = muted ? 'ambient' : 'playback'; } catch { /* not every browser has it */ } };
  const wake = () => { try { const r = ac.resume(); if (r && r.catch) r.catch(() => {}); } catch { /* an old browser's resume gives nothing back */ } };
  function start() {
    if (ac) { if (ac.state !== 'running') wake(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    session();
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ac.destination);
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.connect(master);
    music = ac.createGain(); music.gain.value = 0.9; music.connect(lp);
    sfx = ac.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    voiceBus = ac.createGain(); voiceBus.gain.value = 1; voiceBus.connect(master);
    for (const k of ['syber', 'psycho']) { stem[k] = ac.createGain(); stem[k].gain.value = k === persona ? LEVEL[k] : 0; stem[k].connect(music); }
    // each stem's echo: the jaguar's comes back darker each time and its length drifts, the weaver's comes back thinner
    const loop = (to, fbk, type, hz, drift) => {
      const d = ac.createDelay(1), f = ac.createBiquadFilter(), fb = ac.createGain(); d.delayTime.value = Math.min(0.95, step() * 3); f.type = type; f.frequency.value = hz; fb.gain.value = fbk;
      d.connect(f); f.connect(fb); fb.connect(d); f.connect(to);
      if (drift) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 0.23; lg.gain.value = drift; l.connect(lg); lg.connect(d.delayTime); l.start(); }
      return d;
    };
    echo = loop(stem.psycho, 0.46, 'lowpass', 1900, 0.004); echoS = loop(stem.syber, 0.33, 'highpass', 420, 0);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const hush = ac.createBufferSource(); hush.buffer = ac.createBuffer(1, 1, 22050); hush.connect(ac.destination); hush.start(0);   // the first sound has to start inside a tap
    if (ac.state !== 'running') wake();
    nextT = ac.currentTime + 0.08;
    timer = setInterval(schedule, 50);
  }
  // How much to turn a recording up or down so that its voiced part sits at SPOKEN, without its loudest moment clipping.
  const fit = buf => {
    const d = buf.getChannelData(0); let sq = 0, n = 0, peak = 0;
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; if (v > 0.012) { sq += v * v; n++; } }
    return n ? Math.min(SPOKEN / Math.sqrt(sq / n), 0.97 / peak, 6) : 1;
  };
  // The music's level: lower while the game is paused, and 9 dB lower under the narrator, which leaves the music
  // about 13 dB under the voice overall (measured with stand-in recordings; the README says how).
  const level = () => { if (ac) music.gain.setTargetAtTime(0.9 * (ducked ? 0.33 : 1) * (speaking ? 0.35 : 1), ac.currentTime, speaking ? 0.2 : 0.5); };
  function tone(type, f0, f1, dur, gain, dest, when = 0, attack = 0.004) {
    const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03);
    return { o, g };
  }
  function noise(dur, gain, type, f0, f1, dest, when = 0, q = 1) {
    const t = ac.currentTime + when, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.9); s.stop(t + dur + 0.03);
  }
  const through = (node, type, hz, dest) => { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = hz; node.disconnect(); node.connect(f); f.connect(dest); };
  // a level that rises, holds and falls, and a voice held at one pitch inside it
  const swell = (dest, t, dur, gain, up, down) => { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + up); g.gain.setValueAtTime(gain, Math.max(t + up, t + dur - down)); g.gain.linearRampToValueAtTime(0.0001, t + dur); g.connect(dest); return g; };
  const held = (type, hz, t, dur, into, lvl = 1, cents = 0) => { const o = ac.createOscillator(), v = ac.createGain(); o.type = type; o.frequency.setValueAtTime(hz, t); o.detune.value = cents; v.gain.value = lvl; o.connect(v); v.connect(into); o.start(t); o.stop(t + dur + 0.05); return o; };
  const side = (node, p) => { if (!ac.createStereoPanner) return node; const sp = ac.createStereoPanner(); sp.pan.value = p; node.connect(sp); return sp; };
  // The ground: one note for the whole bar, a fifth above it and no third.
  function ground(kind, root, t, dur) {
    const g = swell(stem[kind], t, dur + 0.7, 1, 0.6, 0.7), n = dur + 0.7;
    if (kind === 'psycho') {   // a throat: two reeds a few cents apart through a band that opens and closes
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(900 + urge * 900, t + dur * 0.5); f.frequency.linearRampToValueAtTime(300, t + n); f.connect(g);
      held('sawtooth', NOTE(root - 12), t, n, f, 0.17, -6); held('sawtooth', NOTE(root), t, n, f, 0.15, 7); held('sawtooth', NOTE(root + 7), t, n, f, 0.08, -4);
      if (sc.dread) held('sawtooth', NOTE(root + 6), t, n, f, 0.1, 5);
      held('sine', NOTE(root - 12), t, n, g, 0.055);
    } else {                   // still and cold: sines, and a slow tremor in the upper pair
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500; f.connect(g);
      held('sine', NOTE(root - 12), t, n, f, 0.055); held('triangle', NOTE(root), t, n, f, 0.06, 3);
      const up = ac.createGain(); up.gain.value = 0.04; up.connect(f); held('triangle', NOTE(root + 12), t, n, up, 1, 4); held('triangle', NOTE(root + 19), t, n, up, 0.7, -4);
      if (sc.dread) held('triangle', NOTE(root + 18), t, n, up, 0.8, 0);
      const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 0.4; lg.gain.value = 0.014; l.connect(lg); lg.connect(up.gain); l.start(t); l.stop(t + n + 0.1);
    }
    if (sc.warm) held('sine', NOTE(root + 16), t, n, g, 0.03);
  }
  // The tune for the jaguar: two pipes a few cents apart so they beat, a fifth riding above, breath over all of it.
  // Each note is reached from below and sags at its end.
  function pipe(n, t, dur, gain) {
    const f = NOTE(n), g = swell(stem.psycho, t, dur, gain, 0.09, Math.min(0.45, dur * 0.5)), send = ac.createGain(); send.gain.value = 0.5; g.connect(send); send.connect(echo);
    for (const [mult, cents, lvl, type] of [[1, -6, 1, 'sine'], [1, 7, 0.8, 'sine'], [2, 0, 0.3, 'triangle'], [1.5, 4, 0.34, 'sine'], [3, 0, 0.1, 'sine']]) {
      const o = held(type, f * mult * 0.945, t, dur, g, lvl, cents);
      o.frequency.exponentialRampToValueAtTime(f * mult, t + 0.11); o.frequency.setValueAtTime(f * mult, Math.max(t + 0.11, t + dur - 0.2)); o.frequency.linearRampToValueAtTime(f * mult * 0.972, t + dur);
    }
    const s = ac.createBufferSource(), bf = ac.createBiquadFilter(), bg = ac.createGain(); s.buffer = noiseBuf; s.loop = true; bf.type = 'bandpass'; bf.frequency.value = f * 2.2; bf.Q.value = 2.5; bg.gain.value = 0.55;
    s.connect(bf); bf.connect(bg); bg.connect(g); const air = ac.createBiquadFilter(), ag = ac.createGain(); air.type = 'bandpass'; air.frequency.value = 3100; air.Q.value = 1.4; ag.gain.value = 0.2; s.connect(air); air.connect(ag); ag.connect(g); s.start(t, rnd(stepN) * 0.9); s.stop(t + dur + 0.05);
  }
  // The tune for the weaver: a struck stone. Its upper tones are not whole multiples of the note, as a bell's are not.
  function stone(n, t, gain) {
    const f = NOTE(n);
    for (const [mult, lvl, ring] of [[1, 1, 1.7], [2.76, 0.5, 1], [5.4, 0.27, 0.4], [1.5, 0.22, 1.2]]) { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain * lvl, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + ring); g.connect(stem.syber); if (mult < 3) g.connect(echoS); held('sine', f * mult, t, ring, g); }
  }
  // A whistling jar: two tones a few hertz apart, one to each side, so the sound turns between the ears.
  function jar(root, t) {
    for (const [off, p] of [[0, -0.85], [6.5, 0.85]]) { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.034, t + 1.3); g.gain.linearRampToValueAtTime(0.0001, t + 3.4); held('sine', NOTE(root + 43) + off, t, 3.4, g); const out = side(g, p); out.connect(stem.psycho); out.connect(stem.syber); }
  }
  const heart = (w, strong) => { const P = stem.psycho; tone('sine', 96, 42, 0.32, strong ? 0.6 : 0.34, P, w); tone('triangle', 250, 96, 0.08, strong ? 0.34 : 0.18, P, w, 0.002); noise(0.05, strong ? 0.09 : 0.05, 'lowpass', 500, 200, P, w); };
  const loom = (w, strong) => { const S = stem.syber; noise(0.035, strong ? 0.24 : 0.1, 'bandpass', 1150, 900, S, w, 4); tone('sine', 420, 210, 0.05, strong ? 0.16 : 0.07, S, w, 0.001); if (strong) { tone('sine', 72, 44, 0.2, 0.32, S, w); tone('triangle', 180, 90, 0.06, 0.14, S, w, 0.002); } };
  const iron = (w, dest, gain) => { tone('sine', 1740, 1730, 0.28, gain, dest, w, 0.001); tone('sine', 2630, 2610, 0.18, gain * 0.6, dest, w, 0.001); noise(0.03, gain * 1.6, 'bandpass', 2500, 2500, dest, w, 2); };
  function schedule() {
    if (!ac || ac.state !== 'running') return;
    if (nextT < ac.currentTime - 0.5) nextT = ac.currentTime + 0.05;   // after a pause, pick the beat up from now
    while (nextT < ac.currentTime + 0.18) {
      const SD = step(), w = Math.max(0, nextT - ac.currentTime), t = ac.currentTime + w, s = stepN % 16, bar = Math.floor(stepN / 16) % 8, tr = sc.tr, root = ROOT[bar] + tr, S = stem.syber, P = stem.psycho, D = sc.drums;
      if (s === 0) { ground('psycho', root, t, SD * 16); ground('syber', root, t, SD * 16); }
      // time: a heart for the jaguar and a loom for the weaver
      if (D) {
        if (s === 0 || s === 8) { heart(w, true); loom(w, true); lastKick = nextT; }
        if (s === 3 || s === 11) heart(w, false);
        if (s === 6 || s === 10 || s === 11 || s === 14) loom(w, false);
        if (s % 8 >= 4) noise(0.06, 0.03 + (s % 4) * 0.022, 'bandpass', 3800, 3000, P, w + (s % 2 ? SD * 0.14 : 0), 1.2);   // seed rattles, rising into each beat
        if (D === 2) { if (s === 4 || s === 12) { heart(w, false); loom(w, true); iron(w, S, 0.05); iron(w, P, 0.03); } if (s % 2 === 1) noise(0.025, 0.035, 'highpass', 6500, 6500, S, w); }
      }
      // the tune, held until its next note
      const n = TUNE[bar][s];
      if (n && sc.tune) {
        let len = 1; while (len < 12 && !TUNE[(bar + ((s + len) >> 4)) % 8][(s + len) % 16]) len++;
        pipe(n + tr, t, Math.min(len * SD + 0.3, 2.8), 0.105 * sc.tune); stone(n + tr, t, 0.13 * sc.tune);
      }
      // a conch horn opens each half of the round
      if (s === 0 && bar % 4 === 0 && !sc.hold && !sc.dread) { const g = swell(P, t, 2.4, 0.07, 0.7, 1.1); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1000; f.connect(g); const o = held('sawtooth', NOTE(root + 12) * 0.955, t, 2.4, f, 1, 0); o.frequency.exponentialRampToValueAtTime(NOTE(root + 12), t + 0.5); held('sawtooth', NOTE(root + 19), t, 2.4, f, 0.25, 3); }
      if (s === 4 && !sc.hold && (bar === 2 || bar === 6 || (sc.jars && bar % 2 === 0))) jar(root, t);
      // small far lights for the weaver
      if (!sc.hold && !sc.dread && rnd(stepN * 7 + 3) < 0.11) { const g = ac.createGain(), k = LIGHTS[Math.floor(rnd(stepN * 13 + 1) * LIGHTS.length)]; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.038, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); held('sine', NOTE(k + tr), t, 0.7, g); const out = side(g, rnd(stepN * 5) * 1.6 - 0.8); out.connect(S); out.connect(echoS); }
      // the last stage: its ground note on every sixteenth, opening as the verdict nears, and a clash on each bar
      if (sc.dread) {
        for (const dest of [S, P]) through(tone('sawtooth', NOTE(root + 12), NOTE(root + 12), SD * 0.9, 0.085 + urge * 0.05, dest, w, 0.002).g, 'lowpass', 500 + urge * 2600, dest);
        if (s === 0) for (const dest of [S, P]) { tone('square', NOTE(root + 24), NOTE(root + 24), SD * 6, 0.028, dest, w, 0.02); tone('square', NOTE(root + 25), NOTE(root + 25), SD * 6, 0.028, dest, w, 0.02); }
      }
      nextT += SD; stepN++;
    }
  }
  const FX = {
    jump: p => p ? tone('sine', 220, 420, 0.09, 0.12, sfx) : tone('square', 300, 520, 0.07, 0.05, sfx),
    land: () => noise(0.07, 0.16, 'lowpass', 400, 120, sfx),
    lured: () => { tone('triangle', 392, 392, 0.09, 0.07, sfx); tone('triangle', 523, 540, 0.18, 0.07, sfx, 0.1); },   // a warden turns to the double: a question, a fourth up
    idle: () => tone('square', 150, 130, 0.1, 0.05, sfx),
    // THE ANOMALOUS SYSTEM: a copy taking hold, a body turned, the system waking, the cursor's click, the scan
    plant: () => { tone('sawtooth', 110, 220, 0.14, 0.09, sfx); noise(0.1, 0.1, 'bandpass', 600, 1800, sfx, 0.02, 3); },
    turned: () => [220, 330, 440].forEach((f, i) => tone('triangle', f, f * 0.99, 0.3, 0.09, sfx, i * 0.07)),
    wake: () => [0, 1, 2].forEach(i => tone('square', 330, 329, 0.12, 0.07, sfx, i * 0.22)),
    deleted: () => { tone('square', 1320, 1320, 0.03, 0.06, sfx); tone('square', 660, 660, 0.05, 0.06, sfx, 0.04); },
    click: () => { tone('square', 1320, 1320, 0.03, 0.09, sfx); noise(0.12, 0.16, 'lowpass', 900, 200, sfx, 0.03); },
    caught: () => [0, 1, 2].forEach(i => tone('triangle', 196, 190, 0.4, 0.12, sfx, i * 0.25)),
    restored: () => tone('sine', 880, 440, 0.3, 0.06, sfx),
    throw: () => noise(0.08, 0.12, 'bandpass', 2200, 5200, sfx, 0, 2),
    cord: () => { tone('sawtooth', 900, 1700, 0.06, 0.05, sfx); noise(0.03, 0.1, 'highpass', 3000, 3000, sfx, 0.05); },
    cordMiss: () => tone('sawtooth', 700, 380, 0.08, 0.03, sfx),
    cordOff: () => noise(0.03, 0.05, 'highpass', 2500, 2500, sfx),
    hack: () => [880, 1047, 1319, 1568].forEach((f, i) => tone('square', f, f, 0.06, 0.06, sfx, i * 0.05)),   // the short figures are minor or open too: A C E G
    scan: () => { tone('sine', 380, 1400, 0.4, 0.07, sfx); tone('sine', 570, 2100, 0.4, 0.03, sfx); },
    roar: () => { noise(0.8, 0.5, 'lowpass', 900, 160, sfx, 0, 2); tone('sawtooth', 95, 48, 0.8, 0.3, sfx); tone('sawtooth', 142, 70, 0.7, 0.14, sfx); },
    pounce: () => { noise(0.14, 0.2, 'highpass', 900, 3200, sfx); tone('sine', 520, 240, 0.13, 0.08, sfx); },
    cling: () => noise(0.04, 0.08, 'bandpass', 1200, 900, sfx),
    hit: () => { noise(0.05, 0.2, 'bandpass', 1400, 900, sfx); tone('square', 190, 150, 0.06, 0.07, sfx); },
    kill: () => { noise(0.25, 0.25, 'bandpass', 2400, 300, sfx); [660, 495, 330, 220].forEach((f, i) => tone('triangle', f, f * 0.9, 0.1, 0.09, sfx, i * 0.045)); },
    hurt: () => tone('sawtooth', 240, 100, 0.22, 0.16, sfx),
    die: () => { tone('sawtooth', 320, 50, 0.7, 0.2, sfx); noise(0.5, 0.2, 'lowpass', 1200, 100, sfx); },
    respawn: () => [330, 440, 660].forEach((f, i) => tone('sine', f, f, 0.14, 0.07, sfx, i * 0.07)),
    thread: () => { tone('sine', 1320, 1320, 0.1, 0.07, sfx); tone('sine', 1760, 1760, 0.16, 0.06, sfx, 0.06); },
    check: () => [440, 587, 659, 880].forEach((f, i) => tone('triangle', f, f, 0.26, 0.07, sfx, i * 0.08)),
    door: () => { tone('sawtooth', 70, 110, 0.45, 0.14, sfx); noise(0.4, 0.1, 'lowpass', 300, 900, sfx); },
    sale: () => [0, 1, 2].forEach(i => tone('triangle', 196, 190, 0.5, 0.12, sfx, i * 0.3)),
    alarm: () => [0, 1, 2, 3].forEach(i => tone('square', i % 2 ? 520 : 680, i % 2 ? 520 : 680, 0.12, 0.07, sfx, i * 0.14)),
    bolt: () => tone('square', 460, 200, 0.1, 0.035, sfx),
    crack: () => noise(0.06, 0.1, 'bandpass', 900, 600, sfx),
    crumble: () => noise(0.3, 0.2, 'lowpass', 700, 150, sfx),
    deny: () => tone('square', 150, 130, 0.1, 0.07, sfx),
    exit: () => [440, 523, 659, 784, 880].forEach((f, i) => tone('triangle', f, f, 0.4, 0.08, sfx, i * 0.12)),
    core: () => { noise(1.6, 0.5, 'lowpass', 4000, 80, sfx); [220, 262, 330, 392, 440, 523, 659].forEach((f, i) => tone('triangle', f, f, 0.6, 0.09, sfx, i * 0.12)); },
    word: () => tone('sine', 880, 880, 0.05, 0.02, sfx),
    predicted: () => { noise(0.05, 0.12, 'highpass', 4000, 6000, sfx); tone('square', 1320, 660, 0.08, 0.04, sfx); },
    tele: () => [0, 1, 2].forEach(i => tone('square', 880, 880, 0.09, 0.06, sfx, i * 0.2)),
    wall: () => { noise(0.5, 0.3, 'lowpass', 3000, 200, sfx); tone('sawtooth', 110, 55, 0.5, 0.2, sfx); },
    glassed: () => { tone('sine', 1760, 1320, 0.2, 0.08, sfx); noise(0.06, 0.15, 'highpass', 5000, 5000, sfx); },
    picture: () => noise(0.25, 0.12, 'bandpass', 3000, 800, sfx),
    judgment: () => { noise(2.2, 0.5, 'lowpass', 6000, 60, sfx); [55, 82, 110].forEach((f, i) => tone('sawtooth', f, f * 0.5, 2, 0.2, sfx, i * 0.05)); },
    mark: () => { tone('sine', 660, 660, 0.12, 0.07, sfx); tone('sine', 990, 990, 0.2, 0.06, sfx, 0.08); tone('sine', 1320, 1320, 0.3, 0.05, sfx, 0.16); },
  };
  return {
    start,
    get on() { return !!ac && ac.state === 'running'; },
    get muted() { return muted; },
    play(k, psy) { if (ac && ac.state === 'running' && FX[k]) { try { FX[k](psy); } catch { /* a dropped sound is not worth a broken frame */ } } },
    swap(to) {
      persona = to;
      if (!ac) return;
      const t = ac.currentTime;
      for (const k of ['syber', 'psycho']) { stem[k].gain.cancelScheduledValues(t); stem[k].gain.setValueAtTime(stem[k].gain.value, t); stem[k].gain.linearRampToValueAtTime(k === to ? LEVEL[k] : 0, t + 0.35); }
      if (ac.state === 'running') { noise(0.45, 0.22, 'bandpass', to === 'psycho' ? 300 : 5000, to === 'psycho' ? 5000 : 300, sfx, 0, 3); for (const n of (to === 'psycho' ? [12, 19, 24, 31] : [24, 19, 12, 7])) tone(to === 'psycho' ? 'triangle' : 'square', NOTE(n), NOTE(n), 0.3, to === 'psycho' ? 0.06 : 0.03, sfx); }
    },
    slow(on) { if (ac) lp.frequency.setTargetAtTime(on ? 520 : 18000, ac.currentTime, 0.12); },
    duck(on) { ducked = !!on; level(); },
    now() { return ac ? ac.currentTime : 0; },
    // The narrator. load() fetches and decodes a recording, has() says whether it is ready, and say() plays it and
    // returns the moment it starts on the sound clock, so the words on the picture can keep step with it.
    load(url) {
      if (!ac) return Promise.resolve(null);
      if (!clips.has(url)) clips.set(url, fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
        .then(buf => { ready.set(url, { buf, gain: fit(buf) }); return buf; }).catch(() => { clips.delete(url); return null; }));   // a failed fetch is tried again the next time the line comes up
      return clips.get(url);
    },
    has(url) { return ready.has(url); },
    say(url) {
      const c = ready.get(url); if (!ac || ac.state !== 'running' || !c) return null;
      const s = ac.createBufferSource(), g = ac.createGain(), at = ac.currentTime + 0.06; let on = true;
      const end = () => { if (on) { on = false; speaking = Math.max(0, speaking - 1); clearTimeout(hold); hold = setTimeout(level, 1600); } };   // the music stays down between the lines of one telling
      s.buffer = c.buf; g.gain.value = c.gain; s.connect(g); g.connect(voiceBus); s.onended = end; s.start(at); clearTimeout(hold); speaking++; level();
      return { at, dur: c.buf.duration, stop() { g.gain.setTargetAtTime(0, ac.currentTime, 0.025); try { s.stop(ac.currentTime + 0.14); } catch { /* it had ended */ } end(); } };   // cut off with a short fade, without a click
    },
    mute(m) { muted = m ?? !muted; session(); if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.9, ac.currentTime, 0.03); return muted; },
    suspend() { if (ac && ac.state === 'running') ac.suspend(); },
    resume() { if (ac && ac.state !== 'running') wake(); },
    // each stage has its own key, pace and layers; the last stage quickens as its verdict nears (urgency, 0 to 1)
    scene(id) { sc = SCENES[id] || SCENES.steps; urge = 0; if (ac) for (const d of [echo, echoS]) d.delayTime.setTargetAtTime(Math.min(0.95, step() * 3), ac.currentTime, 0.05); },
    urgency(u) { urge = Math.max(0, Math.min(1, u)); },
    // 1 on the kick, falling to 0 before the next; drives the pulse in the picture
    beat(now) { if (ac && ac.state === 'running' && lastKick >= 0) { const d = ac.currentTime - lastKick; return d >= 0 ? Math.exp(-d * 6) : 0; } return Math.exp(-((now % 1.2) * 6)); },
  };
}
