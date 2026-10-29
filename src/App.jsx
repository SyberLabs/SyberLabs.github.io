import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, EMAIL, RESUME, GYRE_APP, MATEO_PORTFOLIO } from '../projects/site-data.js';
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

// Lab first (Mateo's call, Oct 27): the hero leads with SyberLabs, its founder and its work, over one paced clip
// (Gyre, the Sophia frame, Earth). /mateo/ is the hiring page every application and referral links to; the hero keeps
// its two conversion actions. Then the lab, the work, the founder, and the Pointillism and Orb experiments.

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

// The Orb builds its WebGL2 scene only when its drawer is opened, so the closed drawer costs the page nothing.
function OrbExperiment() {
  const [open, setOpen] = useState(false);
  return <details className="orb-experiment sy-wrap" onToggle={e => setOpen(e.currentTarget.open)}><summary>Explore the Orb</summary>{open && <Hero />}</details>;
}

const pauseOtherVideos = event => { for (const video of document.querySelectorAll('video')) if (video !== event.currentTarget) video.pause(); };

// The lab's work, shown in the hero from the first frame, each line linked to its section below.
// Mateo's personal credentials (degree, availability) live on /mateo/, the hiring page every application links to.
// Third place confirmed by SyberLabs (Oct 27); event and project tied together by PorchLight's README.
const HACKATHON = { result: 'third place', event: 'Cline, Parallel & Composio Hackathon', date: 'October 2026', href: '#porchlight' };
const WORK = [
  { label: 'Factory', text: 'How a change travels from an agent to a person’s admission', href: '/factory/' },
  { label: 'GitHits', text: 'Design partnership: an A/B pilot and a GitHits client for Claude Code', href: '#work' },
  HACKATHON && { label: 'Hackathon', text: `PorchLight, ${HACKATHON.result}, ${HACKATHON.event}, ${HACKATHON.date}`, href: HACKATHON.href },
  { label: 'RISE', text: 'Interactive reading with sound and moving visuals, in open beta', href: '#rise' },
].filter(Boolean);

// The factory in five steps, as SyberWork's Build Thread runs them (docs/BUILD_THREAD.md); /factory/ has the detail.
const FACTORY_STEPS = [
  ['Propose', 'Model adapters write candidates; a repair loop feeds back real check results until one passes.'],
  ['Check', 'The host runs the contract’s checks on each candidate’s exact tree. A model’s own claim counts for nothing.'],
  ['Review', 'An independent critic reviews the change. It can never be the agent that wrote it.'],
  ['Admit', 'Twenty-one ordered rules decide, and a person accepts. The only write is your thread’s branch.'],
  ['Publish', 'Pushing and opening a pull request are separate admitted actions, each recorded.'],
];

