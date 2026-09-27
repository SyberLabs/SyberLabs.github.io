const primitiveTabs = [...document.querySelectorAll('[data-primitive]')];
const primitivePanel = document.getElementById('primitive-panel');
const primitiveTitle = document.getElementById('primitive-title');
const primitiveDescription = document.getElementById('primitive-description');
const distribution = document.getElementById('primitive-distribution');
const code = document.getElementById('primitive-code');

// Every value in this local illustration is synthetic. No provider call occurs here.
const primitives = {
  choice: {
    title: 'Which reading action fits this moment?',
    description: 'The product supplies only permitted choices. Jev selects among them; product code still decides whether to act.',
    bars: [['continue', 24], ['slower', 68], ['pause', 8]],
    request: {
      state: 'Admitted excerpt; adaptive pacing enabled; reader bounds recorded.',
      model: 'jev-latest',
      questions: { next_action: {
        type: 'choice',
        instructions: 'Which permitted action best fits this reading moment?',
        criteria: { continue: 'Keep pace', slower: 'Reduce pace', pause: 'Offer a pause' }
      } }
    },
    answer: { next_action: { type: 'choice', choice: 'slower', confidence: 0.81,
      probabilities: { continue: 0.24, slower: 0.68, pause: 0.08 } } }
  },
  noul: {
    title: 'Does this moment call for a pause?',
    description: 'A Noul question estimates a yes or no condition. The product sets the threshold and owns the resulting behavior.',
    bars: [['yes', 72], ['no', 28]],
    request: {
      state: 'Admitted excerpt; reader requested a quieter reading mode.',
      model: 'jev-latest',
      questions: { pause_signal: { type: 'noul', instructions: 'A pause would help at this moment.' } }
    },
    answer: { pause_signal: { type: 'noul', noul: 0.72 } }
  },
  score: {
    title: 'How intense is this passage?',
    description: 'A Score question places a judgment on a defined scale. The labels and any action threshold belong to the product.',
    bars: [['calm', 12], ['medium', 66], ['intense', 22]],
    request: {
      state: 'Admitted excerpt with reader-selected presentation bounds.',
      model: 'jev-latest',
      questions: { intensity: { type: 'score', instructions: 'Rate passage intensity.',
        criteria: ['Calm', 'Moderate', 'Intense'] } }
    },
    answer: { intensity: { type: 'score', score: 1.1, confidence: 0.70,
      probabilities: { 0: 0.12, 1: 0.66, 2: 0.22 } } }
  }
};

function renderPrimitive(name) {
  const item = primitives[name];
  if (!item) return;
  primitiveTabs.forEach((tab) => {
    const selected = tab.dataset.primitive === name;
    tab.classList.toggle('selected', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  primitivePanel.setAttribute('aria-labelledby', `tab-${name}`);
  primitiveTitle.textContent = item.title;
  primitiveDescription.textContent = item.description;
  distribution.replaceChildren();
  item.bars.forEach(([label, percent]) => {
    const row = document.createElement('div');
    row.className = 'distribution-row';
    const title = document.createElement('span');
    title.textContent = label;
    const track = document.createElement('span');
    track.className = 'track';
    const fill = document.createElement('span');
    fill.className = 'fill';
    fill.style.setProperty('--width', `${percent}%`);
    track.append(fill);
    const value = document.createElement('span');
    value.className = 'percent';
    value.textContent = `${percent}%`;
    row.append(title, track, value);
    distribution.append(row);
  });
  code.textContent = `REQUEST\n${JSON.stringify(item.request, null, 2)}\n\nILLUSTRATIVE ANSWER\n${JSON.stringify({ answers: item.answer }, null, 2)}\n\nPRODUCT POLICY\nvalidate → authorize → act or hold`;
}

primitiveTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => renderPrimitive(tab.dataset.primitive));
  tab.addEventListener('keydown', (event) => {
    const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    const next = primitiveTabs[(index + direction + primitiveTabs.length) % primitiveTabs.length];
    renderPrimitive(next.dataset.primitive);
    next.focus();
  });
});

if (primitiveTabs.length && primitivePanel && primitiveTitle && primitiveDescription && distribution && code) renderPrimitive('choice');
