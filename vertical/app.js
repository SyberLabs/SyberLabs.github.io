/* ============================================================================
   VERTICAL — Presentation Orchestrator, Surface Transitions & HUD (20 Slides)
   ============================================================================ */

(function () {
  window.VERTICAL = window.VERTICAL || {};

  const SLIDES = window.VERTICAL.SLIDES;
  let current = 0;
  let isTransitioning = false;
  let autoPlay = false;
  let autoTimer = null;
  let autoStart = 0;
  const AUTO_DURATION = 11000;

  const stage = document.getElementById('deck-stage');
  const veil = document.getElementById('transition-veil');
  const hudAct = document.getElementById('hud-act-label');
  const hudEpoch = document.getElementById('hud-epoch-value');
  const hudNum = document.getElementById('hud-slide-num');
  const hudTotal = document.getElementById('hud-slide-total');
  const hudTitle = document.getElementById('hud-slide-title');
  const hudFill = document.getElementById('hud-progress-fill');
  const hudAutoBar = document.getElementById('hud-autoplay-bar');
  const hudDots = document.getElementById('hud-dots');

  const notesDrawer = document.getElementById('notes-drawer');
  const notesHeading = document.getElementById('notes-slide-heading');
  const notesBody = document.getElementById('notes-body');
  const overviewModal = document.getElementById('overview-modal');
  const overviewGrid = document.getElementById('overview-grid');
  const sourcesModal = document.getElementById('sources-modal');
  const helpModal = document.getElementById('help-modal');

  const btnAudio = document.getElementById('btn-audio');
  const btnAuto = document.getElementById('btn-autoplay');
  const btnSources = document.getElementById('btn-sources');
  const btnNotes = document.getElementById('btn-notes');
  const btnOverview = document.getElementById('btn-overview');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnHelp = document.getElementById('btn-help');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnHome = document.getElementById('btn-home');

  const slideEls = [];

  function mountSlides() {
    if (hudTotal) hudTotal.textContent = String(SLIDES.length).padStart(2, '0');

    SLIDES.forEach((s, idx) => {
      const sec = document.createElement('section');
      sec.className = 'slide' + (idx === 0 ? ' active' : '');
      sec.dataset.index = String(idx);
      sec.dataset.id = s.id;
      sec.setAttribute('aria-label', `Slide ${s.num}: ${s.title}`);
      sec.innerHTML = s.html;
      stage.appendChild(sec);
      slideEls.push(sec);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hud-dot' + (idx === 0 ? ' active' : '');
      dot.title = `${s.num} · ${s.title}`;
      dot.setAttribute('aria-label', `Go to slide ${idx + 1}: ${s.title}`);
      dot.addEventListener('click', () => goTo(idx));
      hudDots.appendChild(dot);

      const tile = document.createElement('button');
      tile.type = 'button';
      const surfCls = s.surface === 'vellum' ? ' is-vellum' : s.surface === 'ember' ? ' is-ember' : '';
      tile.className = 'overview-tile' + surfCls + (idx === 0 ? ' current' : '');
      tile.innerHTML = `
        ${s.thumb ? `<img class="overview-tile-bg" src="${s.thumb}" alt="" loading="lazy" />` : ''}
        <div class="overview-tile-top">
          <span>${s.num} · ${s.actLabel}</span>
          <span>${s.epoch}</span>
        </div>
        <h4>${s.title}</h4>
        <p>${s.summary}</p>
      `;
      tile.addEventListener('click', () => { toggleOverview(false); goTo(idx); });
      overviewGrid.appendChild(tile);
    });

    stage.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'next') next();
      else if (act === 'restart') goTo(0);
      else if (act === 'overview') toggleOverview(true);
      else if (act === 'sources') toggleSources(true);
      else if (act === 'notes') toggleNotes();
      else if (act === 'sound') toggleAudio();
    });
  }

  function updateChrome(idx) {
    const s = SLIDES[idx];
    const surface = s.surface || 'obsidian';
    document.body.dataset.act = s.act;
    document.body.dataset.surface = surface;
    document.body.dataset.slide = String(idx);

    if (hudAct) hudAct.textContent = s.actLabel;
    if (hudEpoch) hudEpoch.textContent = s.epoch;
    if (hudNum) hudNum.textContent = s.num;
    if (hudTitle) hudTitle.textContent = s.shortTitle;

    if (hudFill) hudFill.style.width = `${((idx + 1) / SLIDES.length) * 100}%`;

    Array.from(hudDots.children).forEach((d, i) => d.classList.toggle('active', i === idx));
    Array.from(overviewGrid.children).forEach((t, i) => t.classList.toggle('current', i === idx));

    if (notesHeading) notesHeading.textContent = `${s.num} · ${s.title}`;
    if (notesBody) notesBody.innerHTML = s.notes;

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', `#slide-${idx + 1}`);
    }

    window.VERTICAL.bg?.setState(idx, s.act, surface);
    window.VERTICAL.audio?.setAct(s.act);
    window.VERTICAL.setActiveSimulation?.(idx);
  }

  function clearTransitionClasses(el) {
    Array.from(el.classList)
      .filter((c) => c.startsWith('enter-') || c.startsWith('leave-') || c === 'leaving')
      .forEach((c) => el.classList.remove(c));
  }

  function goTo(targetIdx, forcedInstant = false) {
    const nextIdx = Math.max(0, Math.min(SLIDES.length - 1, targetIdx));
    if (nextIdx === current && !forcedInstant) return;
    if (isTransitioning && !forcedInstant) return;

    const prevEl = slideEls[current];
    const nextEl = slideEls[nextIdx];
    const dir = nextIdx >= current ? 'fwd' : 'bwd';
    const trans = SLIDES[nextIdx].transition || 'zwarp';

    if (forcedInstant) {
      slideEls.forEach((el) => { el.classList.remove('active'); clearTransitionClasses(el); });
      nextEl.classList.add('active');
      current = nextIdx;
      updateChrome(current);
      return;
    }

    isTransitioning = true;
    clearTransitionClasses(prevEl);
    clearTransitionClasses(nextEl);

    if ((trans === 'phase' || trans === 'portal') && (SLIDES[nextIdx].surface || 'obsidian') === 'obsidian') {
      veil.className = 'transition-veil ' + (trans === 'phase' ? 'flash-phase' : 'flash-portal');
      setTimeout(() => { veil.className = 'transition-veil'; }, 340);
    }

    window.VERTICAL.audio?.playTransition(trans);

    prevEl.classList.remove('active');
    prevEl.classList.add('leaving', `leave-${trans}-${dir}`);
    nextEl.classList.add('active', `enter-${trans}-${dir}`);

    current = nextIdx;
    updateChrome(current);
    if (autoPlay) resetAutoTimer();

    setTimeout(() => {
      clearTransitionClasses(prevEl);
      clearTransitionClasses(nextEl);
      isTransitioning = false;
    }, trans === 'stillness' ? 1050 : 840);
  }

  function next() { if (current < SLIDES.length - 1) goTo(current + 1); else if (autoPlay) goTo(0); }
  function prev() { if (current > 0) goTo(current - 1); }

  function toggleAudio() {
    const on = window.VERTICAL.audio?.toggle();
    btnAudio?.classList.toggle('active', Boolean(on));
  }

  function toggleNotes(force) {
    const open = typeof force === 'boolean' ? force : !notesDrawer.classList.contains('open');
    notesDrawer.classList.toggle('open', open);
    notesDrawer.setAttribute('aria-hidden', String(!open));
    btnNotes?.classList.toggle('active', open);
  }

  function toggleOverview(force) {
    const open = typeof force === 'boolean' ? force : !overviewModal.classList.contains('open');
    overviewModal.classList.toggle('open', open);
    overviewModal.setAttribute('aria-hidden', String(!open));
    btnOverview?.classList.toggle('active', open);
    if (open) { toggleHelp(false); toggleSources(false); }
  }

  function toggleSources(force) {
    const open = typeof force === 'boolean' ? force : !sourcesModal.classList.contains('open');
    sourcesModal.classList.toggle('open', open);
    sourcesModal.setAttribute('aria-hidden', String(!open));
    btnSources?.classList.toggle('active', open);
    if (open) { toggleHelp(false); toggleOverview(false); }
  }

  function toggleHelp(force) {
    const open = typeof force === 'boolean' ? force : !helpModal.classList.contains('open');
    helpModal.classList.toggle('open', open);
    helpModal.setAttribute('aria-hidden', String(!open));
    if (open) { toggleOverview(false); toggleSources(false); }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }

  function resetAutoTimer() {
    if (autoTimer) clearTimeout(autoTimer);
    autoStart = performance.now();
    autoTimer = setTimeout(() => { if (autoPlay) next(); }, AUTO_DURATION);
  }

  function tickAutoBar() {
    if (autoPlay && hudAutoBar) {
      hudAutoBar.style.width = `${Math.min(100, ((performance.now() - autoStart) / AUTO_DURATION) * 100)}%`;
    } else if (hudAutoBar) {
      hudAutoBar.style.width = '0%';
    }
    requestAnimationFrame(tickAutoBar);
  }

  function toggleAutoPlay() {
    autoPlay = !autoPlay;
    btnAuto?.classList.toggle('active', autoPlay);
    if (autoPlay) resetAutoTimer(); else if (autoTimer) clearTimeout(autoTimer);
  }

  function bindEvents() {
    btnPrev?.addEventListener('click', prev);
    btnNext?.addEventListener('click', next);
    btnHome?.addEventListener('click', () => goTo(0));
    btnAudio?.addEventListener('click', toggleAudio);
    btnAuto?.addEventListener('click', toggleAutoPlay);
    btnSources?.addEventListener('click', () => toggleSources());
    btnNotes?.addEventListener('click', () => toggleNotes());
    btnOverview?.addEventListener('click', () => toggleOverview());
    btnFullscreen?.addEventListener('click', toggleFullscreen);
    btnHelp?.addEventListener('click', () => toggleHelp());

    document.getElementById('btn-close-notes')?.addEventListener('click', () => toggleNotes(false));
    document.getElementById('btn-close-overview')?.addEventListener('click', () => toggleOverview(false));
    document.getElementById('btn-close-sources')?.addEventListener('click', () => toggleSources(false));
    document.getElementById('btn-close-help')?.addEventListener('click', () => toggleHelp(false));
    helpModal?.addEventListener('click', (e) => { if (e.target === helpModal) toggleHelp(false); });
    sourcesModal?.addEventListener('click', (e) => { if (e.target === sourcesModal) toggleSources(false); });

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (e.key === 'Escape') {
        toggleOverview(false); toggleSources(false); toggleHelp(false); toggleNotes(false);
        return;
      }
      const anyModal = overviewModal.classList.contains('open') || sourcesModal.classList.contains('open') || helpModal.classList.contains('open');
      if (e.key === 'g' || e.key === 'G') { toggleOverview(); return; }
      if (e.key === 'b' || e.key === 'B') { toggleSources(); return; }
      if (anyModal) return;

      switch (e.key) {
        case 'ArrowRight': case 'PageDown': case ' ': e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'PageUp': e.preventDefault(); prev(); break;
        case 'Home': e.preventDefault(); goTo(0); break;
        case 'End': e.preventDefault(); goTo(SLIDES.length - 1); break;
        case 'n': case 'N': toggleNotes(); break;
        case 's': case 'S': toggleAudio(); break;
        case 'a': case 'A': toggleAutoPlay(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'h': case 'H': document.body.classList.toggle('hud-hidden'); break;
        case '?': toggleHelp(); break;
      }
    });

    let lastWheel = 0;
    window.addEventListener('wheel', (e) => {
      if (overviewModal.classList.contains('open') || sourcesModal.classList.contains('open') || helpModal.classList.contains('open')) return;
      if (e.target.closest('.notes-drawer')) return;
      const now = performance.now();
      if (now - lastWheel < 900) return;
      if (Math.abs(e.deltaY) > 42 || Math.abs(e.deltaX) > 42) {
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        lastWheel = now;
        if (delta > 0) next(); else prev();
      }
    }, { passive: true });

    let touchStartX = 0;
    window.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    window.addEventListener('touchend', (e) => {
      if (e.target.closest('input, button')) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 60) { if (dx < 0) next(); else prev(); }
    }, { passive: true });
  }

  window.addEventListener('DOMContentLoaded', () => {
    mountSlides();
    window.VERTICAL.initBackdrop?.();
    window.VERTICAL.initSimulations?.();
    bindEvents();
    requestAnimationFrame(tickAutoBar);

    const match = window.location.hash.match(/#slide-(\d+)/);
    const startIdx = match ? Math.max(0, Math.min(SLIDES.length - 1, parseInt(match[1], 10) - 1)) : 0;
    goTo(startIdx, true);
  });
})();
