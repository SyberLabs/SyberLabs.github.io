// The four products, one row each, and the design partnership. Each product is described once, by its headline in
// projects/site-data.js; the line under its status is the commit that page was checked against (`reflects`).
import { projects } from '../../../projects/site-data.js';
import { esc, head, status } from './html.js';

// Each product's mark is one form of the same branching rule (src/visuals/elan.js draws it into the canvas).
const FORM_OF = { syberwork: 0, attest: 1, rise: 2, flyspace: 3 };

const row = p => `
        <li><a href="/projects/${p.slug}/" data-glow>
          <canvas class="home-rows__mark" data-form="${FORM_OF[p.slug]}" aria-hidden="true"></canvas>
          <span class="home-rows__name">${esc(p.name)} <small>${esc(p.category)}</small></span>
          <span class="home-rows__line">${esc(p.headline)}</span>
          <span class="home-rows__meta">${status(p.status)}<span class="home-rows__ref">${p.reflects.split(' · ').map(part => `<span>${esc(part)}</span>`).join(' ')}</span></span>
        </a></li>`;

export const products = () => `<section id="products" class="home-part" aria-labelledby="products-title">
      <div class="sy-wrap">
        ${head('products-title', 'Products', '<a href="/factory/">How SyberWork handles a code change</a>')}
        <ul class="home-rows" role="list">${projects.map(row).join('')}
        </ul>
        <p id="partners" class="home-note"><span class="home-label">Design partnership</span><span><b>GitHits.</b> A Python client and a Claude Code integration for GitHits code search, both built through SyberWork. They were tested against a local stand-in for the API, so we claim no live usage or savings. <a href="/services/#partnerships">Design partnerships</a></span></p>
      </div>
    </section>`;
