/* ============================================================================
   VERTICAL — Procedural Generative Web Audio Soundscape Engine
   Pure Web Audio API synthesis (zero external audio files).
   Muted by default; engages gracefully on user toggle (S / HUD button).
   ============================================================================ */

(function () {
  window.VERTICAL = window.VERTICAL || {};

  // Act-tuned harmonic voicings (Hz) — warm cinema sub-harmonics + airy upper partials
  const ACT_CHORDS = {
    overture: [55.0, 110.0, 164.81, 220.0, 329.63],   // A1 open cosmic fifth
    evidence: [61.74, 123.47, 185.0, 246.94, 293.66], // B1 poised tension
    ignition: [65.41, 130.81, 196.0, 293.66, 369.99], // C2 Lydian lift
    remaking: [73.42, 146.83, 220.0, 277.18, 329.63], // D2 radiant major9
    cosmic:   [49.0,  98.0,   146.83, 220.0, 293.66], // G1 cathedral vast
    hinge:    [51.91, 103.83, 155.56, 233.08, 311.13],// Ab1 poised gravity
    finale:   [55.0,  110.0,  164.81, 277.18, 329.63] // A1 luminous resolve
  };

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.filter = null;
      this.voices = [];
      this.lfo = null;
      this.enabled = false;
      this.currentAct = 'overture';
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0001;

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 540;
      this.filter.Q.value = 1.4;

      // Subtle breathing filter LFO
      this.lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.lfo.frequency.value = 0.085;
      lfoGain.gain.value = 150;
      this.lfo.connect(lfoGain);
      lfoGain.connect(this.filter.frequency);
      this.lfo.start();

      this.filter.connect(this.master);
      this.master.connect(this.ctx.destination);

      const chord = ACT_CHORDS[this.currentAct] || ACT_CHORDS.overture;
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'sine' : idx < 3 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        // Slight organic detune for lush cinema pad width
        osc.detune.value = (idx % 2 === 0 ? 1 : -1) * (idx * 2.2);
        gain.gain.value = idx === 0 ? 0.24 : idx < 3 ? 0.11 : 0.055;
        osc.connect(gain);
        gain.connect(this.filter);
        osc.start();
        this.voices.push({ osc, gain });
      });
    }

    toggle() {
      if (!this.ctx) this.init();
      if (!this.ctx) return false;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.enabled = !this.enabled;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), now);
      if (this.enabled) {
        this.master.gain.exponentialRampToValueAtTime(0.18, now + 1.2);
        this.playTransition('portal');
      } else {
        this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      }
      return this.enabled;
    }

    setAct(act) {
      this.currentAct = act;
      if (!this.ctx || !this.voices.length) return;
      const chord = ACT_CHORDS[act] || ACT_CHORDS.overture;
      const now = this.ctx.currentTime;
      this.voices.forEach((v, i) => {
        const target = chord[i] || chord[chord.length - 1];
        v.osc.frequency.cancelScheduledValues(now);
        v.osc.frequency.setValueAtTime(v.osc.frequency.value, now);
        v.osc.frequency.exponentialRampToValueAtTime(target, now + 2.2);
      });
    }

    playTransition(kind) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Delicate crystalline sweep + warm sub thump
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      const baseFreq = kind === 'phase' ? 660 : kind === 'portal' ? 440 : kind === 'stillness' ? 329.63 : 523.25;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (kind === 'phase' ? 1.5 : 0.75), now + 0.42);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);

      // Subtle low cinematic air whoosh
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(92, now);
      sub.frequency.exponentialRampToValueAtTime(38, now + 0.38);
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.11, now + 0.04);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.45);
    }

    playTick(pitchMultiplier = 1) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(420 * pitchMultiplier, now + 0.06);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  window.VERTICAL.audio = new SoundEngine();
})();
