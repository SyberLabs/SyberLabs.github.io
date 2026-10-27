import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, RESUME, GYRE_APP } from '../projects/site-data.js';
import { header, footer } from '../projects/project-template.js';
import { drawAll } from '../kit/v2/syber-sigil.js';
import { boot } from './site/site.js';
import { mountOrb } from './site/orb.js';
import { mountPointillism, FORMS } from './site/pointillism.js';
import { cleanText } from './living-lab/scene.js';
import { MATEO_VIDEO } from './mateo-video.js';
import BackgroundVideo from './BackgroundVideo.jsx';
import { HERO_MEDIA, REVEAL } from './hero-media.js';
import { FRAME_ART } from './frame-art.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';

// Hiring first: the hero reveals Mateo in step with one clip (Gyre, the Sophia frame, Earth, then the panel),
// followed by his film and work, then the lab's Pointillism and Orb experiments.

// The Orb (src/site/orb.js): a sphere of fractal flame and spectral attractor beside the headline, with a swarm of
// dots that spells the lab's words. One input, the typing bar: as the visitor types, the dots re-assemble into their
// text and the light bends to it. Text never leaves the browser (cleanText, src/living-lab/scene.js, bounds it).
// Without WebGL2 (or on a software renderer) a still exposure of Plate I takes its place and the bar is hidden;
// reduced motion gets one still exposure per text. The words the dots spell are also in the page as .sy-sr text.
const ORB_WORDS = ['SyberLabs', 'Mateo', 'Build', 'Create', 'Explore', 'Type here ↓'];
function Hero() {
  const canvas = useRef(null), copy = useRef(null), orb = useRef(null), manualPause = useRef(false);
  const [live, setLive] = useState(false);
  const [text, setText] = useState('');
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const o = orb.current = mountOrb(canvas.current, { avoid: copy.current, words: ORB_WORDS, narrow: { scale: 0.66, max: 260, top: 60, media: '(max-width: 900px)' }, allowSoftware: window.SY_ALLOW_SOFTWARE_GL === true });
    setLive(o.supported);
    // the Atlas covers the page with a blurred backdrop: hold the orb instead of re-blurring a moving one
    const html = document.documentElement;
    const mo = new MutationObserver(() => html.classList.contains('sy-atlas-open') || manualPause.current ? o.pause() : o.resume());
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); o.destroy(); };
  }, []);
  const type = e => { const v = e.target.value.slice(0, 180); setText(v); orb.current?.setText(cleanText(v)); };
  return <section className={`home-hero sy-nebula${live ? ' is-live' : ''}`} aria-labelledby="lab-title">
    <div className="sy-scrim home-hero__scrim" aria-hidden="true" />
    <div className="home-hero__in sy-wrap">
      <div className="home-hero__copy" ref={copy}>
        <p className="sy-eyebrow">SyberLabs / research studio</p>
        <h2 id="lab-title" className="sy-display-xl home-hero__title">An idea <em>in motion.</em></h2>
        <p className="sy-body-lg home-hero__intro">Type a word. Watch light and points rearrange around it.</p>
        <div className="home-hero__actions">
          <a className="sy-btn sy-btn--solid home-hero__cta" href="#forms">Explore the lab <span aria-hidden="true">↓</span></a>
          <a className="home-hero__explore" href="#founder">Meet the founder <span aria-hidden="true">↓</span></a>
        </div>
      </div>
    </div>
    <div className="home-hero__art">
      <canvas ref={canvas} className="sy-atmosphere" aria-hidden="true" />
      <img className="home-still" src={plateStill} srcSet={`${plateStillSm} 560w, ${plateStill} 1000w`} sizes="(max-width: 900px) 400px, 60vw" width="1000" height="1000" alt="" aria-hidden="true" decoding="async" />
      <p className="sy-sr">SyberLabs. Mateo. Build. Create. Explore.</p>
      <form className="home-orb__bar" onSubmit={e => e.preventDefault()}>
        <input type="text" value={text} onChange={type} maxLength={180} autoComplete="off" spellCheck={false} enterKeyHint="done" aria-label="Type anything; the orb spells it" placeholder="Type anything…" />
        <span className="home-orb__hint" aria-hidden="true">{text ? 'Your words stay in this browser' : 'Your words shape the light'}</span>
      {live && <button className="home-orb__pause" type="button" aria-pressed={paused} onClick={() => { manualPause.current = !paused; if (paused) orb.current.resume(); else orb.current.pause(); setPaused(!paused); }}>{paused ? 'Resume animation' : 'Pause animation'}</button>}
      </form>
    </div>
  </section>;
}

