// Research: the reports on this site, then Lacuna Institute with its globe (src/visuals/atlas.js), which marks the
// Atlas's sites, names each in turn and can be turned by hand. The globe, the site named beside it and the heading
// are links into /lacuna/.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LACUNA, LACUNA_PARACAS, research } from '../../../projects/site-data.js';
import { sites as ATLAS_SITES, first as FIRST_SITE } from '../../visuals/atlas.js';
import { position } from '../page-format.js';
import { esc, head, status } from './html.js';

// The research index is written by hand. A report listed here must carry the same title and date there.
function checked(list) {
  const index = readFileSync(fileURLToPath(new URL('../../../research/index.html', import.meta.url)), 'utf8');
  for (const r of list) for (const field of ['title', 'date', 'code']) {
    if (!index.includes(esc(r[field]))) throw new Error(`homepage research list: ${field} "${r[field]}" is not on research/index.html`);
  }
  return list;
}

const paper = r => `
        <li><a href="${r.href}" data-glow>
          <span class="home-papers__code">${esc(r.code)}</span>
          <span class="home-papers__title">${esc(r.title)}</span>
          <span class="home-papers__line">${esc(r.line)}</span>
          <span class="home-papers__meta"><span>${esc(r.kind)}</span><time>${esc(r.date)}</time></span>
        </a></li>`;

// Lacuna Institute's own mark: a ring with a gap.
const LACUNA_MARK = '<svg class="home-rows__mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="81 16.4" opacity=".85"/><circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/><circle cx="20" cy="20" r="2.2" fill="#fc734d"/></svg>';
// Lacuna Institute's two published works. The counts are the pages' own: the Atlas lists its sites in
// src/lacuna/atlas/sites.js, and the dataset page counts 13 bundles.
const LACUNA_ROWS = [
  { href: LACUNA, name: 'Lacuna Atlas', line: `A globe of ${ATLAS_SITES.length} places where the historical record has a gap. Each has its sources and one open question.`, status: { kind: 'live', label: 'Live' } },
  { href: LACUNA_PARACAS, name: 'Paracas bundles', line: 'A census of the 13 Paracas mummy bundles recorded leaving Peru. Every claim carries a grade beside its source.', status: { kind: 'data', label: 'Dataset · version 1.0' } },
];
const lacunaRow = r => `
            <li><a href="${r.href}" data-glow>
              ${LACUNA_MARK}
              <span class="home-rows__name">${esc(r.name)}</span>
              <span class="home-rows__line">${esc(r.line)}</span>
              <span class="home-rows__meta">${status(r.status)}</span>
            </a></li>`;

export const researchPart = () => `<section id="research" class="home-part" aria-labelledby="research-title">
      <div class="sy-wrap">
        ${head('research-title', 'Research', '<a href="/research/">Research index</a>')}
        <ul class="home-papers" role="list">${checked(research).map(paper).join('')}
        </ul>
        <div id="lacuna" class="home-lacuna">
          <div class="home-lacuna__globe">
            <canvas data-visual="atlas" role="img" aria-label="The Earth drawn in dots, turning. The ${ATLAS_SITES.length} research sites of the Lacuna Atlas are marked on it and named one at a time."></canvas>
            <a class="home-globe" data-atlas-globe draggable="false" href="${LACUNA}#${FIRST_SITE.id}" aria-label="Open ${esc(FIRST_SITE.name)} on the Lacuna Atlas"></a>
          </div>
          <div class="home-lacuna__copy">
            <h3 id="lacuna-title"><a href="${LACUNA}">Lacuna Institute</a></h3>
            <p>Lacuna Institute is part of SyberLabs. It studies places and objects where the historical record has a gap, and publishes what is known, what is missing and its sources.</p>
            <p class="home-lacuna__facing">The globe marks the ${ATLAS_SITES.length} sites of the Lacuna Atlas. Facing now: <a data-atlas-site href="${LACUNA}#${FIRST_SITE.id}">${esc(FIRST_SITE.name)}</a> <span class="home-coords" data-atlas-coords>${position(FIRST_SITE.lat, FIRST_SITE.lon)}</span> <span class="home-lacuna__hint">Drag the globe to turn it.</span></p>
            <ul class="home-rows home-rows--works" role="list">${LACUNA_ROWS.map(lacunaRow).join('')}
            </ul>
          </div>
        </div>
      </div>
    </section>`;
