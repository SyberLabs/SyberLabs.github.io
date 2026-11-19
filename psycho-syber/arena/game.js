// PSYCHO SYBER: ARENA. A first-person arena in 3D with two forms, Psycho and Syber: Waves for one player and a
// Duel for two browsers. One classic script; it draws with three.js r160 (vendor/three.min.js) and packs the
// duel's invite and reply with link.js. psycho-syber/README.md ("ARENA") lists the parts and the rules that hold it.
(() => {
'use strict';
const T = window.THREE;
if (!T) { const n = document.getElementById('ar-nogl'); if (n) n.hidden = false; return; }
T.ColorManagement.enabled = false;

/* ============================== utils ============================== */
const $ = id => document.getElementById('ar-' + id);
const stage = $('stage');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const lowSpec = matchMedia('(pointer: coarse)').matches;
let touchMode = lowSpec;
if (touchMode) stage.classList.add('touch');

const BS = 2, GW = 44, GD = 44, GH = 16, GRAV = 34;
const PSYCHO = 0, SYBER = 1;
const FNAME = ['Psycho', 'Syber'];
const FCOL = [[1, 0.37, 0.81], [0.37, 0.89, 0.82], [1, 0.95, 0.84]];
function roman(n) { n = Math.max(1, n | 0); if (n > 39) return String(n); let r = ''; for (const [v, t] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { r += t; n -= v; } return r; }
const CX = GW * BS / 2, CZ = GD * BS / 2;

/* ============================== renderer ============================== */
const canvas = $('c');
let renderer;
try { renderer = new T.WebGLRenderer({ canvas, antialias: !lowSpec, powerPreference: 'high-performance' }); } catch (e) { $('nogl').hidden = false; return; }
renderer.outputColorSpace = T.LinearSRGBColorSpace;
let pixelRatio = Math.min(window.devicePixelRatio || 1, lowSpec ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.autoClear = false;
const scene = new T.Scene();
scene.fog = new T.FogExp2(0x04050a, 0.011);
const camera = new T.PerspectiveCamera(80, 1, 0.08, 700);
camera.rotation.order = 'YXZ';
scene.add(camera);
const gunScene = new T.Scene();
const gunCam = new T.PerspectiveCamera(58, 1, 0.01, 10);

function mkTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new T.CanvasTexture(c);
  t.anisotropy = lowSpec ? 2 : 8;
  return t;
}
function shadeAttr(g, hex) {
  const n = g.attributes.normal, c = new T.Color(hex), a = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const s = clamp(0.62 + 0.38 * n.getY(i) + 0.1 * n.getZ(i), 0.22, 1);
    a[i * 3] = c.r * s; a[i * 3 + 1] = c.g * s; a[i * 3 + 2] = c.b * s;
  }
  g.setAttribute('color', new T.BufferAttribute(a, 3));
  return g;
}
// merge a list of shaded geometries (non-indexed) into one
function mergeGeos(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o); col.set(g.attributes.color.array, o);
    o += g.attributes.position.count * 3; g.dispose();
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.BufferAttribute(pos, 3));
  out.setAttribute('color', new T.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
// parts: [w,h,d, x,y,z, hex]
function boxParts(parts) {
  return mergeGeos(parts.map(p => {
    const g = new T.BoxGeometry(p[0], p[1], p[2]).toNonIndexed();
    shadeAttr(g, p[6]); g.translate(p[3], p[4], p[5]); return g;
  }));
}

/* ============================== sky + ground ============================== */
const skyMat = new T.ShaderMaterial({
  side: T.BackSide, depthWrite: false, depthTest: false, fog: false,
  uniforms: { cA: { value: new T.Color(1, 0.37, 0.81) }, cB: { value: new T.Color(0, 0, 0) }, time: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform vec3 cA; varying vec3 vD;
    void main(){
      vec3 d=normalize(vD); float h=max(d.y,0.0);
      vec3 col=mix(vec3(0.030,0.032,0.058),vec3(0.006,0.006,0.014),pow(h,0.45));
      col+=cA*0.075*exp(-abs(d.y)*6.0);
      gl_FragColor=vec4(col,1.0);
    }`
});
const sky = new T.Mesh(new T.SphereGeometry(500, 24, 16), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
const SPRITE = mkTex(64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
(() => {
  const n = lowSpec ? 1400 : 2600, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const th = Math.random() * 6.2832, ph = Math.acos(1 - (Math.random() * 0.92 + 0.08)); p[i * 3] = Math.sin(ph) * Math.cos(th) * 420; p[i * 3 + 1] = Math.cos(ph) * 420; p[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 420; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
  const st = new T.Points(g, new T.PointsMaterial({ size: 2.2 * pixelRatio, sizeAttenuation: false, color: 0xbfb9aa, transparent: true, opacity: 0.8, fog: false, map: SPRITE, depthWrite: false, depthTest: false, blending: T.AdditiveBlending }));
  st.frustumCulled = false; st.renderOrder = -9; sky.add(st);
})();

// floor: the five layers, as concentric rings that light inward with the sync meter
const floorMat = new T.ShaderMaterial({
  extensions: { derivatives: true },
  uniforms: { uCam: { value: new T.Vector3() }, uTime: { value: 0 }, uLit: { value: 0 }, uCol: { value: new T.Color(1, 1, 1) }, uFog: { value: new T.Color(0x04050a) }, uC: { value: new T.Vector2(CX, CZ) } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `
    uniform vec3 uCam; uniform float uTime; uniform float uLit; uniform vec3 uCol; uniform vec3 uFog; uniform vec2 uC; varying vec3 vW;
    float ln(float v,float w,float fw){ return 1.0-smoothstep(w,w+fw*1.5,abs(v)); }
    vec3 ring(float r,float rr,float idx,float fr){ float m=ln(r-rr,0.05,fr); float lit=clamp(uLit-idx,0.0,1.0); return mix(vec3(0.56,0.52,0.44)*0.45,uCol*(1.2+0.3*sin(uTime*2.6-idx)),lit)*m; }
    void main(){
      vec2 p=vW.xz-uC; float r=length(p); float ang=atan(p.y,p.x); float fr=fwidth(r);
      vec3 lineCol=vec3(0.56,0.52,0.44);
      float g=ln(fract(r*0.5+0.5)-0.5,0.004,fwidth(r*0.5))*0.12;
      float fwA=length(fwidth(p))/max(r,0.5)*40.0/6.2831853;
      float sp=ln(fract(ang/6.2831853*40.0+0.5)-0.5,0.004,fwA)*0.09*smoothstep(2.0,9.0,r);
      float near=exp(-length(vW.xz-uCam.xz)*0.06);
      vec3 col=vec3(0.014,0.015,0.026)+lineCol*(g+sp)*(0.6+1.5*near);
      col+=ring(r,50.0,0.0,fr)+ring(r,40.0,1.0,fr)+ring(r,30.0,2.0,fr)+ring(r,20.0,3.0,fr)+ring(r,10.0,4.0,fr);
      float d=length(vW-uCam); col=mix(col,uFog,1.0-exp(-d*d*0.000121));
      gl_FragColor=vec4(col,1.0);
    }`
});
const floor = new T.Mesh(new T.PlaneGeometry(GW * BS, GD * BS), floorMat);
floor.rotation.x = -Math.PI / 2; floor.position.set(CX, 0, CZ); scene.add(floor);

// boundary: a veil of hairlines that fades upward
const wallTex = mkTex(256, (g, s) => {
  g.clearRect(0, 0, s, s);
  const gr = g.createLinearGradient(0, s, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(s / 2 - 1, 0, 2, s); g.fillRect(0, s - 4, s, 4);
});
wallTex.wrapS = T.RepeatWrapping; wallTex.repeat.set(GW / 2, 1);
const wallMat = new T.MeshBasicMaterial({ map: wallTex, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
for (let i = 0; i < 4; i++) {
  const w = new T.Mesh(new T.PlaneGeometry(GW * BS, 30), wallMat);
  w.position.set(i < 2 ? CX : i === 2 ? 0 : GW * BS, 15, i === 0 ? 0 : i === 1 ? GD * BS : CZ);
  if (i >= 2) w.rotation.y = Math.PI / 2;
  scene.add(w);
}

/* ============================== voxel world ============================== */
const vox = new Uint8Array(GW * GH * GD);
const voxHp = new Float32Array(GW * GH * GD);
const voxInst = new Int32Array(GW * GH * GD).fill(-1);
const vidx = (x, y, z) => x + GW * (z + GD * y);
const BLOCK_HP = 40;
const blk = []; // {x,y,z,r,g,b,anchor}
let SPX = 22, SPZ = 31;
const LC = { zig: [0.76, 0.61, 1], tow: [0.5, 0.68, 1], bun: [1, 0.75, 0.42], wal: [0.86, 0.84, 0.78], pil: [0.62, 0.96, 0.7], pla: [0.91, 0.77, 0.49], bri: [0.92, 0.9, 0.84], hov: [1, 0.86, 0.5] };
const LEVELS = {
  arena: { spawn: [22, 31], build(set, box, R, RI, C) {
  // central ziggurat + spire
  box(18, 0, 18, 25, 0, 25, C.zig); box(19, 1, 19, 24, 1, 24, C.zig); box(20, 2, 20, 23, 2, 23, C.zig); box(21, 3, 21, 22, 6, 22, C.zig);
  // corner towers with caps
  for (const [cx, cz] of [[8, 8], [35, 8], [8, 35], [35, 35]]) { box(cx - 1, 0, cz - 1, cx + 1, 5, cz + 1, C.tow); box(cx - 2, 6, cz - 2, cx + 2, 6, cz + 2, C.pla); }
  // sky bridges
  box(11, 6, 8, 32, 6, 8, C.bri); box(11, 6, 35, 32, 6, 35, C.bri); box(8, 6, 11, 8, 6, 32, C.bri); box(35, 6, 11, 35, 6, 32, C.bri);
  // bunkers (hollow, with doors)
  for (const [x0, z0] of [[19, 5], [5, 19], [33, 19], [19, 38]]) {
    for (let y = 0; y < 3; y++) for (let z = 0; z < 6; z++) for (let x = 0; x < 6; x++) {
      const edge = x === 0 || x === 5 || z === 0 || z === 5; if (!edge) continue;
      const door = y < 2 && ((x >= 2 && x <= 3) || (z >= 2 && z <= 3)); if (door) continue;
      set(x0 + x, y, z0 + z, C.bun);
    }
    box(x0, 3, z0, x0 + 5, 3, z0 + 5, C.bun);
  }
  // walls
  for (let i = 0; i < 22; i++) {
    const hz = R() < 0.5, len = RI(3, 8), h = RI(1, 4), x = RI(3, GW - 12), z = RI(3, GD - 12);
    for (let k = 0; k < len; k++) { const hh = Math.max(1, h - (R() < 0.3 ? 1 : 0)); box(hz ? x + k : x, 0, hz ? z : z + k, hz ? x + k : x, hh - 1, hz ? z : z + k, C.wal); }
  }
  // pillars
  for (let i = 0; i < 22; i++) { const x = RI(3, GW - 4), z = RI(3, GD - 4), h = RI(2, 7); box(x, 0, z, x, h - 1, z, C.pil); }
  // floating platforms
  for (let i = 0; i < 12; i++) { const x = RI(4, GW - 8), z = RI(4, GD - 8), y = RI(3, 9), w = RI(2, 4), d = RI(2, 4); box(x, y, z, x + w - 1, y, z + d - 1, C.hov, true); }
  } },
  // Duel: point-symmetric about the centre so neither start is favoured
  duel: { spawn: [22, 36], spawn2: [21, 7], safe: [[22, 36], [21, 7]], build(set, box, R, RI, C) {
    const M = (x0, y0, z0, x1, y1, z1, c, a) => { box(x0, y0, z0, x1, y1, z1, c, a); box(43 - x1, y0, 43 - z1, 43 - x0, y1, 43 - z0, c, a); };
    box(19, 0, 19, 24, 0, 24, C.zig); box(20, 1, 20, 23, 1, 23, C.zig); box(21, 2, 21, 22, 5, 22, C.zig);
    M(18, 0, 31, 25, 1, 31, C.wal); M(20, 2, 31, 23, 2, 31, C.wal);
    M(6, 0, 30, 8, 5, 32, C.tow); M(5, 6, 29, 9, 6, 33, C.pla); M(10, 6, 31, 15, 6, 31, C.bri);
    M(33, 0, 27, 35, 3, 29, C.tow); M(32, 4, 26, 36, 4, 30, C.pla);
    M(12, 0, 23, 12, 3, 28, C.wal); M(13, 0, 23, 16, 1, 23, C.wal);
    M(28, 0, 34, 33, 2, 34, C.bun); M(30, 0, 37, 30, 3, 40, C.bun);
    M(15, 0, 36, 15, 4, 36, C.pil); M(27, 0, 26, 27, 5, 26, C.pil); M(37, 0, 36, 37, 3, 36, C.pil); M(4, 0, 24, 4, 2, 24, C.pil); M(24, 0, 27, 24, 2, 27, C.pil); M(9, 0, 38, 9, 3, 38, C.pil);
    M(13, 5, 36, 15, 5, 38, C.hov, true); M(26, 8, 24, 28, 8, 25, C.hov, true); M(36, 7, 20, 38, 7, 22, C.hov, true); M(19, 9, 28, 21, 9, 29, C.hov, true);
  } }
};
const blockTex = mkTex(128, (g, s) => {
  g.fillStyle = '#11121c'; g.fillRect(0, 0, s, s);
  const gr = g.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.75); gr.addColorStop(0, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1.2; g.beginPath(); g.arc(s / 2, s / 2, s * 0.36, 0, 6.2832); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(s / 2, s / 2, 1.8, 0, 6.2832); g.fill();
  g.shadowColor = '#fff'; g.shadowBlur = 7; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.6; g.strokeRect(1.5, 1.5, s - 3, s - 3);
});
const blockGeo = shadeAttr(new T.BoxGeometry(BS, BS, BS), 0xffffff);
const blockMat = new T.MeshBasicMaterial({ map: blockTex, vertexColors: true });
let blockMesh = null;
const ZERO_M = new T.Matrix4().makeScale(0, 0, 0), TMP_M = new T.Matrix4(), TMP_C = new T.Color();
function buildLevel(kind) {
  const L = LEVELS[kind], safe = L.safe || [L.spawn]; SPX = L.spawn[0]; SPZ = L.spawn[1];
  vox.fill(0); voxHp.fill(0); voxInst.fill(-1); blk.length = 0;
  let seed = 1337;
  const R = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const RI = (a, b) => a + Math.floor(R() * (b - a + 1));
  const set = (x, y, z, c, anchor) => {
    if (x < 1 || z < 1 || x >= GW - 1 || z >= GD - 1 || y < 0 || y >= GH) return;
    for (const sp of safe) if (Math.abs(x - sp[0]) <= 2 && Math.abs(z - sp[1]) <= 2 && y < 6) return;
    const i = vidx(x, y, z); if (vox[i]) return;
    vox[i] = 1; const v = 0.82 + R() * 0.3;
    blk.push({ x, y, z, r: c[0] * v, g: c[1] * v, b: c[2] * v, anchor: !!anchor });
  };
  const box = (x0, y0, z0, x1, y1, z1, c, anchor) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, c, anchor); };
  L.build(set, box, R, RI, LC);
  if (blockMesh) { scene.remove(blockMesh); blockMesh.dispose(); }
  blockMesh = new T.InstancedMesh(blockGeo, blockMat, Math.max(1, blk.length));
  blk.forEach((b, i) => {
    voxInst[vidx(b.x, b.y, b.z)] = i; voxHp[vidx(b.x, b.y, b.z)] = BLOCK_HP;
    blockMesh.setMatrixAt(i, TMP_M.makeTranslation(b.x * BS + 1, b.y * BS + 1, b.z * BS + 1));
    blockMesh.setColorAt(i, TMP_C.setRGB(b.r, b.g, b.b));
  });
  blockMesh.count = blk.length; blockMesh.frustumCulled = false; scene.add(blockMesh);
  supStack = new Int32Array(blk.length + 8); supportDirty = false; fallers.length = 0;
}
let blocksDirty = false, colorsDirty = false;

function boxHit(px, py, pz, r, h) {
  const x0 = Math.floor((px - r) / BS), x1 = Math.floor((px + r) / BS), z0 = Math.floor((pz - r) / BS), z1 = Math.floor((pz + r) / BS);
  const y0 = Math.floor((py + 0.001) / BS), y1 = Math.floor((py + h - 0.001) / BS);
  if (y0 < 0 || x0 < 0 || z0 < 0 || x1 >= GW || z1 >= GD) return true;
  for (let y = y0; y <= y1 && y < GH; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (vox[x + GW * (z + GD * y)]) return true;
  return false;
}
// destroys destructible blocks in the box; returns true if still blocked by arena bounds
function smashBox(px, py, pz, r, h) {
  const x0 = Math.floor((px - r) / BS), x1 = Math.floor((px + r) / BS), z0 = Math.floor((pz - r) / BS), z1 = Math.floor((pz + r) / BS);
  const y0 = Math.floor((py + 0.001) / BS), y1 = Math.floor((py + h - 0.001) / BS);
  if (y0 < 0 || x0 < 0 || z0 < 0 || x1 >= GW || z1 >= GD) return true;
  for (let y = y0; y <= y1 && y < GH; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (vox[x + GW * (z + GD * y)]) destroyBlock(x, y, z, true);
  return false;
}
const RH = { t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, kind: 0 };
function rayVox(ox, oy, oz, dx, dy, dz, maxD) {
  let x = Math.floor(ox / BS), y = Math.floor(oy / BS), z = Math.floor(oz / BS);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? BS / Math.abs(dx) : 1e9, tdy = dy !== 0 ? BS / Math.abs(dy) : 1e9, tdz = dz !== 0 ? BS / Math.abs(dz) : 1e9;
  let tx = dx !== 0 ? (dx > 0 ? (x + 1) * BS - ox : ox - x * BS) / Math.abs(dx) : 1e9;
  let ty = dy !== 0 ? (dy > 0 ? (y + 1) * BS - oy : oy - y * BS) / Math.abs(dy) : 1e9;
  let tz = dz !== 0 ? (dz > 0 ? (z + 1) * BS - oz : oz - z * BS) / Math.abs(dz) : 1e9;
  for (let i = 0; i < 320; i++) {
    let t;
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; RH.nx = -sx; RH.ny = 0; RH.nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; RH.nx = 0; RH.ny = -sy; RH.nz = 0; }
    else { z += sz; t = tz; tz += tdz; RH.nx = 0; RH.ny = 0; RH.nz = -sz; }
    if (t > maxD) return false;
    let k = 0;
    if (y < 0) k = 2; else if (x < 0 || x >= GW || z < 0 || z >= GD) k = 3; else if (y < GH && vox[x + GW * (z + GD * y)]) k = 1;
    if (k) { RH.t = t; RH.x = x; RH.y = y; RH.z = z; RH.kind = k; return true; }
    if (y > 45 && dy > 0) return false;
  }
  return false;
}
function destroyBlock(x, y, z, fx) {
  const i = vidx(x, y, z); if (!vox[i]) return;
  vox[i] = 0; const n = voxInst[i]; blockMesh.setMatrixAt(n, ZERO_M); blocksDirty = true; supportDirty = true; if (G.mode === 'duel' && !D.applying) D.out.push(n);
  G.score += 5; G.smashed++;
  if (fx) { const b = blk[n], c = lowSpec ? 3 : 5; for (let k = 0; k < c; k++) spawnP(x * BS + rnd(0.2, 1.8), y * BS + rnd(0.2, 1.8), z * BS + rnd(0.2, 1.8), rnd(-7, 7), rnd(1, 10), rnd(-7, 7), rnd(0.5, 1.1), rnd(5, 10), b.r, b.g, b.b, 26); }
}
function damageBlock(x, y, z, d) {
  const i = vidx(x, y, z); if (!vox[i]) return;
  voxHp[i] -= d;
  if (voxHp[i] <= 0) { destroyBlock(x, y, z, true); sfx.crack(); return; }
  const n = voxInst[i], b = blk[n], k = 1 + (1 - voxHp[i] / BLOCK_HP) * 2.2;
  blockMesh.setColorAt(n, TMP_C.setRGB(b.r * k, b.g * k, b.b * k)); colorsDirty = true;
}
function regenBlocks() {
  let fxn = 0;
  for (let n = 0; n < blk.length; n++) {
    const b = blk[n], i = vidx(b.x, b.y, b.z);
    if (vox[i]) { if (voxHp[i] < BLOCK_HP) { voxHp[i] = BLOCK_HP; blockMesh.setColorAt(n, TMP_C.setRGB(b.r, b.g, b.b)); colorsDirty = true; } continue; }
    const cx = b.x * BS + 1, cy = b.y * BS + 1, cz = b.z * BS + 1;
    if (Math.abs(cx - P.pos.x) < 1.6 && Math.abs(cz - P.pos.z) < 1.6 && cy > P.pos.y - 1.2 && cy < P.pos.y + 3) continue;
    vox[i] = 1; voxHp[i] = BLOCK_HP;
    blockMesh.setMatrixAt(n, TMP_M.makeTranslation(cx, cy, cz)); blockMesh.setColorAt(n, TMP_C.setRGB(b.r, b.g, b.b));
    blocksDirty = colorsDirty = true;
    if (fxn++ < 120) spawnP(cx, cy, cz, 0, rnd(2, 6), 0, 0.7, 9, 1, 1, 1, 0);
  }
}

/* ============================== structural collapse ============================== */
// blocks with no path to the ground (or to a hover platform) break loose and fall
let supportDirty = false, supportT = 0;
const supMark = new Uint8Array(GW * GH * GD), LAYER = GW * GD; let supStack = new Int32Array(8);
const FMAX = 260, fallers = [], _fe = new T.Euler(), _fq = new T.Quaternion(), _fp = new T.Vector3(), _fs = new T.Vector3(1, 1, 1);
const fallMesh = new T.InstancedMesh(blockGeo, blockMat, FMAX);
fallMesh.frustumCulled = false; fallMesh.count = 0; fallMesh.setColorAt(0, TMP_C.setRGB(1, 1, 1)); scene.add(fallMesh);
function checkSupport() {
  supMark.fill(0); let sp = 0;
  for (let n = 0; n < blk.length; n++) { const b = blk[n]; if (b.y !== 0 && !b.anchor) continue; const i = vidx(b.x, b.y, b.z); if (vox[i] && !supMark[i]) { supMark[i] = 1; supStack[sp++] = i; } }
  while (sp > 0) {
    const i = supStack[--sp], x = i % GW, z = ((i - x) / GW) % GD, y = Math.floor(i / LAYER); let j;
    if (x > 0 && vox[j = i - 1] && !supMark[j]) { supMark[j] = 1; supStack[sp++] = j; }
    if (x < GW - 1 && vox[j = i + 1] && !supMark[j]) { supMark[j] = 1; supStack[sp++] = j; }
    if (z > 0 && vox[j = i - GW] && !supMark[j]) { supMark[j] = 1; supStack[sp++] = j; }
    if (z < GD - 1 && vox[j = i + GW] && !supMark[j]) { supMark[j] = 1; supStack[sp++] = j; }
    if (y > 0 && vox[j = i - LAYER] && !supMark[j]) { supMark[j] = 1; supStack[sp++] = j; }
    if (y < GH - 1 && vox[j = i + LAYER] && !supMark[j]) { supMark[j] = 1; supStack[sp++] = j; }
  }
  let minY = 99, cnt = 0;
  for (let n = 0; n < blk.length; n++) { const b = blk[n], i = vidx(b.x, b.y, b.z); if (vox[i] && !supMark[i]) { cnt++; if (b.y < minY) minY = b.y; } }
  if (!cnt) return 0;
  for (let n = 0; n < blk.length; n++) {
    const b = blk[n], i = vidx(b.x, b.y, b.z); if (!vox[i] || supMark[i]) continue;
    vox[i] = 0; blockMesh.setMatrixAt(n, ZERO_M); G.score += 5; G.smashed++;
    spawnFaller(b, (b.y - minY) * 0.05 + Math.random() * 0.12);
  }
  blocksDirty = true; G.shake = Math.max(G.shake, Math.min(0.9, 0.2 + cnt * 0.02)); sfx.rumble(); if (cnt >= 8) toast('COLLAPSE');
  return cnt;
}
function spawnFaller(b, delay) {
  const x = b.x * BS + 1, y = b.y * BS + 1, z = b.z * BS + 1;
  if (fallers.length >= FMAX) { burst(x, y, z, 4, 8, 0.6, 8, b.r, b.g, b.b, 24); return; }
  fallers.push({ x, y, z, vy: 0, vx: rnd(-0.7, 0.7), vz: rnd(-0.7, 0.7), delay, rx: 0, rz: 0, sx: rnd(-2.2, 2.2), sz: rnd(-2.2, 2.2), r: b.r, g: b.g, b: b.b });
}
function crushLand(f) {
  burst(f.x, f.y - 0.5, f.z, 8, 9, 0.6, 9, f.r, f.g, f.b, 24);
  const sp = -f.vy; if (sp < 5) return;
  for (const e of enemies) {
    if (e.dead || e.spawnT > 0 || e.type >= 4) continue;
    if (Math.hypot(e.pos.x - f.x, e.pos.y + e.h * 0.5 - (f.y - 0.5), e.pos.z - f.z) < e.hr + 1.7) { G.crushing = true; SRC = 'CRUSH'; damageEnemy(e, 45 + sp * 2, 2, 0, -4, 0); G.crushing = false; }
  }
  sfx.crack();
}
function updateFallers(dt) {
  for (let i = fallers.length - 1; i >= 0; i--) {
    const f = fallers[i]; let done = false;
    if (f.delay > 0) f.delay -= dt;
    else {
      f.vy -= GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.rx += f.sx * dt; f.rz += f.sz * dt;
      const cx = Math.floor(f.x / BS), cz = Math.floor(f.z / BS), cy = Math.floor((f.y - 1) / BS);
      if (f.y - 1 <= 0 || (cy >= 0 && cy < GH && cx >= 0 && cx < GW && cz >= 0 && cz < GD && vox[vidx(cx, cy, cz)])) done = true;
      else for (const e of enemies) { if (e.dead || e.spawnT > 0) continue; if (Math.abs(e.pos.x - f.x) < e.hr + 0.8 && Math.abs(e.pos.z - f.z) < e.hr + 0.8 && f.y - 1 < e.pos.y + e.h && f.y + 1 > e.pos.y) { done = true; break; } }
    }
    if (done) { crushLand(f); fallers.splice(i, 1); }
  }
  let n = 0;
  for (const f of fallers) {
    const j = f.delay > 0 ? 0.07 : 0; _fq.setFromEuler(_fe.set(f.rx, 0, f.rz)); _fp.set(f.x + rnd(-j, j), f.y, f.z + rnd(-j, j));
    fallMesh.setMatrixAt(n, TMP_M.compose(_fp, _fq, _fs)); fallMesh.setColorAt(n, TMP_C.setRGB(f.r * 1.6, f.g * 1.6, f.b * 1.6)); n++;
  }
  if (n || fallMesh.count) { fallMesh.count = n; fallMesh.instanceMatrix.needsUpdate = true; fallMesh.instanceColor.needsUpdate = true; }
}

/* ============================== fx: particles, beams, shells ============================== */
const PMAX = lowSpec ? 1600 : 3200;
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pSize = new Float32Array(PMAX);
const pVel = new Float32Array(PMAX * 3), pBase = new Float32Array(PMAX * 3), pLife = new Float32Array(PMAX), pMax = new Float32Array(PMAX), pGrav = new Float32Array(PMAX), pSz = new Float32Array(PMAX);
let pHead = 0;
for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -999;
const pGeo = new T.BufferGeometry();
pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3).setUsage(T.DynamicDrawUsage));
pGeo.setAttribute('pcol', new T.BufferAttribute(pCol, 3).setUsage(T.DynamicDrawUsage));
pGeo.setAttribute('psize', new T.BufferAttribute(pSize, 1).setUsage(T.DynamicDrawUsage));
const pMat = new T.ShaderMaterial({
  uniforms: { scale: { value: 600 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
  vertexShader: 'attribute vec3 pcol; attribute float psize; uniform float scale; varying vec3 vC; void main(){ vC=pcol; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(psize*scale*1.7/max(0.5,-mv.z),120.0); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'precision mediump float; varying vec3 vC; void main(){ vec2 p=gl_PointCoord-0.5; float a=exp(-dot(p,p)*11.0); gl_FragColor=vec4(vC*a,1.0); }'
});
const pPoints = new T.Points(pGeo, pMat); pPoints.frustumCulled = false; scene.add(pPoints);
function spawnP(x, y, z, vx, vy, vz, life, size, r, g, b, grav) {
  const i = pHead; pHead = (pHead + 1) % PMAX; const j = i * 3;
  pPos[j] = x; pPos[j + 1] = y; pPos[j + 2] = z; pVel[j] = vx; pVel[j + 1] = vy; pVel[j + 2] = vz;
  pBase[j] = r; pBase[j + 1] = g; pBase[j + 2] = b; pLife[i] = pMax[i] = life; pGrav[i] = grav; pSz[i] = size;
}
function burst(x, y, z, n, sp, life, size, r, g, b, grav) {
  if (lowSpec) n = Math.ceil(n * 0.6);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = sp * rnd(0.3, 1);
    spawnP(x, y, z, Math.cos(a) * s * v, u * v, Math.sin(a) * s * v, life * rnd(0.5, 1), size * rnd(0.6, 1.2), r, g, b, grav);
  }
}
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    if (pLife[i] <= 0) continue;
    const j = i * 3; pLife[i] -= dt;
    if (pLife[i] <= 0) { pPos[j + 1] = -999; pSize[i] = 0; continue; }
    pVel[j + 1] -= pGrav[i] * dt;
    pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
    if (pPos[j + 1] < 0.06 && pVel[j + 1] < 0) { pPos[j + 1] = 0.06; pVel[j + 1] *= -0.4; pVel[j] *= 0.7; pVel[j + 2] *= 0.7; }
    const a = pLife[i] / pMax[i];
    pCol[j] = pBase[j] * a; pCol[j + 1] = pBase[j + 1] * a; pCol[j + 2] = pBase[j + 2] * a; pSize[i] = pSz[i];
  }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.pcol.needsUpdate = pGeo.attributes.psize.needsUpdate = true;
}

const BMAX = 110, beams = [];
const beamMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }), BMAX);
beamMesh.frustumCulled = false; beamMesh.count = 0; beamMesh.setColorAt(0, TMP_C.setRGB(1, 1, 1)); scene.add(beamMesh);
function addBeam(ax, ay, az, bx, by, bz, w, life, r, g, b) {
  if (beams.length >= BMAX) beams.shift();
  beams.push({ ax, ay, az, bx, by, bz, w, life, max: life, r, g, b });
}
function addBolt(ax, ay, az, bx, by, bz, w, life, r, g, b, jit) {
  const n = 5; let px = ax, py = ay, pz = az;
  for (let i = 1; i <= n; i++) {
    const t = i / n, j = i === n ? 0 : jit;
    const qx = lerp(ax, bx, t) + rnd(-j, j), qy = lerp(ay, by, t) + rnd(-j, j), qz = lerp(az, bz, t) + rnd(-j, j);
    addBeam(px, py, pz, qx, qy, qz, w, life, r, g, b); px = qx; py = qy; pz = qz;
  }
}
const _q = new T.Quaternion(), _z = V3(0, 0, 1), _d = V3(), _p = V3(), _s = V3();
function updateBeams(dt) {
  let n = 0;
  for (let i = beams.length - 1; i >= 0; i--) { beams[i].life -= dt; if (beams[i].life <= 0) beams.splice(i, 1); }
  for (const b of beams) {
    _d.set(b.bx - b.ax, b.by - b.ay, b.bz - b.az); const len = _d.length() || 0.001; _d.multiplyScalar(1 / len);
    _q.setFromUnitVectors(_z, _d); const a = b.life / b.max, w = b.w * (0.3 + 0.7 * a);
    TMP_M.compose(_p.set((b.ax + b.bx) / 2, (b.ay + b.by) / 2, (b.az + b.bz) / 2), _q, _s.set(w, w, len));
    beamMesh.setMatrixAt(n, TMP_M); beamMesh.setColorAt(n, TMP_C.setRGB(b.r * a, b.g * a, b.b * a)); n++;
  }
  beamMesh.count = n; beamMesh.instanceMatrix.needsUpdate = true; beamMesh.instanceColor.needsUpdate = true;
}

const shellGeo = new T.IcosahedronGeometry(1, 2), ringGeo = new T.RingGeometry(0.82, 1, 40);
ringGeo.rotateX(-Math.PI / 2);
const shells = [];
function addShell(x, y, z, r0, r1, life, r, g, b, ring) {
  let s = shells.find(q => q.life <= 0 && q.ring === !!ring);
  if (!s) {
    if (shells.length > 26) return;
    const m = new T.Mesh(ring ? ringGeo : shellGeo, new T.MeshBasicMaterial({ wireframe: !ring, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
    s = { mesh: m, ring: !!ring, life: 0 }; shells.push(s); scene.add(m);
  }
  s.life = s.max = life; s.r0 = r0; s.r1 = r1; s.mesh.position.set(x, y, z); s.mesh.material.color.setRGB(r, g, b); s.mesh.visible = true;
}
function updateShells(dt) {
  for (const s of shells) {
    if (s.life <= 0) continue; s.life -= dt;
    if (s.life <= 0) { s.mesh.visible = false; continue; }
    const a = s.life / s.max, k = 1 - a * a; s.mesh.scale.setScalar(lerp(s.r0, s.r1, k)); s.mesh.material.opacity = a * (s.ring ? 0.9 : 0.75);
  }
}

/* ============================== audio ============================== */
const A = { ctx: null, on: true };
function audioInit() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext; const c = new C(); A.ctx = c;
    A.master = c.createGain(); A.master.gain.value = 0.6;
    const comp = c.createDynamicsCompressor(); A.master.connect(comp); comp.connect(c.destination);
    A.sfx = c.createGain(); A.sfx.gain.value = 0.9; A.sfx.connect(A.master);
    A.mus = c.createGain(); A.mus.gain.value = 0.42; A.mus.connect(A.master);
    A.bus = [c.createGain(), c.createGain()]; A.bus[0].gain.value = 1; A.bus[1].gain.value = 0; A.bus[0].connect(A.mus); A.bus[1].connect(A.mus);
    const dl = c.createDelay(0.6); dl.delayTime.value = 0.3; const fb = c.createGain(); fb.gain.value = 0.35; A.bus[1].connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(A.mus);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; A.nbuf = nb;
    if (c.state === 'suspended') c.resume();
  } catch (e) { A.ctx = null; }
}
function env(g, t, a, v, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(type, f0, f1, dur, vol, dest, t) {
  const c = A.ctx; if (!c) return; t = t || c.currentTime;
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, 0.004, vol, dur); o.connect(g); g.connect(dest || A.sfx); o.start(t); o.stop(t + dur + 0.06);
}
function noise(dur, vol, type, f0, f1, dest, t, q) {
  const c = A.ctx; if (!c) return; t = t || c.currentTime;
  const s = c.createBufferSource(); s.buffer = A.nbuf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur); f.Q.value = q || 0.7;
  const g = c.createGain(); env(g, t, 0.003, vol, dur); s.connect(f); f.connect(g); g.connect(dest || A.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.06);
}
let lastTick = 0, lastCrack = 0;
function duck(v) { if (!A.ctx) return; const t = A.ctx.currentTime, g = A.mus.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.42 * (1 - 0.65 * v), t); g.linearRampToValueAtTime(0.42, t + 0.38); }
const sfx = {
  rocket() { noise(0.25, 0.45, 'bandpass', 900, 200); tone('sawtooth', 220, 55, 0.22, 0.22); },
  boom(v) { noise(0.7, 0.9 * v, 'lowpass', 1800, 60); tone('sine', 120, 26, 0.55, 0.9 * v); tone('sine', 58, 22, 0.95, 0.95 * v); tone('square', 95, 38, 0.06, 0.3 * v); duck(v); },
  arc() { tone('square', rnd(1300, 1700), 380, 0.07, 0.07); },
  jump() { tone('triangle', 300, 520, 0.09, 0.12); },
  djump() { tone('triangle', 420, 860, 0.1, 0.14); noise(0.1, 0.12, 'highpass', 2000, 4000); },
  dash() { noise(0.24, 0.4, 'bandpass', 500, 2600); tone('sawtooth', 90, 240, 0.2, 0.2); },
  blink() { tone('sine', 1900, 300, 0.16, 0.2); noise(0.12, 0.2, 'highpass', 3000, 6000); },
  swap(f) { tone('sawtooth', f ? 180 : 1000, f ? 1300 : 110, 0.22, 0.2); noise(0.26, 0.3, 'bandpass', f ? 600 : 3200, f ? 4200 : 300); tone('square', f ? 660 : 330, f ? 1320 : 165, 0.12, 0.1); },
  hit() { const n = performance.now(); if (n - lastTick < 45) return; lastTick = n; tone('square', 1150, 900, 0.03, 0.06); },
  kill() { tone('square', 600, 1500, 0.1, 0.13); noise(0.15, 0.2, 'bandpass', 1200, 400); },
  hurt() { tone('sawtooth', 150, 50, 0.22, 0.4); noise(0.12, 0.3, 'lowpass', 900, 200); },
  grapple() { tone('square', 500, 1500, 0.12, 0.11); },
  zip() { tone('triangle', 900, 300, 0.1, 0.1); },
  pickup() { tone('sine', 880, 1320, 0.12, 0.18); },
  deflect() { tone('triangle', 2500, 2000, 0.05, 0.1); },
  shatter() { noise(0.3, 0.4, 'highpass', 2500, 6000); tone('triangle', 1800, 600, 0.2, 0.2); },
  slam() { noise(0.8, 1, 'lowpass', 2200, 50); tone('sine', 80, 24, 0.6, 0.9); },
  launch() { tone('sawtooth', 110, 520, 0.25, 0.2); noise(0.2, 0.25, 'bandpass', 400, 1800); },
  wave() { tone('sawtooth', 110, 440, 0.5, 0.18); tone('square', 220, 880, 0.5, 0.08); },
  crack() { const n = performance.now(); if (n - lastCrack < 60) return; lastCrack = n; noise(0.12, 0.2, 'bandpass', 700, 300); },
  det() { tone('square', 320, 70, 0.16, 0.22); noise(0.1, 0.32, 'highpass', 3200, 1200); },
  rumble() { noise(1.0, 0.7, 'lowpass', 260, 50); tone('sine', 48, 30, 0.8, 0.5); },
  ready() { tone('square', 660, 660, 0.08, 0.12); tone('square', 990, 990, 0.14, 0.12, null, A.ctx ? A.ctx.currentTime + 0.09 : 0); },
  overdrive() { tone('sawtooth', 110, 880, 0.6, 0.3); tone('square', 220, 1760, 0.6, 0.14); noise(0.7, 0.4, 'bandpass', 300, 6000); duck(1); },
  shotE() { tone('sine', 700, 260, 0.14, 0.08); },
  die() { tone('sawtooth', 300, 30, 1.2, 0.5); noise(1, 0.5, 'lowpass', 2000, 80); }
};
// procedural music: both forms are always scheduled, the swap just crossfades their buses
const S16 = 60 / 150 / 4; let nextT = 0, stepN = 0;
const BASS = [0, 0, 12, 0, 0, 3, 0, 12, 0, 0, 10, 0, 7, 0, 5, 3], ARP = [0, 7, 12, 15, 19, 15, 12, 7, 0, 7, 12, 17, 19, 17, 12, 7], ROOTS = [0, 0, -4, -2];
const hz = s => 41.2 * Math.pow(2, s / 12);
function schedStep(n, t) {
  const c = A.ctx, s = n % 16, root = ROOTS[Math.floor(n / 16) % 4];
  if (s % 4 === 0) { tone('sine', 150, 42, 0.16, 0.9, A.mus, t); }
  if (s % 4 === 2) noise(0.04, 0.22, 'highpass', 7000, 7000, A.mus, t); else if (s % 2 === 1) noise(0.02, 0.08, 'highpass', 8000, 8000, A.mus, t);
  if (s % 8 === 4) noise(0.12, 0.35, 'bandpass', 1900, 1500, A.mus, t, 0.9);
  { // psycho: gritty saw bass
    const f = hz(root + BASS[s] + 12), o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 0.5; o2.detune.value = 9;
    lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(180, t + 0.1);
    env(g, t, 0.003, 0.3, S16 * 0.95); o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(A.bus[0]);
    o.start(t); o2.start(t); o.stop(t + S16 + 0.05); o2.stop(t + S16 + 0.05);
  }
  { // syber: glassy arp + sub
    const f = hz(root + ARP[s] + 36), o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'square'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 3200;
    env(g, t, 0.003, 0.085, 0.13); o.connect(lp); lp.connect(g); g.connect(A.bus[1]); o.start(t); o.stop(t + 0.2);
    if (s % 8 === 0 || s === 6 || s === 11) tone('triangle', hz(root + 12), hz(root + 12), 0.22, 0.4, A.bus[1], t);
  }
}
setInterval(() => {
  if (!A.ctx || G.state !== 'play') return;
  const now = A.ctx.currentTime; if (nextT < now) nextT = now + 0.05;
  while (nextT < now + 0.14) { schedStep(stepN, nextT); nextT += S16; stepN++; }
}, 30);
function musicBoth() { if (!A.ctx) return; const t = A.ctx.currentTime; A.bus[0].gain.setTargetAtTime(0.9, t, 0.04); A.bus[1].gain.setTargetAtTime(0.9, t, 0.04); }
function setMusicForm(f) {
  if (!A.ctx) return; const t = A.ctx.currentTime;
  A.bus[f].gain.setTargetAtTime(1, t, 0.04); A.bus[1 - f].gain.setTargetAtTime(0, t, 0.04);
}

/* ============================== game state ============================== */
const G = { state: 'menu', score: 0, wave: 0, waveT: 0, queue: [], spawnT: 0, combo: 0, comboT: 0, lastKillForm: -1, sync: 0, smashed: 0, time: 0, shake: 0, fm: 0, sens: 1, shieldHint: false, best: 0 };
try { G.best = +localStorage.getItem('psycho-syber.arena.best') || 0; G.sens = +localStorage.getItem('psycho-syber.arena.sens') || 1; } catch (e) { }
const P = {
  pos: V3(), vel: V3(), r: 0.4, h: 1.7, onGround: false, hitWall: false, wnx: 0, wnz: 0, smash: false, smashY: false,
  yaw: 0, pitch: 0, hp: 100, form: PSYCHO, inv: 0, fireCd: 0, dashCd: 0, altCd: 0, swapCd: 0, surge: 0,
  coyote: 0, wallT: 0, airJumps: 1, ramT: 0, ramId: 0, ramDir: V3(), slamming: false, blinks: 2, blinkT: 0,
  grapple: null, gCd: 0, dip: 0, dipV: 0, roll: 0, fovKick: 0, recoil: 0, swapAnim: 0, flashT: 0, bob: 0
};
const In = { keys: {}, jx: 0, jy: 0, mFire: false, tFire: false, mAlt: false, tAlt: false, tJump: false, altPressed: false, jumpPressed: false, dashPressed: false, swapPressed: false, lx: 0, ly: 0 };
const enemies = [], projs = [], picks = [], detQ = [];
P.rocketCd = 0; P.arcCd = 0; P.meteor = null; P.hitCeil = false; P.up = { sto: 0, dyn: 0, gen: 0, geo: 0, exp: 0 };
G.mode = 'wave'; let SRC = '';
const blinkCd = () => 1.3 * (1 - 0.15 * P.up.dyn);
G.meter = 0; G.od = 0; G.hitstop = 0; G.ca = 0; G.flash = 0; G.crushing = false; G.syncHint = false; G.noAuto = false;

/* ============================== HUD ============================== */
const H = { bossn: $('bossn'), obj: $('obj'), syf: $('syf'), form: $('form'), hpf: $('hpf'), hpn: $('hpn'), score: $('score'), combo: $('combo'), wave: $('wave'), xh: $('xh'), dmg: $('dmg'), glitch: $('glitch'), boss: $('boss'), bossf: $('bossf'), hint: $('hint'), cdd: $('cdd'), cda: $('cda'), cds: $('cds2'), cddn: $('cddn'), cdan: $('cdan'), bFire: $('b-fire'), bAlt: $('b-alt'), bDash: $('b-dash') };
const hudCache = {};
function setText(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; } }
function retrig(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function banner(t, s) { $('bt').textContent = t; $('bs').textContent = s || ''; retrig($('banner'), 'show'); }
function toast(t) { $('toast').textContent = t; retrig($('toast'), 'show'); }
let hintT = 0;
function hint(t, dur, title) {
  H.hint.textContent = ''; if (title) { const b = document.createElement('b'); b.className = 'hn'; b.textContent = title; H.hint.appendChild(b); }
  H.hint.appendChild(document.createTextNode(t)); H.hint.classList.add('show'); hintT = dur || 5;
}
function setObj(t) { if (hudCache.obj !== t) { hudCache.obj = t; H.obj.textContent = t; } }
let hitT = 0, killT = 0;
function hitmarker() { H.xh.classList.add('hit'); hitT = 0.08; sfx.hit(); }
function killmarker() { H.xh.classList.add('kill'); killT = 0.16; }
function applyFormUI() {
  stage.classList.toggle('syber', P.form === SYBER); stage.classList.toggle('psycho', P.form === PSYCHO);
  H.form.textContent = G.od > 0 ? 'Psycho Syber' : FNAME[P.form];
  H.cddn.textContent = P.form === PSYCHO ? 'RAM' : 'BLINK'; H.cdan.textContent = P.form === PSYCHO ? 'SLAM' : 'GRAPPLE';
  H.bFire.textContent = P.form === PSYCHO ? 'ROCKET' : 'ARC'; H.bAlt.textContent = P.form === PSYCHO ? 'SLAM' : 'GRAPPLE'; H.bDash.textContent = P.form === PSYCHO ? 'RAM' : 'BLINK';
}
function updateHUD(dt) {
  setText(H.score, 'score', G.mode === 'duel' ? (D.role === 'lead' ? D.score[0] + ' : ' + D.score[1] : D.score[1] + ' : ' + D.score[0]) : String(G.score));
  const hp = Math.max(0, Math.ceil(P.hp));
  if (hudCache.hp !== hp) { hudCache.hp = hp; H.hpf.style.width = hp + '%'; H.hpn.textContent = hp + ' HP'; }
  const mult = 1 + Math.min(7, Math.floor(G.combo / 3));
  setText(H.combo, 'combo', G.combo > 1 ? '×' + mult + ' · ' + G.combo + ' CHAIN' : '');
  setText(H.wave, 'wave', G.mode === 'duel' ? 'DUEL · ROUND ' + roman(D.round) + ' · YOU : RIVAL' : G.wave < 1 ? 'GET READY' : 'WAVE ' + roman(G.wave) + ' · ' + (enemies.length + G.queue.length) + ' LEFT');
  const dr = P.form === PSYCHO ? 1 - P.dashCd / 1.5 : (P.blinks + (P.blinks < 2 ? 1 - P.blinkT / 1.3 : 0)) / 2;
  const ar = P.form === PSYCHO ? (P.altCd > 0 ? 1 - P.altCd / 2.2 : 1) : (P.gCd > 0 ? 0.3 : 1);
  H.cdd.style.transform = 'scaleX(' + clamp(dr, 0, 1).toFixed(2) + ')'; H.cda.style.transform = 'scaleX(' + clamp(ar, 0, 1).toFixed(2) + ')';
  H.cds.style.transform = 'scaleX(' + clamp(1 - P.swapCd / 0.35, 0, 1).toFixed(2) + ')';
  const dw = P.form === PSYCHO ? P.dashCd > 0 : P.blinks <= 0, aw = P.form === PSYCHO ? P.altCd > 0.3 : false;
  if (hudCache.dw !== dw) { hudCache.dw = dw; H.bDash.classList.toggle('wait', dw); }
  if (hudCache.aw !== aw) { hudCache.aw = aw; H.bAlt.classList.toggle('wait', aw); }
  const sg = P.surge > 0; if (hudCache.sg !== sg) { hudCache.sg = sg; stage.classList.toggle('surge', sg); }
  if (hitT > 0) { hitT -= dt; if (hitT <= 0) H.xh.classList.remove('hit'); }
  if (killT > 0) { killT -= dt; if (killT <= 0) H.xh.classList.remove('kill'); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) H.hint.classList.remove('show'); }
  const sv = G.od > 0 ? Math.min(1, G.od / 9) : G.meter / 100, svq = Math.round(sv * 50);
  if (hudCache.sv !== svq) { hudCache.sv = svq; H.syf.style.width = Math.round(sv * 100) + '%'; }
  const rdy = G.meter >= 100 && G.od <= 0; if (hudCache.rdy !== rdy) { hudCache.rdy = rdy; stage.classList.toggle('ready', rdy); }
  const boss = enemies.find(e => e.type >= 3), bk = boss ? boss.type : -1;
  if (hudCache.boss !== bk) { hudCache.boss = bk; H.boss.style.display = boss ? 'block' : 'none'; if (boss) H.bossn.textContent = boss.type >= 4 ? 'Rival · ' + FNAME[boss.type - 4] : 'The Kernel'; }
  if (boss) H.bossf.style.width = clamp(boss.hp / boss.maxHp * 100, 0, 100).toFixed(1) + '%';
}

/* ============================== view models ============================== */
const gunMat = new T.MeshBasicMaterial({ vertexColors: true, fog: false });
const gunPsycho = new T.Mesh(boxParts([
  [0.17, 0.17, 0.72, 0, 0, -0.36, 0x2c2632], [0.22, 0.24, 0.42, 0, -0.02, 0.06, 0x1a1720], [0.24, 0.24, 0.08, 0, 0, -0.74, 0xff5fcf],
  [0.08, 0.2, 0.1, 0, -0.2, 0.12, 0x121016], [0.025, 0.07, 0.42, 0, 0.12, -0.2, 0xc9a866], [0.26, 0.04, 0.2, 0, -0.1, -0.3, 0x8a7448]
]), gunMat);
const gunSyber = new T.Mesh(boxParts([
  [0.07, 0.07, 0.78, 0, 0, -0.42, 0x25303a], [0.11, 0.15, 0.52, 0, -0.03, -0.04, 0x161b22], [0.03, 0.03, 0.26, 0.06, 0, -0.84, 0x5fe3d2],
  [0.03, 0.03, 0.26, -0.06, 0, -0.84, 0x5fe3d2], [0.035, 0.05, 0.2, 0, 0.09, -0.1, 0xc9a866], [0.07, 0.18, 0.09, 0, -0.18, 0.12, 0x0e1116], [0.14, 0.03, 0.3, 0, -0.07, -0.34, 0x5fe3d2]
]), gunMat);
const gunRoot = new T.Group(); gunRoot.add(gunPsycho, gunSyber); gunScene.add(gunRoot); gunRoot.scale.setScalar(0.72);
const flashMat = new T.MeshBasicMaterial({ transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, side: T.DoubleSide, fog: false });
const flash = new T.Mesh(new T.PlaneGeometry(0.34, 0.34), flashMat); flash.position.set(0, 0, -0.9); flash.visible = false; gunRoot.add(flash);
const rope = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0x9af8ff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
rope.visible = false; rope.frustumCulled = false; scene.add(rope);

/* ============================== physics ============================== */
function moveBody(b, dt) {
  const sp = Math.max(Math.abs(b.vel.x), Math.abs(b.vel.y), Math.abs(b.vel.z));
  const n = Math.max(1, Math.ceil(sp * dt / 0.3)), h = dt / n;
  b.onGround = false; b.hitWall = false; b.hitCeil = false;
  for (let s = 0; s < n; s++) {
    const nx = b.pos.x + b.vel.x * h;
    if (boxHit(nx, b.pos.y, b.pos.z, b.r, b.h) && !(b.smash && !smashBox(nx, b.pos.y, b.pos.z, b.r, b.h))) { b.hitWall = true; b.wnx = b.vel.x > 0 ? -1 : 1; b.wnz = 0; b.vel.x = 0; } else b.pos.x = nx;
    const nz = b.pos.z + b.vel.z * h;
    if (boxHit(b.pos.x, b.pos.y, nz, b.r, b.h) && !(b.smash && !smashBox(b.pos.x, b.pos.y, nz, b.r, b.h))) { b.hitWall = true; b.wnz = b.vel.z > 0 ? -1 : 1; b.wnx = 0; b.vel.z = 0; } else b.pos.z = nz;
    const ny = b.pos.y + b.vel.y * h;
    if (boxHit(b.pos.x, ny, b.pos.z, b.r, b.h) && !(b.smashY && !smashBox(b.pos.x, ny, b.pos.z, b.r, b.h))) {
      if (b.vel.y < 0) { const top = (Math.floor(ny / BS) + 1) * BS; if (!boxHit(b.pos.x, top, b.pos.z, b.r, b.h)) b.pos.y = top; b.onGround = true; } else b.hitCeil = true;
      b.vel.y = 0;
    } else b.pos.y = ny;
  }
}
function aimDir(o) { const cp = Math.cos(P.pitch); return o.set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp); }
const EYE = V3(), AIM = V3(), MUZ = V3(), _t1 = V3(), _t2 = V3();
function eyePos() { return EYE.set(P.pos.x, P.pos.y + 1.5 + P.dip, P.pos.z); }
function muzzlePos() { const f = aimDir(_t1); return MUZ.set(P.pos.x + Math.cos(P.yaw) * 0.28 + f.x * 0.7, P.pos.y + 1.28 + P.dip + f.y * 0.7, P.pos.z - Math.sin(P.yaw) * 0.28 + f.z * 0.7); }
const RE = { t: 0 };
function rayEnemies(ox, oy, oz, dx, dy, dz, maxD, pad) {
  let best = null, bt = maxD;
  for (const e of enemies) {
    if (e.dead || e.spawnT > 0) continue;
    const cx = e.pos.x - ox, cy = e.pos.y + e.h * 0.5 - oy, cz = e.pos.z - oz, tc = cx * dx + cy * dy + cz * dz, r = e.hr + pad;
    const d2 = cx * cx + cy * cy + cz * cz - tc * tc; if (d2 > r * r) continue;
    const t = tc - Math.sqrt(r * r - d2); if (t > bt || tc < -r) continue;
    bt = Math.max(0, t); best = e;
  }
  RE.t = bt; return best;
}
function assist(d, strength) {
  const e0 = eyePos(); let best = null, bc = 0.975;
  for (const e of enemies) {
    if (e.dead || e.spawnT > 0) continue;
    _t2.set(e.pos.x - e0.x, e.pos.y + e.h * 0.5 - e0.y, e.pos.z - e0.z); const l = _t2.length(); if (l > 80 || l < 0.5) continue;
    const c = _t2.multiplyScalar(1 / l).dot(d); if (c > bc) { bc = c; best = e; }
  }
  if (best) { _t2.set(best.pos.x - e0.x, best.pos.y + best.h * 0.5 - e0.y, best.pos.z - e0.z).normalize(); d.lerp(_t2, strength).normalize(); }
}

/* ============================== combat ============================== */
function boomFx(x, y, z, R, c) {
  const pd = Math.hypot(P.pos.x - x, P.pos.y + 0.9 - y, P.pos.z - z);
  addShell(x, y, z, R * 0.15, R * 0.75, 0.32, c[0], c[1], c[2]); addShell(x, y, z, R * 0.1, R * 0.45, 0.2, 1, 0.95, 0.8);
  burst(x, y, z, 26, R * 3.2, 0.7, 9, 1, 0.75, 0.3, 14); burst(x, y, z, 14, R * 2, 0.5, 13, c[0], c[1], c[2], 0);
  const v = clamp(1.15 - pd / 55, 0.15, 1); G.shake = Math.max(G.shake, v * 0.9); sfx.boom(v); G.flash = Math.max(G.flash, v * 0.1);
}
function explode(x, y, z, R, dmg, blockR, owner, form, noSelf, src) {
  if (owner === 0) { const g = 1 + 0.12 * P.up.geo; R *= g; blockR *= g; SRC = src || (form === 2 ? 'DETONATE' : 'ROCKET'); }
  if (blockR > 0) {
    const x0 = Math.max(0, Math.floor((x - blockR) / BS)), x1 = Math.min(GW - 1, Math.floor((x + blockR) / BS)), y0 = Math.max(0, Math.floor((y - blockR) / BS)), y1 = Math.min(GH - 1, Math.floor((y + blockR) / BS)), z0 = Math.max(0, Math.floor((z - blockR) / BS)), z1 = Math.min(GD - 1, Math.floor((z + blockR) / BS));
    let fxn = 0;
    for (let cy = y0; cy <= y1; cy++) for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      if (!vox[cx + GW * (cz + GD * cy)]) continue;
      const ddx = cx * BS + 1 - x, ddy = cy * BS + 1 - y, ddz = cz * BS + 1 - z;
      if (ddx * ddx + ddy * ddy + ddz * ddz < blockR * blockR) destroyBlock(cx, cy, cz, fxn++ < 14);
    }
  }
  let det = false, hits = 0;
  if (owner === 0) for (const e of enemies) {
    if (e.dead) continue;
    const ex = e.pos.x - x, ey = e.pos.y + e.h * 0.5 - y, ez = e.pos.z - z, d = Math.hypot(ex, ey, ez);
    if (d < R + e.hr) { const f = 1 - clamp((d - e.hr) / R, 0, 1), k = f * 16 / (d || 1); if (form === PSYCHO) { if (e.tag > 0) det = true; if (e.mass <= 5) e.launched = 1.6; } if (damageEnemy(e, dmg * (0.35 + 0.65 * f), form, ex * k, ey * k + f * 7, ez * k)) hits++; }
  }
  if (det) detonate(x, y, z);
  const px = P.pos.x - x, py = P.pos.y + 0.9 - y, pz = P.pos.z - z, pd = Math.hypot(px, py, pz) || 0.01;
  if (pd < R && !noSelf) {
    const f = 1 - pd / R;
    if (owner === 0) { const k = (f * 22 + 5) / pd; P.vel.x += px * k; P.vel.y += py * k + 3 * f; P.vel.z += pz * k; P.onGround = false; P.coyote = 0; }
    else { hurtPlayer(dmg * (0.3 + 0.7 * f)); const k = f * 9 / pd; P.vel.x += px * k; P.vel.y += py * k + 2; P.vel.z += pz * k; }
  }
  boomFx(x, y, z, R, owner === 0 ? FCOL[form] : [1, 0.25, 0.15]);
  if (owner === 0 && G.mode === 'duel') netSend(['b', r2(x), r2(y), r2(z), r2(R), form]);
  return hits;
}
// ---- cross-form combos: tag (Syber) -> detonate (Psycho), sync meter -> the merged form
function detonate(x, y, z) {
  let n = 0, px = x, py = y, pz = z;
  for (const e of enemies) {
    if (e.dead || e.spawnT > 0 || e.tag <= 0) continue;
    if (Math.hypot(e.pos.x - x, e.pos.y - y, e.pos.z - z) > 36) continue;
    e.tag = 0; detQ.push({ e, t: 0.05 + n * 0.07, fx: px, fy: py, fz: pz }); px = e.pos.x; py = e.pos.y + e.h * 0.5; pz = e.pos.z; n++;
  }
  if (n) { toast('DETONATE x' + n); addSync(5 * n); }
}
function updateDet(dt) {
  for (let i = detQ.length - 1; i >= 0; i--) {
    const q = detQ[i]; q.t -= dt; if (q.t > 0) continue; detQ.splice(i, 1); const e = q.e; if (e.dead) continue;
    const cx = e.pos.x, cy = e.pos.y + e.h * 0.5, cz = e.pos.z;
    addBolt(q.fx, q.fy, q.fz, cx, cy, cz, 0.13, 0.22, 1, 1, 1, 0.8);
    SRC = 'DETONATE'; damageEnemy(e, 70, 2, 0, 10, 0); explode(cx, cy, cz, 4.5, 40, 2.3, 0, 2, true);
    G.hitstop = Math.max(G.hitstop, 0.03); sfx.det();
  }
}
function addSync(v) {
  if (G.od > 0 || G.state !== 'play' || G.mode === 'duel') return; const was = G.meter; G.meter = Math.min(100, G.meter + v * (1 + 0.25 * P.up.exp));
  if (was < 100 && G.meter >= 100) { sfx.ready(); if (!G.syncHint) { G.syncHint = true; hint('All five rings are lit. Swap now to become Psycho Syber: both weapons, no cooldowns.', 7); } else toast('SYNC READY: SWAP'); }
}
function startOverdrive() {
  G.od = 9 + 1.5 * P.up.exp; G.meter = 0; P.hp = Math.min(100, P.hp + 20); H.dmg.style.opacity = 0;
  const cx = P.pos.x, cy = P.pos.y + 0.9, cz = P.pos.z;
  addShell(cx, cy, cz, 1, 14, 0.28, 1, 1, 1); addShell(cx, P.pos.y + 0.1, cz, 1, 18, 0.5, 1, 0.3, 0.85, true); addShell(cx, P.pos.y + 0.1, cz, 0.5, 13, 0.6, 0.2, 1, 1, true);
  SRC = 'PULSE';
  for (const e of enemies) { const ex = e.pos.x - cx, ez = e.pos.z - cz, d = Math.hypot(ex, e.pos.y - cy, ez) || 1; if (d < 16 + e.hr) damageEnemy(e, 60, 2, ex / d * 16, 8, ez / d * 16); }
  for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; if (p.kind === 0) continue; scene.remove(p.mesh); projs.splice(i, 1); }
  stage.classList.add('od'); H.form.textContent = 'Psycho Syber'; banner('Psycho Syber', 'Both weapons, no cooldowns');
  G.shake = 1; G.flash = 0.35; G.hitstop = 0.12; G.ca = 0.03; sfx.overdrive();
}
function endOverdrive() { G.od = 0; stage.classList.remove('od'); applyFormUI(); setMusicForm(P.form); toast('SYNC SPENT'); }
function startMeteor() {
  const g = P.grapple, dx = g.x - P.pos.x, dy = g.y - (P.pos.y + 0.9), dz = g.z - P.pos.z, d = Math.hypot(dx, dy, dz) || 1;
  P.meteor = { x: g.x, y: g.y, z: g.z, dx: dx / d, dy: dy / d, dz: dz / d, t: Math.min(1.6, d / 60 + 0.3) };
  P.grapple = null; rope.visible = false; P.slamming = false; P.ramT = 0; P.inv = Math.max(P.inv, 0.6); P.fovKick = 14; toast('METEOR'); sfx.dash();
}
function damageEnemy(e, d, form, ix, iy, iz) {
  if (e.dead || e.spawnT > 0) return false;
  if (e.type >= 4) return netHitOut(e, d, ix, iy, iz);
  if (P.surge > 0) d *= 1.5;
  const cx = e.pos.x, cy = e.pos.y + e.h * 0.5, cz = e.pos.z;
  if (e.shield > 0) {
    const sc = FCOL[e.pol];
    if (form !== e.pol && form !== 2) {
      if (e.defT <= 0) { e.defT = 0.18; burst(cx, cy, cz, 5, 7, 0.3, 7, sc[0], sc[1], sc[2], 0); sfx.deflect(); if (!G.shieldHint) { G.shieldHint = true; hint('A shield breaks only to the form of its colour. Rose breaks to Psycho, teal breaks to Syber.', 6); } else toast('WRONG FORM'); }
      return false;
    }
    e.shield -= d; e.flash = 0.1; hitmarker();
    if (e.shield <= 0) { e.shield = 0; e.shT = 6; e.stun = 0.7; addShell(cx, cy, cz, e.hr, e.hr * 3, 0.35, sc[0], sc[1], sc[2]); burst(cx, cy, cz, 30, 16, 0.6, 8, sc[0], sc[1], sc[2], 8); sfx.shatter(); toast('SHIELD BROKEN'); }
    return true;
  }
  e.hp -= d; e.flash = 0.12; e.stag = 0.14; const im = 1 / e.mass; e.vel.x += ix * im; e.vel.y += iy * im; e.vel.z += iz * im;
  hitmarker();
  if (e.hp <= 0) killEnemy(e);
  return true;
}
function killEnemy(e) {
  if (e.dead) return; e.dead = true;
  const cx = e.pos.x, cy = e.pos.y + e.h * 0.5, cz = e.pos.z, c = e.col;
  burst(cx, cy, cz, e.type >= 2 ? 70 : 28, e.type >= 2 ? 22 : 14, 0.9, e.type >= 2 ? 14 : 9, c[0], c[1], c[2], 18);
  addShell(cx, cy, cz, e.hr * 0.5, e.hr * (e.type >= 2 ? 5 : 3), 0.3, c[0], c[1], c[2]);
  G.combo++; G.comboT = 4.5; const mult = 1 + Math.min(7, Math.floor(G.combo / 3)); let pts = e.score * mult, sy = 4;
  if (G.crushing) { pts *= 2; sy += 5; toast('CRUSHED  +' + pts); }
  if (e.launched > 0 && P.form === SYBER) sy += 6;
  if (G.lastKillForm >= 0 && G.lastKillForm !== P.form) { G.sync++; pts *= 2; sy += 10; toast('SYNC KILL x' + G.sync + '  +' + pts); } else if (G.combo > 1 && G.combo % 5 === 0) toast(G.combo + ' CHAIN');
  if (G.lastKillForm === P.form) G.sync = 0;
  G.lastKillForm = P.form; G.score += pts; sfx.kill(); addSync(sy); if (G.od > 0) P.hp = Math.min(100, P.hp + 3);
  G.hitstop = Math.max(G.hitstop, e.type === 3 ? 0.2 : e.type === 2 ? 0.09 : 0.035); killmarker();
  for (let i = 0, n = lowSpec ? 6 : 10; i < n; i++) spawnP(cx + rnd(-0.5, 0.5), cy + rnd(-0.5, 0.5), cz + rnd(-0.5, 0.5), rnd(-9, 9), rnd(4, 14), rnd(-9, 9), rnd(0.8, 1.4), rnd(18, 28), c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 30); G.shake = Math.max(G.shake, e.type >= 2 ? 0.8 : 0.15);
  const drops = e.type === 3 ? 6 : e.type === 2 ? 3 : Math.random() < 0.38 + 0.15 * P.up.gen ? 1 : 0;
  for (let i = 0; i < drops; i++) dropPick(cx, cy, cz);
  if (e.type === 3) { banner('Kernel panic', 'The Kernel is down'); sfx.boom(1); }
}
function hurtPlayer(d) {
  if (P.inv > 0 || (G.state !== 'play' && G.mode !== 'duel')) return;
  P.hp -= d; H.dmg.style.transition = 'none'; H.dmg.style.opacity = clamp(0.35 + d / 30, 0, 1); void H.dmg.offsetWidth; H.dmg.style.transition = 'opacity .5s'; H.dmg.style.opacity = P.hp < 30 ? 0.35 : 0;
  G.shake = Math.max(G.shake, 0.5); sfx.hurt(); G.ca = Math.max(G.ca, 0.014);
  if (P.hp <= 0) { if (G.mode === 'duel') duelDeath(); else die(); }
}
function spawnProj(kind, x, y, z, dx, dy, dz, spd, dmg) {
  const m = new T.Mesh(kind === 1 ? orbGeo : rocketGeo, projMats[kind]); m.position.set(x, y, z);
  if (kind !== 1) m.quaternion.setFromUnitVectors(_z, _d.set(dx, dy, dz));
  scene.add(m); projs.push({ kind, pos: V3(x, y, z), dir: V3(dx, dy, dz), spd, dmg, life: kind === 0 || kind === 3 ? 3 : 6, mesh: m, form: P.form });
}
const rocketGeo = new T.BoxGeometry(0.22, 0.22, 0.7), orbGeo = new T.IcosahedronGeometry(0.32, 1);
const projMats = [new T.MeshBasicMaterial({ color: 0xffd9f2, fog: false }), new T.MeshBasicMaterial({ color: 0xffbf5c, fog: false }), new T.MeshBasicMaterial({ color: 0xff5a36, fog: false }), new T.MeshBasicMaterial({ color: 0xffd9f2, fog: false })];
function fireRocket() {
  const e0 = eyePos(), d = aimDir(AIM); if (touchMode) assist(d, 0.75);
  let t = 90; if (rayVox(e0.x, e0.y, e0.z, d.x, d.y, d.z, 90)) t = RH.t; if (rayEnemies(e0.x, e0.y, e0.z, d.x, d.y, d.z, t, 0)) t = RE.t;
  const m = muzzlePos(); _t2.set(e0.x + d.x * t - m.x, e0.y + d.y * t - m.y, e0.z + d.z * t - m.z); if (t < 2.5) _t2.copy(d); _t2.normalize();
  spawnProj(0, m.x, m.y, m.z, _t2.x, _t2.y, _t2.z, 58, 115);
  if (G.mode === 'duel') netSend(['r', r2(m.x), r2(m.y), r2(m.z), r2(_t2.x), r2(_t2.y), r2(_t2.z)]);
  P.recoil = 1; P.flashT = 0.06; flashMat.color.setRGB(1, 0.6, 0.9); sfx.rocket(); G.shake = Math.max(G.shake, 0.12);
}
function fireArc() {
  const e0 = eyePos(), d = aimDir(AIM); if (touchMode) assist(d, 0.85);
  const s = 0.012; d.x += rnd(-s, s); d.y += rnd(-s, s); d.z += rnd(-s, s); d.normalize();
  const hv = rayVox(e0.x, e0.y, e0.z, d.x, d.y, d.z, 130); let t = hv ? RH.t : 130;
  const bx = RH.x, by = RH.y, bz = RH.z, bk = RH.kind, nx = RH.nx, ny = RH.ny, nz = RH.nz;
  const e = rayEnemies(e0.x, e0.y, e0.z, d.x, d.y, d.z, t, 0.15); if (e) t = RE.t;
  const hx = e0.x + d.x * t, hy = e0.y + d.y * t, hz2 = e0.z + d.z * t, m = muzzlePos();
  addBeam(m.x, m.y, m.z, hx, hy, hz2, 0.07, 0.09, 0.3, 1, 1);
  if (G.mode === 'duel') { D.shotN++; D.shot[0] = hx; D.shot[1] = hy; D.shot[2] = hz2; }
  if (e) {
    const jug = e.launched > 0 && !e.onGround; if (jug && !e.jug) { e.jug = true; toast('JUGGLE x2'); }
    SRC = jug ? 'JUGGLE' : 'ARC';
    if (damageEnemy(e, (jug ? 22 : 11) * (Math.random() < 0.12 * P.up.sto ? 2 : 1), SYBER, d.x * 2.5, 0.5, d.z * 2.5)) e.tag = 6;
    burst(hx, hy, hz2, 3, 8, 0.25, 6, 0.4, 1, 1, 0);
    let from = e, hops = (P.surge > 0 ? 3 : 1) + P.up.sto; const seen = [e];
    while (hops-- > 0) {
      let nb = null, nd = 11;
      for (const o of enemies) { if (o.dead || o.spawnT > 0 || seen.indexOf(o) >= 0) continue; const dd = Math.hypot(o.pos.x - from.pos.x, o.pos.y - from.pos.y, o.pos.z - from.pos.z); if (dd < nd) { nd = dd; nb = o; } }
      if (!nb) break;
      addBolt(from.pos.x, from.pos.y + from.h * 0.5, from.pos.z, nb.pos.x, nb.pos.y + nb.h * 0.5, nb.pos.z, 0.06, 0.12, 0.5, 1, 1, 0.5);
      SRC = 'CHAIN'; if (damageEnemy(nb, 6.5, SYBER, 0, 0, 0)) nb.tag = 6; seen.push(nb); from = nb;
    }
  } else if (hv) {
    if (bk === 1) damageBlock(bx, by, bz, 14);
    for (let i = 0; i < 2; i++) spawnP(hx, hy, hz2, nx * 6 + rnd(-4, 4), ny * 6 + rnd(-4, 4), nz * 6 + rnd(-4, 4), 0.3, 6, 0.4, 1, 1, 10);
  }
  P.recoil = Math.min(1, P.recoil + 0.35); P.flashT = 0.04; flashMat.color.setRGB(0.5, 1, 1); sfx.arc();
}
function swapForm() {
  if (P.swapCd > 0) return; P.swapCd = 0.35;
  if (P.grapple) startMeteor();
  const nf = 1 - P.form; P.form = nf; P.surge = 3; P.dashCd = 0; P.altCd = Math.min(P.altCd, 0); P.blinks = 2; P.blinkT = 0; P.gCd = 0; P.rocketCd = Math.min(P.rocketCd, 0.08); P.arcCd = Math.min(P.arcCd, 0.08);
  const c = FCOL[nf], cx = P.pos.x, cy = P.pos.y + 0.9, cz = P.pos.z;
  addShell(cx, cy, cz, 1, 9, 0.3, c[0], c[1], c[2]); addShell(cx, P.pos.y + 0.1, cz, 0.5, 9, 0.35, c[0], c[1], c[2], true);
  for (const e of enemies) { const ex = e.pos.x - cx, ey = e.pos.y + e.h * 0.5 - cy, ez = e.pos.z - cz, d = Math.hypot(ex, ey, ez); if (d < 8 + e.hr) { const k = 14 / (d || 1); SRC = 'PULSE'; damageEnemy(e, 25, nf, ex * k, 6, ez * k); } }
  for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; if (p.kind === 0) continue; if (p.pos.distanceTo(_t1.set(cx, cy, cz)) < 10) { burst(p.pos.x, p.pos.y, p.pos.z, 6, 6, 0.3, 7, c[0], c[1], c[2], 0); scene.remove(p.mesh); projs.splice(i, 1); G.score += 10; } }
  P.swapAnim = 1; P.fovKick = 9; retrig(H.glitch, 'go'); applyFormUI(); sfx.swap(nf); G.ca = Math.max(G.ca, 0.02); G.flash = Math.max(G.flash, 0.1);
  if (G.meter >= 100 && G.od <= 0) startOverdrive();
  if (G.od > 0) musicBoth(); else setMusicForm(nf);
}
function ram() {
  if (P.dashCd > 0) return; P.dashCd = 1.5 * (1 - 0.15 * P.up.dyn); P.ramT = 0.24; P.ramId++; aimDir(P.ramDir); P.inv = Math.max(P.inv, 0.3); P.slamming = false; P.meteor = null; P.fovKick = 12; sfx.dash();
}
function blink() {
  if (P.blinks <= 0) return; P.blinks--; if (P.blinkT <= 0) P.blinkT = blinkCd();
  const d = aimDir(AIM), ox = P.pos.x, oy = P.pos.y, oz = P.pos.z; let x = ox, y = oy, z = oz;
  for (let s = 0.25; s <= 10; s += 0.25) { const nx = ox + d.x * s, ny = Math.max(0, oy + d.y * s), nz = oz + d.z * s; if (boxHit(nx, ny, nz, P.r, P.h)) break; x = nx; y = ny; z = nz; }
  for (let i = 0; i < 14; i++) { const t = i / 14; spawnP(lerp(ox, x, t), lerp(oy, y, t) + rnd(0.3, 1.5), lerp(oz, z, t), rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), 0.4, 10, 0.2, 1, 1, 0); }
  addBeam(ox, oy + 1, oz, x, y + 1, z, 0.25, 0.18, 0.1, 0.7, 0.8);
  P.pos.set(x, y, z); const sp = Math.max(P.vel.length(), 17); P.vel.set(d.x * sp, d.y * sp + 2.5, d.z * sp);
  P.inv = Math.max(P.inv, 0.28); P.fovKick = 10; P.onGround = false; sfx.blink(); D.blinkN++;
}
function psychoAlt() {
  if (P.onGround || P.coyote > 0) { P.vel.y = 22; P.onGround = false; P.coyote = 0; P.airJumps = 1; addShell(P.pos.x, P.pos.y + 0.1, P.pos.z, 0.4, 4, 0.3, 1, 0.3, 0.8, true); burst(P.pos.x, P.pos.y, P.pos.z, 12, 8, 0.4, 8, 1, 0.5, 0.2, 10); sfx.launch(); }
  else if (!P.slamming && P.altCd <= 0) { P.slamming = true; P.meteor = null; P.vel.x *= 0.25; P.vel.z *= 0.25; P.vel.y = -64; P.ramT = 0; sfx.dash(); }
}
function slamImpact(k) {
  k = k || 1; P.slamming = false; P.altCd = 2.2;
  const hits = explode(P.pos.x, P.pos.y + 0.4, P.pos.z, 10 * k, 130 * k, 4.4 * k, 0, PSYCHO, true, k > 1 ? 'METEOR' : 'SLAM');
  addShell(P.pos.x, P.pos.y + 0.15, P.pos.z, 1, 12, 0.45, 1, 0.3, 0.85, true); addShell(P.pos.x, P.pos.y + 0.15, P.pos.z, 0.5, 7, 0.3, 1, 0.8, 0.3, true);
  P.vel.y = 7; P.dipV = -6; G.shake = 1.2; sfx.slam();
  if (hits) { G.hitstop = Math.max(G.hitstop, 0.07); if (k > 1) addSync(6); }
}
function fireGrapple() {
  if (P.gCd > 0) return;
  const e0 = eyePos(), d = aimDir(AIM); if (touchMode) assist(d, 0.5);
  const hv = rayVox(e0.x, e0.y, e0.z, d.x, d.y, d.z, 75); let t = hv ? RH.t : 75;
  const e = rayEnemies(e0.x, e0.y, e0.z, d.x, d.y, d.z, t, 0.6);
  if (e) { P.grapple = { x: 0, y: 0, z: 0, e }; sfx.grapple(); }
  else if (hv) { P.grapple = { x: e0.x + d.x * t, y: e0.y + d.y * t, z: e0.z + d.z * t, e: null }; burst(P.grapple.x, P.grapple.y, P.grapple.z, 6, 6, 0.3, 7, 0.4, 1, 1, 0); sfx.grapple(); }
  else { const m = muzzlePos(); addBeam(m.x, m.y, m.z, e0.x + d.x * 40, e0.y + d.y * 40, e0.z + d.z * 40, 0.05, 0.15, 0.2, 0.6, 0.7); P.gCd = 0.25; sfx.zip(); }
}
function releaseGrapple(boost) {
  if (!P.grapple) return; P.grapple = null; P.gCd = 0.25; rope.visible = false;
  if (boost && P.vel.y > -4) P.vel.y += 4;
  sfx.zip();
}

/* ============================== player ============================== */
function accelerate(wx, wz, wishSpeed, accel, dt) {
  const cur = P.vel.x * wx + P.vel.z * wz, add = wishSpeed - cur; if (add <= 0) return;
  const a = Math.min(accel * dt * wishSpeed, add); P.vel.x += wx * a; P.vel.z += wz * a;
}
function updatePlayer(dt) {
  const K = In.keys;
  let mz = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + In.jy, mx = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + In.jx;
  const kt = (K.ArrowLeft ? 1 : 0) - (K.ArrowRight ? 1 : 0); if (kt) P.yaw += kt * 2.6 * dt;
  let ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; ml = 1; }
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let wx = -sy * mz + cy * mx, wz = -cy * mz - sy * mx; if (ml > 0.001) { wx /= ml; wz /= ml; }
  const maxS = (P.form === PSYCHO ? 12.5 : 14.5) * (1 + 0.07 * P.up.dyn), fz = !!P.frozen, jumpHeld = !fz && (K.Space || In.tJump);
  if (fz) { mx = mz = ml = 0; In.swapPressed = In.dashPressed = In.altPressed = In.jumpPressed = false; }
  // timers
  P.inv -= dt; P.fireCd -= dt; P.rocketCd -= dt; P.arcCd -= dt;
  if (G.od > 0) { P.dashCd = 0; P.altCd = Math.min(P.altCd, 0); P.blinks = 2; P.surge = Math.max(P.surge, 0.3); }
  P.dashCd -= dt; P.altCd -= dt; P.swapCd -= dt; P.surge -= dt; P.gCd -= dt;
  if (P.blinks < 2) { P.blinkT -= dt; if (P.blinkT <= 0) { P.blinks++; P.blinkT = P.blinks < 2 ? blinkCd() : 0; } }
  // actions
  if (In.swapPressed) { if (G.mode !== 'duel') swapForm(); else if (!(D.lockT > 0)) { D.lockT = 2; toast('FORMS ARE LOCKED THIS ROUND'); } }
  if (In.dashPressed) { if (P.form === PSYCHO) ram(); else blink(); }
  const altHeld = In.mAlt || In.tAlt;
  if (P.form === PSYCHO) { if (In.altPressed) psychoAlt(); }
  else { if (In.altPressed && !P.grapple) fireGrapple(); if (P.grapple && !altHeld) releaseGrapple(true); }
  if ((In.mFire || In.tFire) && P.ramT <= 0 && !fz) {
    const od = G.od > 0;
    if ((od || P.form === PSYCHO) && P.rocketCd <= 0) { fireRocket(); P.rocketCd = P.surge > 0 ? 0.3 : 0.42; }
    if ((od || P.form === SYBER) && P.arcCd <= 0) { fireArc(); P.arcCd = 0.075; }
  }
  // jumping
  let jumped = false;
  if (jumpHeld && P.coyote > 0 && P.vel.y <= 1 && !P.slamming) { P.vel.y = 13.5; P.coyote = 0; P.airJumps = 1; jumped = true; sfx.jump(); }
  else if (In.jumpPressed && !P.onGround) {
    if (P.form === PSYCHO && P.airJumps > 0) { P.airJumps--; P.vel.y = Math.max(P.vel.y, 0) * 0.3 + 13.5; if (ml > 0.1) { P.vel.x += wx * 3; P.vel.z += wz * 3; } addShell(P.pos.x, P.pos.y, P.pos.z, 0.3, 2.2, 0.25, 1, 0.3, 0.85, true); sfx.djump(); }
    else if (P.form === SYBER && P.wallT > 0) { P.wallT = 0; P.vel.y = 14; P.vel.x += P.wnx * 11; P.vel.z += P.wnz * 11; burst(P.pos.x - P.wnx * 0.4, P.pos.y + 0.5, P.pos.z - P.wnz * 0.4, 8, 6, 0.3, 7, 0.3, 1, 1, 0); sfx.djump(); }
  }
  // ground / air movement
  if (P.ramT > 0) {
    P.ramT -= dt; P.vel.set(P.ramDir.x * 36, P.ramDir.y * 26, P.ramDir.z * 36); P.smash = P.smashY = true;
    for (const e of enemies) { if (e.ramId === P.ramId || e.dead) continue; if (Math.hypot(e.pos.x - P.pos.x, e.pos.y + e.h * 0.5 - P.pos.y - 0.9, e.pos.z - P.pos.z) < e.hr + 1.5) { e.ramId = P.ramId; const tg = e.tag > 0; if (e.mass <= 5) e.launched = 1.6; SRC = 'RAM'; damageEnemy(e, 85, PSYCHO, P.ramDir.x * 20, 9, P.ramDir.z * 20); if (tg) detonate(e.pos.x, e.pos.y, e.pos.z); G.hitstop = Math.max(G.hitstop, 0.06); G.shake = Math.max(G.shake, 0.5); } }
    for (let i = 0; i < 3; i++) spawnP(P.pos.x + rnd(-0.4, 0.4), P.pos.y + rnd(0.2, 1.6), P.pos.z + rnd(-0.4, 0.4), 0, 0, 0, 0.35, 12, 1, 0.3, 0.85, 0);
    if (P.ramT <= 0) { P.vel.multiplyScalar(0.5); P.smash = P.smashY = false; }
  } else if (P.meteor) {
    const m = P.meteor; m.t -= dt; P.smash = P.smashY = false; P.vel.set(m.dx * 62, m.dy * 62, m.dz * 62);
    for (let i = 0; i < 4; i++) { const c = FCOL[i & 1]; spawnP(P.pos.x + rnd(-0.5, 0.5), P.pos.y + rnd(0.2, 1.6), P.pos.z + rnd(-0.5, 0.5), 0, 0, 0, 0.4, 13, c[0], c[1], c[2], 0); }
  } else {
    P.smash = P.smashY = false;
    if (P.onGround && !jumped) {
      const sp = Math.hypot(P.vel.x, P.vel.z);
      if (sp > 0.01) { const drop = Math.max(sp, 4) * 7.5 * dt, k = Math.max(sp - drop, 0) / sp; P.vel.x *= k; P.vel.z *= k; }
      if (ml > 0.001) accelerate(wx, wz, maxS * ml, 11, dt);
    } else if (ml > 0.001) accelerate(wx, wz, maxS * ml, 3.2, dt);
    P.vel.y -= GRAV * (P.grapple ? 0.3 : 1) * dt;
  }
  // grapple pull
  if (P.grapple) {
    const g = P.grapple; if (g.e) { if (g.e.dead) { releaseGrapple(true); } else { g.x = g.e.pos.x; g.y = g.e.pos.y + g.e.h * 0.5; g.z = g.e.pos.z; } }
    if (P.grapple) {
      const dx = g.x - P.pos.x, dy = g.y - (P.pos.y + 0.9), dz = g.z - P.pos.z, d = Math.hypot(dx, dy, dz) || 0.01;
      P.vel.x += dx / d * 95 * dt; P.vel.y += dy / d * 95 * dt; P.vel.z += dz / d * 95 * dt;
      const sp = P.vel.length(); if (sp > 44) P.vel.multiplyScalar(44 / sp);
      if (g.e && d < g.e.hr + 1.8) { SRC = 'ZIP KICK'; damageEnemy(g.e, 75, SYBER, dx / d * 18, 8, dz / d * 18); P.vel.multiplyScalar(0.35); P.vel.y = 13; G.shake = Math.max(G.shake, 0.5); toast('ZIP KICK'); releaseGrapple(false); }
      else if (!g.e && d < 2.4) releaseGrapple(true);
    }
  }
  const wasAir = !P.onGround, fallV = P.vel.y;
  moveBody(P, dt);
  if (P.pos.y > 70) { P.pos.y = 70; P.vel.y = Math.min(P.vel.y, 0); }
  if (P.meteor) {
    const m = P.meteor; let hit = P.onGround || P.hitWall || P.hitCeil || m.t <= 0 || Math.hypot(m.x - P.pos.x, m.y - P.pos.y - 0.9, m.z - P.pos.z) < 2.6;
    if (!hit) for (const e of enemies) { if (!e.dead && e.spawnT <= 0 && Math.hypot(e.pos.x - P.pos.x, e.pos.y + e.h * 0.5 - P.pos.y - 0.9, e.pos.z - P.pos.z) < e.hr + 1.6) { hit = true; break; } }
    if (hit) { P.meteor = null; slamImpact(1.35); P.vel.set(-m.dx * 6, 9, -m.dz * 6); P.onGround = false; }
  }
  if (P.onGround) {
    if (P.slamming) slamImpact();
    else if (wasAir && fallV < -8) { P.dipV = Math.max(-7, fallV * 0.22); if (fallV < -22) { burst(P.pos.x, P.pos.y + 0.1, P.pos.z, 8, 5, 0.3, 6, 1, 1, 1, 6); G.shake = Math.max(G.shake, 0.2); } }
    P.coyote = 0.1; P.airJumps = 1;
  } else P.coyote -= dt;
  if (P.hitWall && !P.onGround) P.wallT = 0.22; else P.wallT -= dt;
  // camera spring + feel
  P.dipV += (-P.dip * 160 - P.dipV * 16) * dt; P.dip += P.dipV * dt; P.dip = clamp(P.dip, -0.5, 0.3);
  P.roll = lerp(P.roll, -mx * 0.035, Math.min(1, dt * 9));
  P.fovKick = Math.max(0, P.fovKick - dt * 40); P.recoil = Math.max(0, P.recoil - dt * 7); P.swapAnim = Math.max(0, P.swapAnim - dt * 5.5); P.flashT -= dt;
  const hs = Math.hypot(P.vel.x, P.vel.z); if (P.onGround) P.bob += hs * dt * 0.75;
  // speed lines
  if (hs > 22 && Math.random() < 0.6) { const f = aimDir(_t1); spawnP(P.pos.x + f.x * 6 + rnd(-3, 3), P.pos.y + 1.5 + rnd(-2, 2), P.pos.z + f.z * 6 + rnd(-3, 3), -P.vel.x * 0.5, 0, -P.vel.z * 0.5, 0.2, 5, 1, 1, 1, 0); }
}

/* ============================== enemies ============================== */
const ET = [
  { r: 0.6, h: 1.25, hr: 1.05, hp: 45, mass: 1, score: 100, col: [1, 0.68, 0.3] },
  { r: 0.5, h: 1.0, hr: 1.05, hp: 32, mass: 1, score: 150, col: [0.62, 0.96, 0.66] },
  { r: 1.1, h: 3.3, hr: 2.0, hp: 340, mass: 5, score: 500, col: [1, 0.36, 0.3] },
  { r: 2.2, h: 4.4, hr: 3.3, hp: 1500, mass: 1e6, score: 3000, col: [1, 0.9, 0.66] },
  { r: 0.4, h: 1.75, hr: 0.95, hp: 100, mass: 1, score: 0, col: [1, 0.37, 0.81] }, // the rival's body as Psycho
  { r: 0.4, h: 1.75, hr: 0.95, hp: 100, mass: 1, score: 0, col: [0.37, 0.89, 0.82] } // the rival's body as Syber
];
// bodies stay dark; the light is carried by the attractor each one wears
const EGEO = [
  boxParts([[1.2, 0.8, 1.3, 0, 0.78, 0, 0x4a2a12], [1.0, 0.34, 0.5, 0, 0.5, 0.72, 0x1c0e06], [0.26, 0.2, 0.1, 0.3, 0.92, 0.66, 0xfff0c0], [0.26, 0.2, 0.1, -0.3, 0.92, 0.66, 0xfff0c0],
  [0.26, 0.45, 0.26, 0.5, 0.22, 0.45, 0x2e1a0a], [0.26, 0.45, 0.26, -0.5, 0.22, 0.45, 0x2e1a0a], [0.26, 0.45, 0.26, 0.5, 0.22, -0.45, 0x2e1a0a], [0.26, 0.45, 0.26, -0.5, 0.22, -0.45, 0x2e1a0a], [0.2, 0.42, 0.2, 0, 1.36, -0.2, 0xffbf5c], [0.16, 0.3, 0.16, 0, 1.3, 0.25, 0xffbf5c]]),
  boxParts([[0.8, 0.8, 0.8, 0, 0.5, 0, 0x1c4028], [1.9, 0.12, 0.5, 0, 0.5, 0, 0x10261a], [0.36, 0.36, 0.14, 0, 0.5, 0.43, 0xf0fff2], [0.12, 0.9, 0.5, 0.98, 0.5, 0, 0x2a6a44], [0.12, 0.9, 0.5, -0.98, 0.5, 0, 0x2a6a44], [0.3, 0.14, 0.3, 0, 1.0, 0, 0x9ff5a8]]),
  boxParts([[0.7, 1.1, 0.8, 0.55, 0.55, 0, 0x2a0a10], [0.7, 1.1, 0.8, -0.55, 0.55, 0, 0x2a0a10], [2.0, 1.5, 1.4, 0, 1.85, 0, 0x54121c], [0.8, 0.6, 0.8, 0, 2.9, 0.1, 0x1c070b], [0.6, 0.18, 0.1, 0, 2.95, 0.52, 0xffe0b0],
  [0.55, 0.55, 1.3, 1.3, 2.2, 0.3, 0x3a0c14], [0.55, 0.55, 1.3, -1.3, 2.2, 0.3, 0x3a0c14], [0.36, 0.36, 0.1, 1.3, 2.2, 0.97, 0xff7a6a], [0.36, 0.36, 0.1, -1.3, 2.2, 0.97, 0xff7a6a], [1.2, 0.2, 0.1, 0, 1.9, 0.72, 0xff8a7a]]),
  (() => { const o = shadeAttr(new T.OctahedronGeometry(2.2, 0), 0x5a4a26); o.deleteAttribute('uv'); o.deleteAttribute('normal'); o.translate(0, 2.2, 0); const b = boxParts([[5.6, 0.3, 0.6, 0, 2.2, 0, 0xe9c47c], [0.6, 0.3, 5.6, 0, 2.2, 0, 0xe9c47c], [0.9, 0.9, 0.2, 0, 2.2, 1.25, 0xff5a36], [0.5, 0.5, 0.5, 0, 4.6, 0, 0xfff3d0]]); const g = new T.BufferGeometry(); const n = o.attributes.position.count + b.attributes.position.count; const p = new Float32Array(n * 3), c = new Float32Array(n * 3); p.set(o.attributes.position.array, 0); c.set(o.attributes.color.array, 0); p.set(b.attributes.position.array, o.attributes.position.count * 3); c.set(b.attributes.color.array, o.attributes.position.count * 3); g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('color', new T.BufferAttribute(c, 3)); g.computeBoundingSphere(); return g; })(),
  boxParts([[0.72, 0.8, 0.46, 0, 1.0, 0, 0x3a3040], [0.44, 0.4, 0.44, 0, 1.6, 0, 0x2a2430], [0.36, 0.1, 0.06, 0, 1.62, 0.23, 0xff5fcf], [1.04, 0.18, 0.5, 0, 1.44, 0, 0xff5fcf], [0.26, 0.6, 0.3, 0.2, 0.3, 0, 0x241e2a], [0.26, 0.6, 0.3, -0.2, 0.3, 0, 0x241e2a], [0.22, 0.22, 0.75, 0.52, 1.15, 0.28, 0xc9a866], [0.26, 0.26, 0.08, 0.52, 1.15, 0.66, 0xff5fcf]]),
  boxParts([[0.5, 0.85, 0.36, 0, 1.0, 0, 0x24303a], [0.36, 0.4, 0.36, 0, 1.62, 0, 0x1a242c], [0.3, 0.08, 0.06, 0, 1.64, 0.19, 0x5fe3d2], [0.08, 0.5, 0.3, 0.32, 1.25, -0.1, 0x5fe3d2], [0.08, 0.5, 0.3, -0.32, 1.25, -0.1, 0x5fe3d2], [0.2, 0.62, 0.24, 0.15, 0.31, 0, 0x161e24], [0.2, 0.62, 0.24, -0.15, 0.31, 0, 0x161e24], [0.08, 0.08, 0.85, 0.38, 1.18, 0.32, 0x5fe3d2]])
];
// strange attractors, integrated with RK4 and normalised to unit radius
function makeAttractor(sys, n, sub) {
  const D = {
    lorenz: { dt: 0.005, p: [0.1, 0, 0], f: (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - 8 / 3 * z] },
    aizawa: { dt: 0.008, p: [0.1, 0, 0], f: (x, y, z) => { const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1; return [(z - b) * x - d * y, d * x + (z - b) * y, c + a * z - z * z * z / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x]; } },
    dadras: { dt: 0.005, p: [1.1, 2.1, -2], f: (x, y, z) => [y - 3 * x + 2.7 * y * z, 1.7 * y - x * z + z, 2 * x * y - 9 * z] },
    thomas: { dt: 0.04, p: [0.1, 0, 0], f: (x, y, z) => { const b = 0.208186; return [Math.sin(y) - b * x, Math.sin(z) - b * y, Math.sin(x) - b * z]; } }
  }[sys];
  let x = D.p[0], y = D.p[1], z = D.p[2]; const dt = D.dt, f = D.f, h = dt / 2;
  function step() {
    const a = f(x, y, z), b = f(x + a[0] * h, y + a[1] * h, z + a[2] * h), c = f(x + b[0] * h, y + b[1] * h, z + b[2] * h), d = f(x + c[0] * dt, y + c[1] * dt, z + c[2] * dt);
    x += dt / 6 * (a[0] + 2 * b[0] + 2 * c[0] + d[0]); y += dt / 6 * (a[1] + 2 * b[1] + 2 * c[1] + d[1]); z += dt / 6 * (a[2] + 2 * b[2] + 2 * c[2] + d[2]);
    if (!isFinite(x) || Math.abs(x) > 1e4) { x = D.p[0]; y = D.p[1]; z = D.p[2]; }
  }
  for (let i = 0; i < 3000; i++) step();
  const pos = new Float32Array(n * 3), t = new Float32Array(n);
  for (let i = 0; i < n; i++) { for (let k = 0; k < sub; k++) step(); pos[i * 3] = x; pos[i * 3 + 1] = z; pos[i * 3 + 2] = y; t[i] = i / (n - 1); }
  let cx = 0, cy = 0, cz = 0; for (let i = 0; i < n; i++) { cx += pos[i * 3]; cy += pos[i * 3 + 1]; cz += pos[i * 3 + 2]; } cx /= n; cy /= n; cz /= n;
  let m = 0; for (let i = 0; i < n; i++) { const r = Math.hypot(pos[i * 3] - cx, pos[i * 3 + 1] - cy, pos[i * 3 + 2] - cz); if (r > m) m = r; }
  const sc = 1 / (m || 1); for (let i = 0; i < n; i++) { pos[i * 3] = (pos[i * 3] - cx) * sc; pos[i * 3 + 1] = (pos[i * 3 + 1] - cy) * sc; pos[i * 3 + 2] = (pos[i * 3 + 2] - cz) * sc; }
  return { pos, t };
}
function cloudGeo(sys, n, sub, stops) {
  const A = makeAttractor(sys, n, sub), col = new Float32Array(n * 3), c = new T.Color(), a = new T.Color(), b = new T.Color();
  for (let i = 0; i < n; i++) { const u = A.t[i] * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(u)); a.set(stops[k]); b.set(stops[k + 1]); c.copy(a).lerp(b, u - k); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(A.pos, 3)); g.setAttribute('aT', new T.BufferAttribute(A.t, 1)); g.setAttribute('aColor', new T.BufferAttribute(col, 3));
  return g;
}
const cloudMat = new T.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSize: { value: 0.15 }, uIntensity: { value: 1 }, uFlow: { value: 5 }, uScaleH: { value: 500 } },
  transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
  vertexShader: `attribute vec3 aColor; attribute float aT; uniform float uTime,uSize,uIntensity,uFlow,uScaleH; varying vec3 vC;
    void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); float d=max(-mv.z,0.15);
      float head=smoothstep(0.93,1.0,fract(aT*uFlow-uTime*0.09)); float tw=0.8+0.2*sin(uTime*1.7+aT*311.0);
      vC=mix(aColor,vec3(1.0,0.97,0.9),head*0.7)*uIntensity*(tw+head*2.2);
      gl_PointSize=clamp(uSize*(1.0+head*0.8)*uScaleH/d,1.0,${lowSpec ? '22.0' : '34.0'}); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: 'varying vec3 vC; void main(){ vec2 p=gl_PointCoord-0.5; float a=exp(-dot(p,p)*14.0); if(a<0.01) discard; gl_FragColor=vec4(vC,a); }'
});
const CN = lowSpec ? 300 : 620;
const CLOUD = [
  { geo: cloudGeo('lorenz', CN, 6, [0xffd27a, 0xff5a36]), size: 0.22, sc: 1.25, k: 0.9 },
  { geo: cloudGeo('aizawa', CN, 6, [0xd8ffd8, 0x2fd07c]), size: 0.2, sc: 1.3, k: 0.9 },
  { geo: cloudGeo('dadras', CN * 2, 5, [0xff9a8a, 0xc0182c]), size: 0.3, sc: 1.3, k: 0.9 },
  { geo: cloudGeo('thomas', CN * 4, 4, [0xfff3d0, 0xe9c47c, 0xff5a36]), size: 0.36, sc: 1.4, k: 0.8 },
  { geo: cloudGeo('lorenz', CN, 6, [0xffd3f0, 0xff5fcf]), size: 0.16, sc: 1.25, k: 0.7 },
  { geo: cloudGeo('aizawa', CN, 6, [0xd6fbf4, 0x5fe3d2]), size: 0.16, sc: 1.25, k: 0.7 }
];
let cloudScaleH = 500, tmI = 0.05;
// a Thomas attractor overhead that brightens as the sync meter fills
const overhead = new T.Points(cloudGeo('thomas', lowSpec ? 9000 : 22000, 2, [0xff5fcf, 0xfff3d0, 0x5fe3d2]), cloudMat.clone());
overhead.material.uniforms.uSize.value = 0.6; overhead.material.uniforms.uFlow.value = 9;
overhead.position.set(CX, 48, CZ); overhead.scale.setScalar(22); overhead.frustumCulled = false; scene.add(overhead);
const shieldGeo = new T.IcosahedronGeometry(1, 1), _up = V3(0, 1, 0);
const tagMesh = new T.InstancedMesh(new T.OctahedronGeometry(1, 0), new T.MeshBasicMaterial({ color: 0xd8ecff, wireframe: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }), 24);
tagMesh.frustumCulled = false; tagMesh.count = 0; scene.add(tagMesh);
function spawnEnemy(type, x, y, z, pol) {
  const d = ET[type], hpK = 1 + (G.wave - 1) * 0.06;
  const mesh = new T.Mesh(EGEO[type], new T.MeshBasicMaterial({ vertexColors: true }));
  const e = { type, pos: V3(x, y, z), vel: V3(), r: d.r, h: d.h, hr: d.hr, hp: d.hp * hpK, maxHp: d.hp * hpK, mass: d.mass, score: d.score, col: d.col, fly: type === 1 || type >= 3, smash: type >= 2, smashY: false, onGround: false, hitWall: false, wnx: 0, wnz: 0, mesh, dead: false, spawnT: 0.6, t: Math.random() * 9, atk: rnd(0.8, 2), flash: 0, stun: 0, stuck: 0, defT: 0, ramId: -1, tag: 0, launched: 0, stag: 0, jug: false, shield: 0, shMax: 0, pol: 0, shT: 0, orb: Math.random() * 6.28, orbSp: rnd(0.25, 0.6) * (Math.random() < 0.5 ? -1 : 1), orbR: rnd(10, 20), orbH: rnd(3, 8), volley: 0, vt: 0, sumT: 5, speed: type === 0 ? Math.min(12, 8 + G.wave * 0.25) : type === 1 ? 10 : type === 2 ? 4.4 : 7 };
  if (type === 3) { e.orbR = 20; e.orbH = 7; e.orbSp = 0.22; }
  if (pol >= 0) {
    e.pol = pol; e.shMax = e.shield = type === 3 ? 170 : type === 2 ? 110 : 45;
    const c = FCOL[pol];
    e.sh1 = new T.Mesh(shieldGeo, new T.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    e.sh2 = new T.Mesh(shieldGeo, new T.MeshBasicMaterial({ transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    e.sh1.material.color.setRGB(c[0], c[1], c[2]); e.sh2.material.color.setRGB(c[0], c[1], c[2]);
    for (const s of [e.sh1, e.sh2]) { s.scale.setScalar(d.hr * 1.2); s.position.y = d.h * 0.5; mesh.add(s); }
  }
  const cl = CLOUD[type]; e.cloud = new T.Points(cl.geo, cloudMat.clone()); e.cloudK = cl.k; e.cloud.material.uniforms.uSize.value = cl.size; e.cloud.material.uniforms.uScaleH.value = cloudScaleH;
  e.cloud.position.y = d.h * 0.5; e.cloud.scale.setScalar(d.hr * cl.sc); e.cloud.frustumCulled = false; mesh.add(e.cloud);
  mesh.position.copy(e.pos); mesh.scale.setScalar(0.01); scene.add(mesh); enemies.push(e);
  addBeam(x, 0, z, x, 60, z, 0.14, 0.8, d.col[0], d.col[1], d.col[2]); addShell(x, y + d.h * 0.5, z, 0.3, d.hr * 2.2, 0.4, d.col[0], d.col[1], d.col[2]);
  return e;
}
function losToPlayer(e) {
  const ox = e.pos.x, oy = e.pos.y + e.h * 0.5, oz = e.pos.z, dx = P.pos.x - ox, dy = P.pos.y + 1 - oy, dz = P.pos.z - oz, d = Math.hypot(dx, dy, dz) || 1;
  return !rayVox(ox, oy, oz, dx / d, dy / d, dz / d, d - 0.6);
}
function enemyShoot(e, kind, spd, dmg, spread, ox, oy) {
  const sx = e.pos.x + (ox || 0), sy = e.pos.y + (oy === undefined ? e.h * 0.5 : oy), sz = e.pos.z;
  let dx = P.pos.x - sx, dy = P.pos.y + 0.9 - sy, dz = P.pos.z - sz; const d = Math.hypot(dx, dy, dz) || 1, lead = d / spd * 0.55;
  dx += P.vel.x * lead; dz += P.vel.z * lead; dx += rnd(-spread, spread) * d; dy += rnd(-spread, spread) * d; dz += rnd(-spread, spread) * d;
  const l = Math.hypot(dx, dy, dz) || 1; spawnProj(kind, sx, sy, sz, dx / l, dy / l, dz / l, spd, dmg); sfx.shotE();
}
function updateEnemies(dt) {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]; e.t += dt; e.flash -= dt; e.defT -= dt; e.stag -= dt; e.tag -= dt;
    if (e.launched > 0) { e.launched -= dt; if (e.launched <= 0 || (!e.fly && e.onGround && e.launched < 1.3)) { e.launched = 0; e.jug = false; } }
    if (e.spawnT > 0) { e.spawnT -= dt; e.mesh.scale.setScalar(clamp(1 - e.spawnT / 0.6, 0.01, 1)); e.mesh.rotation.y += dt * 14; continue; }
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, dy = P.pos.y + 0.9 - (e.pos.y + e.h * 0.5), dh = Math.hypot(dx, dz) || 0.001, dist = Math.hypot(dh, dy), ax = dx / dh, az = dz / dh;
    e.atk -= dt;
    if (e.stun > 0) { e.stun -= dt; if (!e.fly) { e.vel.y -= GRAV * dt; } else e.vel.multiplyScalar(1 - Math.min(1, dt * 3)); moveBody(e, dt); }
    else if (e.type === 0) {
      const k = Math.min(1, dt * (e.onGround ? 7 : 2.2)); e.vel.x = lerp(e.vel.x, ax * e.speed, k); e.vel.z = lerp(e.vel.z, az * e.speed, k);
      if (e.onGround && dist < 10 && dist > 3 && Math.random() < dt * 1.3) { e.vel.x = ax * 17; e.vel.z = az * 17; e.vel.y = clamp(7 + dy * 1.6, 6, 17); }
      else if (e.onGround && dy > 2.5 && dh < 6 && Math.random() < dt * 2) e.vel.y = 17;
      e.vel.y -= GRAV * dt; moveBody(e, dt);
      if (e.hitWall) { if (e.onGround) e.vel.y = 13.5; e.stuck += dt; if (e.stuck > 1.1) { smashBox(e.pos.x + ax * 1.1, e.pos.y + 0.1, e.pos.z + az * 1.1, e.r, e.h); e.stuck = 0; } } else e.stuck = Math.max(0, e.stuck - dt * 0.4);
      if (dist < 1.9 && e.atk <= 0) { hurtPlayer(9); e.atk = 0.75; e.vel.x = -ax * 8; e.vel.z = -az * 8; e.vel.y = 5; }
    } else if (e.type === 1) {
      e.orb += dt * e.orbSp;
      const tx = P.pos.x + Math.cos(e.orb) * e.orbR, tz = P.pos.z + Math.sin(e.orb) * e.orbR, ty = Math.max(2.5, P.pos.y + e.orbH);
      const qx = tx - e.pos.x, qy = ty - e.pos.y, qz = tz - e.pos.z, ql = Math.hypot(qx, qy, qz) || 1, sp = e.speed * Math.min(1, ql / 4), k = Math.min(1, dt * 2.5);
      e.vel.x = lerp(e.vel.x, qx / ql * sp, k); e.vel.y = lerp(e.vel.y, qy / ql * sp, k); e.vel.z = lerp(e.vel.z, qz / ql * sp, k);
      moveBody(e, dt); if (e.hitWall) e.vel.y += 30 * dt;
      if (e.atk <= 0 && dist < 60) { if (losToPlayer(e)) { enemyShoot(e, 1, 24, 8, 0.02); e.atk = rnd(1.5, 2.6) * Math.max(0.6, 1 - G.wave * 0.02); } else e.atk = 0.35; }
    } else if (e.type === 2) {
      const want = dist > 13 ? e.speed : 0, k = Math.min(1, dt * 4); e.vel.x = lerp(e.vel.x, ax * want, k); e.vel.z = lerp(e.vel.z, az * want, k);
      e.vel.y -= GRAV * dt; moveBody(e, dt);
      if (e.atk <= 0) { e.volley = 3; e.atk = 3.8; e.vt = 0; }
      if (e.volley > 0) { e.vt -= dt; if (e.vt <= 0) { enemyShoot(e, 2, 21, 22, 0.03, (e.volley % 2 ? 1 : -1) * 1.3 * az, 2.2); e.volley--; e.vt = 0.24; } }
      if (dist < 3.2 && e.t > 1 && e.defT < -0.9) { e.defT = 0; hurtPlayer(18); P.vel.x += ax * 16; P.vel.z += az * 16; P.vel.y += 8; }
    } else if (e.type === 3) {
      e.orb += dt * e.orbSp;
      const tx = clamp(P.pos.x + Math.cos(e.orb) * e.orbR, 8, GW * BS - 8), tz = clamp(P.pos.z + Math.sin(e.orb) * e.orbR, 8, GD * BS - 8), ty = Math.max(8, P.pos.y + e.orbH);
      const qx = tx - e.pos.x, qy = ty - e.pos.y, qz = tz - e.pos.z, ql = Math.hypot(qx, qy, qz) || 1, sp = e.speed * Math.min(1, ql / 5), k = Math.min(1, dt * 2);
      e.vel.x = lerp(e.vel.x, qx / ql * sp, k); e.vel.y = lerp(e.vel.y, qy / ql * sp, k); e.vel.z = lerp(e.vel.z, qz / ql * sp, k); moveBody(e, dt);
      if (e.shield <= 0 && e.shMax > 0) { e.shT -= dt; if (e.shT <= 0) { e.pol = 1 - e.pol; e.shield = e.shMax; const c = FCOL[e.pol]; e.sh1.material.color.setRGB(c[0], c[1], c[2]); e.sh2.material.color.setRGB(c[0], c[1], c[2]); toast(e.pol === PSYCHO ? 'KERNEL SHIELD: ROSE' : 'KERNEL SHIELD: TEAL'); } }
      if (e.atk <= 0) { e.atk = 2.7; const n = 14, cy0 = e.pos.y + 2.2, ph = Math.random() * 6.28; for (let j = 0; j < n; j++) { const a = ph + j / n * 6.283; spawnProj(1, e.pos.x, cy0, e.pos.z, Math.cos(a) * 0.96, -0.28, Math.sin(a) * 0.96, 17, 9); } enemyShoot(e, 2, 24, 20, 0.02, 0, 2.2); }
      e.sumT -= dt; if (e.sumT <= 0) { e.sumT = 8; if (enemies.length < 12) for (let j = 0; j < 2; j++) spawnEnemy(0, clamp(e.pos.x + rnd(-4, 4), 4, GW * BS - 4), e.pos.y, clamp(e.pos.z + rnd(-4, 4), 4, GD * BS - 4), -1); }
    }
    if (e.pos.y < -3 || e.pos.y !== e.pos.y) { e.pos.set(CX, 20, CZ); e.vel.set(0, 0, 0); }
    // separation
    if (!e.fly) for (let j = i + 1; j < enemies.length; j++) { const o = enemies[j]; if (o.fly || o.spawnT > 0) continue; const sx = o.pos.x - e.pos.x, sz = o.pos.z - e.pos.z, sd = Math.hypot(sx, sz) || 0.01, m = e.r + o.r + 0.3; if (sd < m && Math.abs(o.pos.y - e.pos.y) < 2) { const f = (m - sd) * 14 * dt / sd; e.vel.x -= sx * f; e.vel.z -= sz * f; o.vel.x += sx * f; o.vel.z += sz * f; } }
    // visuals
    const sg = Math.max(0, e.stag) / 0.14; e.mesh.position.set(e.pos.x, e.pos.y + (e.fly ? Math.sin(e.t * 3) * 0.18 : 0), e.pos.z); e.mesh.scale.set(1 + 0.24 * sg, 1 - 0.2 * sg, 1 + 0.24 * sg); e.mesh.rotation.x = e.type === 3 ? 0 : -0.4 * sg;
    e.mesh.rotation.y = e.type >= 4 ? e.yaw : e.type >= 3 ? e.t * 0.6 : Math.atan2(dx, dz);
    e.mesh.material.color.setScalar(e.flash > 0 ? 4 : 1);
    { const cu = e.cloud.material.uniforms; cu.uTime.value = G.time + e.t * 3; cu.uScaleH.value = cloudScaleH; cu.uIntensity.value = e.cloudK * (e.flash > 0 ? 2.6 : e.tag > 0 ? 1.25 : 1); e.cloud.rotation.y += dt * 0.5; }
    if (e.sh1) { const on = e.shield > 0; e.sh1.visible = e.sh2.visible = on; if (on) { e.sh1.rotation.y = e.t * 1.5; e.sh2.material.opacity = 0.14 + 0.1 * Math.sin(e.t * 6); } }
  }
  let rem = 0; for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) { const e = enemies[i]; scene.remove(e.mesh); e.mesh.material.dispose(); e.cloud.material.dispose(); if (e.sh1) { e.sh1.material.dispose(); e.sh2.material.dispose(); } enemies.splice(i, 1); rem++; }
  // tag cages
  let tn = 0; for (const e of enemies) { if (e.tag <= 0 || e.spawnT > 0 || tn >= 24) continue; _q.setFromAxisAngle(_up, G.time * 3 + tn); const sc = e.hr * 1.45; tagMesh.setMatrixAt(tn++, TMP_M.compose(_p.set(e.pos.x, e.pos.y + e.h * 0.5, e.pos.z), _q, _s.set(sc, sc, sc))); }
  if (tn || tagMesh.count) { tagMesh.count = tn; tagMesh.instanceMatrix.needsUpdate = true; }
  // beacons for stragglers
  if (G.mode === 'wave' && enemies.length > 0 && enemies.length <= 3 && G.queue.length === 0) { G.beaconT = (G.beaconT || 0) - dt; if (G.beaconT <= 0) { G.beaconT = 0.2; for (const e of enemies) addBeam(e.pos.x, e.pos.y + e.h, e.pos.z, e.pos.x, e.pos.y + 50, e.pos.z, 0.14, 0.25, 0.9, 0.9, 0.9); } }
}

/* ============================== projectiles + pickups ============================== */
function updateProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]; p.life -= dt; const sl = p.spd * dt, ox = p.pos.x, oy = p.pos.y, oz = p.pos.z, d = p.dir;
    let tmax = sl, hit = false, hitE = null, hitP = false; const hv = rayVox(ox, oy, oz, d.x, d.y, d.z, sl);
    const bk = RH.kind, bx = RH.x, by = RH.y, bz = RH.z; if (hv) { tmax = RH.t; hit = true; }
    if (p.kind === 0) { hitE = rayEnemies(ox, oy, oz, d.x, d.y, d.z, tmax, 0.3); if (hitE) { tmax = RE.t; hit = true; } }
    else if (p.kind !== 3) { const cx = P.pos.x - ox, cy = P.pos.y + 0.9 - oy, cz = P.pos.z - oz, tc = cx * d.x + cy * d.y + cz * d.z, d2 = cx * cx + cy * cy + cz * cz - tc * tc; if (d2 < 0.72 && tc > -0.85 && tc - 0.4 < tmax) { hitP = true; hit = true; tmax = Math.max(0, Math.min(tmax, tc)); } }
    p.pos.set(ox + d.x * tmax, oy + d.y * tmax, oz + d.z * tmax); p.mesh.position.copy(p.pos);
    if (p.kind === 0 || p.kind === 3) { spawnP(ox, oy, oz, rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), 0.35, 11, 1, 0.45, 0.85, 0); spawnP(ox, oy, oz, rnd(-2, 2), rnd(-2, 2), rnd(-2, 2), 0.25, 7, 1, 0.8, 0.3, 0); }
    else if (Math.random() < 0.6) spawnP(ox, oy, oz, 0, 0, 0, 0.25, p.kind === 1 ? 9 : 12, 1, p.kind === 1 ? 0.6 : 0.2, 0.1, 0);
    if (hit || p.life <= 0) {
      const x = p.pos.x - d.x * 0.15, y = p.pos.y - d.y * 0.15, z = p.pos.z - d.z * 0.15;
      if (p.kind === 0) explode(x, y, z, 6.5, p.dmg, 3.3, 0, PSYCHO);
      else if (p.kind === 2) explode(x, y, z, 5, p.dmg, 2.7, 1, 0);
      else if (p.kind === 1) { if (hitP) hurtPlayer(p.dmg); else if (hv && bk === 1) damageBlock(bx, by, bz, 14); burst(x, y, z, 6, 6, 0.3, 7, 1, 0.6, 0.1, 0); }
      scene.remove(p.mesh); projs.splice(i, 1);
    }
  }
}
const pickGeo = new T.OctahedronGeometry(0.3, 0), pickMat = new T.MeshBasicMaterial({ color: 0x9ff5a8, fog: false });
function dropPick(x, y, z) { const m = new T.Mesh(pickGeo, pickMat); m.position.set(x, y, z); scene.add(m); picks.push({ pos: V3(x, y, z), vel: V3(rnd(-4, 4), rnd(5, 9), rnd(-4, 4)), mesh: m, life: 16 }); }
function updatePicks(dt) {
  for (let i = picks.length - 1; i >= 0; i--) {
    const p = picks[i]; p.life -= dt; p.vel.y -= 20 * dt;
    const dx = P.pos.x - p.pos.x, dy = P.pos.y + 0.9 - p.pos.y, dz = P.pos.z - p.pos.z, d = Math.hypot(dx, dy, dz) || 0.01;
    if (d < 9) { p.vel.x += dx / d * 70 * dt; p.vel.y += dy / d * 70 * dt + 20 * dt; p.vel.z += dz / d * 70 * dt; p.vel.multiplyScalar(1 - Math.min(1, dt * 3)); }
    p.pos.addScaledVector(p.vel, dt); if (p.pos.y < 0.4) { p.pos.y = 0.4; p.vel.y = Math.abs(p.vel.y) * 0.4; p.vel.x *= 0.85; p.vel.z *= 0.85; }
    p.mesh.position.copy(p.pos); p.mesh.rotation.y += dt * 4;
    if (d < 1.5) { P.hp = Math.min(100, P.hp + 10 + 4 * P.up.gen); sfx.pickup(); burst(p.pos.x, p.pos.y, p.pos.z, 6, 5, 0.3, 7, 0.5, 1, 0.7, 0); p.life = 0; H.dmg.style.opacity = P.hp < 30 ? 0.35 : 0; }
    if (p.life <= 0) { scene.remove(p.mesh); picks.splice(i, 1); }
  }
}

