/* SyberLabs: Phase Lock, mounted in a section. A lattice of coupled oscillators; the wordmark exists only as coherence. */
const root = typeof window !== 'undefined' ? window : globalThis;
var TAU = 6.283185307;
var VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
var FS = [
  'precision highp float;',
  'uniform vec2 uRes; uniform vec2 uGrid; uniform vec2 uOff; uniform float uCell;',
  'uniform vec2 uPsi; uniform sampler2D uTex;',
  'void main(){',
  '  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
  '  vec2 g = (p - uOff) / uCell;',
  '  vec2 id = floor(g); vec2 f = fract(g) - 0.5;',
  '  vec4 t = texture2D(uTex, (id + 0.5) / uGrid);',
  '  vec2 dir = normalize(t.rg * 2.0 - 1.0 + vec2(1e-4, 0.0));',
  '  float coh = t.b; float c2 = coh * coh;',
  '  float hl = mix(0.05, 0.41, c2);',
  '  float th = mix(0.085, 0.07, c2);',
  '  float a = dot(f, dir); float b = dot(f, vec2(-dir.y, dir.x));',
  '  float d = length(vec2(max(abs(a) - hl, 0.0), b)) - th;',
  '  float aa = 1.0 / uCell;',
  '  float m = smoothstep(aa, -aa, d);',
  '  float glow = exp(-max(d, 0.0) * 8.0) * 0.14 * c2;',
  '  float cr = dir.x * uPsi.x + dir.y * uPsi.y;',
  '  float sr = dir.y * uPsi.x - dir.x * uPsi.y;',
  '  vec4 w = vec4(cr, sr, -cr, -sr) * 0.5 + 0.5; w = w * w * w;',
  '  vec3 col = (w.x * vec3(0.56, 0.83, 0.98) + w.y * vec3(0.99, 0.48, 0.32)',
  '            + w.z * vec3(0.03, 0.33, 0.56) + w.w * vec3(0.05, 0.60, 0.90))',
  '            / (w.x + w.y + w.z + w.w);',
  '  vec2 q = p / uRes - 0.5;',
  '  float vig = 1.0 - dot(q, q) * 0.9;',
  '  vec3 bg = vec3(0.008, 0.027, 0.039) + vec3(0.0, 0.022, 0.040) * vig * vig;',
  '  float edge = smoothstep(0.0, 0.16, p.y / uRes.y) * smoothstep(0.0, 0.16, 1.0 - p.y / uRes.y);',
  '  vec3 o = bg + col * (m * (0.30 + 0.70 * coh) + glow) * (0.72 + 0.28 * vig) * (0.25 + 0.75 * edge);',
  '  gl_FragColor = vec4(o, 1.0);',
  '}'
].join('\n');

