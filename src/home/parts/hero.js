// The first screen: the headline, what the company makes, the one action, and the Line (src/visuals/line.js), an
// illustration in which a model proposes changes and the visitor is the person who approves them. The five steps are
// a list in the markup: with JavaScript each name is set beside its station on the canvas, and without it the list
// reads as it is.
// The headline is the page's one motto, chosen by the owner (CLAUDE.md, "Wording"). It is after the Royal Society's
// "Nullius in verba", take nobody's word for it. The line under it says in plain words what the company makes.
import { CONSULT } from '../../../projects/site-data.js';

// SyberWork's five steps, in the factory page's words (/factory/).
const STEPS = [
  ['propose', 'Propose', 'A model proposes a change and reports its own test result.'],
  ['check', 'Check', 'SyberWork runs the checks on the files in the change.'],
  ['review', 'Review', 'A separate reviewer examines the change.'],
  ['approve', 'Approve', 'A person approves it.'],
  ['publish', 'Publish', 'The change is published after that approval.'],
];

export const hero = () => `<section class="home-hero" aria-labelledby="hero-title">
      <canvas class="home-hero__canvas" data-visual="line" aria-hidden="true"></canvas>
      <div class="home-hero__in sy-wrap">
        <div class="home-hero__copy">
          <p class="home-flag"><a href="/psycho-syber/"><span class="home-flag__name"><span class="home-play__p">PSYCHO</span> <span class="home-play__s">SYBER</span></span><span class="home-flag__what">A browser game in six stages</span><span class="home-flag__go">Play the game</span></a></p>
          <h1 id="hero-title" tabindex="-1">Take no machine at its word.</h1>
          <p class="home-hero__what">SyberLabs is an AI lab. It makes software for checking AI&rsquo;s work.</p>
          <p class="home-hero__line">SyberWork, its software factory, runs the checks on each change an AI agent proposes, and a person approves it before anything is published.</p>
          <p class="home-hero__actions"><a class="sy-btn sy-btn--solid" href="${CONSULT}">Book a consultation</a><a class="sy-btn sy-btn--line" href="#research">Read the research</a></p>
        </div>
        <figure class="home-line" data-line>
          <div class="home-line__zone" data-line-zone>
            <p class="home-line__model"><b>Model</b> <span class="home-line__tally" data-line-model></span></p>
            <ol class="home-line__steps" aria-label="How SyberWork handles a change">${STEPS.map(([key, name, what]) => `
              <li data-step="${key}"><b>${name}</b> <span class="home-line__what">${what}</span> <span class="home-line__tally" data-tally="${key}"></span></li>`).join('')}
            </ol>
            <button class="home-line__approve" type="button" data-line-approve hidden>Approve</button>
          </div>
          <figcaption>
            <p class="home-line__state" data-line-state role="status"></p>
            <p class="home-line__note">The picture is an illustration with invented changes, drawn in your browser. <a href="#run">SyberWork&rsquo;s recorded run</a> is below.</p>
          </figcaption>
        </figure>
      </div>
    </section>`;
