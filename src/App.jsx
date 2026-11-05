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

// The homepage sells: what SyberLabs makes (four products), how it works (the factory), proof (the GitHits design
// partnership and a recorded product), and how to engage (consulting and partnerships). One conversion action,
// Book a consultation, leads the hero and closes the page. No individual is named: the site speaks for the company.

const pauseOtherVideos = event => { for (const video of document.querySelectorAll('video')) if (video !== event.currentTarget) video.pause(); };

// The four products, in the order a customer meets them: the factory, its first station, then the two applications.
const PRODUCT_LINES = {
  syberwork: 'The autonomous software factory: agents propose, the host checks, a person admits',
  attest: 'Proves every step a document or spec promises, in a real browser',
  rise: 'Interactive reading with sound and moving visuals, in open beta',
  flyspace: 'A visual workspace that shows which data feeds each AI answer',
};
const PRODUCTS = projects.map(p => ({ ...p, line: PRODUCT_LINES[p.slug] ?? p.intro }));

// What a customer can buy today. Details, process and the RISE pilot live on /services/.
const SERVICES = [
  ['AI consultation', 'A focused working session on where AI agents can safely do real work in your product or operations: what to automate, what must be checked, and where a person has to approve.'],
  ['Custom builds', 'Agent systems, integrations and internal tools, built the way we build SyberWork: host-run checks, signed records and human approval before anything ships.'],
  ['Design partnerships', 'For AI and developer-tool companies: we integrate your product into a working agent factory and measure what it is worth under controlled conditions.'],
];

