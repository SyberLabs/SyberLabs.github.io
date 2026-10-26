import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, RESUME, LINKEDIN, MATEO_GITHUB, MATEO_PORTFOLIO, MATEO_EMAIL, OMNI_PREVIEW, SKETCH_APP, RISE_PLUS, RISE_APP, RISE_TRY } from '../projects/site-data.js';
import { header as chromeHeader, footer as chromeFooter } from '../projects/project-template.js';
import { params as sigilParams, drawAll } from '../kit/v2/syber-sigil.js';
import { boot, reducedMotion } from './site/site.js';
import { mountOrb } from './site/orb.js';
import { cleanText } from './living-lab/scene.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import { mountStrike } from './site/strike.js';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';

// The homepage leads with one product, RISE, and one action: a one-minute reading at rise.syberlabs.io/try/. The hero
// shows rather than tells: visitors play their own sentence in a bounded, local typographic landscape.
// Order below the hero: RISE Composer in Claude (the connector, with the Compose -> Admit -> Experience strike and
// RISE Plus beneath), the publisher pilot, more from the lab (#work, the header's Projects link), research and
// approach, about and contact (#about). The header and footer (nav, the Menu's site map, contact links) are the shared chrome. The
// connector instructions are also on /projects/rise/#composer; the GitHits dependency totals live on
// /stack/#dependencies (src/githits-panel.jsx).

