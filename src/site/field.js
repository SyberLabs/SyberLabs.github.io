/* SyberLabs site v3 "Observatory": the Field.
   A WebGL2 scene fixed behind every page: a nebula shader (domain-warped noise in the brand spectrum)
   and a 3D Pickover strange attractor rendered as an additive point cloud. The cloud rotates slowly,
   leans toward the pointer, and morphs between forms as the page scrolls. Progressive enhancement only:
   every page reads fine without it. Software WebGL and reduced motion each get one still frame.

   Raw WebGL2, no dependencies (it was three.js; this draws the same picture without the 500 kB library).
   Budget, so the page stays light on laptops and phones:
     - the nebula is soft, so it renders into a half-resolution buffer at most 30 times a second and is
       upscaled (with the dither applied at full resolution, so the dark end never bands);
     - the cloud draws at most 60 frames a second while you scroll or move the pointer, 30 when idle,
       and drops to 30 for good (with a 1x buffer) if the GPU cannot keep up;
     - nothing draws in hidden tabs or while the Atlas menu covers the page;
     - the four cloud forms are generated one per idle slice, so mounting never blocks the main thread.

   mountField(canvas, { accent, density, offset }) -> { supported, destroy() }
     accent   '#rrggbb' tint mixed into the cloud (defaults to --sy-accent on <html>).
     density  'full' | 'calm' (fewer points, dimmer: for long reading pages).
     offset   [x, y] in viewport fractions, where the cloud's centre sits before scroll (default right of centre). */

const SOFT = /swiftshader|llvmpipe|softpipe|software|basic render/i;
// window.SY_ALLOW_SOFTWARE_GL is set only by screenshot tooling (same convention as the kit); real visitors on software GL get the CSS nebula.
const allowSoftware = () => window.SY_ALLOW_SOFTWARE_GL === true;

// The context itself is the probe (no throwaway canvas): a major-performance-caveat or software renderer counts as unsupported.
function context(canvas, attrs) {
  let gl = null;
  try { gl = canvas.getContext('webgl2', { ...attrs, failIfMajorPerformanceCaveat: !allowSoftware() }); } catch (e) { return null; }
  if (!gl) return null;
  if (!allowSoftware()) {
    const x = gl.getExtension('WEBGL_debug_renderer_info'), r = x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : '';
    if (SOFT.test(r)) { lose(gl); return null; }
  }
  return gl;
}
const lose = gl => gl.getExtension('WEBGL_lose_context')?.loseContext();
export function fastGL() {
  const c = document.createElement('canvas'), gl = context(c, {});
  if (gl) lose(gl);
  return !!gl;
}

// Pickover attractor: x' = sin(a y) − z cos(b x); y' = z sin(c x) − cos(d y); z' = e sin(x).
// Four forms; the cloud crossfades between them as the page scrolls.
// Chosen by the same structure test the sigils use (grid occupancy 0.13–0.45, density variation 1–1.9):
// each is a connected form, none collapses to a few clusters.
const FORMS = [
  [2.24, 0.43, -0.65, -2.43, 1.0],
  [-1.5, 2.4, -2.6, 0.9, 1.2],
  [-2.3, 2.2, 1.7, -1.8, 0.7],
  [2.6, -1.4, -1.9, 2.1, 1.0],
];
function cloud(P, n) {
  const out = new Float32Array(n * 3);
  let x = 0.1, y = 0.1, z = 0.1, sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < 200; i++) { const nx = Math.sin(P[0] * y) - z * Math.cos(P[1] * x), ny = z * Math.sin(P[2] * x) - Math.cos(P[3] * y); z = P[4] * Math.sin(x); x = nx; y = ny; }
  for (let i = 0; i < n; i++) {
    const nx = Math.sin(P[0] * y) - z * Math.cos(P[1] * x), ny = z * Math.sin(P[2] * x) - Math.cos(P[3] * y); z = P[4] * Math.sin(x); x = nx; y = ny;
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z; sx += x; sy += y; sz += z;
  }
  sx /= n; sy /= n; sz /= n; // centre
  let r = 0, v = 0;
  for (let i = 0; i < n; i++) { out[i * 3] -= sx; out[i * 3 + 1] -= sy; out[i * 3 + 2] -= sz; r = Math.max(r, Math.abs(out[i * 3]), Math.abs(out[i * 3 + 1]), Math.abs(out[i * 3 + 2])); v += out[i * 3] * out[i * 3] + out[i * 3 + 1] * out[i * 3 + 1]; }
  if (!(r > 1e-4) || !Number.isFinite(r) || Math.sqrt(v / n) / r < 0.08) return null; // collapsed to a point or a few cycles
  for (let i = 0; i < out.length; i++) out[i] /= r; // fit the unit cube
  return out;
}

