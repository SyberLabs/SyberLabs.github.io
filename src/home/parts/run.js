// SyberWork's recorded run, read from the same output the product page prints (projects/site-data.js, `run`), so the
// two cannot disagree. A table gives one row per proposed change: what was claimed, what SyberWork's own check found
// and what happened to the change. Beside it is the output itself, line for line. Each row, and each fact under the
// table, names the part of the output it comes from (data-k), and src/home/run.js lights that part when the row is
// pointed at. If the output ever stops parsing, or changes shape, the part is left out.
// The table carries its roles in the markup because narrow screens lay it out as blocks (src/home/home.css).
import { esc } from './html.js';

const CHECK_WORDS = { 'candidate_check_failed:tests': 'Tests failed', all_checks_passed: 'All checks passed' };

// The output with each line marked by the top-level key it belongs to.
function outputLines(text) {
  let key = '';
  return text.split('\n').map(line => {
    const top = /^ {2}"(\w+)":/.exec(line), inside = /^ {3,}/.test(line), close = /^ {2}[}\]]/.test(line);
    if (top) key = top[1]; else if (!inside && !close) key = '';
    const mark = key ? ` data-k="${key}"` : '';
    if (close || (top && !/[{[]\s*$/.test(line))) key = '';   // a value that ends on this line
    return `<span class="home-out__l"${mark}>${esc(line) || ' '}</span>`;
  }).join('');   // each line is a block (src/home/home.css), so no line break is written between them
}

export function recordedRun(p) {
  const run = p && p.run;
  if (!run) return '';
  let data;
  try { data = JSON.parse(run.output.slice(0, run.output.lastIndexOf('}') + 1)); } catch { return ''; }
  const rows = ['model', 'patch'].map(key => {
    const c = data[key];
    if (!c) return null;
    const checked = CHECK_WORDS[c.verdict];
    const accepted = c.accept === 'succeeded', denied = typeof c.accept === 'string' && c.accept.startsWith('denied');
    if (!c.candidate || !checked || (!accepted && !denied)) return null;
    const claimed = c.claimed ? `Tests ${esc(c.claimed.tests)} (${esc(c.claimed.confidence)} confidence)` : 'None';
    return `<tr role="row" data-k="${key}" tabindex="0"><th scope="row" role="rowheader">${esc(c.candidate)}</th><td role="cell" data-label="Agent claim" data-run="claim">${claimed}</td><td role="cell" data-label="SyberWork check" data-run="check">${checked}</td><td role="cell" data-label="Outcome" data-run="outcome"><span class="home-run__outcome${accepted ? ' is-accepted' : ''}"><i aria-hidden="true"></i>${accepted ? 'Accepted' : 'Rejected'}</span></td></tr>`;
  });
  if (rows.includes(null)) return '';

  const facts = [];
  if (data.patch.branch) facts.push(['patch', 'Accepted branch', `<code>${esc(data.patch.branch)}</code>`]);
  if (data.working_tree_and_main_untouched === true) facts.push(['working_tree_and_main_untouched', 'Working tree and main', 'Untouched']);
  if (data.resumed && data.resumed.chain_valid === true && Number.isInteger(data.resumed.events)) facts.push(['resumed', 'Resumed audit log', `${data.resumed.events} events, valid hash chain`]);

  return `<section id="run" class="home-part home-run" aria-labelledby="run-title">
      <div class="sy-wrap">
        <header class="home-head home-head--run">
          <p class="home-label">Verified run</p>
          <h2 id="run-title">${esc(run.title)}</h2>
          <p class="home-run__note">${esc(run.note)} <a href="/projects/${p.slug}/">View full run on ${esc(p.name)}</a></p>
        </header>
        <div class="home-run__grid">
          <div class="home-run__record">
            <table role="table" aria-label="${esc(run.title)}">
              <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Change</th><th scope="col" role="columnheader">Agent claim</th><th scope="col" role="columnheader">SyberWork check</th><th scope="col" role="columnheader">Outcome</th></tr></thead>
              <tbody role="rowgroup">${rows.join('')}</tbody>
            </table>
            ${facts.length ? `<dl class="home-run__facts">${facts.map(([key, term, value]) => `<div data-k="${key}" tabindex="0"><dt>${term}</dt><dd>${value}</dd></div>`).join('')}</dl>` : ''}
            <p class="home-run__replay"><button class="sy-btn sy-btn--line" type="button" data-run-replay hidden>Replay run</button><span data-run-hint hidden>Hover or select a row to highlight its backing output lines.</span></p>
          </div>
          <figure class="home-out" data-glow>
            <figcaption><span aria-hidden="true">$ </span><code>${esc(run.command)}</code></figcaption>
            <pre tabindex="0" aria-label="Output of the run"><code>${outputLines(run.output)}</code></pre>
          </figure>
        </div>
      </div>
    </section>`;
}
