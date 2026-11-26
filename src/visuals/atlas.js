/* SyberLabs: the Lacuna visual. The Earth drawn as evenly spaced dots, turning. The research sites of the Lacuna
   Atlas are marked on it: a lit dot for a Lacuna investigation, a ring for an open question. As the globe turns it
   names each site in turn, and onSite reports the one named so the caption and the links can follow. It can be
   turned by hand: mount returns grab, turn and release, which src/overview/globe.js calls as the globe is dragged.
   Mounted in a section. */
import { LAND, SITES } from './atlas-data.js';

const root = typeof window !== 'undefined' ? window : globalThis;
const TAU = 6.283185307, RAD = TAU / 360;
const ELECTRIC = [2, 151, 222], ELECTRIC_HI = [76, 192, 245], VELLUM = [227, 243, 252], STEEL = [127, 166, 189], CANTALOUPE = [252, 115, 77];
const TILT = -8 * RAD;            // the view is centred a little south of the equator, where most sites are
const TURN = 3 * RAD;             // radians a second: one turn in two minutes
// Naming: every site is named once a turn, in the order the turning globe brings them to the middle. A site may be
// named from LEAD degrees before the central meridian to TRAIL degrees after it, each name stays up at least DWELL
// seconds, and a site that has been named waits REST seconds, so the eleven sites in the Americas queue up in order.
const LEAD = 18 * RAD, TRAIL = 55 * RAD, DWELL = 2.8, REST = 60, FACING = 0.2;
// After a hand lets go, the site named is the one nearest the middle for HAND seconds, and the globe eases back to its own turn.
const HAND = 4, FASTEST = 2.6;