/* ---------- shaders (GLSL ES 3.00) ---------- */
const PALETTE = `const vec3 K[7]=vec3[](vec3(.0,.28,.94),vec3(.28,.56,.94),vec3(.56,.85,.94),vec3(1.,.71,.29),vec3(1.,.35,.84),vec3(.6,.42,1.),vec3(.0,.28,.94));
vec3 spectrum(float h){h=fract(h)*6.;int i=int(h);return mix(K[i],K[i+1],fract(h));}`;

const POINT_VS = `in vec3 p0,p1,p2,p3;in float seed;
uniform mat4 uMV,uP;uniform float uMorph,uTime,uSize,uDpr,uTint;uniform vec3 uAccent;out vec3 vC;out float vA;
${PALETTE}
void main(){
  float m=clamp(uMorph,0.,3.);int k=int(floor(min(m,2.999)));float f=fract(m);
  vec3 a=k==0?p0:(k==1?p1:p2);vec3 b=k==0?p1:(k==1?p2:p3);
  vec3 p=mix(a,b,smoothstep(0.,1.,f));
  p+=0.012*vec3(sin(uTime*.7+seed*31.),cos(uTime*.6+seed*17.),sin(uTime*.5+seed*7.));
  vec4 mv=uMV*vec4(p,1.);
  float d=-mv.z;
  float h=length(p)*.42+seed*.08+uTime*.012;
  vC=mix(spectrum(h),uAccent,uTint);
  vA=1.-smoothstep(2.6,7.,d);
  gl_PointSize=uSize*uDpr*(1.5+1.7*(1.-smoothstep(2.,6.,d)));
  gl_Position=uP*mv;
}`;
const POINT_FS = `in vec3 vC;in float vA;uniform float uGain;out vec4 o;
void main(){vec2 q=gl_PointCoord-.5;float r=dot(q,q);if(r>.25)discard;float s=exp(-r*14.);o=vec4(vC*s*uGain*(.35+.65*vA),1.);}`;

