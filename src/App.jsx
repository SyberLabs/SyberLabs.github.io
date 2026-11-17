import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, CONSULT, EMAIL, GITHUB, LACUNA, LACUNA_PARACAS, projects } from '../projects/site-data.js';
import { header, footer } from '../projects/project-template.js';
import { drawAll } from '../kit/v2/syber-sigil.js';
import { boot } from './site/site.js';
import BackgroundVideo from './BackgroundVideo.jsx';
import { HERO_MEDIA, REVEAL } from './hero-media.js';
import { mount as mountFactory } from './visuals/factory.js';
import { mount as mountField } from './visuals/phase.js';
import { mount as mountForms, sigil as drawForm } from './visuals/elan.js';
import { mount as mountAtlas, coords, first as FIRST_SITE, sites as ATLAS_SITES } from './visuals/atlas.js';
import { initHomeMotion } from './home-motion.js';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';
import './home-sections.css';

// The homepage is mostly visual. Under the Gyre and the wordmark it has four sections, named for the four things
// SyberLabs is: Factory (the software that checks AI's work), Studio (creative software and generative pieces),
// Lacuna (Lacuna Institute, its research institute) and Liminal (research visuals). Each product is described once,
// by its headline in projects/site-data.js.
// Book a consultation stays in the header and closes the page. No individual is named: the site speaks for the company.
// Wording: the four section names and the one-word labels on the four canvas visuals (Proof, Atlas, Resonance,
// Emergence) are names (CLAUDE.md, "Homepage"). Every other line states a fact a reader can check or act on.

const bySlug = slug => projects.find(p => p.slug === slug);
const FACTORY_PRODUCTS = ['syberwork', 'attest'].map(bySlug);
const STUDIO_PRODUCTS = ['rise', 'flyspace'].map(bySlug);
const FORM_OF = { syberwork: 0, attest: 1, rise: 2, flyspace: 3 };   // each product's mark is one form of the Liminal piece's rule

// Pieces that move to sound. Each tile shows a still; one tile at a time runs the piece itself.
const PIECES = [
  ['cymatica', 'Cymatica', 'Each note sets its own figure.'],
  ['plutonian-core', 'Plutonian Core', 'The kick strikes the core.'],
  ['kaleidos', 'Kaleidos', 'One attractor, folded 6 to 16 times.'],
  ['murmuration', 'Murmuration', 'Up to 20,000 birds, one flock.'],
];
// Lacuna Institute's two published works. The counts are the pages' own: the Atlas lists its sites in
// src/lacuna/atlas/sites.js, and the dataset page counts 13 bundles.
const LACUNA_ROWS = [
  { href: LACUNA, name: 'Lacuna Atlas', line: `A globe of ${ATLAS_SITES.length} places where the historical record has a gap. Each has its sources and one open question.`, status: 'Live', live: true },
  { href: LACUNA_PARACAS, name: 'Paracas bundles', line: 'A census of the 13 Paracas mummy bundles recorded leaving Peru. Every claim carries a grade beside its source.', status: 'Dataset · version 1.0' },
];
// Lacuna Institute's own mark: a ring with a gap.
const LacunaMark = () => <svg viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="81 16.4" opacity=".85" />
  <circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".35" />
  <circle cx="20" cy="20" r="2.2" fill="#fc734d" />
</svg>;
function LacunaRows() {
  return <ol className="hv-rows" role="list">
    {LACUNA_ROWS.map(r => <li key={r.href}>
      <a href={r.href}>
        <LacunaMark />
        <span className="hv-rows__name">{r.name}</span>
        <span className="hv-rows__line">{r.line}</span>
        <span className={`hv-rows__status hv-mono${r.live ? ' is-live' : ''}`}><i aria-hidden="true" />{r.status}</span>
      </a>
    </li>)}
  </ol>;
}
function ProductRows({ items }) {
  return <ol className="hv-rows" role="list">
    {items.map(p => <li key={p.slug}>
      <a href={`/projects/${p.slug}/`}>
        <canvas data-form={FORM_OF[p.slug]} aria-hidden="true" />
        <span className="hv-rows__name"><span className="hv-mono">{p.number}</span>{p.name}</span>
        <span className="hv-rows__line">{p.headline}</span>
        <span className={`hv-rows__status hv-mono${p.status.kind === 'live' ? ' is-live' : ''}`}><i aria-hidden="true" />{p.status.label}</span>
      </a>
    </li>)}
  </ol>;
}

