import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, RESUME, GYRE_APP } from '../projects/site-data.js';
import { header, footer } from '../projects/project-template.js';
import { drawAll } from '../kit/v2/syber-sigil.js';
import { boot } from './site/site.js';
import { MATEO_VIDEO } from './mateo-video.js';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';

const work = [
  { id: 'githits', title: 'GitHits integration',
    text: 'Python client + Claude Code integration for an evaluation pilot. Filtered retrieval, with host-recorded lookup evidence.',
    source: 'https://github.com/SyberLabs/SyberWork/pull/134', sourceLabel: 'Merged integration', detail: '/mateo/#githits' },
  { id: 'rise', title: 'RISE Composer',
    text: 'Team contribution: admission before playback, plus theme, loading and cancellation fixes.',
    source: 'https://github.com/SyberLabs/RISE/pull/371', sourceLabel: 'Merged contribution', detail: '/mateo/#rise' },
];
const beats = [
  { title: 'Everybody deserves a chance', text: 'I’m Mateo, a junior software engineer. I build interactive mathematical systems and Python integrations for AI tools.' },
  { title: 'Play with it. Inspect the code.', text: 'Gyre turns a mathematical rule into a live orbit. My GitHits integration filters source retrieval and records lookup evidence on the host.' },
  { title: 'Let’s talk through the work.', text: 'Looking for a junior engineer? I’d like to hear what your team is building and walk you through my part in these projects.' },
];

export default function App() {
  const [step, setStep] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const movie = useRef(null);
  const start = useRef(null), title = useRef(null);
  useEffect(() => { const sigils = drawAll(document); boot(document); return () => sigils.disconnect(); }, []);
  const begin = () => { setStep(0); requestAnimationFrame(() => title.current.focus({ preventScroll: true })); };
  const watch = () => { movie.current.focus(); movie.current.play().catch(() => setVideoError(true)); };
  const overview = () => { setStep(null); requestAnimationFrame(() => start.current.focus()); };
  return <>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: header('', { here: '/', script: false }) }} />
    <main id="main" className="home-portfolio sy-wrap">
      <section className={`home-hero${step !== null ? ' is-playing' : ''}${MATEO_VIDEO ? ' home-hero--video' : ''}`} aria-labelledby="hero-title">
        <div className="home-hero__copy">
          <p className="sy-eyebrow">Junior software engineer / Bay Area</p>
          <h1 id="hero-title">Mateo{MATEO_VIDEO ? ' ' : <br />}<em>Robles.</em></h1>
          {step === null ? <>
            <p className="home-hero__intro">I build playful mathematical systems and tools for AI developers.</p>
            <p className="home-hero__meta">Computer Science · Santa Clara ’26<br />Open to software engineering, QA, technical support and product roles.</p>
            <p className="home-nojs-only home-static-motto">Everybody deserves a chance <span aria-hidden="true">✦</span></p>
          </> : <div className="home-beat" id="pitch">
            <span className="home-beat__count" role="status">Part {step + 1} of 3</span>
            <h2 ref={title} tabIndex={-1}>{beats[step].title}{step === 0 && <span className="home-pitch-star" aria-hidden="true">✦</span>}</h2>
            <p>{beats[step].text}</p>
            {step === 1 && <div className="home-beat__links"><a href={GYRE_APP}>Explore Gyre ↗</a><a href="/mateo/#githits">Inspect GitHits →</a></div>}
            {step === 2 && <a className="home-hire" href={CONTACT + '?subject=Engineering%20opportunity%20for%20Mateo'}>Invite Mateo to interview ↗</a>}
          </div>}
          <div className="home-hero__actions">
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
          <video ref={movie} id="mateo-intro-video" controls playsInline preload="none" poster={MATEO_VIDEO.poster} width="1920" height="1080" aria-label="Mateo Robles — animated introduction" onError={() => setVideoError(true)} onPlaying={() => setVideoError(false)}>
            <source src={MATEO_VIDEO.src} type="video/mp4" />
            <track kind="captions" src={MATEO_VIDEO.captions} srcLang="en" label="English" default />
            Your browser cannot play this video. The transcript and project proof remain available below.
          </video>
          <figcaption><span>{MATEO_VIDEO.credit}</span><a href="#work" onClick={() => movie.current?.pause()}>Skip to the work →</a></figcaption>
          {videoError && <p className="home-video__error" role="status">Video unavailable. Read the transcript or explore the work below.</p>}
          <details className="home-transcript"><summary>Read the transcript</summary>{MATEO_VIDEO.transcript.map((paragraph, i) => <p key={i}>{paragraph}</p>)}<a href={MATEO_VIDEO.transcriptFile}>Download transcript</a></details>
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
    </main>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: footer('/') }} />
  </>;
}
