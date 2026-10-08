// The "What it does" face of each system card: user outcomes, stated only as
// far as each repository supports them. Actors: you (the person), system
// (the SyberLabs system), tool (an outside model or service), check (a rule
// in code). Evidence for each claim is listed in docs/SYSTEM_MAPS.md.

export const outcomes = {
  relay: {
    headline: 'Keep every job application moving across your AI tools, and approve every word yourself.',
    audience: 'For job seekers who draft with ChatGPT, Claude, Codex or Grok.',
    steps: [
      { who: 'you', actor: 'You', title: 'Add a job', text: 'Paste a posting or import your tracker. The same posting link always joins one history.' },
      { who: 'tool', actor: 'Your AI assistant', title: 'Draft with any assistant', text: 'Hand it the job and your confirmed facts. It returns text, nothing more.' },
      { who: 'check', actor: 'Relay', title: 'Drafts are checked', text: 'Out-of-date drafts are turned away, and claims your facts don’t cover are flagged.' },
      { who: 'you', actor: 'You', title: 'Approve the exact wording', text: 'Only your acceptance makes a draft final. Changing it needs a fresh review.' },
    ],
    results: [
      { title: 'No starting over', text: 'Research, facts and past drafts carry from one assistant to the next.' },
      { title: 'No silent overwrites', text: 'A stale copy can never replace newer work.' },
      { title: 'Fewer made-up claims', text: 'Sentences without a matching fact are flagged before you approve.' },
    ],
    control: 'Nothing is approved without you, and Relay does not send applications on its own.',
    status: 'Early release',
    link: { href: 'https://relay.syberlabs.io/', label: 'Open Relay' },
  },
  omnios: {
    headline: 'Ask questions over live data, and see exactly what each answer used.',
    audience: 'For people who think through markets, economics and news with AI.',
    steps: [
      { who: 'you', actor: 'You', title: 'Place live data', text: 'Prediction markets, crypto, economic series, news and research, as blocks on a canvas.' },
      { who: 'you', actor: 'You', title: 'Wire it to a persona', text: 'A wire means “this feeds that”. A persona knows only what its wires carry.' },
      { who: 'system', actor: 'OmniOS', title: 'Ask a question', text: 'Only working, up-to-date feeds go into the answer. Stale or broken ones are left out.' },
      { who: 'check', actor: 'OmniOS', title: 'See the sources', text: 'Every answer shows the sources that fed it.' },
    ],
    results: [
      { title: 'Know what the AI knows', text: 'The answer’s context is the wires you drew, and nothing hidden.' },
      { title: 'Bad data stays out', text: 'Feeds that fail or go stale stop counting automatically.' },
      { title: 'Traceable chains', text: 'With the optional ledger, follow an answer back through other personas to the original data.' },
    ],
    control: 'Your canvas stays in your browser, and you decide every connection.',
    status: 'Local-first preview',
    link: { href: '/projects/omnios/', label: 'Explore OmniOS' },
  },
  rise: {
    headline: 'Reading that moves at your pace, with images and sound around the words.',
    audience: 'For readers who want a book to feel like an experience.',
    steps: [
      { who: 'you', actor: 'You', title: 'Say how you want to read', text: '“Something slow and calm tonight”, or “fast, bold and vivid”.' },
      { who: 'tool', actor: 'Your model', title: 'Jev or Kev sets the scene', text: 'On your own OpenRouter account, or a local Kev on your machine, it picks a released book and a reading plan from options RISE offers.' },
      { who: 'system', actor: 'RISE', title: 'Read in motion', text: 'Words arrive at your pace, with visuals and a sound bed, in your browser.' },
      { who: 'you', actor: 'You', title: 'Change anything', text: 'Adjust pace, look and sound as you go. Reading never waits on a model.' },
    ],
    results: [
      { title: 'Matched to your mood', text: 'In one earlier run on the retired hosted path, Jev matched 48 of 49 explicit preferences; cost, latency and calibration were not measured. Local Kev scored poorly on RISE’s evaluations.' },
      { title: 'Text, image and sound together', text: 'A reading room rather than a page.' },
      { title: 'Your files stay with you', text: 'Texts you bring are read in your browser. Requests, and sections of the text for visual direction, go to a model only on your own connection (a text you bring, only with your consent); SyberLabs holds no key.' },
    ],
    control: 'The model only suggests. You can override every choice at any time, and reading needs no model.',
    status: 'Live app',
    link: { href: 'https://rise.syberlabs.io/', label: 'Enter RISE' },
  },
  barn: {
    headline: 'AI agent teams that grow only when the work needs it, and finish only with proof.',
    audience: 'For teams running long coding tasks with several AI agents.',
    steps: [
      { who: 'you', actor: 'You', title: 'Set a goal', text: 'The run starts with one lead agent and a limit on team size.' },
      { who: 'system', actor: 'Barn', title: 'Work breaks down', text: 'Tasks are recorded with the skills they need.' },
      { who: 'check', actor: 'Barn', title: 'Specialists only for gaps', text: 'A new agent joins only when a task needs a skill nobody has.' },
      { who: 'check', actor: 'Barn', title: 'Done means checked', text: 'Work closes only with a result, checked by a different agent when the task requires it.' },
    ],
    results: [
      { title: 'No idle agents', text: 'Every agent can say exactly why it exists, and can retire once its work is done.' },
      { title: 'No unchecked “done”', text: 'Nothing closes without a result, and no agent can verify its own work.' },
      { title: 'Full audit', text: 'The team’s whole history replays to the same state.' },
    ],
    control: 'Agents can only propose. A rules engine, not a model, decides every change.',
    status: 'Research prototype',
    link: { href: 'https://github.com/sykosyber/bough-and-barn', label: 'View the code' },
  },
  osahr: {
    headline: 'Simulations of systems that rewire themselves, replayable exactly.',
    audience: 'For researchers modeling networks, agents and adaptive systems.',
    steps: [
      { who: 'you', actor: 'You', title: 'Describe the system', text: 'Its parts, how they connect, and the rules by which they can change.' },
      { who: 'system', actor: 'OSAHR', title: 'Run it through time', text: 'Changes happen at random, following exact probabilities.' },
      { who: 'check', actor: 'OSAHR', title: 'Every change is recorded', text: 'Each step keeps its cause and a fingerprint of the whole state.' },
      { who: 'you', actor: 'You', title: 'Replay and compare', text: 'Re-run any history step for step, or change the rules and compare.' },
    ],
    results: [
      { title: 'Same seed, same world', text: 'A run replays to identical states, checked at every step.' },
      { title: 'Rules that change are recorded too', text: 'Shifts in the rules themselves are part of the history.' },
      { title: 'Claims stay honest', text: 'Results are graded Known, Measured, Inferred or Proposed.' },
    ],
    control: 'These are research models of mechanisms, not calibrated forecasts.',
    status: 'Research kernel',
    link: { href: '/projects/osahr/', label: 'Explore OSAHR' },
  },
  runtime: {
    headline: 'AI-written code can’t be marked finished until it’s shown to work.',
    audience: 'For developers who let coding agents write and ship code.',
    steps: [
      { who: 'tool', actor: 'Coding agent', title: 'Code is written', text: 'An agent or a person records a new piece of code.' },
      { who: 'system', actor: 'SyberRuntime', title: 'It becomes a debt', text: 'The runtime notes that proof is owed before it can be trusted.' },
      { who: 'check', actor: 'SyberRuntime', title: 'Checks run', text: 'A failing check is kept on record and clears nothing.' },
      { who: 'check', actor: 'SyberRuntime', title: 'Only proven code is final', text: 'Finishing is refused until a passing check clears the debt.' },
    ],
    results: [
      { title: 'No unproven “done”', text: 'Finishing is blocked, not just warned about.' },
      { title: 'Failures are remembered', text: 'Running a test is not the same as passing one.' },
      { title: 'Tamper-evident history', text: 'Every step is chained, so edits to the past would show.' },
    ],
    control: 'No caller can override the block. Only passing evidence clears it.',
    status: 'Research kernel',
    link: { href: 'https://github.com/sykosyber/syber_runtime', label: 'View the code' },
  },
};
