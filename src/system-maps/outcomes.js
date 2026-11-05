// The "What it does" face of each system card: user outcomes, stated only as
// far as each repository supports them. Actors: you (the person), system
// (the SyberLabs system), tool (an outside model or service), check (a rule
// in code). Evidence for each claim is listed in docs/SYSTEM_MAPS.md.

export const outcomes = {
  omnios: {
    headline: 'Wire live data into AI personas, and see exactly what each answer used. The public preview lets you explore the data and wiring; asking runs locally with your own model.',
    audience: 'For people who think through markets, economics and news with AI.',
    steps: [
      { who: 'you', actor: 'You', title: 'Place live data', text: 'Prediction markets, crypto, economic series, news and research, as blocks on a canvas.' },
      { who: 'you', actor: 'You', title: 'Wire it to a persona', text: 'A wire means “this feeds that”. A persona knows only what its wires carry.' },
      { who: 'system', actor: 'FLYSPACE', title: 'Ask a question', text: 'Locally, with your own model (for example through Ollama); AI answers are off on the public preview. Only working, up-to-date feeds go into the answer. Stale or broken ones are left out.' },
      { who: 'check', actor: 'FLYSPACE', title: 'See the sources', text: 'Every answer shows the sources that fed it.' },
    ],
    results: [
      { title: 'Know what the AI knows', text: 'The answer’s context is the wires you drew, and nothing hidden.' },
      { title: 'Bad data stays out', text: 'Feeds that fail or go stale stop counting automatically.' },
      { title: 'Traceable chains', text: 'With the optional ledger, follow an answer back through other personas to the original data.' },
    ],
    control: 'Your canvas stays in your browser, and you decide every connection.',
    status: 'Local-first preview',
    link: { href: '/projects/flyspace/', label: 'Explore FLYSPACE' },
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
      { title: 'Stated preferences honoured', text: 'In one earlier run on the retired hosted path, Jev matched 48 of 49 explicit preferences; cost, latency and calibration were not measured. Local Kev did not meet RISE’s bar in internal checks.' },
      { title: 'Text, image and sound together', text: 'A reading room rather than a page.' },
      { title: 'Your files stay with you', text: 'Texts you bring are read in your browser. Requests, and sections of the text for visual direction, go to a model only on your own connection (a text you bring, only with your consent); SyberLabs holds no key.' },
    ],
    control: 'The model only suggests. You can override every choice at any time, and reading needs no model.',
    status: 'Live app',
    link: { href: 'https://rise.syberlabs.io/', label: 'Enter RISE' },
  },
};