/* ============================== waves ============================== */
function startWave(n) {
  G.wave = n; G.queue = []; const boss = n % 5 === 0; let count = Math.min(5 + n * 2, 32);
  if (boss) { G.queue.push(3); count = Math.floor(count * 0.5); }
  for (let i = 0; i < count; i++) { const r = Math.random(); G.queue.push(n >= 4 && r < Math.min(0.08 + n * 0.012, 0.2) ? 2 : n >= 2 && r < 0.5 ? 1 : 0); }
  if (n > 1) { regenBlocks(); P.hp = Math.min(100, P.hp + 25); }
  banner(boss ? 'The Kernel' : 'Wave ' + roman(n), n === 1 ? (touchMode ? 'SWAP changes form' : 'Q changes form') : 'The arena is rebuilt');
  sfx.wave(); G.spawnT = 1.2;
  if (n === 1) hint(touchMode ? 'SWAP changes form. The pulse erases enemy shots and refills your cooldowns.' : 'Q changes form. The pulse erases enemy shots and refills your cooldowns.', 7);
  if (n === 2) hint('Arc shots tag what they touch. Any Psycho blast detonates every tag at once.', 7);
  if (n === 4) hint('Swap while grappling to fall on the anchor like a meteor.', 7);
}
function updateWaves(dt) {
  if (G.waveT > 0) { G.waveT -= dt; if (G.waveT <= 0) { if (G.wave >= 1 && offerPick()) return; startWave(G.wave + 1); } return; }
  const cap = (lowSpec ? 9 : 13) + Math.min(4, Math.floor(G.wave / 4));
  if (G.queue.length) {
    G.spawnT -= dt;
    if (G.spawnT <= 0 && enemies.length < cap) {
      G.spawnT = Math.max(0.25, 0.7 - G.wave * 0.03); const type = G.queue.shift();
      let x = CX, z = CZ; for (let k = 0; k < 12; k++) { const a = Math.random() * 6.283, r = rnd(22, 38); x = clamp(CX + Math.cos(a) * r, 5, GW * BS - 5); z = clamp(CZ + Math.sin(a) * r, 5, GD * BS - 5); if (Math.hypot(x - P.pos.x, z - P.pos.z) > 16) break; }
      const fly = type === 1 || type === 3, y = fly ? rnd(10, 16) : 27 + rnd(0, 5);
      const sc = G.wave >= 3 ? Math.min(0.18 + (G.wave - 3) * 0.06, 0.55) : 0;
      spawnEnemy(type, x, type === 3 ? 18 : y, z, type === 3 ? (Math.random() < 0.5 ? 0 : 1) : Math.random() < sc ? (Math.random() < 0.5 ? 0 : 1) : -1);
    }
  } else if (enemies.length === 0 && G.wave > 0) {
    const bonus = 250 * G.wave; G.score += bonus; G.waveT = 2.4; banner('Wave clear', '+' + bonus); sfx.pickup();
  }
}

