/* SyberLabs: the Menu's field. One cloud of points that is, in turn, the name SyberLabs and four strange attractors
   (Thomas, Halvorsen, Aizawa, Lorenz). Each attractor is computed here: a few thousand steps of its equations, by
   fourth-order Runge-Kutta, from seeds a hair apart, with the parameters the caption prints. Nothing is drawn from a
   stored picture.

   The points live on the graphics card. Every form is one buffer of positions, and a change of form is a blend from
   one buffer to another, a point at a time, so the cloud pours from one shape into the next. A band of light runs
   along the order the points were computed in, which is the direction of the flow. The pointer turns the attractor.

   mount(atlas, opts) adds a canvas to the Menu's panel and returns { open, close, show, word, next, layout }, or
   null where there is no WebGL (the Menu is then as it was). It draws only while the Menu is open. With reduced
   motion the form is drawn still and a change of form is immediate. src/site/nav.js drives it. */
const root = typeof window !== 'undefined' ? window : globalThis;
const TAU = Math.PI * 2;

// dt: the step. every: one point is kept for each `every` steps, so a slow system still covers its whole attractor.
// spread: how far apart the seeds start. axes: which of x, y, z is drawn across, up and toward the viewer.
// text: the caption's parameters, which are the ones `f` uses.
export const FORMS = [
  { name: 'Thomas attractor', text: 'b = 0.18', dt: 0.1, every: 4, spread: 6, start: [0.3, 0.2, -0.1], axes: [0, 1, 2],
    f: (x, y, z, o) => { const b = 0.18; o[0] = Math.sin(y) - b * x; o[1] = Math.sin(z) - b * y; o[2] = Math.sin(x) - b * z; } },
  { name: 'Halvorsen attractor', text: 'a = 1.4', dt: 0.005, every: 2, spread: 0.4, start: [-1.48, -1.51, 2.04], axes: [0, 1, 2],
    f: (x, y, z, o) => { const a = 1.4; o[0] = -a * x - 4 * y - 4 * z - y * y; o[1] = -a * y - 4 * z - 4 * x - z * z; o[2] = -a * z - 4 * x - 4 * y - x * x; } },
  { name: 'Aizawa attractor', text: 'a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1', dt: 0.012, start: [0.1, 0, 0], axes: [0, 2, 1],
    f: (x, y, z, o) => { const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, g = 0.1; o[0] = (z - b) * x - d * y; o[1] = d * x + (z - b) * y; o[2] = c + a * z - z * z * z / 3 - (x * x + y * y) * (1 + e * z) + g * z * x * x * x; } },
  { name: 'Lorenz attractor', text: 'σ = 10, ρ = 28, β = 8/3', dt: 0.006, start: [0.1, 0, 20], axes: [0, 2, 1],
    f: (x, y, z, o) => { o[0] = 10 * (y - x); o[1] = x * (28 - z) - y; o[2] = x * y - 8 / 3 * z; } },
];
const WORD = FORMS.length;   // the index of the name, after the attractors
const STRANDS = 14, BURN = 600, MORPH = 1.5, HOLD = 0.75;

// A small repeatable random number, so a form is the same each time it is built.
function prng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// One attractor as `count` points inside the unit ball: STRANDS paths, each from a seed a hair from the last.
export function trace(form, count) {
  const out = new Float32Array(count * 3), per = Math.ceil(count / STRANDS), rand = prng(7 + form.name.length);
  const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0], h = form.dt, every = form.every || 1, spread = form.spread || 0.02;
  let n = 0, cx = 0, cy = 0, cz = 0;
  for (let s = 0; s < STRANDS && n < count; s++) {
    let x = form.start[0] + (rand() - 0.5) * spread, y = form.start[1] + (rand() - 0.5) * spread, z = form.start[2] + (rand() - 0.5) * spread;
    for (let i = -BURN; i < per * every && n < count; i++) {
      form.f(x, y, z, k1);
      form.f(x + k1[0] * h / 2, y + k1[1] * h / 2, z + k1[2] * h / 2, k2);
      form.f(x + k2[0] * h / 2, y + k2[1] * h / 2, z + k2[2] * h / 2, k3);
      form.f(x + k3[0] * h, y + k3[1] * h, z + k3[2] * h, k4);
      x += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); z += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
      if (i < 0 || i % every) continue;   // the first steps only bring the path onto the attractor
      out[n * 3] = x; out[n * 3 + 1] = y; out[n * 3 + 2] = z; cx += x; cy += y; cz += z; n++;
    }
  }
  cx /= n; cy /= n; cz /= n;
  let far = 0;
  for (let i = 0; i < n; i++) { const dx = out[i * 3] - cx, dy = out[i * 3 + 1] - cy, dz = out[i * 3 + 2] - cz; far = Math.max(far, dx * dx + dy * dy + dz * dz); }
  const k = 1 / Math.sqrt(far || 1), [ax, ay, az] = form.axes, p = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    p[0] = (out[i * 3] - cx) * k; p[1] = (out[i * 3 + 1] - cy) * k; p[2] = (out[i * 3 + 2] - cz) * k;
    out[i * 3] = p[ax]; out[i * 3 + 1] = p[ay]; out[i * 3 + 2] = p[az];
  }
  return out;
}

