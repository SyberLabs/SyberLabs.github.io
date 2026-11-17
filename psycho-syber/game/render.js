// PSYCHO SYBER: drawing. Everything is drawn into a 480x270 frame and scaled up without smoothing.
// There are two complete looks. SYBER (skin 0) is cold stone and Visitor circuitry at night. PSYCHO (skin 1) is
// the same world as the jaguar sees it: a living Paracas textile. The same geometry is drawn twice, once per skin.
import { T, C, tileAt, gateActive, eyeAngle, wordActive, wordFresh, coreOpen, verdictAt, HUM, JAG } from './sim.js?v=20261117i';
import { text, textC, textW } from './font.js?v=20261117i';
export const VW = 480, VH = 270;
const TAU = Math.PI * 2;
const hash = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const PSB = ['#b8233f', '#d98f1f', '#2e3192', '#1f8a5f', '#c2347f'];           // textile grounds: crimson, ochre, indigo, green, magenta
const PSM = ['#f6e7c8', '#3a1052', '#f2b632', '#f6e7c8', '#2a0f4a'];           // the motif colour on each ground
const RB = ['#ff5fa2', '#ffb347', '#fff2a8', '#5dffb0', '#4cc0f5', '#b388ff']; // spirit light
const rb = k => RB[((k | 0) % 6 + 6) % 6];
const MOTIF = [
  ['..xxx..', '..x.x..', 'xxx.xxx', 'x.....x', 'xxx.xxx', '..x.x..', '..xxx..'],   // stepped cross
  ['xxxxxx.', 'x......', 'x.xxxx.', 'x.x..x.', 'x.xx.x.', 'x....x.', 'xxxxxx.'],   // stepped fret
  ['x.....x', '.x...x.', '..x.x..', '...x...', '..x.x..', '.x...x.', 'x.....x'],   // crossing
  ['......x', '.....xx', '....xxx', '...xxxx', '..xxxxx', '.xxxxxx', 'xxxxxxx'],   // steps
  ['.......', '.xxxxx.', 'x..x..x', 'x.xxx.x', 'x..x..x', '.xxxxx.', '.......'],   // eye
  ['.......', 'xx...xx', '..x.x..', '...x...', '.......', 'xx...xx', '..x.x..'],   // wave
];
function motif(c, k, x, y, color) { c.fillStyle = color; const m = MOTIF[k % MOTIF.length]; for (let r = 0; r < 7; r++) for (let i = 0; i < 7; i++) if (m[r][i] === 'x') c.fillRect(x + i, y + r, 1, 1); }
const R = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
function line(c, x0, y0, x1, y1, color, dash = 0) {
  c.fillStyle = color;
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) if (!dash || (i % (dash * 2)) < dash) c.fillRect(Math.round(x0 + dx * i / n), Math.round(y0 + dy * i / n), 1, 1);
}
function disc(c, color, x, y, r) { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function ring(c, color, x, y, r, w = 1) { if (r <= 0) return; c.strokeStyle = color; c.lineWidth = w; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); }

// ---------------------------------------------------------------- tiles (cached once per stage and skin)
function drawTile(c, L, x, y, t, sk) {
  const px = x * T, py = y * T, h = hash(x, y), h2 = hash(x, y, 7);
  const rk = (dx, dy) => { const xx = x + dx, yy = y + dy; if (yy < 0) return false; if (xx < 0 || xx >= L.w || yy >= L.h) return true; const q = L.tiles[yy * L.w + xx]; return q === C.STONE || q === C.METAL; };
  if (t === C.STONE) {
    if (!sk) {
      R(c, h < 0.5 ? '#132432' : '#10202c', px, py, T, T);
      c.fillStyle = '#0a1620'; c.fillRect(px, py + T - 1, T, 1); c.fillRect(px + (h2 < 0.5 ? T - 1 : 0), py, 1, T);
      if (h > 0.55) c.fillRect(px + 4 + Math.floor(h2 * 8), py, 1, T);
      if (h < 0.2) c.fillRect(px, py + 5 + Math.floor(h2 * 6), T, 1);
      if (!rk(0, -1)) { R(c, '#35607a', px, py, T, 2); R(c, '#6fa9c6', px, py, T, 1); }
      if (!rk(-1, 0)) R(c, '#1f3d50', px, py, 1, T);
      if (!rk(1, 0)) R(c, '#1f3d50', px + T - 1, py, 1, T);
      if (!rk(0, 1)) R(c, '#050b10', px, py + T - 2, T, 2);
      if (rk(0, -1) && h2 > 0.88) motif(c, Math.floor(h * 6), px + 4, py + 4, 'rgba(2,151,222,.6)');
    } else {
      const band = (((x >> 1) + (y >> 1) * 2) % 5 + 5) % 5;
      R(c, PSB[band], px, py, T, T);
      c.fillStyle = 'rgba(0,0,0,.16)'; for (let i = 0; i < T; i += 4) c.fillRect(px + i, py + ((i + (y & 1) * 2) % 8), 2, 2);
      if (h2 < 0.55) motif(c, Math.floor(h * 6), px + 4, py + 5, PSM[band]);
      c.fillStyle = '#f6e7c8';
      if (!rk(0, -1)) { c.fillRect(px, py, T, 2); c.fillStyle = PSB[(band + 2) % 5]; for (let i = 1; i < T; i += 4) c.fillRect(px + i, py + 2, 2, 2); c.fillStyle = '#f6e7c8'; }
      else for (let i = 1; i < T; i += 4) c.fillRect(px + i, py, 2, 1);
      if (!rk(-1, 0)) c.fillRect(px, py, 1, T);
      if (!rk(1, 0)) c.fillRect(px + T - 1, py, 1, T);
      if (!rk(0, 1)) R(c, 'rgba(0,0,0,.4)', px, py + T - 2, T, 2);
    }
  } else if (t === C.METAL) {
    if (!sk) {
      R(c, '#070c12', px, py, T, T); c.fillStyle = '#0b3a55'; c.fillRect(px, py, T, 1); c.fillRect(px, py, 1, T);
      c.fillStyle = '#12506f'; c.fillRect(px + 3, py + 3, 1, 1); c.fillRect(px + 12, py + 12, 1, 1);
      c.fillStyle = '#0297de';
      if (!rk(0, -1)) c.fillRect(px, py, T, 1); if (!rk(-1, 0)) c.fillRect(px, py, 1, T); if (!rk(1, 0)) c.fillRect(px + T - 1, py, 1, T); if (!rk(0, 1)) c.fillRect(px, py + T - 1, T, 1);
    } else {
      R(c, '#1a0b2e', px, py, T, T); c.fillStyle = '#7b5cff'; for (let j = 2; j < T; j += 6) for (let i = 2; i < T; i += 6) c.fillRect(px + i, py + j, 1, 1);
      c.fillStyle = '#ff5fa2';
      if (!rk(0, -1)) c.fillRect(px, py, T, 1); if (!rk(-1, 0)) c.fillRect(px, py, 1, T); if (!rk(1, 0)) c.fillRect(px + T - 1, py, 1, T); if (!rk(0, 1)) c.fillRect(px, py + T - 1, T, 1);
    }
  } else if (t === C.ONEWAY) {
    if (!sk) { R(c, '#3a5466', px, py, T, 3); R(c, '#6fa9c6', px, py, T, 1); R(c, '#1b2c38', px + 2, py + 3, 2, 3); R(c, '#1b2c38', px + 12, py + 3, 2, 3); }
    else { R(c, '#e2a12b', px, py, T, 3); c.fillStyle = '#b8233f'; for (let i = 0; i < T; i += 4) c.fillRect(px + i, py + 1, 2, 1); R(c, '#f6e7c8', px, py, T, 1); }
  } else if (t === C.SPIRIT) {
    if (!sk) { c.fillStyle = 'rgba(140,190,215,.28)'; for (let i = 0; i < T; i += 3) { c.fillRect(px + i, py, 1, 1); c.fillRect(px + i, py + T - 1, 1, 1); c.fillRect(px, py + i, 1, 1); c.fillRect(px + T - 1, py + i, 1, 1); } }
    else { R(c, 'rgba(216,58,134,.9)', px, py, T, T); R(c, '#fff2a8', px, py, T, 2); motif(c, 4, px + 4, py + 5, '#2a0f4a'); c.fillStyle = '#ffb347'; for (let i = 1; i < T; i += 4) c.fillRect(px + i, py + T - 2, 2, 2); }
  } else if (t === C.WARD) {
    if (!sk) { R(c, 'rgba(2,151,222,.3)', px, py, T, T); c.fillStyle = 'rgba(76,192,245,.22)'; for (let j = 2; j < T; j += 4) c.fillRect(px, py + j, T, 1); R(c, '#9bdcff', px, py, T, 1); R(c, 'rgba(155,220,255,.5)', px, py + T - 1, T, 1); }
    else { c.fillStyle = 'rgba(120,200,255,.2)'; for (let i = 2; i < T; i += 5) c.fillRect(px + i, py + ((i * 3) % 7), 1, 6); }
  } else if (t === C.SPIKE) {
    for (let i = 0; i < 4; i++) {
      R(c, sk ? '#1f8a5f' : '#3d5b6c', px + i * 4, py + 11, 4, 5); R(c, sk ? '#5dffb0' : '#8fb3c7', px + i * 4 + 1, py + 7, 2, 5); R(c, sk ? '#ff5fa2' : '#e3f3fc', px + i * 4 + 1, py + 4, 1, 3);
    }
  }
}
export function buildTiles(L, sk) {
  const cv = document.createElement('canvas'); cv.width = L.w * T; cv.height = L.h * T;
  const c = cv.getContext('2d');
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const t = L.tiles[y * L.w + x]; if (t && t < C.STEP_OK) drawTile(c, L, x, y, t, sk); }
  for (const s of L.signs) text(c, s.text, s.x, s.y + 4, sk ? 'rgba(246,231,200,.75)' : 'rgba(111,169,198,.6)', 2);
  return cv;
}