/* ============================== operators ============================== */
// After each wave the player carries one of five operators further (three levels each).
const OPS = [
  { k: 'sto', n: 'Stochastic', fx: 'The arc chains one body further, and one hit in eight strikes twice.' },
  { k: 'dyn', n: 'Dynamical', fx: 'Move 7% faster. Ram and blink return 15% sooner.' },
  { k: 'gen', n: 'Generative', fx: 'More motes fall from the dead, and each heals more.' },
  { k: 'geo', n: 'Geometric', fx: 'Every blast you make is 12% wider.' },
  { k: 'exp', n: 'Experiential', fx: 'Sync builds 25% faster, and Psycho Syber lasts longer.' }
];
function offerPick() {
  const avail = OPS.filter(o => P.up[o.k] < 3); if (!avail.length) return false;
  for (let i = avail.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0, t = avail[i]; avail[i] = avail[j]; avail[j] = t; }
  const three = avail.slice(0, 3);
  if (G.noAuto) { P.up[three[0].k]++; return false; }
  const root = $('picks'); root.textContent = '';
  for (const o of three) {
    const bt = document.createElement('button'), b = document.createElement('b'), sp = document.createElement('span');
    bt.type = 'button'; bt.className = 'pick'; b.textContent = o.n + ' · ' + roman(P.up[o.k] + 1); sp.textContent = o.fx; bt.append(b, sp);
    bt.addEventListener('click', () => { if (G.state !== 'pick') return; P.up[o.k]++; enterPlay(); toast(o.n.toUpperCase() + ' ' + roman(P.up[o.k])); startWave(G.wave + 1); });
    root.appendChild(bt);
  }
  setHead('Wave ' + roman(G.wave) + ' clear. Choose one.', 'Operators'); leavePlay('pick', 's-pick'); return true;
}

