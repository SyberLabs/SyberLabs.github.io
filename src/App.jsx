import React, { useEffect, useRef, useState } from 'react';
import { skills, EMAIL, CONTACT, RESUME, LINKEDIN, MATEO_GITHUB, MATEO_SITE, OMNI_PREVIEW, SKETCH_APP, RISE_PLUS } from '../projects/site-data.js';
import { header as chromeHeader, footer as chromeFooter } from '../projects/project-template.js';
import { mount, RING_SVG } from '../kit/v2/syber-atmosphere.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import { params as sigilParams, drawAll } from '../kit/v2/syber-sigil.js';
import { boot, reducedMotion } from './site/site.js';
import { mountChamber } from './site/chamber.js';
import { mountStrike } from './site/strike.js';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';

// The homepage leads with one product, RISE, and one action: a one-minute reading at rise.syberlabs.io/try/. The hero
// shows rather than tells: a short reading about SyberLabs plays in the middle of Plate I, paced the way RISE streams.
// Order below the hero: RISE Composer in Claude (the connector, with the Compose -> Admit -> Experience strike and
// RISE Plus beneath), the publisher pilot, more from the lab (#work, the header's Projects link), research and
// approach, about and contact (#about). The header and footer (nav, Sign in, All pages) are the shared chrome. The
// connector instructions are also on /projects/rise/#composer; the GitHits dependency totals live on
// /stack/#dependencies (src/githits-panel.jsx).
const RISE_TRY = 'https://rise.syberlabs.io/try/';
const RISE_VOICE_DEMO = 'https://rise.syberlabs.io/voice-demo';

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
const Header = () => <div className="home-chrome" dangerouslySetInnerHTML={{ __html: chromeHeader('', { sticky: false, script: false }) }} />;
const Footer = () => <div className="home-chrome home-footer" dangerouslySetInnerHTML={{ __html: chromeFooter('/') }} />;

// RISE Plus voice is labelled with its current availability (RISE_PLUS.state; /plus/ carries the full wording).
const plusLive = RISE_PLUS.state === 'live';

// The chamber (src/site/chamber.js): a reading about SyberLabs, line by line, in RISE's Stream presentation. Screen
// readers and search engines get the whole text from the .sy-sr paragraph; without JS or under reduced motion the
// stage holds one line, still.
const CHAMBER = [
  'SyberLabs is an independent AI lab.',
  'We build software you step inside.',
  'This line is not displayed.',
  'It is performed.',
  'Paced, lit, and given a room.',
  'That is RISE.',
  'Bring any text. Watch it become a reading.',
];
function Chamber() {
  const fig = useRef(null);
  useEffect(() => { const c = mountChamber(fig.current, CHAMBER); return () => c.destroy(); }, []);
  return <figure ref={fig} className="home-chamber">
    <p className="sy-sr">{CHAMBER.join(' ')}</p>
    <div className="home-chamber__stage" aria-hidden="true"><p className="home-chamber__line is-still">We build software you step inside.</p></div>
    <figcaption className="home-chamber__bar" aria-hidden="true">
      <span className="home-chamber__tag">A RISE-style reading</span>
      <span className="home-chamber__rail"><i /></span>
      <span className="home-chamber__clock" />
    </figcaption>
  </figure>;
}

// Plate I: the one live 2D long-exposure attractor on the site, the room the chamber's reading plays in. Without JS,
// without WebGL2 or on software GL, a still exposure of the same plate (src/plate-i.webp) sits in the ring instead.
// On phones the plate and its reading come first, smaller, with the copy and the call to action right beneath.
function Hero() {
  const canvas = useRef(null), copy = useRef(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const plate = mount(canvas.current, { mode: 'hero', avoid: copy.current, narrow: { scale: 0.62, max: 260, top: 66, media: '(max-width: 900px)' }, allowSoftware: window.SY_ALLOW_SOFTWARE_GL === true });
    setLive(plate.supported);
    // the Atlas covers the page with a blurred backdrop: hold the plate instead of re-blurring a moving one
    const html = document.documentElement;
    const mo = new MutationObserver(() => html.classList.contains('sy-atlas-open') ? plate.pause() : plate.resume());
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); plate.destroy(); };
  }, []);
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
        <p className="home-hero__voice">
          <a className="home-hero__explore" href={RISE_VOICE_DEMO}>Custom ElevenLabs reading<Icon name="external" size={16} /></a>
          <span>Plus or admin access required</span>
        </p>
      </div>
    </div>
    <div className="home-hero__art">
      <canvas ref={canvas} className="sy-atmosphere" aria-hidden="true" />
      <img className="home-still" src={plateStill} srcSet={`${plateStillSm} 560w, ${plateStill} 1000w`} sizes="(max-width: 900px) 400px, 60vw" width="1000" height="1000" alt="" aria-hidden="true" decoding="async" />
      <span className="home-ring" aria-hidden="true" dangerouslySetInnerHTML={{ __html: RING_SVG }} />
      <Chamber />
    </div>
  </section>;
}