const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${cl(a).toFixed(3)})`;

// "13.86° S · 76.30° W", as the Atlas writes a site's position
export const coords = (lat, lon) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
export const sites = SITES.map(([id, name, lat, lon, kind]) => ({ id, name, lat, lon, lacuna: kind === 1 }));
// The view starts facing the first site in the Atlas's list, so the page's unscripted text names the same site.
export const first = sites[0];

function unpack() {
  const bin = root.atob(LAND), n = bin.length >> 2;
  const lon = new Float32Array(n), sin = new Float32Array(n), cos = new Float32Array(n);
  const i16 = k => ((bin.charCodeAt(k) | (bin.charCodeAt(k + 1) << 8)) << 16) >> 16;
  for (let i = 0; i < n; i++) {
    lon[i] = i16(i * 4) / 100 * RAD;
    const lat = i16(i * 4 + 2) / 100 * RAD;
    sin[i] = Math.sin(lat); cos[i] = Math.cos(lat);
  }
  return { n, lon, sin, cos };
}

export function mount(canvas, { onSite } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const land = unpack();
  const marks = sites.map(s => ({ site: s, lon: s.lon * RAD, sin: Math.sin(s.lat * RAD), cos: Math.cos(s.lat * RAD), x: 0, y: 0, z: -1, east: 0, at: -1e9 }));
  const sinT = Math.sin(TILT), cosT = Math.cos(TILT);
  let W = 0, H = 0, dpr = 1, t = 0, last = 0, visible = false;
  let centre = first.lon * RAD;   // the meridian facing the viewer
  let named = null, since = 0;
  let spin = -TURN, held = false, touched = -1e9, R = 1;   // spin: radians a second, negative as the Earth turns

  // Orthographic view of a point on the unit sphere: x to the right, y up, z towards the viewer.
  function place(lon, sin, cos, out) {
    const d = lon - centre, cd = Math.cos(d);
    out.x = cos * Math.sin(d);
    out.y = cosT * sin - sinT * cos * cd;
    out.z = sinT * sin + cosT * cos * cd;
  }

  function render() {
    R = Math.min(W * 0.42, H * 0.33);
    const cx = W / 2, cy = H * 0.46;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    // the light around the limb, then the body of the globe
    let g = ctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R * 1.42);
    g.addColorStop(0, rgba(ELECTRIC, 0.26)); g.addColorStop(0.32, rgba(ELECTRIC, 0.09)); g.addColorStop(1, rgba(ELECTRIC, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.42, 0, TAU); ctx.fill();
    g = ctx.createRadialGradient(cx - R * 0.36, cy - R * 0.42, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(8,30,44,.96)'); g.addColorStop(0.62, 'rgba(3,13,20,.97)'); g.addColorStop(1, 'rgba(2,7,10,.98)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();

    // graticule: a meridian every 30 degrees and a parallel every 30, the half that faces the viewer
    const p = { x: 0, y: 0, z: 0 };
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(STEEL, 0.1); ctx.beginPath();
    for (let m = -180; m < 180; m += 30) {
      let pen = false;
      for (let a = -90; a <= 90; a += 5) {
        place(m * RAD, Math.sin(a * RAD), Math.cos(a * RAD), p);
        if (p.z > 0) { pen ? ctx.lineTo(cx + p.x * R, cy - p.y * R) : ctx.moveTo(cx + p.x * R, cy - p.y * R); pen = true; } else pen = false;
      }
    }
    for (let a = -60; a <= 60; a += 30) {
      let pen = false; const s = Math.sin(a * RAD), c = Math.cos(a * RAD);
      for (let m = -180; m <= 180; m += 5) {
        place(m * RAD, s, c, p);
        if (p.z > 0) { pen ? ctx.lineTo(cx + p.x * R, cy - p.y * R) : ctx.moveTo(cx + p.x * R, cy - p.y * R); pen = true; } else pen = false;
      }
    }
    ctx.stroke();

    // the land: brighter where it faces the viewer, thinning out towards the limb
    const dot = Math.max(1.15, R / 190);
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = rgba(pass ? ELECTRIC_HI : ELECTRIC, 1);
      for (let i = 0; i < land.n; i++) {
        place(land.lon[i], land.sin[i], land.cos[i], p);
        if (p.z <= 0.02 || (p.z > 0.55) !== !!pass) continue;
        const s = dot * (0.55 + 0.75 * p.z);
        ctx.globalAlpha = 0.24 + 0.7 * p.z;
        ctx.fillRect(cx + p.x * R - s / 2, cy - p.y * R - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;

    // the rim
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = rgba(ELECTRIC_HI, 0.34); ctx.lineWidth = 1; ctx.stroke();

    // the sites, and which one is named: the next in the queue once the current name has had its time
    let next = null;
    for (const m of marks) {
      place(m.lon, m.sin, m.cos, m);
      m.east = Math.atan2(Math.sin(m.lon - centre), Math.cos(m.lon - centre));   // how far east of the central meridian
      if (m !== named && m.z > FACING && m.east > -LEAD && m.east < TRAIL && t - m.at > REST && (!next || m.east > next.east)) next = m;
    }
    if (!named) { named = marks[0]; named.at = t; since = t; }
    else if (held || t - touched < HAND) {   // turned by hand: name the site nearest the middle of the view
      let near = null;
      for (const m of marks) if (m.z > 0.6 && (!near || m.z > near.z)) near = m;
      if (near && near !== named && t - since > 0.3) { named = near; named.at = t; since = t; if (onSite) onSite(named.site); }
    }
    else if (next && t - since >= DWELL) { named = next; named.at = t; since = t; if (onSite) onSite(named.site); }
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    for (const m of marks) {
      if (m.z <= 0.04) continue;
      const x = cx + m.x * R, y = cy - m.y * R, a = cl(0.25 + 0.9 * m.z), r = Math.max(2.4, R / 96);
      if (m.site.lacuna) {
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * (4.2 + pulse));
        glow.addColorStop(0, rgba(CANTALOUPE, 0.5 * a)); glow.addColorStop(1, rgba(CANTALOUPE, 0));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * (4.2 + pulse), 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = rgba(CANTALOUPE, a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = rgba(VELLUM, 0.85 * a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, TAU); ctx.stroke();
        ctx.fillStyle = rgba(VELLUM, 0.9 * a); ctx.beginPath(); ctx.arc(x, y, r * 0.34, 0, TAU); ctx.fill();
      }
    }

    // the named site: four ticks round its mark, and its name set clear of the globe's centre
    if (named.z > 0.04 && named.east < TRAIL + 20 * RAD) {
      const x = cx + named.x * R, y = cy - named.y * R, k = (still ? 1 : cl((t - since) / 0.45)) * cl((named.z - 0.04) / 0.2), q = Math.max(9, R / 26);
      const c = named.site.lacuna ? CANTALOUPE : VELLUM;
      ctx.strokeStyle = rgba(c, 0.9 * k); ctx.lineWidth = 1; ctx.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * q, y + dy * q); ctx.lineTo(x + dx * q * 1.7, y + dy * q * 1.7); }
      ctx.stroke();
      // The name sits up and to one side on a small plate, joined to the mark by a line, so it stays clear of
      // neighbouring marks (five of the sites are within a few degrees of each other).
      const fs = Math.max(10, Math.min(13, R / 24)), dir = named.x <= 0.3 ? 1 : -1;
      ctx.font = `500 ${fs}px "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const label = named.site.name.toUpperCase(), pad = fs * 0.7, pw = ctx.measureText(label).width + pad * 2, ph = fs * 2.1;
      const ax = x + dir * q * 3.1, ay = y - q * 2.9;                 // where the line meets the plate
      // On a phone the globe is nearly as wide as the canvas, so the plate is held inside it. A plate that had to
      // move sits over its anchor, and the line then meets its lower edge.
      const px = Math.round(Math.max(6, Math.min(W - 6 - pw, dir > 0 ? ax : ax - pw))), py = Math.round(ay - ph / 2);
      const lx = Math.max(px, Math.min(px + pw, ax)), ly = lx > px + 1 && lx < px + pw - 1 ? py + ph : ay;
      ctx.beginPath(); ctx.moveTo(x + dir * q * 1.25, y - q * 1.25); ctx.lineTo(lx, ly); ctx.strokeStyle = rgba(c, 0.7 * k); ctx.stroke();
      ctx.fillStyle = `rgba(2,7,10,${(0.82 * k).toFixed(3)})`; ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = rgba(c, 0.45 * k); ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      ctx.fillStyle = rgba(VELLUM, k); ctx.fillText(label, px + pad, py + ph / 2 + 0.5);
    }
  }

  function size() {
    const r = canvas.getBoundingClientRect();
    const nw = Math.max(2, Math.round(r.width)), nh = Math.max(2, Math.round(r.height));
    if (nw === W && nh === H) return;
    W = nw; H = nh; dpr = Math.min(root.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (still) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(); }
  }
  if ('IntersectionObserver' in root) new IntersectionObserver(en => { visible = en[0].isIntersecting; last = 0; }, { threshold: 0.02 }).observe(canvas);
  else visible = true;
  if ('ResizeObserver' in root) new ResizeObserver(size).observe(canvas); else root.addEventListener('resize', size);
  function frame(now) {
    root.requestAnimationFrame(frame);
    if (!visible || document.hidden || !W) return;
    let dt = last ? (now - last) / 1000 : 0.016; last = now; if (dt > 0.05) dt = 0.05;
    t += dt;
    if (!held) { spin += (-TURN - spin) * Math.min(1, dt * 0.9); centre += spin * dt; }   // the surface moves left to right, as the Earth turns
    if (centre < -Math.PI) centre += TAU; else if (centre > Math.PI) centre -= TAU;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }
  size();
  if (!still) root.requestAnimationFrame(frame);
  const paint = () => { if (still && W) { t += 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(); } };
  return {
    grab() { held = true; touched = t; },
    // dx: how far the hand moved, in CSS pixels. The surface under it moves the same distance.
    turn(dx) { centre -= dx / R; if (centre < -Math.PI) centre += TAU; else if (centre > Math.PI) centre -= TAU; touched = t; paint(); },
    // speed: the hand's speed as it let go, in CSS pixels a second. The globe keeps it, then eases back to its own turn.
    release(speed = 0) { held = false; touched = t; spin = Math.max(-FASTEST, Math.min(FASTEST, -speed / R)); paint(); },
  };
}
