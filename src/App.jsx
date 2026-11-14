import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, CONSULT, EMAIL, GITHUB, projects } from '../projects/site-data.js';
import { header, footer } from '../projects/project-template.js';
import { drawAll } from '../kit/v2/syber-sigil.js';
import { boot } from './site/site.js';
import BackgroundVideo from './BackgroundVideo.jsx';
import { HERO_MEDIA, REVEAL } from './hero-media.js';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';

// The homepage says what SyberLabs makes (four products), how SyberWork handles a code change, what was built for
// GitHits, and what a client can hire SyberLabs for. One conversion action, Book a consultation, leads the hero and
// closes the page. No individual is named: the site speaks for the company.
// Wording rule: every line states a fact a reader can check or act on. No slogans, and each thing is said once.

const pauseOtherVideos = event => { for (const video of document.querySelectorAll('video')) if (video !== event.currentTarget) video.pause(); };

// The four products, each described once by its headline in projects/site-data.js.
const PRODUCTS = projects;

// What a customer can buy today. Details, process and the RISE pilot live on /services/.
const SERVICES = [
  ['AI consultation', 'A working session on your product or operations. You get a short written plan: where agents can help, what each step is checked against, what it should cost and what stays with a person.'],
  ['Custom builds', 'Agent systems, integrations and internal tools. Each delivery includes the checks it passed and a record of how it was made. Nothing is merged without your approval.'],
  ['Design partnerships', 'For AI and developer-tool companies. We integrate your product into SyberWork and design a controlled measurement of how much it helps.'],
];

// One code change in five steps, as SyberWork's Build Thread runs them (docs/BUILD_THREAD.md); /factory/ has the detail.
const FACTORY_STEPS = [
  ['Propose', 'A model writes the change. When a check fails, the model gets the output and tries again, until the change passes or the budget runs out.'],
  ['Check', 'SyberWork runs your checks on the exact files in the proposed commit. A model’s own report that its tests passed is logged as unverified and changes nothing.'],
  ['Review', 'A separate reviewer examines the change. It is never the agent that wrote it.'],
  ['Approve', 'Twenty-one rules are applied in order, then a person approves. The only thing written is the change’s own branch.'],
  ['Publish', 'Pushing the branch and opening a pull request are separate actions. Each goes through the rules and is logged.'],
];