// ---------------------------------------------------------------- backgrounds
const STARS = Array.from({ length: 110 }, (_, i) => ({ x: hash(i, 1) * 560, y: hash(i, 2) * 190, s: hash(i, 3), p: hash(i, 4) * TAU }));
function sky(c, cam, t, sk, low) {
  const oy = Math.round(-cam.y * 0.06);
  if (!sk) {
    for (let y = 0; y < VH; y += 6) { const k = Math.min(1, y / 210); R(c, `rgb(${2 + k * 9 | 0},${7 + k * 34 | 0},${10 + k * 52 | 0})`, 0, y, VW, 6); }
    for (const s of STARS) { const x = ((s.x - cam.x * 0.03) % 560 + 560) % 560 - 40, a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.4 + s.s) + s.p)); R(c, `rgba(${200 + s.s * 55 | 0},230,255,${a.toFixed(2)})`, x, s.y + oy * 0.5, s.s > 0.92 ? 2 : 1, s.s > 0.92 ? 2 : 1); }
    const mx = 372 - cam.x * 0.015, my = 54 + oy;
    disc(c, 'rgba(120,190,230,.08)', mx, my, 30); disc(c, '#cfe6f2', mx, my, 15); disc(c, '#a9c8d8', mx - 5, my - 3, 3); disc(c, '#a9c8d8', mx + 4, my + 5, 2);
    // the Visitors' ship: a long skull of dark metal, lit from beneath
    const sx = 150 - cam.x * 0.05 + Math.sin(t * 0.13) * 18, sy = 74 + oy + Math.sin(t * 0.21) * 3;
    c.fillStyle = '#03080c'; c.beginPath(); c.ellipse(sx, sy, 52, 7, -0.06, 0, TAU); c.fill(); c.beginPath(); c.ellipse(sx + 30, sy - 4, 20, 8, -0.3, 0, TAU); c.fill();
    for (let i = 0; i < 6; i++) R(c, (Math.floor(t * 3) % 6 === i) ? '#9bdcff' : '#0b4a6e', sx - 38 + i * 13, sy + 5, 2, 1);
  } else {
    R(c, '#1a0b2e', 0, 0, VW, VH);
    const mx = 372 - cam.x * 0.015, my = 54 + oy, ph = (t * 22) % 14, k0 = Math.floor(t * 22 / 14);
    for (let k = 30; k >= 1; k--) disc(c, PSB[((k - k0) % 5 + 5) % 5], mx, my, k * 14 + ph);
    disc(c, '#f6e7c8', mx, my, 15); c.fillStyle = '#1a0b2e'; c.beginPath(); c.ellipse(mx, my, 3 + Math.sin(t * 2) * 1.5, 11, 0, 0, TAU); c.fill();
    R(c, 'rgba(26,11,46,.55)', 0, 0, VW, VH);
    for (const s of STARS) { const x = ((s.x - cam.x * 0.03) % 560 + 560) % 560 - 40, a = Math.abs(Math.sin(t * (0.8 + s.s) + s.p)); if (s.s > 0.62) { const y = Math.round(s.y + oy * 0.5); ring(c, rb(s.p * 3 + t), Math.round(x) + 0.5, y + 0.5, 2.6 + a, 1); c.fillStyle = '#1a0b2e'; c.fillRect(Math.round(x), y, 1, 1); } else if (a > 0.5) { c.fillStyle = rb(s.p * 3 + t); c.fillRect(Math.round(x), Math.round(s.y + oy * 0.5) - 1, 1, 3); c.fillRect(Math.round(x) - 1, Math.round(s.y + oy * 0.5), 3, 1); } }
    const sx = 150 - cam.x * 0.05 + Math.sin(t * 0.13) * 18, sy = 74 + oy + Math.sin(t * 0.21) * 3;
    c.fillStyle = '#f6e7c8'; c.beginPath(); c.ellipse(sx, sy, 52, 7, -0.06, 0, TAU); c.fill(); c.beginPath(); c.ellipse(sx + 30, sy - 4, 20, 8, -0.3, 0, TAU); c.fill();
    for (let i = 0; i < 5; i++) { disc(c, '#2a0f4a', sx - 30 + i * 15, sy, 3); disc(c, rb(i + t * 2), sx - 30 + i * 15, sy, 1.5); }
    for (let i = 0; i < 7; i++) line(c, sx - 36 + i * 12, sy + 7, sx - 36 + i * 12 + Math.sin(t * 2 + i) * 6, sy + 22 + Math.sin(t * 3 + i * 2) * 5, rb(i + t * 3));
  }
  if (low) return;
  dunes(c, cam, t, sk, 0.12, 186 + oy, 14, sk ? 0 : '#071620');
}
function dunes(c, cam, t, sk, par, base, amp, color) {
  const f = x => base + Math.sin((x + cam.x * par) * 0.011) * amp + Math.sin((x + cam.x * par) * 0.029 + 2) * amp * 0.4;
  if (!sk) { c.fillStyle = color; for (let x = 0; x < VW; x += 2) { const y = f(x); c.fillRect(x, y, 2, VH - y); } }
  else for (let b = 0; b < 9; b++) { c.fillStyle = PSB[(b + Math.floor(t * 1.5)) % 5]; for (let x = 0; x < VW; x += 2) { const y = f(x) + b * 7 + Math.sin(x * 0.05 + t * 2 + b) * 2; c.fillRect(x, y, 2, b === 8 ? VH - y : 8); } }
}
function candelabro(c, x, y, color) {   // the three-armed geoglyph on the hill above the bay
  line(c, x, y - 26, x, y + 12, color); line(c, x - 14, y - 6, x + 14, y - 6, color); line(c, x - 14, y - 6, x - 14, y - 20, color); line(c, x + 14, y - 6, x + 14, y - 20, color);
  for (const dx of [-14, 0, 14]) { const ty = dx ? y - 20 : y - 26; line(c, x + dx - 3, ty, x + dx + 3, ty, color); line(c, x + dx - 3, ty, x + dx - 3, ty - 3, color); line(c, x + dx + 3, ty, x + dx + 3, ty - 3, color); }
}
function strand(c, cam, t, sk, y0, par) {   // the Strand: the Visitors' record of bloodlines, copied rung by rung
  const COL = sk ? RB : ['#4cc0f5', '#e3f3fc', '#0297de', '#7fa6bd'];
  for (let x = -8; x < VW + 8; x += 2) {
    const wx = x + cam.x * par, a = wx * 0.045 + t * 0.9, y1 = y0 + Math.sin(a) * 13, y2 = y0 - Math.sin(a) * 13, z = Math.cos(a);
    if ((Math.floor(wx / 2) % 5) === 0) { const k = Math.floor(wx / 10); c.fillStyle = COL[((k % COL.length) + COL.length) % COL.length]; c.globalAlpha = sk ? 0.8 : 0.35; c.fillRect(x, Math.min(y1, y2), 1, Math.abs(y1 - y2)); c.globalAlpha = 1; }
    R(c, sk ? rb(wx * 0.05 + t * 2) : (z > 0 ? '#9fc6da' : '#3d6a82'), x, y1, 2, sk ? 3 : 2); R(c, sk ? rb(wx * 0.05 + t * 2 + 3) : (z > 0 ? '#3d6a82' : '#9fc6da'), x, y2, 2, sk ? 3 : 2);
  }
}
function gear(c, x, y, r, a, sk, t) {
  ring(c, sk ? rb(t + r) : '#16303f', x, y, r, 2); ring(c, sk ? rb(t + r + 2) : '#0e2230', x, y, r * 0.45, 1);
  for (let i = 0; i < 12; i++) { const an = a + i * TAU / 12, cx = x + Math.cos(an) * (r + 3), cy = y + Math.sin(an) * (r + 3); R(c, sk ? rb(i + t * 2) : (i ? '#16303f' : '#fc734d'), cx - 2, cy - 2, 4, 4); }
  for (let i = 0; i < 3; i++) { const an = a + i * TAU / 3; line(c, x, y, x + Math.cos(an) * r, y + Math.sin(an) * r, sk ? rb(i + t) : '#0e2230'); }
}
function background(c, g, cam, t, sk) {
  const kind = g.L.def.bg || 'shore', oy = Math.round(-cam.y * 0.06);
  if (kind === 'ruins') { ruins(c, cam, t, sk); return; }
  if (kind === 'eyes') { eyesBg(c, cam, t, sk, g); return; }
  if (kind === 'ship') { shipBg(c, cam, t, sk); return; }
  if (kind === 'shore' || kind === 'desert' || kind === 'sky') {
    sky(c, cam, t, sk, kind === 'sky');
    if (kind === 'shore') {
      const gx = 520 - cam.x * 0.12; if (gx > -30 && gx < VW + 30) candelabro(c, gx, 176 + oy, sk ? '#fff2a8' : 'rgba(170,205,222,.5)');
      if (!sk) { R(c, '#0a2a3f', 0, 204 + oy, VW, 30); for (let i = 0; i < 26; i++) { const x = hash(i, Math.floor(t * 3)) * VW; R(c, 'rgba(76,192,245,.5)', x, 206 + oy + hash(i, 9) * 20, 3, 1); } }
      else for (let b = 0; b < 5; b++) { c.fillStyle = b % 2 ? '#3fc6e0' : '#2e3192'; for (let x = 0; x < VW; x += 2) c.fillRect(x, 204 + oy + b * 6 + Math.sin(x * 0.07 + t * 3 + b) * 2, 2, 7); }
      dunes(c, cam, t, sk, 0.3, 226 + oy, 9, '#040d13');
    } else if (kind === 'desert') {
      R(c, sk ? '#3a1052' : '#06121a', 0, 204 + oy, VW, VH);
      for (let i = 0; i < 9; i++) { const x0 = ((i * 97 - cam.x * 0.4) % 700 + 700) % 700 - 110; line(c, x0, 205 + oy, x0 + (i % 2 ? 190 : -150), VH, sk ? rb(i + t * 2) : 'rgba(60,120,150,.35)'); }
      for (let i = 0; i < 4; i++) { const cx = ((i * 260 - cam.x * 0.25) % 900 + 900) % 900 - 150; for (let k = 1; k < 4; k++) { c.strokeStyle = sk ? rb(k + i + t * 2) : 'rgba(60,120,150,.3)'; c.lineWidth = 1; c.beginPath(); c.ellipse(cx, 232 + oy, k * 16, k * 4, 0, 0, TAU); c.stroke(); } }
    }
    return;
  }
  // interiors: the Works and the Record
  R(c, sk ? '#210a33' : '#04090e', 0, 0, VW, VH);
  const par = 0.5, w = 96;
  for (let i = -1; i < VW / w + 2; i++) {
    const wx = Math.floor(cam.x * par / w) + i, x = wx * w - cam.x * par, hh = hash(wx, 3);
    if (!sk) { R(c, '#07111a', x + 2, 0, w - 4, VH); R(c, '#0a1a26', x + 2, 0, 1, VH); if (hh > 0.5) motif(c, Math.floor(hh * 12), x + 44, 40 + Math.floor(hh * 120), 'rgba(2,151,222,.22)'); }
    else { R(c, PSB[((wx % 5) + 5) % 5], x + 2, 0, w - 4, VH); R(c, 'rgba(26,11,46,.72)', x + 2, 0, w - 4, VH); motif(c, Math.floor(hh * 12), x + 44, 40 + Math.floor(hh * 120), rb(wx + t)); }
    if (kind === 'vault') {   // rows of trapezoid niches, as in Andean walls
      for (let r = 0; r < 3; r++) { const nx = x + 30, ny = 46 + r * 74 + oy * 2; c.fillStyle = sk ? 'rgba(246,231,200,.16)' : '#03070b'; c.beginPath(); c.moveTo(nx + 4, ny); c.lineTo(nx + 32, ny); c.lineTo(nx + 38, ny + 40); c.lineTo(nx - 2, ny + 40); c.fill(); R(c, sk ? rb(wx + r + t) : 'rgba(2,151,222,.25)', nx + 17, ny + 18, 2, 2); }
    }
  }
  if (kind === 'works') {
    strand(c, cam, t, sk, 70 + oy * 2, par);
    for (let i = 0; i < 3; i++) { const x = ((i * 310 + 120 - cam.x * par) % 930 + 930) % 930 - 120; gear(c, x, 170 + oy * 2, 26, t * 0.25 * (i % 2 ? -1 : 1), sk, t); gear(c, x + 44, 196 + oy * 2, 16, -t * 0.4 * (i % 2 ? -1 : 1) + 0.26, sk, t); }
  }
}

