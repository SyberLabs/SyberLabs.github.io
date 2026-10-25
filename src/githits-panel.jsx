import React from 'react';
import { githits } from './githits.js';

// GitHits dependency totals, rendered at build time into /stack/ (scripts/prerender.mjs fills the
// <!-- stack:githits --> marker through src/entry-server.jsx). Moved there from the homepage, unchanged in what it
// reports: totals from the project pages' dependency panels, computed from data/githits (src/githits.js).
// A fixture snapshot shows "Snapshot pending", no numbers. GitHits is a third-party tool we use: no logo, no
// partnership or endorsement wording. Styles live in stack/stack.css.
const Arrow = () => <svg className="sy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>;

export function GitHitsPanel() {
  const g = githits;
  const day = g.day ? <time dateTime={g.iso}>{g.day}</time> : 'an unrecorded date';
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
  const row = r => !g.live ? 'Snapshot pending'
    : !r.packages ? 'No runtime dependencies declared'
    : `${plural(r.packages, 'package')} · ${r.affected === null ? 'vulnerabilities not checked' : r.affected ? `${r.affected} with known vulnerabilities` : 'known vulnerabilities: none reported'}`;
  const stats = [
    [g.packages, 'Packages checked', 'declared runtime dependencies'],
    [g.projects, 'Projects', 'each with a dependency panel'],
    [g.affected ?? 'Not checked', 'Known vulnerabilities', g.affected === null ? 'not every package was checked' : 'packages with advisories reported'],
    [g.licenses, 'Licenses', 'distinct, as GitHits reports them'],
  ];
  return <section className="stack-section" id="dependencies" aria-labelledby="dependencies-title">
    <div className="section-heading">
      <p className="eyebrow">DEPENDENCY CHECKS</p>
      <h2 id="dependencies-title">What the panels report, across projects.</h2>
    </div>
    <div className="prose">
      <div className="home-gh__data" style={{ '--sy-accent': 'var(--sy-ice)' }}>
        <p>Every project page shows a dependency check: license, latest version and known vulnerabilities for each declared package, fetched from the GitHits package API each time this site is built. These are the totals.</p>
        {g.live
          ? <dl className="home-gh__stats">{stats.map(([value, term, note]) => <div key={term}><dt className="sy-label">{term}</dt><dd><b className={typeof value === 'number' ? '' : 'is-word'}>{value}</b><span>{note}</span></dd></div>)}</dl>
          : <p className="home-gh__pending sy-label" role="note"><i aria-hidden="true" />Snapshot pending — GitHits data not yet fetched</p>}
        <ul className="home-gh__rows">
          {g.rows.map(r => <li key={r.slug} style={{ '--sy-accent': r.accent }}><a href={r.href}><span className="home-gh__name">{r.name}</span><span className="home-gh__val">{row(r)}</span><Arrow /></a></li>)}
        </ul>
        <p className="sy-small home-gh__attr">{g.live ? <>Package data from GitHits, retrieved {day}.</> : <>Package data from GitHits once fetched. Snapshot made {day}.</>}</p>
      </div>
    </div>
  </section>;
}
