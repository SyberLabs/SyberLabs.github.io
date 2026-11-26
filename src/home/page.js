// The homepage, as HTML: one small visual and one link. The build writes this into index.html (vite.config.js), so
// the page a browser receives is complete without JavaScript. src/home/main.js then mounts the visual.
//
// Since November 25, 2026 the homepage is Elan (src/visuals/elan.js) alone on the Midnight ground, by the owner's
// direction, with Menu under it: the site's one directory (projects/project-template.js), which opens and closes
// without JavaScript and lists every product, the research, the overview page, privacy and the account route.
// Everything the homepage carried before is on the overview page (/overview/, src/overview/). There is no header and
// no footer here; the page's name is its only words, kept for screen readers and for a browser without scripts.
// The visual is itself a link: a press opens Elan full screen at /elan/ (src/elan/), where it starts close and draws
// back as the figure grows.
import { menu } from '../../projects/project-template.js';

// Everything inside <body>, between the email_off comments index.html already carries.
export const renderHome = () => `<main id="main" class="home">
    <h1 class="home-name">SyberLabs</h1>
    <a class="home-view" href="/elan/" aria-label="Open Elan full screen"><canvas class="home-elan" data-visual="elan" role="img" aria-label="Loose dots drift, then dock one by one into a branching figure in which each finished strand forks into two. The figure lights, lets go and builds again in another form."></canvas></a>
    ${menu('/', { cls: 'home-menu', icon: false })}
  </main>`;
