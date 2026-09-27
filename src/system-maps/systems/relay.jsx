import React from 'react';
import trace from '../../relay-trace.json';

const step = title => trace.steps.find(s => s.title === title);
const refusal = title => step(title).message;
const src = 'SyberLabs/relay';

const nodes = [
  { id: 'obs', n: ['Observation', '…/4455?utm…'], type: 'artifact', label: 'Posting observation', sub: '…/jobs/4455?utm…', x: 110, y: 92, m: [72, 222], about: 'An imported source record. Relay keeps it as an observations row; later imports add observations instead of overwriting this one.', owner: 'Relay stores it. The source note owns its text.', evidence: 'db/schema.ts observations' },
  { id: 'key', n: ['Canonical key'], type: 'record', label: 'Canonical key', sub: 'greenhouse:acme:4455', x: 110, y: 232, m: [72, 322], about: 'jobKey(url) resolves known Greenhouse aliases and strips tracking parameters. Matching keys join the same job history.', owner: 'Relay code (deterministic).', evidence: 'lib/domain.ts jobKey' },
  { id: 'job', n: ['Job record', 'v3 · Held'], type: 'record', label: 'Job record', sub: 'version 3 · Held', x: 310, y: 162, m: [200, 222], about: 'The owner-scoped jobs row: status, draft, blocker, accepted_draft, and a version that every write must match.', owner: 'Relay, scoped to the signed-in owner.', evidence: 'db/schema.ts jobs' },
  { id: 'facts', n: ['Facts', '2 confirmed'], type: 'record', label: 'Confirmed facts', sub: '2 user-confirmed claims', x: 110, y: 392, m: [72, 422], about: '“Verified” records that you confirmed the claim. Relay does not independently verify it.', owner: 'The user confirms; the agent reads and never writes.', evidence: 'README, Candidate facts' },
  { id: 'packet', n: ['Packet'], type: 'artifact', label: 'Bounded packet', sub: `${step('Build the bounded packet').result.promptChars.toLocaleString()} chars`, x: 510, y: 92, m: [328, 222], about: 'assistantPrompt serializes only the selected job, the cited facts and the current draft, and labels the JSON as untrusted source data.', owner: 'Relay decides what leaves.', evidence: 'lib/assistant-handoff.ts assistantPrompt' },
  { id: 'assistant', n: ['Assistant'], type: 'external', label: 'External assistant', sub: 'no write access', x: 808, y: 92, m: [110, 84], about: 'Any outside model or tool. In this recording the draft was supplied; no model was called.', owner: 'None over Relay state. It can only return text.', evidence: 'README, Integrations' },
  { id: 'draft', type: 'artifact', label: 'Returned draft', sub: 'relay.draft.v1', x: 808, y: 212, m: [290, 84], about: 'Text proposed from outside. It is staged for review, never persisted as accepted.', owner: 'Nobody yet: it is a proposal.', evidence: 'lib/assistant-handoff.ts assistantResult' },
  { id: 'gateId', n: ['ID + version', 'rejects stale'], type: 'gate', label: 'Identity + version', sub: 'rejects stale work', x: 510, y: 252, m: [328, 322], about: 'The returned draft must name the same job key and the current version. A mismatch or stale packet is refused before review.', owner: 'Relay code.', evidence: 'lib/assistant-handoff.ts' },
  { id: 'gateClaim', n: ['Claim gate', 'word overlap'], type: 'gate', label: 'Claim gate', sub: 'word + number overlap', x: 510, y: 392, m: [328, 422], about: 'unsupportedClaims flags claim sentences whose words and numbers are not covered by a cited fact. It is a heuristic: passing does not establish truth.', owner: 'Relay code (heuristic).', evidence: 'lib/profile.ts unsupportedClaims' },
  { id: 'human', n: ['Reviewer'], type: 'human', label: 'Human reviewer', sub: 'signed-in owner', x: 808, y: 392, m: [200, 636], about: 'The only actor who can accept exact wording. Changing accepted text requires a new review.', owner: 'The owner, in the signed-in workspace.', evidence: 'lib/domain.ts validateEdit' },
  { id: 'accepted', n: ['Accepted text'], type: 'record', label: 'Accepted text', sub: 'none yet', x: 310, y: 452, m: [200, 520], about: 'accepted_draft stores the exact approved text. The same write advances the job version and records a “Draft accepted” event.', owner: 'Written only by saveJobReview after a human accept.', evidence: 'lib/job-review.ts saveJobReview' },
];