export default function App() {
  // First visit in this tab (html.sy-reveal, set in index.html): the hero panel rises in step with its clip.
  // Every other visit, and any failure, is simply done.
  const [phase, setPhase] = useState('idle');
  const settle = useRef(() => {});
  useEffect(() => {
    const root = document.documentElement;
    let over = false;
    const finish = () => {
      if (over) return; over = true;
      root.classList.remove('sy-reveal'); setPhase('done');
      try { sessionStorage.setItem('sy-reveal-seen', '1'); } catch {}
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
  useEffect(() => { const sigils = drawAll(document); boot(document); return () => sigils.disconnect(); }, []);
  return <>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: header('', { here: '/', sticky: false, script: false }) }} />
    <main id="main">
      <section className="pitch-hero" data-phase={phase} aria-labelledby="hero-title">
        <picture className="pitch-hero__art"><source media="(max-width: 600px)" srcSet={HERO_MEDIA.portraitPoster} /><img src={HERO_MEDIA.poster} width="1280" height="720" alt="" fetchPriority="high" /></picture>
        <BackgroundVideo onTime={onClipTime} onUnavailable={() => settle.current()} />
        <div className="pitch-hero__copy sy-wrap">
          <h1 id="hero-title" tabIndex={-1}>
            <span className="pitch-hero__brand" data-text="SyberLabs">SyberLabs</span>
            <span className="sy-sr">: </span><span className="pitch-hero__tagline">Software for checking AI’s work</span>
          </h1>
          <div className="pitch-hero__panel">
            <p className="pitch-hero__line">AI agents write the code. Our software runs every check itself, logs each step in a signed record, and changes your branch only after a person approves. We make four products and build agent systems for clients.</p>
            <div className="pitch-hero__actions">
              <a className="sy-btn sy-btn--solid" href={CONSULT}>Book a consultation</a>
              <a className="sy-btn sy-btn--line" href="#products">See the products</a>
            </div>
          </div>
        </div>
      </section>
      <section id="products" className="home-products sy-wrap" aria-labelledby="products-title">
        <div className="home-products__head">
          <h2 id="products-title">Products</h2>
        </div>
        <ol className="home-products__list" role="list">
          {PRODUCTS.map(p => <li key={p.slug}>
            <a href={`/projects/${p.slug}/`}>
              <span className="home-products__n">{p.number}</span>
              <span className="home-products__cat">{p.category}</span>
              <span className="home-products__name">{p.name}</span>
              <span className="home-products__headline">{p.headline}</span>
              <span className="home-products__status"><span className={`home-products__dot home-products__dot--${p.status.kind}`} aria-hidden="true" />{p.status.label}</span>
            </a>
          </li>)}
        </ol>
      </section>
      <section id="factory" className="lab-identity sy-wrap" aria-labelledby="factory-title">
        <div className="lab-identity__copy">
          <img className="lab-identity__emblem" src="/media/lab/syberlabs-emblem.webp" width="900" height="675" alt="" loading="lazy" decoding="async" />
          <p className="sy-eyebrow">SyberWork / The factory</p>
          <h2 id="factory-title">How SyberWork handles one code change</h2>
          <p>Each change is a commit on a separate branch. It reaches your branch only after SyberWork has run the checks and a person has approved it.</p>
          <ol className="factory-steps">
            {FACTORY_STEPS.map(([step, text]) => <li key={step} className={step === 'Approve' ? 'is-human' : undefined}><b>{step}</b><span>{text}</span></li>)}
          </ol>
          <p className="factory-self">SyberWork’s own pull requests go through these five steps.</p>
          <a href="/factory/">Each step in detail <span aria-hidden="true">→</span></a>
        </div>
        <figure className="lab-identity__art">
          <img src="/media/lab/agent-network.webp" width="1100" height="921" alt="Glowing blue nodes joined by arcing links, like a network of agents." loading="lazy" decoding="async" />
          <figcaption>Illustration made with Midjourney.</figcaption>
        </figure>
      </section>
      <section id="partners" className="selected-work sy-wrap" aria-labelledby="partners-title">
        <div className="selected-work__intro">
          <p className="sy-eyebrow">Partnership / AI developer tools</p>
          <h2 id="partners-title">GitHits design partnership</h2>
          <p>GitHits is a code search service that gives AI coding assistants examples from open-source code. It offered SyberLabs a design partnership to measure how much that helps a coding-agent factory. We designed the pilot and its integration: a Python client that uses only the standard library, and the configuration that lets Claude Code call it under SyberWork’s rules. Both were then built through SyberWork to that design.</p>
          <ol className="gh-flow" aria-label="How a lookup travels">
            <li><b>Agent</b><span>Claude Code</span></li>
            <li><b>Launcher</b><span>the only command the agent may run; it screens each query</span></li>
            <li><b>Client</b><span>filters results by source and license, logs every call</span></li>
            <li><b>GitHits API</b><span>five read-only operations</span></li>
          </ol>
          <p className="gh-note">Both changes passed SyberWork’s conformance, rules, scenario and test checks before a person approved them. They were tested against a local stand-in for the API, so we claim no live usage or savings.</p>
          <p className="gh-links"><a href="/services/#partnerships">Design partnerships <span aria-hidden="true">→</span></a><a href="https://github.com/SyberLabs/SyberWork/pull/129">Client code <span aria-hidden="true">↗</span></a><a href="https://github.com/SyberLabs/SyberWork/pull/134">Claude Code integration <span aria-hidden="true">↗</span></a><a href="/media/proof/githits-tests.txt">Test output</a></p>
        </div>
        <dl className="gh-decisions">
          <div><dt>Results from our own repositories are excluded</dt><dd>SyberLabs’ repositories are public and GitHits indexes public code, so a lookup could return our own code. The client refuses a request that names an excluded owner before sending it, drops results from an excluded source, and discards a generated example that cites one. The last check only catches a citation after it is made, so the pilot’s tasks also stay unpublished.</dd></div>
          <div><dt>Only permissively licensed results are kept</dt><dd>Code an agent copies can end up in an Apache-2.0 repository, so every result must match an allow list of permissive licenses. SPDX license expressions are parsed with correct operator precedence. Results with a copyleft, unknown or missing license are dropped and counted.</dd></div>
          <div><dt>The client logs every call</dt><dd>Each call, including a refused one, appends a record signed with HMAC-SHA256. The record holds digests and counts. It never holds the query, the result or the token. A record that fails verification is ignored and counted, so a forged entry cannot count as a lookup.</dd></div>
          <div><dt>Tests pin the API surface the client uses</dt><dd>Tests pin the exact part of GitHits’ OpenAPI document that the client uses. The token is sent only in the Authorization header and removed from error messages. Redirects and oversized responses are refused. Default result sizes are small so they fit in an agent’s context window.</dd></div>
        </dl>
      </section>
      <section id="services" className="home-services sy-wrap" aria-labelledby="services-title">
        <div className="home-services__head">
          <p className="sy-eyebrow">Services</p>
          <h2 id="services-title">Consulting, custom builds and design partnerships</h2>
          <p>We build client work with SyberWork, the same way we build SyberWork itself. Every engagement starts with a short call and a written scope.</p>
          <p className="home-services__actions"><a className="sy-btn sy-btn--solid" href={CONSULT}>Book a consultation</a><a href="/services/">How engagements work <span aria-hidden="true">→</span></a></p>
        </div>
        <dl className="home-services__list">
          {SERVICES.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}
        </dl>
      </section>
      <section className="demo-work sy-wrap" aria-label="Product demonstration">
        <article id="rise"><div><p className="sy-eyebrow">RISE / Open beta</p><h2>RISE: a reading app with sound and visuals</h2><p>Words appear at a pace you set, with sound and moving graphics. Free in any modern browser, with no account and no install.</p><span className="demo-work__links"><a href="https://rise.syberlabs.io/">Open RISE <span aria-hidden="true">↗</span></a><a href="/projects/rise/">Product and evidence <span aria-hidden="true">→</span></a></span></div><figure><video controls playsInline preload="none" poster="/media/demos/rise-playback.jpg" width="960" height="540" aria-label="Recorded RISE reading" onPlay={pauseOtherVideos}><source src="/media/demos/rise-playback.mp4" type="video/mp4" /></video><figcaption>Recorded product demonstration.</figcaption></figure></article>
      </section>
      <section id="contact" className="home-contact sy-wrap" aria-labelledby="contact-title"><div><p className="sy-eyebrow">Contact</p><h2 id="contact-title">Tell us what you are building.</h2><p className="sy-small">Email a short outline of the problem and where AI should help. We reply with next steps.</p></div><div><a className="sy-btn sy-btn--solid" href={CONSULT}>Book a consultation</a>{' '}<a href={CONTACT}>{EMAIL}</a>{' '}<a href={GITHUB}>github.com/SyberLabs</a></div></section>
    </main>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: footer('/') }} />
  </>;
}