// Pointillism (src/site/pointillism.js): a seven-beat loop about interconnectedness in one field of dots, each beat
// with its sentence under the stage. The cycle advances on its own; the chips jump to a form, and Pause holds the current one (moving content that runs longer
// than five seconds needs a way to stop it). Reduced motion: each form drawn once, still, and no cycle.
function Forms() {
  const canvas = useRef(null), engine = useRef(null);
  const [form, setForm] = useState(0);
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const p = engine.current = mountPointillism(canvas.current, { onForm: setForm });
    setLive(p.supported);
    return () => p.destroy();
  }, []);
  const pick = i => { engine.current?.show(i); setForm(i); };
  const toggle = () => { const p = !paused; setPaused(p); engine.current?.setPaused(p); };
  return <section id="forms" className={`home-forms sy-wrap${live ? ' is-live' : ''}`} aria-labelledby="forms-title">
    <div className="site-head home-forms__head">
      <div>
        <p className="sy-eyebrow">Pointillism</p>
        <h2 id="forms-title" className="sy-display">Everything is <em>connected.</em></h2>
      </div>
      <p className="home-forms__note sy-small">A short loop in one field of points. Rain becomes a tree, a tree becomes a thought, thoughts become a sky, and imagination is the eye that sees the whole.</p>
    </div>
    {!live && <p className="home-forms__fallback">The interactive scene is unavailable in this browser. The recorded demos above still work.</p>}
    <figure className={`home-forms__stage${live ? ' is-live' : ''}`}>
      <canvas ref={canvas} className="home-forms__canvas" aria-hidden="true" />
      <figcaption className="home-forms__now"><span key={form} className="home-forms__line">{FORMS[form].line}</span></figcaption>
    </figure>
    <div className="home-forms__controls">
      <div className="home-forms__chips" role="group" aria-label="Go to a moment in the loop">
        {FORMS.map((f, i) => <button key={f.id} type="button" className="home-forms__chip" aria-pressed={i === form} onClick={() => pick(i)}>{f.label}</button>)}
      </div>
      <button type="button" className="home-forms__pause" aria-pressed={paused} onClick={toggle}>{paused ? 'Play' : 'Pause'}</button>
    </div>
  </section>;
}

const pauseOtherVideos = event => { for (const video of document.querySelectorAll('video')) if (video !== event.currentTarget) video.pause(); };

