import React from 'react';

// Rule-based map of RISE's reader-owned decision contract (src/core/decision/ at 998d725).
// The path is reproduced from the cited files over one illustrative request; no model was called.
// It replaces the earlier recorded map of the Worker-side Jev route, which RISE #294 retired.

const REQUEST = 'Something slow and calm tonight, with a little sound.';
const ANSWER = 'pace 150 · curve induction · chunk phrase · audio rain · visual focals · visualStyle gentle';

const nodes = [
  { id: 'reader', type: 'human', label: 'Reader', sub: 'short request', x: 108, y: 110, m: [110, 76], about: 'The person reading. Their request is a preference, never an instruction that changes what can be chosen. Reading and manual settings need no model at all.', owner: 'Starts the request; controls the reading.', evidence: 'src/core/decision/recommend.js' },
  { id: 'connection', n: ['Connection', 'yours, or none'], type: 'gate', label: 'Reader’s connection', sub: 'OpenRouter · local Kev · none', x: 108, y: 300, m: [110, 196], about: 'Connect OpenRouter (OAuth PKCE; the key lives in this tab’s memory and reaches only openrouter.ai) or run RISE locally with a pinned Kev-4B on loopback. With neither, an AI request is refused with NOT_CONNECTED and nothing else changes.', owner: 'The reader. No SyberLabs credential exists on this path.', evidence: 'src/core/ai-connection.js · docs/USER-OWNED-AI.md' },
  { id: 'controls', n: ['Controls', 'look · sound'], type: 'human', label: 'Reader controls', sub: 'look · sound · pace', x: 108, y: 480, m: [110, 640], about: 'The Chamber’s own controls: pace, visuals, sound bed and volume. Any choice the model made can be changed, and reading never waits on a model.', owner: 'The reader, at any time.', evidence: 'src/components (Chamber)' },
  { id: 'catalog', n: ['Catalog', 'static · public'], type: 'record', label: 'Public catalog', sub: '/content/catalog.json', x: 338, y: 110, m: [72, 320], about: 'Released books, active sounds and type options, public columns only, written by the build and served as a static file. Withdrawing a row is an editorial commit and a release.', owner: 'RISE code builds it; the Worker serves it.', evidence: 'src/core/decision/catalog.js · browser.js loadPublicCatalog' },
  { id: 'questions', n: ['Questions', 'finite choices'], type: 'record', label: 'Finite choice questions', sub: 'one key per question', x: 338, y: 300, m: [200, 320], about: 'recommend.js turns the catalog into choice questions: a book, then pace, curve, chunk, audio, visual, style, engine, arc and more, each with a fixed set of offered keys.', owner: 'RISE code defines every possible answer.', evidence: 'src/core/decision/recommend.js CHOICES' },
  { id: 'provider', n: ['Jev or Kev', 'one call'], type: 'external', label: 'Jev or Kev', sub: 'one call · deadline · no retry', x: 570, y: 188, m: [328, 320], about: 'Hosted Jev (typesafe/jev-1.13 through OpenRouter’s decisions API) or local Kev-4B. call.js makes exactly one call with a deadline and the reader’s cancel signal; a timeout, a 401, a 402 or a malformed answer ends the request without a paid retry. Neither model is a fallback for the other.', owner: 'Chooses within the offered keys. Cannot change the menu or the Chamber.', evidence: 'src/core/decision/call.js · providers.js' },
  { id: 'admit', n: ['Admission', 'offered keys only'], type: 'gate', label: 'Admission', sub: 'provider · model · offered keys', x: 570, y: 400, m: [200, 460], about: 'providers.js accepts a Jev answer only as provider TypeSafe with the jev-1.13 family, and a Kev answer only with the pinned X-Kev-Revision attestation. recommend.js then admits an answer only if every choice was offered. Anything else is INVALID_RESPONSE or UNATTESTED, and no reading opens.', owner: 'RISE code accepts or rejects the answer.', evidence: 'src/core/decision/providers.js validProviderResult · recommend.js' },
  { id: 'plan', n: ['Settings', 'in code'], type: 'gate', label: 'Reading settings', sub: 'resolved deterministically', x: 810, y: 110, m: [72, 560], about: 'An admitted answer is mapped to reading settings by deterministic code: an audio program, a visual program and a Chamber configuration. A model answer can select an offered value and nothing else.', owner: 'RISE code.', evidence: 'src/core/jev-config.js · src/core/jev-sequence.js' },
  { id: 'chamber', n: ['Chamber', 'in the browser'], type: 'artifact', label: 'Chamber', sub: 'renders in the browser', x: 810, y: 480, m: [328, 560], about: 'Text, time, visual and sound are rendered locally. Nothing about the reading is sent back to a model; the Worker calls no model and the six former inference routes answer 410.', owner: 'The reader’s browser.', evidence: 'worker/retired-inference.mjs · README' },
];

