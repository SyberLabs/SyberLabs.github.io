// Project pages ship prerendered HTML (scripts/prerender.mjs) so their text is readable
// without JavaScript. This module renders only as a fallback when the page arrives empty,
// then draws the project sigils (kit/v2/syber-sigil.js) as they scroll into view.
import { projects, renderProject } from './project-template.js';
import { drawAll } from '../kit/v2/syber-sigil.js';

const slug = location.pathname.split('/').filter(Boolean).at(-1);
const p = projects.find(item => item.slug === slug);
const app = document.getElementById('app');
if (!p) location.replace('/');
else {
  document.documentElement.style.setProperty('--accent', p.accent);
  document.documentElement.style.setProperty('--sy-accent', p.accent);
  if (!app.firstElementChild) {
    const page = renderProject(p);
    document.title = page.title;
    document.querySelector('meta[name="description"]').content = page.description;
    app.innerHTML = page.body;
  }
  drawAll(app);
  document.querySelector('.sy-menu nav')?.addEventListener('click', event => {
    if (event.target.closest('a')) event.currentTarget.closest('details').open = false;
  });
}
