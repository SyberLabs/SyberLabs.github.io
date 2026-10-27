import React, { useEffect, useRef, useState } from 'react';
import { HERO_MEDIA } from './hero-media.js';
import { FRAME_ART, FRAME_DISC, earthRadius } from './frame-art.js';

const pickNext = last => { const pool = FRAME_ART.map((_, i) => i).filter(i => i !== last); return pool[Math.floor(Math.random() * pool.length)]; };

// onTime(seconds) reports the clip's own playback time, which the homepage reveal follows; onUnavailable() fires
// when the clip cannot play here (reduced motion or a media error), so nothing waits on it.
// Phones (600px and narrower) show the Gyre alone, full-bleed: no frame and no painting.
// When the clip cannot move (reduced motion, a media error, or autoplay blocked, as iOS does in Low Power Mode), wide
// screens show the clip's held frame with a painting laid in it; phones show the Gyre poster.
// If autoplay was blocked, the visitor's first tap or key press starts the motion (a gesture lets iOS play it).
// The Sophia frame: each pass of the clip shows one of FRAME_ART, chosen at random (never the same twice running).
// Earth is in the clip; the picture is laid over Earth's disc and follows Earth's measured size frame by frame, fully
// opaque and a little larger, so Earth is never seen.
// onArt(id) reports what the frame holds, for the credit line.
export default function BackgroundVideo({ pitchPlaying, onTime, onUnavailable, onArt }) {
  const clip = useRef(null), art = useRef(null);
  const [artIndex, setArtIndex] = useState(() => pickNext(-1));
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
  const framed = mounted && !portrait; // the Sophia frame and its painting: wide screens only
  const src = portrait ? HERO_MEDIA.portrait : HERO_MEDIA.landscape;
  const report = useRef({ onTime, onUnavailable, onArt }); report.current = { onTime, onUnavailable, onArt };
  useEffect(() => { report.current.onArt?.(framed ? FRAME_ART[artIndex].id : null); }, [artIndex, framed]);
  // fetch the paintings once, so a switch never waits on the network
  useEffect(() => { if (framed) FRAME_ART.forEach(a => { const i = new Image(); i.decoding = 'async'; i.src = a.src; }); }, [framed]);
  // Lay the painting's disc exactly over Earth's: the clip (and its still) are drawn object-fit: cover, so map the
  // clip's disc through the same scale and offset whenever the stage changes size.
  useEffect(() => {
    const box = clip.current, layer = art.current;
    if (!box || !layer) return;
    const place = () => {
      const d = portrait ? FRAME_DISC.portrait : FRAME_DISC.landscape, W = box.clientWidth, H = box.clientHeight;
      const k = Math.max(W / d.w, H / d.h), ox = (W - d.w * k) / 2, oy = (H - d.h * k) / 2;
      layer.style.setProperty('--disc-x', `${ox + d.x * k}px`); layer.style.setProperty('--disc-y', `${oy + d.y * k}px`); layer.style.setProperty('--disc-r', `${d.r * k}px`);
    };
    place();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(place) : null; ro?.observe(box);
    return () => ro?.disconnect();
  }, [portrait, mounted, allowed, failed, framed]);
  // Follow the clip frame by frame: the picture grows in as Earth does and shrinks away as Earth leaves; each new
  // pass of the clip (its time jumps back) draws the next choice. Still: the picture simply fills the frame.
  useEffect(() => {
    const video = movie.current, layer = art.current;
    if (!layer) return;
    if (still) { layer.style.opacity = '1'; layer.style.setProperty('--grow', '1'); return; }
    if (!video) return;
    let raf = 0, last = 0, index = artIndex;
    const frame = () => {
      const t = video.currentTime;
      if (t + 1 < last) { index = pickNext(index); setArtIndex(index); }
      last = t;
      const r = earthRadius(t); // a disc of Earth's circumradius covers its polygon; 6% more covers its anti-aliased edge
      layer.style.opacity = r > 0 ? '1' : '0'; layer.style.setProperty('--grow', r > 0 ? Math.min(1, r * 1.06 + .03).toFixed(3) : '0');
      raf = video.paused ? 0 : requestAnimationFrame(frame);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
    video.addEventListener('playing', go); video.addEventListener('seeked', frame); video.addEventListener('pause', frame);
    frame(); go();
    return () => { cancelAnimationFrame(raf); video.removeEventListener('playing', go); video.removeEventListener('seeked', frame); video.removeEventListener('pause', frame); };
  }, [artIndex, still, src, mounted, allowed, failed, framed]); // re-attach whenever the video or the layer appears
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
  const pick = FRAME_ART[artIndex];
  return <>
    <div ref={clip} className={`pitch-hero__clip${still ? ' is-still' : ''}`} aria-hidden="true">
      {still && <img className="pitch-hero__still" src={framed ? HERO_MEDIA.still : HERO_MEDIA.portraitPoster} width={framed ? 1280 : 720} height={framed ? 720 : 1280} alt="" decoding="async" />}
      {allowed && !failed && <video ref={movie} className={`pitch-hero__background${ready && !blocked ? ' is-ready' : ''}`} src={src} autoPlay muted loop playsInline preload={blocked ? 'auto' : 'none'} tabIndex={-1} onLoadStart={() => setReady(false)} onPlaying={() => { setReady(true); setBlocked(false); }} onTimeUpdate={e => report.current.onTime?.(e.currentTarget.currentTime)} onError={() => setFailed(true)} />}
      {framed && <div ref={art} className="pitch-hero__frame-art" style={{ opacity: still ? 1 : 0 }}><img src={pick.src} alt="" decoding="async" /></div>}
    </div>
    {allowed && !failed && !blocked && !pitchPlaying && <button className="pitch-hero__motion" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Play motion' : 'Pause motion'}</button>}
  </>;
}
