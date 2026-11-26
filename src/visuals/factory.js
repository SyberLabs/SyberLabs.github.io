/* SyberLabs: the Factory visual. A tape is read, copied piece by piece, checked, and released. Mounted in a section. */
const root = typeof window !== 'undefined' ? window : globalThis;
var TAU = 6.283185307;
var N = 12, P = TAU / N, RG = N / TAU, R = 2.6, DM = 2 * RG + 0.1, TW = 0.55, DG = 9;
var COL = [[76, 192, 245], [227, 243, 252], [2, 151, 222], [127, 166, 189], [252, 115, 77]]; // electric-hi, vellum, electric, steel; 4 = cantaloupe, the live signal
var PAIR = [[0, 1], [1, 0], [2, 3], [3, 2]];
var PEARL = [190, 214, 230];

function hsh(k, salt) { var x = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); }
function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function sstep(a, b, x) { x = cl((x - a) / (b - a)); return x * x * (3 - 2 * x); }
function G(u, w) { return u <= 0 ? 0 : u < w ? u * u / (2 * w) : u - w / 2; }
function back(p) { var c = 1.9; p -= 1; return 1 + (c + 1) * p * p * p + c * p * p; }
function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + cl(a).toFixed(3) + ')'; }
function isPR(k, st) { return hsh(k, 7 + st) < 0.1; }