function Icon({ name, size = 18, className = '' }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
    down: <><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></>,
    external: <><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>,
  };
  return <svg className={`sy-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
      document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (e2) {} t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1600);
  };
  return <button type="button" className={`home-copy${done ? ' is-done' : ''}`} onClick={copy} aria-label={`Copy ${label}`}><span aria-live="polite">{done ? 'Copied' : 'Copy'}</span></button>;
}

const Badge = ({ status }) => <span className={`sy-badge sy-badge--${status.kind}`}>{status.label}</span>;

// The header, the field canvas and the footer are the same markup every page gets (projects/project-template.js);
// the homepage bundle boots the behaviours itself, so the shared /syberlabs.js is not loaded here.
const Header = () => <div className="home-chrome" dangerouslySetInnerHTML={{ __html: chromeHeader('', { sticky: false, script: false, here: '/' }) }} />;
const Footer = () => <div className="home-chrome home-footer" dangerouslySetInnerHTML={{ __html: chromeFooter('/') }} />;

// RISE Plus voice is labelled with its current availability (RISE_PLUS.state; /plus/ carries the full wording).
const plusLive = RISE_PLUS.state === 'live';

// The Orb (src/site/orb.js): a sphere of fractal flame and spectral attractor beside the headline, with a swarm of
// dots that spells the lab's words. One input, the typing bar: as the visitor types, the dots re-assemble into their
// text and the light bends to it. Text never leaves the browser (cleanText, src/living-lab/scene.js, bounds it).
// Without WebGL2 (or on a software renderer) a still exposure of Plate I takes its place and the bar is hidden;
// reduced motion gets one still exposure per text. The words the dots spell are also in the page as .sy-sr text.
const ORB_WORDS = ['SyberLabs', 'RISE', 'Read', 'Anything', 'Alive', 'Type here ↓']; // who, what, the verb, the promise, what happens, then a hand-off to the bar
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
  return <section className={`home-hero sy-nebula${live ? ' is-live' : ''}`} aria-labelledby="hero-title">
    <div className="sy-scrim home-hero__scrim" aria-hidden="true" />
    <div className="home-hero__in sy-wrap">
      <div className="home-hero__copy" ref={copy}>
        <p className="sy-eyebrow">RISE / from SyberLabs</p>
        <h1 id="hero-title" className="sy-display-xl home-hero__title">Turn text into a <em>reading experience.</em></h1>
        <p className="sy-body-lg home-hero__intro">RISE brings words to life with pacing, visuals, and sound. Free in your browser. No account needed.</p>
        <div className="home-hero__actions">
          <a className="sy-btn sy-btn--solid home-hero__cta" href={RISE_TRY}>Try a one-minute reading<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="home-hero__explore" href="#work">Explore the lab<Icon name="down" size={16} /></a>
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

const RISE_MCP = 'https://rise.syberlabs.io/api/mcp';
const CLAUDE_CONNECTORS = 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp';

// RISE Composer: free and live in Claude as a custom connector. What it claims is what runs: Claude composes a reading
// over the connector (rise_present with a Current), RISE checks it before anything plays, and the reader steps into
// it. The same instructions are on /projects/rise/#composer.
const RUNTIME = [
  ['01', 'Compose', 'A model writes the reading: the words, how they arrive, and custom visuals for the scene.'],
  ['02', 'Admit', 'RISE checks every choice against what it can perform. Nothing plays that it did not admit.'],
  ['03', 'Experience', 'Words arrive in time, with image, sound and procedural motion.'],
];

// The strike (src/site/strike.js), played once when the flow comes into view and frozen on its last frame: node 1
// charges, a fractal bolt strikes node 2, a second strikes node 3, and node 3 bursts. Reduced motion shows that frame.
function RuntimeFlow() {
  const wrap = useRef(null), canvas = useRef(null);
  const [state, setState] = useState('idle'); // idle -> playing (once) | still (reduced motion)
  useEffect(() => {
    const el = wrap.current, strike = mountStrike(canvas.current);
    const measure = () => {
      const box = el.getBoundingClientRect();
      const pts = [...el.querySelectorAll('.home-rt__node')].map(n => { const b = n.getBoundingClientRect(); return [b.left - box.left + b.width / 2, b.top - box.top + b.height / 2, b.height / 2]; });
      if (pts.length === 3) strike.layout(pts, box.width, box.height, { burst: box.width < 440 ? .52 : box.width < 560 ? .78 : 1 });
    };
    measure();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    let io = null;
    if (reducedMotion() || !('IntersectionObserver' in window)) { strike.still(); setState('still'); }
    else {
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { strike.play(); setState('playing'); io.disconnect(); } }, { threshold: 0.55 });
      io.observe(el);
    }
    return () => { ro?.disconnect(); io?.disconnect(); strike.destroy(); };
  }, []);
  return <div ref={wrap} className={`home-rt__flow is-${state}`}>
    <canvas ref={canvas} className="home-rt__strike" aria-hidden="true" />
    <ol className="home-rt__stages" aria-label="How a reading is made">
      {RUNTIME.map(([n, term, text]) => <li key={n} className="home-rt__stage">
        <span className="home-rt__node" aria-hidden="true"><i /></span>
        <span className="home-rt__n">{n}</span>
        <span className="home-rt__term">{term}</span>
        <span className="home-rt__text">{text}</span>
      </li>)}
    </ol>
  </div>;
}

// The RISE line: two products, one promise. RISE performs a text; the products differ in who writes what: with Reader
// you bring the words and RISE stages them; with Composer the model writes the words and the stage (custom visuals). Both
// cards share one skeleton (lockup and status, the promise, what it is, three stages, the way in), so they read as
// siblings; the accent and the promise tell them apart. RISE Plus, the ElevenLabs voice, belongs to Reader.
const READER_POINTS = [
  ['Paced, not scrolled', 'Words arrive at a pace you set, or sit on a page you can turn.'],
  ['Pictures and sound', 'Procedural visuals and sound set the scene for a poem or a chapter.'],
  ['Nothing to set up', 'Any modern browser. No account, no key, no install.'],
];
function RiseLine() {
  return <section id="rise" className="home-sec sy-wrap" aria-labelledby="rise-title">
    <div className="site-head home-head" data-reveal>
      <div>
        <p className="sy-eyebrow">The RISE line</p>
        <h2 id="rise-title" className="sy-display">Whoever writes it, <em>RISE performs it.</em></h2>
      </div>
    </div>
    <div className="home-line">
      <article className="home-line__card home-line__card--reader sy-card" aria-labelledby="reader-title" data-reveal>
        <p className="home-line__top"><span className="home-line__lockup" id="reader-title"><span>RISE</span> <b>Reader</b></span><Badge status={{ kind: 'live', label: 'Free · open beta' }} /></p>
        <p className="home-line__promise">You bring the words. <em>RISE stages them.</em></p>
        <p className="home-line__what">Bring your own text or open today’s poem.</p>
        <div className="home-rt__flow is-still home-line__steps">
          <ol className="home-rt__stages" aria-label="What RISE Reader does">
            {READER_POINTS.map(([t, d], i) => <li key={t} className="home-rt__stage">
              <span className="home-rt__node" aria-hidden="true"><i /></span>
              <span className="home-rt__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="home-rt__term">{t}</span>
              <span className="home-rt__text">{d}</span>
            </li>)}
          </ol>
        </div>
        <div className="home-line__plus">
          <p><b className="home-premium__name">RISE Plus</b> {plusLive
            ? <>adds an ElevenLabs voice that reads the text you bring, <b className="home-premium__price">{RISE_PLUS.price}</b> a month.</>
            : <>adds an ElevenLabs voice that reads the text you bring.</>}</p>
          <p className="home-line__plus-go">{!plusLive && <Badge status={{ kind: 'early', label: 'Coming soon' }} />}<a href="/plus/">About RISE Plus<Icon name="arrow" size={16} /></a></p>
        </div>
        <div className="sy-actions home-line__actions">
          <a className="sy-btn sy-btn--solid" href={RISE_APP}>Open RISE Reader<Icon name="external" /></a>
          <a className="sy-btn sy-btn--line" href="/projects/rise/">How RISE works<Icon name="arrow" /></a>
        </div>
      </article>
      <article className="home-line__card home-line__card--composer home-rt sy-card" aria-labelledby="composer-title" data-reveal>
        <p className="home-line__top"><span className="home-line__lockup" id="composer-title"><span>RISE</span> <b>Composer</b></span><Badge status={{ kind: 'live', label: 'Free · live in Claude' }} /></p>
        <p className="home-line__promise">Your AI writes the words <em>and the stage.</em></p>
        <p className="home-line__what">Over a connector, Claude composes the whole reading and RISE performs it.</p>
        <RuntimeFlow />
        <div className="home-rt__connect">
          <p className="sy-label">Add it to Claude</p>
          <span className="home-conn"><span className="sy-label">Name</span><code>RISE</code><CopyButton text="RISE" label="the connector name" /></span>
          <span className="home-conn"><span className="sy-label">URL</span><code>{RISE_MCP.split(/(?=\/api\/)/).flatMap((part, i) => i ? [<wbr key={i} />, part] : [part])}</code><CopyButton text={RISE_MCP} label="the connector URL" /></span>
        </div>
        <div className="sy-actions home-line__actions">
          <a className="sy-btn sy-btn--solid" href={CLAUDE_CONNECTORS}>How to add a connector<Icon name="external" /></a>
        </div>
      </article>
    </div>
  </section>;
}

// For publishers and creators: one concrete pilot, consistent with /services/.
function Publishers() {
  return <section id="publishers" className="home-sec sy-wrap" aria-labelledby="publishers-title">
    <div className="home-pilot sy-card" data-reveal>
      <div>
        <p className="sy-eyebrow">For publishers and creators</p>
        <h2 id="publishers-title" className="home-pilot__title home-plain">One of your pieces, <em>as a RISE reading.</em></h2>
        <p className="sy-body">Send a rights-cleared excerpt; we stage it as a reading your audience opens in any browser. One piece, one reader journey, a fixed quote once we’ve read the text.</p>
      </div>
      <div className="sy-actions"><a className="sy-btn sy-btn--solid" href="/services/">About pilots<Icon name="arrow" className="sy-icon--trail" /></a></div>
    </div>
  </section>;
}

// More from the lab: three compact cards. Statuses and claims match each project's page.
const LAB = [
  { id: 'sketch', sigil: 'rise sketch', accent: '#c7a4ff', kicker: 'RISE Sketch · Live', name: 'Sketch',
    what: 'A drawing instrument with living ink: each stroke grows, ripples and folds into mirrors or mandalas of up to twelve. Runs in the browser and works offline.',
    links: [{ label: 'Draw now', href: SKETCH_APP }, { label: 'Source', href: 'https://github.com/SyberLabs/RISE-Sketch' }] },
  { id: 'flyspace', sigil: 'flyspace', accent: '#f59be0', kicker: 'FLYSPACE · Live preview', name: 'FLYSPACE',
    what: 'A spatial workspace for AI over live data: wire public data blocks into AI personas that answer only from what the wires carry, and cite it.',
    links: [{ label: 'Details', href: '/projects/flyspace/' }, { label: 'Try the preview', href: OMNI_PREVIEW }] },
  { id: 'reliability', sigil: 'syberwork', accent: '#a6f08f', kicker: 'Agents · In progress', name: 'SyberWork + Sybershoke',
    what: 'SyberWork puts agents to work under contracts, human sign-off and a hash-chained record. Sybershoke replays distributed failures from a seed so each one can be reduced and fixed.',
    links: [{ label: 'SyberWork', href: '/projects/syberwork/' }, { label: 'Sybershoke', href: '/research/sybershoke/' }] },
];
function Lab() {
  return <section id="work" className="home-sec sy-wrap" aria-labelledby="lab-title">
    <div className="site-head home-head" data-reveal>
      <div><p className="sy-eyebrow">Projects</p><h2 id="lab-title" className="sy-display home-plain">More from <em>the lab.</em></h2></div>
    </div>
    <ul className="home-lab" data-reveal-children>
      {LAB.map(p => <li key={p.id} className="home-lab__card sy-card" style={{ '--sy-accent': p.accent }}>
        <canvas className="home-lab__sigil" data-sigil={p.sigil} aria-hidden="true" />
        <p className="home-lab__kicker">{p.kicker}</p>
        <h3 className="home-lab__name">{p.name}</h3>
        <p className="home-lab__what">{p.what}</p>
        <p className="home-lab__links">{p.links.map(l => <a key={l.href} href={l.href}>{l.label}<Icon name={l.href.startsWith('http') ? 'external' : 'arrow'} size={16} /></a>)}</p>
      </li>)}
    </ul>
  </section>;
}

// Research and approach: two short intros, each to its own page.
function Research() {
  return <section id="research" className="home-sec sy-wrap" aria-labelledby="research-title">
    <div className="site-head" data-reveal><p className="sy-eyebrow">Research and approach</p><h2 id="research-title" className="sy-display home-plain">Claims, <em>with their evidence.</em></h2></div>
    <div className="home-ra" data-reveal-children>
      <a className="home-ra__card sy-card" href="/research/">
        <h3>Research</h3>
        <p>Technical reports, research notes and working papers. Each states its claim, the evidence it has reached, and what it does not establish.</p>
        <span className="home-ra__go">The research index<Icon name="arrow" size={16} /></span>
      </a>
      <a className="home-ra__card sy-card" href="/approach/">
        <h3>Approach</h3>
        <p>How we build AI software: establish what a system knows, design what a person can do with it, and verify that they can review and change the result.</p>
        <span className="home-ra__go">How we work<Icon name="arrow" size={16} /></span>
      </a>
    </div>
  </section>;
}

// The factory is hidden from the public homepage while it moves to the internal dashboard (#81). It still
// compiles; set INTERNAL_SECTIONS to true to show it again (and restore the Atlas link in projects/site-data.js).
// ("What changed", the other section #81 hid, is gone from here: it is staff-only at /admin/changes, MasterMind RFC 0002.)
const INTERNAL_SECTIONS = false;

// The factory: how the pull requests get made. The loop as a numbered strip (it is a sequence), four
// numbers that src/site/factory-stats.js refreshes from GitHub after load (the served text is the
// Oct 8 snapshot, so the section reads the same without JS), and the why beside its plate.
const FACTORY_STATS = [
  { id: 'merged-7d', n: 290, label: 'pull requests merged in the last 7 days' },
  { id: 'reviewed-7d', n: 236, label: 'of them reviewed by Codex' },
  { id: 'merged-24h', n: 171, label: 'merged in the last 24 hours' },
  { id: 'repos', n: 15, label: 'public repositories in the org' },
];
const FACTORY_LOOP = [
  { who: 'Claude Code', accent: 'var(--sy-ice)', title: 'writes the pull request', text: 'One task, one branch, one PR, opened by the agent that did the work.' },
  { who: 'Codex', accent: 'var(--sy-amber)', title: 'reviews every PR', text: 'OpenAI’s GitHub app reads the diff: a different model family from the author.' },
  { who: 'Claude', accent: 'var(--sy-ice)', title: 'answers every finding', text: <><code>Fixed in &lt;sha&gt;</code> or <code>Not a defect: &lt;reason&gt;</code>, and resolves the thread. A GitHub Action, <code>codex-feedback.yml</code>, answers when no session is live.</> },
  { who: 'The gate', accent: 'var(--sy-live)', title: 'merges', text: 'main requires CI green and every review thread resolved. Auto-merge, no human click.' },
];
function Factory() {
  return <section id="factory" className="home-sec sy-wrap" aria-labelledby="factory-title">
    <div className="site-head home-head" data-reveal><div><p className="sy-eyebrow">Factory / October 2026</p><h2 id="factory-title" className="sy-display">Agents build. Agents review. <em>Humans look at the product.</em></h2></div><p className="home-head__note sy-small">Humans review the product at syberlabs.io and in production, not the pull request.</p></div>
    <ol className="home-loop" data-reveal-children>
      {FACTORY_LOOP.map((s, i) => <li key={s.who + s.title} className="sy-card" style={{ '--sy-accent': s.accent }}>
        <span className="home-loop__n">{String(i + 1).padStart(2, '0')}</span>
        <span className="home-loop__t"><b>{s.who}</b> {s.title}</span>
        <p className="home-loop__d">{s.text}</p>
      </li>)}
    </ol>
    <ul className="home-stats" data-reveal-children>
      {FACTORY_STATS.map(s => <li key={s.id} className="home-stat sy-card" data-stat={s.id}>
        <b className="home-stat__n sy-figure" data-count={s.n}>{s.n}</b>
        <span className="home-stat__l">{s.label}</span>
        <span className="home-stat__src" data-stat-src><i aria-hidden="true" />snapshot · Oct 8</span>
      </li>)}
    </ul>
    <div className="home-why" data-reveal>
      <figure className="sy-plate-figure home-why__fig" aria-hidden="true">
        <div className="sy-plate sy-plate--sigil"><canvas data-sigil="factory" data-caption-for="params-factory" /></div>
        <figcaption><b>Plate X · The factory</b>de Jong map · <span className="sy-nowrap">seed “factory”</span><span className="sy-params" id="params-factory">{sigilParams('factory').caption}</span></figcaption>
      </figure>
      <div className="home-why__body">
        <p className="sy-eyebrow">Why</p>
        <p className="sy-body-lg">Two people cannot read fifty pull requests a day, and a reviewer’s output only counts if something acts on it. So <a href="https://github.com/SyberLabs/RISE/blob/main/AGENTS.md#reviewer-findings" rel="noopener">the contract</a> makes an unanswered finding a merge blocker instead of an opinion: every thread is fixed or refuted, in writing, before the gate opens. <a href="https://github.com/SyberLabs/RISE/blob/main/.github/workflows/codex-feedback.yml" rel="noopener">The workflow</a> keeps that true when nobody is at the keyboard. What we look at is the thing that shipped.</p>
      </div>
    </div>
  </section>;
}

function About() {
  return <section id="about" className="home-sec sy-wrap" aria-labelledby="about-title">
    <div className="site-head" data-reveal><p className="sy-eyebrow">About</p><h2 id="about-title" className="sy-display home-plain">About <em>SyberLabs.</em></h2></div>
    <div className="home-about">
      <div className="home-about__copy" data-reveal-children>
        <p className="sy-body-lg home-about__lead">SyberLabs is an independent AI lab founded in 2026 by Mateo Robles. The lab designs, builds, and evaluates AI products and research software, with a focus on applied machine learning, LLM applications, AI agent reliability, and simulation.</p>
        <p>Seth Carlson builds the engineering infrastructure behind RISE and co-builds <a href="/projects/relay/">Relay</a>, a workspace for AI-assisted job applications.</p>
      </div>
      <aside className="sy-plate--card home-about__founder sy-card" aria-labelledby="founder-name" data-tilt="4" data-reveal>
        <p className="sy-eyebrow">Founder</p>
        <h3 id="founder-name" className="home-about__name">Mateo Robles</h3>
        <p className="home-about__role">Founder and Independent Researcher, SyberLabs</p>
        <p>B.S. Computer Science, emphasis in Data Science, Santa Clara University (2026). Software engineer working across machine learning, LLM applications, and full-stack development.</p>
        <ul className="home-about__links">
          <li><a href={RESUME}>Résumé (PDF)<Icon name="arrow" /></a></li>
          <li><a href={LINKEDIN}>LinkedIn<Icon name="external" /></a></li>
          <li><a href={MATEO_GITHUB}>GitHub<Icon name="external" /></a></li>
          <li><a href={MATEO_PORTFOLIO}>Engineering portfolio<Icon name="arrow" /></a></li>
          <li><a href={`mailto:${MATEO_EMAIL}`}>{MATEO_EMAIL}</a></li>
        </ul>
      </aside>
      <div className="home-cta sy-card" data-reveal>
        <div><p className="sy-eyebrow">Contact</p><h3 className="home-cta__title home-plain">Write to <em>the lab.</em></h3></div>
        <div className="sy-actions"><a className="sy-btn sy-btn--solid" href={CONTACT}>Email the lab<Icon name="arrow" className="sy-icon--trail" /></a></div>
      </div>
    </div>
  </section>;
}

export default function App() {
  useEffect(() => {
    const sigils = drawAll(document);
    // The shared field stays low and left, behind the introduction and away from the local reading stage.
    boot(document, { density: 'calm', offset: [-0.34, -0.42] });
    if (INTERNAL_SECTIONS) import('./site/factory-stats.js').then(m => m.factoryStats(document));
    return () => sigils.disconnect();
  }, []);
  return <>
    <Header />
    <main id="main">
      <Hero />
      <RiseLine />
      <Publishers />
      <Lab />
      <Research />
      {INTERNAL_SECTIONS && <Factory />}
      <About />
    </main>
    <Footer />
  </>;
}
