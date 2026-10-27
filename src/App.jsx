import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, RESUME, GYRE_APP } from '../projects/site-data.js';
import { header, footer } from '../projects/project-template.js';
import { drawAll } from '../kit/v2/syber-sigil.js';
import { boot } from './site/site.js';
import { mountOrb } from './site/orb.js';
import { mountPointillism, FORMS } from './site/pointillism.js';
import { cleanText } from './living-lab/scene.js';
import { MATEO_VIDEO } from './mateo-video.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';

// The homepage, in order: the lab (the Orb), the lab's forms (Pointillism), then Mateo (the introduction film, the
// pitch and the linked proof of his work). The header floats over the Orb; the footer is the shared chrome.

// The Orb (src/site/orb.js): a sphere of fractal flame and spectral attractor beside the headline, with a swarm of
// dots that spells the lab's words. One input, the typing bar: as the visitor types, the dots re-assemble into their
// text and the light bends to it. Text never leaves the browser (cleanText, src/living-lab/scene.js, bounds it).
// Without WebGL2 (or on a software renderer) a still exposure of Plate I takes its place and the bar is hidden;
// reduced motion gets one still exposure per text. The words the dots spell are also in the page as .sy-sr text.
const ORB_WORDS = ['SyberLabs', 'RISE', 'Read', 'Anything', 'Alive', 'Type here ↓'];
function Hero() {
  const canvas = useRef(null), copy = useRef(null), orb = useRef(null);
  const [live, setLive] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => {
    const o = orb.current = mountOrb(canvas.current, { avoid: copy.current, words: ORB_WORDS, narrow: { scale: 0.66, max: 260, top: 60, media: '(max-width: 900px)' }, allowSoftware: window.SY_ALLOW_SOFTWARE_GL === true });
    setLive(o.supported);
    // the Atlas covers the page with a blurred backdrop: hold the orb instead of re-blurring a moving one
    const html = document.documentElement;
    const mo = new MutationObserver(() => html.classList.contains('sy-atlas-open') ? o.pause() : o.resume());
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); o.destroy(); };
  }, []);
  const type = e => { const v = e.target.value.slice(0, 180); setText(v); orb.current?.setText(cleanText(v)); };
  return <section className={`home-hero sy-nebula${live ? ' is-live' : ''}`} aria-labelledby="lab-title">
    <div className="sy-scrim home-hero__scrim" aria-hidden="true" />
    <div className="home-hero__in sy-wrap">
      <div className="home-hero__copy" ref={copy}>
        <p className="sy-eyebrow">SyberLabs / research studio</p>
        <h2 id="lab-title" className="sy-display-xl home-hero__title">Systems that <em>come alive.</em></h2>
        <p className="sy-body-lg home-hero__intro">A research studio where machine learning, complex systems and generative art meet. We build reading runtimes, agent infrastructure and instruments you can play.</p>
        <div className="home-hero__actions">
          <a className="sy-btn sy-btn--solid home-hero__cta" href="#forms">Explore the lab <span aria-hidden="true">↓</span></a>
          <a className="home-hero__explore" href="#founder">Meet the founder <span aria-hidden="true">↓</span></a>
        </div>
      </div>
    </div>
    <div className="home-hero__art">
      <canvas ref={canvas} className="sy-atmosphere" aria-hidden="true" />
      <img className="home-still" src={plateStill} srcSet={`${plateStillSm} 560w, ${plateStill} 1000w`} sizes="(max-width: 900px) 400px, 60vw" width="1000" height="1000" alt="" aria-hidden="true" decoding="async" />
      <p className="sy-sr">SyberLabs. RISE. Read anything, alive.</p>
      <form className="home-orb__bar" onSubmit={e => e.preventDefault()}>
        <input type="text" value={text} onChange={type} maxLength={180} autoComplete="off" spellCheck={false} enterKeyHint="done" aria-label="Type anything; the orb spells it" placeholder="Type anything…" />
        <span className="home-orb__hint" aria-hidden="true">{text ? 'Your words stay in this browser' : 'The orb listens'}</span>
      </form>
    </div>
  </section>;
}

