// PSYCHO SYBER: sound, all of it synthesised in the browser with the Web Audio API. No samples are loaded.
// Two stems play in step from the first beat. SYBER: a kick with a click in it, a snare, hats, a bass, a plucked
// arpeggio and the tune plucked on glass. PSYCHO: a bombo drum, shakers and the same tune on a breathy pipe that
// echoes. Changing form crossfades them, so the tune never restarts. Each stage sets its own key, pace and
// layers (SCENES). The tune sits between 300 Hz and 2 kHz so that a phone's speaker carries it.
const NOTE = n => 110 * Math.pow(2, n / 12);                       // semitones above A2
const BARS = [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-2, 2, 5], [0, 3, 7], [3, 7, 10], [-2, 2, 5], [-5, -2, 2]];   // Am G F G · Am C G Em
const PIPE = [[12, 0, 0, 15, 0, 17, 0, 0, 19, 0, 17, 0, 15, 0, 0, 0], [14, 0, 0, 0, 10, 0, 14, 0, 17, 0, 0, 0, 14, 0, 0, 0],
  [12, 0, 0, 15, 0, 0, 12, 0, 8, 0, 0, 0, 12, 0, 15, 0], [14, 0, 0, 0, 17, 0, 0, 19, 0, 0, 17, 0, 14, 0, 0, 0],
  [24, 0, 22, 0, 19, 0, 0, 17, 0, 0, 19, 0, 0, 0, 15, 0], [15, 0, 0, 19, 0, 0, 22, 0, 19, 0, 0, 0, 15, 0, 0, 0],
  [14, 0, 0, 17, 0, 0, 14, 0, 10, 0, 0, 0, 14, 0, 0, 0], [7, 0, 0, 10, 0, 0, 14, 0, 0, 0, 12, 0, 10, 0, 7, 0]];
