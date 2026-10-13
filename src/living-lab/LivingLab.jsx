import React, { useEffect, useRef, useState } from 'react';
import { characters, limitText, longText, makeScene, MAX_CHARACTERS, phraseDuration, SAMPLES, supportsGraphemes } from './scene.js';
import './living-lab.css';

const ATMOSPHERES = ['spectrum', 'ember', 'glacier'];
const initialScene = makeScene(SAMPLES[0].text);

function SceneIcon({ name = 'arrow' }) {
  const path = name === 'down' ? 'M12 5v14M6 13l6 6 6-6' : name === 'replay' ? 'M20 7v5h-5M20 12a8 8 0 1 1-2.3-5.7' : 'M6 18L18 6M6 6h12v12';
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}

export default function LivingLab({ children }) {
  const [input, setInput] = useState(SAMPLES[0].text);
  const [scene, setScene] = useState(initialScene);
  const [atmosphere, setAtmosphere] = useState('spectrum');
  const [pace, setPace] = useState(1);
  const [beat, setBeat] = useState(0);
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [still, setStill] = useState(false);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready when you are.');
  const stage = useRef(null), field = useRef(null), remaining = useRef(null), speed = useRef(pace), generation = useRef(0);
  speed.current = pace;
  const complete = started && beat >= scene.phrases.length;
  const active = playing && visible && !still;

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const power = !supportsGraphemes || !!navigator.connection?.saveData || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2);
    const preference = () => {
      const reduce = motion.matches || power;
      setStill(reduce);
      if (reduce) {
        generation.current += 1; remaining.current = null; setPlaying(false); setStarted(false); setBeat(0);
        setStatus('Still reading. All your words are shown.');
      }
    };
    preference(); setReady(true);
    motion.addEventListener('change', preference);
    let onScreen = true;
    const visibility = () => setVisible(onScreen && !document.hidden && !document.documentElement.classList.contains('sy-atlas-open'));
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; visibility(); }, { threshold: 0.05 }) : null;
    observer?.observe(stage.current);
    const menu = new MutationObserver(visibility);
    menu.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => { motion.removeEventListener('change', preference); observer?.disconnect(); menu.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  // One timeout, suspended with its remaining hold when paused, hidden or covered by the Atlas.
  // Pace changes apply to the next phrase, without replacing or restarting the current one.
  useEffect(() => {
    if (!active || complete) return;
    const duration = remaining.current ?? phraseDuration(scene.phrases[beat]) / speed.current;
    const began = performance.now(), current = generation.current;
    let fired = false;
    const timer = setTimeout(() => {
      fired = true;
      remaining.current = null;
      const next = beat + 1;
      setBeat(next);
      if (next >= scene.phrases.length) { setPlaying(false); setStatus('Scene complete. Replay it or try another sentence.'); }
    }, duration);
    return () => { clearTimeout(timer); if (!fired && generation.current === current) remaining.current = Math.max(0, duration - (performance.now() - began)); };
  }, [active, beat, run, scene, complete]);

  const play = text => {
    const next = makeScene(text);
    if (!next.text) { setError('Write a sentence, or choose a sample below.'); field.current?.focus(); return; }
    generation.current += 1; remaining.current = null; setError(''); setScene(next); setBeat(0); setRun(value => value + 1); setStarted(true); setPlaying(!still);
    setStatus(still ? 'Still reading. All your words are shown.' : 'Playing your words.');
  };
  const replay = () => play(scene.text);
  const toggle = () => {
    if (!started || complete) { replay(); return; }
    setPlaying(value => !value); setStatus(playing ? 'Paused. Resume when you’re ready.' : 'Reading resumed.');
  };
  const display = still || !started || complete ? scene.text : scene.phrases[beat];
  const progress = still || complete ? 1 : started ? (beat + 1) / scene.phrases.length : 0;

  return <div className="living-lab" data-atmosphere={atmosphere} data-motion={active ? 'playing' : 'still'} data-state={complete ? 'complete' : playing ? 'playing' : 'paused'}>
    <div className="living-lab__compose">
      {children}
      <form className="living-lab__form" onSubmit={event => { event.preventDefault(); play(input); }}>
        <div className="living-lab__label"><label htmlFor="lab-sentence">Your sentence</label><span id="lab-count">{characters(input).length}/{MAX_CHARACTERS}</span></div>
        <textarea ref={field} id="lab-sentence" name="sentence" rows="2" value={input} dir="auto" autoComplete="off" disabled={!ready || !supportsGraphemes} placeholder="A quiet thought becomes a world…" aria-describedby={`lab-help lab-count${error ? ' lab-error' : ''}`} aria-invalid={!!error} onChange={event => { setInput(limitText(event.target.value)); setError(''); }} />
        <p id="lab-help" className="living-lab__hint">{supportsGraphemes ? 'Only in this browser. Your words stay here.' : 'This browser can show the samples. Open RISE to bring your own text.'}</p>
        {error && <p id="lab-error" className="living-lab__error" role="alert">{error}</p>}
        <button className="sy-btn sy-btn--solid living-lab__play" type="submit" disabled={!ready || !supportsGraphemes}>{still ? 'Read your words' : 'Play your words'}<SceneIcon /></button>
        {started && <a className="living-lab__view" href="#lab-scene">See your scene<SceneIcon name="down" /></a>}
      </form>
      <div className="living-lab__samples"><span>Or try a sentence</span>{SAMPLES.map(sample => <button type="button" key={sample.label} disabled={!ready} onClick={() => { setInput(sample.text); setAtmosphere(sample.atmosphere); play(sample.text); }}>{sample.label}<SceneIcon /></button>)}</div>
      <noscript><p className="living-lab__hint">The interactive scene needs JavaScript. You can still open a full reading in RISE.</p></noscript>
    </div>
    <div className="living-lab__experience">
      <figure ref={stage} id="lab-scene" className={`living-lab__stage${longText(display) ? ' living-lab__stage--long' : ''}`} aria-labelledby="lab-stage-label">
        <figcaption id="lab-stage-label" className="living-lab__stage-label"><span>Living Lab / 001</span><span>A sentence, performed</span></figcaption>
        <div className="living-lab__landscape" aria-hidden="true"><i className="living-lab__orb" /><i className="living-lab__orbit" /><i className="living-lab__terrain living-lab__terrain--far" /><i className="living-lab__terrain living-lab__terrain--near" /><i className="living-lab__horizon" /></div>
        <div className="living-lab__scrim" aria-hidden="true" />
        <div className={`living-lab__words${longText(display) ? ' living-lab__words--long' : ''}${started && !complete && !still ? ' living-lab__words--paced' : ''}`} dir="auto" aria-hidden="true" key={`${run}-${beat}-${still}-${complete}`}>
          {display.split(/\s+/u).map((word, index) => <span key={index} style={{ '--word': Math.min(index, 6) }}>{word}{' '}</span>)}
        </div>
        <p className="sy-sr" dir="auto">{scene.text}</p>
        <div className="living-lab__stage-foot" aria-hidden="true"><span>{still ? 'Still reading' : complete ? 'Scene complete' : started ? `${String(beat + 1).padStart(2, '0')} / ${String(scene.phrases.length).padStart(2, '0')}` : 'Press play to step inside'}</span><span>{atmosphere}</span></div>
        <div className="living-lab__progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
      </figure>
      <div className="living-lab__controls">
        <div className="living-lab__transport">
          {!still && <><button type="button" disabled={!ready} onClick={toggle}>{complete ? 'Play again' : playing ? 'Pause' : started ? 'Resume' : 'Play sample'}</button><button type="button" disabled={!ready} onClick={replay}>Replay<SceneIcon name="replay" /></button></>}
          {still && <span className="living-lab__hint">Still mode respects motion and device preferences.</span>}
          <span className="living-lab__status sy-sr" role="status">{status}</span>
        </div>
        <fieldset className="living-lab__atmospheres"><legend>Atmosphere</legend>{ATMOSPHERES.map(name => <button type="button" key={name} aria-pressed={atmosphere === name} onClick={() => setAtmosphere(name)}><i aria-hidden="true" data-palette={name} />{name}</button>)}</fieldset>
        {!still && <label className="living-lab__pace" htmlFor="lab-pace"><span>Pace <output>{pace.toFixed(2)}×</output></span><input id="lab-pace" name="pace" type="range" min="0.65" max="1.5" step="0.05" value={pace} onChange={event => setPace(Number(event.target.value))} /></label>}
      </div>
      <div className="living-lab__continue"><p>A local experiment in text and atmosphere.<br />RISE goes further, with full readings, visuals, and sound.</p><a className="sy-btn sy-btn--line" href="https://rise.syberlabs.io/try/">Continue in RISE<SceneIcon /></a></div>
    </div>
  </div>;
}
