// Latest: dated, linked changes across the repositories, newest first. Shown on the homepage
// (src/App.jsx Latest). Each entry names what merged or deployed and where the evidence is; the
// `state` follows the same discipline as project evidence rows (deployed, merged, decided, recorded).
// Keep this to the last few weeks and prune older entries rather than letting it grow.
export const latest = [
  { date: '2026-10-08', project: 'RISE Sketch', state: 'deployed', title: 'Ripple and kaleidoscope symmetry live at sketch.syberlabs.io',
    text: 'The drawing instrument gains its eleventh Form, Ripple (interference contours that beat into moiré), and a Free | Symmetry switch that folds every stroke into a mirror or up to 12 copies, each in its own hue with Spectral ink.',
    href: 'https://github.com/SyberLabs/RISE-Sketch/pull/10' },
  { date: '2026-10-05', project: 'Site', state: 'deployed', title: 'syberlabs.io re-pointed at what runs',
    text: 'RISE and the OmniOS preview one tap from the hero; Commons retired; SyberWork published; every project page carries why, use, inspect, design, evidence and facts, with the commit it reflects.',
    href: 'https://github.com/SyberLabs/SyberLabs.github.io/pull/56' },
  { date: '2026-10-05', project: 'RISE', state: 'recorded', title: 'Composer accepted in ChatGPT, in part',
    text: 'A controlled developer-mode session produced an admitted Current and narration the reader confirmed hearing. Interrupt, Stop and a refused compound request behaved as designed; full acceptance is not yet claimed.',
    href: 'https://github.com/SyberLabs/RISE/pull/414' },
  { date: '2026-10-04', project: 'RISE', state: 'decided', title: 'RISE in ChatGPT is a Composer',
    text: 'The host model composes one sealed Current, RISE admits it, the reader presses Begin. Realtime Live and Dive are out of current scope, after the host session showed a model’s later tool calls do not reach an open widget.',
    href: 'https://github.com/SyberLabs/RISE/pull/401' },
  { date: '2026-10-04', project: 'OmniOS', state: 'merged', title: 'Capability engine security close',
    text: 'The post-merge review of the server-side capability broker closed: caller inputs kept out of credential headers, canonical IPv6 and documentation-range checks, rate limits counted before the body is read.',
    href: 'https://github.com/SyberLabs/OmniOS/pull/78' },
  { date: '2026-10-03', project: 'OmniOS', state: 'deployed', title: 'Public preview live at omni.syberlabs.io',
    text: 'A limited preview on Cloudflare Workers: the canvas, the Shell Store and every keyless public source, with paid generation, keyed sources and ledger reads disabled at the route level.',
    href: 'https://github.com/SyberLabs/OmniOS/pull/79' },
  { date: '2026-10-01', project: 'OmniOS', state: 'merged', title: 'APIs on the fly: capability acquisition',
    text: 'An OpenAPI document, MCP tool schemas or a structured description compile into a capability manifest; write and destructive capabilities stay pending until approved.',
    href: 'https://github.com/SyberLabs/OmniOS/pull/70' },
  { date: '2026-10-01', project: 'SyberWork', state: 'merged', title: 'SyberWork and its SDK licensed Apache 2.0',
    text: 'The runtime, the reusable core package and the v0alpha1 protocol are open source under one license.',
    href: 'https://github.com/SyberLabs/SyberWork/pull/15' },
];
