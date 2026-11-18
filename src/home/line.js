// The first screen's Line: joins the picture (src/visuals/line.js) to the words and the button around it. The
// picture reports where its stations are, and the step names are set beside them; it reports its counts, and the
// page says them in words. Approve is the visitor's: nothing in the picture is published until it is pressed.
import { mount } from '../visuals/line.js';

const STEPS = ['propose', 'check', 'review', 'approve', 'publish'];

export function line(hero) {
  const figure = hero.querySelector('[data-line]'), canvas = hero.querySelector('canvas[data-visual="line"]');
  if (!figure || !canvas) return;
  const zone = figure.querySelector('[data-line-zone]'), button = figure.querySelector('[data-line-approve]'), state = figure.querySelector('[data-line-state]');
  const tally = Object.fromEntries(STEPS.map(key => [key, figure.querySelector(`[data-tally="${key}"]`)])), model = figure.querySelector('[data-line-model]');
  let now = null, thanked = '', until = 0, timer = 0;

  function say() {
    if (!now) return;
    const n = now.waiting;
    state.textContent = thanked && performance.now() < until ? `You approved ${thanked}. It is published.`
      : now.halted ? `The line has stopped. ${n} changes wait for a person.`
      : n === 1 ? '1 change passed its checks and waits for a person.'
      : n > 1 ? `${n} changes passed their checks and wait for a person.`
      : 'The checks are running. A change that passes waits for a person.';
  }

  const picture = mount(canvas, {
    zone, surface: hero,
    onLayout(at) {
      figure.style.setProperty('--ax', `${at.axis}px`);
      for (const key of ['model', ...STEPS]) figure.style.setProperty(`--y-${key}`, `${at[key]}px`);
      model.textContent = `${at.units} units`;
    },
    onState(s) {
      now = s;
      tally.propose.textContent = `${s.proposed} proposed`;
      tally.check.textContent = `${s.stopped} stopped`;
      tally.review.textContent = `${s.returned} returned`;
      tally.approve.textContent = `${s.waiting} waiting`;
      tally.publish.textContent = `${s.published} published`;
      button.textContent = s.ready ? `Approve ${s.ready}` : 'Approve';
      button.setAttribute('aria-disabled', String(!s.ready));
      say();
    },
  });
  if (!picture) return;
  button.hidden = false;
  button.addEventListener('click', () => {
    const id = picture.approve();
    if (!id) return;
    thanked = id; until = performance.now() + 2600;
    clearTimeout(timer); timer = setTimeout(say, 2700);
    say();
  });
}
