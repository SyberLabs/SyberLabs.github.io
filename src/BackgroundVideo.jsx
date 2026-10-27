import React, { useEffect, useRef, useState } from 'react';
import { HERO_MEDIA } from './hero-media.js';
import { FRAME_ART, FRAME_DISC } from './frame-art.js';

const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const pickNext = last => { const pool = FRAME_ART.map((_, i) => i).filter(i => i !== last); return pool[Math.floor(Math.random() * pool.length)]; };

// onTime(seconds) reports the clip's own playback time, which the homepage reveal follows; onUnavailable() fires
// when the clip cannot play here (reduced motion or a media error), so nothing waits on it.
// The Sophia frame: each pass of the clip shows one of FRAME_ART, chosen at random (never the same twice running).
// Earth is in the clip; a painting is laid over Earth's disc, growing in and out with it, frame by frame.
// onArt(id) reports what the frame holds, for the credit line.
export default function BackgroundVideo({ pitchPlaying, onTime, onUnavailable, onArt }) {
  const clip = useRef(null), art = useRef(null);
  const [artIndex, setArtIndex] = useState(() => pickNext(-1));
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
  const report = useRef({ onTime, onUnavailable, onArt }); report.current = { onTime, onUnavailable, onArt };
  useEffect(() => { report.current.onArt?.(FRAME_ART[artIndex].id); }, [artIndex]);
  // fetch the paintings once, so a switch never waits on the network
  useEffect(() => { FRAME_ART.forEach(a => { if (a.src) { const i = new Image(); i.decoding = 'async'; i.src = a.src; } }); }, []);
  // Lay the painting's disc exactly over Earth's: the clip is drawn object-fit: cover, so map the clip's disc
  // through the same scale and offset whenever the stage changes size.
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
  }, [portrait, allowed, failed]);
  // Follow the clip frame by frame: the painting grows in as Earth does and leaves as Earth leaves; each new pass
  // of the clip (its time jumps back) draws the next choice.
  useEffect(() => {
    const video = movie.current, layer = art.current;
    if (!video || !layer) return;
    let raf = 0, last = 0, index = artIndex;
    const frame = () => {
      const t = video.currentTime;
      if (t + 1 < last) { index = pickNext(index); setArtIndex(index); }
      last = t;
      const show = FRAME_ART[index].src ? ss(FRAME_DISC.in, FRAME_DISC.held, t) * (1 - ss(FRAME_DISC.out, FRAME_DISC.gone, t)) : 0;
      layer.style.opacity = show.toFixed(3); layer.style.setProperty('--grow', (.82 + .18 * show).toFixed(3));
      raf = video.paused ? 0 : requestAnimationFrame(frame);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
    video.addEventListener('playing', go); video.addEventListener('seeked', frame); video.addEventListener('pause', frame);
    frame(); go();
    return () => { cancelAnimationFrame(raf); video.removeEventListener('playing', go); video.removeEventListener('seeked', frame); video.removeEventListener('pause', frame); };
  }, [artIndex, allowed, failed, src]);
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
    <div ref={clip} className="pitch-hero__clip" aria-hidden="true">
      <video ref={movie} className={`pitch-hero__background${ready ? ' is-ready' : ''}`} src={src} autoPlay muted loop playsInline preload="none" tabIndex={-1} onLoadStart={() => setReady(false)} onPlaying={() => setReady(true)} onTimeUpdate={e => report.current.onTime?.(e.currentTarget.currentTime)} onError={() => setFailed(true)} />
      <div ref={art} className="pitch-hero__frame-art" style={{ opacity: 0 }}>{FRAME_ART[artIndex].src && <img src={FRAME_ART[artIndex].src} alt="" decoding="async" style={{ objectPosition: FRAME_ART[artIndex].position }} />}</div>
    </div>
    {!pitchPlaying && <button className="pitch-hero__motion" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Play motion' : 'Pause motion'}</button>}
  </>;
}