/* ============================== world labels ============================== */
const labels = [], labRoot = $('labels'), _lv = V3();
function addLabel(x, y, z, n, t, sub, col) {
  const el = document.createElement('div'); el.className = 'lab'; if (col) el.style.setProperty('--c', col);
  for (const [c, v] of [['n', n], ['t', t], ['s', sub || '']]) { const sp = document.createElement('span'); sp.className = c; sp.textContent = v; el.appendChild(sp); }
  labRoot.appendChild(el); const L = { el, pos: V3(x, y, z), max: 38, hide: false, owner: null }; labels.push(L); return L;
}
function clearLabels() { for (const L of labels) L.el.remove(); labels.length = 0; }
function updateLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const L of labels) {
    if (L.owner && L.owner.dead) L.hide = true;
    _lv.copy(L.pos).project(camera); const d = L.pos.distanceTo(camera.position);
    if (!L.hide && _lv.z < 1 && d < L.max && d > 3 && Math.abs(_lv.x) < 1.05 && Math.abs(_lv.y) < 1.05) {
      L.el.style.opacity = clamp(1.25 - d / L.max, 0.3, 1).toFixed(2);
      L.el.style.transform = 'translate(' + ((_lv.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-_lv.y * 0.5 + 0.5) * h).toFixed(1) + 'px) translate(-50%,-100%)';
    } else L.el.style.opacity = 0;
  }
}

