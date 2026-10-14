/* The Orb: the homepage hero. One sphere of light, drawn by raw WebGL2 into a single long-exposure buffer (the same
   decay / tone-map / bloom pipeline as kit/v2/syber-atmosphere.js), holding three populations:
     - a spectral Clifford attractor (120k points, hue by speed along the orbit, cycling in time);
     - a fractal flame (100k points): a four-map IFS with sinusoidal, spherical and swirl variations, coloured by
       the maps it passed through;
     - the dots (8k): a swarm simulated on the GPU with transform feedback. Each dot has a target point sampled from
       text rasterised in the site's serif; a damped spring draws it there, a curl field carries it when released.
       The swarm assembles into a word, holds, scatters, assembles into the next, and so on.
   The tone pass shades the buffer as a globe: a lens warp, limb darkening, a rim light and a specular, clipped to
   the disc with the bloom allowed to leak a little past the edge.

   One input: setText(str). The dots re-assemble into the text as it is typed; the text's hash chooses the
   attractor's form and the flame's maps (the parameters glide to the new values, so every keystroke bends the
   light), and each keystroke pulses the exposure. Empty text returns to the lab's own words after a pause.

   mountOrb(canvas, { avoid, narrow, words, allowSoftware }) -> { supported, setText(s), pulse(k), pause(), resume(), destroy() }
     avoid    Element whose right edge the orb stays clear of on wide screens (the copy column).
     narrow   { scale, max, top, media }: on narrow screens the orb is min(width * scale, max) px, its top `top` px down.
     words    The idle cycle (default: SyberLabs, RISE, Read, Anything, Alive, Type here ↓).
   Sets --cx, --cy, --s (px) on the canvas parent so the ring and the typing bar follow the orb. 1 texel per CSS px,
   at most 60 frames a second, pauses off screen, in hidden tabs and under the Atlas. No WebGL2 or a software
   renderer -> { supported: false } and the canvas is hidden (the still behind it shows). Reduced motion: one still
   exposure per text, dots placed on their targets. */

const KF = [[-1.4, 1.6, 1.0, 0.7], [1.7, 1.7, 0.6, 1.2], [-1.7, 1.3, -0.1, -1.21], [-1.8, -2.0, -0.5, -0.9], [1.5, -1.8, 1.6, 0.9], [-1.24, -1.25, -1.81, -1.91]];
const N_ORBIT = 120000, N_FLAME = 100000, N_DOTS = 6144, DECAY = 0.9, GAP = 1000 / 60;
const HOLD = 3800, SCATTER = 1100, IDLE_AFTER = 4500; // ms: a word holds, the swarm scatters, typed text releases
const FONT = '"Instrument Serif", Georgia, "Times New Roman", serif';

const SOFT = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const lose = gl => gl.getExtension('WEBGL_lose_context')?.loseContext();
const rng32 = seed => () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const ss = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

// The forms a text calls up: a known-good attractor nudged by the characters, and four flame maps from its hash.
function formsFor(text) {
  const h = hash(text || 'syberlabs'), r = rng32(h), base = KF[h % 6];
  const P = base.map((v, i) => { let d = 0; for (let k = 0; k < text.length; k++) d += Math.sin(text.charCodeAt(k) * 0.37 + i * 1.3 + k) * 0.06; return v + Math.max(-0.22, Math.min(0.22, d)); });
  const maps = [], vars = [], cols = [];
  for (let j = 0; j < 4; j++) {
    const s = 0.42 + r() * 0.3, a = r() * Math.PI * 2, sh = (r() - 0.5) * 0.5;
    maps.push(Math.cos(a) * s, -Math.sin(a) * s + sh, Math.sin(a) * s, Math.cos(a) * s, (r() - 0.5) * 1.3, (r() - 0.5) * 1.3);
    const w = [r(), r() * 0.9, r() * 0.45, r() * 0.6], t = w[0] + w[1] + w[2] + w[3];
    vars.push(w[0] / t, w[1] / t, w[2] / t, w[3] / t);
    cols.push(r());
  }
  return { P, maps, vars, cols };
}

