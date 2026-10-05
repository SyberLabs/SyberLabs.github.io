/* SyberLabs site v3 "Observatory": the Field.
   A three.js scene fixed behind every page: a nebula shader (domain-warped noise in the brand spectrum)
   and a 3D Pickover strange attractor rendered as an additive point cloud. The cloud rotates slowly,
   leans toward the pointer, and morphs between forms as the page scrolls. Progressive enhancement only:
   every page reads fine without it. Software WebGL and reduced motion each get one still frame.

   mountField(canvas, { accent, density, offset }) -> { supported, destroy() }
     accent   '#rrggbb' tint mixed into the cloud (defaults to --sy-accent on <html>).
     density  'full' | 'calm' (fewer points, dimmer: for long reading pages).
     offset   [x, y] in viewport fractions, where the cloud's centre sits before scroll (default right of centre). */
import {
  WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, BufferGeometry, BufferAttribute,
  ShaderMaterial, Points, Mesh, PlaneGeometry, AdditiveBlending, Color, Group, Vector2,
} from 'three';

const SOFT = /swiftshader|llvmpipe|softpipe|software|basic render/i;
export function fastGL() {
  try {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) || c.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!g) return false;
    const x = g.getExtension('WEBGL_debug_renderer_info'), r = x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)) : '';
    g.getExtension('WEBGL_lose_context')?.loseContext();
    return !SOFT.test(r);
  } catch (e) { return false; }
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

const PALETTE = `const vec3 K[7]=vec3[](vec3(.0,.28,.94),vec3(.28,.56,.94),vec3(.56,.85,.94),vec3(1.,.71,.29),vec3(1.,.35,.84),vec3(.6,.42,1.),vec3(.0,.28,.94));
vec3 spectrum(float h){h=fract(h)*6.;int i=int(h);return mix(K[i],K[i+1],fract(h));}`;

const POINT_VS = `attribute vec3 p0,p1,p2,p3;attribute float seed;
uniform float uMorph,uTime,uSize,uDpr;uniform vec3 uAccent;varying vec3 vC;varying float vA;
${PALETTE}
void main(){
  float m=clamp(uMorph,0.,3.);int k=int(floor(min(m,2.999)));float f=fract(m);
  vec3 a=k==0?p0:(k==1?p1:p2);vec3 b=k==0?p1:(k==1?p2:p3);
  vec3 p=mix(a,b,smoothstep(0.,1.,f));
  p+=0.012*vec3(sin(uTime*.7+seed*31.),cos(uTime*.6+seed*17.),sin(uTime*.5+seed*7.));
  vec4 mv=modelViewMatrix*vec4(p,1.);
  float d=-mv.z;
  float h=length(p)*.42+seed*.08+uTime*.012;
  vC=mix(spectrum(h),uAccent,.22);
  vA=1.-smoothstep(2.6,7.,d);
  gl_PointSize=uSize*uDpr*(1.5+1.7*(1.-smoothstep(2.,6.,d)));
  gl_Position=projectionMatrix*mv;
}`;
const POINT_FS = `varying vec3 vC;varying float vA;uniform float uGain;
void main(){vec2 q=gl_PointCoord-.5;float r=dot(q,q);if(r>.25)discard;float s=exp(-r*14.);gl_FragColor=vec4(vC*s*uGain*(.35+.65*vA),1.);}`;

