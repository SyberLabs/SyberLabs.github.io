// The four products, one row each, and the design partnership. Each product is described once, by its headline in
// projects/site-data.js; the line under its status is the commit that page was checked against (`reflects`).
// Under each row is the product's evidence, the same lines its own page prints: what is deployed, measured, tested
// or implemented, and what is not yet. It is a <details>, so it opens without a script, and the four share a name,
// so one is open at a time.
import { projects } from '../../../projects/site-data.js';
import { esc, head, status } from './html.js';

// Each product's mark is one form of the same branching rule (src/visuals/elan.js draws it into the canvas).
const FORM_OF = { syberwork: 0, attest: 1, rise: 2, flyspace: 3 };

// The states a line of evidence can have, strongest first, in the words the product pages and the research index use.
const STATES = [['deployed', 'Deployed'], ['measured', 'Measured'], ['tested', 'Tested'], ['implemented', 'Implemented'], ['not yet', 'Not yet']];
const word = Object.fromEntries(STATES);
// The workflow keeps one unlaunched offer off the homepage, so a line that names it stays on the product page.
const evidence = p => (p.evidence || []).filter(([state, text]) => word[state] && !/RISE Plus/.test(text));
const counts = lines => STATES.map(([state, name]) => [name.toLowerCase(), lines.filter(([s]) => s === state).length])
  .filter(([, n]) => n).map(([name, n]) => `${n} ${name}`).join(', ');

function proof(p) {
  const lines = evidence(p);
  if (!lines.length) return '';
  return `
          <details class="home-proof" name="proof">
            <summary><b>Evidence</b> <span>${counts(lines)}</span></summary>
            <ul class="home-proof__list" role="list">${lines.map(([state, text]) => `
              <li class="is-${state.replace(/\s+/g, '-')}"><span class="home-proof__state"><i aria-hidden="true"></i>${word[state]}</span><p>${esc(text)}</p></li>`).join('')}
            </ul>
          </details>`;
}

const row = p => {
  const ledger = proof(p);
  return `
        <li${ledger ? ' class="has-proof"' : ''}><a href="/projects/${p.slug}/" data-glow>
          <canvas class="home-rows__mark" data-form="${FORM_OF[p.slug]}" aria-hidden="true"></canvas>
          <span class="home-rows__name">${esc(p.name)} <small>${esc(p.category)}</small></span>
          <span class="home-rows__line">${esc(p.headline)}</span>
          <span class="home-rows__meta">${status(p.status)}<span class="home-rows__ref">${p.reflects.split(' · ').map(part => `<span>${esc(part)}</span>`).join(' ')}</span></span>
        </a>${ledger}
        </li>`;
};

export const products = () => `<section id="products" class="home-part" aria-labelledby="products-title">
      <div class="sy-wrap">
        ${head('products-title', 'Products', '<a href="/factory/">How SyberWork processes a code change</a>')}
        <ul class="home-rows" role="list">${projects.map(row).join('')}
        </ul>
        <p id="partners" class="home-note"><span class="home-label">Design partnership</span><span><b>GitHits.</b> Python client and Claude Code integration, both built and verified through SyberWork. Tested against a local API stand-in; no live usage or savings claimed. <a href="/services/#partnerships">Design partnerships</a></span></p>
      </div>
    </section>`;