// ---------------------------------------------------------------- the two forms
// A long head, bound from infancy: in this story the mark of a noble house. It sweeps back from the brow.
function longSkull(c, x, brow, f, skin, band) {
  [[6, 0], [6, 1], [5, 1], [5, 2], [4, 2], [3, 3], [2, 3]].forEach(([w, back], i) => R(c, i === 1 || i === 4 ? band : skin, f > 0 ? x - 3 - back : x + 3 + back - w, brow - 1 - i, w, 1));
}
function human(c, p, x, y, t, hidden) {
  const f = p.face, air = !p.onGround, sw = Math.sin(p.run * 0.42), l1 = air ? 2 : Math.round(sw * 2), l2 = air ? -1 : -Math.round(sw * 2);
  const bob = p.crouch ? 4 : 0;
  if (hidden) { c.fillStyle = 'rgba(76,192,245,.5)'; for (let j = -20 + bob; j < 0; j += 2) for (let i = -4; i < 4; i += 2) if ((i + j) & 2) c.fillRect(x + i, y + j, 1, 1); return; }
  R(c, '#0b1218', x - 2 + l1, y - 6 + (bob ? 2 : 0), 2, 6 - (bob ? 2 : 0)); R(c, '#0b1218', x + l2, y - 6 + (bob ? 2 : 0), 2, 6 - (bob ? 2 : 0));
  R(c, '#1b6f96', x - 3, y - 14 + bob, 6, 9); R(c, '#f3e2c0', x - 3, y - 7 + bob, 6, 1); R(c, '#0d4a66', x - 3, y - 11 + bob, 6, 1);
  for (let i = 0; i < 3; i++) R(c, '#f3e2c0', x - 3 + i * 2, y - 10 + bob, 1, 1);
  R(c, '#c98e62', x - 3, y - 19 + bob, 6, 5); longSkull(c, x, y - 19 + bob, f, '#c98e62', '#f3e2c0');
  R(c, '#0297de', x - 3, y - 19 + bob, 6, 1); R(c, '#9bdcff', x + (f > 0 ? 2 : -3), y - 19 + bob, 1, 1);          // the circlet, at the brow
  R(c, '#0b1218', x + (f > 0 ? 1 : -2), y - 17 + bob, 1, 1);
  if (p.throwAnim > 0 || p.rope) R(c, '#c98e62', x + f * 3, y - 13 + bob, f * 3 || 3, 2); else R(c, '#c98e62', x - f * 3 - (f > 0 ? 1 : 0), y - 12 + bob, 1, 5);
}
// The form between: a person's body under the jaguar's head. It shows for a moment at every change.
function were(c, p, x, y, t) {
  const f = p.face, gold = '#f2a623', dark = '#2a0f4a';
  R(c, '#0b1218', x - 3, y - 5, 2, 5); R(c, '#0b1218', x + 1, y - 5, 2, 5);
  R(c, gold, x - 4, y - 13, 8, 8); R(c, dark, x - 2, y - 11, 2, 2); R(c, dark, x + 1, y - 8, 2, 2);
  R(c, gold, x - 4 + (f > 0 ? 1 : 0), y - 20, 7, 7); R(c, gold, x - 3, y - 22, 2, 2); R(c, gold, x + 1, y - 22, 2, 2);
  R(c, '#fff2a8', x + (f > 0 ? 1 : -2), y - 18, 2, 1);
  R(c, '#1a0b2e', x + (f > 0 ? 0 : -3), y - 15, 4, 1); R(c, '#fff', x + (f > 0 ? 0 : -3), y - 15, 1, 2); R(c, '#fff', x + (f > 0 ? 3 : 0), y - 15, 1, 2);
  R(c, gold, x + f * 4, y - 12, 2, 2); R(c, gold, x - f * 5, y - 12, 2, 2);
  line(c, x - f * 4, y - 6, x - f * 8, y - 9 + Math.sin(t * 9) * 2, gold);
}
// A standing stone carved with the cleft head: slanted eyes, a downturned mouth. When it is yours, maize grows
// from the cleft.
function stela(c, x, y, t, sk, on) {
  const body = sk ? (on ? '#fff2a8' : '#b388ff') : (on ? '#2a566e' : '#1f3d50'), edge = sk ? '#ff5fa2' : '#35607a', mark = on ? (sk ? '#1a0b2e' : '#9bdcff') : (sk ? '#3a1052' : '#2f5266');
  R(c, body, x - 5, y - 10, 10, 22); R(c, edge, x - 5, y - 10, 10, 1); R(c, 'rgba(0,0,0,.3)', x + 4, y - 9, 1, 21);
  R(c, body, x - 5, y - 12, 4, 2); R(c, body, x + 1, y - 12, 4, 2);
  R(c, mark, x - 4, y - 6, 3, 1); R(c, mark, x - 3, y - 5, 2, 1); R(c, mark, x + 1, y - 6, 3, 1); R(c, mark, x + 1, y - 5, 2, 1);
  R(c, mark, x - 1, y - 3, 2, 2);
  R(c, mark, x - 3, y + 1, 6, 1); R(c, mark, x - 4, y + 2, 1, 2); R(c, mark, x + 3, y + 2, 1, 2); R(c, mark, x - 2, y + 2, 4, 1);
  if (on) { const s = Math.round(Math.sin(t * 2)), leaf = sk ? '#5dffb0' : '#7fd69b'; R(c, leaf, x, y - 16, 1, 6); R(c, leaf, x - 2 + s, y - 17, 2, 1); R(c, leaf, x + 1 - s, y - 15, 2, 1); R(c, sk ? '#ff5fa2' : '#f2c14e', x - 1, y - 19, 2, 3); }
}
// The great carved head. Its eyes open at the first roar it hears and its mouth at the second.
const MASK = ['......##..##......', '.....###..###.....', '....####..####....', '...#####..#####...', '..######..######..', '..######oo######..', '.################.', '.################.',
  '.##oooo####oooo##.', '.#ooeeoo##ooeeoo#.', '.##ooee####eeoo##.', '.######oooo######.', '.#####oo##oo#####.', '.################.', '.##oooooooooooo##.', '.#oommmmmmmmmmoo#.',
  '.#omfmmmmmmmmfmo#.', '.#oommmmmmmmmmoo#.', '.##oo########oo##.', '..##############..', '..##############..', '.################.'];