function sstep(a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

function mount(canvas, opts) {
  opts = opts || {};
  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uRes', 'uGrid', 'uOff', 'uCell', 'uPsi', 'uTex'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uTex, 0);

  var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr, cell, cols, rows, N, offX, offY;
  var th, det, cs, sn, mask, dist, heat, pix;
  var w0 = 0.42, psi = 0, T = 0.8, LOOP = 25, rSmooth = 0, lastLabel = '';

  function build() {
    var r = canvas.getBoundingClientRect();
    var nw = Math.max(2, Math.round(r.width)), nh = Math.max(2, Math.round(r.height));
    if (nw === W && nh === H) return;
    W = nw; H = nh;
    dpr = Math.min(root.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    cell = Math.max(5, Math.min(9, Math.min(W, H) / 78));
    cell = Math.max(cell, Math.sqrt(W * H / 24000));
    cols = Math.ceil(W / cell); rows = Math.ceil(H / cell); N = cols * rows;
    offX = (W - cols * cell) / 2; offY = (H - rows * cell) / 2;
    th = new Float64Array(N); det = new Float32Array(N); cs = new Float32Array(N); sn = new Float32Array(N);
    mask = new Uint8Array(N); dist = new Float32Array(N); heat = new Float32Array(N); pix = new Uint8Array(N * 4);
    var i, x, y;
    var cx = (cols - 1) / 2, cy = (rows - 1) / 2, md = Math.sqrt(cx * cx + cy * cy);
    for (y = 0; y < rows; y++) for (x = 0; x < cols; x++)
      dist[y * cols + x] = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / md;
    var mc = document.createElement('canvas'); mc.width = cols; mc.height = rows;
    var m = mc.getContext('2d');
    var lines = cols < rows * 1.15 ? ['SYBER', 'LABS'] : ['SYBERLABS'];
    var fam = 'px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    m.font = '800 100' + fam;
    var mw = 0; lines.forEach(function (l) { mw = Math.max(mw, m.measureText(l).width); });
    var px = 100 * (cols * 0.84) / mw; px = Math.min(px, rows * 0.56 / (lines.length * 0.95));
    m.font = '800 ' + px + fam; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = '#fff';
    var gap = px * 0.9, y0 = rows * 0.47 - gap * (lines.length - 1) / 2;
    lines.forEach(function (l, k) { m.fillText(l, cols / 2, y0 + k * gap); });
    var id = m.getImageData(0, 0, cols, rows).data;
    for (i = 0; i < N; i++) {
      mask[i] = id[i * 4 + 3] > 110 ? 1 : 0; det[i] = gauss() * 2.2; pix[i * 4 + 3] = 255;
      th[i] = still ? (mask[i] ? Math.PI / 2 : 0) : Math.random() * TAU;
    }
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uGrid, cols, rows);
    gl.uniform2f(U.uOff, offX * dpr, offY * dpr);
    gl.uniform1f(U.uCell, cell * dpr);
    if (opts.onCount) opts.onCount(N);
    if (still) { step(0); draw(); }
  }

  function step(dt) {
    T += dt; if (T >= LOOP) T -= LOOP;
    psi += w0 * dt; if (psi > TAU) psi -= TAU;
    var K = 2.6 * sstep(1.2, 6, T) - 1.3 * sstep(10, 13, T);
    var sc = 1 - 0.88 * sstep(1.2, 7, T);
    var P = 5 * sstep(5.5, 10, T);
    var rel = T - 19.5;
    if (still) { K = 1.3; sc = 0.12; P = 5; rel = -1; }
    var cP = Math.cos(psi), sP = Math.sin(psi), i, x, y, decay = Math.exp(-dt * 1.4);
    for (i = 0; i < N; i++) { cs[i] = Math.cos(th[i]); sn[i] = Math.sin(th[i]); }
    var sumC = 0, sumS = 0;
    for (y = 0; y < rows; y++) {
      var up = y > 0 ? -cols : 0, dn = y < rows - 1 ? cols : 0;
      for (x = 0; x < cols; x++) {
        i = y * cols + x;
        var l = x > 0 ? i - 1 : i, r = x < cols - 1 ? i + 1 : i, u = i + up, d = i + dn;
        var c = cs[i], s = sn[i];
        var sc4 = cs[l] + cs[r] + cs[u] + cs[d], ss4 = sn[l] + sn[r] + sn[u] + sn[d];
        var coup = ss4 * c - sc4 * s, a = sc4 + c, b = ss4 + s;
        var coh = Math.sqrt(a * a + b * b) * 0.2;
        var h = heat[i]; if (h > 0.001) heat[i] = h * decay;
        var e = rel > 0 ? sstep(0, 1.2, rel - dist[i] * 3) : 0;
        if (h > e) e = h;
        var pin = mask[i] ? (cP * c + sP * s) : (sP * c - cP * s);
        th[i] += dt * (w0 + det[i] * (sc + (1.7 - sc) * e) + (1 - e) * (K * coup + P * pin));
        var j = i * 4;
        pix[j] = (c * 0.5 + 0.5) * 255; pix[j + 1] = (s * 0.5 + 0.5) * 255; pix[j + 2] = coh * 255;
        sumC += c; sumS += s;
      }
    }
    if (psi < w0 * dt * 1.5) for (i = 0; i < N; i++) th[i] %= TAU;
    var rr = Math.sqrt(sumC * sumC + sumS * sumS) / N;
    rSmooth += (rr - rSmooth) * (dt ? Math.min(1, dt * 6) : 1);
  }
  function draw() {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, pix);
    gl.uniform2f(U.uPsi, Math.cos(psi), Math.sin(psi));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function disturb(ev) {
    if (still || !N) return;
    var b = canvas.getBoundingClientRect();
    var gx = (ev.clientX - b.left - offX) / cell, gy = (ev.clientY - b.top - offY) / cell;
    var R = Math.max(7, Math.round(Math.min(cols, rows) * 0.13));
    var x0 = Math.max(0, Math.floor(gx - R)), x1 = Math.min(cols - 1, Math.ceil(gx + R));
    var y0 = Math.max(0, Math.floor(gy - R)), y1 = Math.min(rows - 1, Math.ceil(gy + R));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var dd = Math.sqrt((x - gx) * (x - gx) + (y - gy) * (y - gy)) / R;
      if (dd < 1) { var i = y * cols + x, v = 1 - dd * dd; if (v > heat[i]) heat[i] = v; }
    }
  }
  canvas.addEventListener('pointerdown', disturb);
  canvas.addEventListener('pointermove', disturb);

  var visible = false, last = 0, tick = 0;
  if ('IntersectionObserver' in root) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; last = 0; }, { threshold: 0.02 }).observe(canvas);
  else visible = true;
  if ('ResizeObserver' in root) new ResizeObserver(build).observe(canvas); else root.addEventListener('resize', build);
  function frame(now) {
    root.requestAnimationFrame(frame);
    if (!visible || document.hidden || !N) return;
    var dt = last ? (now - last) / 1000 : 0.016; last = now; if (dt > 0.034) dt = 0.034;
    step(dt); draw();
    if ((tick++ & 3) === 0) {
      var label = T < 1.2 ? 'incoherent' : T < 5.5 ? 'coupling' : T < 10 ? 'locking' : T < 19.5 ? 'phase lock' : 'release';
      if (label !== lastLabel && opts.onState) { opts.onState(label); lastLabel = label; }
      if (opts.onCoherence) opts.onCoherence(rSmooth);
    }
  }
  build();
  if (still) { if (opts.onState) opts.onState('phase lock'); if (opts.onCoherence) opts.onCoherence(rSmooth); }
  else root.requestAnimationFrame(frame);
  return { rebuild: function () { W = 0; build(); } };
}

export { mount };
