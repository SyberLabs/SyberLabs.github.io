// One-off import of the old public "What changed" entries into D1 (RFC-0002 D5): reads
// projects/latest.js as it was at a commit and prints INSERT SQL to stdout. It holds no content itself.
//   node scripts/changes-import.mjs <commit>      # e.g. "$(git rev-parse <packet1-merge>^)"
//   node scripts/changes-import.mjs --file <path> # a local copy (tests)
// The first line is "-- source <sha>, N rows". Every entry is checked with the same rules as the
// /admin/changes form and the table's CHECKs; one bad entry refuses the whole run and prints no SQL.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateEntry } from '../server/views/changes.js';
import { newId } from '../server/crypto.js';

const fail = msg => { console.error(`changes-import: ${msg}`); process.exit(1); };
const quote = s => `'${String(s).replace(/'/g, "''")}'`;

const args = process.argv.slice(2);
let source;
let label;
if (args[0] === '--file' && args[1]) {
  source = readFileSync(args[1], 'utf8');
  label = basename(args[1]);
} else if (args.length === 1 && !args[0].startsWith('-')) {
  let sha;
  try {
    sha = execFileSync('git', ['rev-parse', '--verify', '--quiet', `${args[0]}^{commit}`], { encoding: 'utf8' }).trim();
  } catch {
    fail(`not a commit: ${args[0]}`);
  }
  source = execFileSync('git', ['show', `${sha}:projects/latest.js`], { encoding: 'utf8', maxBuffer: 1 << 24 });
  label = sha;
} else {
  fail('usage: node scripts/changes-import.mjs <commit> | --file <path>');
}

// Load the module from a temp file (it is plain data: export const latest = [...]).
const dir = mkdtempSync(join(tmpdir(), 'changes-import-'));
let latest;
try {
  const file = join(dir, 'latest.mjs');
  writeFileSync(file, source);
  ({ latest } = await import(pathToFileURL(file).href));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
if (!Array.isArray(latest)) fail('the file exports no `latest` array');

const rows = latest.map((raw, i) => {
  const { entry, errors } = validateEntry(raw || {});
  const bad = Object.keys(errors);
  if (bad.length) fail(`entry ${i + 1} (${JSON.stringify(raw?.title ?? '')}) is invalid: ${bad.map(k => `${k}: ${errors[k]}`).join('; ')}`);
  if (Object.values(entry).some(v => v.includes('\u0000'))) fail(`entry ${i + 1} contains a NUL character`);
  return entry;
});

// Newest first in the file; created_at keeps that order within a date (the page sorts date, created_at).
const base = Date.now();
const out = [`-- source ${label}, ${rows.length} rows`];
rows.forEach((e, i) => {
  out.push(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at) VALUES (${[
    quote(newId()), quote(e.date), quote(e.project), quote(e.state), quote(e.title), quote(e.text), quote(e.href),
  ].join(', ')}, ${base - i});`);
});
process.stdout.write(`${out.join('\n')}\n`);
