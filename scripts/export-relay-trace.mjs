// Export a recorded Relay handoff for the homepage system maps.
//
// Calls the same Relay symbols as SyberLabs/cross-platform's relay sidecar, with
// the packet and over-claiming draft from its "The handoff is the object"
// scenario (platform/backend/scenarios.py), against a SyberLabs/relay
// checkout. It then calls lib/domain.ts validateEdit, the rule the workspace
// applies before saveJobReview writes accepted_draft. Nothing touches a database.
//
// Usage: node --experimental-strip-types scripts/export-relay-trace.mjs path/to/relay

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2]);
const load = (name) => import(pathToFileURL(path.join(root, name)).href);
const domain = await load('lib/domain.ts');
const profile = await load('lib/profile.ts');
const handoff = await load('lib/assistant-handoff.ts');

const OVERCLAIM = 'I shipped 4 production services at Acme. I also led a team of 12 engineers and hold a PhD in distributed systems.';
const PACKET = {
  schema: 'relay.packet.v1',
  job: {
    id: 'job_demo_001', key: 'greenhouse:acme:4455', name: 'Senior Platform Engineer',
    url: 'https://job-boards.greenhouse.io/acme/jobs/4455', version: 3, status: 'Held',
  },
  facts: 'Shipped 4 production services at Acme.\nLed the migration to Kubernetes across 3 teams.',
  draft: '',
};
const facts = PACKET.facts.split('\n').map((claim, i) => ({
  id: `packet-fact-${i}`, claim, status: 'Verified', tag: 'detail', confidence: 'high', expires: null,
}));

const steps = [];
function step(title, symbol, authority, fn) {
  try {
    const result = fn();
    steps.push({ title, symbol, authority, outcome: 'ok', result });
  } catch (error) {
    steps.push({ title, symbol, authority, outcome: 'refused', message: String(error.message).slice(0, 200) });
  }
}

step('Canonicalize the posting', 'lib/domain.ts jobKey', 'Relay', () => ({
  input: 'https://job-boards.greenhouse.io/acme/jobs/4455?utm_campaign=spring&gh_src=abc',
  key: domain.jobKey('https://job-boards.greenhouse.io/acme/jobs/4455?utm_campaign=spring&gh_src=abc', 'fallback'),
}));
step('Packet whose key does not match its URL', 'lib/assistant-handoff.ts assistantPrompt', 'Relay', () => {
  handoff.assistantPrompt({ ...PACKET, job: { ...PACKET.job, key: 'greenhouse:other:9999' } }, 'chatgpt', false, {});
  return {};
});
let prompt = '';
step('Build the bounded packet', 'lib/assistant-handoff.ts assistantPrompt', 'Relay', () => {
  prompt = handoff.assistantPrompt(PACKET, 'chatgpt', false, {});
  return { promptChars: prompt.length, marksUntrusted: prompt.includes('untrusted source data'), selectedJobOnly: prompt.includes(PACKET.job.key) };
});
let draft = null;
step('External assistant returns a draft', 'supplied draft (no model call)', 'External assistant: no write authority', () => ({ sentences: profile.sentences(OVERCLAIM).length }));
step('Re-validate identity and version', 'lib/assistant-handoff.ts assistantResult', 'Relay', () => {
  draft = handoff.assistantResult(PACKET, OVERCLAIM, 'chatgpt');
  return { schema: draft.schema, jobVersion: draft.job?.version, reviewRequired: draft.reviewRequired };
});
step('Claim gate', 'lib/profile.ts unsupportedClaims', 'Relay (heuristic)', () => ({
  unsupported: profile.unsupportedClaims(OVERCLAIM, facts),
  claims: profile.sentences(OVERCLAIM).filter(profile.isClaim).length,
}));
step('Packet against a stale version', 'lib/assistant-handoff.ts assistantPrompt', 'Relay', () => {
  handoff.assistantPrompt({ ...PACKET, job: { ...PACKET.job, version: 0 } }, 'chatgpt', false, {});
  return {};
});
const job = { status: 'Held', version: 3 };
step('Accept while a blocker is open', 'lib/domain.ts validateEdit', 'Human, in the signed-in workspace', () => {
  domain.validateEdit(job, { version: 3, status: 'Ready', draft: OVERCLAIM, blocker: 'Remove the unsupported team size and PhD.' });
  return {};
});
step('Accept against version 2 after the record moved to 3', 'lib/domain.ts validateEdit', 'Human, in the signed-in workspace', () => {
  domain.validateEdit(job, { version: 2, status: 'Ready', draft: 'I shipped 4 production services at Acme.', blocker: '' });
  return {};
});
step('Mark submitted from the editor', 'lib/domain.ts validateEdit', 'Human, in the signed-in workspace', () => {
  domain.validateEdit(job, { version: 3, status: 'Submitted', draft: 'I shipped 4 production services at Acme.', blocker: '' });
  return {};
});
step('Accept revised exact text', 'lib/domain.ts validateEdit', 'Human, in the signed-in workspace', () => {
  domain.validateEdit(job, { version: 3, status: 'Ready', draft: 'I shipped 4 production services at Acme.', blocker: '' });
  // validateEdit only permits the write; saveJobReview (lib/job-review.ts) performs it and needs D1.
  return { permitted: true, writtenBy: 'lib/job-review.ts saveJobReview (not executed: requires D1)', writes: 'accepted_draft = exact text, version + 1, event Draft accepted' };
});

const commit = execFileSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD']).toString().trim();
const out = { source: 'SyberLabs/relay lib/*.ts, inputs from SyberLabs/cross-platform scenarios.py RELAY', commit, node: process.version, facts: facts.map(f => f.claim), draft: OVERCLAIM, steps };
const target = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'relay-trace.json');
writeFileSync(target, JSON.stringify(out) + '\n');
for (const s of steps) console.log(s.outcome.padEnd(8), s.title, '|', s.message ?? JSON.stringify(s.result));