/* ============================== main update ============================== */
const baseFov = () => { const a = camera.aspect; return a >= 1 ? 80 : clamp(2 * Math.atan(Math.tan(36 * Math.PI / 180) / a) * 180 / Math.PI, 80, 108); };
function update(dt) {
  G.time += dt;
  const ls = (touchMode ? 0.0052 : 0.0023) * G.sens;
  P.yaw -= In.lx * ls; P.pitch = clamp(P.pitch - In.ly * ls, -1.5, 1.5); In.lx = In.ly = 0;
  updatePlayer(dt); updateEnemies(dt); updateProjs(dt); updatePicks(dt); if (G.mode === 'duel') updateDuel(dt); else updateWaves(dt); updateDet(dt); updateFallers(dt);
  supportT -= dt; if (supportDirty && supportT <= 0) { supportDirty = false; supportT = 0.12; checkSupport(); }
  if (G.od > 0) { G.od -= dt; if (G.od <= 0) endOverdrive(); }
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; G.sync = 0; G.lastKillForm = -1; } }
  In.altPressed = In.jumpPressed = In.dashPressed = In.swapPressed = false;
  // camera
  G.shake = Math.max(0, G.shake - dt * 2.6); const sh = G.shake * G.shake * 0.06;
  camera.position.set(P.pos.x, P.pos.y + 1.5 + P.dip, P.pos.z);
  camera.rotation.set(P.pitch + rnd(-sh, sh), P.yaw + rnd(-sh, sh), P.roll + rnd(-sh, sh) * 0.5);
  const sp = Math.hypot(P.vel.x, P.vel.z), fov = baseFov() + clamp((sp - 14) / 26, 0, 1) * 13 + P.fovKick;
  camera.fov = lerp(camera.fov, fov, Math.min(1, dt * 12)); camera.updateProjectionMatrix();
  // gun
  gunPsycho.visible = P.form === PSYCHO; gunSyber.visible = P.form === SYBER;
  const bobA = P.onGround ? Math.min(1, sp / 12) : 0;
  gunRoot.position.set(Math.min(0.25, Math.tan(29 * Math.PI / 180) * 0.66 * camera.aspect * 0.62) + Math.sin(P.bob) * 0.012 * bobA - P.roll * 0.6, -0.23 + Math.abs(Math.cos(P.bob)) * 0.014 * bobA - P.swapAnim * 0.35 + clamp(P.vel.y, -20, 20) * -0.0012 - P.dip * 0.2, -0.66 + P.recoil * 0.09);
  gunRoot.rotation.set(P.recoil * 0.16 - P.swapAnim * 1.1, P.swapAnim * 0.5, P.roll * 2 + P.swapAnim * (P.form === PSYCHO ? 1 : -1) * 1.4);
  flash.visible = P.flashT > 0; if (flash.visible) { flash.rotation.z = Math.random() * 6.28; flash.scale.setScalar(P.form === PSYCHO ? 1.5 : 0.8); flash.position.z = P.form === PSYCHO ? -0.82 : -1.0; }
  // rope
  if (P.grapple) {
    const g = P.grapple, m = muzzlePos(); _d.set(g.x - m.x, g.y - m.y, g.z - m.z); const len = _d.length() || 0.01; _d.multiplyScalar(1 / len);
    rope.visible = true; rope.position.set((g.x + m.x) / 2, (g.y + m.y) / 2, (g.z + m.z) / 2); rope.quaternion.setFromUnitVectors(_z, _d); rope.scale.set(0.06, 0.06, len);
    if (Math.random() < 0.5) { const t = Math.random(); spawnP(lerp(m.x, g.x, t), lerp(m.y, g.y, t), lerp(m.z, g.z, t), rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), 0.25, 5, 0.4, 1, 1, 0); }
  } else rope.visible = false;
  updateHUD(dt);
}
const SKY_A = [[1, 0.37, 0.81], [0.37, 0.89, 0.82]], SKY_B = [[0, 0, 0], [0, 0, 0]], FOG_C = [[0.03, 0.017, 0.036], [0.013, 0.028, 0.042]], BLK_C = [[1, 0.88, 0.94], [0.86, 0.97, 1]], FLR_C = [[1, 0.45, 0.85], [0.45, 0.95, 0.88]];
const mix3 = (a, t) => [lerp(a[0][0], a[1][0], t), lerp(a[0][1], a[1][1], t), lerp(a[0][2], a[1][2], t)];
function updateWorldFx(dt) {
  G.fm = lerp(G.fm, G.od > 0 ? 0.5 + 0.5 * Math.sin(G.time * 7) : P.form, Math.min(1, dt * 9)); const t = G.fm; let c;
  c = mix3(SKY_A, t); skyMat.uniforms.cA.value.setRGB(c[0], c[1], c[2]); c = mix3(SKY_B, t); skyMat.uniforms.cB.value.setRGB(c[0], c[1], c[2]);
  c = mix3(FOG_C, t); scene.fog.color.setRGB(c[0], c[1], c[2]); c = mix3(BLK_C, t); blockMat.color.setRGB(c[0], c[1], c[2]);
  c = mix3(FLR_C, t); floorMat.uniforms.uCol.value.setRGB(c[0], c[1], c[2]); wallMat.color.setRGB(lerp(0.9, c[0], 0.4), lerp(0.88, c[1], 0.4), lerp(0.8, c[2], 0.4));
  cloudScaleH = canvas.height * 0.5 / Math.tan(camera.fov * Math.PI / 360);
  const fu = floorMat.uniforms; fu.uCam.value.copy(camera.position); fu.uTime.value = skyMat.uniforms.time.value; fu.uFog.value.copy(scene.fog.color);
  fu.uLit.value = lerp(fu.uLit.value, G.od > 0 ? 5 : G.meter / 20, Math.min(1, dt * 5));
  const tu = overhead.material.uniforms; tu.uTime.value = skyMat.uniforms.time.value; tu.uScaleH.value = cloudScaleH;
  tmI = lerp(tmI, G.od > 0 ? 0.5 : 0.05 + 0.17 * G.meter / 100, Math.min(1, dt * 3)); tu.uIntensity.value = tmI; overhead.rotation.y += dt * (G.od > 0 ? 0.5 : 0.05);
  skyMat.uniforms.time.value += dt; sky.position.copy(camera.position);
  pMat.uniforms.scale.value = canvas.height * 0.0168 / Math.tan(camera.fov * Math.PI / 360);
  updateParticles(dt); updateBeams(dt); updateShells(dt);
  if (blocksDirty) { blockMesh.instanceMatrix.needsUpdate = true; blocksDirty = false; }
  if (colorsDirty) { blockMesh.instanceColor.needsUpdate = true; colorsDirty = false; }
}