// Pointillism (src/site/pointillism.js): one population of dots that reorganises into the lab's forms. The cycle
// advances on its own; the chips jump to a form, and Pause holds the current one (moving content that runs longer
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
  return <section id="forms" className="home-forms sy-wrap" aria-labelledby="forms-title">
    <div className="site-head home-forms__head">
      <div>
        <p className="sy-eyebrow">Pointillism</p>
        <h2 id="forms-title" className="sy-display">One field of points, <em>every form.</em></h2>
      </div>
      <p className="home-forms__note sy-small">The same dots spell the lab, gather into a raincloud, grow into a tree, fire as a neural network and turn as a galaxy. Each finds its place by one rule.</p>
    </div>
    <figure className={`home-forms__stage${live ? ' is-live' : ''}`}>
      <canvas ref={canvas} className="home-forms__canvas" aria-hidden="true" />
      <figcaption className="home-forms__now"><span className="sy-label">Now</span> <span>{FORMS[form].label}</span></figcaption>
    </figure>
    <div className="home-forms__controls">
      <div className="home-forms__chips" role="group" aria-label="Choose a form">
        {FORMS.map((f, i) => <button key={f.id} type="button" className="home-forms__chip" aria-pressed={i === form} onClick={() => pick(i)}>{f.label}</button>)}
      </div>
      <button type="button" className="home-forms__pause" aria-pressed={paused} onClick={toggle}>{paused ? 'Play' : 'Pause'}</button>
    </div>
  </section>;
}

const work = [
  { id: 'githits', title: 'GitHits design partnership',
    text: 'GitHits helps AI coding tools find useful code examples. I built and tested the connection to an AI coding assistant.',
    source: 'https://github.com/SyberLabs/SyberWork/pull/134', sourceLabel: 'Merged integration', detail: '/mateo/#githits' },
  { id: 'rise', title: 'RISE',
    text: 'RISE turns reading into an interactive experience with words, sound and visuals. I helped the team make readings play reliably and look consistent.',
    source: 'https://github.com/SyberLabs/RISE/pull/371', sourceLabel: 'Merged contribution', detail: '/mateo/#rise' },
];
const beats = [
  { title: 'Hi, I’m Mateo.', text: 'I’m a software and product engineer. I build interactive mathematical systems and Python integrations for AI tools.' },
  { title: 'Play with it. Inspect the code.', text: 'Gyre turns a mathematical rule into a live orbit. My GitHits integration filters source retrieval and records lookup evidence on the host.' },
  { title: "Let's build something useful together.", text: 'Looking for a software engineer? I’d like to hear what your team is building and walk you through my part in these projects.' },
];