// bpm: the pace · tr: semitones above A minor · drums: 0 none, 1 the usual, 2 a kick on every beat ·
// tune: how loud the tune is · dread: the last stage's ground note, hammered
const SCENES = {
  title: { bpm: 92, tr: 0, drums: 1, tune: 1 }, steps: { bpm: 100, tr: 0, drums: 1, tune: 1 }, machu: { bpm: 104, tr: 5, drums: 1, tune: 1.1 },
  lines: { bpm: 96, tr: -5, drums: 1, tune: 1 }, works: { bpm: 112, tr: 0, drums: 2, tune: 0.8 }, record: { bpm: 84, tr: 3, drums: 0, tune: 1.1 },
  real: { bpm: 132, tr: 1, drums: 2, tune: 0, dread: 1 }, ship: { bpm: 76, tr: 7, drums: 0, tune: 1.2 }, end: { bpm: 60, tr: 1, drums: 0, tune: 0, drone: 1 },
};
export function makeAudio() {
  const LEVEL = { syber: 1.3, psycho: 1 };   // the weaver's stem is the thinner of the two
  let ac = null, master, music, sfx, lp, stem = {}, noiseBuf, echo, echoS, timer = 0, stepN = 0, nextT = 0, lastKick = -1, muted = false, persona = 'syber', sc = SCENES.title, urge = 0;
  const step = () => 60 / (sc.bpm + (sc.dread ? urge * 30 : 0)) / 4;   // a sixteenth
  // On an iPhone, sound made this way is silenced by the ringer switch unless the page says it is playing audio.
  const session = () => { try { if (navigator.audioSession) navigator.audioSession.type = muted ? 'ambient' : 'playback'; } catch { /* not every browser has it */ } };
  function start() {
    if (ac) { if (ac.state !== 'running') ac.resume().catch(() => {}); return; }
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
    for (const k of ['syber', 'psycho']) { stem[k] = ac.createGain(); stem[k].gain.value = k === persona ? LEVEL[k] : 0; stem[k].connect(music); }
    const loop = (to, fbk) => { const d = ac.createDelay(1), fb = ac.createGain(); d.delayTime.value = step() * 3; fb.gain.value = fbk; d.connect(fb); fb.connect(d); d.connect(to); return d; };
    echo = loop(stem.psycho, 0.42); echoS = loop(stem.syber, 0.3);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const hush = ac.createBufferSource(); hush.buffer = ac.createBuffer(1, 1, 22050); hush.connect(ac.destination); hush.start(0);   // the first sound has to start inside a tap
    if (ac.state !== 'running') ac.resume().catch(() => {});
    nextT = ac.currentTime + 0.08;
    timer = setInterval(schedule, 50);
  }
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
  function schedule() {
    if (!ac || ac.state !== 'running') return;
    if (nextT < ac.currentTime - 0.5) nextT = ac.currentTime + 0.05;   // after a pause, pick the beat up from now
    while (nextT < ac.currentTime + 0.18) {
      const SD = step(), w = nextT - ac.currentTime, s = stepN % 16, bar = Math.floor(stepN / 16) % 8, tr = sc.tr, ch = BARS[bar].map(n => n + tr), S = stem.syber, P = stem.psycho, D = sc.drums;
      // SYBER
      if (D && (s === 0 || s === 8 || (D === 2 ? s % 4 === 0 : s === 10 && bar % 2))) { tone('sine', 150, 46, 0.16, 0.5, S, w); tone('triangle', 900, 180, 0.03, 0.24, S, w, 0.001); if (s === 0 || s === 8) lastKick = nextT; }
      if (D && (s === 4 || s === 12)) { noise(0.11, 0.2, 'bandpass', 1900, 1400, S, w, 0.8); tone('triangle', 330, 180, 0.07, 0.1, S, w, 0.001); }
      if (D && s % 2 === 1) noise(0.03, D === 2 && s % 4 === 3 ? 0.13 : 0.075, 'highpass', 7000, 7000, S, w);
      if ([0, 3, 6, 8, 11, 14].includes(s) && !sc.drone) { through(tone('sawtooth', NOTE(ch[0] - 12), NOTE(ch[0] - 12), 0.17, 0.22, S, w).g, 'lowpass', 380, S); through(tone('square', NOTE(ch[0]), NOTE(ch[0]), 0.13, 0.05, S, w).g, 'lowpass', 1100, S); }
      if ((s % 2 === 0 || s === 7 || s === 13) && !sc.drone) { const n = ch[[0, 2, 1, 2, 0, 1, 2, 1][(s >> 1) % 8]] + 12 + (s > 9 && bar % 4 === 3 ? 12 : 0); through(tone('square', NOTE(n), NOTE(n), 0.12, sc.dread ? 0.07 : 0.12, S, w).g, 'lowpass', 3200, S); }
      if (s === 0) for (const n of ch) tone('sawtooth', NOTE(n + 12) * 1.003, NOTE(n + 12) * 1.003, SD * 16, 0.03, S, w, 0.3);
      // PSYCHO
      if (D && (s === 0 || s === 6 || s === 8 || s === 14)) { tone('sine', 110, 50, 0.24, 0.55, P, w); tone('triangle', 420, 150, 0.05, 0.16, P, w, 0.001); noise(0.05, 0.07, 'bandpass', 700, 300, P, w, 1.5); }
      if (!sc.drone) noise(0.045, s % 4 === 2 ? 0.1 : 0.045, 'bandpass', 5200, 4200, P, w + (s % 2 ? SD * 0.14 : 0), 2);
      if ((s === 0 || s === 8) && !sc.drone) { tone('sine', NOTE(ch[0] - 12), NOTE(ch[0] - 12), 0.4, 0.26, P, w); tone('triangle', NOTE(ch[0]), NOTE(ch[0]), 0.3, 0.09, P, w); }
      if (s === 0) for (const n of ch) { const p = tone('triangle', NOTE(n + 12), NOTE(n + 12) * 1.004, SD * 16, 0.065, P, w, 0.5); const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 0.7 + n * 0.03; lg.gain.value = 4; l.connect(lg); lg.connect(p.o.detune); l.start(ac.currentTime + w); l.stop(ac.currentTime + w + SD * 16 + 0.1); }
      // the tune, an octave above where it is written: a pipe for the jaguar, plucked glass for the weaver
      const pn = PIPE[bar][s];
      if (pn && sc.tune) {
        const t = ac.currentTime + w, dur = SD * 3.2, f = NOTE(pn + 12 + tr), o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
        o.type = 'sine'; o2.type = 'triangle'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.06); o2.frequency.value = f * 2;
        v.frequency.value = 5.5; vg.gain.value = 6; v.connect(vg); vg.connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.21 * sc.tune, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const g2 = ac.createGain(); g2.gain.value = 0.32; o2.connect(g2); g2.connect(g); o.connect(g); g.connect(P); g.connect(echo);
        for (const x of [o, o2, v]) { x.start(t); x.stop(t + dur + 0.05); }
        noise(0.09, 0.03, 'bandpass', f * 2, f * 1.5, P, w, 3);
        const k = tone('triangle', f, f, 0.36, 0.17 * sc.tune, S, w, 0.003); k.g.connect(echoS); tone('sine', f * 2, f * 2, 0.22, 0.07 * sc.tune, S, w, 0.003); tone('square', f * 3, f * 3, 0.05, 0.02 * sc.tune, S, w, 0.002);
      }
      // the last stage: its ground note on every sixteenth, opening as the verdict nears, and a clash on each bar
      if (sc.dread) {
        for (const dest of [S, P]) through(tone('sawtooth', NOTE(ch[0]), NOTE(ch[0]), SD * 0.9, 0.09 + urge * 0.05, dest, w, 0.002).g, 'lowpass', 500 + urge * 2600, dest);
        if (s === 0) for (const dest of [S, P]) { tone('square', NOTE(ch[0] + 24), NOTE(ch[0] + 24), SD * 6, 0.03, dest, w, 0.02); tone('square', NOTE(ch[0] + 25), NOTE(ch[0] + 25), SD * 6, 0.03, dest, w, 0.02); }
      }
      // after the verdict: one low note held, and its fifth
      if (sc.drone && s === 0) for (const dest of [S, P]) { tone('sawtooth', NOTE(tr), NOTE(tr), SD * 16, 0.07, dest, w, 0.6); tone('sine', NOTE(tr + 12), NOTE(tr + 12), SD * 16, 0.08, dest, w, 0.9); tone('sine', NOTE(tr + 19), NOTE(tr + 19) * 0.99, SD * 16, 0.06, dest, w, 1.2); }
      nextT += SD; stepN++;
    }
  }
  const FX = {
    jump: p => p ? tone('sine', 220, 420, 0.09, 0.12, sfx) : tone('square', 300, 520, 0.07, 0.05, sfx),
    land: () => noise(0.07, 0.16, 'lowpass', 400, 120, sfx),
    throw: () => noise(0.08, 0.12, 'bandpass', 2200, 5200, sfx, 0, 2),
    cord: () => { tone('sawtooth', 900, 1700, 0.06, 0.05, sfx); noise(0.03, 0.1, 'highpass', 3000, 3000, sfx, 0.05); },
    cordMiss: () => tone('sawtooth', 700, 380, 0.08, 0.03, sfx),
    cordOff: () => noise(0.03, 0.05, 'highpass', 2500, 2500, sfx),
    hack: () => [880, 1108, 1318, 1760].forEach((f, i) => tone('square', f, f, 0.06, 0.06, sfx, i * 0.05)),
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
    check: () => [440, 554, 659, 880].forEach((f, i) => tone('triangle', f, f, 0.22, 0.07, sfx, i * 0.06)),
    door: () => { tone('sawtooth', 70, 110, 0.45, 0.14, sfx); noise(0.4, 0.1, 'lowpass', 300, 900, sfx); },
    sale: () => [0, 1, 2].forEach(i => tone('triangle', 196, 190, 0.5, 0.12, sfx, i * 0.3)),
    alarm: () => [0, 1, 2, 3].forEach(i => tone('square', i % 2 ? 520 : 680, i % 2 ? 520 : 680, 0.12, 0.07, sfx, i * 0.14)),
    bolt: () => tone('square', 460, 200, 0.1, 0.035, sfx),
    crack: () => noise(0.06, 0.1, 'bandpass', 900, 600, sfx),
    crumble: () => noise(0.3, 0.2, 'lowpass', 700, 150, sfx),
    deny: () => tone('square', 150, 130, 0.1, 0.07, sfx),
    exit: () => [440, 554, 659, 880, 1108].forEach((f, i) => tone('triangle', f, f, 0.3, 0.08, sfx, i * 0.09)),
    core: () => { noise(1.6, 0.5, 'lowpass', 4000, 80, sfx); [220, 277, 330, 440, 554, 660, 880].forEach((f, i) => tone('triangle', f, f, 0.6, 0.09, sfx, i * 0.12)); },
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
    duck(on) { if (ac) music.gain.setTargetAtTime(on ? 0.3 : 0.9, ac.currentTime, 0.2); },
    mute(m) { muted = m ?? !muted; session(); if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.9, ac.currentTime, 0.03); return muted; },
    suspend() { if (ac && ac.state === 'running') ac.suspend(); },
    resume() { if (ac && ac.state !== 'running') ac.resume().catch(() => {}); },
    // each stage has its own key, pace and layers; the last stage quickens as its verdict nears (urgency, 0 to 1)
    scene(id) { sc = SCENES[id] || SCENES.steps; urge = 0; if (ac) for (const d of [echo, echoS]) d.delayTime.setTargetAtTime(Math.min(0.95, step() * 3), ac.currentTime, 0.05); },
    urgency(u) { urge = Math.max(0, Math.min(1, u)); },
    // 1 on the kick, falling to 0 before the next; drives the pulse in the picture
    beat(now) { if (ac && ac.state === 'running' && lastKick >= 0) { const d = ac.currentTime - lastKick; return d >= 0 ? Math.exp(-d * 6) : 0; } return Math.exp(-((now % 1.2) * 6)); },
  };
}