// A single fullscreen triangle for both screen passes.
const QUAD_VS = `in vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
// hash() is the .x of the earlier vec3 hash (the only lane noise() read), at a third of the cost.
const NEBULA_FS = `uniform vec2 uRes;uniform float uTime,uScroll,uGain;uniform vec2 uPointer;uniform vec3 uAccent;out vec4 o;
${PALETTE}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 R=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*noise(p);p=R*p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float t=uTime*.03;
  vec2 q=vec2(fbm(uv*1.4+t),fbm(uv*1.4-t*.7+2.));
  vec2 r=vec2(fbm(uv*1.4+q*1.9+vec2(1.7,9.2)+t*.4),fbm(uv*1.4+q*1.9+vec2(8.3,2.8)-t*.3));
  float f=fbm(uv*1.4+r*1.6);
  float h=.6+f*.42+uScroll*.18+uPointer.x*.03+t*.25; // violet > magenta > deep blue: cool, never muddy
  vec3 col=spectrum(h)*(f*f*1.25);
  col=mix(col,uAccent*f*.9,.14);
  float vign=1.-smoothstep(.35,1.15,length(uv*vec2(.9,1.2)-vec2(.25-uScroll*.1,.1)));
  o=vec4(col*vign*uGain,1.);
}`;
// Upscale the half-resolution nebula, then dither at full resolution so the dark end never bands.
const BLIT_FS = `uniform sampler2D uTex;uniform vec2 uView;out vec4 o;
void main(){vec3 c=texture(uTex,gl_FragCoord.xy/uView).rgb;c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;o=vec4(c,1.);}`;

function program(gl, vs, fs, attribs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, '#version 300 es\nprecision highp float;\nprecision highp int;\n' + src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  for (let i = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i--;) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
  return { p, u };
}

function buffer(gl, data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
function attrib(gl, loc, buf, size) { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); }

// The point cloud: p0..p3 at locations 0..3, seed at 4. Forms not yet built read p0's buffer.
const POINT_ATTRIBS = ['p0', 'p1', 'p2', 'p3', 'seed'];
function pointCloud(gl, first, n) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const b0 = buffer(gl, first);
  for (let i = 0; i < 4; i++) attrib(gl, i, b0, 3);
  const seeds = new Float32Array(n); for (let i = 0; i < n; i++) seeds[i] = Math.random();
  const bs = buffer(gl, seeds); attrib(gl, 4, bs, 1);
  gl.bindVertexArray(null);
  const bufs = [b0, bs];
  return {
    vao, n,
    set(i, data) { const b = buffer(gl, data); bufs.push(b); gl.bindVertexArray(vao); attrib(gl, i, b, 3); gl.bindVertexArray(null); },
    dispose() { bufs.forEach(b => gl.deleteBuffer(b)); gl.deleteVertexArray(vao); },
  };
}

// three.js conventions, so the picture is the one the site was designed with:
// '#rrggbb' accents are sRGB and the shaders mix in linear values; the model matrix is T · Rx·Ry·Rz · S.
const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function accentRGB(value, fallback = '#90d8f0') {
  const s = String(value || '').trim();
  let m = s.match(/^#([0-9a-f]{3})$/i), rgb = null;
  if (m) rgb = [...m[1]].map(h => parseInt(h + h, 16));
  else if ((m = s.match(/^#([0-9a-f]{6})/i))) rgb = m[1].match(/\w\w/g).map(h => parseInt(h, 16));
  else if ((m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i))) rgb = [+m[1], +m[2], +m[3]];
  return rgb ? rgb.map(c => lin(c / 255)) : accentRGB(fallback);
}
function modelView(out, px, py, pz, rx, ry, rz, s) {
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  out[0] = c * e * s; out[1] = (af + be * d) * s; out[2] = (bf - ae * d) * s; out[3] = 0;
  out[4] = -c * f * s; out[5] = (ae - bf * d) * s; out[6] = (be + af * d) * s; out[7] = 0;
  out[8] = d * s; out[9] = -b * c * s; out[10] = a * c * s; out[11] = 0;
  out[12] = px; out[13] = py; out[14] = pz; out[15] = 1;
  return out;
}
function perspective(out, fov, aspect, near, far) {
  const y = 1 / Math.tan(fov * Math.PI / 360);
  out.fill(0); out[0] = y / aspect; out[5] = y; out[10] = -(far + near) / (far - near); out[11] = -1; out[14] = -2 * far * near / (far - near);
  return out;
}

// Frame pacing: draw when at least `gap` ms have passed, carrying the remainder so 120/144 Hz screens average the target rate.
function pacer() {
  let then = 0;
  return (now, gap) => {
    if (!then) { then = now; return true; }
    const el = now - then;
    if (el < gap - 1.5) return false;
    then = now - (el % gap < gap - 1.5 ? el % gap : 0);
    return true;
  };
}
const idle = (fn, timeout = 600) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 16));
const cancelIdle = id => ('cancelIdleCallback' in window ? cancelIdleCallback(id) : clearTimeout(id));

export function mountField(canvas, opts = {}) {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const off = () => { if (canvas) canvas.style.display = 'none'; return { supported: false, destroy() {} }; };
  if (!canvas) return off();
  // low-power: on dual-GPU laptops the field never wakes the discrete GPU
  const gl = context(canvas, { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl) return off();
  try { return runField(canvas, gl, opts, reduced); } catch (e) { lose(gl); return off(); }
}

function runField(canvas, gl, opts, reduced) {
  const accent = accentRGB(opts.accent || getComputedStyle(document.documentElement).getPropertyValue('--sy-accent'));
  const calm = opts.density === 'calm';
  const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  const N = calm ? (small ? 28000 : 52000) : (small ? 48000 : 110000);
  let dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5);

  const neb = program(gl, QUAD_VS, NEBULA_FS, ['a']), blit = program(gl, QUAD_VS, BLIT_FS, ['a']), pts = program(gl, POINT_VS, POINT_FS, POINT_ATTRIBS);
  const quad = gl.createVertexArray(); gl.bindVertexArray(quad);
  const qb = buffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3])); attrib(gl, 0, qb, 2);
  gl.bindVertexArray(null);

  // the nebula's half-resolution buffer (half float where the GPU can render to it, so the upscale keeps its precision)
  const half = !!gl.getExtension('EXT_color_buffer_float');
  const tex = gl.createTexture(), fb = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const NEB_SCALE = 0.5, NEB_GAP = 1000 / 30;

  // the first form now; the other three one per idle slice (the cloud only reaches them as the page scrolls)
  const cloudP = pointCloud(gl, cloud(FORMS[0], N), N);
  let pending = 0, built = 1;
  const buildNext = () => { pending = 0; if (dead || built >= FORMS.length) return; cloudP.set(built, cloud(FORMS[built], N) || cloud(FORMS[0], N)); built++; if (reduced) go(); if (built < FORMS.length) pending = idle(buildNext); };
  pending = idle(buildNext);

  const MV = new Float32Array(16), PR = new Float32Array(16);
  const offset = opts.offset || [0.36, -0.02];
  let W = 0, H = 0, BW = 0, BH = 0, RW = 0, RH = 0, aspect = 1, raf = 0, t0 = performance.now(), last = 0, dead = false, paused = false;
  let scroll = 0, sScroll = 0, lastInput = -1e9, lastNeb = -1e9, lite = false, slow = 0, frames = 0;
  const ptr = [0, 0], sPtr = [0, 0], due = pacer();
  const docH = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);

  function size() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const bw = Math.floor(w * dpr), bh = Math.floor(h * dpr);
    if (w === W && h === H && bw === BW && bh === BH) return false;
    W = w; H = h; BW = canvas.width = bw; BH = canvas.height = bh; aspect = w / h;
    perspective(PR, 50, aspect, 0.1, 40);
    RW = Math.max(1, Math.round(w * NEB_SCALE)); RH = Math.max(1, Math.round(h * NEB_SCALE));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGBA16F : gl.RGBA8, RW, RH, 0, gl.RGBA, half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  function frame(now) {
    raf = 0; if (dead || paused) return;
    // pace: 60 fps while the visitor scrolls or moves the pointer (or the cloud is still easing), 30 when idle or lite
    const settling = Math.abs(scroll - sScroll) > 2e-4 || Math.abs(ptr[0] - sPtr[0]) + Math.abs(ptr[1] - sPtr[1]) > 2e-3;
    const busy = !lite && (settling || now - lastInput < 600);
    if (!reduced && last && !due(now, busy ? 1000 / 60 : 1000 / 30)) { go(); return; }
    // adaptive: if frames keep arriving far later than asked for, the GPU is saturated: settle at 30 fps and a 1x buffer
    if (!reduced && !lite && last) {
      const el = now - last, want = busy ? 1000 / 60 : 1000 / 30;
      if (++frames > 90) { slow = el > want * 1.7 ? slow + 1 : Math.max(0, slow - 1); if (slow > 60) { lite = true; dpr = 1; } }
    }
    const resized = size();
    const t = (now - t0) / 1000, dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    const k = 1 - Math.pow(0.001, dt);
    sScroll += (scroll - sScroll) * k; sPtr[0] += (ptr[0] - sPtr[0]) * k * 0.8; sPtr[1] += (ptr[1] - sPtr[1]) * k * 0.8;

    // nebula: half resolution, at most 30 times a second
    if (resized || reduced || now - lastNeb >= NEB_GAP - 1.5) {
      lastNeb = now;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, RW, RH); gl.disable(gl.BLEND);
      gl.useProgram(neb.p); gl.bindVertexArray(quad);
      gl.uniform2f(neb.u.uRes, RW, RH); gl.uniform1f(neb.u.uTime, t); gl.uniform1f(neb.u.uScroll, sScroll); gl.uniform1f(neb.u.uGain, calm ? 0.32 : 0.5);
      gl.uniform2f(neb.u.uPointer, sPtr[0], sPtr[1]); gl.uniform3f(neb.u.uAccent, accent[0], accent[1], accent[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, BW, BH); gl.disable(gl.BLEND);
    gl.useProgram(blit.p); gl.bindVertexArray(quad);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(blit.u.uTex, 0); gl.uniform2f(blit.u.uView, BW, BH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // cloud
    const wide = W / H > 1;
    // wide: right of the copy column; tall (phones): high and small, behind the hero, then it drifts away as you scroll
    const ox = wide ? offset[0] : 0.12, oy = wide ? offset[1] : 0.55;
    const s = (wide ? 0.9 : 0.62) + Math.sin(t * 0.17) * 0.04 + sScroll * 0.2;
    modelView(MV, ox * 2 * aspect + sPtr[0] * 0.12, oy * 2 - sScroll * 1.1 + sPtr[1] * 0.08, -4.4,
      0.35 + sScroll * 1.9 + sPtr[1] * 0.25, t * 0.11 + sScroll * 2.6 + sPtr[0] * 0.35, 0.12, s);
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
    gl.useProgram(pts.p); gl.bindVertexArray(cloudP.vao);
    gl.uniformMatrix4fv(pts.u.uMV, false, MV); gl.uniformMatrix4fv(pts.u.uP, false, PR);
    gl.uniform1f(pts.u.uMorph, sScroll * 3); gl.uniform1f(pts.u.uTime, t); gl.uniform1f(pts.u.uSize, calm ? 1.0 : 1.2); gl.uniform1f(pts.u.uDpr, dpr);
    gl.uniform1f(pts.u.uTint, 0.22); gl.uniform1f(pts.u.uGain, calm ? 0.3 : 0.48); gl.uniform3f(pts.u.uAccent, accent[0], accent[1], accent[2]);
    gl.drawArrays(gl.POINTS, 0, cloudP.n);
    gl.bindVertexArray(null);
    if (!reduced) go();
  }
  const go = () => { if (!dead && !paused && !raf && !document.hidden) raf = requestAnimationFrame(frame); };
  const onScroll = () => { scroll = Math.min(1, Math.max(0, scrollY / docH())); lastInput = performance.now(); go(); };
  const onPointer = e => { ptr[0] = e.clientX / innerWidth * 2 - 1; ptr[1] = -(e.clientY / innerHeight * 2 - 1); lastInput = performance.now(); };
  const onVis = () => { last = 0; go(); };
  const onResize = () => { last = 0; go(); };
  // the Atlas covers the page with a blurred backdrop: hold the last frame instead of re-blurring a moving one
  const mo = new MutationObserver(() => { const p = document.documentElement.classList.contains('sy-atlas-open'); if (p !== paused) { paused = p; last = 0; go(); } });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const onLost = e => { e.preventDefault(); dead = true; };
  addEventListener('scroll', onScroll, { passive: true });
  if (matchMedia('(pointer:fine)').matches) addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', onLost, false);
  onScroll(); go();
  return {
    supported: true,
    destroy() {
      dead = true; if (raf) cancelAnimationFrame(raf); if (pending) cancelIdle(pending);
      mo.disconnect();
      removeEventListener('scroll', onScroll); removeEventListener('pointermove', onPointer); removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis); canvas.removeEventListener('webglcontextlost', onLost);
      cloudP.dispose(); gl.deleteBuffer(qb); gl.deleteVertexArray(quad); gl.deleteTexture(tex); gl.deleteFramebuffer(fb);
      [neb, blit, pts].forEach(x => gl.deleteProgram(x.p));
      lose(gl);
    },
  };
}

/* A single sigil in 3D: the de Jong parameters of a product become a Pickover-style cloud spun in a plate.
   sigil3d(canvas, P, { color }) -> { destroy() }. Static (one spin ease-in) under reduced motion. */
export function sigil3d(canvas, P, opts = {}) {
  if (!canvas) return { supported: false, destroy() {} };
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const gl = context(canvas, { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', premultipliedAlpha: true });
  if (!gl) return { supported: false, destroy() {} };
  try { return runSigil(canvas, gl, P, opts, reduced); } catch (e) { lose(gl); return { supported: false, destroy() {} }; }
}

function runSigil(canvas, gl, P, opts, reduced) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  // exposure follows the plate size: a 112px phone plate gets far fewer pixels per point than a 380px one
  const K = () => Math.min(1, Math.max(0.3, (canvas.clientWidth || 300) / 380));
  const cw = canvas.clientWidth || 300, small = cw < 200;
  const N = small ? 14000 : 36000;
  // try the product's own parameters in a few scalings; fall back to a brand form so no sigil is ever empty
  const tries = [[1.3, 1.1, 1.4, 1.2], [1, 1, 1, 1], [0.8, 1.5, 1.1, 0.9], [1.6, 0.7, 1.3, 1.5]];
  let pos = null;
  for (const s of tries) { pos = cloud([P[0] * s[0], P[1] * s[1], P[2] * s[2], P[3] * s[3], 1 + Math.abs(P[0]) * 0.3], N); if (pos) break; }
  if (!pos) pos = cloud(FORMS[(Math.abs(Math.round(P[0] * 100)) % FORMS.length)], N);
  // exposure also follows how spread out the form is: a compact, dense cloud piles many points per pixel
  const occ = new Uint8Array(64 * 64); let cells = 0;
  for (let i = 0; i < N; i++) { const j = (((pos[i * 3] + 1) * 31.99) | 0) + (((pos[i * 3 + 1] + 1) * 31.99) | 0) * 64; if (!occ[j]) { occ[j] = 1; cells++; } }
  const SPREAD = Math.min(1, Math.max(0.3, cells / 4096 / 0.4));
  const GAIN = () => 0.55 * K() * SPREAD;
  const accent = accentRGB(opts.color || getComputedStyle(canvas).getPropertyValue('--sy-accent'));
  const pts = program(gl, POINT_VS, POINT_FS, POINT_ATTRIBS), cloudP = pointCloud(gl, pos, N);
  const MV = new Float32Array(16), PR = new Float32Array(16);
  let raf = 0, dead = false, W = 0, BW = 0, BH = 0, t0 = performance.now(), hover = 0, tHover = 0, onScreen = true;
  const ptr = [0, 0], sPtr = [0, 0], due = pacer();
  const size = () => {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || w;
    if (w !== W) { W = w; BW = canvas.width = Math.floor(w * dpr); BH = canvas.height = Math.floor(h * dpr); perspective(PR, 38, w / h, 0.1, 20); }
  };
  function frame(now) {
    raf = 0; if (dead) return;
    if (!reduced && !due(now, 1000 / 60)) { go(); return; }
    size();
    const t = (now - t0) / 1000; hover += (tHover - hover) * 0.08; sPtr[0] += (ptr[0] - sPtr[0]) * 0.08; sPtr[1] += (ptr[1] - sPtr[1]) * 0.08;
    modelView(MV, 0, 0, -3.1, 0.45 + sPtr[1] * 0.5, t * 0.22 + sPtr[0] * 0.7, 0, 1 + hover * 0.08);
    gl.viewport(0, 0, BW, BH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
    gl.useProgram(pts.p); gl.bindVertexArray(cloudP.vao);
    gl.uniformMatrix4fv(pts.u.uMV, false, MV); gl.uniformMatrix4fv(pts.u.uP, false, PR);
    gl.uniform1f(pts.u.uMorph, 0); gl.uniform1f(pts.u.uTime, t); gl.uniform1f(pts.u.uSize, 1.25 * K()); gl.uniform1f(pts.u.uDpr, dpr);
    // strongly tinted: a sigil is one colour
    gl.uniform1f(pts.u.uTint, 0.72); gl.uniform1f(pts.u.uGain, GAIN() * (1 + hover * 0.35)); gl.uniform3f(pts.u.uAccent, accent[0], accent[1], accent[2]);
    gl.drawArrays(gl.POINTS, 0, cloudP.n);
    if (!reduced && onScreen && !document.hidden) go();
  }
  const go = () => { if (!dead && !raf) raf = requestAnimationFrame(frame); };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) go(); }); io.observe(canvas);
  const host = canvas.closest('[data-sigil3d-host]') || canvas.parentElement;
  const onMove = e => { const r = host.getBoundingClientRect(); ptr[0] = ((e.clientX - r.left) / r.width) * 2 - 1; ptr[1] = -(((e.clientY - r.top) / r.height) * 2 - 1); tHover = 1; go(); };
  const onLeave = () => { ptr[0] = ptr[1] = 0; tHover = 0; go(); };
  const onLost = e => { e.preventDefault(); dead = true; };
  host.addEventListener('pointermove', onMove, { passive: true }); host.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', go);
  canvas.addEventListener('webglcontextlost', onLost, false);
  go();
  return { supported: true, destroy() { dead = true; if (raf) cancelAnimationFrame(raf); io.disconnect(); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', go); canvas.removeEventListener('webglcontextlost', onLost); cloudP.dispose(); gl.deleteProgram(pts.p); lose(gl); } };
}

export { FORMS, cloud };