export default function App() {
  // First visit in this tab (html.sy-reveal, set in index.html): the headline rises in step with the clip.
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
    const late = setTimeout(finish, REVEAL.fallback * 1000); // a slow or blocked clip never holds the page back
    const scroll = () => { if (scrollY > 8) finish(); };
    addEventListener('scroll', scroll, { passive: true });
    return () => { clearTimeout(late); removeEventListener('scroll', scroll); };
  }, []);
  const onClipTime = t => {
    if (t >= REVEAL.panel) settle.current();
    else setPhase(p => p === 'done' ? p : t >= REVEAL.earth ? 'earth' : t >= REVEAL.frame ? 'frame' : p);
  };
  useEffect(() => { const sigils = drawAll(document); boot(document); return () => sigils.disconnect(); }, []);

  // The canvas visuals write their readouts straight into these nodes, so a frame never re-renders the page.
  const main = useRef(null), factoryCanvas = useRef(null), fieldCanvas = useRef(null), formsCanvas = useRef(null);
  const atlasCanvas = useRef(null), atlasGlobe = useRef(null), atlasSite = useRef(null), atlasCoords = useRef(null);
  const fieldCount = useRef(null), fieldState = useRef(null), fieldValue = useRef(null);
  const formsRule = useRef(null), formsState = useRef(null), formsStep = useRef(null);
  useEffect(() => {
    mountFactory(factoryCanvas.current);
    // The globe names each site in turn; the caption and both links follow it, so a press opens the site named.
    mountAtlas(atlasCanvas.current, { onSite: s => {
      atlasSite.current.textContent = s.name; atlasSite.current.href = `${LACUNA}#${s.id}`;
      atlasCoords.current.textContent = coords(s.lat, s.lon);
      atlasGlobe.current.href = `${LACUNA}#${s.id}`; atlasGlobe.current.setAttribute('aria-label', `Open ${s.name} on the Lacuna Atlas`);
    } });
    const field = mountField(fieldCanvas.current, {
      onCount: n => { fieldCount.current.textContent = n.toLocaleString('en-US'); },
      onState: s => { fieldState.current.textContent = s; },
      onCoherence: r => { fieldValue.current.textContent = r.toFixed(2); },
    });
    if (!field) fieldCanvas.current.hidden = true;   // no WebGL: the section keeps its caption on the plain ground
    let depth = 0;
    mountForms(formsCanvas.current, {
      onForm: s => { depth = s.d; formsRule.current.textContent = `n ${s.n} · ${s.th}° · ${s.r.toFixed(3)}`; },
      onState: (label, g) => { formsState.current.textContent = label; formsStep.current.textContent = `${g}/${depth}`; },
    });
    const marks = () => { for (const c of main.current.querySelectorAll('canvas[data-form]')) drawForm(c, +c.dataset.form); };
    marks();
    let wait; const onResize = () => { clearTimeout(wait); wait = setTimeout(marks, 200); };
    addEventListener('resize', onResize);
    const stop = initHomeMotion(main.current);
    return () => { removeEventListener('resize', onResize); clearTimeout(wait); stop(); };
  }, []);

  return <>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: header('', { here: '/', sticky: false, script: false }) }} />
    <main id="main" ref={main}>
      <section className="pitch-hero hv-hero" data-phase={phase} aria-labelledby="hero-title">
        <picture className="pitch-hero__art"><source media="(max-width: 600px)" srcSet={HERO_MEDIA.portraitPoster} /><img src={HERO_MEDIA.poster} width="1280" height="720" alt="" fetchPriority="high" /></picture>
        <BackgroundVideo onTime={onClipTime} onUnavailable={() => settle.current()} />
        <div className="pitch-hero__copy sy-wrap">
          <h1 id="hero-title" tabIndex={-1}>
            <span className="pitch-hero__brand" data-text="SyberLabs">SyberLabs</span>
          </h1>
          <ul className="hv-triad" aria-label="Sections of this page">
            <li><a href="#factory">Factory</a></li><li><a href="#studio">Studio</a></li><li><a href="#lacuna">Lacuna</a></li><li><a href="#liminal">Liminal</a></li>
          </ul>
        </div>
      </section>

      <section id="factory" className="hv-stratum hv-stratum--rise" aria-labelledby="factory-title">
        <canvas ref={factoryCanvas} role="img" aria-label="A machine reads a strand, copies it piece by piece, rejects the pieces that fail and releases two finished strands. Its stations are labelled Propose, Check, Review, Approve and Publish." />
        <div className="hv-cap sy-wrap">
          <p className="hv-mono hv-num">I</p>
          <h2 id="factory-title" data-decode aria-label="Factory">Factory</h2>
          <p className="hv-mono"><span className="hv-tag">Proof</span> / five steps / a person approves / <a href="/factory/">each step in detail</a></p>
        </div>
      </section>
      <div id="products" className="hv-block hv-block--tight sy-wrap">
        <ProductRows items={FACTORY_PRODUCTS} />
        <p id="partners" className="hv-partner"><span className="hv-mono">Design partnership</span><span><b>GitHits.</b> A Python client and a Claude Code integration for GitHits code search, both built through SyberWork. They were tested against a local stand-in for the API, so we claim no live usage or savings. <a href="/services/#partnerships">Design partnerships <span aria-hidden="true">→</span></a></span></p>
      </div>

      <section id="studio" className="hv-block hv-block--studio" aria-labelledby="studio-title">
        <div className="sy-wrap">
          <p className="hv-mono hv-num">II</p>
          <h2 id="studio-title" data-decode aria-label="Studio">Studio</h2>
          <ProductRows items={STUDIO_PRODUCTS} />
          <ul className="hv-pieces" role="list" aria-label="Pieces that move to sound">
            {PIECES.map(([slug, name, line]) => <li key={slug}>
              <figure className="hv-tile" data-piece={slug} data-name={name}>
                <img src={`/media/home/posters/${slug}.jpg`} width="960" height="1200" alt="" loading="lazy" decoding="async" />
                <div className="hv-tile__shield hv-tile__shield--a" /><div className="hv-tile__shield hv-tile__shield--b" />
                <figcaption><b>{name}</b><span>{line}</span></figcaption>
                <button className="hv-tile__run hv-mono" type="button" aria-label={`Run ${name}`}>Run</button>
              </figure>
            </li>)}
          </ul>
          <p className="hv-partner hv-game"><span className="hv-mono">Game</span><span><b>PSYCHO SYBER.</b> A side-scrolling game that runs in the browser. It has five stages: one for each of the four products and one for Lacuna Institute. It needs a keyboard and a mouse. <a href="/psycho-syber/">Play PSYCHO SYBER <span aria-hidden="true">→</span></a></span></p>
        </div>
      </section>

      <section id="lacuna" className="hv-stratum hv-stratum--atlas" aria-labelledby="lacuna-title">
        <canvas ref={atlasCanvas} role="img" aria-label={`The Earth drawn in dots, turning. The ${ATLAS_SITES.length} research sites of the Lacuna Atlas are marked on it and named one at a time.`} />
        <a ref={atlasGlobe} className="hv-globe" href={`${LACUNA}#${FIRST_SITE.id}`} aria-label={`Open ${FIRST_SITE.name} on the Lacuna Atlas`} />
        <div className="hv-cap sy-wrap">
          <p className="hv-mono hv-num">III</p>
          <h2 id="lacuna-title" aria-label="Lacuna"><a href={LACUNA} aria-label="Lacuna Institute" data-decode>Lacuna</a></h2>
          <p className="hv-mono"><span className="hv-tag">Atlas</span> / {ATLAS_SITES.length} sites / <a ref={atlasSite} href={`${LACUNA}#${FIRST_SITE.id}`}>{FIRST_SITE.name}</a> / <b ref={atlasCoords}>{coords(FIRST_SITE.lat, FIRST_SITE.lon)}</b> / <a href={LACUNA}>open the atlas</a></p>
        </div>
      </section>
      <div className="hv-block hv-block--tight sy-wrap">
        <LacunaRows />
        <p className="hv-partner"><span className="hv-mono">Research institute</span><span><b>Lacuna Institute</b> is part of SyberLabs. It studies places and objects where the historical record has a gap, and publishes what is known, what is missing and its sources.</span></p>
      </div>

      <section id="liminal" className="hv-stratum hv-stratum--field" aria-labelledby="liminal-title">
        <canvas ref={fieldCanvas} role="img" aria-label="A field of coupled oscillators falls into step. The letters of SyberLabs appear as the strokes that stay a quarter turn out of phase." />
        <div className="hv-cap sy-wrap">
          <p className="hv-mono hv-num">IV</p>
          <h2 id="liminal-title" data-decode aria-label="Liminal">Liminal</h2>
          <p className="hv-mono"><span className="hv-tag">Resonance</span> / <span ref={fieldCount}>0</span> oscillators / <span ref={fieldState}>incoherent</span> / <b ref={fieldValue}>0.00</b></p>
        </div>
      </section>
      <section className="hv-stratum hv-stratum--meld" aria-label="Emergence">
        <canvas ref={formsCanvas} role="img" aria-label="A branching form assembles itself from scattered dots, one fork at a time, lights up once, and returns to dots." />
        <div className="hv-cap sy-wrap">
          <p className="hv-mono"><span className="hv-tag">Emergence</span> / <span ref={formsRule} /> / <span ref={formsState}>latent</span> / <b ref={formsStep}>0</b></p>
        </div>
      </section>

      <section id="contact" className="hv-contact" aria-labelledby="contact-title">
        <img className="hv-contact__art" src="/media/home/contact.jpg" width="1024" height="1024" alt="" loading="lazy" decoding="async" />
        <div className="hv-contact__copy">
          <h2 id="contact-title">Tell us what you are building.</h2>
          <p className="sy-small">Email a short outline of the problem and where AI should help. We reply with next steps.</p>
          <a className="sy-btn sy-btn--solid" href={CONSULT}>Book a consultation</a>
          <p className="hv-contact__links hv-mono"><a href={CONTACT}>{EMAIL}</a><a href={GITHUB}>GitHub</a></p>
        </div>
      </section>
    </main>
    <div className="home-chrome" dangerouslySetInnerHTML={{ __html: footer('/') }} />
  </>;
}