const edges = [
  { id: 'e1', from: 'obs', to: 'key', label: 'canonicalizes', about: 'The posting URL is reduced to a stable identity.' },
  { id: 'e2', from: 'key', to: 'job', label: 'identifies', bend: 10, about: 'Matching keys join one job history.' },
  { id: 'e3', from: 'job', to: 'packet', label: 'bounded into', bend: -14, about: 'Only the selected job enters the packet.' },
  { id: 'e4', from: 'facts', to: 'packet', label: 'cited in', bend: 40, about: 'Confirmed facts are cited for the assistant.' },
  { id: 'e5', from: 'packet', to: 'assistant', label: 'handed off', about: 'An explicit file, prompt or tool handoff. Nothing syncs in the background.' },
  { id: 'e6', from: 'assistant', to: 'draft', label: 'returns', about: 'The assistant can only return text.' },
  { id: 'e7', from: 'draft', to: 'gateId', label: 'checked by', about: 'Re-entry into Relay starts with identity and version.' },
  { id: 'e8', from: 'gateId', to: 'gateClaim', label: 'then', about: 'Claim checking follows identity checking.' },
  { id: 'e9', from: 'facts', to: 'gateClaim', label: 'grounds', bend: 26, about: 'The gate compares each claim with the cited facts.' },
  { id: 'e10', from: 'gateClaim', to: 'human', label: 'flags for review', about: 'Unsupported sentences are shown to the reviewer.' },
  { id: 'e11', from: 'human', to: 'accepted', label: 'accepts exact text', bend: -30, about: 'Acceptance belongs to the specific wording.' },
  { id: 'e12', from: 'accepted', to: 'job', label: 'writes version + 1', bend: 14, about: 'The write is version-checked; a stale version is refused.' },
];

const frames = [
  { title: 'Canonicalize the posting', grade: 'recorded', outcome: 'Relay derived the job identity', travel: ['e1', 'e2'], focus: ['key'], set: { obs: 'ok', key: 'ok', job: 'ok' },
    detail: `jobKey resolved the Greenhouse alias and removed utm_campaign and gh_src. Result: ${step('Canonicalize the posting').result.key}.`,
    authority: 'Relay code. No actor chooses the identity.', source: 'lib/domain.ts jobKey' },
  { title: 'A packet whose key does not match its URL', grade: 'recorded', kind: 'refused', outcome: 'Refused · nothing left Relay', blocked: ['e3'], focus: ['packet'], set: { packet: 'refused' },
    detail: `The packet declared greenhouse:other:9999 for the Acme URL. assistantPrompt threw: “${refusal('Packet whose key does not match its URL')}”`,
    authority: 'Relay code refuses before any text leaves.', source: 'lib/assistant-handoff.ts assistantPrompt' },
  { title: 'Build the bounded packet', grade: 'recorded', outcome: 'Packet prepared for handoff', travel: ['e3', 'e4'], focus: ['packet'], set: { packet: 'ok', facts: 'ok' },
    detail: `Only the selected job, two cited facts and the current draft: ${step('Build the bounded packet').result.promptChars.toLocaleString()} characters, labelled as untrusted source data.`,
    authority: 'Relay decides what leaves. The owner chooses when to hand it off.', source: 'lib/assistant-handoff.ts assistantPrompt' },
  { title: 'The assistant returns a draft', grade: 'recorded', outcome: 'Text crossed back into Relay as a proposal', travel: ['e5', 'e6'], focus: ['draft'], set: { assistant: 'ok', draft: 'active' },
    detail: `“${trace.draft}” The draft was supplied for this recording; no model was called.`,
    authority: 'The assistant has no write access. It can only return text.', source: 'SyberLabs/cross-platform scenario input' },
  { title: 'Re-validate identity and version', grade: 'recorded', outcome: 'Staged for review', travel: ['e7'], focus: ['gateId'], set: { gateId: 'ok', draft: 'ok' },
    detail: `assistantResult accepted schema ${step('Re-validate identity and version').result.schema} for job version ${step('Re-validate identity and version').result.jobVersion}, marked reviewRequired: true.`,
    authority: 'Relay code.', source: 'lib/assistant-handoff.ts assistantResult' },
  { title: 'The claim gate flags a sentence', grade: 'recorded', kind: 'flag', outcome: '1 of 2 claims unsupported', travel: ['e8', 'e9', 'e10'], focus: ['gateClaim', 'human'], set: { gateClaim: 'flag', human: 'ok' },
    detail: `Flagged: “${step('Claim gate').result.unsupported[0]}” No cited fact covers a team of 12 or a PhD. The first sentence matched a fact; that is word overlap, not proof.`,
    authority: 'Relay code flags. The human decides.', source: 'lib/profile.ts unsupportedClaims' },
  { title: 'A packet against a stale version', grade: 'recorded', kind: 'refused', outcome: 'Refused · nothing left Relay', blocked: ['e3'], focus: ['gateId'],
    detail: `A copy of the job at version 0 was refused: “${refusal('Packet against a stale version')}”`,
    authority: 'Relay code.', source: 'lib/assistant-handoff.ts assistantPrompt' },
  { title: 'Accept while a blocker is open', grade: 'recorded', kind: 'refused', outcome: 'Refused · nothing written', blocked: ['e11'], focus: ['human'],
    detail: `The reviewer tried to mark the over-claiming draft Ready with a blocker recorded: “${refusal('Accept while a blocker is open')}”`,
    authority: 'The human proposes; validateEdit refuses.', source: 'lib/domain.ts validateEdit' },
  { title: 'Accept against an old version', grade: 'recorded', kind: 'refused', outcome: 'Refused · nothing written', blocked: ['e11'], focus: ['job'],
    detail: `An editor loaded at version 2 tried to save over version 3: “${refusal('Accept against version 2 after the record moved to 3')}”`,
    authority: 'Version checks override any actor.', source: 'lib/domain.ts validateEdit' },
  { title: 'Mark submitted from the editor', grade: 'recorded', kind: 'refused', outcome: 'Refused · nothing written', blocked: ['e11'], focus: ['human'],
    detail: `“${refusal('Mark submitted from the editor')}” Submission is recorded with a receipt, not set from the editor.`,
    authority: 'Relay code.', source: 'lib/domain.ts validateEdit' },
  { title: 'Accept the revised exact text', grade: 'rule', kind: 'ok', outcome: 'Accepted · version 3 → 4', travel: ['e11', 'e12'], focus: ['accepted', 'job'], set: { accepted: 'ok', gateClaim: 'ok' }, sub: { accepted: '“I shipped 4 …”', job: 'version 4 · Ready' },
    detail: 'The reviewer removed the unsupported sentence and accepted “I shipped 4 production services at Acme.” validateEdit permitted it (recorded). The write itself, saveJobReview, needs the D1 database and was not executed here.',
    authority: 'Human acceptance, bound to this wording and version.', source: 'lib/domain.ts validateEdit · lib/job-review.ts saveJobReview' },
];

