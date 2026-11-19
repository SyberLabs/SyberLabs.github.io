// The first screen: the headline, what the company makes, the one action, and the Line (src/visuals/line.js), an
// illustration in which a model proposes changes and the visitor is the person who approves them. The five steps are
// a list in the markup: with JavaScript each name is set beside its station on the canvas, and without it the list
// reads as it is.
// The headline is the page's one motto, chosen by the owner (CLAUDE.md, "Wording"). It is after the Royal Society's
// "Nullius in verba", take nobody's word for it. The line under it says in plain words what the company makes.
import { CONSULT } from '../../../projects/site-data.js';

// SyberWork's five steps, in the factory page's words (/factory/).
const STEPS = [
  ['propose', 'Propose', 'An agent submits a code change and self-reported test status.'],
  ['check', 'Check', 'SyberWork independently runs contract checks on the exact diff.'],
  ['review', 'Review', 'A separate reviewer inspects the change.'],
  ['approve', 'Approve', 'A named human signs off.'],
  ['publish', 'Publish', 'Approved changes move to their target branch.'],
];

export const hero = () => `<section class="home-hero" aria-labelledby="hero-title">
      <canvas class="home-hero__canvas" data-visual="line" aria-hidden="true"></canvas>
      <div class="home-hero__in sy-wrap">
        <div class="home-hero__copy">
          <h1 id="hero-title" tabindex="-1">Take no machine at its word.</h1>
          <p class="home-hero__what">SyberLabs builds verification software for AI systems.</p>
          <p class="home-hero__line">Our flagship runtime, SyberWork, tests every AI-proposed code change in isolation and requires human approval before anything ships.</p>
          <p class="home-hero__actions"><a class="sy-btn sy-btn--solid" href="${CONSULT}">Book a consultation</a><a class="sy-btn sy-btn--line" href="#research">Read the research</a></p>
        </div>
        <figure class="home-line" data-line>
          <div class="home-line__zone" data-line-zone>
            <p class="home-line__model"><b>Model</b> <span class="home-line__tally" data-line-model></span></p>
            <ol class="home-line__steps" aria-label="How SyberWork verifies a change">${STEPS.map(([key, name, what]) => `
              <li data-step="${key}"><b>${name}</b> <span class="home-line__what">${what}</span> <span class="home-line__tally" data-tally="${key}"></span></li>`).join('')}
            </ol>
            <button class="home-line__approve" type="button" data-line-approve hidden>Approve</button>
          </div>
          <figcaption>
            <p class="home-line__state" data-line-state role="status"></p>
            <p class="home-line__note">Interactive diagram using sample changes. <a href="#run">Verified execution output</a> appears below.</p>
          </figcaption>
        </figure>
      </div>
    </section>`;