export default function App() {
  const [step, setStep] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const movie = useRef(null);
  const start = useRef(null), title = useRef(null);
  useEffect(() => { const sigils = drawAll(document); boot(document, { density: 'calm', offset: [-0.34, -0.42] }); return () => sigils.disconnect(); }, []);
  const begin = () => { setStep(0); requestAnimationFrame(() => title.current.focus({ preventScroll: true })); };
  const watch = () => { movie.current.focus(); movie.current.play().catch(() => setVideoError(true)); };
  const overview = () => { setStep(null); requestAnimationFrame(() => start.current.focus()); };
  return <>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: header('', { here: '/', script: false }) }} />
    <main id="main">
      <div className="home-portfolio sy-wrap">
      <section className={`home-me${step !== null ? ' is-playing' : ''}${MATEO_VIDEO ? ' home-me--video' : ''}`} id="founder" aria-labelledby="founder-title">
        <div className="home-me__copy">
          <p className="sy-eyebrow">Software &amp; product engineer / Bay Area</p>
          <h1 id="founder-title" className="home-me__name">Mateo{MATEO_VIDEO ? ' ' : <br />}<em>Robles.</em></h1>
          {step === null ? <>
            <p className="home-me__intro">I build tools for coding assistants and interactive experiences for the web.</p>
            <p className="home-me__meta">Computer Science · Santa Clara ’26<br />Open to software engineering, technical support and product roles.</p>
          </> : <div className="home-beat" id="pitch">
            <span className="home-beat__count" role="status">Part {step + 1} of 3</span>
            <h2 ref={title} tabIndex={-1}>{beats[step].title}{step === 2 && <span className="home-pitch-star" aria-hidden="true">✦</span>}</h2>
            <p>{beats[step].text}</p>
            {step === 1 && <div className="home-beat__links"><a href={GYRE_APP}>Explore Gyre ↗</a><a href="/mateo/#githits">Inspect GitHits →</a></div>}
            {step === 2 && <a className="home-hire" href={CONTACT + '?subject=Engineering%20opportunity%20for%20Mateo'}>Invite Mateo to interview ↗</a>}
          </div>}
          <div className="home-me__actions">
            {step === null ? <>
              {MATEO_VIDEO ? <>
                <button type="button" className="sy-btn sy-btn--solid home-js-only" onClick={watch} aria-controls="mateo-intro-video">Watch Mateo’s introduction →</button>
                <a className="sy-btn sy-btn--solid home-nojs-only" href="#intro-video">Watch Mateo’s introduction →</a>
              </> : <>
                <button ref={start} type="button" className="sy-btn sy-btn--solid home-js-only" onClick={begin}>Read Mateo’s pitch <span aria-hidden="true">→</span></button>
                <a className="sy-btn sy-btn--solid home-nojs-only" href="#work">Read Mateo’s pitch →</a>
              </>}
            </> : <div className="home-pitch-controls"><button type="button" className="home-text-button" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button><button type="button" className="sy-btn sy-btn--solid" onClick={() => step === 2 ? overview() : setStep(step + 1)}>{step === 2 ? 'Finish →' : 'Next →'}</button><button type="button" className="home-text-button" onClick={overview}>Skip pitch</button></div>}
            <a className="home-link" href={RESUME}>Résumé (PDF) ↗</a>
          </div>
          {step !== 2 && <a className="home-hire" href={CONTACT + '?subject=Engineering%20opportunity%20for%20Mateo'}>Talk about an engineering role ↗</a>}
        </div>
        {MATEO_VIDEO ? <figure className="home-video" id="intro-video">
          <video ref={movie} id="mateo-intro-video" controls playsInline preload="none" poster={MATEO_VIDEO.poster} width="1920" height="1080" aria-label="Mateo Robles: animated introduction" onError={() => setVideoError(true)} onPlaying={() => setVideoError(false)}>
            <source src={MATEO_VIDEO.src} type="video/mp4" />
            <track kind="captions" src={MATEO_VIDEO.captions} srcLang="en" label="English" default />
            Your browser cannot play this video. The transcript and project proof remain available below.
          </video>
          <figcaption><span>{MATEO_VIDEO.credit}</span><a href={GYRE_APP}>Explore Gyre ↗</a><a href="https://github.com/sykosyber/engines">Engine source ↗</a><a href="#work" onClick={() => movie.current?.pause()}>Skip to the work →</a></figcaption>
          {videoError && <p className="home-video__error" role="status">Video unavailable. Read the transcript or explore the work below.</p>}
          <details className="home-transcript"><summary>Read transcript</summary>{MATEO_VIDEO.transcript.map((paragraph, i) => <p key={i}>{paragraph}</p>)}<a href={MATEO_VIDEO.transcriptFile}>Download spoken transcript</a></details>
        </figure> : (<figure className="home-engine" id="engines">
          <a href={GYRE_APP} aria-label="Run Gyre, one of Mateo’s interactive mathematical engines"><img src="/mateo/engines-gyre.webp" width="1000" height="1000" fetchPriority="high" alt="A luminous, multicolored attractor from Gyre." /></a>
          <figcaption><span>Gyre / Engines</span><a href={GYRE_APP}>Explore Gyre ↗</a><a href="https://github.com/sykosyber/engines">Source ↗</a></figcaption>
        </figure>) }
      </section>
      <section id="work" className="home-proofs" aria-label="Selected engineering work">
        {work.map(p => <article key={p.id} id={p.id} aria-labelledby={`proof-${p.id}`}>
          <h2 id={`proof-${p.id}`}>{p.title}</h2><p>{p.text}</p>
          <div className="home-proof__links"><a href={p.source}>{p.sourceLabel} ↗</a><a href={p.detail}>My part →</a></div>
        </article>)}
      </section>
      <p className="home-notes" id="about"><a href="/mateo/">More about Mateo →</a><a id="publishers" href="/services/">Work with Mateo →</a><a id="research" href="/research/">Research archive →</a></p>
      {!MATEO_VIDEO && <p className="home-nojs-only home-static-motto">Let's build something useful together. <span aria-hidden="true">✦</span></p>}
      </div>
      <Forms />
      <Hero />
    </main>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: footer('/') }} />
  </>;
}