function render(ctx, W, H, t, s) {
  var a = Math.min(W / 26, H / 50), cx = W / 2, yF = H * 0.24;
  function X(x) { return cx + x * a; }
  function Y(y) { return yF + y * a; }

  function geo(k, st) {
    var sg = st ? 1 : -1, u = k - s, ph, c;
    if (u >= 0) {
      ph = TW * G(u - 2.5, 5); c = Math.cos(ph);
      return { bx: sg * R * c, y: -u, tx: 0, nx: 0, z: -sg * Math.sin(ph), d: -u };
    }
    var d = -u, D = DM * sstep(0, 7, d);
    ph = TW * G(d - 24, 6); c = Math.cos(ph);
    return { bx: sg * (D + R * c), y: d, tx: sg * D, nx: sg * (D - R * c), z: -sg * Math.sin(ph), d: d };
  }
  function dep(z) { return 0.42 + 0.58 * (0.5 + 0.5 * z); }

  function glyph(ci, x, y, al, sc) {
    var c = COL[ci];
    ctx.beginPath();
    if (ci === 0) { ctx.arc(x, y, 0.17 * a * sc, 0, TAU); ctx.fillStyle = rgba(c, al); ctx.fill(); }
    else if (ci === 1) { ctx.arc(x, y, 0.31 * a * sc, 0, TAU); ctx.strokeStyle = rgba(c, al); ctx.lineWidth = 1.1; ctx.stroke(); }
    else {
      var r = (ci === 2 ? 0.2 : 0.38) * a * sc;
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
      if (ci === 2) { ctx.fillStyle = rgba(c, al); ctx.fill(); }
      else { ctx.strokeStyle = rgba(c, al); ctx.lineWidth = 1.1; ctx.stroke(); }
    }
  }
  function half(bx, by, tx, ty, ci, al, lw) {
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty);
    ctx.strokeStyle = rgba(COL[ci], al); ctx.lineWidth = lw || 1.5; ctx.stroke();
    glyph(ci, tx, ty, al, 1);
    ctx.fillStyle = rgba(PEARL, al);
    ctx.fillRect(bx - 0.13 * a, by - 0.13 * a, 0.26 * a, 0.26 * a);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);

  // the five steps of the factory, set beside the part of the machine that does each
  var LAB = [[14.5, 'Propose'], [20.5, 'Check'], [25, 'Review'], [29.5, 'Approve'], [34, 'Publish']];
  var lx = Math.min(W / 2 - 14, 15.5 * a), fs = Math.max(9, Math.min(11, a * 0.62));
  ctx.font = '500 ' + fs + 'px "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  try { ctx.letterSpacing = '0.18em'; } catch (e) {}
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (var li = 0; li < LAB.length; li++) {
    var ly = Y(LAB[li][0]);
    if (ly < 80 || ly > H - 96) continue;
    ctx.fillStyle = li === 3 ? 'rgba(111,245,168,0.9)' : 'rgba(195,207,214,0.7)';   // Approve is green here and in the Line's card under it
    ctx.fillText(LAB[li][1].toUpperCase(), cx - lx, ly);
    ctx.strokeStyle = 'rgba(140,200,235,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - lx, ly + fs); ctx.lineTo(cx - lx + 5.5 * a, ly + fs); ctx.stroke();
  }
  try { ctx.letterSpacing = '0px'; } catch (e2) {}

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  var kTop = Math.ceil(s + yF / a) + 1, kBot = Math.floor(s - (H - yF) / a) - 1;
  var st, k, g, pg, b, al;

  // template strands: backbone and half rungs
  for (st = 0; st < 2; st++) {
    pg = null;
    for (k = kTop; k >= kBot; k--) {
      g = geo(k, st); b = Math.floor(hsh(k, 1) * 4); al = dep(g.z);
      if (pg) {
        var am = (al + dep(pg.z)) * 0.5;
        ctx.beginPath(); ctx.moveTo(X(pg.bx), Y(pg.y)); ctx.lineTo(X(g.bx), Y(g.y));
        ctx.strokeStyle = rgba(PEARL, 0.10 * am); ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = rgba(PEARL, 0.78 * am); ctx.lineWidth = 1.6; ctx.stroke();
      }
      half(X(g.bx), Y(g.y), X(g.tx), Y(g.y), PAIR[b][st], 0.92 * al);
      pg = g;
    }
  }

  // new strands: free pieces dock, lock, get checked
  var flashes = [];
  for (st = 0; st < 2; st++) {
    var sg = st ? 1 : -1, prevL = 0, prevG = null;
    for (k = Math.floor(s) + 8; k >= kBot; k--) {
      g = geo(k, st); b = Math.floor(hsh(k, 1) * 4);
      var d = s - k, pr = isPR(k, st), dk = d - (pr ? 7 : 0);
      var fbx, fy0, tx, ty;
      if (d >= 0) { fbx = g.nx; tx = g.tx; fy0 = g.y; } else { fbx = sg * R * 0; tx = 0; fy0 = d; }
      ty = fy0;
      var h1 = hsh(k, 11 + st), h2 = hsh(k, 21 + st), h3 = hsh(k, 31 + st), h4 = hsh(k, 41 + st);
      var fx = sg * (DM + R + 1 + 3.6 * h1) + 0.4 * Math.cos(t * 0.6 + h3 * 9);
      var fy = d + (h2 - 0.5) * 5 + 0.5 * Math.sin(t * 0.8 + h3 * TAU);
      var mx = (fbx + tx) / 2, fAng = Math.atan2(0, tx - fbx);
      var ci = PAIR[b][1 - st];

      function piece(pp, cix, alpha, eject) {
        var e = pp <= 0 ? 0 : back(pp), px, py, ang, hl;
        if (eject > 0) {
          var q = eject * eject;
          px = mx + (fx * 1.12 - mx) * q; py = ty + (fy + 3 - ty) * q; ang = fAng + q * 5; hl = R / 2;
        } else {
          px = fx + (mx - fx) * e; py = fy + (ty - fy) * e;
          ang = fAng + (1 - e) * ((h4 - 0.5) * 7 + 0.35 * Math.sin(t * 0.5 + h4 * 20));
          hl = R / 2 + (Math.abs(tx - fbx) / 2 - R / 2) * cl(e);
        }
        var dx = Math.cos(ang) * hl, dy = Math.sin(ang) * hl;
        half(X(px - dx), Y(py - dy), X(px + dx), Y(py + dy), cix, alpha);
      }

      if (pr && d > -8 && d < 22) {
        var wrong = (ci + 2) % 4, pw = cl((d - 12) / 5);
        var ej = d > 18.5 ? cl((d - 18.5) / 3.5) : 0;
        var wa = (0.45 * sstep(-8, -3, d)) * (1 - pw) + 0.95 * pw;
        piece(pw, wrong, wa * (1 - ej), ej);
        if (d > 17 && d < 19.6) flashes.push([X(tx), Y(ty), 1 - (d - 17) / 2.6, 4]);
      }
      var p = cl((dk - 12) / 5), lk = 0;
      if (dk > -8) {
        var zal = d >= 0 ? dep(-g.z) : 1;
        var fa = (0.45 * sstep(-8, -3, dk)) * (1 - p) + 0.95 * zal * p;
        piece(p, ci, fa, 0);
        if (dk >= 17 && dk < 20) flashes.push([X(tx), Y(ty), 1 - (dk - 17) / 3, ci]);
        lk = sstep(17, 19.5, dk);
      }
      if (prevG && lk > 0 && prevL > 0) {
        var la = Math.min(lk, prevL) * (dep(-g.z) + dep(-prevG.z)) * 0.5;
        ctx.beginPath(); ctx.moveTo(X(prevG.nx), Y(prevG.y)); ctx.lineTo(X(g.nx), Y(g.y));
        ctx.strokeStyle = rgba(PEARL, 0.10 * la); ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = rgba(COL[4], 0.82 * la); ctx.lineWidth = 1.6; ctx.stroke();
      }
      prevL = lk; prevG = g;
    }
  }

  // the constructor: a splitter and two meshed gears that rack the tape apart
  var ga = sstep(0.2, 1.6, t);
  ctx.strokeStyle = rgba(PEARL, 0.45 * ga); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(X(0), Y(0.7)); ctx.lineTo(X(0), Y(DG - RG - 0.6)); ctx.stroke();
  ctx.beginPath(); ctx.arc(X(0), Y(0.7), 0.22 * a, 0, TAU); ctx.fillStyle = rgba(COL[4], 0.9 * ga); ctx.fill();

  function gear(gx, gy, th, off) {
    var rr = RG - 0.34, rt = RG + 0.38, i;
    ctx.beginPath(); ctx.arc(X(gx), Y(gy), rr * a, 0, TAU);
    ctx.fillStyle = 'rgba(2,7,10,' + (0.9 * ga).toFixed(3) + ')'; ctx.fill();
    ctx.strokeStyle = rgba(PEARL, 0.8 * ga); ctx.lineWidth = 1.3; ctx.stroke();
    for (i = 0; i < N; i++) {
      var q = cl((t - 0.5 - i * 0.3 - off) / 0.9);
      if (q <= 0) continue;
      var e = 1 - Math.pow(1 - q, 3), ro = (1 - e) * 6, an = th + i * P + (1 - e) * 1.6;
      var c0 = Math.cos(an), s0 = Math.sin(an);
      var pts = [[rr - 0.06, -0.30], [rt, -0.17], [rt, 0.17], [rr - 0.06, 0.30]];
      ctx.beginPath();
      for (var j = 0; j < 4; j++) {
        var rad = pts[j][0] + ro, w = pts[j][1] * P * pts[j][0];
        var px = gx + c0 * rad - s0 * w, py = gy + s0 * rad + c0 * w;
        if (j) ctx.lineTo(X(px), Y(py)); else ctx.moveTo(X(px), Y(py));
      }
      ctx.fillStyle = 'rgba(2,7,10,' + (0.95 * q).toFixed(3) + ')'; ctx.fill();
      ctx.strokeStyle = i === 0 ? rgba(COL[4], q) : rgba(PEARL, 0.85 * q); ctx.lineWidth = 1.3; ctx.stroke();
    }
    ctx.strokeStyle = rgba(PEARL, 0.32 * ga); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(X(gx), Y(gy), 0.95 * a, 0, TAU); ctx.stroke();
    for (i = 0; i < 3; i++) {
      var sa = th + i * TAU / 3;
      ctx.beginPath(); ctx.moveTo(X(gx + Math.cos(sa) * 0.25), Y(gy + Math.sin(sa) * 0.25));
      ctx.lineTo(X(gx + Math.cos(sa) * rr), Y(gy + Math.sin(sa) * rr)); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(X(gx), Y(gy), 0.2 * a, 0, TAU); ctx.fillStyle = rgba(COL[4], 0.95 * ga); ctx.fill();
  }
  gear(-RG, DG, Math.PI + (DG + 0.5) * P - s * P, 0);
  gear(RG, DG + 0.25, -(DG + 0.75) * P + s * P, 0.15);

  // lock flashes
  ctx.globalCompositeOperation = 'lighter';
  for (var f = 0; f < flashes.length; f++) {
    var F = flashes[f], fl = F[2];
    ctx.beginPath(); ctx.arc(F[0], F[1], (0.4 + 1.5 * (1 - fl)) * a, 0, TAU);
    ctx.strokeStyle = rgba(COL[F[3]], 0.75 * fl * fl); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(F[0], F[1], 0.5 * a, 0, TAU);
    ctx.fillStyle = rgba(COL[F[3]], 0.35 * fl * fl * fl); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function mount(canvas) {
  var ctx = canvas.getContext('2d');
  var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr, t = 0, s = 0, speed = 0, last = 0, visible = false;
  function size() {
    var r = canvas.getBoundingClientRect();
    var nw = Math.max(2, Math.round(r.width)), nh = Math.max(2, Math.round(r.height));
    if (nw === W && nh === H) return;
    W = nw; H = nh; dpr = Math.min(root.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (still) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx, W, H, 30, 40.4); }
  }
  if ('IntersectionObserver' in root) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; last = 0; }, { threshold: 0.02 }).observe(canvas);
  else visible = true;
  if ('ResizeObserver' in root) new ResizeObserver(size).observe(canvas); else root.addEventListener('resize', size);
  function frame(now) {
    root.requestAnimationFrame(frame);
    if (!visible || document.hidden || !W) return;
    var dt = last ? (now - last) / 1000 : 0.016; last = now; if (dt > 0.05) dt = 0.05;
    t += dt;
    speed += ((t > 4.6 ? 2.1 : 0) - speed) * Math.min(1, dt * 0.9);
    s += speed * dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render(ctx, W, H, t, s);
  }
  size();
  if (!still) root.requestAnimationFrame(frame);
}

export { mount };
