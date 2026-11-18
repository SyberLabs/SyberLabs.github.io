// The homepage, as HTML. A pure function of projects/site-data.js (and, for one check, research/index.html): the
// build writes its result into index.html (vite.config.js), so the page a browser receives is complete without
// JavaScript. src/home/main.js then mounts what moves.
//
// The page reads as an AI lab's: a first screen that says what the company makes and lets the visitor approve a
// change, then the evidence (SyberWork's recorded run), the products, the research with Lacuna Institute, the
// studio and contact. Each part is a module in src/home/parts/. No individual is named: the site speaks for the
// company. Wording follows CLAUDE.md: every line states a fact a reader can check or act on.
import { projects } from '../../projects/site-data.js';
import { header, footer } from '../../projects/project-template.js';
import { hero } from './parts/hero.js';
import { recordedRun } from './parts/run.js';
import { products } from './parts/products.js';
import { researchPart } from './parts/research.js';
import { studio } from './parts/studio.js';
import { contact } from './parts/contact.js';

const main = () => `<main id="main">
    ${hero()}
    ${recordedRun(projects.find(p => p.slug === 'syberwork'))}
    ${products()}
    ${researchPart()}
    ${studio()}
    ${contact()}
  </main>`;

// Everything inside <body>, between the email_off comments index.html already carries.
export const renderHome = () => `${header('', { here: '/', sticky: false, script: false })}
  ${main()}
  ${footer('/')}`;