const RISE_MCP = 'https://rise.syberlabs.io/api/mcp';
const CLAUDE_CONNECTORS = 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp';

// RISE Composer, right under the hero: free and live in Claude as a custom connector. What it claims is what runs:
// Claude composes a reading over the connector (rise_present with a Current), RISE checks it before anything plays,
// and the reader steps into it. The same instructions are on /projects/rise/#composer.
const RUNTIME = [
  ['01', 'Compose', 'A model writes the reading: the words, how they arrive, and the scene around them.'],
  ['02', 'Admit', 'RISE checks every choice against what it can perform. Nothing plays that it did not admit.'],
  ['03', 'Experience', 'Words arrive in time, with image, sound and procedural motion. You step inside the answer.'],
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
      if (pts.length === 3) strike.layout(pts, box.width, box.height);
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

function Composer() {
  return <section id="rise" className="home-sec sy-wrap" aria-labelledby="rise-title">
    <div className="home-rt sy-card" style={{ '--sy-accent': '#f2d9a6' }} data-reveal>
      <div className="home-rt__main">
        <div className="home-rt__copy">
          <p className="home-rt__top"><span className="sy-eyebrow">RISE Composer</span><Badge status={{ kind: 'live', label: 'Free · live in Claude' }} /></p>
          <h2 id="rise-title" className="sy-display home-rt__title">The experiential runtime <em>for machine intelligence.</em></h2>
          <p className="sy-body-lg home-rt__lede">Models think in text. RISE gives their answers time, image, sound and motion: a reading you step inside, not a block you scroll past.</p>
          <div className="home-rt__connect">
            <p className="sy-label">Add it to Claude as a custom connector</p>
            <span className="home-conn"><span className="sy-label">Name</span><code>RISE</code><CopyButton text="RISE" label="the connector name" /></span>
            <span className="home-conn"><span className="sy-label">URL</span><code>{RISE_MCP.split(/(?=\/api\/)/).flatMap((part, i) => i ? [<wbr key={i} />, part] : [part])}</code><CopyButton text={RISE_MCP} label="the connector URL" /></span>
          </div>
          <div className="sy-actions home-rt__actions">
            <a className="sy-btn sy-btn--solid" href={CLAUDE_CONNECTORS}>How to add a connector<Icon name="external" /></a>
            <a className="sy-btn sy-btn--line" href="/projects/rise/">How RISE works<Icon name="arrow" /></a>
          </div>
        </div>
        <RuntimeFlow />
      </div>
    </div>
    <div className="home-premium sy-card" style={{ '--sy-accent': '#f2d9a6' }} data-reveal>
      <p className="home-premium__text"><b className="home-premium__name">RISE Plus</b> {plusLive
        ? <>adds an ElevenLabs voice that reads the text you bring, <b className="home-premium__price">{RISE_PLUS.price}</b> a month.</>
        : <>adds an ElevenLabs voice that reads the text you bring.<Badge status={{ kind: 'early', label: 'Coming soon' }} /></>}</p>
      <a className="sy-btn sy-btn--line home-premium__go" href="/plus/">About RISE Plus<Icon name="arrow" /></a>
    </div>
  </section>;
}

// For publishers and creators: one concrete pilot, consistent with /services/.
function Publishers() {
  return <section id="publishers" className="home-sec sy-wrap" aria-labelledby="publishers-title">
    <div className="home-pilot sy-card" data-reveal>
      <div>
        <p className="sy-eyebrow">For publishers and creators</p>
        <h2 id="publishers-title" className="home-pilot__title">One of your pieces, <em>as a RISE reading.</em></h2>
        <p className="sy-body">We turn one of your pieces into a RISE reading your readers can open in a browser. A pilot is one rights-cleared excerpt and one reader journey, with a fixed quote once we have reviewed the text.</p>
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
  { id: 'reliability', sigil: 'syberwork', accent: '#a6f08f', kicker: 'Agent reliability · In progress', name: 'Reliable agents',
    what: 'SyberWork puts agents to work under contracts, human sign-off and a hash-chained record. Sybershoke replays distributed failures from a seed so each one can be reduced and fixed.',
    links: [{ label: 'SyberWork', href: '/projects/syberwork/' }, { label: 'Sybershoke', href: '/research/sybershoke/' }] },
];
function Lab() {
  return <section id="work" className="home-sec sy-wrap" aria-labelledby="lab-title">
    <div className="site-head home-head" data-reveal>
      <div><p className="sy-eyebrow">Projects</p><h2 id="lab-title" className="sy-display">More from <em>the lab.</em></h2></div>
      <p className="home-head__note sy-small">Every project page states what it has shown and what it has not.</p>
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
    <div className="site-head" data-reveal><p className="sy-eyebrow">Research and approach</p><h2 id="research-title" className="sy-display">Shown, <em>with its limits.</em></h2></div>
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
    <div className="site-head" data-reveal><p className="sy-eyebrow">About and contact</p><h2 id="about-title" className="sy-display">About <em>SyberLabs.</em></h2></div>
    <div className="home-about">
      <div className="home-about__copy" data-reveal-children>
        <p className="sy-body-lg home-about__lead">SyberLabs is an independent software and AI research lab founded in 2026 by Mateo Robles. The lab designs, builds, and evaluates AI products and research software, with a focus on applied machine learning, LLM applications, AI agent reliability, and simulation. Seth Carlson builds the engineering infrastructure behind RISE and co-builds Relay.</p>
        <p>Every project is published with its current status and its limits. Prototypes, measured results, and planned work are labeled separately so readers can tell what has been shown and what has not.</p>
        <h3 className="sy-eyebrow home-about__label">Technical skills</h3>
        <ul className="home-about__skills">{skills.map(s => <li key={s}>{s}</li>)}</ul>
      </div>
      <aside className="sy-plate sy-plate--card home-about__founder sy-card" aria-labelledby="founder-name" data-tilt="4" data-reveal>
        <p className="sy-eyebrow">Founder</p>
        <h3 id="founder-name" className="home-about__name">Mateo Robles</h3>
        <p className="home-about__role">Founder and Independent Researcher, SyberLabs</p>
        <p>B.S. Computer Science, emphasis in Data Science, Santa Clara University (2026). Software engineer working across machine learning, LLM applications, and full-stack development.</p>
        <ul className="home-about__links">
          <li><a href={RESUME}>Résumé (PDF)<Icon name="arrow" /></a></li>
          <li><a href={LINKEDIN}>LinkedIn<Icon name="external" /></a></li>
          <li><a href={MATEO_GITHUB}>GitHub<Icon name="external" /></a></li>
          <li><a href={MATEO_SITE}>Personal site<Icon name="external" /></a></li>
          <li><a href={CONTACT}>{EMAIL}</a></li>
        </ul>
      </aside>
    </div>
    <div className="home-cta sy-card" data-reveal>
      <div><p className="sy-eyebrow">Contact</p><h3 className="home-cta__title">Write to <em>the lab.</em></h3><p className="sy-body">Questions about RISE, a pilot, or the research: one email reaches us.</p></div>
      <div className="sy-actions"><a className="sy-btn sy-btn--solid" href={CONTACT}>Email the lab<Icon name="arrow" className="sy-icon--trail" /></a><a className="sy-btn sy-btn--line" href="/services/">Work with us</a></div>
    </div>
  </section>;
}

export default function App() {
  useEffect(() => {
    const sigils = drawAll(document);
    // The homepage field sits low and left, behind the copy and under Plate I, and climbs as the page scrolls.
    boot(document, { density: 'calm', offset: [-0.34, -0.42] });
    if (INTERNAL_SECTIONS) import('./site/factory-stats.js').then(m => m.factoryStats(document));
    return () => sigils.disconnect();
  }, []);
  return <>
    <Header />
    <main id="main">
      <Hero />
      <Composer />
      <Publishers />
      <Lab />
      <Research />
      {INTERNAL_SECTIONS && <Factory />}
      <About />
    </main>
    <Footer />
  </>;
}
