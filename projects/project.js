const projects = {
  rise: {
    name: 'RISE', category: 'Reading interface', number: '01', color: '#a68bff',
    headline: 'Read beyond the page.',
    description: 'RISE lets a text unfold over time in Stream or sit in space in Page. Move between the two ways of reading without losing your place.',
    status: 'Live app · sign-in required',
    actions: [['Open RISE app ↗', 'https://rise.syberlabs.io/'], ['Watch the demo ↗', '/rise-demo/']],
  },
  commons: {
    name: 'Commons', category: 'Mission coordination', number: '02', color: '#adf19b',
    headline: 'Move a mission forward.',
    description: 'Commons organizes a shared problem from need and evidence through an approved plan, execution, milestone review, and outcome. The current prototype runs locally with synthetic data.',
    status: 'Local prototype · private repository', actions: [['View private repository ↗', 'https://github.com/SyberLabs/commons']],
  },
  relay: {
    name: 'Relay', category: 'Application workspace', number: '03', color: '#64e0da',
    headline: 'Keep decisions in view.',
    description: 'Relay brings job research, application history, and draft review into one focused workspace with explicit handoffs.',
    status: 'Research project', actions: [['View source ↗', 'https://github.com/SyberLabs/relay']],
  },
  omnios: {
    name: 'OmniOS', category: 'Spatial AI workspace', number: '04', color: '#ef91d4',
    headline: 'Think in more dimensions.',
    description: 'OmniOS explores a typed canvas for arranging data, notes, AI personas, and analytical blocks in space.',
    status: 'Research project', actions: [['View source ↗', 'https://github.com/SyberLabs/OmniOS']],
  },
  osahr: {
    name: 'OSAHR', category: 'Simulation research', number: '05', color: '#f0c487',
    headline: 'Let systems evolve.',
    description: 'OSAHR investigates stochastic adaptive graph rewriting on typed directed hypergraphs.',
    status: 'Open research', actions: [['View source ↗', 'https://github.com/SyberLabs/OSAHR_Cell']],
  },
};

const slug = location.pathname.split('/').filter(Boolean).at(-1);
const project = projects[slug];
if (!project) location.replace('/');
else {
  document.title = `${project.name} — SyberLabs`;
  document.documentElement.style.setProperty('--accent', project.color);
  document.querySelector('meta[name="description"]').content = project.description;
  document.getElementById('app').innerHTML = `
    <header><a class="brand" href="/">◉ SyberLabs</a><a href="/#work">← All projects</a></header>
    <main>
      <div class="copy"><p class="eyebrow">SYBERLABS / ${project.number} / ${project.category}</p><h1>${project.headline}</h1><p class="intro">${project.description}</p><p class="status"><span></span>${project.status}</p>
      <div class="actions">${project.actions.map(([label, url]) => `<a href="${url}">${label}</a>`).join('')}</div></div>
      <div class="art" aria-hidden="true"><div class="orbit one"></div><div class="orbit two"></div><div class="sphere"></div><div class="core"></div><span>${project.name}</span></div>
    </main><footer><a href="mailto:syberlabs.software@gmail.com">Start a conversation ↗</a><span>© 2026 SyberLabs</span></footer>`;
}