// Targets: the text set in the serif, wrapped to the orb, sampled where there is ink. Sphere units (the disc is
// radius 1); a word fits inside ±0.72 by ±0.6.
function rasterise(text, n) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  const per = words.join(' ').length <= 12 ? 99 : words.join(' ').length <= 40 ? 14 : words.join(' ').length <= 90 ? 20 : 26;
  let line = '';
  for (const w of words) { if (line && (line + ' ' + w).length > per) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  if (line) lines.push(line);
  const cv = rasterise.cv || (rasterise.cv = document.createElement('canvas')), ctx = cv.getContext('2d', { willReadFrequently: true });
  const W = 768, H = 384; cv.width = W; cv.height = H;
  let px = Math.min(225, Math.floor(315 / Math.max(1, lines.length)));
  ctx.font = `400 ${px}px ${FONT}`;
  const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
  if (widest > W * 0.9) { px = Math.floor(px * W * 0.9 / widest); ctx.font = `400 ${px}px ${FONT}`; }
  const lh = px * 1.04, top = H / 2 - lh * (lines.length - 1) / 2;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, top + i * lh));
  // read back only the block the text occupies (a keystroke must stay cheap on a slow CPU)
  const bw = Math.min(W, Math.ceil(Math.min(widest, W * 0.9)) + 8), bh = Math.min(H, Math.ceil(lh * lines.length) + 8);
  const bx = Math.max(0, Math.floor(W / 2 - bw / 2)), by = Math.max(0, Math.floor(H / 2 - bh / 2));
  const d = ctx.getImageData(bx, by, bw, bh).data, ink = [];
  const step = bw * bh > 90000 ? 2 : 1;
  for (let y = 0; y < bh; y += step) for (let x = 0; x < bw; x += step) if (d[(y * bw + x) * 4 + 3] > 110) ink.push(bx + x, by + y);
  const out = new Float32Array(n * 2);
  if (!ink.length) return out;
  // fit the block: widest line -> at most 1.44 units, the block's height -> at most 1.2
  const blockH = lh * lines.length, sc = Math.max(Math.min(widest, W * 0.9) / 1.5, blockH / 1.26);
  const m = ink.length / 2, stride = m / n;
  for (let i = 0; i < n; i++) {
    const k = Math.floor((i * stride + Math.random() * stride) % m) * 2;
    out[i * 2] = (ink[k] + Math.random() - 0.5 - W / 2) / sc;
    out[i * 2 + 1] = -(ink[k + 1] + Math.random() - 0.5 - H / 2) / sc;
  }
  return out;
}

export function mountOrb(canvas, opts = {}) {
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const off = () => { if (canvas) canvas.style.display = 'none'; return { supported: false, setText() {}, pulse() {}, pause() {}, resume() {}, destroy() {} }; };
  if (!canvas || !canvas.getContext) return off();
  let gl = null;
  try { gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !opts.allowSoftware }); } catch (e) { return off(); }
  if (!gl) return off();
  if (!opts.allowSoftware) { const x = gl.getExtension('WEBGL_debug_renderer_info'); if (x && SOFT.test(String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)))) { lose(gl); return off(); } }
  try { return run(canvas, gl, RM, opts); } catch (e) { lose(gl); return off(); }
}