/* ============================== state machine ============================== */
const SECS = ['s-start', 's-pause', 's-dead', 's-pick', 's-duel', 's-duelend'];
function showSec(id) { for (const k of SECS) $(k).classList.toggle('on', k === id); $('menu').scrollTop = 0; }
const HEAD0 = [$('eyebrow').textContent, $('h1').innerHTML];
function setHead(eb, title) { if (eb === undefined) { $('eyebrow').textContent = HEAD0[0]; $('h1').innerHTML = HEAD0[1]; } else { $('eyebrow').textContent = eb; $('h1').textContent = title; } }
function resetGame(kind, keepRun) {
  for (const e of enemies) { scene.remove(e.mesh); e.mesh.material.dispose(); e.cloud.material.dispose(); } enemies.length = 0;
  for (const p of projs) scene.remove(p.mesh); projs.length = 0; for (const p of picks) scene.remove(p.mesh); picks.length = 0;
  clearLabels(); setObj(''); buildLevel(kind || 'arena');
  P.pos.set(SPX * BS + 1, 0, SPZ * BS + 1); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = 0; P.hp = 100; P.form = PSYCHO; P.inv = 1; P.fireCd = P.dashCd = P.altCd = P.swapCd = P.surge = P.gCd = 0;
  P.frozen = false; P.ramT = 0; P.slamming = false; P.blinks = 2; P.blinkT = 0; P.grapple = null; P.dip = P.dipV = P.roll = P.recoil = P.swapAnim = 0; P.airJumps = 1;
  detQ.length = 0; fallMesh.count = 0; tagMesh.count = 0; P.meteor = null; P.rocketCd = P.arcCd = 0; rope.visible = false;
  G.meter = 0; G.od = 0; G.hitstop = 0; G.ca = 0; G.flash = 0; stage.classList.remove('od', 'ready');
  if (!keepRun) { G.score = 0; G.smashed = 0; P.up = { sto: 0, dyn: 0, gen: 0, geo: 0, exp: 0 }; }
  G.wave = 0; G.waveT = 1.4; G.queue = []; G.combo = 0; G.comboT = 0; G.sync = 0; G.lastKillForm = -1; G.shake = 0;
  H.dmg.style.opacity = 0; applyFormUI(); setMusicForm(PSYCHO);
}
// A run covers the whole screen, the site's header included. The title and the duel panel sit in the page.
function setRun(on) { if (stage.classList.contains('run') === on) return; stage.classList.toggle('run', on); document.documentElement.classList.toggle('ar-lock', on); resize(); }
let locked = false, hadLock = false, noLock = false;
function requestLock() {
  if (touchMode || noLock) return;
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { noLock = true; }); } catch (e) { noLock = true; }
  setTimeout(() => { if (!document.pointerLockElement && G.state === 'play') noLock = true; }, 700);
}
function leavePlay(state, sec) {
  G.state = state; stage.classList.remove('play'); if (sec) showSec(sec);
  In.mFire = In.tFire = In.mAlt = In.tAlt = In.tJump = false; In.jx = In.jy = 0; In.keys = {}; $('stick').style.display = 'none'; touches.clear();
  for (const b of document.querySelectorAll('.tb.on')) b.classList.remove('on');
  if (document.pointerLockElement) document.exitPointerLock();
}
function enterPlay() { audioInit(); G.state = 'play'; setRun(true); stage.classList.add('play'); requestLock(); last = performance.now(); }
function startRun(mode) {
  audioInit(); G.mode = mode; resetGame('arena'); enterPlay();
}
function play(fresh) { if (fresh) startRun('wave'); else enterPlay(); }
// One browser cannot stop the other's game, so a duel does not pause: the panel opens, this player stands still,
// and the duel goes on under it (frame() keeps calling update(), which sends positions and, for the lead, runs the
// rounds). The panel says so in place of "Paused.", and has no Restart.
const PAUSE_TEXT = [$('pause-lede').textContent, $('pause-note').textContent, $('resume').textContent];
function pause() {
  if (G.state !== 'play') return; const duel = G.mode === 'duel';
  $('pause-lede').textContent = duel ? 'A duel does not pause. While this panel is open you stand still and your rival can still hit you. The next round closes it.' : PAUSE_TEXT[0];
  $('pause-note').textContent = duel ? 'Leave the game ends the duel for both players and returns to this page.' : PAUSE_TEXT[1];
  $('resume').textContent = duel ? 'Back to the duel' : PAUSE_TEXT[2]; $('restart').hidden = duel;
  setHead(); leavePlay('pause', 's-pause');
}
function die() {
  setHead(); leavePlay('dead', 's-dead'); stage.classList.remove('od', 'ready'); G.od = 0; sfx.die();
  if (G.score > G.best) { G.best = G.score; try { localStorage.setItem('psycho-syber.arena.best', String(G.best)); } catch (e) { } }
  $('d-score').textContent = G.score; $('d-wave').textContent = roman(G.wave); $('d-best').textContent = G.best;
}
function retry() { if (G.mode === 'duel') return; startRun('wave'); }
function toTitle() { if (G.mode === 'duel' || D.pc) { duelClose(); G.mode = 'wave'; } setRun(false); setHead(); G.state = 'menu'; showSec('s-start'); }
$('gowave').addEventListener('click', () => startRun('wave'));
$('retry').addEventListener('click', retry);
$('restart').addEventListener('click', retry);
$('resume').addEventListener('click', enterPlay);
$('quit').addEventListener('click', toTitle);
$('dead-quit').addEventListener('click', toTitle);
$('pausebtn').addEventListener('click', pause);
$('snd').addEventListener('click', () => { A.on = !A.on; audioInit(); if (A.master) A.master.gain.value = A.on ? 0.6 : 0; $('snd').textContent = A.on ? 'SOUND ON' : 'SOUND OFF'; });
$('sens').value = G.sens;
$('sens').addEventListener('input', e => { G.sens = +e.target.value; try { localStorage.setItem('psycho-syber.arena.sens', String(G.sens)); } catch (er) { } });