// The name as `count` points: the letters are drawn once, off screen, and points are scattered over their ink.
function letters(count, text, font) {
  const out = new Float32Array(count * 3), W = 900, H = 220, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
  const wide = g.measureText(text).width;
  g.fillText(text, W / 2, H / 2 + 6);
  const data = g.getImageData(0, 0, W, H).data, ink = [];
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (data[(y * W + x) * 4 + 3] > 140) ink.push(x, y);
  if (!ink.length) return null;
  const rand = prng(11), half = Math.max(1, wide / 2);
  for (let i = 0; i < count; i++) {
    const j = (rand() * (ink.length / 2) | 0) * 2;
    out[i * 3] = (ink[j] + rand() - W / 2) / half * 1.08;
    out[i * 3 + 1] = -(ink[j + 1] + rand() - H / 2) / half * 1.08;
    out[i * 3 + 2] = (rand() - 0.5) * 0.04;
  }
  return out;
}

const VERT = `
attribute vec3 aFrom, aTo; attribute vec2 aSeed;
uniform float uT, uTime, uYaw, uPitch, uSpinFrom, uSpinTo, uRadius, uSize, uStill;
uniform vec2 uCentre, uPixel;
varying float vGlow, vWarm;
void main() {
  float k = clamp(uT * 1.55 - aSeed.y * 0.55, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
  vec3 p = mix(aFrom, aTo, k);
  float mid = 1.0 - abs(2.0 * k - 1.0);   // on the way between two forms a point swings wide
  p += mid * 0.42 * vec3(sin(aSeed.y * 41.0 + uTime), cos(aSeed.y * 29.0), sin(aSeed.y * 17.0 - uTime));
  float spin = mix(uSpinFrom, uSpinTo, k), yaw = uYaw * spin, pitch = uPitch * spin;
  float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
  p = vec3(p.x * cy + p.z * sy, p.y, p.z * cy - p.x * sy);
  p = vec3(p.x, p.y * cp - p.z * sp, p.z * cp + p.y * sp);
  float near = 1.0 / (1.0 - p.z * 0.32);
  gl_Position = vec4(uCentre + p.xy * near * uRadius * uPixel, 0.0, 1.0);
  gl_PointSize = uSize * near * (0.75 + 0.6 * aSeed.y);
  float head = fract(aSeed.x * 46.0 - uTime * 0.22);
  float flow = mix(0.55, pow(head, 5.0), 1.0 - uStill);
  vGlow = mix(0.62, 0.22 + 0.78 * flow, spin) + 0.5 * mid;
  vWarm = step(0.982, aSeed.y);
}`;
const FRAG = `
precision mediump float;
uniform float uAlpha;
varying float vGlow, vWarm;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r = dot(d, d);
  if (r > 0.25) discard;
  float a = smoothstep(0.25, 0.02, r);
  vec3 c = mix(vec3(0.008, 0.592, 0.871), vec3(0.298, 0.753, 0.961), clamp(vGlow, 0.0, 1.0));
  c = mix(c, vec3(0.945, 0.965, 0.976), clamp(vGlow * vGlow * vGlow, 0.0, 1.0) * 0.85);
  c = mix(c, vec3(0.988, 0.451, 0.302), vWarm);
  c *= a * uAlpha * (0.3 + vGlow);
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}`;

