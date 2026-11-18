// What the homepage's parts share: escaping, the status mark and the head of a part.
export const esc = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Status: a dot and a word. A lit dot means people can use it now.
export const status = s => `<span class="home-status${s.kind === 'live' ? ' is-live' : ''}"><i aria-hidden="true"></i>${esc(s.label)}</span>`;

// The head of a part: its name, and one link opposite it.
export const head = (id, title, aside = '') => `<header class="home-head"><h2 id="${id}">${title}</h2>${aside ? `<p class="home-head__aside">${aside}</p>` : ''}</header>`;
