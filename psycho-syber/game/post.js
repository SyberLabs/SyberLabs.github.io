// PSYCHO SYBER: presenting the frame. The two skins are drawn into two 480x270 canvases; this shader puts one of
// them on screen, and during a change of form it reveals the new world in a ring that spreads from the player.
// SYBER gets scanlines and a cool grade. PSYCHO breathes: the image ripples, its hues drift, and during a roar it
// folds into a kaleidoscope. The ripple, the fold and the split of colours all fall to nothing around the player,
// so the ground under the jaguar holds still while the rest of its world moves. Without WebGL the frames are drawn
// with the 2D canvas and the page still plays.
const VS = 'attribute vec2 a; varying vec2 v; void main(){ v = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5); gl_Position = vec4(a, 0.0, 1.0); }';
const FS = `precision mediump float;
uniform sampler2D uA, uB; uniform float uT, uTo, uWipe, uTrip, uBeat, uHurt, uCalm; uniform vec2 uC;
varying vec2 v;
vec3 hue(vec3 c, float a) { const vec3 k = vec3(0.57735); float ca = cos(a), sa = sin(a); return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca); }
void main() {
  vec2 asp = vec2(1.7778, 1.0);
  float d = distance(v * asp, uC * asp), edge = uWipe * 2.1;
  float inside = step(d, edge);
  float psy = mix(1.0 - uTo, uTo, inside);
  vec3 col;
  if (psy > 0.5) {
    float sway = smoothstep(0.07, 0.32, d);   // still around you: within a tile of the jaguar nothing ripples or splits, and five tiles out it all does
    float amp = (0.0030 + 0.0060 * uTrip) * (1.0 - uCalm) * sway;
    vec2 w = v + vec2(sin(v.y * 24.0 + uT * 2.1), cos(v.x * 19.0 + uT * 1.7)) * amp;
    if (uTrip > 0.0) {
      vec2 q = w - 0.5; float a = atan(q.y, q.x), r = length(q), n = 3.1416 / 6.0;
      a = abs(mod(a, 2.0 * n) - n);
      w = mix(w, 0.5 + r * vec2(cos(a), sin(a)), uTrip * 0.3 * sway);
    }
    float f = 0.0028 * (1.0 - uCalm) * sway;
    col = vec3(texture2D(uB, w + vec2(f, 0.0)).r, texture2D(uB, w).g, texture2D(uB, w - vec2(f, 0.0)).b);
    col = hue(col, (sin(uT * 0.45) * 0.4 + uTrip * sin(uT * 3.0) * 1.2) * (1.0 - uCalm));
    col *= 1.04 + 0.14 * uBeat;
    vec2 q = v - 0.5; col += vec3(0.25, 0.05, 0.3) * dot(q, q) * (0.6 + 0.4 * sin(uT * 1.3));
  } else {
    col = texture2D(uA, v).rgb;
    col *= 0.93 + 0.07 * sin(v.y * 270.0 * 3.14159);
    col += vec3(0.0, 0.012, 0.03) * uBeat;
    vec2 q = v - 0.5; col *= 1.0 - dot(q, q) * 0.55;
  }
  float rim = (1.0 - smoothstep(0.0, 0.035, abs(d - edge))) * step(uWipe, 0.999) * step(0.001, uWipe);
  col += rim * mix(vec3(0.3, 0.75, 1.0), vec3(1.0, 0.37, 0.64), uTo);
  vec2 q = v - 0.5; col = mix(col, vec3(0.99, 0.2, 0.12), uHurt * dot(q, q) * 1.6);
  gl_FragColor = vec4(col, 1.0);
}`;

export function makePost(canvas) {
  let gl = null;
  try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }); } catch { gl = null; }
  if (gl) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = {}; for (const n of ['uA', 'uB', 'uT', 'uTo', 'uWipe', 'uTrip', 'uBeat', 'uHurt', 'uCalm', 'uC']) U[n] = gl.getUniformLocation(prog, n);
      const tex = [0, 1].map(i => {
        const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
        for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, val);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        return t;
      });
      gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1);
      return {
        webgl: true,
        // frames: [syberCanvas | null, psychoCanvas | null]; only the frames that were drawn this tick are uploaded
        present(frames, u) {
          gl.viewport(0, 0, canvas.width, canvas.height);
          for (const i of [0, 1]) if (frames[i]) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frames[i]); }
          gl.uniform1f(U.uT, u.t % 1000); gl.uniform1f(U.uTo, u.to); gl.uniform1f(U.uWipe, u.wipe); gl.uniform1f(U.uTrip, u.trip); gl.uniform1f(U.uBeat, u.beat);
          gl.uniform1f(U.uHurt, u.hurt); gl.uniform1f(U.uCalm, u.calm); gl.uniform2f(U.uC, u.cx, u.cy);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
      };
    }
  }
  const c = canvas.getContext('2d');
  return {
    webgl: false,
    present(frames, u) {
      c.imageSmoothingEnabled = false;
      const W = canvas.width, H = canvas.height, to = u.to > 0.5 ? 1 : 0, from = 1 - to;
      if (u.wipe < 1 && frames[from]) {
        c.drawImage(frames[from], 0, 0, W, H);
        c.save(); c.beginPath(); c.arc(u.cx * W, u.cy * H, u.wipe * 2.1 * H, 0, 6.2832); c.clip(); if (frames[to]) c.drawImage(frames[to], 0, 0, W, H); c.restore();
      } else if (frames[to]) c.drawImage(frames[to], 0, 0, W, H);
    },
  };
}