/* ============================== duel: Psycho against Syber, browser to browser ============================== */
// Transport is a WebRTC data channel between the two browsers. Nothing of ours sits between them: the first
// player sends an invite (the offer) and the second sends back a reply (the answer), as links or pasted text
// (link.js packs them). Each browser asks one STUN server for its own public address; there is no relay,
// so two networks that both refuse direct links cannot duel.
const ICE = { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] };
const NET_V = 1, WIN = 5, PVP = { ROCKET: 0.5, SLAM: 0.42, RAM: 0.53, ARC: 0.45, JUGGLE: 0.45, CHAIN: 0.45, 'ZIP KICK': 0.55 };
const NO_RTC = 'This browser does not allow WebRTC here, so a direct link cannot open.';
const LINK = window.ArenaLink;
const D = { pc: null, ctl: null, pos: null, role: '', invite: '', reply: '', pending: '', lastRx: 0, code: '', phase: 'idle', round: 0, score: [0, 0], rival: null, buf: [], seq: 0, rseq: -1, lastSend: 0, out: [], applying: false, endT: 0, countT: 0, lastC: 0, shotN: 0, shot: [0, 0, 0], blinkN: 0, rShotN: 0, rBlinkN: 0, lab: null, over: false, joinT: 0, lockT: 0 };
const r2 = v => Math.round(v * 100) / 100, fin = Number.isFinite;
const rope2 = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xbff5ee, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
rope2.visible = false; rope2.frustumCulled = false; scene.add(rope2);
const isOpen = c => !!c && c.readyState === 'open';
// positions and keepalives may be lost or arrive late; everything else must arrive, in order
function netSend(m) { const c = (m[0] === 's' || m[0] === 'p') && isOpen(D.pos) ? D.pos : D.ctl; if (isOpen(c)) { try { c.send(JSON.stringify(m)); } catch (e) { } } }
function duelStatus(t) { $('duel-status').textContent = t; }
function duelStep(k) { for (const id of ['duel-start', 'duel-got', 'duel-lead', 'duel-join']) $(id).hidden = id !== 'duel-' + k; }
function duelClose() {
  clearTimeout(D.joinT); const pc = D.pc, a = D.ctl, b = D.pos; D.pc = null; D.ctl = null; D.pos = null; D.invite = ''; D.reply = '';
  D.phase = 'idle'; D.rival = null; D.over = false; D.out.length = 0; rope2.visible = false; P.frozen = false;
  for (const c of [a, b]) { try { if (c) { c.onopen = c.onclose = c.onerror = c.onmessage = null; c.close(); } } catch (e) { } }
  try { if (pc) { pc.onconnectionstatechange = pc.ondatachannel = null; pc.close(); } } catch (e) { }
}
function wireChan(pc, c) {
  if (c.label === 'pos') D.pos = c; else if (c.label === 'ctl') D.ctl = c; else { try { c.close(); } catch (e) { } return; }
  c.onmessage = ev => { if (D.pc !== pc || typeof ev.data !== 'string' || ev.data.length > 20000) return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; } onNet(m); };
  if (c.label !== 'ctl') return;
  c.onopen = () => { if (D.pc !== pc) return; clearTimeout(D.joinT); D.rseq = -1; D.seq = 0; D.lastRx = performance.now(); try { history.replaceState(null, '', location.pathname); } catch (e) { } netSend(['v', NET_V]); duelStatus(D.role === 'lead' ? 'Rival linked.' : 'Linked. The first round is starting.'); };
  c.onclose = c.onerror = () => { if (D.pc === pc && D.ctl === c) duelDrop(); };
}
function watchPc(pc) {
  pc.onconnectionstatechange = () => {
    if (D.pc !== pc || pc.connectionState !== 'failed') return;
    if (isOpen(D.ctl)) return duelDrop();
    clearTimeout(D.joinT); duelStatus('The direct link did not open. Some networks refuse them. Start again with a new invite, or try another network.');
  };
}
// wait until the browser has listed its addresses (or four seconds, whichever comes first)
function gathered(pc) {
  return new Promise(done => {
    if (pc.iceGatheringState === 'complete') return done();
    const t = setTimeout(done, 4000);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); done(); } });
  });
}
const linkFor = (k, code) => location.origin + location.pathname + '#' + k + '=' + code;
const LAN_ONLY = ' This network gave no public address, so the link can open only for someone on the same network.';
async function duelInvite() {
  audioInit(); duelClose(); if (!window.RTCPeerConnection || !LINK) return duelStatus(NO_RTC);
  D.role = 'lead'; duelStatus('Making an invite...');
  let pc; try { pc = new RTCPeerConnection(ICE); } catch (e) { return duelStatus(NO_RTC); }
  D.pc = pc; watchPc(pc);
  try {
    wireChan(pc, pc.createDataChannel('ctl')); wireChan(pc, pc.createDataChannel('pos', { ordered: false, maxRetransmits: 0 }));
    await pc.setLocalDescription(await pc.createOffer()); await gathered(pc); if (D.pc !== pc) return;
    const sdp = pc.localDescription.sdp, code = await LINK.pack('o', sdp); if (D.pc !== pc) return;
    D.invite = linkFor('d', code); $('duel-invite').value = D.invite; $('duel-reply-in').value = ''; duelStep('lead');
    duelStatus('Waiting for the reply.' + (LINK.reachable(sdp) ? '' : LAN_ONLY));
  } catch (e) { if (D.pc === pc) { duelClose(); duelStep('start'); duelStatus(NO_RTC); } }
}
async function duelAnswer(text) {
  audioInit(); if (!window.RTCPeerConnection || !LINK) return duelStatus(NO_RTC);
  const got = await LINK.unpack(LINK.find(text));
  if (!got || got.kind !== 'o') return duelStatus(got ? 'That is a reply. Paste it in the tab that made the invite.' : 'That invite could not be read. Ask your rival for a new one.');
  duelClose(); D.role = 'join'; D.pending = ''; duelStatus('Reading the invite...');
  let pc; try { pc = new RTCPeerConnection(ICE); } catch (e) { return duelStatus(NO_RTC); }
  D.pc = pc; watchPc(pc); pc.ondatachannel = ev => { if (D.pc === pc) wireChan(pc, ev.channel); };
  try {
    await pc.setRemoteDescription({ type: 'offer', sdp: got.sdp }); await pc.setLocalDescription(await pc.createAnswer()); await gathered(pc); if (D.pc !== pc) return;
    const sdp = pc.localDescription.sdp, code = await LINK.pack('a', sdp); if (D.pc !== pc) return;
    D.reply = linkFor('r', code); $('duel-reply').value = D.reply; duelStep('join');
    duelStatus('Waiting for your rival to open the reply.' + (LINK.reachable(sdp) ? '' : LAN_ONLY));
  } catch (e) { if (D.pc === pc) { duelClose(); duelStep('start'); duelStatus('That invite could not be used. Ask your rival for a new one.'); } }
}
// the first player takes the reply: pasted here, or handed over by a tab that opened the reply link
async function duelConnect(text) {
  const pc = D.pc; if (!pc || D.role !== 'lead' || !LINK) return false;
  const got = await LINK.unpack(LINK.find(text));
  if (!got || got.kind !== 'a') { duelStatus(got ? 'That is an invite. Paste the reply your rival sent back.' : 'That reply could not be read. Ask your rival to send it again.'); return false; }
  if (D.pc !== pc || pc.signalingState !== 'have-local-offer') return false;
  try { await pc.setRemoteDescription({ type: 'answer', sdp: got.sdp }); } catch (e) { duelStatus('That reply does not match this invite. Make a new invite and send it again.'); return false; }
  duelStatus('Reply accepted. Opening the link...');
  D.joinT = setTimeout(() => { if (D.pc === pc && !isOpen(D.ctl)) duelStatus('The direct link did not open. Some networks refuse them. Start again with a new invite, or try another network.'); }, 20000);
  return true;
}
function duelDrop() {
  const was = G.mode === 'duel'; duelClose(); duelStep('start');
  if (was) { G.mode = 'wave'; setRun(false); setHead('Duel', 'Link lost'); leavePlay('duel', 's-duel'); } duelStatus('Your rival disconnected.');
}
function onNet(m) {
  if (!Array.isArray(m) || !m.length) return; const t = m[0]; D.lastRx = performance.now();
  if (t === 's') {
    if (!(m[1] > D.rseq) || !fin(m[2]) || !fin(m[3]) || !fin(m[4]) || !fin(m[8])) return; D.rseq = m[1];
    D.buf.push({ t: performance.now(), x: m[2], y: m[3], z: m[4], vx: +m[5] || 0, vy: +m[6] || 0, vz: +m[7] || 0, yaw: m[8], hp: clamp(+m[10] || 0, 0, 100), fl: m[11] | 0, gx: +m[12] || 0, gy: +m[13] || 0, gz: +m[14] || 0, sn: m[15] | 0, sx: +m[16] || 0, sy: +m[17] || 0, sz: +m[18] || 0, bn: m[19] | 0 });
    if (D.buf.length > 14) D.buf.shift();
  } else if (t === 'h') {
    if (D.phase !== 'live' || P.inv > 0) return;
    const iy = clamp(+m[3] || 0, -30, 30); P.vel.x += clamp(+m[2] || 0, -30, 30); P.vel.y += iy; P.vel.z += clamp(+m[4] || 0, -30, 30); if (iy > 2) { P.onGround = false; P.coyote = 0; }
    hurtPlayer(clamp(+m[1] || 0, 0, 80));
  } else if (t === 'b') { if (fin(m[1]) && fin(m[2]) && fin(m[3])) boomFx(m[1], m[2], m[3], clamp(+m[4] || 5, 1, 16), FCOL[m[5]] || FCOL[0]); }
  else if (t === 'r') { if (fin(m[1]) && fin(m[2]) && fin(m[3]) && fin(m[4]) && fin(m[5]) && fin(m[6]) && projs.length < 60) spawnProj(3, m[1], m[2], m[3], m[4], m[5], m[6], 58, 0); }
  else if (t === 'k') { D.applying = true; for (let i = 1; i < m.length && i < 400; i++) { const b = blk[m[i]]; if (b) destroyBlock(b.x, b.y, b.z, i < 16); } D.applying = false; }
  else if (t === 'd') { if (D.role === 'lead') leadEndRound('join'); }
  else if (t === 'R') { if (D.role === 'join') beginRound(m[1] | 0, m[2] ? 1 : 0, m[3] | 0, m[4] | 0); }
  else if (t === 'E') { if (D.role === 'join') endRound(m[1], m[2] | 0, m[3] | 0, !!m[4]); }
  else if (t === 'v') { if (m[1] !== NET_V) return duelStatus('The two browsers have different versions of the game. Both players need to reload.'); if (D.role === 'lead' && D.phase === 'idle') { D.score = [0, 0]; D.round = 0; leadStartRound(); } }
  else if (t === 'x') { if (D.role === 'lead' && D.over) { D.score = [0, 0]; D.round = 0; leadStartRound(); } }
}
function netHitOut(e, d, ix, iy, iz) {
  if (D.phase !== 'live') return false; d *= PVP[SRC] || 0.5;
  netSend(['h', r2(d), r2(ix), r2(iy), r2(iz)]); e.flash = 0.12; e.stag = 0.14; hitmarker(); return true;
}
function leadStartRound() { D.round++; const hf = D.round % 2 === 1 ? PSYCHO : SYBER; netSend(['R', D.round, hf, D.score[0], D.score[1]]); beginRound(D.round, hf, D.score[0], D.score[1]); }
function beginRound(n, leadForm, sh, sg) {
  D.round = n; D.score = [sh, sg]; D.over = false; const lead = D.role === 'lead', mine = lead ? leadForm : 1 - leadForm, L = LEVELS.duel;
  G.mode = 'duel'; resetGame('duel', true); G.wave = 1; G.waveT = 0; G.score = 0;
  const me = lead ? L.spawn : L.spawn2, them = lead ? L.spawn2 : L.spawn;
  P.pos.set(me[0] * BS + 1, 0, me[1] * BS + 1); P.yaw = lead ? 0 : Math.PI; P.form = mine; P.frozen = true; P.inv = 0; applyFormUI(); setMusicForm(mine);
  const e = spawnEnemy(4 + (1 - mine), them[0] * BS + 1, 0, them[1] * BS + 1, -1); e.fly = false; e.yaw = lead ? Math.PI : 0; e.maxHp = e.hp = 100; D.rival = e;
  D.lab = addLabel(e.pos.x, 2.6, e.pos.z, 'RIVAL', FNAME[1 - mine], '', mine === PSYCHO ? '#5fe3d2' : '#ff5fcf'); D.lab.max = 110;
  D.buf.length = 0; D.out.length = 0; D.phase = 'count'; D.countT = 3; D.lastC = 0; rope2.visible = false;
  if (G.state !== 'play') enterPlay();
  banner('Round ' + roman(n), 'You are ' + FNAME[mine] + ' · ' + (lead ? sh + ' : ' + sg : sg + ' : ' + sh));
}
function leadEndRound(loser) {
  if (D.phase !== 'live') return; const w = loser === 'lead' ? 1 : 0; D.score[w]++; const over = D.score[w] >= WIN, wc = w === 0 ? 'h' : 'g';
  netSend(['E', wc, D.score[0], D.score[1], over ? 1 : 0]); endRound(wc, D.score[0], D.score[1], over);
}
function endRound(wc, sh, sg, over) {
  D.phase = 'end'; D.score = [sh, sg]; D.over = !!over; D.endT = 3.2; const lead = D.role === 'lead', won = (wc === 'h') === lead;
  P.frozen = !won; banner(won ? 'Round won' : 'Round lost', lead ? sh + ' : ' + sg : sg + ' : ' + sh); if (won) sfx.pickup();
}
function duelDeath() {
  if (D.phase !== 'live') return; P.hp = 0; sfx.die();
  if (D.role === 'lead') leadEndRound('lead'); else { D.phase = 'dead'; P.frozen = true; netSend(['d']); }
}
function duelEndCard() {
  const lead = D.role === 'lead', me = lead ? D.score[0] : D.score[1], them = lead ? D.score[1] : D.score[0], won = me > them;
  setHead('Duel · First to ' + roman(WIN), won ? 'Victory' : 'Defeat');
  $('de-lede').textContent = won ? 'You won ' + me + ' rounds to ' + them + '.' : 'Your rival won ' + them + ' rounds to ' + me + '. Call a rematch.';
  $('de-me').textContent = me; $('de-them').textContent = them; D.endT = 1e9; leavePlay('duelend', 's-duelend'); H.dmg.style.opacity = 0;
}
function rivalUpdate(now) {
  const e = D.rival, b = D.buf; if (!e || e.dead || !b.length) return;
  const rt = now - 100, last = b[b.length - 1]; let j = b.length - 1; while (j >= 0 && b[j].t > rt) j--;
  let x, y, z, yaw;
  if (j < 0) { x = b[0].x; y = b[0].y; z = b[0].z; yaw = b[0].yaw; }
  else if (j === b.length - 1) { const k = Math.min(0.2, (rt - last.t) / 1000); x = last.x + last.vx * k; y = Math.max(0, last.y + last.vy * k); z = last.z + last.vz * k; yaw = last.yaw; }
  else { const a = b[j], c = b[j + 1], k = clamp((rt - a.t) / Math.max(1, c.t - a.t), 0, 1); x = lerp(a.x, c.x, k); y = lerp(a.y, c.y, k); z = lerp(a.z, c.z, k); let dy = c.yaw - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw = a.yaw + dy * k; }
  e.pos.set(x, y, z); e.yaw = yaw + Math.PI; e.hp = last.hp; if (D.lab) D.lab.pos.set(x, y + 2.7, z);
  const mx = x, my = y + 1.3, mz = z;
  if (last.sn !== D.rShotN) { D.rShotN = last.sn; addBeam(mx, my, mz, last.sx, last.sy, last.sz, 0.07, 0.09, 0.3, 1, 1); burst(last.sx, last.sy, last.sz, 2, 6, 0.25, 6, 0.4, 1, 1, 0); if (Math.random() < 0.5) tone('square', rnd(1300, 1700), 380, 0.07, 0.03); }
  if (last.bn !== D.rBlinkN) { D.rBlinkN = last.bn; burst(x, y + 1, z, 16, 8, 0.4, 9, 0.2, 1, 1, 0); addShell(x, y + 1, z, 0.3, 2.5, 0.3, 0.37, 0.89, 0.82); }
  if (last.fl & 1) for (let i = 0; i < 2; i++) spawnP(x + rnd(-0.4, 0.4), y + rnd(0.2, 1.6), z + rnd(-0.4, 0.4), 0, 0, 0, 0.35, 12, 1, 0.3, 0.85, 0);
  if (last.fl & 2) { _d.set(last.gx - mx, last.gy - my, last.gz - mz); const len = _d.length() || 0.01; _d.multiplyScalar(1 / len); rope2.visible = true; rope2.position.set((last.gx + mx) / 2, (last.gy + my) / 2, (last.gz + mz) / 2); rope2.quaternion.setFromUnitVectors(_z, _d); rope2.scale.set(0.06, 0.06, len); } else rope2.visible = false;
}
function updateDuel(dt) {
  const now = performance.now();
  if (D.phase === 'count') {
    D.countT -= dt; P.frozen = true; const c = Math.ceil(D.countT);
    if (c !== D.lastC && c > 0) { D.lastC = c; toast(String(c)); tone('square', 440, 440, 0.08, 0.1); }
    if (D.countT <= 0) { D.phase = 'live'; P.frozen = false; toast('FIGHT'); tone('square', 880, 880, 0.22, 0.14); }
  } else if (D.phase === 'end') {
    D.endT -= dt; if (D.endT <= 0) { if (D.over) { duelEndCard(); return; } if (D.role === 'lead') leadStartRound(); else D.endT = 1e9; }
  }
  if (D.lockT > 0) D.lockT -= dt;
  rivalUpdate(now);
  if (now - D.lastSend > 33) {
    D.lastSend = now; const g = P.grapple, fl = (P.ramT > 0 ? 1 : 0) | (g ? 2 : 0) | (P.slamming ? 4 : 0);
    netSend(['s', ++D.seq, r2(P.pos.x), r2(P.pos.y), r2(P.pos.z), r2(P.vel.x), r2(P.vel.y), r2(P.vel.z), r2(P.yaw), r2(P.pitch), Math.max(0, Math.round(P.hp)), fl, g ? r2(g.x) : 0, g ? r2(g.y) : 0, g ? r2(g.z) : 0, D.shotN, r2(D.shot[0]), r2(D.shot[1]), r2(D.shot[2]), D.blinkN]);
    if (D.out.length) { netSend(['k'].concat(D.out)); D.out.length = 0; }
  }
  setObj(D.phase === 'idle' ? '' : 'YOU ARE ' + FNAME[P.form].toUpperCase() + ' · FORMS LOCKED · FIRST TO ' + WIN);
  updateLabels();
}
function openDuel(invite) {
  setRun(false); setHead('Duel', 'Psycho against Syber'); G.state = 'duel'; showSec('s-duel'); D.pending = invite || '';
  duelStep(invite ? 'got' : 'start'); duelStatus(window.RTCPeerConnection && LINK ? '' : NO_RTC);
}
// keepalive on a timer (frames stop in a hidden tab), and a silence timeout so a vanished rival is noticed quickly
setInterval(() => { if (!isOpen(D.ctl)) return; netSend(['p']); if (performance.now() - D.lastRx > 6000) duelDrop(); }, 1000);
addEventListener('pagehide', () => { try { if (D.pc) D.pc.close(); } catch (e) { } });
function copyFrom(id, done) {
  const el = $(id), v = el.value; if (!v) return;
  const fall = () => { el.focus(); el.select(); duelStatus('Copy the selected text.'); };
  try { navigator.clipboard.writeText(v).then(() => duelStatus(done), fall); } catch (e) { fall(); }
}
function shareFrom(id, title) { const v = $(id).value; if (v && navigator.share) navigator.share({ title, url: v }).catch(() => { }); }
if (!navigator.share) for (const id of ['duel-share', 'duel-reply-share']) $(id).hidden = true;
for (const id of ['duel-invite', 'duel-reply']) $(id).addEventListener('focus', e => e.target.select());
for (const id of ['duel-in', 'duel-reply-in', 'duel-invite', 'duel-reply']) $(id).addEventListener('keydown', e => e.stopPropagation());
$('goduel').addEventListener('click', () => openDuel(''));
$('duel-make').addEventListener('click', duelInvite);
$('duel-answer').addEventListener('click', () => duelAnswer($('duel-in').value));
$('duel-in').addEventListener('keydown', e => { if (e.key === 'Enter') duelAnswer($('duel-in').value); });
$('duel-accept').addEventListener('click', () => duelAnswer(D.pending));
$('duel-copy').addEventListener('click', () => copyFrom('duel-invite', 'Invite copied. Waiting for the reply.'));
$('duel-share').addEventListener('click', () => shareFrom('duel-invite', 'PSYCHO SYBER: ARENA duel invite'));
$('duel-connect').addEventListener('click', () => duelConnect($('duel-reply-in').value));
$('duel-reply-in').addEventListener('keydown', e => { if (e.key === 'Enter') duelConnect($('duel-reply-in').value); });
$('duel-reply-copy').addEventListener('click', () => copyFrom('duel-reply', 'Reply copied. Waiting for your rival to open it.'));
$('duel-reply-share').addEventListener('click', () => shareFrom('duel-reply', 'PSYCHO SYBER: ARENA duel reply'));
$('duel-back').addEventListener('click', () => { duelClose(); toTitle(); });
$('de-again').addEventListener('click', () => { if (!isOpen(D.ctl)) return duelDrop(); if (D.role === 'lead') { D.score = [0, 0]; D.round = 0; leadStartRound(); } else { netSend(['x']); $('de-lede').textContent = 'Rematch called. Waiting for your rival.'; } });
$('de-title').addEventListener('click', () => { duelClose(); G.mode = 'wave'; toTitle(); });
// A reply link opened in a new tab hands its code to the tab that made the invite, through a channel that
// stays inside this browser. If no such tab answers, this tab shows the reply so it can be pasted there.
const chan = window.BroadcastChannel ? new BroadcastChannel('psycho-syber.arena') : null;
if (chan) chan.onmessage = ev => {
  const m = ev.data; if (!m || m.t !== 'reply' || typeof m.code !== 'string' || D.role !== 'lead' || !D.pc || D.pc.signalingState !== 'have-local-offer') return;
  duelConnect(m.code).then(ok => { if (ok) chan.postMessage({ t: 'taken' }); });
};
function openReply(code) {
  openDuel(''); $('duel-in').value = ''; duelStatus('Handing the reply to the tab that made the invite...');
  const orphan = () => duelStatus('No open invite was found in this browser. Go back to the tab that made the invite and paste this reply there: ' + linkFor('r', code));
  if (!chan) return orphan();
  const t = setTimeout(orphan, 1500), on = ev => { if (ev.data && ev.data.t === 'taken') { clearTimeout(t); chan.removeEventListener('message', on); duelStatus('Reply delivered. Go back to the tab that made the invite. You can close this one.'); } };
  chan.addEventListener('message', on); chan.postMessage({ t: 'reply', code });
}