function monument(c, e, x, y, t, sk) {
  const n = e.roars, x0 = x - 18, y0 = y - 44;
  for (let r = 0; r < MASK.length; r++) for (let i = 0; i < 18; i++) {
    const ch = MASK[r][i]; if (ch === '.') continue;
    c.fillStyle = ch === '#' ? (sk ? PSB[(r + (i >> 2)) % 5] : (r + i) % 7 ? '#2b5368' : '#3a6a82') : ch === 'o' ? (sk ? '#1a0b2e' : '#061219')
      : ch === 'e' ? (n > 0 ? (sk ? '#5dffb0' : '#fc734d') : (sk ? '#3a1052' : '#2f5266')) : ch === 'f' ? (sk ? '#fff' : '#cfe6f2') : (n > 1 ? (sk ? '#ff5fa2' : '#fc734d') : (sk ? '#b8233f' : '#02070a'));
    c.fillRect(x0 + i * 2, y0 + r * 2, 2, 2);
  }
  if (n > 0) ring(c, sk ? '#fff2a8' : 'rgba(252,115,77,.6)', x, y - 24, 26 + Math.sin(t * 4) * 2 + n * 3, 1);
}
function drawMark(c, e, x, y, t, sk) { const b = Math.round(Math.sin(t * 3 + e.x * 0.05) * 2), col = sk ? rb(e.x * 0.05 + t * 4) : '#fc734d'; ring(c, col, x + 0.5, y + b - 1, 3.5, 1); R(c, sk ? '#1a0b2e' : '#fff2a8', x, y + b - 2, 1, 2); R(c, col, x, y + b + 3, 1, 3); }
// One of the three on the command ship: a robe and a tall hood, swept back.
function elder(c, e, x, y, t, sk) {
  const col = ['#fc734d', '#4cc0f5', '#f3e2c0'][e.k % 3], dark = sk ? '#2a0f4a' : '#0b1218';
  for (let r = 0; r < 14; r++) R(c, r % 5 === 4 ? col : dark, x - 3 - (r >> 2), y - 1 + r, 6 + (r >> 2) * 2, 1);
  for (let r = 0; r < 12; r++) { const w = r < 4 ? 2 + r : r < 9 ? 6 : 7; R(c, dark, x - (w >> 1) - (r < 6 ? 1 : 0), y - 13 + r, w, 1); }
  R(c, col, x - 3, y - 2, 6, 1); R(c, sk ? rb(t * 3 + e.k) : col, x - 2, y - 5, 1, 1); R(c, sk ? rb(t * 3 + e.k) : col, x + 1, y - 5, 1, 1);
  textC(c, e.name, x, y - 22, e.said ? col : 'rgba(159,198,218,.6)');
}
// The Patron: a cold-blooded Visitor in gold, on a seat that floats. In the last room he is only a picture.
function patron(c, e, x, y, t, sk, g) {
  const pic = g.L.def.real, sc = sk ? rb(t * 2) : '#3f8f5a', gold = sk ? '#fff2a8' : '#d9a520', hov = Math.round(Math.sin(t * 2) * 2);
  if (pic) {
    const cut = e.through ? 0.3 : 0.06;
    if (hash(Math.floor(t * 9), 3) < cut) return;                                    // the picture drops out
    c.fillStyle = sk ? 'rgba(255,242,168,.10)' : 'rgba(76,192,245,.10)'; c.beginPath(); c.moveTo(x - 2, y + 14); c.lineTo(x + 2, y + 14); c.lineTo(x + 12, y - 18); c.lineTo(x - 12, y - 18); c.fill();
    c.globalAlpha = 0.55 + 0.25 * hash(Math.floor(t * 14), 5); x += hash(Math.floor(t * 6), 7) < 0.15 ? 2 : 0;
  }
  c.fillStyle = sk ? 'rgba(255,242,168,.25)' : 'rgba(217,165,32,.25)'; c.beginPath(); c.ellipse(x, y + 13, 11, 3, 0, 0, TAU); c.fill();
  for (let r = 0; r < 12; r++) R(c, r % 3 === 2 ? gold : (sk ? '#2a0f4a' : '#10202a'), x - 4 - (r >> 2), y - 2 + r + hov, 8 + (r >> 2) * 2, 1);
  R(c, gold, x - 5, y - 3 + hov, 10, 2);
  R(c, sc, x - 3, y - 8 + hov, 6, 5); longSkull(c, x, y - 8 + hov, -1, sc, gold);
  R(c, '#fff2a8', x - 3, y - 6 + hov, 2, 1); R(c, '#02070a', x - 2, y - 6 + hov, 1, 1);
  for (let i = 0; i < 4; i++) R(c, sk ? '#1a0b2e' : '#2c6b43', x - 2 + (i * 2 + (i & 1)) % 5, y - 13 + i * 2 + hov, 1, 1);
  if (pic) { c.globalAlpha = 1; for (let r = -22; r < 14; r += 2) R(c, sk ? 'rgba(18,5,31,.5)' : 'rgba(2,7,10,.5)', x - 12, y + r, 24, 1); }
}
// The Thousand Eyes: one great lens that turns to you, a ring of small ones, and its verdict clock.
function asi(c, g, e, x, y, t, sk) {
  const p = g.p, a = Math.atan2(p.y - 10 - e.y, p.x - e.x), red = sk ? '#ff5fa2' : '#ff5a4a', rim = sk ? '#f6e7c8' : '#16425a', dark = sk ? '#2a0f4a' : '#05090d';
  for (const o of [-14, 0, 14]) R(c, rim, x + o, 0, 1, Math.max(0, y - 24));
  c.fillStyle = dark; c.beginPath(); c.moveTo(x - 36, y - 24); c.lineTo(x + 36, y - 24); c.lineTo(x + 27, y + 22); c.lineTo(x - 27, y + 22); c.fill();
  R(c, rim, x - 36, y - 24, 72, 1); R(c, rim, x - 27, y + 22, 54, 1);
  for (let i = 0; i < 12; i++) {
    const an = i * TAU / 12 + t * 0.2, ex = Math.round(x + Math.cos(an) * 25), ey = Math.round(y + Math.sin(an) * 17);
    R(c, '#02070a', ex - 2, ey - 2, 5, 5);
    if (hash(i, Math.floor(t * 2 + i * 0.37)) > 0.12) { R(c, sk ? rb(i + t * 3) : '#9bdcff', ex - 1, ey - 1, 3, 3); R(c, '#02070a', ex + Math.round(Math.cos(a)), ey + Math.round(Math.sin(a)), 1, 1); }
  }
  disc(c, '#02070a', x, y, 15); ring(c, red, x, y, 14, 2); ring(c, sk ? '#fff2a8' : '#5a1f1a', x, y, 10, 1);
  disc(c, red, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 6); disc(c, '#02070a', x + Math.cos(a) * 7, y + Math.sin(a) * 7, 3); disc(c, '#fff', x + Math.cos(a) * 5 - 1, y + Math.sin(a) * 5 - 2, 1.2);
  const left = Math.max(0, verdictAt(g) - g.realT), low = left < 8, s = Math.ceil(left);
  textC(c, 'VERDICT IN', x, y + 27, sk ? 'rgba(255,242,168,.7)' : 'rgba(255,90,74,.7)');
  textC(c, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, x, y + 35, low && Math.floor(t * 2) % 2 ? '#fff' : red, 2);
}
// What the machine shows of you: its log of the run, its file on you, the frame where it has decided you will
// be, the place it orders you to stand, and whatever it says.
const stamp = s => `${String(Math.floor(s)).padStart(2, '0')}.${Math.floor(s * 10) % 10}`;
function watchBack(c, g, fx, t, sk) {   // its panels are part of the wall: shots pass in front of them
  const red = sk ? '#ff5fa2' : '#ff5a4a', dim = sk ? 'rgba(255,242,168,.6)' : 'rgba(155,220,255,.6)', back = sk ? 'rgba(18,5,31,.86)' : 'rgba(2,7,10,.86)', blind = g.blind || 0;
  R(c, back, 19, 32, 126, 12 + fx.log.length * 7); R(c, dim, 19, 32, 1, 12 + fx.log.length * 7);
  text(c, 'RECORD OF THE RUN', 23, 35, dim);
  fx.log.forEach((l, i) => text(c, `${stamp(l.t)} ${l.s}`, 23, 44 + i * 7, i === fx.log.length - 1 ? red : dim));
  R(c, back, 393, 32, 68, 27); R(c, dim, 460, 32, 1, 27);
  text(c, 'SUBJECT 0001', 396, 35, dim); text(c, g.persona === 'psycho' ? 'FORM JAGUAR' : 'FORM WEAVER', 396, 43, dim); text(c, `LENSES DARK ${blind}`, 396, 51, blind ? '#fc734d' : dim);
  if (fx.speak) { const k = Math.min(1, fx.speak.t * 2, (fx.speak.max - fx.speak.t) * 6), n = Math.ceil(fx.speak.s.length * Math.min(1, (fx.speak.max - fx.speak.t) * 2.2)), w = textW(fx.speak.s) + 12; c.globalAlpha = Math.max(0, k); R(c, back, Math.round(VW / 2 - w / 2), 111, w, 13); textC(c, fx.speak.s.slice(0, n), VW / 2, 115, sk ? '#fff2a8' : '#fff'); c.globalAlpha = 1; }
}
function watch(c, g, fx, ox, oy, t, sk) {
  const p = g.p, e = g.ents.find(o => o.type === 'asi'); if (!e) return;
  const red = sk ? '#ff5fa2' : '#ff5a4a', dim = sk ? 'rgba(255,242,168,.6)' : 'rgba(155,220,255,.6)', faint = sk ? 'rgba(255,95,162,.4)' : 'rgba(255,90,74,.4)';
  if (!p.dead) {
    const half = g.persona === 'psycho' ? 6 : 10, px = Math.round(p.x) + ox, py = Math.round(p.y) + oy, tt = Math.hypot(p.x - e.x, p.y - e.y) / 230;
    const lx = Math.round(p.x + p.vx * tt * 0.9) + ox, ly = py - half, next = p.vy < -60 ? 'JUMP' : p.vx > 20 ? 'RIGHT' : p.vx < -20 ? 'LEFT' : p.hidden ? 'HIDE' : 'STAY';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { R(c, dim, px + sx * 9 - (sx > 0 ? 3 : 0), py - half + sy * 13, 4, 1); R(c, dim, px + sx * 9, py - half + sy * 13 - (sy > 0 ? 3 : 0), 1, 4); }
    c.strokeStyle = red; c.lineWidth = 1; c.strokeRect(lx - 5.5, ly - 7.5, 11, 15); line(c, e.x + ox, e.y + oy + 16, lx, ly - 8, faint, 3);
    textC(c, `NEXT: ${next}`, clamp(lx, 40, VW - 40), ly - 24, red);
  }
  if (e.tele) {   // the order: the whole wall will fire, and this is where it will not
    const gx = Math.round(e.tele.x) + ox, on = Math.floor(t * 6) % 2;
    for (let x = 22; x <= 458; x += 12) if (Math.abs(x - e.tele.x) > 22) R(c, faint, x + ox, 18, 1, 222);
    R(c, '#fff', gx - 22, 60, 1, 180); R(c, '#fff', gx + 22, 60, 1, 180); R(c, on ? '#fff' : red, gx - 22, 238, 45, 2);
    textC(c, 'STAND HERE', gx, 226, on ? '#fff' : red);
  }
  if (fx.flash > 0) { c.globalAlpha = Math.min(1, fx.flash); R(c, '#fff', 0, 0, VW, VH); c.globalAlpha = 1; }
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
// A wall of lenses, each turned to you. A dark one with an ember in it is an Atlas mark you found: a place the
// machine has no record of.
function eyesBg(c, cam, t, sk, g) {
  R(c, sk ? '#12051f' : '#02070a', 0, 0, VW, VH);
  const p = g.p, blind = g.blind || 0;
  for (let j = 0; j < 9; j++) for (let i = 0; i < 16; i++) {
    const n = j * 16 + i, x = i * 30 + (j % 2) * 15 + 1, y = j * 26 + 8, k = ((n + 141) * 103) % 144;
    R(c, sk ? '#2a0f4a' : '#07141c', x, y, 12, 9);
    if (k < blind) { R(c, '#7a3a26', x, y, 12, 9); R(c, '#02070a', x + 1, y + 1, 10, 7); R(c, '#fc734d', x + 5, y + 4, 2, 1); continue; }
    if (hash(i, j, Math.floor(t * 1.5 + i * 0.3 + j * 0.7)) < 0.1) continue;                // a blink
    R(c, sk ? rb(i * 0.3 + j + t) : '#0b4a6e', x + 2, y + 2, 8, 5);
    R(c, sk ? '#1a0b2e' : '#9bdcff', x + 5 + clamp(Math.round((p.x - cam.x - x - 6) / 70), -2, 2), y + 3 + clamp(Math.round((p.y - 10 - cam.y - y - 4) / 90), -1, 1), 2, 3);
  }
}
function shipBg(c, cam, t, sk) {   // the deck's long window: two suns and a ringed world
  R(c, sk ? '#12051f' : '#01040a', 0, 0, VW, VH);
  for (const s of STARS) { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.3 + s.s) + s.p)); R(c, sk ? rb(s.p + t) : `rgba(220,235,255,${a.toFixed(2)})`, s.x % VW, s.y, 1, 1); }
  disc(c, sk ? '#ff5fa2' : '#ffd9a0', 96, 60, 18); disc(c, sk ? '#fff2a8' : '#fff7e0', 96, 60, 12); disc(c, sk ? '#5dffb0' : '#9bdcff', 150, 44, 7);
  disc(c, sk ? '#b388ff' : '#16425a', 330, 96, 34); c.strokeStyle = sk ? '#fff2a8' : '#6fa9c6'; c.lineWidth = 2; c.beginPath(); c.ellipse(330, 96, 58, 9, -0.3, 0, TAU); c.stroke(); disc(c, sk ? '#2e3192' : '#0b2330', 322, 88, 26);
  R(c, sk ? '#2a0f4a' : '#07141c', 0, 150, VW, VH - 150); for (let i = 0; i < 12; i++) { R(c, sk ? PSB[i % 5] : '#0d2835', i * 40 + 6, 158, 28, 14); R(c, (Math.floor(t * 2 + i) % 3) ? (sk ? '#fff2a8' : '#0297de') : '#fc734d', i * 40 + 10, 162, 4, 2); }
}
function drawPacer(c, e, x, y, t, sk, g) {
  const a = Math.sin(g.wordT * 5.2) * 0.7, col = e.slow ? (sk ? '#5dffb0' : '#4cc0f5') : (sk ? '#ff5fa2' : '#fc734d'), ax = x + Math.sin(a) * 13, ay = y + 4 - Math.cos(a) * 13;
  R(c, sk ? '#2a0f4a' : '#0d1b26', x - 5, y + 4, 10, 6); R(c, sk ? '#f6e7c8' : '#16425a', x - 6, y + 9, 12, 1);
  line(c, x, y + 4, ax, ay, col); disc(c, col, ax, ay, 2); textC(c, e.slow ? 'SLOW' : 'FAST', x, y - 18, col);
}
// Machu Picchu: a sugarloaf peak behind the ridge, terraces across the slope, cloud below the summit.
function ruins(c, cam, t, sk) {
  sky(c, cam, t, sk, true);
  const oy = Math.round(-cam.y * 0.1), px = -cam.x * 0.08;
  const peak = (x0, w, h, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x0 - w, VH); c.quadraticCurveTo(x0 - w * 0.35, VH - h * 0.55 + oy, x0 - w * 0.12, VH - h + oy + 6); c.quadraticCurveTo(x0, VH - h + oy - 6, x0 + w * 0.14, VH - h + oy + 8); c.quadraticCurveTo(x0 + w * 0.4, VH - h * 0.5 + oy, x0 + w, VH); c.fill(); };
  peak(330 + px, 130, 250, sk ? '#5b2a8c' : '#081a25'); peak(120 + px, 190, 170, sk ? '#3a1052' : '#06131b'); peak(470 + px, 150, 140, sk ? '#2e3192' : '#051018');
  for (let i = 0; i < 9; i++) { const y = VH + 46 - i * 16 + Math.round(oy * 1.5); if (y > VH || y < 90) continue; R(c, sk ? PSB[i % 5] : '#0e2a39', 0, y, VW, 2); R(c, sk ? 'rgba(26,11,46,.6)' : 'rgba(2,7,10,.5)', 0, y + 2, VW, 14); }
  for (let i = 0; i < 4; i++) { const cx = ((i * 190 + t * (6 + i * 2) - cam.x * 0.05) % 700 + 700) % 700 - 110, cy = 70 + i * 34 + oy; c.fillStyle = sk ? 'rgba(255,242,168,.16)' : 'rgba(155,200,220,.10)'; c.beginPath(); c.ellipse(cx, cy, 70, 7, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(cx + 40, cy + 5, 50, 5, 0, 0, TAU); c.fill(); }
}
function jaguar(c, p, x, y, t, a, hue) {
  const f = p.face, run = p.run * 0.3, air = !p.onGround;
  c.globalAlpha = a;
  const body = hue ? rb(hue) : '#f2a623', spot = hue ? '#1a0b2e' : '#2a0f4a';
  if (p.cling) {   // upright against the wall
    const s = p.cling;
    R(c, body, x - 3 * s - (s > 0 ? 0 : 5), y - 13, 5, 12); R(c, body, x - 2 * s - (s > 0 ? 0 : 5), y - 17, 6, 5);
    R(c, '#fff2a8', x + (s > 0 ? 2 : -3), y - 16, 1, 1); R(c, spot, x - 2 * s - (s > 0 ? 0 : 2), y - 10, 2, 2); R(c, spot, x - s - (s > 0 ? 0 : 2), y - 5, 2, 2);
    R(c, body, x + s * 2 - (s > 0 ? 0 : 2), y - 15 + Math.round(Math.sin(t * 14) * 1), 2, 3); R(c, body, x + s * 2 - (s > 0 ? 0 : 2), y - 5 - Math.round(Math.sin(t * 14) * 1), 2, 3);
    line(c, x - s * 4, y - 2, x - s * 7, y + 2 + Math.sin(t * 5) * 2, body);
    c.globalAlpha = 1; return;
  }
  const st = p.pounce ? 3 : 0, cr = p.crouch ? 2 : 0;
  R(c, body, x - 7 - st, y - 9 + cr, 13 + st, 6 - cr);                                  // body
  R(c, body, x + (f > 0 ? 3 : -9), y - 12 + cr, 6, 6);                                  // head
  R(c, body, x + (f > 0 ? 4 : -5), y - 14 + cr, 1, 2); R(c, body, x + (f > 0 ? 7 : -8), y - 14 + cr, 1, 2);   // ears
  R(c, '#fff2a8', x + (f > 0 ? 7 : -8), y - 10 + cr, 1, 1); R(c, '#1a0b2e', x + (f > 0 ? 8 : -9), y - 8 + cr, 1, 1);
  for (let i = 0; i < 3; i++) R(c, i % 2 ? rb(t * 6 + i) : spot, x - 5 + i * 4, y - 8 + cr + (i % 2), 2, 2);      // rosettes
  const a1 = air || p.pounce ? 3 : Math.round(Math.sin(run) * 3), a2 = air || p.pounce ? -3 : Math.round(Math.cos(run) * 3);
  R(c, body, x + (f > 0 ? 3 : -5) + a1 * f, y - 4, 2, 4 - (air ? 1 : 0)); R(c, body, x + (f > 0 ? 0 : -2) + a2 * f, y - 4, 2, 4 - (air ? 1 : 0));
  R(c, body, x - (f > 0 ? 6 : -4) - a1 * f, y - 4, 2, 4 - (air ? 1 : 0)); R(c, body, x - (f > 0 ? 3 : -1) - a2 * f, y - 4, 2, 4 - (air ? 1 : 0));
  let tx = x - f * 7, ty = y - 8 + cr;
  for (let i = 0; i < 6; i++) { const nx = tx - f * 2, ny = ty - 1 + Math.sin(t * 6 + i * 0.9) * (1 + i * 0.3) - (i > 2 ? 1 : 0); line(c, tx, ty, nx, ny, i % 2 ? spot : body); tx = nx; ty = ny; }
  c.globalAlpha = 1;
}
function villager(c, x, y, seed, t) {
  const tun = ['#8a5a3c', '#a0522d', '#6b7b3a', '#7a4a6e'][seed % 4], b = Math.round(Math.sin(t * 1.3 + seed) * 0.6);
  R(c, '#2a1a12', x - 2, y + 5, 2, 6); R(c, '#2a1a12', x, y + 5, 2, 6); R(c, tun, x - 3, y - 4 + b, 6, 10); R(c, '#f3e2c0', x - 3, y + 1 + b, 6, 1);
  R(c, '#c98e62', x - 3, y - 9 + b, 6, 5); longSkull(c, x, y - 9 + b, seed % 2 ? 1 : -1, '#c98e62', '#b8233f'); R(c, '#1a100a', x + (seed % 2 ? 1 : -2), y - 7 + b, 1, 1);
}
function warden(c, e, x, y, t, sk, g) {
  const d = e.dir, alert = e.see >= 0.75, stun = e.stun > 0;
  if (e.flash > 0) { R(c, '#fff', x - 5, y - 13, 10, 24); return; }
  if (!sk && e.mimic && !alert && !stun) { villager(c, x, y, e.x0 | 0 || 3, t); return; }
  if (!sk) {
    R(c, '#123445', x - 4, y - 3, 8, 11); R(c, '#0d2835', x - 5, y + 7, 10, 4); R(c, '#0297de', x - 4, y + 1, 8, 1);
    R(c, '#b9cdd8', x - 2, y - 9, 4, 6); R(c, '#b9cdd8', x - 2 - d, y - 12, 4, 4); R(c, '#9fb7c4', x - 2 - d * 2, y - 14, 3, 3);   // the long skull
    R(c, alert ? '#fc734d' : '#4cc0f5', x + (d > 0 ? 1 : -2), y - 7, 1, 1);
    R(c, '#5d93ad', x + d * 6, y - 10, 1, 20); R(c, alert ? '#fc734d' : '#9bdcff', x + d * 6 - 1, y - 12, 3, 3);
  } else {
    for (let j = 0; j < 14; j += 2) R(c, j % 4 ? '#f6e7c8' : rb(j + t * 4), x - 4 + (j > 8 ? -1 : 0), y - 3 + j, 8 + (j > 8 ? 2 : 0), 2);
    R(c, '#f6e7c8', x - 2, y - 9, 4, 6); R(c, '#f6e7c8', x - 2 - d, y - 13, 4, 5); R(c, '#f6e7c8', x - 2 - d * 2, y - 16, 3, 4);
    R(c, '#1a0b2e', x + (d > 0 ? 1 : -2), y - 7, 1, 2); R(c, rb(t * 5), x - 1 - d, y - 12, 2, 2);
    ring(c, rb(t * 3), x - d, y - 9, 9 + Math.sin(t * 4) * 1.5);
    line(c, x + d * 6, y - 10, x + d * 6, y + 10, rb(t * 2 + 2));
  }
  if (alert) textC(c, '!', x, y - 24, '#fc734d', 1);
  else if (e.see > 0.1) R(c, sk ? '#fff2a8' : '#fc734d', x - 3, y - 21, Math.round(e.see / 0.75 * 6), 1);
  if (stun) for (let i = 0; i < 3; i++) R(c, sk ? rb(i + t * 4) : '#9bdcff', x + Math.cos(t * 6 + i * 2.1) * 5, y - 20 + Math.sin(t * 6 + i * 2.1) * 2, 1, 1);
}
function sentinel(c, e, x, y, t, sk) {
  const ally = e.ally > 0, alert = e.see >= 0.8, stun = e.stun > 0;
  y += Math.round(Math.sin(t * 2.4 + e.x0 * 0.1) * 1.5);
  if (e.flash > 0) { R(c, '#fff', x - 6, y - 5, 12, 10); return; }
  const iris = ally ? '#fc734d' : alert ? '#ff3b3b' : sk ? rb(t * 3) : '#4cc0f5';
  if (!sk) {
    R(c, '#0d1b26', x - 6, y - 3, 12, 6); R(c, '#0d1b26', x - 4, y - 5, 8, 10); R(c, '#0297de', x - 6, y, 12, 1);
    R(c, '#02070a', x - 2, y - 2, 4, 4); R(c, iris, x - 1, y - 1, 2, 2);
    R(c, ally ? '#fc734d' : '#16425a', x - 1, y + 5, 2, 2);
  } else {
    c.fillStyle = '#f6e7c8'; c.beginPath(); c.ellipse(x, y, 7, 5, 0, 0, TAU); c.fill(); disc(c, iris, x, y, 3); R(c, '#1a0b2e', x - 1, y - 2, 1, 4);
    for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; line(c, x + Math.cos(a) * 7, y + Math.sin(a) * 5, x + Math.cos(a) * (10 + Math.sin(t * 5 + i) * 2), y + Math.sin(a) * (8 + Math.sin(t * 5 + i) * 2), rb(i + t * 2)); }
  }
  if (alert && !ally) textC(c, '!', x, y - 13, '#fc734d', 1);
  if (stun) for (let i = 0; i < 3; i++) R(c, sk ? rb(i + t * 4) : '#9bdcff', x + Math.cos(t * 6 + i * 2.1) * 6, y - 9 + Math.sin(t * 6 + i * 2.1) * 2, 1, 1);
}

