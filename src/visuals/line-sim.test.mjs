// The rules the homepage's first screen shows (src/visuals/line-sim.js). Run: node --test src/visuals/line-sim.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, QUEUE } from './line-sim.js';

const run = (sim, seconds, dt = 1 / 60) => { for (let t = 0; t < seconds; t += dt) sim.step(dt); };

test('nothing is published without approve()', () => {
  const sim = createSim();
  run(sim, 600);
  assert.equal(sim.state.counts.published, 0);
  assert.equal(sim.state.commits.length, 0);
});

test('the line stops when Approve is full, and the model stops proposing', () => {
  const sim = createSim();
  run(sim, 120);
  assert.equal(sim.waiting(), QUEUE);
  assert.equal(sim.stopped(), true);
  const proposed = sim.state.counts.proposed;
  run(sim, 120);
  assert.equal(sim.state.counts.proposed, proposed);
});

test('the first two changes follow the recorded run: c1 fails the checks, c2 reaches Approve', () => {
  const sim = createSim();
  const seen = [];
  for (let i = 0; i < 60 * 20; i++) { sim.step(1 / 60); seen.push(...sim.state.events.splice(0)); }
  const stopped = seen.find(e => e.type === 'stopped'), waiting = seen.find(e => e.type === 'waiting');
  assert.equal(stopped.chip.id, 'c1');
  assert.equal(stopped.chip.conf, 0.97);
  assert.equal(waiting.chip.id, 'c2');
});

test('approve() publishes the change that arrived first, one press at a time', () => {
  const sim = createSim();
  run(sim, 60);
  const first = sim.ready();
  assert.ok(first);
  assert.equal(sim.approve(), first);
  run(sim, 2);
  assert.equal(sim.state.counts.published, 1);
  assert.equal(sim.state.commits[0].n, first.n);
});

test('approve() does nothing when no change is waiting', () => {
  const sim = createSim();
  assert.equal(sim.approve(), null);
  run(sim, 1);
  assert.equal(sim.state.counts.published, 0);
});

test('every change is counted once: proposed = stopped + returned + published + still on the line', () => {
  const sim = createSim(7);
  for (let i = 0; i < 400; i++) { run(sim, 1.5); sim.approve(); }
  run(sim, 5);
  const { proposed, stopped, returned, published } = sim.state.counts;
  const onLine = sim.state.chips.filter(c => !['stopped', 'returned'].includes(c.st)).length;
  assert.equal(proposed, stopped + returned + published + onLine);
  assert.ok(published > 50);
});
