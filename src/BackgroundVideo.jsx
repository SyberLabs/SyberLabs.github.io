import React, { useEffect, useRef, useState } from 'react';
import { HERO_MEDIA } from './hero-media.js';

// onTime(seconds) reports the clip's own playback time, which the homepage reveal follows; onUnavailable() fires
// when the clip cannot play here (reduced motion or a media error), so nothing waits on it.
// Phones (600px and narrower) play the portrait cut. When the clip cannot move (reduced motion, a media error, or
// autoplay blocked, as iOS does in Low Power Mode), its poster stands in.
// If autoplay was blocked, the visitor's first tap or key press starts the motion (a gesture lets iOS play it).
export default function BackgroundVideo({ pitchPlaying = false, onTime, onUnavailable }) {
  const clip = useRef(null);
  const movie = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false); // autoplay refused (NotAllowedError) until a gesture
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = matchMedia('(max-width: 600px)');
    const update = () => { setAllowed(!reduced.matches); setPortrait(narrow.matches); };
    update(); setMounted(true);
    reduced.addEventListener('change', update); narrow.addEventListener('change', update);
    return () => { reduced.removeEventListener('change', update); narrow.removeEventListener('change', update); };
  }, []);
  const still = mounted && (!allowed || failed || blocked);
  const src = portrait ? HERO_MEDIA.portrait : HERO_MEDIA.landscape;
  const report = useRef({ onTime, onUnavailable }); report.current = { onTime, onUnavailable };
  // the reveal never waits on a clip that cannot move
  useEffect(() => { if (still) report.current.onUnavailable?.(); }, [still]);
  useEffect(() => {
    const video = movie.current;
    if (!allowed || failed || !video) return;
    const rect = video.getBoundingClientRect();
    let inView = rect.bottom > 0 && rect.top < innerHeight;
    const attempt = () => video.play().then(() => setBlocked(false)).catch(error => {
      if (error.name === 'NotAllowedError') setBlocked(true); else if (error.name !== 'AbortError') setFailed(true);
    });
    const sync = () => {
      const covered = document.documentElement.classList.contains('sy-atlas-open');
      if (paused || pitchPlaying || !inView || document.hidden || covered) video.pause();
      else attempt();
    };
    // autoplay refused: the next tap or key press is a gesture, and play() called inside it is allowed
    const gesture = () => { if (!paused && !pitchPlaying) attempt(); };
    if (blocked) { addEventListener('pointerdown', gesture, { passive: true }); addEventListener('keydown', gesture); }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }) : null;
    observer?.observe(video);
    const menu = new MutationObserver(sync);
    menu.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', sync);
    if (!blocked) sync();
    return () => { observer?.disconnect(); menu.disconnect(); document.removeEventListener('visibilitychange', sync); removeEventListener('pointerdown', gesture); removeEventListener('keydown', gesture); video.pause(); };
  }, [allowed, failed, blocked, paused, pitchPlaying, src]);
  if (!mounted) return null;
  return <>
    <div ref={clip} className={`pitch-hero__clip${still ? ' is-still' : ''}`} aria-hidden="true">
      {still && <img className="pitch-hero__still" src={portrait ? HERO_MEDIA.portraitPoster : HERO_MEDIA.still} width={portrait ? 720 : 1280} height={portrait ? 1280 : 720} alt="" decoding="async" />}
      {allowed && !failed && <video ref={movie} className={`pitch-hero__background${ready && !blocked ? ' is-ready' : ''}`} src={src} autoPlay muted loop playsInline preload={blocked ? 'auto' : 'none'} tabIndex={-1} onLoadStart={() => setReady(false)} onPlaying={() => { setReady(true); setBlocked(false); }} onTimeUpdate={e => report.current.onTime?.(e.currentTarget.currentTime)} onError={() => setFailed(true)} />}
    </div>
    {allowed && !failed && !blocked && !pitchPlaying && <button className="pitch-hero__motion" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Play motion' : 'Pause motion'}</button>}
  </>;
}
