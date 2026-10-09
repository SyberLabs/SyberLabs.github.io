// Bring one frozen Decision Arena run from RISE into the report page.
//
//   node scripts/export-arena.mjs <RISE>/public/content/arena/run-<sha12>.json [--report <report.json>]
//     Checks the run file's sha256 against the twelve digits in its name, runs RISE's own
//     `node scripts/arena/arena.mjs report --run <file>` in the RISE checkout that holds the file
//     (or reads the report file passed with --report), copies the replay file that sits beside the
//     run, and writes research/decision-arena/data/{report.json, replay.json, PROVENANCE.json}.
//   node scripts/export-arena.mjs --check
//     Changes nothing; fails unless report.json and replay.json hash to what PROVENANCE.json
//     records and all three name the same run file (run in CI).
//
// The page renders from report.json and replay.json only. The run file itself (several MB) is not
// copied; PROVENANCE.json keeps its name, its sha256 and the few run fields the page shows that the
// report and replay do not carry (capture date, harness commit and mock flag, provider status, notes).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const DIR = 'research/decision-arena/data';
const REPORT = `${DIR}/report.json`, REPLAY = `${DIR}/replay.json`, PROVENANCE = `${DIR}/PROVENANCE.json`;
const RUN_NAME = /^run-([0-9a-f]{12})\.json$/;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { console.error(`export-arena: ${message}`); process.exit(1); };

async function check() {
  const prov = JSON.parse(await readFile(PROVENANCE, 'utf8'));
  const named = RUN_NAME.exec(prov.runFile);
  if (!named || !prov.runSha256?.startsWith(named[1])) fail(`${PROVENANCE}: runSha256 does not match the hash in ${prov.runFile}`);
  for (const [file, path] of [['report.json', REPORT], ['replay.json', REPLAY]]) {
    const actual = sha256(await readFile(path));
    if (actual !== prov.files?.[file]) fail(`${path} sha256 ${actual} is not the ${prov.files?.[file]} that ${PROVENANCE} records; re-export it`);
  }
  const report = JSON.parse(await readFile(REPORT, 'utf8')), replay = JSON.parse(await readFile(REPLAY, 'utf8'));
  if (report.file !== prov.runFile || replay.runFile !== prov.runFile) fail(`report.json, replay.json and PROVENANCE.json do not name the same run file`);
  console.log(`export-arena: report.json and replay.json match PROVENANCE.json (${prov.runFile})`);
}

async function exportRun(runPath, reportPath) {
  const runFile = basename(runPath);
  const named = RUN_NAME.exec(runFile);
  if (!named) fail(`${runFile} is not named run-<sha12>.json`);
  const runBytes = await readFile(runPath);
  const runSha256 = sha256(runBytes);
  if (!runSha256.startsWith(named[1])) fail(`${runFile} hashes to ${runSha256.slice(0, 12)}, not the digits in its name`);
  const run = JSON.parse(runBytes);
  if (run.schema !== 'syberlabs.decision-arena/v1') fail(`${runFile} has schema ${JSON.stringify(run.schema)}`);

  let reportBytes;
  if (reportPath) reportBytes = await readFile(reportPath);
  else {
    const rise = resolve(dirname(runPath), '../../..');
    if (!existsSync(join(rise, 'scripts/arena/arena.mjs'))) fail(`no RISE checkout around ${runPath}; pass --report <file>`);
    reportBytes = Buffer.from(execFileSync('node', ['scripts/arena/arena.mjs', 'report', '--run', resolve(runPath)], { cwd: rise }));
  }
  const report = JSON.parse(reportBytes);
  if (report.schema !== 'syberlabs.decision-arena-report/v1') fail(`the report has schema ${JSON.stringify(report.schema)}`);
  if (report.file !== runFile) fail(`the report is of ${report.file}, not ${runFile}`);
  if (!report.matchesRecorded || !report.matchesReplay) fail(`the report says matchesRecorded ${report.matchesRecorded}, matchesReplay ${report.matchesReplay}; refusing to publish`);

  const replayBytes = await readFile(join(dirname(runPath), runFile.replace(/^run-/, 'replay-')));
  if (JSON.parse(replayBytes).runFile !== runFile) fail(`the replay beside ${runFile} names another run`);

  await writeFile(REPORT, reportBytes);
  await writeFile(REPLAY, replayBytes);
  const provenance = {
    riseCommit: run.harness.commit,
    runFile, runSha256,
    files: { 'report.json': sha256(reportBytes), 'replay.json': sha256(replayBytes) },
    run: {
      runId: run.runId, createdAt: run.createdAt, harness: run.harness, partial: run.partial === true,
      cases: run.inputs.cases.count, controls: run.inputs.controls?.count ?? 0, notes: run.notes,
      providers: run.providers.map(({ id, requestedModel, servedModels, revision, ranFrom, ranTo, pricing, status }) =>
        ({ id, requestedModel, servedModels, revision, ranFrom, ranTo, pricingSource: pricing.source, status }))
    }
  };
  await writeFile(PROVENANCE, `${JSON.stringify(provenance, null, 2)}\n`);
  console.log(`export-arena: wrote ${REPORT}, ${REPLAY} and ${PROVENANCE} from ${runFile}${run.harness.mock ? ' (MOCK run)' : ''}`);
}

const args = process.argv.slice(2);
if (args[0] === '--check') await check();
else if (args[0] && !args[0].startsWith('--')) {
  const at = args.indexOf('--report');
  await exportRun(args[0], at < 0 ? null : args[at + 1]);
} else fail('usage: node scripts/export-arena.mjs <RISE>/public/content/arena/run-<sha12>.json [--report <file>] | --check');