export default function App() {
  const movieSeconds = Math.round(MATEO_VIDEO.durationSeconds);
  const movieDuration = `${Math.floor(movieSeconds / 60)}:${String(movieSeconds % 60).padStart(2, '0')}`;
  const movie = useRef(null), play = useRef(null);
  const [started, setStarted] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [videoError, setVideoError] = useState(false);
  // First visit in this tab (html.sy-reveal, set in index.html): the hero is revealed in step with its clip.
  // idle: Gyre, the name rising; frame: the Sophia frame draws, the role follows; earth: Earth is framed;
  // done: the panel (line, actions, availability) rises. Every other visit, and any failure, is simply done.
  const [phase, setPhase] = useState('idle');
  const [framed, setFramed] = useState(null); // what the Sophia frame holds now (FRAME_ART id), for the credit
  // The credit names the painting only while it is on screen. The line keeps the last painting's text and fades out
  // between appearances rather than leaving the layout, so nothing below it moves each time the loop turns.
  const [lastFramed, setLastFramed] = useState(null);
  useEffect(() => { if (framed) setLastFramed(framed); }, [framed]);
  const art = FRAME_ART.find(a => a.id === lastFramed);
  // The name, role, proof and both actions are on screen from the first frame; only the background media is paced.
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
      <section className={`pitch-hero${started ? ' is-playing' : ''}`} data-phase={phase} aria-labelledby="hero-title">
        <picture className="pitch-hero__art"><source media="(max-width: 600px)" srcSet={HERO_MEDIA.portraitPoster} /><img src={HERO_MEDIA.poster} width="1280" height="720" alt="" fetchPriority="high" /></picture>
        <BackgroundVideo pitchPlaying={started} onTime={onClipTime} onUnavailable={() => settle.current()} onArt={setFramed} />
        <div className="pitch-hero__copy sy-wrap">
          <h1 id="hero-title" tabIndex={-1}>
            <span className="pitch-hero__brand" data-text="SyberLabs">SyberLabs</span>
            <span className="sy-sr">: </span><span className="pitch-hero__tagline">High-Fidelity Systems</span>
          </h1>
          <p className="pitch-hero__role">Founded by <a href={MATEO_PORTFOLIO}>Mateo Robles</a></p>
          <div className="pitch-hero__panel">
            <p className="pitch-hero__line">AI agents write, test and repair code on their own. The factory runs every check itself, keeps a signed record of each step, and ships nothing until a person admits it.</p>
            <ul className="pitch-hero__proof" role="list" aria-label="Selected work">
              {WORK.map(p => <li key={p.label}><span className="pitch-hero__proof-label">{p.label}<span className="sy-sr">:</span></span>{' '}<a href={p.href}>{p.text}</a></li>)}
            </ul>
            <div className="pitch-hero__actions">
              <a className="sy-btn sy-btn--solid" href={CONTACT + '?subject=Interview%20with%20Mateo%20Robles'}>Interview Mateo</a>
              <a className="sy-btn sy-btn--line" href={RESUME}>View résumé</a>
            </div>
          </div>
        </div>
        <video ref={movie} className="pitch-hero__film" id="mateo-intro-video" controls playsInline preload="none" tabIndex={enhanced && !started ? -1 : 0} aria-hidden={enhanced && !started ? true : undefined} poster={MATEO_VIDEO.poster} width="1280" height="720" aria-label="Meet Mateo: introduction" onPlay={e => { setStarted(true); pauseOtherVideos(e); }} onError={() => setVideoError(true)} onPlaying={() => setVideoError(false)}>
          <source src={MATEO_VIDEO.src} type="video/mp4" />
          <track kind="captions" src={MATEO_VIDEO.captions} srcLang="en" label="English" default />
          <a href={MATEO_VIDEO.src}>Download Mateo’s introduction</a>
        </video>
        <button ref={play} className="pitch-hero__play home-js-only" type="button" onClick={watch} aria-controls="mateo-intro-video"><span aria-hidden="true">▶</span>Meet Mateo <small>{movieDuration}</small></button>
        {started && <button className="pitch-hero__back" type="button" onClick={overview}>Back to overview</button>}
      </section>
      <div className="film-notes sy-wrap">
        <span>{MATEO_VIDEO.credit}</span>
        {art && <span className={`hero-credit${framed ? '' : ' is-off'}`} aria-hidden={framed ? undefined : true}>In the frame: {art.date ? <><a href={art.href}>{art.title}</a>, {art.by} (The Cleveland Museum of Art, CC0)</> : <>{art.href ? <a href={art.href}>{art.title}</a> : art.title}, by {art.by}, {art.made}</>}</span>}
        <details className="home-transcript"><summary>Read transcript</summary>{MATEO_VIDEO.transcript.map((p, i) => <p key={i}>{p}</p>)}<a href={MATEO_VIDEO.transcriptFile}>Download transcript</a></details>
        {videoError && <p role="status">Video unavailable. Read the transcript or explore the work below.</p>}
      </div>
      <section id="factory" className="lab-identity sy-wrap" aria-labelledby="factory-title">
        <div className="lab-identity__copy">
          <img className="lab-identity__emblem" src="/mateo/lab/emblem-mateo-robles.webp" width="900" height="675" alt="" loading="lazy" decoding="async" />
          <p className="sy-eyebrow">The factory</p>
          <h2 id="factory-title">Agents build. The factory checks. A person admits.</h2>
          <p>SyberWork is the factory floor. Every change is a candidate on a side branch; nothing reaches your branch until it passes the host’s own checks and a person accepts it.</p>
          <ol className="factory-steps">
            {FACTORY_STEPS.map(([step, text]) => <li key={step}><b>{step}</b><span>{text}</span></li>)}
          </ol>
          <p className="factory-self">SyberWork builds itself this way: its own pull requests are proposed, checked and admitted through the factory.</p>
          <a href="/factory/">Inside the factory <span aria-hidden="true">→</span></a>
        </div>
        <figure className="lab-identity__art">
          <img src="/mateo/lab/agent-network-mateo-robles.webp" width="1100" height="921" alt="Glowing blue nodes joined by arcing links, like a network of agents." loading="lazy" decoding="async" />
          <figcaption>Network and emblem: Mateo Robles, made with Midjourney.</figcaption>
        </figure>
      </section>
      <section id="work" className="selected-work sy-wrap" aria-labelledby="work-title">
        <div className="selected-work__intro">
          <p className="sy-eyebrow">Made in the factory / AI developer tools</p>
          <h2 id="work-title">GitHits design partnership</h2>
          <p>GitHits searches open-source code so AI coding assistants can learn from real examples, and offered SyberLabs a design partnership to measure what that is worth to a coding-agent factory. I designed the pilot and its integration: a standard-library Python client, and the wiring that lets Claude Code use it under the host’s rules. Our agent factory implemented both to that design.</p>
          <ol className="gh-flow" aria-label="How a lookup travels">
            <li><b>Agent</b><span>Claude Code</span></li>
            <li><b>Launcher</b><span>its only allowed command, behind a query guard</span></li>
            <li><b>Client</b><span>filters sources and licenses, keeps the record</span></li>
            <li><b>GitHits API</b><span>five read-only operations</span></li>
          </ol>
          <p className="gh-note">Both changes went through SyberWork’s own review: conformance, rules, scenario and test checks before I admitted them. Tested against a local stand-in for the API, so no live usage or savings are claimed.</p>
          <p className="gh-links"><a href="/mateo/#githits">Case study <span aria-hidden="true">→</span></a><a href="https://github.com/SyberLabs/SyberWork/pull/129">Client code <span aria-hidden="true">↗</span></a><a href="https://github.com/SyberLabs/SyberWork/pull/134">Claude Code wiring <span aria-hidden="true">↗</span></a><a href="/mateo/proof/githits-tests.txt">Test output</a></p>
        </div>
        <dl className="gh-decisions">
          <div><dt>Our own code never counts as outside evidence</dt><dd>SyberLabs’ repositories are public, and GitHits indexes public code. The client refuses a target that names an excluded owner before any request is sent, drops results whose source is excluded, and discards a generated example that cites one. That last check is detection, not prevention, so the pilot also keeps its tasks unpublished.</dd></div>
          <div><dt>Only licenses the project can honour</dt><dd>Code an agent copies can land in an Apache-2.0 repository, so results are held to a permissive allow list. SPDX expressions are parsed with real operator precedence; copyleft, unknown and missing licenses are dropped and counted.</dd></div>
          <div><dt>The host keeps the record, not the agent</dt><dd>Every call, refusals included, appends a record signed with HMAC-SHA256: digests and counts, never the query, the result or the token. A record that fails verification is ignored and counted, so a forged line cannot pass as a lookup.</dd></div>
          <div><dt>Pinned to the API contract</dt><dd>Tests pin the exact part of GitHits’ OpenAPI document the client uses. The token goes only into the Authorization header and is scrubbed from errors; redirects and oversized responses are refused; lean defaults keep results small for an agent’s context window.</dd></div>
        </dl>
      </section>
      <section id="porchlight" className="selected-work porchlight-work sy-wrap" aria-labelledby="porchlight-title">
        <div className="selected-work__intro">
          <p className="sy-eyebrow">Hackathon / Third place</p>
          <h2 id="porchlight-title"><img className="porchlight-mark" src="/mateo/porchlight/porchlight-mark.webp" width="160" height="201" alt="" loading="lazy" decoding="async" />PorchLight</h2>
          <p>Drop a pin on a neighborhood problem and an agent finds who fixes it. I built it in one afternoon at the Cline, Parallel &amp; Composio Hackathon in San Francisco, where it placed third.</p>
          <p className="gh-note">Python and a Leaflet map, built with the Cline coding agent. Parallel search finds the responsible city agency with citations, an open-weight model writes the routing card, and Composio drafts the report and posts the pin to a shared Sheet and Slack.</p>
          <p className="gh-links"><a href="https://github.com/sykosyber/porchlight">Source and README <span aria-hidden="true">↗</span></a><a href="https://luma.com/m8euvq9n">The hackathon <span aria-hidden="true">↗</span></a></p>
        </div>
        <dl className="gh-decisions">
          <div><dt>No source, no claim</dt><dd>A routing card must be backed by a search result the agent actually received. Citations the model invents are dropped, and an unsupported pin goes to a person with “Couldn’t verify the right agency.”</dd></div>
          <div><dt>A pipeline, not a free-roaming agent</dt><dd>The same steps in the same order every run, from triage and cited research to deduplication and routing. Every external call has a timeout and a fallback, and each step shows in an agent trace with its timing.</dd></div>
          <div><dt>Guardrails in code</dt><dd>Reports are drafted, never sent: a person clicks send. Emergencies skip the pipeline and say to call 911. Contact details are stripped from a note before anything is stored or shared.</dd></div>
        </dl>
      </section>
      <section className="demo-work sy-wrap" aria-label="Product demonstrations">
        <article id="rise"><div><p className="sy-eyebrow">RISE / Lead developer</p><h2>A different way to read.</h2><p>An interactive reading app where text, sound and moving graphics play in time. I led core development of timed text, moving graphics, browser audio and video export.</p><span className="demo-work__links"><a href="https://github.com/SyberLabs/RISE/pull/643">An example change <span aria-hidden="true">↗</span></a><a href="https://github.com/SyberLabs/RISE/blob/b5115d77e9d5b76b17f6204c6c504988df683b0d/README.md">Development credits <span aria-hidden="true">↗</span></a></span></div><figure><video controls playsInline preload="none" poster="/mateo/demos/rise-playback.jpg" width="960" height="540" aria-label="Recorded RISE reading" onPlay={pauseOtherVideos}><source src="/mateo/demos/rise-playback.mp4" type="video/mp4" /></video><figcaption>Recorded product demonstration. RISE is a team project.</figcaption></figure></article>
        <article><div><p className="sy-eyebrow">Engines / Creative computation</p><h2>Mathematics you can play.</h2><p>Gyre turns mathematical rules into moving trails of light.</p><a href={GYRE_APP}>Explore Gyre <span aria-hidden="true">↗</span></a></div><video controls playsInline preload="none" poster="/mateo/demos/gyre-orbit.jpg" width="960" height="540" aria-label="Recorded Gyre interaction" onPlay={pauseOtherVideos}><source src="/mateo/demos/gyre-orbit.mp4" type="video/mp4" /></video></article>
      </section>
      <section id="founder" className="home-contact sy-wrap" aria-labelledby="contact-title"><div><p className="sy-eyebrow">Founder</p><h2 id="contact-title">Let’s build something useful together.</h2><img className="home-contact__signature" src="/mateo/brand/mateo-robles-signature.webp" width="1200" height="511" alt="" loading="lazy" decoding="async" /><p className="sy-small">Mateo Robles founded SyberLabs. B.S. Computer Science, Santa Clara University, 2026. Open to software engineering and product management roles.</p></div><div><a href={MATEO_PORTFOLIO}>Mateo’s portfolio <span aria-hidden="true">→</span></a>{' '}<a href={CONTACT}>{EMAIL}</a>{' '}<a href="tel:+19259493105">925-949-3105</a>{' '}<a href="https://www.linkedin.com/in/automateon/">linkedin.com/in/automateon</a>{' '}<a href="https://github.com/sykosyber">github.com/sykosyber</a>{' '}<a href={RESUME}>View résumé</a></div></section>
      <div className="lab-appendix">
        <Forms />
        <OrbExperiment />
      </div>
    </main>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: footer('/') }} />
  </>;
}