function run(cv, gl, RM, opts) {
  const F = !!gl.getExtension('EXT_color_buffer_float'), host = cv.parentElement, avoid = opts.avoid;
  const narrow = { scale: 0.7, max: 300, top: 64, ...opts.narrow };
  const WORDS = opts.words || ['SyberLabs', 'RISE', 'Read', 'Anything', 'Alive', 'Type here ↓'];

  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, '#version 300 es\nprecision highp float;\n' + s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = (v, f, attribs, tf) => {
    const p = gl.createProgram(), u = {};
    gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f));
    attribs.forEach((n, i) => gl.bindAttribLocation(p, i, n));
    if (tf) gl.transformFeedbackVaryings(p, tf, gl.SEPARATE_ATTRIBS);
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    for (let i = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i--;) { const n = gl.getActiveUniform(p, i).name.replace('[0]', ''); u[n] = gl.getUniformLocation(p, n); }
    return { p, u };
  };
  const PAL = `const vec3 K[7]=vec3[](vec3(.0,.22,.94),vec3(.26,.55,.96),vec3(.56,.86,.95),vec3(1.,.66,.26),vec3(1.,.22,.78),vec3(.5,.26,1.),vec3(.0,.22,.94));
vec3 pal(float h){h=fract(h)*6.;int i=int(h);return mix(K[i],K[i+1],fract(h));}`;
  // U: xy scale (sphere unit -> clip), zw centre in clip
  const orbit = prog(PAL + `in vec2 a;uniform vec4 P,U;uniform vec2 R;uniform float T;out vec3 c;
void main(){vec2 p=fract(a+R)*4.-2.,q=p;for(int i=0;i<18;i++){q=p;p=vec2(sin(P.x*q.y)+P.z*cos(P.x*q.x),sin(P.y*q.x)+P.w*cos(P.y*q.y));}
c=pal(length(p-q)*.3+T);float e=1.1+max(abs(P.z),abs(P.w));p*=1.7/e;float l=length(p);gl_Position=l<.985?vec4(p*U.xy+U.zw,0.,1.):vec4(0.,0.,0.,0.);gl_PointSize=1.;}`,
    `in vec3 c;uniform float W;out vec4 o;void main(){o=vec4(c*W,1.);}`, ['a']);
  const flame = prog(PAL + `in vec2 a;uniform vec4 U;uniform vec2 R;uniform float T,FIT;uniform float M[24];uniform vec4 V[4];uniform float C[4];out vec3 c;
float hs(float x){return fract(sin(x*127.1+R.x*311.7)*43758.5453);}
void main(){vec2 p=fract(a+R)*2.-1.;float ci=a.x,s=a.y*77.;
for(int i=0;i<16;i++){int j=int(hs(s+float(i))*4.);vec2 q=vec2(M[j*6]*p.x+M[j*6+1]*p.y+M[j*6+4],M[j*6+2]*p.x+M[j*6+3]*p.y+M[j*6+5]);
float r2=dot(q,q)+1e-4;vec4 v=V[j];p=v.x*q+v.y*sin(q*2.2)+v.z*q/r2*.5+v.w*vec2(q.x*sin(r2)-q.y*cos(r2),q.x*cos(r2)+q.y*sin(r2));ci=mix(ci,C[j],.5);}
p*=FIT;float l=length(p);c=pal(ci*.8+T*.6+.15);gl_Position=l<.985?vec4(p*U.xy+U.zw,0.,1.):vec4(0.,0.,0.,0.);gl_PointSize=1.;}`,
    `in vec3 c;uniform float W;out vec4 o;void main(){o=vec4(c*W,1.);}`, ['a']);
  // the dots: transform feedback update (no rasterisation), then a draw pass
  const step = prog(`in vec2 p;in vec2 v;in vec2 g;in float s;uniform float DT,T,A,SW;out vec2 oP;out vec2 oV;
float hs(float x){return fract(sin(x*127.1)*43758.5453);}
void main(){float ai=clamp((A-s*.55)/.45,0.,1.);vec2 d=g-p;
vec2 fl=vec2(sin(p.y*3.1+T*.7+s*6.28),cos(p.x*2.7-T*.5+s*3.))*.35+vec2(-p.y,p.x)*.45;
vec2 acc=d*(22.*ai)-v*(7.+2.*ai)+fl*((1.-ai)*SW+.05)+(vec2(hs(s+T),hs(s*2.+T))-.5)*((1.-ai)*.6+.07);
vec2 nv=v+acc*DT;float sp=length(nv);if(sp>2.4)nv*=2.4/sp;vec2 np=p+nv*DT;
float r=length(np);if(r>.95){vec2 n=np/r;np=n*.95;nv-=1.6*dot(nv,n)*n;}oP=np;oV=nv;gl_Position=vec4(0.);}`,
    `out vec4 o;void main(){o=vec4(0.);}`, ['p', 'v', 'g', 's'], ['oP', 'oV']);
  const dots = prog(`in vec2 p;in vec2 v;uniform vec4 U;out vec3 c;
void main(){float sp=clamp(length(v)*1.4,0.,1.);c=mix(vec3(1.,.93,.82),vec3(.56,.86,.98),sp);gl_Position=vec4(p*U.xy+U.zw,0.,1.);gl_PointSize=2.5;}`,
    `in vec3 c;uniform float W;out vec4 o;void main(){o=vec4(c*W,1.);}`, ['p', 'v']);
  const QV = `in vec2 a;out vec2 u;void main(){u=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
  const fade = prog(QV, `out vec4 o;void main(){o=vec4(0.);}`, ['a']);
  // the globe: lens warp, limb darkening, rim and specular; outside the disc only the bloom's spill remains
  const tone = prog(QV, `in vec2 u;uniform sampler2D t;uniform float E,G;uniform vec4 S;out vec4 o;