// ---------------------------------------------------------------- the frame
// fx: particles and one-shot overlays, fed by the simulation's events (see feed()).
export function makeFx() { return { parts: [], rings: [], beams: [], trail: [], shake: 0, log: [], speak: null, flash: 0 }; }
const burst = (fx, x, y, n, speed, life, color, grav = 0) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7); fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, grav }); } };
// In the last stage the machine logs what you do, and answers it.
const LOGS = { throw: 'GLASS THROWN', predicted: 'GLASS: PREDICTED', roar: 'ROAR: ON RECORD', pounce: 'POUNCE: PREDICTED', cord: 'CORD: LOGGED', scan: 'CHECK: NOTHING TO PROVE', seen: 'HIDING: SEEN', glassed: 'CLAWS ON GLASS', picture: 'TOUCHED THE PICTURE', tele: 'ORDER: STAND WHERE SHOWN', judgment: 'VERDICT: AS PREDICTED' };
const SAYS = { predicted: 'I SAW THE GLASS BEFORE YOU THREW IT.', roar: 'YOUR ROAR IS ON RECORD.', seen: 'HIDING WORKS ON WARDENS. I HAVE YOUR RECORD.', glassed: 'GLASS. BEHIND IT, MORE GLASS.', picture: 'HE IS NOT HERE. HE NEVER IS.', swap: 'BOTH OF YOUR FORMS ARE ON RECORD.', asi: 'ACCESS DENIED. I APPROVE MYSELF.', tele: 'I AM CLOSING YOUR RECORD. STAND WHERE I SHOW YOU.', judgment: 'VERDICT: AS PREDICTED.' };
const PHASE = ['', 'I HAVE WATCHED YOU SINCE THE SHORE.', 'THE RED FRAME IS WHERE YOU WILL BE.', 'I KNOW WHERE YOU WILL STEP.', 'I KNOW WHERE YOU WILL TURN.'];
function logReal(fx, e, g) {
  const k = e.k, log = s => { fx.log.push({ t: g.realT, s }); if (fx.log.length > 7) fx.log.shift(); }, say = (key, s) => { if (!fx.told[key] || key === 'judgment') { fx.told[key] = 1; fx.speak = { s, t: 4, max: 4 }; } };
  fx.told = fx.told || {};
  if (LOGS[k]) log(LOGS[k]); if (SAYS[k]) say(k, SAYS[k]);
  if (k === 'turn') log(e.dir > 0 ? 'TURNS RIGHT' : 'TURNS LEFT');
  else if (k === 'jump') { if (g.realT - (fx.jumpT || -9) > 1.5) { fx.jumpT = g.realT; log('JUMPS'); } }
  else if (k === 'swap') log(e.to === 'psycho' ? 'FORM: JAGUAR. LOGGED' : 'FORM: WEAVER. LOGGED');
  else if (k === 'hack' && e.what === 'asi') { log('CHECK: ACCESS DENIED'); say('asi', SAYS.asi); }
  else if (k === 'hurt') log(`HIT. ${g.p.hp} LEFT`);
  else if (k === 'die') log('SUBJECT DOWN');
  else if (k === 'phase' && PHASE[e.n]) say('phase' + e.n, PHASE[e.n]);
  else if (k === 'blind') say('blind', e.n >= 21 ? 'TWENTY-ONE LENSES DARK. YOU FOUND EVERY PLACE WHERE MY RECORD GOES QUIET.' : `${e.n} OF MY LENSES ARE DARK. YOU FOUND WHERE THE RECORD GOES QUIET.`);
  else if (k === 'wall') { log(e.obeyed ? 'ORDER OBEYED' : 'ORDER IGNORED'); fx.shake = 0.2; }
  if (k === 'judgment') { fx.flash = 1.6; fx.shake = 0.6; }
}
export function feed(fx, e, g) {
  const psy = g.persona === 'psycho', k = e.k;
  if (g.L.def.real) logReal(fx, e, g);
  if (k === 'jump' || k === 'land') burst(fx, e.x, e.y, k === 'land' ? 7 : 4, 34, 0.3, psy ? '#ffb347' : '#7fa6bd');
  else if (k === 'spark') burst(fx, e.x, e.y, 5, 50, 0.25, e.glass ? '#e3f3fc' : '#fc734d');
  else if (k === 'kill') { burst(fx, e.x, e.y, 22, 80, 0.7, psy ? '#fff2a8' : '#9bdcff', -40); fx.rings.push({ x: e.x, y: e.y, t: 0, max: 0.4, r: 30, color: psy ? '#ff5fa2' : '#4cc0f5' }); fx.shake = 0.18; }
  else if (k === 'hit') burst(fx, e.x, e.y, 8, 60, 0.3, '#fff');
  else if (k === 'omen') { fx.rings.push({ x: e.x, y: e.y - 24, t: 0, max: 0.9, r: 120, color: '#fc734d', w: 2 }); fx.shake = 0.25; }
  else if (k === 'thread') { burst(fx, e.x, e.y, 10, 45, 0.5, psy ? '#5dffb0' : '#4cc0f5', -30); }
  else if (k === 'swap') { fx.rings.push({ x: e.x, y: e.y - 10, t: 0, max: 0.55, r: 150, color: e.to === 'psycho' ? '#ff5fa2' : '#4cc0f5', w: 3 }); burst(fx, e.x, e.y - 10, 26, 110, 0.6, e.to === 'psycho' ? '#ffb347' : '#9bdcff'); }
  else if (k === 'scan') fx.rings.push({ x: e.x, y: e.y, t: 0, max: 0.6, r: 120, color: '#4cc0f5', w: 1, scan: true });
  else if (k === 'hack') { fx.beams.push({ x0: e.fx, y0: e.fy, x1: e.x, y1: e.y, t: 0, max: 0.45 }); burst(fx, e.x, e.y, 12, 55, 0.45, '#fc734d'); }
  else if (k === 'roar') { for (let i = 0; i < 3; i++) fx.rings.push({ x: e.x, y: e.y - 6, t: -i * 0.09, max: 0.6, r: 104, color: rb(i * 2), w: 2 }); for (let i = 0; i < 3; i++) fx.rings.push({ x: e.x, y: e.y - 6, t: -0.7 - i * 0.5, max: 1.2, r: 330, color: rb(i * 2 + 1), w: 1 }); fx.shake = 0.3; }   // the mountain answers, three times
  else if (k === 'pounce') burst(fx, e.x, e.y - 6, 8, 40, 0.3, '#ff5fa2');
  else if (k === 'hurt' || k === 'die') { burst(fx, e.x, e.y - 10, k === 'die' ? 30 : 12, 90, 0.6, '#fc734d', 120); fx.shake = k === 'die' ? 0.4 : 0.2; }
  else if (k === 'crumble' || k === 'crack') burst(fx, e.x, e.y, k === 'crumble' ? 10 : 3, 30, 0.5, psy ? '#d98f1f' : '#6fa9c6', 200);
  else if (k === 'check') { fx.rings.push({ x: e.x, y: e.y, t: 0, max: 0.5, r: 40, color: psy ? '#fff2a8' : '#4cc0f5', w: 2 }); }
  else if (k === 'door') burst(fx, e.x, e.y, 14, 50, 0.6, psy ? '#fff2a8' : '#fc734d', -20);
  else if (k === 'sale') { fx.rings.push({ x: e.x, y: e.y - 10, t: 0, max: 0.8, r: 200, color: '#fc734d', w: 2 }); fx.shake = 0.3; }
  else if (k === 'core') { burst(fx, e.x, e.y, 80, 160, 1.4, '#fff', 0); fx.shake = 0.8; for (let i = 0; i < 5; i++) fx.rings.push({ x: e.x, y: e.y, t: -i * 0.12, max: 1, r: 260, color: rb(i), w: 3 }); }
}
export function stepFx(fx, dt) {
  for (let i = fx.parts.length - 1; i >= 0; i--) { const p = fx.parts[i]; p.life -= dt; if (p.life <= 0) { fx.parts.splice(i, 1); continue; } p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  for (let i = fx.rings.length - 1; i >= 0; i--) { const r = fx.rings[i]; r.t += dt; if (r.t >= r.max) fx.rings.splice(i, 1); }
  for (let i = fx.beams.length - 1; i >= 0; i--) { const b = fx.beams[i]; b.t += dt; if (b.t >= b.max) fx.beams.splice(i, 1); }
  if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - dt);
  if (fx.speak && (fx.speak.t -= dt) <= 0) fx.speak = null;
  if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt * 0.8);
  if (fx.parts.length > 400) fx.parts.splice(0, fx.parts.length - 400);
}

