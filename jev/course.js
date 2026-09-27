(() => {
  const probability = document.getElementById('lab-probability');
  const harm = document.getElementById('lab-harm');
  const review = document.getElementById('lab-review');
  const plot = document.querySelector('.lab-plot');

  function updateLab() {
    const p = Number(probability.value) / 100;
    const wrongCost = Number(harm.value);
    const reviewCost = Number(review.value);
    const actLoss = (1 - p) * wrongCost;
    const shouldAct = actLoss < reviewCost;
    document.getElementById('probability-value').textContent = p.toFixed(2);
    document.getElementById('harm-value').textContent = '$' + wrongCost;
    document.getElementById('review-value').textContent = '$' + reviewCost;
    document.getElementById('act-loss').textContent = '$' + actLoss.toFixed(2);
    document.getElementById('review-loss').textContent = '$' + reviewCost.toFixed(2);
    document.getElementById('lab-result').textContent = shouldAct ? 'ACT*' : 'REVIEW';
    document.getElementById('lab-explanation').textContent = shouldAct
      ? 'Lower expected loss, only if separately authorized.'
      : 'Review has lower or equal expected loss.';

    const top = Math.max(wrongCost, reviewCost) * 1.12;
    const y = value => 235 - value / top * 195;
    const markerX = 40 + p * 520;
    const markerY = y(actLoss);
    const svg = `<svg viewBox="0 0 600 280" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="loss-line" x1="0" x2="1"><stop stop-color="#a86dff"/><stop offset=".52" stop-color="#6aece8"/><stop offset="1" stop-color="#d8fa89"/></linearGradient></defs>
      <path d="M40 40 V235 H560" fill="none" stroke="#9fb2d177" stroke-width="1"/>
      <path d="M40 ${y(reviewCost).toFixed(1)} H560" fill="none" stroke="#f397dd" stroke-width="2" stroke-dasharray="7 6"/>
      <path d="M40 ${y(wrongCost).toFixed(1)} L560 ${y(0).toFixed(1)}" fill="none" stroke="url(#loss-line)" stroke-width="4"/>
      <path d="M${markerX.toFixed(1)} 40 V235" fill="none" stroke="#ffffff70" stroke-dasharray="3 5"/>
      <circle cx="${markerX.toFixed(1)}" cy="${markerY.toFixed(1)}" r="8" fill="#d8fa89" stroke="#10222d" stroke-width="3"/>
      <text x="40" y="257" fill="#a8c6d5" font-size="11">0</text><text x="548" y="257" fill="#a8c6d5" font-size="11">1</text>
    </svg>`;
    plot.querySelector('svg')?.remove();
    plot.insertAdjacentHTML('afterbegin', svg);
    plot.setAttribute('aria-label', `Synthetic expected loss chart. At probability ${p.toFixed(2)}, act loss is $${actLoss.toFixed(2)} and review cost is $${reviewCost.toFixed(2)}. ${shouldAct ? 'Act if authorized' : 'Review'} has lower expected loss.`);
  }

  [probability, harm, review].forEach(input => input.addEventListener('input', updateLab));
  updateLab();

  const systems = {
    b2b: {
      label: 'WORKED B2B FLOW',
      title: 'Support triage across tenants',
      copy: 'A tenant-scoped ticket arrives through an authenticated operator. The server minimizes state and asks a Choice question about the next queue. Product code checks the returned enum, tenant revision, operator role, policy, and per-tenant budget. A mismatch holds the ticket for review. The audit record stays inside that tenant boundary.',
      nodes: [
        ['01 / IDENTITY', 'Tenant + operator', 'SSO, role, scoped ticket ID'],
        ['02 / STATE', 'Tenant gateway', 'Minimize fields; enforce budget'],
        ['03 / JUDGMENT', 'Jev Choice', 'Known queues + “other”'],
        ['04 / POLICY', 'Authorization gate', 'Fresh role, revision, tenant rules'],
        ['05 / OUTCOME', 'Queue or review', 'Idempotent action + tenant audit']
      ],
      code: `// Reference policy pseudocode; not a live endpoint
ticket = loadForTenant(tenantId, ticketId)
assertRole(operator, tenantId, "triage")
snapshot = minimize(ticket)
answer = jev.choice(snapshot, allowedQueues + ["other"])

if (!validEnum(answer) || ticket.revision !== currentRevision)
  return hold("stale_or_invalid")
if (answer.choice === "other")
  return hold("uncovered_case")
if (!tenantPolicy.allows(answer.choice, operator))
  return hold("denied")
return enqueueOnce(ticket.id, answer.choice, requestId)`
    },
    b2c: {
      label: 'WORKED B2C FLOW',
      title: 'A reader-controlled next step',
      copy: 'A consumer opts in to an adaptive reading moment. The client sends a minimal reading snapshot to a server gateway; the response proposes continue, slower, or pause. Local reader settings, cancellation, presentation bounds, and current session state decide what can render. The reader can override or turn adaptation off.',
      nodes: [
        ['01 / CONSENT', 'Reader setting', 'Explicit opt-in + session scope'],
        ['02 / STATE', 'Minimal snapshot', 'Only text and fields needed'],
        ['03 / JUDGMENT', 'Jev Choice', 'Continue / slower / pause'],
        ['04 / POLICY', 'Client + server gates', 'Fresh consent, cancellation, limits'],
        ['05 / OUTCOME', 'Render or hold', 'Reversible change + user override']
      ],
      code: `// Reference policy pseudocode; not a live endpoint
if (!session.consent || session.cancelled)
  return defaultReadingMode()
answer = await gateway.ask(minimize(readingState))

if (!validChoice(answer, ["continue", "slower", "pause"]))
  return defaultReadingMode()
if (!session.isCurrent() || !readerBounds.allow(answer.choice))
  return defaultReadingMode()
return renderReversible(answer.choice, { override: true })`
    }
  };

  const tabs = [...document.querySelectorAll('[data-saas]')];
  const panel = document.getElementById('saas-panel');
  function setSystem(key) {
    const data = systems[key];
    tabs.forEach(tab => {
      const selected = tab.dataset.saas === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', 'saas-tab-' + key);
    document.getElementById('saas-example-label').textContent = data.label;
    document.getElementById('saas-example-title').textContent = data.title;
    document.getElementById('saas-example-copy').textContent = data.copy;
    document.getElementById('saas-code').textContent = data.code;
    document.getElementById('saas-diagram').innerHTML = data.nodes.map(([number, title, detail]) =>
      `<div class="saas-node"><span>${number}</span><strong>${title}</strong><small>${detail}</small></div>`
    ).join('');
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setSystem(tab.dataset.saas));
    tab.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      setSystem(next.dataset.saas);
      next.focus();
    });
  });
  setSystem('b2b');
})();