function Readout({ index }) {
  const version = index >= 10 ? 4 : 3;
  return <div className="readout-grid">
    <div><span>JOB RECORD</span><strong>greenhouse:acme:4455</strong><p>version {version} · {index >= 10 ? 'Ready' : 'Held'}</p></div>
    <div><span>CITED FACTS</span>{trace.facts.map(f => <p key={f}>{f}</p>)}</div>
    <div><span>ACCEPTED TEXT</span><p className={index >= 10 ? '' : 'is-empty'}>{index >= 10 ? 'I shipped 4 production services at Acme.' : 'Nothing accepted. Acceptance requires a human.'}</p></div>
    <div><span>RECORDING</span><p>{src} @ {trace.commit} · Node {trace.node}</p><p>{trace.steps.filter(s => s.outcome === 'refused').length} refusals, 0 writes by the assistant</p></div>
  </div>;
}

export default {
  id: 'relay', name: 'Relay', form: 'Provenance graph', grade: 'recorded',
  summary: 'A job’s sources, the bounded handoff, the returned draft, and the human acceptance that is the only way wording becomes approved.',
  wide: [960, 540], narrow: [400, 700],
  regions: [
    { id: 'relay', label: 'RELAY · OWNER-SCOPED STATE', at: [18, 18, 622, 504], m: [8, 170, 384, 400] },
    { id: 'out', kind: 'external', label: 'OUTSIDE RELAY · NO WRITE ACCESS', at: [660, 18, 282, 266], m: [8, 18, 384, 136] },
    { id: 'human', kind: 'human', label: 'HUMAN · SIGNED-IN WORKSPACE', at: [660, 300, 282, 222], m: [8, 584, 384, 104] },
  ],
  nodes, edges, frames, Readout,
  evidence: [`${src} @ ${trace.commit}`, 'scripts/export-relay-trace.mjs'],
};
