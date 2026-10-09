// Decision Arena report. Renders from three files that scripts/export-arena.mjs copies out of RISE:
//   data/report.json      `node scripts/arena/arena.mjs report` (syberlabs.decision-arena-report/v1): the scores
//   data/replay.json      the run's replay file (syberlabs.decision-arena-replay/v1): run 1's admitted decisions
//   data/PROVENANCE.json  run file name and hashes, plus the run fields the two above do not carry
// No number on the page is written in the HTML. Wording follows RISE docs/decision-arena/WORDING.md.

const RISE_ARENA = 'https://rise.syberlabs.io/arena';
const REPLAYABLE = new Set(['openai', 'jev', 'kev', 'rules']); // the deciders RISE's /arena/<case>/<decider> route plays
const MODEL_DECIDERS = new Set(['openai', 'jev', 'kev']);
const SHORT = { openai: 'OpenAI', jev: 'Jev', kev: 'Kev', rules: 'Rules', 'rules-floor': 'First option' };
const NAMES = { openai: 'OpenAI Decisions API', jev: 'TypeSafe Jev', kev: 'Kev, on the operator’s computer', rules: 'Rules, no model', 'rules-floor': 'First option, no model' };
const LETTERS = { openai: 'A', jev: 'B', kev: 'C', rules: 'D', 'rules-floor': 'E' };
const SVG = 'http://www.w3.org/2000/svg';
const slot = name => document.querySelector(`[data-arena="${name}"]`);

function h(tag, attrs = {}, ...kids) {
  const el = tag.startsWith('svg:') ? document.createElementNS(SVG, tag.slice(4)) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, v);
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
  return el;
}

