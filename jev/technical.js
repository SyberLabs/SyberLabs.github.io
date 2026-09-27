const primitiveTabs = [...document.querySelectorAll('[data-primitive]')];
const primitivePanel = document.getElementById('primitive-panel');
const primitiveTitle = document.getElementById('primitive-title');
const primitiveDescription = document.getElementById('primitive-description');
const distribution = document.getElementById('primitive-distribution');
const code = document.getElementById('primitive-code');
const field = document.getElementById('decision-field');

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

let activePrimitive = 'choice';
function renderPrimitive(name) {
  const item = primitives[name];
  if (!item) return;
  activePrimitive = name;
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
  drawField(performance.now() / 1000);
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

const context = field?.getContext('2d');
let visible = false;
let animationFrame = 0;
let lastFrame = 0;
function drawField(seconds) {
  if (!context || !field) return;
  const bounds = field.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;
  if (width < 1 || height < 1) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);
  if (field.width !== targetWidth || field.height !== targetHeight) {
    field.width = targetWidth;
    field.height = targetHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = 'screen';
  const kind = { choice: 0, noul: 1, score: 2 }[activePrimitive];
  const t = seconds * 0.35;
  const point = (u, v) => {
    const base = kind === 0
      ? Math.sin(u * 5.3 + t) * Math.cos(v * 3.2 - t * .4)
      : kind === 1
        ? Math.cos(u * 3.1 - t) * Math.exp(-Math.abs(v) * .9)
        : Math.sin(u * 7.4 + t) * Math.sin(v * 4.4 + t * .3);
    const ridge = Math.exp(-((u - .3) ** 2 + (v + .1) ** 2) * 7) * .8;
    return [width * .5 + (u + v * .48) * width * .34,
      height * .59 + v * height * .29 - (base * .6 + ridge) * height * .16];
  };
  for (let v = -1; v <= 1.01; v += .09) {
    context.beginPath();
    for (let u = -1; u <= 1.01; u += .025) {
      const [x, y] = point(u, v);
      if (u === -1) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    const hue = (265 + v * 85 + kind * 38 + seconds * 3) % 360;
    context.strokeStyle = `hsla(${hue}, 100%, 72%, ${.35 + (v + 1) * .23})`;
    context.lineWidth = v > .5 ? 1.6 : 1;
    context.shadowBlur = 12;
    context.shadowColor = `hsl(${hue}, 100%, 60%)`;
    context.stroke();
  }
  context.shadowBlur = 0;
  for (let u = -1; u <= 1.01; u += .13) {
    context.beginPath();
    for (let v = -1; v <= 1.01; v += .025) {
      const [x, y] = point(u, v);
      if (v === -1) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = 'rgba(115, 245, 220, .2)';
    context.lineWidth = .7;
    context.stroke();
  }
  context.globalCompositeOperation = 'source-over';
}

function animate(time) {
  if (!visible) return;
  if (time - lastFrame > 32) {
    drawField(time / 1000);
    lastFrame = time;
  }
  animationFrame = requestAnimationFrame(animate);
}

if (primitiveTabs.length && primitivePanel && primitiveTitle && primitiveDescription && distribution && code) {
  renderPrimitive('choice');
  if (field && context) {
    const resize = new ResizeObserver(() => drawField(performance.now() / 1000));
    resize.observe(field);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(animationFrame);
        if (visible) animationFrame = requestAnimationFrame(animate);
      }, { threshold: .02 });
      observer.observe(field);
    }
  }
}