vec3 B(vec2 q,float l){vec2 s=exp2(l)/vec2(textureSize(t,0));vec3 r=vec3(0);for(int i=-1;i<2;i++)for(int j=-1;j<2;j++)r+=textureLod(t,q+vec2(i,j)*s,l).rgb*float((2-abs(i))*(2-abs(j)));return r/16.;}
void main(){vec2 d=(u-S.xy)/S.zw;float r=length(d);vec3 col;
if(r<1.){float z=sqrt(1.-r*r);vec2 q=S.xy+d*S.zw*(1.-.16*(1.-z));vec3 a=textureLod(t,q,0.).rgb+B(q,3.+G)*.8+B(q,5.+G)*1.1;
col=pow(1.-exp(-a*E),vec3(.9))*(.64+.36*z);vec3 n=vec3(d,z);float rim=pow(1.-z,4.5);col+=vec3(.5,.42,.95)*rim*.42;
float sp=pow(max(0.,dot(n,normalize(vec3(-.45,.55,.7)))),42.);col+=vec3(.9,.95,1.)*sp*.14;col+=vec3(.07,.05,.15)*(1.-z)*.3;}
else{vec3 a=B(u,4.+G)*.6+B(u,5.+G)*.9;col=pow(1.-exp(-a*E),vec3(.9))*smoothstep(1.16,1.,r)*.5;}
float n=fract(sin(dot(gl_FragCoord.xy,vec2(12.99,78.23)))*43758.5)/255.;o=vec4(vec3(.024,.02,.07)+col+n,1.);}`, ['a']);

  const buf = (d, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, d, usage); return b; };
  const vao = list => { const v = gl.createVertexArray(); gl.bindVertexArray(v); list.forEach(([b, n], i) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, 0, 0); }); gl.bindVertexArray(null); return v; };
  const rand = n => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.random(); return a; };
  const vOrbit = vao([[buf(rand(N_ORBIT * 2)), 2]]), vFlame = vao([[buf(rand(N_FLAME * 2)), 2]]), vQuad = vao([[buf(new Float32Array([-1, -1, 3, -1, -1, 3])), 2]]);
  // the dots start scattered through the disc, at rest
  const p0 = new Float32Array(N_DOTS * 2); for (let i = 0; i < N_DOTS; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.9; p0[i * 2] = Math.cos(a) * r; p0[i * 2 + 1] = Math.sin(a) * r; }
  const bP = [buf(p0, gl.DYNAMIC_COPY), buf(p0, gl.DYNAMIC_COPY)], bV = [buf(new Float32Array(N_DOTS * 2), gl.DYNAMIC_COPY), buf(new Float32Array(N_DOTS * 2), gl.DYNAMIC_COPY)];
  const bG = buf(new Float32Array(N_DOTS * 2), gl.DYNAMIC_DRAW), bS = buf(rand(N_DOTS));
  const vStep = [0, 1].map(k => vao([[bP[k], 2], [bV[k], 2], [bG, 2], [bS, 1]])), vDots = [0, 1].map(k => vao([[bP[k], 2], [bV[k], 2]]));
  const tfs = [0, 1].map(k => { const t = gl.createTransformFeedback(); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, t); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bP[k]); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, bV[k]); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null); return t; });
  let cur = 0; // which buffer set holds the current dot state

  const tex = gl.createTexture(), fb = gl.createFramebuffer();
  let W = 0, H = 0, L, warm = 0, t = 0, last = 0, raf = 0, onScreen = true, dead = false, held = false, then = 0, fontsReady = false;

  function size() {
    const w = Math.max(1, Math.round(cv.clientWidth)), h = Math.max(1, Math.round(cv.clientHeight));
    if (w === W && h === H) return; W = cv.width = w; H = cv.height = h;
    const wide = W / H > 1.1 && !(narrow.media && matchMedia(narrow.media).matches), tr = avoid ? avoid.getBoundingClientRect().right - cv.getBoundingClientRect().left : W * 0.45;
    const s = wide ? Math.min(H * 0.78, (W - tr) * 0.86) : Math.min(W * narrow.scale, narrow.max);
    L = { s, x: wide ? tr + (W - tr) / 2 : W / 2, y: wide ? H * 0.47 : narrow.top + s / 2 };
    if (host) { host.style.setProperty('--cx', L.x + 'px'); host.style.setProperty('--cy', L.y + 'px'); host.style.setProperty('--s', s + 'px'); }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, F ? gl.RGBA16F : gl.RGBA8, W, H, 0, gl.RGBA, F ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); warm = 0;
  }

  // ---- the script: what the dots spell, and the forms the light takes ----
  let typed = '', idleAt = 0, word = -1, phaseAt = 0, assembling = false, assemble = 0, pulseK = 0, cadence = 0, lastKey = 0, pending = 0, wait = 80;
  let goal = formsFor(WORDS[0]), now_ = { P: goal.P.slice(), maps: goal.maps.slice(), vars: goal.vars.slice(), cols: goal.cols.slice() };
  const retarget = text => {
    if (!text) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, bG); gl.bufferSubData(gl.ARRAY_BUFFER, 0, rasterise(text, N_DOTS));
    goal = formsFor(text);
  };
  const place = () => { // reduced motion: dots sit on their targets
    const g = new Float32Array(N_DOTS * 2); gl.bindBuffer(gl.ARRAY_BUFFER, bG); gl.getBufferSubData(gl.ARRAY_BUFFER, 0, g);
    for (const b of bP) { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, g); }
    now_ = { P: goal.P.slice(), maps: goal.maps.slice(), vars: goal.vars.slice(), cols: goal.cols.slice() };
  };
  const nextWord = ms => { word = (word + 1) % WORDS.length; retarget(WORDS[word]); assembling = true; phaseAt = ms; if (RM) { place(); warm = 0; } };
  const direct = (ms) => { // the idle cycle, or the typed text
    if (typed) { assembling = true; return; }
    if (word < 0 || (idleAt && ms - idleAt > IDLE_AFTER)) { idleAt = 0; nextWord(ms); return; }
    if (idleAt) return; // released: the swarm drifts until the idle cycle resumes
    if (RM) return;
    if (assembling && ms - phaseAt > HOLD + 900) { assembling = false; phaseAt = ms; }
    else if (!assembling && ms - phaseAt > SCATTER) nextWord(ms);
  };

  function frame(now) {
    raf = 0; if (dead || held || gl.isContextLost()) return;
    if (!RM && then) { const el = now - then; if (el < GAP - 1.5) { go(); return; } then = now - (el % GAP < GAP - 1.5 ? el % GAP : 0); } else then = now;
    size();
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; t += dt;
    direct(now);
    // the forms glide to their goals; the assembly eases; the pulse and the typing cadence decay
    const k = 1 - Math.exp(-dt * 3.2);
    for (let i = 0; i < 4; i++) now_.P[i] += (goal.P[i] - now_.P[i]) * k;
    for (let i = 0; i < 24; i++) now_.maps[i] += (goal.maps[i] - now_.maps[i]) * k;
    for (let i = 0; i < 16; i++) now_.vars[i] += (goal.vars[i] - now_.vars[i]) * k;
    for (let i = 0; i < 4; i++) now_.cols[i] += (goal.cols[i] - now_.cols[i]) * k;
    assemble += ((assembling ? 1 : 0) - assemble) * (1 - Math.exp(-dt * (assembling ? 2.2 : 4)));
    pulseK *= Math.exp(-dt * 3.5); cadence *= Math.exp(-dt * 0.9);
    const U = [L.s / 2 / W, L.s / 2 / H, L.x / W * 2 - 1, 1 - L.y / H * 2], speed = 1 + Math.min(1.5, cadence) * 0.6;
    const area = Math.min(1.2, Math.max(0.28, (L.s / 600) ** 2));

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, W, H); gl.enable(gl.BLEND);
    if (RM) gl.clear(gl.COLOR_BUFFER_BIT);
    if (!RM && warm) { gl.useProgram(fade.p); gl.bindVertexArray(vQuad); gl.blendColor(0, 0, 0, DECAY); gl.blendFunc(gl.ZERO, gl.CONSTANT_ALPHA); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    gl.blendFunc(gl.ONE, gl.ONE);
    const passes = RM || !warm ? 10 : 1, unit = (F ? 0.05 : 3 / 255) * area;
    // the attractor
    gl.useProgram(orbit.p); gl.bindVertexArray(vOrbit);
    gl.uniform4fv(orbit.u.P, now_.P); gl.uniform4fv(orbit.u.U, U); gl.uniform1f(orbit.u.T, t * 0.018 * speed); gl.uniform1f(orbit.u.W, unit * 0.8 * (160000 / N_ORBIT));
    for (let i = passes; i--;) { gl.uniform2f(orbit.u.R, Math.random(), Math.random()); gl.drawArrays(gl.POINTS, 0, N_ORBIT); }
    // the flame
    gl.useProgram(flame.p); gl.bindVertexArray(vFlame);
    gl.uniform4fv(flame.u.U, U); gl.uniform1f(flame.u.T, t * 0.011 * speed); gl.uniform1f(flame.u.FIT, 1.5);
    gl.uniform1fv(flame.u.M, now_.maps); gl.uniform4fv(flame.u.V, now_.vars); gl.uniform1fv(flame.u.C, now_.cols); gl.uniform1f(flame.u.W, unit * 0.62 * (160000 / N_FLAME));
    for (let i = passes; i--;) { gl.uniform2f(flame.u.R, Math.random(), Math.random()); gl.drawArrays(gl.POINTS, 0, N_FLAME); }
    // the dots: step on the GPU, then draw
    if (!RM && dt > 0) {
      gl.useProgram(step.p); gl.bindVertexArray(vStep[cur]); gl.enable(gl.RASTERIZER_DISCARD);
      gl.uniform1f(step.u.DT, dt); gl.uniform1f(step.u.T, t); gl.uniform1f(step.u.A, assemble); gl.uniform1f(step.u.SW, 0.9 + Math.min(1, cadence) * 0.8);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfs[1 - cur]); gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, N_DOTS); gl.endTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null); gl.disable(gl.RASTERIZER_DISCARD); cur = 1 - cur;
    }
    gl.useProgram(dots.p); gl.bindVertexArray(vDots[cur]);
    gl.uniform4fv(dots.u.U, U); gl.uniform1f(dots.u.W, unit * (RM ? 2.8 : 1.3) * (0.6 + 0.4 * assemble));
    gl.drawArrays(gl.POINTS, 0, N_DOTS);
    warm++;
    // tone-map the exposure as a globe
    gl.disable(gl.BLEND); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.generateMipmap(gl.TEXTURE_2D);
    gl.useProgram(tone.p); gl.bindVertexArray(vQuad);
    gl.uniform1f(tone.u.G, Math.log2(L.s / 850)); gl.uniform1f(tone.u.E, (F ? 0.42 : 0.42 * 0.05 * 255 / 3) * (1 + pulseK * 0.9));
    gl.uniform4f(tone.u.S, L.x / W, 1 - L.y / H, L.s / 2 / W, L.s / 2 / H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!RM) go();
  }
  const go = () => { if (!dead && !held && !RM && !raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame); };
  const once = () => { if (!dead && !raf) raf = requestAnimationFrame(frame); };
  const onVis = () => { last = 0; then = 0; go(); };
  const onLost = e => { e.preventDefault(); dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; };
  document.addEventListener('visibilitychange', onVis);
  cv.addEventListener('webglcontextlost', onLost);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; last = 0; then = 0; go(); }) : null;
  if (io) io.observe(cv);
  if (RM) addEventListener('resize', once);

  // the first word waits for the serif, so the dots never spell it in a fallback face
  const start = () => { if (dead) return; fontsReady = true; nextWord(performance.now()); once(); };
  (document.fonts?.load ? document.fonts.load(`400 120px ${FONT}`).then(start, start) : Promise.resolve().then(start));
  once(); // the light is up before the first word

  let destroyed = false;
  return {
    supported: true,
    setText(s) {
      const text = String(s || '').replace(/\s+/g, ' ').trim().slice(0, 180), ms = performance.now();
      if (!fontsReady) return;
      if (text === typed) return;
      typed = text;
      if (text) {
        idleAt = 0; assembling = true; pulseK = Math.min(1.6, pulseK + 0.55); cadence += 0.6; lastKey = ms;
        // trailing debounce; the wait follows the last rasterisation's cost (4x, 80ms-400ms), so a slow CPU keeps up
        clearTimeout(pending); pending = setTimeout(() => { pending = 0; if (dead || !typed) return; const t0 = performance.now(); retarget(typed); wait = Math.min(400, Math.max(80, (performance.now() - t0) * 4)); if (RM) { place(); warm = 0; once(); } }, wait);
      }
      else { idleAt = ms; assembling = false; phaseAt = ms; word = -1; goal = formsFor(''); cadence += 1.2; }
      if (RM && !text) warm = 0;
      once();
    },
    pulse(k = 1) { pulseK = Math.min(2, pulseK + k); once(); },
    pause() { held = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (!held) return; held = false; last = 0; then = 0; go(); },
    destroy() {
      if (destroyed) return; destroyed = dead = true;
      if (raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(pending);
      io?.disconnect(); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', once); cv.removeEventListener('webglcontextlost', onLost);
      lose(gl);
    },
  };
}