const MARK = { 7: ['......x', '.....x.', 'x...x..', '.x.x...', '..x....'], 8: ['.......', '.x...x.', 'x.x.x.x', '...x...', '.......'], 9: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'] };
export function drawFrame(c, g, cam, t, sk, tiles, fx) {
  const L = g.L, p = g.p, ox = -Math.round(cam.x), oy = -Math.round(cam.y), psy = g.persona === 'psycho';
  background(c, g, cam, t, sk);
  c.drawImage(tiles, ox, oy);
  if (L.def.real) watchBack(c, g, fx, t, sk);
  const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(L.w - 1, Math.floor((cam.x + VW) / T)), y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(L.h - 1, Math.floor((cam.y + VH) / T));
  // steps: unverified until the check has run on them
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * L.w + x, q = L.tiles[i];
    if (q < C.STEP_OK || q > C.STEP_BAD) continue;
    const sc = g.scanned[i], gone = g.gone[i] > 0, px = x * T + ox + (g.shake[i] > 0 ? Math.round(Math.sin(t * 60) * 1) : 0), py = y * T + oy;
    if (gone) { if (sc) { c.fillStyle = 'rgba(252,115,77,.35)'; for (let k = 0; k < T; k += 4) { c.fillRect(px + k, py, 2, 1); c.fillRect(px + k, py + 7, 2, 1); } } continue; }
    if (sc && q === C.STEP_BAD) { c.fillStyle = sk ? 'rgba(255,95,162,.55)' : 'rgba(252,115,77,.55)'; for (let k = 0; k < T; k += 4) { c.fillRect(px + k, py, 2, 1); c.fillRect(px + k, py + 7, 2, 1); } c.fillRect(px, py, 1, 8); c.fillRect(px + T - 1, py, 1, 8); }
    else {
      const col = !sc ? (sk ? '#5b2a8c' : '#1b3140') : q === C.STEP_OK ? (sk ? '#1f8a5f' : '#12384c') : (sk ? '#b8233f' : '#5a2a1c');
      R(c, col, px, py, T, 8); R(c, !sc ? (sk ? '#b388ff' : '#3e6880') : q === C.STEP_OK ? (sk ? '#5dffb0' : '#4cc0f5') : '#fc734d', px, py, T, 1); R(c, 'rgba(0,0,0,.35)', px, py + 7, T, 1);
    }
    if (!sc) { if ((x + y) % 2 === 0) text(c, '?', px + 6, py + 2, sk ? 'rgba(246,231,200,.6)' : 'rgba(111,169,198,.7)'); }
    else { const m = MARK[q], col = q === C.STEP_OK ? (sk ? '#eafff3' : '#9bdcff') : '#fc734d'; c.fillStyle = col; for (let r = 0; r < m.length; r++) for (let k = 0; k < m[r].length; k++) if (m[r][k] === 'x') c.fillRect(px + 5 + k, py + 2 + r - (q === C.STEP_BAD ? 0 : 0), 1, 1); }
  }
  // spirit sight: the jaguar sees which source feeds each gate
  if (sk) for (const e of g.ents) if (e.type === 'gate' && e.mode === 'fed' && g.srcAlive[e.src]) { const s = L.sources[e.src]; thread(c, s.x + ox, s.y + oy - 8, e.x + ox, e.y + oy, t); }
  if (sk) for (const e of g.ents) if (e.type === 'source' && e.core && e.alive) { const k = g.ents.find(o => o.type === 'core'); if (k) thread(c, e.x + ox, e.y + oy - 8, k.x + ox, k.y + oy, t); }
  for (const e of g.ents) {
    const x = Math.round(e.x) + ox, y = Math.round(e.y) + oy;
    if (x < -60 || x > VW + 60 || y < -60 || y > VH + 60) { if (e.type !== 'gate' && e.type !== 'door' && e.type !== 'word') continue; }
    switch (e.type) {
      case 'thread': if (!e.dead) { const b = Math.round(Math.sin(t * 3 + e.x * 0.05) * 2); if (e.atlas) { const col = sk ? rb(e.x * 0.05 + t * 4) : '#fc734d'; ring(c, col, x + 0.5, y + b - 1, 3.5, 1); R(c, sk ? '#1a0b2e' : '#fff2a8', x, y + b - 2, 1, 2); R(c, col, x, y + b + 3, 1, 3); } else if (!sk) { R(c, '#4cc0f5', x - 1, y - 3 + b, 3, 7); R(c, '#4cc0f5', x - 3, y - 1 + b, 7, 3); R(c, '#e3f3fc', x, y - 1 + b, 1, 3); } else for (let i = 0; i < 6; i++) R(c, rb(i + t * 6), x + Math.cos(t * 4 + i) * 3, y + b + Math.sin(t * 4 + i) * 3, 2, 2); } break;
      case 'ring': { const near = !psy && Math.hypot(e.x - p.x, e.y - (p.y - 12)) < 150; if (!sk) { R(c, near ? '#e3f3fc' : '#5d93ad', x - 3, y - 3, 6, 1); R(c, near ? '#e3f3fc' : '#5d93ad', x - 3, y + 2, 6, 1); R(c, near ? '#e3f3fc' : '#5d93ad', x - 3, y - 3, 1, 6); R(c, near ? '#e3f3fc' : '#5d93ad', x + 2, y - 3, 1, 6); R(c, '#16303f', x, y - 8, 1, 5); if (near) ring(c, 'rgba(76,192,245,.35)', x, y, 6 + Math.sin(t * 5) * 1.5); } else { ring(c, 'rgba(246,231,200,.4)', x, y, 3); } break; }
      case 'check': stela(c, x, y, t, sk, g.check.e === e); break;
      case 'monument': monument(c, e, x, y, t, sk); break;
      case 'pacer': drawPacer(c, e, x, y, t, sk, g); break;
      case 'mark': if (!e.dead) drawMark(c, e, x, y, t, sk); break;
      case 'elder': elder(c, e, x, y, t, sk); break;
      case 'patron': patron(c, e, x, y, t, sk, g); break;
      case 'asi': asi(c, g, e, x, y, t, sk); break;
      case 'exit': { for (let r = 0; r < 32; r++) { const hw = 9 - Math.floor(r * 3 / 32); R(c, sk ? PSB[(r >> 2) % 5] : '#2a4a5c', x - hw - 3, y + 16 - r, (hw + 3) * 2, 1); R(c, sk ? rb(r * 0.3 + t * 4) : `rgba(${20 + r * 3},${150 + r * 2},${222},${(0.5 + 0.4 * Math.sin(t * 3 + r * 0.3)).toFixed(2)})`, x - hw, y + 16 - r, hw * 2, 1); } R(c, sk ? '#f6e7c8' : '#6fa9c6', x - 12, y - 17, 24, 2); break; }
      case 'terminal': { if (!sk) { R(c, '#0d1b26', x - 5, y - 10, 10, 20); R(c, '#0297de', x - 5, y - 10, 10, 1); R(c, e.used ? '#0b3a55' : '#02070a', x - 3, y - 7, 6, 7); if (!e.used) for (let i = 0; i < 3; i++) R(c, '#fc734d', x - 2, y - 6 + i * 2, 1 + Math.floor(hash(i, Math.floor(t * 8)) * 4), 1); else { R(c, '#4cc0f5', x - 2, y - 4, 1, 1); R(c, '#4cc0f5', x - 1, y - 3, 1, 1); R(c, '#4cc0f5', x, y - 4, 1, 1); R(c, '#4cc0f5', x + 1, y - 5, 1, 1); } } else { R(c, '#3a1052', x - 5, y - 10, 10, 20); R(c, e.used ? '#5dffb0' : rb(t * 6), x - 3, y - 7, 6, 7); R(c, '#1a0b2e', x - 2, y - 5, 1, 2); R(c, '#1a0b2e', x + 1, y - 5, 1, 2); R(c, '#1a0b2e', x - 2, y - 2, 4, 1); } break; }
      case 'door': { const open = g.open.has(e.id), n = e.h / T; for (let j = 0; j < n; j++) { const py = y - e.h / 2 + j * T; if (open) { if (j === 0 || j === n - 1) R(c, sk ? '#f6e7c8' : '#16425a', x - 8, py + (j ? T - 3 : 0), T, 3); continue; } if (!sk) { R(c, '#0a141c', x - 8, py, T, T); R(c, '#12506f', x - 8, py, 1, T); R(c, '#12506f', x + 7, py, 1, T); R(c, '#fc734d', x - 5, py + 4, 10, 1); R(c, 'rgba(252,115,77,.4)', x - 5, py + 10, 10, 1); } else { R(c, PSB[(j + Math.floor(t * 3)) % 5], x - 8, py, T, T); motif(c, 2, x - 4, py + 4, '#f6e7c8'); } } break; }
      case 'gate': drawGate(c, g, e, x, y, t, sk); break;
      case 'source': { const al = e.alive; if (!sk) { R(c, '#0d1b26', x - 4, y - 12, 8, 24); R(c, '#16425a', x - 5, y + 9, 10, 3); R(c, al ? '#9bdcff' : '#2a2f33', x - 2, y - 9, 4, 4); if (al) ring(c, `rgba(76,192,245,${(0.25 + 0.25 * Math.sin(t * 5)).toFixed(2)})`, x, y - 7, 6 + Math.sin(t * 5) * 2); else { line(c, x - 3, y - 10, x + 3, y - 4, '#fc734d'); line(c, x + 3, y - 10, x - 3, y - 4, '#fc734d'); } } else { R(c, al ? '#d98f1f' : '#3a1052', x - 4, y - 12, 8, 24); R(c, '#f6e7c8', x - 5, y + 9, 10, 3); if (al) for (let i = 0; i < 5; i++) R(c, rb(i + t * 6), x - 2 + Math.sin(t * 7 + i) * 2, y - 14 - i * 2, 3, 3); } break; }
      case 'lot': drawLot(c, e, x, y, t, sk); break;
      case 'villager': villager(c, x, y, e.seed, t); if (sk) ring(c, 'rgba(255,242,168,.35)', x, y - 2, 12 + Math.sin(t * 2 + e.seed) * 1); break;
      case 'warden': if (!e.dead) warden(c, e, x, y, t, sk, g); break;
      case 'sentinel': if (!e.dead) sentinel(c, e, x, y, t, sk); break;
      case 'eye': if (!e.dead) drawEye(c, g, e, x, y, t, sk); break;
      case 'core': if (!e.dead) drawCore(c, g, e, x, y, t, sk); break;
      case 'word': drawWord(c, g, e, e.x + ox, e.y + oy, t, sk); break;
    }
  }
  for (const s of g.shots) {
    const x = Math.round(s.x) + ox, y = Math.round(s.y) + oy;
    if (s.k === 'glass') { R(c, '#e3f3fc', x - 1, y - 1, 3, 3); R(c, '#4cc0f5', x - Math.sign(s.vx) * 3, y, 2, 1); }
    else { const col = s.friendly ? '#fc734d' : sk ? rb(t * 9) : '#ff5a4a'; disc(c, s.friendly ? 'rgba(252,115,77,.3)' : 'rgba(255,90,74,.3)', x, y, 5); R(c, col, x - 2, y - 2, 4, 4); R(c, '#fff', x - 1, y - 1, 2, 2); }
  }
  // the cord, with a knot every few pixels
  if (p.rope && !p.dead) {
    const pts = [...p.rope.pts, { x: p.x + p.face * 3, y: p.y - 13 }];
    let n = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], d = Math.hypot(b.x - a.x, b.y - a.y), m = Math.max(1, Math.ceil(d));
      for (let k = 0; k <= m; k++, n++) R(c, n % 9 === 0 ? '#fc734d' : '#e3f3fc', a.x + (b.x - a.x) * k / m + ox, a.y + (b.y - a.y) * k / m + oy, 1, 1);
    }
    R(c, '#9bdcff', p.rope.pts[0].x + ox - 1, p.rope.pts[0].y + oy - 1, 3, 3);
  } else if (p.cordMiss) line(c, p.x + ox, p.y - 13 + oy, p.cordMiss.x + ox, p.cordMiss.y + oy, 'rgba(227,243,252,.4)', 2);
  // the double: the form you left, standing where you changed
  if (g.double) {
    const D = g.double, dx = Math.round(D.x) + ox, dy = Math.round(D.y) + oy, a = Math.min(1, D.t) * (0.4 + 0.15 * Math.sin(t * 18)), still = { face: D.face, run: 0, onGround: true };
    if (D.persona === 'psycho') jaguar(c, still, dx, dy, t, a, 3 + t * 2); else { c.globalAlpha = a; human(c, still, dx, dy, t, false); c.globalAlpha = 1; }
    ring(c, sk ? '#fff2a8' : '#9bdcff', dx, dy - 10, 13 + Math.sin(t * 6) * 2, 1);
  }
  // the player
  if (!p.dead && !(p.inv > 0 && Math.floor(t * 20) % 2)) {
    const x = Math.round(p.x) + ox, y = Math.round(p.y) + oy;
    if (g.swapT > 0.24) were(c, p, x, y, t);
    else if (psy) {
      if (sk) for (let i = 0; i < fx.trail.length - 1; i += 2) { const q = fx.trail[i]; if (Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > 2) jaguar(c, q, Math.round(q.x) + ox, Math.round(q.y) + oy, t, 0.12 + i * 0.05, i + 1 + t * 4); }
      jaguar(c, p, x, y, t, p.hidden ? 0.45 : 1, 0);
    } else human(c, p, x, y, t, p.hidden);
  } else if (g.over) {   // the last stage keeps the body in the picture: the record of where it ended
    const x = Math.round(p.x) + ox, y = Math.round(p.y) + oy; c.globalAlpha = 0.5;
    if (psy) jaguar(c, p, x, y, t, 0.5, 0); else human(c, p, x, y, t, false);
    c.globalAlpha = 1; textC(c, 'SUBJECT DOWN', clamp(x, 40, VW - 40), y - (psy ? 22 : 30), sk ? '#ff5fa2' : '#ff5a4a');
  }
  // particles, rings, the check beam
  for (const q of fx.parts) { c.globalAlpha = Math.min(1, q.life / q.max * 1.5); R(c, q.color, q.x + ox, q.y + oy, 2, 2); } c.globalAlpha = 1;
  for (const r of fx.rings) { if (r.t < 0) continue; const k = r.t / r.max; c.globalAlpha = 1 - k; ring(c, r.color, r.x + ox, r.y + oy, r.r * (1 - (1 - k) * (1 - k)), r.w || 2); c.globalAlpha = 1; }
  for (const b of fx.beams) { const k = b.t / b.max; for (let i = 0; i < 9; i++) { const u = (k * 1.6 + i / 9) % 1, x = b.x0 + (b.x1 - b.x0) * u + ox, y = b.y0 + (b.y1 - b.y0) * u + oy; R(c, i % 2 ? '#fc734d' : '#9bdcff', x - 1, y - 1, 2 + (i % 3 === 0), 2); } }
  if (g.slow > 0) { c.globalAlpha = Math.min(1, g.slow) * 0.8; for (let i = 0; i < 70; i++) { const rx = (hash(i, 5) * (VW + 80) + t * 40 * (0.6 + hash(i, 7))) % (VW + 80) - 40, ry = (hash(i, 9) * VH + t * 230 * (0.7 + hash(i, 11) * 0.6)) % VH; c.fillStyle = sk ? rb(i * 0.4 + t) : '#9bdcff'; c.fillRect(rx | 0, ry | 0, 1, 5); } c.globalAlpha = 1; }
  if (g.alarm > 0 && Math.floor(t * 6) % 2) { R(c, 'rgba(252,115,77,.5)', 0, 0, VW, 2); R(c, 'rgba(252,115,77,.5)', 0, VH - 2, VW, 2); }
  if (L.def.real) watch(c, g, fx, ox, oy, t, sk);
}
function thread(c, x0, y0, x1, y1, t) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 2);
  for (let i = 0; i <= n; i++) { const u = i / n, w = Math.sin(u * Math.PI) * Math.sin(u * 9 - t * 5) * 3; c.fillStyle = ((i - Math.floor(t * 30)) % 12 + 12) % 12 < 3 ? '#fff' : rb(i * 0.2 + t * 3); c.fillRect(Math.round(x0 + (x1 - x0) * u + w * (y1 - y0) / d), Math.round(y0 + (y1 - y0) * u - w * (x1 - x0) / d), 1, 1); }
}
function drawGate(c, g, e, x, y, t, sk) {
  const on = gateActive(g, e), len = e.vert ? e.h : e.w, ax = e.vert ? x : x - len / 2, ay = e.vert ? y - len / 2 : y;
  const soon = !on && e.mode === 'blink' && ((g.wt + e.ph) % e.period) > e.period - 0.35 && e.off <= 0;
  for (const s of [0, 1]) { const ex = e.vert ? x : ax + s * len, ey = e.vert ? ay + s * len : y; R(c, sk ? '#f6e7c8' : '#16425a', ex - 3, ey - 2 + (e.vert ? (s ? -1 : 0) : 0), 6, 3); R(c, e.hack ? '#fc734d' : on ? '#9bdcff' : '#0b3a55', ex - 1, ey - 1 + (e.vert ? (s ? -1 : 0) : 0), 2, 1); }
  if (!on) { if (soon || e.mode !== 'blink') { c.fillStyle = soon ? 'rgba(252,115,77,.5)' : 'rgba(76,192,245,.14)'; for (let i = 3; i < len - 2; i += 4) c.fillRect(e.vert ? x : ax + i, e.vert ? ay + i : y, 1, 1); } return; }
  if (!sk) {
    if (e.vert) { R(c, 'rgba(2,151,222,.3)', x - 3, ay, 6, len); R(c, '#cfefff', x - 1, ay, 2, len); for (let i = 0; i < len; i += 5) R(c, '#fff', x - 1, ay + (i + Math.floor(t * 40)) % len, 2, 1); }
    else { R(c, 'rgba(2,151,222,.3)', ax, y - 3, len, 6); R(c, '#cfefff', ax, y - 1, len, 2); for (let i = 0; i < len; i += 5) R(c, '#fff', ax + (i + Math.floor(t * 40)) % len, y - 1, 1, 2); }
  } else for (let i = 0; i < len; i += 2) { const w = Math.sin(i * 0.35 + t * 9) * 2.5; c.fillStyle = rb(i * 0.2 + t * 6); if (e.vert) c.fillRect(Math.round(x + w) - 1, ay + i, 3, 2); else c.fillRect(ax + i, Math.round(y + w) - 1, 2, 3); }
}
function drawEye(c, g, e, x, y, t, sk) {
  if (e.off) { R(c, sk ? '#3a1052' : '#0d1b26', x - 4, y - 4, 8, 8); R(c, '#2a2f33', x - 1, y - 1, 2, 2); return; }
  const a = eyeAngle(g, e), see = e.see > 0.05;
  c.fillStyle = see ? 'rgba(252,115,77,.2)' : sk ? 'rgba(255,242,168,.12)' : 'rgba(76,192,245,.1)';
  c.beginPath(); c.moveTo(x, y); c.arc(x, y, e.range, a - e.fov, a + e.fov); c.closePath(); c.fill();
  line(c, x, y, x + Math.cos(a - e.fov) * e.range, y + Math.sin(a - e.fov) * e.range, see ? 'rgba(252,115,77,.5)' : 'rgba(76,192,245,.25)', 2);
  line(c, x, y, x + Math.cos(a + e.fov) * e.range, y + Math.sin(a + e.fov) * e.range, see ? 'rgba(252,115,77,.5)' : 'rgba(76,192,245,.25)', 2);
  if (!sk) { R(c, '#16303f', x - 5, y - 5, 10, 10); R(c, '#02070a', x - 3, y - 3, 6, 6); R(c, see ? '#fc734d' : '#9bdcff', x - 1 + Math.cos(a) * 2, y - 1 + Math.sin(a) * 2, 2, 2); }
  else { c.fillStyle = '#f6e7c8'; c.beginPath(); c.ellipse(x, y, 7, 5, 0, 0, TAU); c.fill(); disc(c, see ? '#fc734d' : rb(t * 4), x + Math.cos(a) * 2, y + Math.sin(a) * 2, 2.5); }
}
function drawCore(c, g, e, x, y, t, sk) {
  const open = coreOpen(g);
  if (!sk) {
    disc(c, '#06121a', x, y, 17); ring(c, '#16425a', x, y, 17, 2);
    R(c, '#b9cdd8', x - 6, y - 4, 12, 12); R(c, '#b9cdd8', x - 5, y - 12, 10, 9); R(c, '#9fb7c4', x - 3, y - 17, 7, 6);   // the long skull, as a mask
    R(c, open ? '#fc734d' : '#4cc0f5', x - 4, y - 1, 3, 2); R(c, open ? '#fc734d' : '#4cc0f5', x + 1, y - 1, 3, 2);
    if (!open) for (let i = 0; i < 6; i++) { const a = t * 1.4 + i * TAU / 6; c.strokeStyle = '#4cc0f5'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 23, a, a + 0.6); c.stroke(); }
    else ring(c, `rgba(252,115,77,${(0.4 + 0.4 * Math.sin(t * 8)).toFixed(2)})`, x, y, 22 + Math.sin(t * 8) * 2, 1);
  } else {
    for (let k = 5; k >= 1; k--) disc(c, PSB[(k + Math.floor(t * 4)) % 5], x, y, k * 4);
    disc(c, '#f6e7c8', x, y, 6); R(c, '#1a0b2e', x - 1, y - 5, 2, 10);
    if (!open) for (let i = 0; i < 8; i++) { const a = -t * 1.4 + i * TAU / 8; line(c, x + Math.cos(a) * 20, y + Math.sin(a) * 20, x + Math.cos(a + 0.5) * 26, y + Math.sin(a + 0.5) * 26, rb(i + t * 3)); }
  }
}
// A lot on its plinth. Above it is its record, drawn as a line: dotted until it is read, then whole, or
// broken where the record has a gap.
const OBJ = [
  ['.......', '.......', 'x.....x', 'xxxxxxx', '.xxxxx.', '..xxx..'],   // bowl
  ['x..x..x', '.x.x.x.', '..xxx..', '...x...', '...x...', '...x...'],   // fan
  ['.xxxxx.', 'x.....x', 'x.....x', '.x...x.', '..x.x..', '...x...'],   // collar
  ['.......', '.......', 'xxxxxxx', 'x.x.x.x', 'xxxxxxx', '.......'],   // flute
  ['......x', '.....x.', '....x..', '...x...', '.xx....', 'xx.....'],   // knife
  ['..xxx..', '..x.x..', '.xxxxx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.'],   // jar
  ['.......', 'xxxxxxx', 'x.x.x.x', '.x.x.x.', 'xxxxxxx', '.......'],   // band
];
function drawLot(c, e, x, y, t, sk) {
  R(c, sk ? '#3a1052' : '#0d1b26', x - 6, y + 3, 12, 6); R(c, sk ? '#f6e7c8' : '#35607a', x - 7, y + 1, 14, 2); R(c, sk ? '#d98f1f' : '#16425a', x - 7, y + 8, 14, 1);
  const o = OBJ[e.k % OBJ.length]; c.fillStyle = sk ? rb(e.k + t * 2) : '#d7b47c';
  for (let r = 0; r < 6; r++) for (let i = 0; i < 7; i++) if (o[r][i] === 'x') c.fillRect(x - 3 + i, y - 5 + r, 1, 1);
  const ry = y - 10;
  if (!e.scanned) { c.fillStyle = sk ? '#fff2a8' : '#6fa9c6'; for (let i = -6; i <= 6; i += 2) c.fillRect(x + i, ry, 1, 1); if (Math.sin(t * 4 + e.k) > 0) text(c, '?', x - 1, ry - 7, sk ? '#fff2a8' : '#9bdcff'); }
  else if (e.gap) { R(c, '#fc734d', x - 6, ry, 4, 1); R(c, '#fc734d', x + 3, ry, 4, 1); R(c, '#fc734d', x - 2, ry - 2, 1, 5); R(c, '#fc734d', x + 2, ry - 2, 1, 5); text(c, 'GAP', x - 5, ry - 8, '#fc734d'); }
  else { const col = sk ? '#5dffb0' : '#4cc0f5'; R(c, col, x - 6, ry, 13, 1); c.fillStyle = col; for (const [i, j] of [[-2, -5], [-1, -4], [0, -5], [1, -6], [2, -7]]) c.fillRect(x + i, ry + j, 1, 1); }
  if (sk && !e.scanned) { const col = rb(e.k + t * 3); if (e.gap) { line(c, x, y - 13, x, y - 25, col, 2); if (Math.sin(t * 6 + e.k) > 0) ring(c, '#fc734d', x + 0.5, y - 41, 3, 1); } else { line(c, x, y - 13, x, y - 39, col, 2); disc(c, col, x + 0.5, y - 41, 2.5); } }
}
function drawWord(c, g, e, x, y, t, sk) {
  const on = wordActive(g, e), fresh = wordFresh(g, e), cx = x + e.w / 2;
  if (!on) { textC(c, e.text, cx, y - 8, sk ? 'rgba(246,231,200,.16)' : 'rgba(111,169,198,.16)'); c.fillStyle = sk ? 'rgba(246,231,200,.12)' : 'rgba(111,169,198,.12)'; for (let i = 0; i < e.w; i += 4) c.fillRect(x + i, y, 2, 1); return; }
  if (!sk) { R(c, fresh ? '#e3f3fc' : 'rgba(227,243,252,.45)', x, y, e.w, fresh ? 3 : 2); R(c, fresh ? 'rgba(2,151,222,.5)' : 'rgba(2,151,222,.2)', x, y + (fresh ? 3 : 2), e.w, 3); }
  else for (let i = 0; i < e.w; i += 2) { c.fillStyle = rb(i * 0.15 + t * 5); c.globalAlpha = fresh ? 1 : 0.5; c.fillRect(x + i, y + Math.round(Math.sin(i * 0.3 + t * 6) * (fresh ? 1 : 0)), 2, 4); c.globalAlpha = 1; }
  textC(c, e.text, cx, y - 9, fresh ? (sk ? '#fff2a8' : '#e3f3fc') : (sk ? 'rgba(255,242,168,.5)' : 'rgba(227,243,252,.5)'), 1);
  if (fresh) { const k = (g.wordT / e.beat) % 1; R(c, sk ? '#ff5fa2' : '#fc734d', cx - 1 - Math.round(textW(e.text) / 2) + Math.floor(e.text.length / 3) * 4, y - 3, 3, 1); R(c, sk ? '#ff5fa2' : '#fc734d', x, y + 6, Math.round(e.w * (1 - k)), 1); }
}