// The factory in five steps, as SyberWork's Build Thread runs them (docs/BUILD_THREAD.md); /factory/ has the detail.
const FACTORY_STEPS = [
  ['Propose', 'Model adapters write candidates; a repair loop feeds back real check results until one passes.'],
  ['Check', 'The host runs the contract’s checks on each candidate’s exact tree. A model’s own claim counts for nothing.'],
  ['Review', 'An independent critic reviews the change. It can never be the agent that wrote it.'],
  ['Admit', 'Twenty-one ordered rules decide, and a person accepts. The only write is your thread’s branch.'],
  ['Publish', 'Pushing and opening a pull request are separate admitted actions, each recorded.'],
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
            <span className="sy-sr">: </span><span className="pitch-hero__tagline">High-Fidelity Systems</span>
          </h1>
          <p className="pitch-hero__role">AI software that proves its work</p>
          <div className="pitch-hero__panel">
            <p className="pitch-hero__line">We build AI systems that check their own work. Agents write, test and repair code; the host runs every check itself, keeps a signed record of each step, and ships nothing until a person approves it.</p>
            <ul className="pitch-hero__proof" role="list" aria-label="Products">
              {PRODUCTS.map(p => <li key={p.slug}><span className="pitch-hero__proof-label">{p.name}<span className="sy-sr">:</span></span>{' '}<a href={`/projects/${p.slug}/`}>{p.line}</a></li>)}
            </ul>
            <div className="pitch-hero__actions">
              <a className="sy-btn sy-btn--solid" href={CONSULT}>Book a consultation</a>
              <a className="sy-btn sy-btn--line" href="#products">Explore products</a>
            </div>
          </div>
        </div>
      </section>
      <section id="products" className="home-products sy-wrap" aria-labelledby="products-title">
        <div className="home-products__head">
          <p className="sy-eyebrow">Products</p>
          <h2 id="products-title">Four products, one discipline: nothing counts until it is checked.</h2>
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
          <h2 id="factory-title">Agents build. The host checks. A person admits.</h2>
          <p>SyberWork is the factory floor. Every change is a candidate on a side branch; nothing reaches your branch until it passes the host’s own checks and a person accepts it.</p>
          <ol className="factory-steps">
            {FACTORY_STEPS.map(([step, text]) => <li key={step} className={step === 'Admit' ? 'is-human' : undefined}><b>{step}</b><span>{text}</span></li>)}
          </ol>
          <p className="factory-self">SyberWork builds itself this way: its own pull requests are proposed, checked and admitted through the factory.</p>
          <a href="/factory/">Inside the factory <span aria-hidden="true">→</span></a>
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
          <p>GitHits searches open-source code so AI coding assistants can learn from real examples. It offered SyberLabs a design partnership to measure what that is worth to a coding-agent factory. We designed the pilot and its integration, a standard-library Python client and the wiring that lets Claude Code use it under the host’s rules, and our factory built both to that design.</p>
          <ol className="gh-flow" aria-label="How a lookup travels">
            <li><b>Agent</b><span>Claude Code</span></li>
            <li><b>Launcher</b><span>its only allowed command, behind a query guard</span></li>
            <li><b>Client</b><span>filters sources and licenses, keeps the record</span></li>
            <li><b>GitHits API</b><span>five read-only operations</span></li>
          </ol>
          <p className="gh-note">Both changes went through SyberWork’s own review: conformance, rules, scenario and test checks before a person admitted them. Tested against a local stand-in for the API, so no live usage or savings are claimed.</p>
          <p className="gh-links"><a href="/services/#partnerships">Partner with us <span aria-hidden="true">→</span></a><a href="https://github.com/SyberLabs/SyberWork/pull/129">Client code <span aria-hidden="true">↗</span></a><a href="https://github.com/SyberLabs/SyberWork/pull/134">Claude Code wiring <span aria-hidden="true">↗</span></a><a href="/media/proof/githits-tests.txt">Test output</a></p>
        </div>
        <dl className="gh-decisions">
          <div><dt>Our own code never counts as outside evidence</dt><dd>SyberLabs’ repositories are public, and GitHits indexes public code. The client refuses a target that names an excluded owner before any request is sent, drops results whose source is excluded, and discards a generated example that cites one. That last check is detection, not prevention, so the pilot also keeps its tasks unpublished.</dd></div>
          <div><dt>Only licenses the project can honour</dt><dd>Code an agent copies can land in an Apache-2.0 repository, so results are held to a permissive allow list. SPDX expressions are parsed with real operator precedence; copyleft, unknown and missing licenses are dropped and counted.</dd></div>
          <div><dt>The host keeps the record, not the agent</dt><dd>Every call, refusals included, appends a record signed with HMAC-SHA256: digests and counts, never the query, the result or the token. A record that fails verification is ignored and counted, so a forged line cannot pass as a lookup.</dd></div>
          <div><dt>Pinned to the API contract</dt><dd>Tests pin the exact part of GitHits’ OpenAPI document the client uses. The token goes only into the Authorization header and is scrubbed from errors; redirects and oversized responses are refused; lean defaults keep results small for an agent’s context window.</dd></div>
        </dl>
      </section>
      <section id="services" className="home-services sy-wrap" aria-labelledby="services-title">
        <div className="home-services__head">
          <p className="sy-eyebrow">Consulting and partnerships</p>
          <h2 id="services-title">Bring us the problem. We build the system, and the checks that show it works.</h2>
          <p>The factory that builds SyberWork is available for your work. Every engagement starts with a short call and a written scope.</p>
          <p className="home-services__actions"><a className="sy-btn sy-btn--solid" href={CONSULT}>Book a consultation</a><a href="/services/">How engagements work <span aria-hidden="true">→</span></a></p>
        </div>
        <dl className="home-services__list">
          {SERVICES.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}
        </dl>
      </section>
      <section className="demo-work sy-wrap" aria-label="Product demonstration">
        <article id="rise"><div><p className="sy-eyebrow">RISE / Open beta</p><h2>A different way to read.</h2><p>An interactive reading app where text, sound and moving graphics play in time. Free to try in any modern browser, with no account and no install.</p><span className="demo-work__links"><a href="https://rise.syberlabs.io/">Open RISE <span aria-hidden="true">↗</span></a><a href="/projects/rise/">Product and evidence <span aria-hidden="true">→</span></a></span></div><figure><video controls playsInline preload="none" poster="/media/demos/rise-playback.jpg" width="960" height="540" aria-label="Recorded RISE reading" onPlay={pauseOtherVideos}><source src="/media/demos/rise-playback.mp4" type="video/mp4" /></video><figcaption>Recorded product demonstration.</figcaption></figure></article>
      </section>
      <section id="contact" className="home-contact sy-wrap" aria-labelledby="contact-title"><div><p className="sy-eyebrow">Contact</p><h2 id="contact-title">Let’s build something useful together.</h2><p className="sy-small">Tell us what you are building and where AI should help. We reply with next steps.</p></div><div><a className="sy-btn sy-btn--solid" href={CONSULT}>Book a consultation</a>{' '}<a href={CONTACT}>{EMAIL}</a>{' '}<a href={GITHUB}>github.com/SyberLabs</a></div></section>
    </main>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: footer('/') }} />
  </>;
}
