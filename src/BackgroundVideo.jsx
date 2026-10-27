import React, { useEffect, useRef, useState } from 'react';
import { HERO_MEDIA } from './hero-media.js';

// onTime(seconds) reports the clip's own playback time, which the homepage reveal follows; onUnavailable() fires
// when the clip cannot play here (reduced motion or a media error), so nothing waits on it.
export default function BackgroundVideo({ pitchPlaying, onTime, onUnavailable }) {
  const movie = useRef(null);
  const [allowed, setAllowed] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = matchMedia('(max-width: 600px)');
    const update = () => { setAllowed(!reduced.matches); setPortrait(narrow.matches); };
    update();
    reduced.addEventListener('change', update); narrow.addEventListener('change', update);
    return () => { reduced.removeEventListener('change', update); narrow.removeEventListener('change', update); };
  }, []);
  const src = portrait ? HERO_MEDIA.portrait : HERO_MEDIA.landscape;
  const report = useRef({ onTime, onUnavailable }); report.current = { onTime, onUnavailable };
  useEffect(() => { if (failed || matchMedia('(prefers-reduced-motion: reduce)').matches) report.current.onUnavailable?.(); }, [failed]);
  useEffect(() => {
    const video = movie.current;
    if (!allowed || failed || !video) return;
    const rect = video.getBoundingClientRect();
    let inView = rect.bottom > 0 && rect.top < innerHeight;
    const sync = () => {
      const covered = document.documentElement.classList.contains('sy-atlas-open');
      if (paused || pitchPlaying || !inView || document.hidden || covered) video.pause();
      else video.play().catch(error => { if (error.name !== 'AbortError') setFailed(true); });
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }) : null;
    observer?.observe(video);
    const menu = new MutationObserver(sync);
    menu.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { observer?.disconnect(); menu.disconnect(); document.removeEventListener('visibilitychange', sync); video.pause(); };
  }, [allowed, failed, paused, pitchPlaying, src]);
  if (!allowed || failed) return null;
  return <>
    <video ref={movie} className={`pitch-hero__background${ready ? ' is-ready' : ''}`} src={src} autoPlay muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} onLoadStart={() => setReady(false)} onPlaying={() => setReady(true)} onTimeUpdate={e => report.current.onTime?.(e.currentTarget.currentTime)} onError={() => setFailed(true)} />
    {!pitchPlaying && <button className="pitch-hero__motion" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Play background motion' : 'Pause background motion'}</button>}
  </>;
}
