(() => {
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
