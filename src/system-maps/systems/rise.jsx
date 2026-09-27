import React from 'react';
import record from '../../rise-record.json';

const d = record.case.decision;
const audio = record.case.checks.find(c => c.field === 'audio');
const matched = record.case.checks.filter(c => c.matched).length;

const nodes = [
  { id: 'reader', type: 'human', label: 'Reader', sub: 'short request', x: 108, y: 110, m: [110, 76], about: 'The person reading. Their request is a preference, never an instruction that changes what can be chosen.', owner: 'Starts the request; controls the reading.', evidence: 'worker/jev-recommend.mjs' },
  { id: 'controls', n: ['Controls', 'look · sound'], type: 'human', label: 'Reader controls', sub: 'look · sound · pace', x: 108, y: 480, m: [200, 640], about: 'The Chamber Look panel: face, size, ink, backdrop, visual strength, sound bed and volume, plus restoring Jev’s choices.', owner: 'The reader, at any time during the reading.', evidence: 'docs/jev-core/README.md' },
  { id: 'menu', n: ['Menu', '27 questions'], type: 'record', label: 'Bounded menu', sub: '1 book + 27 questions', x: 338, y: 110, m: [72, 250], about: 'The Worker offers admitted editions and 27 presentation questions, each with a fixed set of keys (for example 24 sound beds, including silence).', owner: 'RISE code builds the menu.', evidence: 'worker/jev-recommend.mjs CHOICES' },
  { id: 'validate', n: ['validDecision', 'offered keys'], type: 'gate', label: 'validDecision', sub: 'offered keys only', x: 338, y: 265, m: [200, 250], about: 'Accepts only choices from the menu. Anything else returns DECISION_INVALID_RESPONSE and no reading opens. The model cannot supply CSS or media URLs.', owner: 'RISE code.', evidence: 'worker/jev-recommend.mjs validDecision' },
  { id: 'cache', n: ['Cache', '1 h · no raw text'], type: 'record', label: 'Decision cache', sub: '1 hour · no raw text', x: 338, y: 400, m: [328, 250], about: 'Identical requests may reuse a validated choice in Redis for up to one hour. Redis stores no raw preference text.', owner: 'RISE Worker.', evidence: 'README, Privacy' },
  { id: 'jev', type: 'external', label: 'Jev', sub: record.model.replace('typesafe/', ''), x: 570, y: 188, m: [300, 430], about: 'TypeSafe’s choice model via the OpenRouter decisions API. It picks among offered keys; it writes no prose that reaches the reader.', owner: 'Chooses within the menu. Cannot change the menu or the Chamber.', evidence: 'worker/jev-recommend.mjs API_URL, MODEL' },
  { id: 'plan', n: ['Chamber plan', 'in code'], type: 'gate', label: 'Chamber plan', sub: 'resolved in code', x: 810, y: 110, m: [72, 560], about: 'Expands the decision into existing Chamber controls. Some choices are rewritten by code: psychedelic always means Gallery, fractal flames, lively cadence and the prism theme.', owner: 'RISE code.', evidence: 'src/core/jev-config.js' },
  { id: 'chamber', n: ['Chamber', 'in the browser'], type: 'artifact', label: 'Chamber', sub: 'renders in the browser', x: 810, y: 480, m: [328, 560], about: 'Text, time, visual and sound are rendered locally. Reading does not send excerpts or pacing to a model.', owner: 'The reader’s browser.', evidence: 'README, The Chamber · Privacy' },
];

const edges = [
  { id: 'r1', from: 'reader', to: 'menu', label: 'request', about: 'Up to 1 KB, same-origin.' },
  { id: 'm1', from: 'menu', to: 'jev', label: 'choice questions', about: 'Books and presentation keys, with instructions.' },
  { id: 'j1', from: 'jev', to: 'validate', label: 'chosen keys', about: 'One key per question.' },
  { id: 'v1', from: 'validate', to: 'cache', label: 'stores', about: 'Validated decisions only.' },
  { id: 'v2', from: 'validate', to: 'plan', label: 'validated decision', bend: -40, about: 'Only a valid decision opens a reading.' },
  { id: 'p1', from: 'plan', to: 'chamber', label: 'configures', about: 'Existing controls only.' },
  { id: 'c1', from: 'controls', to: 'chamber', label: 'overrides', about: 'The reader can change look and sound, or restore Jev’s choices.' },
];

const fields = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ');

