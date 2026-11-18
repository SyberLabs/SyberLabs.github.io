/* SyberLabs: the rules of the Line, the homepage's first screen (src/visuals/line.js draws it). No DOM, so the rules
   can be run by a test (src/visuals/line-sim.test.mjs).

   A model proposes changes, one at a time. Each change claims its tests passed. It goes down the line: Propose,
   Check, Review, Approve. The checks stop some changes and the reviewer returns some. A change that reaches Approve
   waits there, and nothing but approve() moves it on: no timer publishes a change. Approve holds QUEUE changes; when
   it is full the stations above it fill up and the model stops proposing.

   The changes are invented. The first two follow SyberWork's recorded run (projects/site-data.js, `run`): c1 claims
   its tests passed with confidence 0.97 and fails the checks, and c2 passes. */

export const QUEUE = 3;
// seconds: the model's thinking before a proposal, a move between stations, and the stay at each station
export const TIME = { think: 0.7, move: 0.46, propose: 0.75, check: 0.95, review: 0.75, leave: 1.7, publish: 0.7, gap: 0.5 };

export function prng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSim(seed = 20261118) {
  const rand = prng(seed);
  const s = {
    t: 0,
    chips: [],                                    // every change still on screen
    slot: { propose: null, check: null, review: null },
    queue: [],                                    // changes at Approve, the first to arrive first
    thinking: 0,                                  // seconds left before the model's next proposal appears
    idle: TIME.gap,                               // seconds since Propose last became free
    commits: [],                                  // published changes, newest first: { n, at }
    counts: { proposed: 0, stopped: 0, returned: 0, published: 0 },
    events: [],                                   // for the drawing: { type, chip }, emptied by whoever reads it
  };

  function propose() {
    const n = s.counts.proposed + 1;
    const chip = {
      n, id: `c${n}`,
      conf: n === 1 ? 0.97 : Math.round((0.9 + rand() * 0.09) * 100) / 100,
      okCheck: n === 1 ? false : n === 2 ? true : rand() < 0.64,
      okReview: n === 2 ? true : rand() < 0.86,
      st: 'toPropose', p: 0, q: -1,
    };
    s.counts.proposed = n;
    s.chips.push(chip);
    s.slot.propose = chip;
    s.events.push({ type: 'proposed', chip });
  }

  function advance(chip, dt) {
    const move = () => { chip.p += dt / TIME.move; return chip.p >= 1; };
    switch (chip.st) {
      case 'toPropose': if (move()) { chip.st = 'propose'; chip.p = 0; } break;
      case 'propose':
        chip.p = Math.min(1, chip.p + dt / TIME.propose);
        if (chip.p >= 1 && !s.slot.check) { s.slot.check = chip; s.slot.propose = null; s.idle = 0; chip.st = 'toCheck'; chip.p = 0; }
        break;
      case 'toCheck': if (move()) { chip.st = 'check'; chip.p = 0; } break;
      case 'check':
        chip.p = Math.min(1, chip.p + dt / TIME.check);
        if (chip.p < 1) break;
        if (!chip.okCheck) { s.slot.check = null; s.counts.stopped++; chip.st = 'stopped'; chip.p = 0; s.events.push({ type: 'stopped', chip }); }
        else if (!s.slot.review) { s.slot.review = chip; s.slot.check = null; chip.st = 'toReview'; chip.p = 0; }
        break;
      case 'toReview': if (move()) { chip.st = 'review'; chip.p = 0; } break;
      case 'review':
        chip.p = Math.min(1, chip.p + dt / TIME.review);
        if (chip.p < 1) break;
        if (!chip.okReview) { s.slot.review = null; s.counts.returned++; chip.st = 'returned'; chip.p = 0; s.events.push({ type: 'returned', chip }); }
        else if (s.queue.length < QUEUE) { s.queue.push(chip); s.slot.review = null; chip.st = 'toApprove'; chip.p = 0; }
        break;
      case 'toApprove': if (move()) { chip.st = 'approve'; chip.p = 0; s.events.push({ type: 'waiting', chip }); } break;
      case 'approve': break;                        // waits for approve(): nothing here moves it on
      case 'toPublish':
        chip.p += dt / TIME.publish;
        if (chip.p >= 1) { chip.st = 'gone'; s.commits.unshift({ n: chip.n, at: s.t }); if (s.commits.length > 40) s.commits.length = 40; s.counts.published++; s.events.push({ type: 'published', chip }); }
        break;
      case 'stopped': case 'returned': chip.p += dt / TIME.leave; if (chip.p >= 1) chip.st = 'gone'; break;
    }
  }

  function step(dt) {
    s.t += dt;
    if (!s.slot.propose) {
      s.idle += dt;
      if (s.idle >= TIME.gap) { s.slot.propose = 'thinking'; s.thinking = TIME.think; s.events.push({ type: 'thinking' }); }
    } else if (s.slot.propose === 'thinking') {
      s.thinking -= dt;
      if (s.thinking <= 0) propose();
    }
    for (const chip of s.chips) advance(chip, dt);
    for (let i = 0; i < s.queue.length; i++) s.queue[i].q = i;
    if (s.chips.some(c => c.st === 'gone')) s.chips = s.chips.filter(c => c.st !== 'gone');
  }

  // The change a person can approve now: the first to have arrived at Approve.
  const ready = () => (s.queue.length && s.queue[0].st === 'approve' ? s.queue[0] : null);
  // How many changes have passed everything and are at Approve or on their way to it.
  const waiting = () => s.queue.length;
  // True when Approve is full and every station above it is occupied by a change that cannot move.
  const stopped = () => s.queue.length >= QUEUE && s.queue.every(c => c.st === 'approve')
    && !!s.slot.review && s.slot.review.st === 'review' && s.slot.review.p >= 1 && s.slot.review.okReview;

  function approve() {
    const chip = ready();
    if (!chip) return null;
    s.queue.shift();
    chip.st = 'toPublish'; chip.p = 0; chip.q = -1;
    s.events.push({ type: 'approved', chip });
    return chip;
  }

  return { state: s, step, approve, ready, waiting, stopped };
}