export default function App() {
  const movie = useRef(null), play = useRef(null);
  const [started, setStarted] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [videoError, setVideoError] = useState(false);
  // First visit in this tab (html.sy-reveal, set in index.html): the hero is revealed in step with its clip.
  // idle: Gyre, the name rising; frame: the Sophia frame draws, the role follows; earth: Earth is framed;
  // done: the panel (line, actions, availability) rises. Every other visit, and any failure, is simply done.
  const [phase, setPhase] = useState('idle');
  const [framed, setFramed] = useState(null); // what the Sophia frame holds now (FRAME_ART id), for the credit
  const [revealing, setRevealing] = useState(false); // false in the served HTML, so the panel is never inert without JS
  const settle = useRef(() => {});
  useEffect(() => {
    const root = document.documentElement;
    let over = false;
    const finish = () => {
      if (over) return; over = true;
      root.classList.remove('sy-reveal'); setPhase('done');
      try { sessionStorage.setItem('mateo-reveal-seen', '1'); } catch {}
    };
    settle.current = finish;
    if (!root.classList.contains('sy-reveal') || scrollY > 8) { finish(); return; }
    setRevealing(true);
    const late = setTimeout(finish, REVEAL.fallback * 1000); // a slow or blocked clip never holds the panel back
    const scroll = () => { if (scrollY > 8) finish(); };
    addEventListener('scroll', scroll, { passive: true });
    return () => { clearTimeout(late); removeEventListener('scroll', scroll); };
  }, []);
  const onClipTime = t => {
    if (t >= REVEAL.panel) settle.current();
    else setPhase(p => p === 'done' ? p : t >= REVEAL.earth ? 'earth' : t >= REVEAL.frame ? 'frame' : p);
  };
  useEffect(() => { if (started) settle.current(); }, [started]);
  useEffect(() => { setEnhanced(true); const sigils = drawAll(document); boot(document); return () => sigils.disconnect(); }, []);
  const watch = () => { movie.current.play().then(() => movie.current.focus()).catch(() => setVideoError(true)); };
  const overview = () => { movie.current.pause(); setStarted(false); requestAnimationFrame(() => play.current.focus()); };
  return <>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: header('', { here: '/', sticky: false, script: false, hiring: true }) }} />
    <main id="main">
      <section className={`pitch-hero${started ? ' is-playing' : ''}`} data-phase={phase} aria-labelledby="hero-title" id="founder">
        <picture className="pitch-hero__art"><source media="(max-width: 600px)" srcSet={HERO_MEDIA.portraitPoster} /><img src={HERO_MEDIA.poster} width="1280" height="720" alt="" fetchPriority="high" /></picture>
        <BackgroundVideo pitchPlaying={started} onTime={onClipTime} onUnavailable={() => settle.current()} onArt={setFramed} />
        <div className="pitch-hero__copy sy-wrap">
          <h1 id="hero-title" tabIndex={-1}>
            <span className="pitch-hero__brand" data-text="SyberLabs">SyberLabs</span>{' '}
            <span className="pitch-hero__by">by <img className="pitch-hero__signature" src="/mateo/brand/mateo-robles-signature.webp" width="1200" height="511" alt="Mateo Robles" /></span>
          </h1>
          <p className="pitch-hero__role">Software &amp; Product Engineer</p>
          <div className="pitch-hero__panel" inert={revealing && phase !== 'done' ? true : undefined}>
            <p className="pitch-hero__line">Python integrations and interactive JavaScript products.</p>
            <div className="pitch-hero__actions">
              <a className="sy-btn sy-btn--solid" href={CONTACT + '?subject=Interview%20with%20Mateo%20Robles'}>Interview Mateo</a>
              <a className="sy-btn sy-btn--line" href={RESUME}>View résumé</a>
            </div>
            <p className="pitch-hero__availability">Available to start immediately</p>
          </div>
        </div>
        <video ref={movie} className="pitch-hero__film" id="mateo-intro-video" controls playsInline preload="none" tabIndex={enhanced && !started ? -1 : 0} aria-hidden={enhanced && !started ? true : undefined} poster={MATEO_VIDEO.poster} width="1280" height="720" aria-label="Meet Mateo: two-minute introduction" onPlay={e => { setStarted(true); pauseOtherVideos(e); }} onError={() => setVideoError(true)} onPlaying={() => setVideoError(false)}>
          <source src={MATEO_VIDEO.src} type="video/mp4" />
          <track kind="captions" src={MATEO_VIDEO.captions} srcLang="en" label="English" default />
          <a href={MATEO_VIDEO.src}>Download Mateo’s introduction</a>
        </video>
        <button ref={play} className="pitch-hero__play home-js-only" type="button" onClick={watch} aria-controls="mateo-intro-video"><span aria-hidden="true">▶</span>Meet Mateo <small>2 min</small></button>
        {started && <button className="pitch-hero__back" type="button" onClick={overview}>Back to overview</button>}
      </section>
      <div className="film-notes sy-wrap">
        <span>{MATEO_VIDEO.credit}</span>
        <span className="hero-credit">Gyre to RISE Sophia. In the frame: {FRAME_ART.map((a, i) => <React.Fragment key={a.id}>{i ? ' · ' : ''}<span className={a.id === framed ? 'is-framed' : undefined}>{a.date ? <><a href={a.href}>{a.title}</a>, {a.by}, {a.date}, The Cleveland Museum of Art, CC0</> : <>{a.title}, {a.by}, {a.made}</>}</span></React.Fragment>)}.</span>
        <details className="home-transcript"><summary>Read transcript</summary>{MATEO_VIDEO.transcript.map((p, i) => <p key={i}>{p}</p>)}<a href={MATEO_VIDEO.transcriptFile}>Download transcript</a></details>
        {videoError && <p role="status">Video unavailable. Read the transcript or explore the work below.</p>}
      </div>
      <section id="work" className="selected-work sy-wrap" aria-labelledby="work-title">
        <div className="selected-work__intro"><p className="sy-eyebrow">Selected work</p><h2 id="work-title">GitHits design partnership</h2><p>Helping AI coding tools find useful code examples. I built and tested the connection to a coding assistant.</p><a href="/mateo/#githits">My contribution and code <span aria-hidden="true">↗</span></a></div>
        <figure className="test-evidence"><figcaption>Recorded engineering checks</figcaption><p><strong>44 / 44</strong> tests passed</p><ul><li>Allowed searches work</li><li>Excluded sources are blocked</li><li>Search records can be checked</li></ul><p className="test-evidence__note">Controlled test data. No customer results or savings claimed.</p><a href="/mateo/proof/githits-tests.txt">Read the test output</a></figure>
      </section>
      <section className="demo-work sy-wrap" aria-label="Product demonstrations">
        <article><div><p className="sy-eyebrow">Engines / Mateo’s browser art</p><h2>Mathematics you can play.</h2><p>Gyre turns mathematical rules into moving trails of light.</p><a href={GYRE_APP}>Explore Gyre <span aria-hidden="true">↗</span></a></div><video controls playsInline preload="none" poster="/mateo/demos/gyre-orbit.jpg" width="960" height="540" aria-label="Recorded Gyre interaction" onPlay={pauseOtherVideos}><source src="/mateo/demos/gyre-orbit.mp4" type="video/mp4" /></video></article>
        <article><div><p className="sy-eyebrow">RISE / Lead developer</p><h2>A different way to read.</h2><p>An interactive reading app. I led core development of timed text, moving graphics, sound and video export.</p><a href="https://github.com/SyberLabs/RISE/pull/371">Selected changes and tests <span aria-hidden="true">↗</span></a></div><figure><video controls playsInline preload="none" poster="/mateo/demos/rise-playback.jpg" width="960" height="540" aria-label="Recorded RISE reading" onPlay={pauseOtherVideos}><source src="/mateo/demos/rise-playback.mp4" type="video/mp4" /></video><figcaption>Recorded product demonstration. RISE is a team project.</figcaption></figure></article>
      </section>
      <section id="lab" className="lab-identity sy-wrap" aria-labelledby="lab-identity-title">
        <div className="lab-identity__copy">
          <img className="lab-identity__emblem" src="/mateo/lab/emblem-mateo-robles.webp" width="900" height="675" alt="" loading="lazy" decoding="async" />
          <p className="sy-eyebrow">The lab</p>
          <h2 id="lab-identity-title">Infrastructure for AI agents.</h2>
          <p>When an AI proposes an action, people need to know who approved it, what evidence supported it and whether it succeeded. SyberWork checks each proposal against rules the system controls, and records the reason when it refuses one.</p>
          <a href="/projects/syberwork/">How SyberWork works <span aria-hidden="true">→</span></a>
        </div>
        <figure className="lab-identity__art">
          <img src="/mateo/lab/agent-network-mateo-robles.webp" width="1100" height="921" alt="Glowing blue nodes joined by arcing links, like a network of agents." loading="lazy" decoding="async" />
          <figcaption>Network and emblem: Mateo Robles, made with Midjourney.</figcaption>
        </figure>
      </section>
      <Forms />
      <details className="orb-experiment sy-wrap"><summary>Explore the Orb</summary><Hero /></details>
      <section className="home-contact sy-wrap" aria-labelledby="contact-title"><div><p className="sy-eyebrow">Available to start immediately</p><h2 id="contact-title">Let’s build something useful together.</h2></div><div><a href="tel:+19259493105">925-949-3105</a><a href={CONTACT}>syberlabs.software@gmail.com</a><a href="https://www.linkedin.com/in/automateon/">linkedin.com/in/automateon</a><a href="https://github.com/sykosyber">github.com/sykosyber</a><a href="https://syberlabs.io/">syberlabs.io</a><a href={RESUME}>View résumé</a></div></section>
    </main>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: footer('/') }} />
  </>;
}