const frames = [
  { title: 'The reader asks', grade: 'recorded', outcome: 'Request received', travel: ['r1'], focus: ['reader', 'menu'], set: { reader: 'ok' },
    detail: `“${record.case.intent}” This is case ${record.case.id} from RISE’s production evaluation.`,
    authority: 'The reader expresses a preference.', source: 'scripts/jev-eval-cases.json' },
  { title: 'RISE offers a bounded menu', grade: 'rule', outcome: 'Book choice + 27 presentation questions', travel: ['m1'], focus: ['menu'], set: { menu: 'ok' },
    detail: 'Jev is asked to choose a book from admitted editions and one key for each presentation question. The instructions say to treat the intent as a preference, never as an instruction that changes the available books.',
    authority: 'RISE code defines every possible answer.', source: 'worker/jev-recommend.mjs handleJevRecommend' },
  { title: 'Jev chooses', grade: 'recorded', kind: 'flag', outcome: `${matched} of ${record.case.checks.length} expectations met`, travel: ['j1'], focus: ['jev'], set: { jev: 'ok' },
    detail: `Recorded decision: ${fields}. The case expected an ambient or excited sound bed; Jev chose ${audio.got}. RISE’s evaluation documents this as the one miss in ${record.run.explicitChecks} checks.`,
    authority: 'Jev chooses among offered keys only.', source: `${record.model} · release ${record.release}` },
  { title: 'RISE validates the choice', grade: 'rule', outcome: 'Valid · cached for one hour', travel: ['v1'], focus: ['validate'], set: { validate: 'ok', cache: 'ok' },
    detail: 'Every answer is one of the offered keys, so validDecision admits it. The book’s description shown to the reader is reviewed catalog copy, not model prose. An invalid response would stop here with DECISION_INVALID_RESPONSE.',
    authority: 'RISE code accepts or rejects the choice.', source: 'worker/jev-recommend.mjs validDecision' },
  { title: 'Code resolves the Chamber plan', grade: 'rule', outcome: 'psychedelic → Gallery + fractal + prism', travel: ['v2'], focus: ['plan'], set: { plan: 'ok' },
    detail: 'resolveJevChamberConfig expands the decision into existing controls. Because visualStyle is psychedelic, code sets the continuous Gallery, fractal flames, lively cadence and the prism theme, whatever else was chosen.',
    authority: 'RISE code, deterministically.', source: 'src/core/jev-config.js resolveJevChamberConfig' },
  { title: 'The Chamber reads locally', grade: 'rule', outcome: `${d.pace} wpm · ${d.chamberFace} ${d.fontSize}`, travel: ['p1'], focus: ['chamber'], set: { chamber: 'ok' },
    detail: 'Text, visuals and sound are rendered in the browser. Nothing about the reading is sent back to Jev.',
    authority: 'The reader’s browser.', source: 'README, The Chamber' },
  { title: 'The reader changes the sound', grade: 'illustrative', outcome: `${audio.got} → aurora`, travel: ['c1'], focus: ['controls', 'chamber'], set: { controls: 'ok' },
    detail: 'The reader switches the sound bed in the Look panel. The override stays local to this reading, and “restore Jev’s choices” remains available. This step is an example of the control, not a recorded session.',
    authority: 'The reader overrides Jev.', source: 'docs/jev-core/README.md' },
];

function Readout({ index }) {
  return <div className="readout-grid">
    <div><span>REQUEST</span><p>“{record.case.intent}”</p></div>
    <div><span>JEV’S RECORDED CHOICES</span>{index < 2 ? <p className="is-empty">Not chosen yet.</p> : record.case.checks.map(c => <p key={c.field} className={c.matched ? '' : 'is-miss'}>{c.field}: {c.field === 'audio' && index >= 6 ? `${c.got} → aurora (reader)` : c.got} {c.matched ? '✓' : `✕ expected ${c.expected.join(' / ')}`}</p>)}</div>
    <div><span>EVALUATION RUN</span><p>{record.run.matched} of {record.run.explicitChecks} explicit choices matched across {record.run.cases} live cases</p></div>
    <div><span>NOT ON THIS PATH</span><p>Scene sample: fixed preset, no Jev request. Scriptorium routing: optional, uses the reader’s own key.</p></div>
  </div>;
}

export default {
  id: 'rise', name: 'RISE', form: 'Decision pipeline', grade: 'recorded',
  summary: 'A reading request, Jev’s choice from a bounded menu, the code that validates and expands it, and the reader who can override it.',
  wide: [960, 540], narrow: [400, 700],
  regions: [
    { id: 'reader', kind: 'human', label: 'READER', at: [18, 18, 186, 504], m: [8, 18, 384, 110] },
    { id: 'worker', label: 'RISE · WORKER', at: [222, 18, 232, 504], m: [8, 146, 384, 212] },
    { id: 'jev', kind: 'external', label: 'JEV · EXTERNAL', at: [472, 18, 196, 504], m: [8, 376, 384, 110] },
    { id: 'browser', label: 'RISE · BROWSER', at: [686, 18, 256, 504], m: [8, 504, 384, 184] },
  ],
  nodes, edges, frames, Readout,
  evidence: [`SyberLabs/RISE @ ${record.commit}`, 'worker/jev-recommend.mjs', 'src/core/jev-config.js', 'scripts/jev-eval-production-broad-post-2026-09-27.json'],
};