const edges = [
  { id: 'r1', from: 'reader', to: 'questions', label: 'request', bend: -30, about: 'A short preference in the reader’s words.' },
  { id: 'k1', from: 'catalog', to: 'questions', label: 'offers', about: 'Only released, active rows become choices.' },
  { id: 'c1', from: 'connection', to: 'provider', label: 'authorizes', bend: -40, about: 'The connection alone decides where the request goes and who pays. None: refused as NOT_CONNECTED.' },
  { id: 'q1', from: 'questions', to: 'provider', label: 'choice questions', about: 'Finite questions with their offered keys.' },
  { id: 'p1', from: 'provider', to: 'admit', label: 'answer', about: 'One key per question, with the provider and model label.' },
  { id: 'a1', from: 'admit', to: 'plan', label: 'admitted keys', bend: -60, about: 'Only an admitted answer reaches the settings.' },
  { id: 's1', from: 'plan', to: 'chamber', label: 'configures', about: 'Existing controls only.' },
  { id: 'o1', from: 'controls', to: 'chamber', label: 'overrides', about: 'The reader can change any setting during the reading.' },
];

const frames = [
  { title: 'The reader asks for a reading', grade: 'illustrative', outcome: 'Request held in the tab', travel: ['r1'], focus: ['reader', 'questions'], set: { reader: 'ok' },
    detail: `“${REQUEST}” The words are a preference. They cannot add a book, a sound or a visual that the catalog does not offer.`,
    authority: 'The reader expresses a preference.', source: 'src/core/decision/recommend.js' },
  { title: 'The catalog offers the menu', grade: 'rule', outcome: 'Finite questions, offered keys', travel: ['k1'], focus: ['catalog', 'questions'], set: { catalog: 'ok', questions: 'ok' },
    detail: 'The browser loads the public catalog from its own origin (cached for a minute) and recommend.js builds the choice questions from it: a book from the released editions, then pace, curve, chunk, audio, visual, style, engine and arc, each with a fixed set of keys.',
    authority: 'RISE code defines every possible answer.', source: 'browser.js loadPublicCatalog · recommend.js CHOICES' },
  { title: 'No connection: refused', grade: 'rule', kind: 'refused', outcome: 'NOT_CONNECTED · nothing changes', blocked: ['c1'], focus: ['connection'], set: { connection: 'error' },
    detail: 'Without an OpenRouter connection or a local RISE, the request stops here with a message that reading and manual settings work without either. No SyberLabs credential exists to fall back on.',
    authority: 'RISE code refuses.', source: 'src/core/decision/call.js MESSAGES.NOT_CONNECTED' },
  { title: 'The reader connects OpenRouter', grade: 'rule', outcome: 'One call, on the reader’s key', travel: ['c1', 'q1'], focus: ['connection', 'provider'], set: { connection: 'ok', provider: 'ok' },
    detail: 'OAuth PKCE mints a key in the reader’s own OpenRouter account; it lives in this tab’s memory and the page’s CSP lets it reach only openrouter.ai. call.js makes exactly one call with an 8-second deadline and the reader’s cancel signal. Running RISE locally takes the same path to a pinned Kev-4B on loopback instead.',
    authority: 'The reader’s connection authorizes and pays. No retry, no fallback.', source: 'src/core/openrouter-oauth.js · call.js DEFAULT_DEADLINE_MS' },
  { title: 'The model answers', grade: 'illustrative', outcome: 'One key per question', travel: ['p1'], focus: ['provider', 'admit'],
    detail: `Illustrative answer: ${ANSWER}. The model wrote no prose that reaches the reader; it chose among offered keys.`,
    authority: 'The model chooses within the menu only.', source: 'src/core/decision/providers.js JEV · KEV' },
  { title: 'An unoffered key: refused', grade: 'rule', kind: 'refused', outcome: 'INVALID_RESPONSE · no reading opens', blocked: ['a1'], focus: ['admit'], set: { admit: 'error' },
    detail: 'Suppose the answer named a visual the catalog did not offer, or arrived under the wrong provider or model label, or a local Kev without the pinned revision attestation. Admission refuses it and the reader sees a plain message. Nothing is retried on their account.',
    authority: 'RISE code accepts or rejects the answer.', source: 'providers.js validProviderResult · recommend.js' },
  { title: 'An admitted answer becomes settings', grade: 'rule', outcome: 'Deterministic mapping to the Chamber', travel: ['a1', 's1'], focus: ['plan', 'chamber'], set: { admit: 'ok', plan: 'ok', chamber: 'ok' },
    detail: 'Every key was offered, so the answer is admitted and mapped by code to an audio program, a visual program and a Chamber configuration. The Chamber renders text, time, visuals and sound in the browser; the Worker is not involved and calls no model.',
    authority: 'RISE code, deterministically; the reader’s browser renders.', source: 'src/core/jev-config.js · jev-sequence.js · worker/retired-inference.mjs' },
  { title: 'The reader changes the sound', grade: 'illustrative', outcome: 'rain → silence', travel: ['o1'], focus: ['controls', 'chamber'], set: { controls: 'ok' },
    detail: 'The reader switches the sound bed off in the Chamber. The override is local to this reading. This step is an example of the control, not a recorded session.',
    authority: 'The reader overrides the model.', source: 'src/components (Chamber controls)' },
];