const NEBULA_FS = `uniform vec2 uRes;uniform float uTime,uScroll,uGain;uniform vec2 uPointer;uniform vec3 uAccent;
${PALETTE}
vec3 hash3(vec2 p){vec3 q=vec3(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)),dot(p,vec2(419.2,371.9)));return fract(sin(q)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash3(i).x,b=hash3(i+vec2(1,0)).x,c=hash3(i+vec2(0,1)).x,d=hash3(i+vec2(1,1)).x;return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
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
  col*=vign*uGain;
  // dither so the dark end never bands
  col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;
const QUAD_VS = `void main(){gl_Position=vec4(position.xy,0.,1.);}`;

export function mountField(canvas, opts = {}) {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const off = () => { canvas.style.display = 'none'; return { supported: false, destroy() {} }; };
  // window.SY_ALLOW_SOFTWARE_GL is set only by screenshot tooling (same convention as the kit); real visitors on software GL get the CSS nebula.
  if (!canvas || (!fastGL() && window.SY_ALLOW_SOFTWARE_GL !== true)) return off();
  let renderer;
  try { renderer = new WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'high-performance', stencil: false, depth: false }); }
  catch (e) { return off(); }
  const accent = new Color(opts.accent || getComputedStyle(document.documentElement).getPropertyValue('--sy-accent').trim() || '#90d8f0');
  const calm = opts.density === 'calm';
  const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  const N = calm ? (small ? 28000 : 52000) : (small ? 48000 : 110000);
  const dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.autoClear = false;

  // nebula
  const bgScene = new Scene(), bgCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgMat = new ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: NEBULA_FS, depthTest: false, depthWrite: false,
    uniforms: { uRes: { value: new Vector2(1, 1) }, uTime: { value: 0 }, uScroll: { value: 0 }, uGain: { value: calm ? 0.32 : 0.5 }, uPointer: { value: new Vector2() }, uAccent: { value: accent } } });
  bgScene.add(new Mesh(new PlaneGeometry(2, 2), bgMat));

  // cloud
  const scene = new Scene(), cam = new PerspectiveCamera(50, 1, 0.1, 40);
  cam.position.set(0, 0, 4.4);
  const geo = new BufferGeometry();
  FORMS.forEach((P, i) => geo.setAttribute('p' + i, new BufferAttribute(cloud(P, N) || cloud(FORMS[0], N), 3)));
  geo.setAttribute('position', geo.getAttribute('p0'));
  const seeds = new Float32Array(N); for (let i = 0; i < N; i++) seeds[i] = Math.random();
  geo.setAttribute('seed', new BufferAttribute(seeds, 1));
  const mat = new ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, blending: AdditiveBlending, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uMorph: { value: 0 }, uTime: { value: 0 }, uSize: { value: calm ? 1.0 : 1.2 }, uDpr: { value: dpr }, uGain: { value: calm ? 0.3 : 0.48 }, uAccent: { value: accent } } });
  const pts = new Points(geo, mat), rig = new Group();
  rig.add(pts); scene.add(rig);
  const offset = opts.offset || [0.36, -0.02];

  let W = 0, H = 0, raf = 0, t0 = performance.now(), last = 0, dead = false, scroll = 0, sScroll = 0;
  const ptr = new Vector2(), sPtr = new Vector2();
  const docH = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  function size() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    if (w === W && h === H) return;
    W = w; H = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    bgMat.uniforms.uRes.value.set(w * dpr, h * dpr);
  }
  function frame(now) {
    raf = 0; if (dead) return; size();
    const t = (now - t0) / 1000, dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    const k = 1 - Math.pow(0.001, dt);
    sScroll += (scroll - sScroll) * k; sPtr.lerp(ptr, k * 0.8);
    const wide = W / H > 1;
    // wide: right of the copy column; tall (phones): high and small, behind the hero, then it drifts away as you scroll
    const ox = wide ? offset[0] : 0.12, oy = wide ? offset[1] : 0.55;
    rig.position.set(ox * 2 * cam.aspect + sPtr.x * 0.12, oy * 2 - sScroll * 1.1 + sPtr.y * 0.08, 0);
    rig.rotation.set(0.35 + sScroll * 1.9 + sPtr.y * 0.25, t * 0.11 + sScroll * 2.6 + sPtr.x * 0.35, 0.12);
    const s = (wide ? 0.9 : 0.62) + Math.sin(t * 0.17) * 0.04 + sScroll * 0.2;
    rig.scale.setScalar(s);
    mat.uniforms.uTime.value = t; mat.uniforms.uMorph.value = sScroll * 3;
    bgMat.uniforms.uTime.value = t; bgMat.uniforms.uScroll.value = sScroll; bgMat.uniforms.uPointer.value.copy(sPtr);
    renderer.render(bgScene, bgCam); renderer.render(scene, cam);
    if (!reduced) go();
  }
  const go = () => { if (!dead && !raf && !document.hidden) raf = requestAnimationFrame(frame); };
  const onScroll = () => { scroll = Math.min(1, Math.max(0, scrollY / docH())); if (reduced) go(); };
  const onPointer = e => { ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); };
  const onVis = () => { last = 0; go(); };
  const onResize = () => { last = 0; go(); };
  addEventListener('scroll', onScroll, { passive: true });
  if (matchMedia('(pointer:fine)').matches) addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); dead = true; }, false);
  onScroll(); go();
  return {
    supported: true,
    destroy() {
      dead = true; if (raf) cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll); removeEventListener('pointermove', onPointer); removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      geo.dispose(); mat.dispose(); bgMat.dispose(); renderer.dispose();
    },
  };
}

/* A single sigil in 3D: the de Jong parameters of a product become a Pickover-style cloud spun in a plate.
   sigil3d(canvas, P, { color }) -> { destroy() }. Static (one spin ease-in) under reduced motion. */
export function sigil3d(canvas, P, opts = {}) {
  if (!canvas || (!fastGL() && window.SY_ALLOW_SOFTWARE_GL !== true)) return { supported: false, destroy() {} };
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let renderer; try { renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' }); } catch (e) { return { supported: false, destroy() {} }; }
  const dpr = Math.min(devicePixelRatio || 1, 2); renderer.setPixelRatio(dpr); renderer.setClearColor(0, 0);
  const scene = new Scene(), cam = new PerspectiveCamera(38, 1, 0.1, 20); cam.position.z = 3.1;
  // exposure follows the plate size: a 112px phone plate gets far fewer pixels per point than a 380px one
  const K = () => Math.min(1, Math.max(0.3, (canvas.clientWidth || 300) / 380));
  const GAIN = () => 0.55 * K() * SPREAD;
  const cw = canvas.clientWidth || 300, small = cw < 200;
  const N = small ? 14000 : 36000, geo = new BufferGeometry();
  // try the product's own parameters in a few scalings; fall back to a brand form so no sigil is ever empty
  const tries = [[1.3, 1.1, 1.4, 1.2], [1, 1, 1, 1], [0.8, 1.5, 1.1, 0.9], [1.6, 0.7, 1.3, 1.5]];
  let pos = null;
  for (const s of tries) { pos = cloud([P[0] * s[0], P[1] * s[1], P[2] * s[2], P[3] * s[3], 1 + Math.abs(P[0]) * 0.3], N); if (pos) break; }
  if (!pos) pos = cloud(FORMS[(Math.abs(Math.round(P[0] * 100)) % FORMS.length)], N);
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  ['p0', 'p1', 'p2', 'p3'].forEach(k => geo.setAttribute(k, geo.getAttribute('position')));
  // exposure also follows how spread out the form is: a compact, dense cloud piles many points per pixel
  const occ = new Uint8Array(64 * 64); let cells = 0;
  for (let i = 0; i < N; i++) { const j = (((pos[i * 3] + 1) * 31.99) | 0) + (((pos[i * 3 + 1] + 1) * 31.99) | 0) * 64; if (!occ[j]) { occ[j] = 1; cells++; } }
  const SPREAD = Math.min(1, Math.max(0.3, cells / 4096 / 0.4));
  const seeds = new Float32Array(N); for (let i = 0; i < N; i++) seeds[i] = Math.random();
  geo.setAttribute('seed', new BufferAttribute(seeds, 1));
  const accent = new Color(opts.color || getComputedStyle(canvas).getPropertyValue('--sy-accent').trim() || '#90d8f0');
  const mat = new ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, blending: AdditiveBlending, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uMorph: { value: 0 }, uTime: { value: 0 }, uSize: { value: 1.25 * K() }, uDpr: { value: dpr }, uGain: { value: GAIN() }, uAccent: { value: accent } } });
  // strongly tinted: a sigil is one colour
  mat.vertexShader = POINT_VS.replace('vC=mix(spectrum(h),uAccent,.22);', 'vC=mix(spectrum(h),uAccent,.72);');
  const pts = new Points(geo, mat); scene.add(pts);
  let raf = 0, dead = false, W = 0, t0 = performance.now(), hover = 0, tHover = 0;
  const ptr = new Vector2(), sPtr = new Vector2();
  const size = () => { const w = canvas.clientWidth || 300, h = canvas.clientHeight || w; if (w !== W) { W = w; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } };
  function frame(now) {
    raf = 0; if (dead) return; size();
    const t = (now - t0) / 1000; hover += (tHover - hover) * 0.08; sPtr.lerp(ptr, 0.08);
    pts.rotation.set(0.45 + sPtr.y * 0.5, t * 0.22 + sPtr.x * 0.7, 0);
    pts.scale.setScalar(1 + hover * 0.08);
    mat.uniforms.uTime.value = t; mat.uniforms.uGain.value = GAIN() * (1 + hover * 0.35);
    renderer.clear(); renderer.render(scene, cam);
    if (!reduced && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }
  let onScreen = true;
  const go = () => { if (!dead && !raf) raf = requestAnimationFrame(frame); };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) go(); }); io.observe(canvas);
  const host = canvas.closest('[data-sigil3d-host]') || canvas.parentElement;
  const onMove = e => { const r = host.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); tHover = 1; go(); };
  const onLeave = () => { ptr.set(0, 0); tHover = 0; go(); };
  host.addEventListener('pointermove', onMove, { passive: true }); host.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', go);
  go();
  return { supported: true, destroy() { dead = true; if (raf) cancelAnimationFrame(raf); io.disconnect(); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', go); geo.dispose(); mat.dispose(); renderer.dispose(); } };
}

export { FORMS, cloud };
