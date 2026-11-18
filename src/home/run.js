// The recorded run. Each row of the record, and each fact under it, names the part of the output it was read from
// (data-k). Pointing at one, or moving to it with the keyboard, lights those lines of the output and brings them
// into view; pointing at a line of the output lights the row it backs. A press holds the light, for touch.
// Replay shows the run in the order it happened: what the change claimed, then the check, then the outcome.
const wait = ms => new Promise(done => setTimeout(done, ms));

export function run(part, reduced) {
  const lines = [...part.querySelectorAll('.home-out__l[data-k]')], cited = [...part.querySelectorAll('.home-run__record [data-k]')];
  const pre = part.querySelector('pre');
  let held = '', playing = false;

  function light(key) {
    part.dataset.lit = key;
    let first = null;
    for (const el of lines) { const on = !!key && el.dataset.k === key; el.classList.toggle('is-lit', on); if (on && !first) first = el; }
    for (const el of cited) el.classList.toggle('is-lit', !!key && el.dataset.k === key);
    if (first && pre.scrollHeight > pre.clientHeight) {   // bring the lit lines into the panel's view
      const top = first.offsetTop - pre.offsetTop, room = pre.clientHeight;
      if (top < pre.scrollTop + 8 || top > pre.scrollTop + room - 48) pre.scrollTo({ top: Math.max(0, top - 24), behavior: reduced.matches ? 'auto' : 'smooth' });
    }
  }
  for (const el of [...cited, ...lines]) {
    const key = el.dataset.k;
    el.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse' && !playing) light(key); });
    el.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse' && !playing) light(held); });
    el.addEventListener('click', () => { if (playing) return; held = held === key ? '' : key; light(held); });
    if (el.tabIndex === 0) {
      el.addEventListener('focus', () => { if (!playing) light(key); });
      el.addEventListener('blur', () => { if (!playing) light(held); });
    }
  }

  const hint = part.querySelector('[data-run-hint]');
  if (hint) hint.hidden = false;
  const button = part.querySelector('[data-run-replay]');
  if (!button || reduced.matches) return;
  button.hidden = false;

  // Split a cell's words into what has been typed and what has not. The untyped part keeps its place, hidden.
  async function type(cell, ms = 26) {
    const text = cell.textContent, typed = document.createElement('span'), rest = document.createElement('span');
    rest.dataset.untyped = ''; rest.textContent = text;
    cell.replaceChildren(typed, rest); delete cell.dataset.stepHidden;
    for (let n = 1; n <= text.length; n++) { typed.textContent = text.slice(0, n); rest.textContent = text.slice(n); await wait(ms); }
    cell.textContent = text;
  }
  button.addEventListener('click', async () => {
    if (playing) return;
    playing = true; held = '';
    button.setAttribute('aria-disabled', 'true');
    const rows = [...part.querySelectorAll('tbody tr')], facts = [...part.querySelectorAll('.home-run__facts > div')];
    const table = part.querySelector('table');
    table.setAttribute('aria-busy', 'true');
    for (const el of [...part.querySelectorAll('tbody td'), ...facts]) el.dataset.stepHidden = '';
    part.classList.add('is-replaying');
    light('');
    await wait(350);
    for (const row of rows) {
      const cell = name => row.querySelector(`[data-run="${name}"]`), check = cell('check'), outcome = cell('outcome');
      light(row.dataset.k);
      await type(cell('claim'));
      await wait(380);
      const words = check.textContent, hold = document.createElement('span');
      hold.textContent = words; check.replaceChildren(hold);
      delete check.dataset.stepHidden; check.classList.add('is-running');
      await wait(1050);
      check.classList.remove('is-running'); check.textContent = words;
      await wait(420);
      delete outcome.dataset.stepHidden;
      await wait(900);
    }
    for (const fact of facts) { light(fact.dataset.k); delete fact.dataset.stepHidden; await wait(620); }
    await wait(500);
    light('');
    part.classList.remove('is-replaying');
    table.removeAttribute('aria-busy');
    button.removeAttribute('aria-disabled');
    playing = false;
  });
}