/* ============================== input ============================== */
// While a game covers the screen, the site's own shortcut ("/" opens the Menu) must not fire underneath it.
addEventListener('keydown', e => { if (e.key === '/' && stage.classList.contains('run')) e.stopImmediatePropagation(); }, true);
addEventListener('keydown', e => {
  if (G.state !== 'play') {
    // outside play the page's own keys are left alone: Enter and P act only on the two panels that cover the screen
    if (document.activeElement && /^(BUTTON|A|INPUT|TEXTAREA|SELECT|SUMMARY)$/.test(document.activeElement.tagName)) return;
    if (e.code === 'Enter' && (G.state === 'dead' || G.state === 'pause')) { e.preventDefault(); if (G.state === 'dead') retry(); else enterPlay(); }
    else if (G.state === 'pause' && e.code === 'KeyP') enterPlay();
    return;
  }
  if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return; In.keys[e.code] = true;
  if (e.code === 'Space') In.jumpPressed = true;
  else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') In.dashPressed = true;
  else if (e.code === 'KeyQ' || e.code === 'KeyE' || e.code === 'Tab') In.swapPressed = true;
  else if (e.code === 'KeyF') { In.altPressed = true; In.mAlt = true; }
  else if (e.code === 'KeyP' || e.code === 'Escape') pause();
});
addEventListener('keyup', e => { In.keys[e.code] = false; if (e.code === 'KeyF') In.mAlt = false; });
addEventListener('blur', () => { In.keys = {}; In.mFire = In.mAlt = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) { locked = true; hadLock = true; noLock = false; }
  else { locked = false; if (G.state === 'play' && hadLock && !touchMode) pause(); }
});
document.addEventListener('pointerlockerror', () => { noLock = true; });
addEventListener('mousemove', e => { if (G.state === 'play' && !touchMode && (locked || noLock)) { In.lx += e.movementX || 0; In.ly += e.movementY || 0; } });
addEventListener('mousedown', e => {
  if (G.state !== 'play' || touchMode) return;
  if (e.target && e.target.id === 'ar-pausebtn') return;
  if (!locked) { noLock = false; requestLock(); }
  if (e.button === 0) In.mFire = true; else if (e.button === 2) { In.mAlt = true; In.altPressed = true; } else if (e.button === 1) { In.swapPressed = true; e.preventDefault(); }
});
addEventListener('mouseup', e => { if (e.button === 0) In.mFire = false; else if (e.button === 2) In.mAlt = false; });
stage.addEventListener('contextmenu', e => { if (G.state === 'play') e.preventDefault(); });
let wheelT = 0;
addEventListener('wheel', e => { const n = performance.now(); if (G.state === 'play' && n - wheelT > 180) { wheelT = n; In.swapPressed = true; } }, { passive: true });

const touches = new Map(), tl = $('touch'), stick = $('stick'), knob = $('knob');
function btnSet(name, el, down) {
  if (el) el.classList.toggle('on', down);
  if (name === 'fire') In.tFire = down;
  else if (name === 'alt') { In.tAlt = down; if (down) In.altPressed = true; }
  else if (name === 'jump') { In.tJump = down; if (down) In.jumpPressed = true; }
  else if (name === 'dash') { if (down) In.dashPressed = true; }
  else if (name === 'swap') { if (down) In.swapPressed = true; }
}
addEventListener('touchstart', () => { if (!touchMode) { touchMode = true; stage.classList.add('touch'); } }, { passive: true, once: true });
tl.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const b = t.target && t.target.closest ? t.target.closest('.tb') : null;
    if (b) { touches.set(t.identifier, { role: 'btn', name: b.dataset.b, el: b, x: t.clientX, y: t.clientY }); btnSet(b.dataset.b, b, true); }
    else if (t.clientX < canvas.clientWidth * 0.42 && ![...touches.values()].some(v => v.role === 'move')) {
      touches.set(t.identifier, { role: 'move', sx: t.clientX, sy: t.clientY });
      stick.style.display = 'block'; stick.style.left = t.clientX + 'px'; stick.style.top = t.clientY + 'px'; knob.style.transform = 'translate(0,0)';
    } else touches.set(t.identifier, { role: 'look', x: t.clientX, y: t.clientY });
  }
}, { passive: false });
tl.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const s = touches.get(t.identifier); if (!s) continue;
    if (s.role === 'move') {
      let dx = t.clientX - s.sx, dy = t.clientY - s.sy; const R = 54, d = Math.hypot(dx, dy);
      if (d > R) { s.sx += dx * (1 - R / d); s.sy += dy * (1 - R / d); dx *= R / d; dy *= R / d; stick.style.left = s.sx + 'px'; stick.style.top = s.sy + 'px'; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      const m = Math.min(1, Math.hypot(dx, dy) / R), dz0 = m < 0.12 ? 0 : 1; In.jx = dx / R * dz0; In.jy = -dy / R * dz0;
    } else {
      const dx = t.clientX - s.x, dy = t.clientY - s.y; s.x = t.clientX; s.y = t.clientY;
      const sp = Math.hypot(dx, dy), acc = 1 + Math.min(1.2, sp / 28); In.lx += dx * acc; In.ly += dy * acc;
    }
  }
}, { passive: false });
function touchEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const s = touches.get(t.identifier); if (!s) continue; touches.delete(t.identifier);
    if (s.role === 'move') { In.jx = In.jy = 0; stick.style.display = 'none'; }
    else if (s.role === 'btn') btnSet(s.name, s.el, false);
  }
}
tl.addEventListener('touchend', touchEnd, { passive: false }); tl.addEventListener('touchcancel', touchEnd, { passive: false });

/* ============================== post: bloom + chromatic kick ============================== */
const post = { on: true, rt: null, a: null, b: null, w: 0, h: 0 };
const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), postScene = new T.Scene();
const postQuad = new T.Mesh(new T.PlaneGeometry(2, 2), null); postQuad.frustumCulled = false; postScene.add(postQuad);
const PVS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
const pm = (uniforms, fragmentShader) => new T.ShaderMaterial({ uniforms, vertexShader: PVS, fragmentShader, depthTest: false, depthWrite: false, fog: false });
const brightMat = pm({ tex: { value: null }, px: { value: new T.Vector2() } }, `
  uniform sampler2D tex; uniform vec2 px; varying vec2 vUv;
  void main(){ vec3 c=texture2D(tex,vUv+px*vec2(-1.0,-1.0)).rgb+texture2D(tex,vUv+px*vec2(1.0,-1.0)).rgb+texture2D(tex,vUv+px*vec2(-1.0,1.0)).rgb+texture2D(tex,vUv+px*vec2(1.0,1.0)).rgb; c*=0.25;
    float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(0.34,0.8,l),1.0); }`);
const blurMat = pm({ tex: { value: null }, dir: { value: new T.Vector2() } }, `
  uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec3 c=texture2D(tex,vUv).rgb*0.227; c+=(texture2D(tex,vUv+dir*1.385).rgb+texture2D(tex,vUv-dir*1.385).rgb)*0.316; c+=(texture2D(tex,vUv+dir*3.231).rgb+texture2D(tex,vUv-dir*3.231).rgb)*0.070; gl_FragColor=vec4(c,1.0); }`);
const compMat = pm({ tex: { value: null }, bloom: { value: null }, str: { value: 0.9 }, ca: { value: 0 }, flash: { value: 0 } }, `
  uniform sampler2D tex; uniform sampler2D bloom; uniform float str; uniform float ca; uniform float flash; varying vec2 vUv;
  void main(){ vec2 d=vUv-0.5; vec3 c=vec3(texture2D(tex,vUv+d*ca).r,texture2D(tex,vUv).g,texture2D(tex,vUv-d*ca).b);
    c+=texture2D(bloom,vUv).rgb*str; c+=flash; gl_FragColor=vec4(c,1.0); }`);
const _sz = new T.Vector2();
function setupPost() {
  renderer.getDrawingBufferSize(_sz); const w = Math.max(4, _sz.x), h = Math.max(4, _sz.y), qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
  if (!post.rt) { post.rt = new T.WebGLRenderTarget(w, h, { samples: lowSpec ? 0 : 4 }); post.a = new T.WebGLRenderTarget(qw, qh, { depthBuffer: false }); post.b = new T.WebGLRenderTarget(qw, qh, { depthBuffer: false }); }
  else { post.rt.setSize(w, h); post.a.setSize(qw, qh); post.b.setSize(qw, qh); }
  post.w = w; post.h = h; brightMat.uniforms.px.value.set(1 / w, 1 / h);
}
function pass(mat, target) { postQuad.material = mat; renderer.setRenderTarget(target); renderer.render(postScene, postCam); }
function renderFrame(withGun) {
  if (!post.on) { renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera); if (withGun) { renderer.clearDepth(); renderer.render(gunScene, gunCam); } return; }
  renderer.setRenderTarget(post.rt); renderer.clear(); renderer.render(scene, camera); if (withGun) { renderer.clearDepth(); renderer.render(gunScene, gunCam); }
  brightMat.uniforms.tex.value = post.rt.texture; pass(brightMat, post.a);
  const qx = 1 / post.a.width, qy = 1 / post.a.height;
  for (let i = 0, n = lowSpec ? 1 : 2; i < n; i++) {
    const k = i + 1;
    blurMat.uniforms.tex.value = post.a.texture; blurMat.uniforms.dir.value.set(qx * k, 0); pass(blurMat, post.b);
    blurMat.uniforms.tex.value = post.b.texture; blurMat.uniforms.dir.value.set(0, qy * k); pass(blurMat, post.a);
  }
  const u = compMat.uniforms; u.tex.value = post.rt.texture; u.bloom.value = post.a.texture; u.str.value = G.od > 0 ? 1.25 : 1.05; u.ca.value = 0.0014 + G.ca + (G.od > 0 ? 0.0022 : 0); u.flash.value = G.flash;
  pass(compMat, null);
}
$('glow').addEventListener('click', () => { post.on = !post.on; $('glow').textContent = post.on ? 'GLOW ON' : 'GLOW OFF'; });

/* ============================== loop ============================== */
function resize() {
  const w = Math.max(2, stage.clientWidth), h = Math.max(2, stage.clientHeight); renderer.setSize(w, h, false);
  camera.aspect = gunCam.aspect = w / h; camera.fov = baseFov(); camera.updateProjectionMatrix(); gunCam.updateProjectionMatrix();
  setupPost();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200)); resize();
if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
let last = performance.now(), ema = 16, slowT = 0, menuA = 0.6, onScreen = true;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;   // the title's picture holds still; play itself moves
if (window.IntersectionObserver) new IntersectionObserver(es => { onScreen = es[es.length - 1].isIntersecting; }).observe(stage);
function frame(now) {
  requestAnimationFrame(frame);
  const raw = now - last; last = now; const dt = Math.min(0.034, Math.max(0.001, raw / 1000)); let fdt = dt;
  if (G.state === 'play') {
    if (G.hitstop > 0) { G.hitstop -= dt; fdt = dt * 0.05; }
    update(fdt);
    ema = lerp(ema, raw, 0.05);
    if (ema > 27 && !G.noAuto && (post.on || pixelRatio > 1)) { slowT += dt; if (slowT > 2.5) { if (post.on) { post.on = false; $('glow').textContent = 'GLOW OFF'; } else { pixelRatio = 1; renderer.setPixelRatio(1); resize(); } slowT = 0; ema = 18; } } else slowT = 0;
  } else if (G.state === 'pause' && G.mode === 'duel') {
    update(dt);                            // a duel goes on under its panel: see pause()
  } else if (G.state !== 'pause' && G.state !== 'pick') {
    if (!onScreen) return;                 // the title is scrolled out of view: draw nothing
    if (!calm) menuA += dt * 0.12; camera.position.set(CX + Math.cos(menuA) * 52, 20 + Math.sin(menuA * 1.7) * 5, CZ + Math.sin(menuA) * 52); camera.lookAt(CX, 6, CZ);
  }
  const live = G.state === 'play' || (G.state === 'pause' && G.mode === 'duel');
  if (G.state !== 'pause' || live) updateWorldFx(calm && !live ? 0 : fdt);
  G.ca = Math.max(0, G.ca - dt * 0.09); G.flash = Math.max(0, G.flash - dt * 2.4);
  renderFrame(G.state === 'play');
}
(() => { const c = document.createElement('canvas'); c.width = c.height = 180; const g = c.getContext('2d'), im = g.createImageData(180, 180); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); $('grain').style.backgroundImage = 'url(' + c.toDataURL() + ')'; })();
buildLevel('arena'); applyFormUI(); P.pos.set(SPX * BS + 1, 0, SPZ * BS + 1);
for (const id of ['gowave', 'goduel']) $(id).disabled = false;
{ // an invite (#d=) or a reply (#r=) in the address opens the duel panel; nothing is contacted until a button is pressed
  const hm = /^#([dr])=([A-Za-z0-9_-]{8,6000})$/.exec(location.hash || '');
  if (hm && hm[1] === 'd') openDuel(hm[2]); else if (hm) openReply(hm[2]);
}
requestAnimationFrame(frame);
// for the scripted browser runs in psycho-syber/test/
window.__arena = { G, P, In, D, enemies, projs, blk, vox, LEVELS, startRun, pause, swapForm, spawnEnemy, startWave, update, fireRocket, fireArc, hurtPlayer, destroyBlock, duelInvite, duelAnswer, duelConnect, duelClose };
})();