const pct = v => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : '–');
const num = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const usd = v => (!Number.isFinite(v) ? '–' : v === 0 ? '$0' : v < 0.01 ? `$${Number(v.toPrecision(2))}` : `$${v.toFixed(2)}`);
const date = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function main([report, replay, prov]) {
  if (report.schema !== 'syberlabs.decision-arena-report/v1') throw new Error(`report.json has schema ${report.schema}`);
  if (replay.schema !== 'syberlabs.decision-arena-replay/v1') throw new Error(`replay.json has schema ${replay.schema}`);
  if (report.file !== prov.runFile || replay.runFile !== prov.runFile) throw new Error('report.json and replay.json name different run files');
  const run = prov.run;
  const deciders = run.providers.map((p, i) => ({ ...p, letter: LETTERS[p.id] || String.fromCharCode(70 + i), name: NAMES[p.id] || p.id,
    notRun: p.status === 'ran' ? null : p.status }))
    .sort((a, b) => !!a.notRun - !!b.notRun || a.letter.localeCompare(b.letter));
  const who = d => `${d.letter} · ${d.name}`;
  const head = d => h('th', { scope: 'row' }, who(d), d.requestedModel ? h('small', {}, d.requestedModel) : null);
  const notRunRow = (d, span) => h('tr', {}, head(d), h('td', { colspan: span, class: 'not-run' }, d.notRun));
  const models = deciders.filter(d => d.requestedModel).map(d => d.servedModels.join(', ') || d.requestedModel);
  const caseIds = Object.keys(replay.decisions);
  const commit = prov.riseCommit.slice(0, 7);

  // Status
  const mock = run.harness.mock === true;
  slot('placeholder').hidden = !mock;
  slot('placeholder-note').textContent = 'This is a mock run of RISE’s harness: every network decider was answered by a local stand-in that picks the first option and spreads probability evenly. It checks the pipeline and says nothing about any model.';
  slot('captured').textContent = `${mock ? 'MOCK RUN' : 'CAPTURED'} ${date(run.createdAt).toUpperCase()}`;
  slot('status').textContent = mock ? 'PLACEHOLDER DATA · NOT RESULTS' : `CAPTURED ${date(run.createdAt).toUpperCase()}${run.partial ? ' · PARTIAL' : ''}`;
  const ran = deciders.filter(d => !d.notRun), pending = deciders.filter(d => d.notRun);
  const list = ds => ds.map(d => SHORT[d.id] || d.id).join(ds.length > 2 ? ', ' : ' and ').replace(/, ([^,]*)$/, ' and $1');
  slot('status-note').textContent = `${caseIds.length} requests × ${ran.length} deciders that ran${pending.length ? `, ${pending.length} not run` : ''} · ${prov.runFile} · RISE ${commit} · a frozen file; results age.`;

  // Headline: say plainly when no model ran, so the page never reads as a model comparison.
  const pendingModels = pending.filter(d => MODEL_DECIDERS.has(d.id));
  if (!models.length) {
    slot('dek').textContent = `This run covers only the ${['no', 'one', 'two'][ran.length] ?? ran.length} baselines that call no model: ${list(ran)}. ${pendingModels.length ? `${list(pendingModels)} are pending: none of them ran, so nothing here compares models.` : 'Nothing here compares models.'}`;
  } else if (pendingModels.length) {
    slot('dek').append(` ${list(pendingModels)} did not run in this file.`);
  }

  // 00 Deciders
  slot('deciders').replaceChildren(
    h('caption', {}, 'Model ids as the run file records them. “Not run” means the decider was never reached.'),
    h('thead', {}, h('tr', {}, ['Decider', 'Model asked for', 'Model served', 'Status'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, deciders.map(d => h('tr', {}, h('th', { scope: 'row' }, who(d)),
      d.notRun ? h('td', { class: 'not-run' }, 'not called') : h('td', {}, h('code', {}, d.requestedModel || 'none')),
      d.notRun ? h('td', { class: 'not-run' }, 'not called') : h('td', {}, d.servedModels.length ? h('code', {}, d.servedModels.join(', ')) : 'none'),
      h('td', { class: d.notRun ? 'not-run' : null }, d.notRun || 'ran')))));

  // 01 Agreement: run 1 only, with the intervals and differences RISE's report computes (WORDING.md rule 7).
  const agreement = report.agreement;
  const span = ({ min, max }) => (min === max ? `${pct(min)} in every run` : `${pct(min)} to ${pct(max)}`);
  const score = (s, n) => (!s.total ? h('td', {}, 'none to check')
    : h('td', { class: 'num' }, h('span', { class: 'big' }, pct(s.rate)), h('small', {}, `[${pct(s.interval.lo)}, ${pct(s.interval.hi)}] · ${s.passed} of ${s.total}${n ? ` · ${n}` : ''}`)));
  slot('agreement').replaceChildren(
    h('caption', {}, 'Run 1, the decision RISE admitted. In brackets, the 95% interval from RISE’s report: for expectations, a bootstrap that resamples whole requests; for opposites, a Wilson interval over the pairs. Other runs ask the same requests, so they are shown as stability, never pooled.'),
    h('thead', {}, h('tr', {}, ['Decider', 'Expectations met, run 1', 'Opposites told apart, run 1', 'Across runs'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, deciders.map(d => {
      if (d.notRun) return notRunRow(d, 3);
      const a = agreement.deciders[d.id];
      if (!a) return h('tr', {}, head(d), h('td', { colspan: 3, class: 'not-run' }, 'not reached'));
      const st = report.scores[d.id].stability, r = a.acrossRuns;
      return h('tr', {}, head(d), score(a.explicit, `${a.explicit.cases} requests`), score(a.contrast),
        h('td', {}, `${r.runs} runs`, h('small', {}, `expectations ${r.explicitRate ? span(r.explicitRate) : '–'}`),
          h('small', {}, `opposites ${r.contrastRate ? span(r.contrastRate) : '–'}`),
          h('small', {}, `same choice on ${st.identicalAdmitted} of ${st.cases} requests and controls`)));
    })));
  const name = id => SHORT[id] || id;
  const points = v => `${Math.round(v * 100)} points`;
  slot('noise').replaceChildren(...[...agreement.differences.map(x => h('p', {}, x.withinNoise
    ? `${name(x.a)} and ${name(x.b)}: no difference detectable at n = ${x.clusters} requests.`
    : `Expectations met in run 1, ${name(x.a)} minus ${name(x.b)}: ${points(x.estimate)}, 95% interval ${points(x.lo)} to ${points(x.hi)}, n = ${x.clusters} requests (paired bootstrap over whole requests, from RISE’s report).`)),
    agreement.notReached?.length && h('p', {}, `Not reached in any run: ${agreement.notReached.map(name).join(', ')}.`),
    h('p', {}, agreement.differences.length ? 'Letters are fixed and carry no order of merit; deciders that ran come first.' : 'RISE’s report has no difference to show, so this page orders no decider. Letters are fixed and carry no order of merit.')].filter(Boolean));

  // 02 Calibration
  const panels = [], binRows = [], silent = [];
  for (const d of deciders) {
    if (d.notRun) { silent.push(`${who(d)}: ${d.notRun}.`); continue; }
    const cal = report.scores[d.id].calibration;
    if (cal === undefined) { silent.push(`${who(d)}: this run was not scored for calibration.`); continue; }
    let any = false;
    for (const [basis, label] of [['probabilities', 'per-option probability'], ['confidence', 'stated confidence']]) {
      const s = cal?.secondary?.[basis];
      if (!s?.n) continue;
      any = true;
      panels.push(panel(`${who(d)}`, label, s, basis === 'probabilities' ? cal.primary : null));
      for (const b of s.reliability) binRows.push(h('tr', {}, h('th', { scope: 'row' }, d.letter), h('td', {}, label),
        h('td', { class: 'num' }, `${pct(b.lower)}–${pct(b.upper)}`), h('td', { class: 'num' }, pct(b.meanP)), h('td', { class: 'num' }, pct(b.rate)),
        h('td', { class: 'num' }, `[${pct(b.lo)}, ${pct(b.hi)}]`), h('td', { class: 'num' }, String(b.n)), h('td', {}, b.lowN ? 'thin' : '')));
    }
    if (!any) silent.push(`${who(d)}: states no probabilities and no confidence.`);
  }
  slot('panels').replaceChildren(...panels);
  slot('figure').hidden = slot('calibration-intro').hidden = !panels.length;
  slot('reliability').replaceChildren(
    h('caption', {}, 'Each row is one bin of stated certainty. Thin bins hold fewer than 15 choices.'),
    h('thead', {}, h('tr', {}, ['Decider', 'Kind', 'Bin', 'Stated (mean)', 'Agreed', '95% interval', 'n', ''].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, binRows));
  slot('silent').textContent = !panels.length
    ? `No calibration in this run: ${ran.length ? `${list(ran)} state no probabilities and no confidence` : 'no decider ran'}${pending.length ? `, and ${list(pending)} did not run` : ''}.`
    : silent.length ? `No diagram for ${silent.join(' ')}` : '';
  slot('controls').textContent = report.controls === 'sealed'
    ? `The ${run.controls} known-probability controls are sealed: their labels come from a seed committed before capture and revealed after it, so they are not scored yet.`
    : report.controls ? 'The known-probability controls are scored in report.json under controls.' : 'This run has no known-probability controls.';

  // 03 Case by case
  slot('cases').replaceChildren(
    h('caption', {}, `${caseIds.length} requests, run 1. Pace in words per minute.`),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Request'), deciders.map(d => h('th', { scope: 'col' }, d.letter, h('small', {}, d.name), d.notRun ? h('small', { class: 'not-run' }, d.notRun) : null)))),
    h('tbody', {}, caseIds.map(caseId => h('tr', {}, h('th', { scope: 'row' }, caseId), deciders.map(d => {
      if (d.notRun) return h('td', { class: 'not-run' }, h('a', { href: `${RISE_ARENA}/${encodeURIComponent(caseId)}`, 'aria-label': `${caseId}, ${who(d)}: ${d.notRun}. See this request in RISE.` }, 'not run'));
      const a = replay.decisions[caseId][d.id];
      if (!a) return h('td', { class: 'not-run' }, 'no result');
      if (a.rejectCode) return h('td', { class: 'not-run' }, `not admitted: ${a.rejectCode}`);
      const c = a.config;
      const body = [h('span', { class: 'pace' }, `${c.wpm} wpm`), h('span', {}, c.audio), h('span', {}, `${c.visualMode} · ${c.visualStyle}`), h('small', {}, a.workId)];
      return h('td', {}, REPLAYABLE.has(d.id)
        ? h('a', { class: 'choice', href: `${RISE_ARENA}/${encodeURIComponent(caseId)}/${d.id}`, 'aria-label': `${caseId}, ${who(d)}: ${c.wpm} words per minute, ${c.audio}, ${c.visualMode} ${c.visualStyle}, ${a.workId}. Play in RISE.` }, body)
        : h('span', { class: 'choice' }, body));
    })))));

  // 04 Answers, cost, time
  slot('answers').replaceChildren(
    h('caption', {}, 'Every run of every request and control. Turned away: out of menu, missing, refused, or the call failed.'),
    h('thead', {}, h('tr', {}, ['Decider', 'Admitted', 'Turned away', 'Latency p50 · p95', 'Cost', 'Price source'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, deciders.map(d => {
      if (d.notRun) return notRunRow(d, 5);
      const s = report.scores[d.id];
      return h('tr', {}, head(d),
        h('td', { class: 'num' }, `${s.valid.admitted} of ${s.results}`),
        h('td', { class: 'num' }, `${s.outOfMenu} · ${s.missing} · ${s.refusals} · ${s.errors}`),
        h('td', { class: 'num' }, `${s.latencyMs.p50 ?? '–'} · ${s.latencyMs.p95 ?? '–'} ms`),
        h('td', { class: 'num' }, `${usd(s.cost.totalUsd)} total`, h('small', {}, `${usd(s.cost.per1kUsd)} per 1,000${s.cost.unreported ? ` · ${s.cost.unreported} unreported` : ''}`)),
        h('td', {}, d.pricingSource));
    })));

  // 05 Method
  const fact = (k, v) => [h('dt', {}, k), h('dd', {}, h('code', {}, v))];
  slot('method').replaceChildren(
    ...fact('Run', run.runId), ...fact('Captured', run.createdAt), ...fact('RISE commit', prov.riseCommit),
    ...fact('Run file', prov.runFile), ...fact('Run sha256', prov.runSha256),
    ...fact('report.json sha256', prov.files['report.json']), ...fact('replay.json sha256', prov.files['replay.json']),
    ...fact('Report checks', `matchesRecorded ${report.matchesRecorded} · matchesReplay ${report.matchesReplay}`));
  slot('command').textContent = mock
    ? `# A mock run is never committed to RISE; this makes a fresh one\ncd RISE && git checkout ${prov.riseCommit}\nnode scripts/arena/arena.mjs capture --mock\nnode scripts/arena/arena.mjs report --run public/content/arena/run-<sha12>.json`
    : `cd RISE && git checkout ${prov.riseCommit}\nnode scripts/arena/arena.mjs report --run public/content/arena/${prov.runFile}`;
  slot('notes').replaceChildren(...run.notes.map(t => h('li', {}, t)));

  // 06 Disclosure
  slot('disclosure-date').textContent = `on ${date(run.createdAt)}`;
  slot('disclosure-commit').textContent = `at ${commit}`;
  slot('disclosure-models').textContent = models.length ? models.join(', ') : 'no model, since only the no-model baselines ran';
  slot('case-count').textContent = String(run.cases);
}

// One reliability diagram: a bin per dot, at (mean stated certainty, share that agreed), sized by n.
function panel(title, label, s, primary) {
  const W = 320, L = 44, R = 20, T = 12, S = W - L - R;
  const X = v => L + v * S, Y = v => T + (1 - v) * S;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const above = s.ece > s.eceNoiseFloor;
  const summary = `${primary?.n && primary.estimate === s.brier.estimate ? 'Binary Brier (the primary measure, fixed in advance)' : 'Brier'} ${num(s.brier.estimate)} [${num(s.brier.lo)}, ${num(s.brier.hi)}], n ${s.n} over ${s.cases} cases. Expected calibration error ${num(s.ece)}, ${above ? 'above' : 'below'} its simulated noise floor of ${num(s.eceNoiseFloor)}.`;
  const svg = h('svg:svg', { viewBox: `0 0 ${W} ${W}`, role: 'img', 'aria-label': `${title}, ${label}. ${s.reliability.length} bins. ${summary}` },
    h('svg:path', { class: 'over', d: `M${X(0)} ${Y(0)}L${X(1)} ${Y(0)}L${X(1)} ${Y(1)}Z` }),
    h('svg:text', { class: 'zone', x: X(0.97), y: Y(0.04), 'text-anchor': 'end' }, 'surer than it agreed'),
    h('svg:text', { class: 'zone', x: X(0.03), y: Y(0.93) }, 'agreed more than it said'),
    ticks.map(t => [h('svg:line', { class: 'grid', x1: X(t), x2: X(t), y1: Y(0), y2: Y(1) }), h('svg:line', { class: 'grid', x1: X(0), x2: X(1), y1: Y(t), y2: Y(t) }),
      h('svg:text', { x: X(t), y: Y(0) + 16, 'text-anchor': 'middle' }, pct(t)), h('svg:text', { x: L - 6, y: Y(t) + 4, 'text-anchor': 'end' }, pct(t))]),
    h('svg:line', { class: 'diag', x1: X(0), y1: Y(0), x2: X(1), y2: Y(1) }),
    h('svg:text', { class: 'axis-label', x: X(0.5), y: W - 4, 'text-anchor': 'middle' }, `${label} →`),
    h('svg:text', { class: 'axis-label', x: 12, y: Y(0.5), 'text-anchor': 'middle', transform: `rotate(-90 12 ${Y(0.5)})` }, 'agreed with expectation →'),
    s.reliability.map(b => h('svg:g', { class: b.lowN ? 'bin thin' : 'bin' },
      h('svg:title', {}, `Stated ${pct(b.meanP)}, agreed ${pct(b.rate)} [${pct(b.lo)}, ${pct(b.hi)}], n ${b.n}${b.lowN ? ', thin' : ''}`),
      h('svg:line', { x1: X(b.meanP), x2: X(b.meanP), y1: Y(b.lo), y2: Y(b.hi) }),
      h('svg:circle', { cx: X(b.meanP), cy: Y(b.rate), r: Math.min(12, 4 + Math.sqrt(b.n) / 1.5) }))));
  return h('div', { class: 'panel' }, h('p', { class: 'panel__title' }, title, h('small', {}, label)), svg,
    h('p', { class: 'panel__note' }, summary, ' Lower Brier is closer; 0 is perfect.',
      primary?.n && primary.estimate !== s.brier.estimate ? ` The primary measure, fixed in advance, is binary Brier on explicit-expectation fields: ${num(primary.estimate)} [${num(primary.lo)}, ${num(primary.hi)}], n ${primary.n}.` : ''));
}

const files = ['data/report.json', 'data/replay.json', 'data/PROVENANCE.json'];
Promise.all(files.map(f => fetch(new URL(f, import.meta.url)).then(r => { if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.json(); })))
  .then(main)
  .catch(err => {
    slot('status').textContent = 'THE REPORT FILES COULD NOT BE READ';
    slot('status-note').textContent = `${err.message}. The raw files are in data/.`;
    console.error(err);
  });
