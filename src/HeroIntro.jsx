import React, { useEffect, useRef, useState } from 'react';
import { EARTH_INTRO } from './hero-media.js';

// One bounded first-visit enhancement. Every failure exposes the served HTML.
export default function HeroIntro({ stage, copy, pitchPlaying, replay = false }) {
  const movie = useRef(null), canvas = useRef(null), skip = useRef(null), finish = useRef(() => {});
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement, hero = stage.current, content = copy.current, video = movie.current;
    let done = false, raf = 0, rain;
    const settle = (focus = false) => {
      if (done) return;
      done = true; cancelAnimationFrame(raf); video.pause();
      root.classList.remove('sy-intro-pending');
      content.inert = false; content.style.removeProperty('opacity'); content.style.removeProperty('visibility');
      try { sessionStorage.setItem('mateo-intro-seen', '1'); } catch {}
      hero.dataset.introState = 'settled'; setActive(false);
      if (focus) content.querySelector('h1').focus({ preventScroll: true });
    };
    finish.current = settle;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (replay && !reduced.matches) { root.classList.add('sy-intro-pending'); skip.current.focus({ preventScroll: true }); }
    if (!root.classList.contains('sy-intro-pending') || reduced.matches || scrollY > 8) { settle(); return; }
    content.inert = true; hero.dataset.introState = 'loading';
    const leave = () => settle();
    const scroll = () => { if (scrollY > 8) settle(); };
    const hide = () => { if (document.hidden) settle(); };
    const menu = new MutationObserver(() => { if (root.classList.contains('sy-atlas-open')) settle(); });
    menu.observe(root, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', leave); addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('visibilitychange', hide); reduced.addEventListener('change', leave);
    video.addEventListener('error', leave);
    const deadline = setTimeout(leave, 8500);
    (async () => {
      try {
        const [{ mountPointRain, sampleLayout, TIMING }] = await Promise.all([import('./site/hero-rain.js'), document.fonts.ready]);
        if (done) return;
        const W = hero.clientWidth, H = hero.clientHeight;
        rain = mountPointRain(canvas.current, sampleLayout([...content.querySelectorAll('[data-intro-target]')], W, H), W, H);
        if (!rain) { settle(); return; }
        video.addEventListener('playing', () => {
          if (done) return;
          hero.dataset.introReady = 'true'; hero.dataset.introState = 'running';
          const start = performance.now(); let last = 0;
          const tick = stamp => {
            if (done) return;
            try {
              if (stamp - last >= 1000 / 30) {
                last = stamp; const t = (stamp - start) / 1000;
                if (t >= TIMING.earthOut) video.style.opacity = '0';
                rain.render(t);
                if (t >= 5.95) { content.style.visibility = 'visible'; content.style.opacity = String(Math.min(1, (t - 5.95) / (TIMING.settled - 5.95))); }
                if (t >= TIMING.settled) { settle(); return; }
              }
              raf = requestAnimationFrame(tick);
            } catch { settle(); }
          };
          raf = requestAnimationFrame(tick);
        }, { once: true });
        video.src = matchMedia('(max-width:600px)').matches ? EARTH_INTRO.portrait : EARTH_INTRO.landscape;
        video.play().catch(leave);
      } catch { settle(); }
    })();
    return () => {
      done = true; cancelAnimationFrame(raf); clearTimeout(deadline); video.pause(); rain?.destroy(); menu.disconnect();
      removeEventListener('resize', leave); removeEventListener('scroll', scroll);
      document.removeEventListener('visibilitychange', hide); reduced.removeEventListener('change', leave); video.removeEventListener('error', leave);
      root.classList.remove('sy-intro-pending'); content.inert = false;
    };
  }, [stage, copy, active, replay]);
  useEffect(() => { if (pitchPlaying) finish.current(); }, [pitchPlaying]);
  if (!active) return null;
  return <>
    <div className="hero-intro" aria-hidden="true">
      <picture className="hero-intro__poster"><source media="(max-width:600px)" srcSet={EARTH_INTRO.portraitPoster} /><img src={EARTH_INTRO.poster} width="1280" height="720" alt="" fetchPriority="high" /></picture>
      <video ref={movie} muted playsInline preload="none" tabIndex={-1} /><canvas ref={canvas} />
    </div>
    <button ref={skip} className="hero-intro__skip" type="button" onClick={() => finish.current(true)}>Skip intro</button>
  </>;
}