export function mount(atlas, { onForm } = {}) {
  const panel = atlas.querySelector('.sy-atlas__panel');
  if (!panel) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'sy-atlas__field'; canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) return null;
  const still = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const small = Math.min(root.innerWidth, root.innerHeight) < 700;
  const COUNT = small ? 42000 : 84000;

  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG), prog = gl.createProgram();
  if (!vs || !fs) return null;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const A = name => gl.getAttribLocation(prog, name), U = name => gl.getUniformLocation(prog, name);
  const aFrom = A('aFrom'), aTo = A('aTo'), aSeed = A('aSeed');
  const u = Object.fromEntries(['uT', 'uTime', 'uYaw', 'uPitch', 'uSpinFrom', 'uSpinTo', 'uRadius', 'uSize', 'uStill', 'uCentre', 'uPixel', 'uAlpha'].map(n => [n, U(n)]));

  // per point: where it stands in the order of computing (the flow runs along it), and a random number
  const seed = new Float32Array(COUNT * 2), rand = prng(3);
  for (let i = 0; i < COUNT; i++) { seed[i * 2] = i / COUNT; seed[i * 2 + 1] = rand(); }
  const seedBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf); gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aSeed); gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aFrom); gl.enableVertexAttribArray(aTo);

  // one buffer for each form, made the first time the form is asked for
  const buffers = [];
  function buffer(i) {
    if (buffers[i]) return buffers[i];
    const data = i === WORD ? letters(COUNT, 'SyberLabs', '600 168px "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif') : trace(FORMS[i], COUNT);
    if (!data) return null;
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return (buffers[i] = b);
  }
  const spinOf = i => (i === WORD ? 0 : 1);
  // Computing an attractor takes a few hundredths of a second. It is done while the name is held and then in the
  // browser's idle time, one form at a time, so a change of form never waits for it.
  const idle = root.requestIdleCallback ? f => root.requestIdleCallback(f, { timeout: 1500 }) : f => setTimeout(f, 250);
  function warm(i) { if (i < FORMS.length) idle(() => { buffer(i); warm(i + 1); }); }

  let from = 0, to = 0, T = 1, queued = null, shown = -1, attractor = 0;
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, radius = 100, band = false;
  let running = false, raf = 0, last = 0, time = 0, yaw = 0.6, pitch = 0.18, aimYaw = 0, aimPitch = 0, turn = 0, hold = 0, fade = 1;

  let bound = false, warmed = false;
  function bind() {
    bound = true;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer(from)); gl.vertexAttribPointer(aFrom, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer(to)); gl.vertexAttribPointer(aTo, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(u.uSpinFrom, spinOf(from)); gl.uniform1f(u.uSpinTo, spinOf(to));
  }
  function say(i) { if (i !== shown) { shown = i; if (onForm) onForm(i === WORD ? { name: 'SyberLabs', text: '' } : FORMS[i], COUNT); } }
  // Go to a form. A change asked for while another is under way waits for it, so no point ever jumps.
  function go(i) {
    if (!buffer(i)) return;
    if (T < 1) { queued = i === to ? null : i; return; }
    if (i === to) return;
    from = to; to = i; T = still ? 1 : 0; queued = null;
    if (still) from = to;
    bind(); say(i);
    if (still) draw();
  }

  // Where the form stands: beside the links on a wide screen, in a band above them on a narrow one.
  function layout() {
    const vw = root.innerWidth, vh = root.innerHeight, p = panel.getBoundingClientRect(), head = atlas.querySelector('.sy-atlas__head');
    band = vw < 1100;
    const top = head ? head.getBoundingClientRect().bottom + panel.scrollTop : 64;
    if (band) { const h = Math.round(Math.min(300, Math.max(200, vh * 0.3))); atlas.style.setProperty('--sy-stage', `${h}px`); cx = vw / 2; cy = top + h * 0.45; radius = Math.min(vw * 0.4, h * 0.38); }
    else { atlas.style.removeProperty('--sy-stage'); const zone = p.width * 0.42; cx = p.right - zone / 2 - 8; cy = Math.max(top + 40, vh * 0.5); radius = Math.min(zone * 0.47, (vh - top - 130) * 0.47); }
    // the caption (src/site/nav.js adds it) stands under the form: these say where that is
    atlas.style.setProperty('--sy-fx', `${Math.round(cx)}px`); atlas.style.setProperty('--sy-fy', `${Math.round(cy)}px`); atlas.style.setProperty('--sy-fr', `${Math.round(radius)}px`);
    dpr = Math.min(root.devicePixelRatio || 1, 2);
    if (vw !== W || vh !== H) { W = vw; H = vh; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); gl.viewport(0, 0, canvas.width, canvas.height); }
    gl.uniform2f(u.uPixel, 2 / W, 2 / H);
    gl.uniform2f(u.uCentre, cx / W * 2 - 1, 1 - cy / H * 2);
    gl.uniform1f(u.uRadius, radius);
    gl.uniform1f(u.uSize, Math.max(1.5, Math.min(2.6, radius / 95)) * dpr);
    gl.uniform1f(u.uAlpha, small ? 0.62 : 0.5);
    scrolled();
    if (still || !running) draw();
  }
  // On a narrow screen the links scroll over the band, so the form dims as they do.
  function scrolled() {
    fade = band ? Math.max(0.12, 1 - panel.scrollTop / Math.max(1, radius * 2.2)) : 1;
    canvas.style.opacity = fade.toFixed(3); atlas.style.setProperty('--sy-fade', (band ? Math.max(0, 1 - panel.scrollTop / 60) : 1).toFixed(3));
  }

  function draw() {
    if (!bound) return;
    gl.uniform1f(u.uT, T); gl.uniform1f(u.uTime, time); gl.uniform1f(u.uYaw, yaw); gl.uniform1f(u.uPitch, pitch); gl.uniform1f(u.uStill, still ? 1 : 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  }
  function frame(now) {
    if (!running) return;
    raf = root.requestAnimationFrame(frame);
    if (document.hidden) { last = 0; return; }
    const dt = Math.min(last ? (now - last) / 1000 : 0.016, 0.05); last = now;
    time += dt;
    if (hold > 0) { hold -= dt; if (hold <= 0) go(attractor); }
    if (T < 1) { T = Math.min(1, T + dt / MORPH); if (T >= 1 && queued !== null) go(queued); }
    turn += dt * 0.16;
    yaw += (turn + aimYaw - yaw) * Math.min(1, dt * 3.2); pitch += (0.2 + aimPitch - pitch) * Math.min(1, dt * 3.2);
    draw();
  }

  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  atlas.insertBefore(canvas, panel);
  panel.addEventListener('scroll', scrolled, { passive: true });
  root.addEventListener('resize', layout);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; root.cancelAnimationFrame(raf); canvas.hidden = true; });
  // the form is made with the site's own typeface: wait for it once, and then only for a moment
  const fontReady = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('600 168px "Instrument Sans"'), new Promise(r => setTimeout(r, 900))]).catch(() => {}) : Promise.resolve();

  return {
    count: COUNT,
    // The Menu has opened: the name first, then it lets go into an attractor, a different one each time.
    open() {
      fontReady.then(() => {
        if (canvas.hidden) return;
        layout();
        if (still) { from = to = attractor; T = 1; bind(); say(attractor); draw(); return; }
        const word = buffer(WORD);
        from = to = word ? WORD : attractor; T = 1; queued = null; bind(); say(to);
        hold = word ? HOLD : 0; time = 0; last = 0; yaw = turn = 0.6;
        if (!running) { running = true; raf = root.requestAnimationFrame(frame); }
        if (!warmed) { warmed = true; setTimeout(() => { buffer(attractor); warm(0); }, 80); }
      });
    },
    close() { running = false; hold = 0; root.cancelAnimationFrame(raf); attractor = (attractor + 1) % FORMS.length; },
    // Show one attractor (a group of links asks for its own), the name, or the next attractor in turn.
    // While the name is still held at opening, this only chooses what it lets go into.
    show(i) { attractor = ((i % FORMS.length) + FORMS.length) % FORMS.length; if (hold <= 0) go(attractor); },
    word() { hold = 0; go(WORD); },
    back() { go(attractor); },
    next() { this.show(attractor + 1); },
    // The pointer turns the attractor: x and y are its place on the screen, from -1 to 1.
    aim(x, y) { aimYaw = x * 0.9; aimPitch = y * 0.45; },
    layout,
  };
}
