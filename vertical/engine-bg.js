/* ============================================================================
   VERTICAL — Living Procedural Stage Backdrop Engine (60fps, 20 Movements)
   ============================================================================ */

(function () {
  window.VERTICAL = window.VERTICAL || {};

  const ACT_COLORS = {
    overture: { r: 245, g: 192, b: 99,  r2: 255, g2: 107, b2: 53  },
    evidence: { r: 255, g: 107, b: 53,  r2: 95,  g2: 183, b2: 255 },
    ignition: { r: 56,  g: 189, b: 248, r2: 253, g2: 224, b2: 71  },
    remaking: { r: 52,  g: 211, b: 153, r2: 168, g2: 85,  b2: 247 },
    cosmic:   { r: 255, g: 209, b: 102, r2: 192, g2: 132, b2: 252 },
    hinge:    { r: 255, g: 92,  b: 92,  r2: 245, g2: 192, b2: 99  },
    finale:   { r: 255, g: 107, b: 53,  r2: 245, g2: 192, b2: 99  }
  };

  class StageBackdrop {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.w = 0;
      this.h = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.slideIdx = 0;
      this.act = 'overture';
      this.surface = 'obsidian';
      this.color = { ...ACT_COLORS.overture };
      this.targetColor = { ...ACT_COLORS.overture };

      this.time = 0;
      this.warpBoost = 0;
      this.mx = 0; this.my = 0; this.tx = 0; this.ty = 0;

      this.particles = [];
      for (let i = 0; i < 220; i++) {
        this.particles.push({
          x: (Math.random() - 0.5) * 2.2,
          y: (Math.random() - 0.5) * 2.2,
          z: Math.random(),
          angle: Math.random() * Math.PI * 2,
          radius: 0.16 + Math.random() * 0.72,
          speed: 0.15 + Math.random() * 0.65,
          size: 0.6 + Math.random() * 1.8,
          alpha: 0.18 + Math.random() * 0.62
        });
      }

      this.t4Verts = [];
      for (let i = 0; i < 16; i++) {
        this.t4Verts.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
      }
      this.t4Edges = [];
      for (let i = 0; i < 16; i++) {
        for (let j = i + 1; j < 16; j++) {
          const diff = i ^ j;
          if (diff && !(diff & (diff - 1))) this.t4Edges.push([i, j]);
        }
      }

      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('mousemove', (e) => {
        this.tx = (e.clientX / Math.max(this.w, 1) - 0.5) * 2;
        this.ty = (e.clientY / Math.max(this.h, 1) - 0.5) * 2;
      });

      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    resize() {
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    setState(slideIdx, act, surface = 'obsidian') {
      this.slideIdx = slideIdx;
      this.act = act;
      this.surface = surface;
      this.targetColor = ACT_COLORS[act] || ACT_COLORS.overture;
      this.warpBoost = 1.0;
    }

    _lerpColors() {
      const k = 0.04;
      for (const key of ['r', 'g', 'b', 'r2', 'g2', 'b2']) {
        this.color[key] += (this.targetColor[key] - this.color[key]) * k;
      }
    }

    _loop() {
      requestAnimationFrame(this._loop);
      if (this.surface !== 'obsidian') return;

      this.time += 0.0085;
      this.warpBoost *= 0.935;
      this.mx += (this.tx - this.mx) * 0.05;
      this.my += (this.ty - this.my) * 0.05;
      this._lerpColors();

      const ctx = this.ctx;
      const w = this.w, h = this.h;
      const cx = w * 0.5 + this.mx * 18;
      const cy = h * 0.5 + this.my * 14;
      const { r, g, b, r2, g2, b2 } = this.color;
      const c1 = (a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
      const c2 = (a) => `rgba(${r2 | 0},${g2 | 0},${b2 | 0},${a})`;

      ctx.fillStyle = this.warpBoost > 0.12 ? 'rgba(5, 6, 8, 0.34)' : 'rgba(5, 6, 8, 0.46)';
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createRadialGradient(cx, cy * 0.92, 20, cx, cy, Math.max(w, h) * 0.68);
      grad.addColorStop(0, c1(0.08 + this.warpBoost * 0.06));
      grad.addColorStop(0.45, c2(0.025));
      grad.addColorStop(1, 'rgba(5, 6, 8, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(243, 239, 234, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
      ctx.stroke();

      const mode = this.slideIdx;
      const minDim = Math.min(w, h);

      if (mode === 0) {
        for (let i = 0; i < 4; i++) {
          const rad = minDim * (0.21 + i * 0.095) + Math.sin(this.time * 1.4 + i) * 6;
          ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.strokeStyle = i === 0 ? c1(0.22) : c1(0.07);
          ctx.lineWidth = i === 0 ? 1.3 : 0.7; ctx.stroke();
        }
      } else if (mode === 1 || mode === 2 || mode === 6) {
        ctx.strokeStyle = c1(0.06); ctx.lineWidth = 0.8;
        for (let x = -6; x <= 6; x++) {
          ctx.beginPath();
          for (let step = 0; step <= 20; step++) {
            const u = step / 20;
            const px = cx + x * (w * 0.09) * (0.4 + u * 0.9);
            const bend = Math.pow(u, 3.2) * (h * 0.34);
            const py = h * 0.88 - u * h * 0.65 - bend * (x > 1 ? 0.55 : 0.12);
            if (step === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      } else if (mode === 7) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.time * 0.45);
        for (let arm = 0; arm < 3; arm++) {
          ctx.beginPath();
          for (let i = 0; i < 85; i++) {
            const t = i * 0.14;
            const rad = 12 * Math.exp(t * 0.27);
            const ang = t + arm * ((Math.PI * 2) / 3);
            if (i === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
          }
          ctx.strokeStyle = c1(0.09); ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
      } else if (mode === 9) {
        const a1 = this.time * 0.55, a2 = this.time * 0.37, scale = minDim * 0.28;
        const proj = this.t4Verts.map(([x, y, z, w4]) => {
          const x1 = x * Math.cos(a1) - w4 * Math.sin(a1);
          const w1 = x * Math.sin(a1) + w4 * Math.cos(a1);
          const y1 = y * Math.cos(a2) - z * Math.sin(a2);
          const z1 = y * Math.sin(a2) + z * Math.cos(a2);
          const d4 = 2.6 / (3.2 - w1);
          const d3 = 2.8 / (3.8 - z1 * d4);
          return [cx + x1 * d4 * d3 * scale, cy + y1 * d4 * d3 * scale];
        });
        ctx.strokeStyle = c1(0.11); ctx.lineWidth = 1;
        this.t4Edges.forEach(([i, j]) => {
          ctx.beginPath(); ctx.moveTo(proj[i][0], proj[i][1]); ctx.lineTo(proj[j][0], proj[j][1]); ctx.stroke();
        });
      } else if (mode === 13 || mode === 14) {
        ctx.save(); ctx.translate(cx, cy);
        for (let i = 0; i < 6; i++) {
          ctx.save(); ctx.rotate(i * 0.42 + this.time * (0.08 + i * 0.015));
          ctx.beginPath(); ctx.ellipse(0, 0, minDim * (0.26 + i * 0.08), minDim * (0.09 + i * 0.025), 0, 0, Math.PI * 2);
          ctx.strokeStyle = i % 2 === 0 ? c1(0.10) : c2(0.07); ctx.lineWidth = 0.9; ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      } else if (mode === 16 || mode === 17) {
        for (let i = 1; i <= 5; i++) {
          const wave = ((this.time * 0.35 + i * 0.2) % 1);
          ctx.beginPath(); ctx.arc(cx, cy, wave * Math.max(w, h) * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = c1((1 - wave) * 0.14); ctx.lineWidth = 0.9; ctx.stroke();
        }
      }

      const isOrbital = mode === 0 || mode === 7 || mode === 13 || mode === 19;
      const isHyperStreak = mode === 8 || this.warpBoost > 0.16;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        let sx, sy, pxPrev, pyPrev;
        if (isOrbital) {
          const spin = (0.0026 + this.warpBoost * 0.03) * p.speed;
          p.angle += spin;
          const tilt = mode === 13 ? 0.42 : 0.72;
          const rr = p.radius * Math.max(w, h) * 0.56;
          sx = cx + Math.cos(p.angle) * rr; sy = cy + Math.sin(p.angle) * rr * tilt;
          pxPrev = cx + Math.cos(p.angle - spin * 6) * rr; pyPrev = cy + Math.sin(p.angle - spin * 6) * rr * tilt;
        } else {
          const dz = 0.0016 + (mode === 8 ? 0.010 : 0.0015) * p.speed + this.warpBoost * 0.034;
          const prevZ = p.z;
          p.z -= dz;
          if (p.z <= 0.02) { p.z = 1.0; p.x = (Math.random() - 0.5) * 2.2; p.y = (Math.random() - 0.5) * 2.2; }
          sx = cx + (p.x / p.z) * w * 0.36; sy = cy + (p.y / p.z) * h * 0.36;
          pxPrev = cx + (p.x / Math.min(1, prevZ + dz * 2.5)) * w * 0.36;
          pyPrev = cy + (p.y / Math.min(1, prevZ + dz * 2.5)) * h * 0.36;
        }
        if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
        const depthAlpha = (1 - p.z * 0.65) * p.alpha;
        if (isHyperStreak) {
          ctx.beginPath(); ctx.moveTo(pxPrev, pyPrev); ctx.lineTo(sx, sy);
          ctx.strokeStyle = i % 3 === 0 ? c1(depthAlpha * 0.85) : `rgba(243,239,234,${depthAlpha * 0.52})`;
          ctx.lineWidth = p.size * 0.85; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(sx, sy, p.size * (0.7 + (1 - p.z) * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = i % 4 === 0 ? c1(depthAlpha * 0.9) : i % 7 === 0 ? c2(depthAlpha * 0.72) : `rgba(243,239,234,${depthAlpha * 0.50})`;
          ctx.fill();
        }
      }
    }
  }

  window.VERTICAL.initBackdrop = function () {
    const canvas = document.getElementById('bg-stage');
    if (canvas) window.VERTICAL.bg = new StageBackdrop(canvas);
  };
})();