const STATE = ['not asked', 'questions built', 'refused: not connected', 'call in flight', 'answered', 'refused: unoffered key', 'reading', 'reading · sound off'];

function Readout({ index }) {
  return <div className="readout-grid">
    <div><span>REQUEST</span><p>“{REQUEST}”</p></div>
    <div><span>STATE</span><p>{STATE[index]}</p></div>
    <div><span>WHO PAYS</span><p>{index >= 3 ? 'The reader’s OpenRouter account, or nobody when RISE runs locally with Kev.' : 'Nobody yet.'}</p></div>
    <div><span>NOT ON THIS PATH</span><p>The RISE Worker: it serves the app and the static catalog and answers the six former inference routes with 410. Composer in ChatGPT uses a different, sealed input (rise.current.v1).</p></div>
  </div>;
}

export default {
  id: 'rise', name: 'RISE', form: 'Decision contract', grade: 'rule',
  summary: 'A reading request, the finite menu RISE offers, one call on the reader’s own connection, the admission that accepts offered keys only, and the reader who can override everything.',
  wide: [960, 540], narrow: [400, 700],
  regions: [
    { id: 'reader', kind: 'human', label: 'READER', at: [18, 18, 186, 504], m: [8, 18, 384, 110] },
    { id: 'browser', label: 'RISE · BROWSER', at: [222, 18, 232, 504], m: [8, 146, 384, 212] },
    { id: 'model', kind: 'external', label: 'READER-OWNED MODEL', at: [472, 18, 196, 504], m: [8, 376, 384, 110] },
    { id: 'chamber', label: 'RISE · BROWSER', at: [686, 18, 256, 504], m: [8, 504, 384, 184] },
  ],
  nodes, edges, frames, Readout,
  evidence: ['SyberLabs/RISE @ 998d725', 'src/core/decision/recommend.js', 'src/core/decision/call.js', 'src/core/decision/providers.js', 'docs/USER-OWNED-AI.md'],
};
