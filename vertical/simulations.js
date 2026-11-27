/* ============================================================================
   VERTICAL — 12 Bespoke Interactive Empirical & Physics Simulations
   Zero external dependencies. HiDPI Canvas 2D. Auto-pauses off-screen slides.
   ============================================================================ */

(function () {
  window.VERTICAL = window.VERTICAL || {};
  const sims = {};

  function setupCanvas(canvas) {
    const parent = canvas.parentElement;
    if (!parent) return { ctx: canvas.getContext('2d'), w: 400, h: 300 };
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(rect.width, 280);
    const h = Math.max(rect.height, 190);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* --------------------------------------------------------------------------
     SIM 1 (idx 1 · Slide 02): THE ANCHOR BIAS TRAP
     -------------------------------------------------------------------------- */
  function initAnchorSim() {
    const canvas = document.getElementById('canvas-anchor');
    if (!canvas) return;
    const slider = document.getElementById('anchor-year');
    const yearOut = document.getElementById('anchor-year-val');
    const errOut = document.getElementById('anchor-err-val');
    const btnLin = document.getElementById('anchor-scale-lin');
    const btnLog = document.getElementById('anchor-scale-log');

    let scaleMode = 'linear';
    let anchorYear = 2024;
    let phase = 0;

    function logCap(yr) {
      const t = (yr - 2016) / 18;
      return -1.4 + 3.2 * t + 7.4 * Math.pow(Math.max(0, t), 2.8);
    }

    function updateLabels() {
      if (yearOut) yearOut.textContent = String(anchorYear);
      const futureYr = Math.min(2034, anchorYear + 4);
      const y0 = Math.pow(10, logCap(anchorYear));
      const yPrev = Math.pow(10, logCap(anchorYear - 1));
      const slope = Math.max(0.01, y0 - yPrev);
      const linearGuess = y0 + slope * (futureYr - anchorYear);
      const trueVal = Math.pow(10, logCap(futureYr));
      const ratio = Math.max(1, trueVal / Math.max(linearGuess, 1e-6));
      if (errOut) {
        errOut.textContent = ratio > 1000
          ? `10^${Math.floor(Math.log10(ratio))}× UNDERESTIMATE`
          : `${ratio.toFixed(0)}× UNDERESTIMATE`;
      }
    }

    slider?.addEventListener('input', () => {
      anchorYear = parseInt(slider.value, 10);
      updateLabels();
      window.VERTICAL.audio?.playTick(0.85 + (anchorYear - 2018) * 0.04);
    });
    btnLin?.addEventListener('click', () => {
      scaleMode = 'linear'; btnLin.classList.add('active'); btnLog?.classList.remove('active');
      window.VERTICAL.audio?.playTick(1.1);
    });
    btnLog?.addEventListener('click', () => {
      scaleMode = 'log'; btnLog.classList.add('active'); btnLin?.classList.remove('active');
      window.VERTICAL.audio?.playTick(1.3);
    });
    updateLabels();

    sims[1] = {
      draw() {
        phase += 0.025;
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const pad = { l: 68, r: 24, t: 28, b: 36 };
        const pw = w - pad.l - pad.r;
        const ph = h - pad.t - pad.b;

        const minYr = 2016, maxYr = 2034;
        const xOf = (yr) => pad.l + ((yr - minYr) / (maxYr - minYr)) * pw;
        const maxLog = logCap(2033.2), minLog = logCap(2016);
        const linCapMax = Math.pow(10, logCap(Math.min(2033, anchorYear + 4.2)));

        const yOf = (yr) => {
          const lc = logCap(yr);
          if (scaleMode === 'log') {
            return pad.t + ph * (1 - Math.min(1, Math.max(0, (lc - minLog) / (maxLog - minLog))));
          }
          return pad.t + ph * (1 - Math.min(1, Math.pow(10, lc) / linCapMax));
        };

        ctx.strokeStyle = 'rgba(243,239,234,0.07)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const gy = pad.t + (ph / 4) * i;
          ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
        }
        for (let yr = 2016; yr <= 2034; yr += 3) {
          const gx = xOf(yr);
          ctx.beginPath(); ctx.moveTo(gx, pad.t); ctx.lineTo(gx, pad.t + ph); ctx.stroke();
          ctx.fillStyle = yr === 2026 ? '#ff6b35' : 'rgba(243,239,234,0.42)';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(yr === 2026 ? '2026' : String(yr), gx, h - 14);
        }

        ctx.fillStyle = 'rgba(243,239,234,0.44)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        if (scaleMode === 'log') {
          for (let i = 0; i <= 4; i++) {
            const lc = minLog + ((maxLog - minLog) * (4 - i)) / 4;
            ctx.fillText(`10^${lc.toFixed(0)}`, pad.l - 8, pad.t + (ph / 4) * i + 3);
          }
        } else {
          ctx.fillText('VERTICAL', pad.l - 8, pad.t + 8);
          ctx.fillText('50%', pad.l - 8, pad.t + ph * 0.5 + 3);
          ctx.fillText('0', pad.l - 8, pad.t + ph + 3);
        }

        const nowX = xOf(2026);
        ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255, 107, 53, 0.35)';
        ctx.beginPath(); ctx.moveTo(nowX, pad.t); ctx.lineTo(nowX, pad.t + ph); ctx.stroke(); ctx.restore();

        const ax = xOf(anchorYear), ay = yOf(anchorYear);
        const axPrev = xOf(anchorYear - 1), ayPrev = yOf(anchorYear - 1);
        const slopePx = (ay - ayPrev) / Math.max(1, ax - axPrev);
        const projYr = Math.min(maxYr, anchorYear + 5.5);
        const pxEnd = xOf(projYr);
        const pyEnd = Math.min(pad.t + ph, Math.max(pad.t, ay + slopePx * (pxEnd - ax)));

        ctx.save();
        ctx.beginPath(); ctx.moveTo(ax, ay);
        for (let yr = anchorYear; yr <= projYr; yr += 0.25) ctx.lineTo(xOf(yr), Math.max(pad.t, yOf(yr)));
        ctx.lineTo(pxEnd, pyEnd); ctx.closePath();
        const errGrad = ctx.createLinearGradient(ax, pad.t, pxEnd, pad.t + ph);
        errGrad.addColorStop(0, 'rgba(255, 92, 92, 0.28)'); errGrad.addColorStop(1, 'rgba(255, 107, 53, 0.04)');
        ctx.fillStyle = errGrad; ctx.fill(); ctx.restore();

        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(243, 239, 234, 0.58)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(pxEnd, pyEnd); ctx.stroke(); ctx.restore();

        ctx.fillStyle = 'rgba(243, 239, 234, 0.78)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
        ctx.fillText('HUMAN INTUITION (LINEAR)', Math.min(pxEnd - 135, ax + 14), Math.min(pad.t + ph - 8, pyEnd - 7));

        ctx.save(); ctx.beginPath(); let started = false;
        for (let yr = minYr; yr <= maxYr; yr += 0.15) {
          const x = xOf(yr), y = yOf(yr);
          if (y < pad.t - 2) continue;
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#ff6b35'; ctx.shadowColor = 'rgba(255, 107, 53, 0.85)'; ctx.shadowBlur = 16; ctx.lineWidth = 2.6;
        ctx.stroke(); ctx.restore();

        ctx.beginPath(); ctx.arc(ax, ay, 5.5 + Math.sin(phase * 2) * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#f6b94c'; ctx.shadowColor = '#f6b94c'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;

        const gapYr = Math.min(maxYr - 1, anchorYear + 3.5);
        const gx = xOf(gapYr), gyTrue = Math.max(pad.t + 10, yOf(gapYr));
        const gyLin = Math.min(pad.t + ph - 4, ay + slopePx * (gx - ax));
        if (gyLin - gyTrue > 28) {
          ctx.strokeStyle = 'rgba(255, 92, 92, 0.85)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(gx, gyLin - 4); ctx.lineTo(gx, gyTrue + 6); ctx.stroke();
          ctx.fillStyle = '#ff8585'; ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
          ctx.fillText('BLIND SPOT', gx, (gyTrue + gyLin) * 0.5);
        }
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 2 (idx 2 · Slide 03): METR TASK HORIZONS LOG CURVE (2023–2029)
     -------------------------------------------------------------------------- */
  function initHorizonsSim() {
    const canvas = document.getElementById('canvas-horizons');
    if (!canvas) return;
    const pills = document.querySelectorAll('[data-horizon-mode]');
    const readout = document.getElementById('horizon-readout');

    // Modes: 'base' (3.6 mo doubling), 'verif' (1.65 mo verifiable TH2), 'orig' (7 mo 2019-24 baseline)
    let mode = 'base';
    let anim = 0;

    const LABELS = {
      base:  '3.6-MO DOUBLING → 200 H (JUL 2027) · 2,000 H (MID-2028)',
      verif: '1.65-MO CHECKABLE (TH2) → 1 WORK-YEAR BEFORE LATE 2027',
      orig:  '7-MO HISTORICAL (2019–24) → 1 WORK-MONTH BY LATE 2028'
    };

    pills.forEach((p) => {
      p.addEventListener('click', () => {
        pills.forEach((b) => b.classList.remove('active'));
        p.classList.add('active');
        mode = p.dataset.horizonMode;
        anim = 0;
        if (readout) readout.textContent = LABELS[mode];
        window.VERTICAL.audio?.playTick(mode === 'verif' ? 1.35 : mode === 'base' ? 1.1 : 0.85);
      });
    });

    // Anchored empirical points (year, hours)
    const MEASURED = [
      { yr: 2023.2, hrs: 0.03, label: '' },
      { yr: 2024.4, hrs: 0.25, label: '' },
      { yr: 2025.15, hrs: 0.83, label: 'Claude 3.7 · 50m' },
      { yr: 2025.9, hrs: 3.95, label: 'Gemini 3 Pro · 3h 57m' },
      { yr: 2026.55, hrs: 18.0, label: 'Frontier · 16–20h' },
      { yr: 2026.9, hrs: 27.0, label: 'Verifiable · 27h (Today)' }
    ];

    sims[2] = {
      reset() { anim = 0; },
      draw() {
        anim = Math.min(1, anim + 0.022);
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const pad = { l: 78, r: 26, t: 26, b: 34 };
        const pw = w - pad.l - pad.r;
        const ph = h - pad.t - pad.b;

        const minYr = 2023, maxYr = 2029;
        const minLogH = Math.log10(1 / 60); // 1 min
        const maxLogH = Math.log10(2400);   // > 1 work-year (2000h)

        const xOf = (yr) => pad.l + ((yr - minYr) / (maxYr - minYr)) * pw;
        const yOf = (hrs) => {
          const lh = Math.log10(Math.max(1 / 60, hrs));
          return pad.t + ph * (1 - Math.min(1, Math.max(0, (lh - minLogH) / (maxLogH - minLogH))));
        };

        // Horizontal Y-axis human working time ticks
        const yTicks = [
          { hrs: 1 / 60, label: '1 min' },
          { hrs: 1,      label: '1 hour' },
          { hrs: 8,      label: '1 workday' },
          { hrs: 40,     label: '1 work-wk' },
          { hrs: 160,    label: '1 work-mo' },
          { hrs: 2000,   label: '1 work-yr' }
        ];
        ctx.font = '10px "JetBrains Mono", monospace';
        yTicks.forEach((tk) => {
          const gy = yOf(tk.hrs);
          ctx.strokeStyle = tk.hrs === 2000 ? 'rgba(255,107,53,0.22)' : 'rgba(243,239,234,0.07)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
          ctx.fillStyle = 'rgba(243,239,234,0.48)';
          ctx.textAlign = 'right';
          ctx.fillText(tk.label, pad.l - 8, gy + 3);
        });

        // X-axis year ticks
        for (let yr = 2023; yr <= 2029; yr++) {
          const gx = xOf(yr);
          ctx.strokeStyle = 'rgba(243,239,234,0.05)';
          ctx.beginPath(); ctx.moveTo(gx, pad.t); ctx.lineTo(gx, pad.t + ph); ctx.stroke();
          ctx.fillStyle = yr === 2026 ? '#ff6b35' : 'rgba(243,239,234,0.45)';
          ctx.textAlign = 'center';
          ctx.fillText(String(yr), gx, h - 12);
        }

        // Today vertical marker (Nov 2026 = 2026.9)
        const tx = xOf(2026.9);
        ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(243,239,234,0.28)';
        ctx.beginPath(); ctx.moveTo(tx, pad.t); ctx.lineTo(tx, pad.t + ph); ctx.stroke(); ctx.restore();
        ctx.fillStyle = 'rgba(243,239,234,0.65)'; ctx.textAlign = 'center';
        ctx.fillText('TODAY (NOV 2026)', tx, pad.t - 8);

        // Measured historical line (2023 -> Nov 2026)
        ctx.save();
        ctx.beginPath();
        MEASURED.forEach((pt, i) => {
          const px = xOf(pt.yr), py = yOf(pt.hrs);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = '#ff6b35';
        ctx.shadowColor = 'rgba(255, 107, 53, 0.75)';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.restore();

        // Extrapolation dashed line from Nov 2026 onward depending on selected doubling period
        const dblYrs = mode === 'verif' ? 1.65 / 12 : mode === 'orig' ? 7.0 / 12 : 3.6 / 12;
        const startH = mode === 'verif' ? 27.0 : 18.0;
        const lineCol = mode === 'verif' ? '#5fb7ff' : mode === 'orig' ? '#8a93a6' : '#ff6b35';

        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        const endYr = 2026.9 + (2029 - 2026.9) * anim;
        let firstEx = true;
        let hit200 = null, hit2000 = null;
        for (let yr = 2026.9; yr <= endYr; yr += 0.04) {
          const hrs = startH * Math.pow(2, (yr - 2026.9) / dblYrs);
          if (!hit200 && hrs >= 200) hit200 = { yr, hrs: 200 };
          if (!hit2000 && hrs >= 2000) hit2000 = { yr, hrs: 2000 };
          const px = xOf(yr), py = yOf(hrs);
          if (firstEx) { ctx.moveTo(px, py); firstEx = false; } else ctx.lineTo(px, py);
          if (hrs >= 2400) break;
        }
        ctx.strokeStyle = lineCol;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();

        // Measured milestone dots & clean non-overlapping labels
        MEASURED.forEach((pt, idx) => {
          const px = xOf(pt.yr), py = yOf(pt.hrs);
          ctx.beginPath(); ctx.arc(px, py, idx === MEASURED.length - 1 ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = idx === MEASURED.length - 1 ? '#5fb7ff' : '#f3efea';
          ctx.fill();
          if (pt.label) {
            ctx.fillStyle = idx === MEASURED.length - 1 ? '#5fb7ff' : 'rgba(243,239,234,0.82)';
            ctx.textAlign = idx >= 4 ? 'right' : 'left';
            const dy = idx === 4 ? 18 : idx === 5 ? -12 : 4;
            const dx = idx >= 4 ? -12 : 10;
            ctx.fillText(pt.label, px + dx, py + dy);
          }
        });

        // Projected milestone markers
        if (hit200 && mode === 'base') {
          const px = xOf(hit200.yr), py = yOf(200);
          ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fillStyle = '#ff6b35'; ctx.fill();
          ctx.fillStyle = '#ff9a73'; ctx.textAlign = 'left';
          ctx.fillText('200h · Jul 2027 (extrap.)', px + 10, py + 4);
        }
        if (hit2000) {
          const px = xOf(hit2000.yr), py = yOf(2000);
          ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fillStyle = lineCol; ctx.fill();
          ctx.fillStyle = lineCol;
          ctx.textAlign = px > w - 175 ? 'right' : 'left';
          const lbl = mode === 'verif' ? '1 work-yr (~2027)' : '2,000h · mid-2028';
          ctx.fillText(lbl, px + (px > w - 175 ? -12 : 10), py + 22);
        }
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 3 (idx 4 · Slide 05): THE FUEL — 200-GW WAFFLE / CAPEX / 81× DEMAND
     -------------------------------------------------------------------------- */
  function initFuelSim() {
    const canvas = document.getElementById('canvas-fuel');
    if (!canvas) return;
    const pills = document.querySelectorAll('[data-fuel-tab]');
    const badge = document.getElementById('fuel-stat-badge');

    let tab = 'power';
    let anim = 0;

    const BADGES = {
      power:   '180 GW BY 2031 · 20+ GW GAP',
      capital: '$7.6T CAPEX (2026–2031)',
      demand:  '81× RUN-RATE GROWTH IN 21 MOS'
    };

    pills.forEach((p) => {
      p.addEventListener('click', () => {
        pills.forEach((b) => b.classList.remove('active'));
        p.classList.add('active');
        tab = p.dataset.fuelTab;
        anim = 0;
        if (badge) badge.textContent = BADGES[tab];
        window.VERTICAL.audio?.playTick(1.1);
      });
    });

    sims[4] = {
      reset() { anim = 0; },
      draw() {
        anim = Math.min(1, anim + 0.028);
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        if (tab === 'power') {
          // 20 cols x 10 rows = 200 squares (each = 1 GW ≈ 1 nuclear reactor)
          // First 5 = cream (1 planned 5 GW campus, $150-200B)
          // Next 175 = ember (total 180 GW expected by 2031)
          // Last row (20 squares) = dashed ion-blue (20+ GW projected gap in 2031)
          const cols = 20, rows = 10;
          const padX = 28, padTop = 34, padBot = 38;
          const cellW = (w - padX * 2) / cols;
          const cellH = (h - padTop - padBot) / rows;
          const sq = Math.max(8, Math.min(cellW, cellH) - 4);
          const gridW = cols * (sq + 4) - 4;
          const startX = (w - gridW) * 0.5;
          const startY = padTop + ((h - padTop - padBot) - (rows * (sq + 4) - 4)) * 0.5;
          const revealed = Math.floor(anim * 200);

          for (let i = 0; i < 200; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const x = startX + c * (sq + 4);
            const y = startY + r * (sq + 4);
            const show = i <= revealed;

            if (r === 9) {
              ctx.strokeStyle = show ? '#5fb7ff' : 'rgba(95,183,255,0.18)';
              ctx.setLineDash([2, 2]);
              ctx.lineWidth = 1.2;
              ctx.strokeRect(x + 0.5, y + 0.5, sq - 1, sq - 1);
              ctx.setLineDash([]);
            } else if (i < 5) {
              ctx.fillStyle = show ? '#f3efea' : 'rgba(243,239,234,0.12)';
              ctx.fillRect(x, y, sq, sq);
            } else {
              ctx.fillStyle = show ? '#ff6b35' : 'rgba(255,107,53,0.12)';
              ctx.fillRect(x, y, sq, sq);
            }
          }

          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#f3efea'; ctx.textAlign = 'left';
          ctx.fillText('■ 5 GW = ONE PLANNED CAMPUS ($150–200B)', startX, startY - 12);
          ctx.fillStyle = '#ff6b35'; ctx.textAlign = 'right';
          ctx.fillText('180 SQUARES = 180 NUCLEAR REACTORS', startX + gridW, startY - 12);
          ctx.fillStyle = '#5fb7ff'; ctx.textAlign = 'right';
          ctx.fillText('□ DASHED ROW: 20+ GW PROJECTED 2031 SHORTFALL', startX + gridW, startY + rows * (sq + 4) + 14);
          ctx.fillStyle = 'rgba(243,239,234,0.52)'; ctx.textAlign = 'left';
          ctx.fillText('13 GW SUPPLY SHORTFALL TODAY', startX, startY + rows * (sq + 4) + 14);
        } else if (tab === 'capital') {
          // 4 Hyperscaler Annual CapEx Bars ($226B -> $410B -> $725B -> $930B+)
          const bars = [
            { yr: '2024 ACTUAL', val: 226, label: '$226B', color: '#64748b', dashed: false },
            { yr: '2025 ACTUAL', val: 410, label: '$410B', color: '#94a3b8', dashed: false },
            { yr: '2026 GUIDANCE', val: 725, label: '$725B', color: '#ff6b35', dashed: false },
            { yr: '2027 CONSENSUS', val: 930, label: '$930B+', color: '#ff6b35', dashed: true }
          ];
          const pad = { l: 44, r: 44, t: 44, b: 44 };
          const pw = w - pad.l - pad.r;
          const ph = h - pad.t - pad.b;
          const bw = Math.min(86, (pw / bars.length) * 0.6);
          const step = pw / bars.length;

          bars.forEach((b, i) => {
            const bh = (b.val / 1000) * ph * anim;
            const bx = pad.l + i * step + (step - bw) * 0.5;
            const by = pad.t + ph - bh;

            if (b.dashed) {
              ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = b.color; ctx.lineWidth = 2;
              ctx.fillStyle = 'rgba(255, 107, 53, 0.14)';
              ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh); ctx.restore();
            } else {
              ctx.fillStyle = b.color;
              ctx.fillRect(bx, by, bw, bh);
            }

            ctx.fillStyle = b.color === '#ff6b35' ? '#ff6b35' : '#f3efea';
            ctx.font = '600 14px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(b.label, bx + bw * 0.5, by - 10);

            ctx.fillStyle = 'rgba(243,239,234,0.56)';
            ctx.font = '9.5px "JetBrains Mono", monospace';
            ctx.fillText(b.yr, bx + bw * 0.5, pad.t + ph + 18);
          });
          ctx.fillStyle = 'rgba(243,239,234,0.48)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
          ctx.fillText('FOUR LARGEST US HYPERSCALERS · TOP 5 INCLUDING ORACLE > $800B IN 2026', pad.l, 20);
        } else {
          // Dual Lab Annualized Revenue Run-Rate (Jan 2025 -> Oct 2026)
          const pad = { l: 56, r: 108, t: 32, b: 40 };
          const pw = w - pad.l - pad.r;
          const ph = h - pad.t - pad.b;
          const xOf = (m) => pad.l + (m / 21) * pw; // months 0 (Jan 25) to 21 (Oct 26)
          const yOf = (b) => pad.t + ph * (1 - b / 90);

          [0, 25, 50, 75].forEach((b) => {
            const gy = yOf(b);
            ctx.strokeStyle = 'rgba(243,239,234,0.07)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
            ctx.fillStyle = 'rgba(243,239,234,0.44)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
            ctx.fillText(`$${b}B`, pad.l - 8, gy + 3);
          });

          const anth = [[0, 1], [6, 4], [11, 9], [15, 32], [18, 58], [21, 81]];
          const oai  = [[13, 25], [16, 35], [20, 50]];

          function drawSeries(pts, color, label) {
            const maxM = 21 * anim;
            ctx.save(); ctx.beginPath(); let last = null;
            pts.forEach(([m, v], i) => {
              if (m > maxM && i > 0) return;
              const px = xOf(m), py = yOf(v);
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              last = { px, py };
            });
            ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.lineWidth = 2.6;
            ctx.stroke(); ctx.restore();
            if (last && anim > 0.9) {
              ctx.beginPath(); ctx.arc(last.px, last.py, 4.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
              ctx.fillStyle = color; ctx.font = '600 10.5px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
              ctx.fillText(label, last.px + 8, last.py + 4);
            }
          }
          drawSeries(anth, '#ff6b35', 'Anthropic · $81B');
          drawSeries(oai, '#5fb7ff', 'OpenAI · $50B');

          ctx.fillStyle = 'rgba(243,239,234,0.48)'; ctx.font = '10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left'; ctx.fillText('JAN 2025', pad.l, h - 14);
          ctx.textAlign = 'center'; ctx.fillText('JAN 2026', xOf(12), h - 14);
          ctx.textAlign = 'right'; ctx.fillText('OCT 2026', xOf(21), h - 14);
          ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(243,239,234,0.44)';
          ctx.fillText('NOTE: RUN-RATE ACCOUNTING DIFFERS — COMPARE SHAPES, NOT LEVELS', pad.l, 18);
        }
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 4 (idx 6 · Slide 07): THE FOUR COMPOUNDING ENGINES
     -------------------------------------------------------------------------- */
  function initEnginesSim() {
    const canvas = document.getElementById('canvas-engines');
    if (!canvas) return;
    const totalOut = document.getElementById('engines-total-mult');
    const cards = document.querySelectorAll('.engine-card[data-engine]');

    const state = {
      compute: { on: true, factor5y: 250, label: 'COMPUTE', color: '#ff6b35' },
      algo:    { on: true, factor5y: 120, label: 'ALGORITHMS', color: '#f6b94c' },
      synth:   { on: true, factor5y: 80,  label: 'SYNTHETIC RL', color: '#38bdf8' },
      agents:  { on: true, factor5y: 500, label: 'AGENT SWARMS', color: '#34d399' }
    };

    function recalc() {
      let mult = 1;
      Object.values(state).forEach((e) => { if (e.on) mult *= e.factor5y; });
      if (totalOut) {
        totalOut.textContent = mult === 1 ? '1× (STALLED)' : mult < 10000 ? `${mult.toLocaleString()}×` : `10^${Math.log10(mult).toFixed(1)}×`;
      }
    }

    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const key = card.dataset.engine;
        if (!state[key]) return;
        state[key].on = !state[key].on;
        card.classList.toggle('on', state[key].on);
        card.classList.toggle('off', !state[key].on);
        recalc();
        window.VERTICAL.audio?.playTick(state[key].on ? 1.25 : 0.72);
      });
    });
    recalc();

    let t = 0;
    const keys = ['compute', 'algo', 'synth', 'agents'];

    sims[6] = {
      draw() {
        const activeCount = keys.filter((k) => state[k].on).length;
        t += 0.014 + activeCount * 0.011;
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const cx = w * 0.5, cy = h * 0.5, rad = Math.min(w, h) * 0.34;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(cx, cy, rad * (0.58 + i * 0.22), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(243, 239, 234, ${0.05 + i * 0.03})`; ctx.lineWidth = 1; ctx.stroke();
        }

        const positions = keys.map((k, idx) => {
          const ang = -Math.PI * 0.75 + idx * (Math.PI * 0.5);
          return { key: k, x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad, ang };
        });

        for (let i = 0; i < 4; i++) {
          const a = positions[i], b = positions[(i + 1) % 4];
          const bothOn = state[a.key].on && state[b.key].on;
          const midAng = a.ang + Math.PI * 0.25;
          const ctrlX = cx + Math.cos(midAng) * rad * 1.38;
          const ctrlY = cy + Math.sin(midAng) * rad * 1.38;

          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(ctrlX, ctrlY, b.x, b.y);
          ctx.strokeStyle = bothOn ? state[a.key].color : 'rgba(243,239,234,0.08)';
          ctx.lineWidth = bothOn ? 2 : 1; ctx.globalAlpha = bothOn ? 0.65 : 0.4; ctx.stroke(); ctx.globalAlpha = 1;

          if (bothOn) {
            for (let p = 0; p < 3; p++) {
              const u = (t * 0.55 + p * 0.33 + i * 0.17) % 1, inv = 1 - u;
              const px = inv * inv * a.x + 2 * inv * u * ctrlX + u * u * b.x;
              const py = inv * inv * a.y + 2 * inv * u * ctrlY + u * u * b.y;
              ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2);
              ctx.fillStyle = '#fff'; ctx.shadowColor = state[a.key].color; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
            }
          }
        }

        let mult = 1; keys.forEach((k) => { if (state[k].on) mult *= state[k].factor5y; });
        const coreRad = 32 + activeCount * 5 + Math.sin(t * 2.4) * 2.5;
        const gCore = ctx.createRadialGradient(cx, cy, 4, cx, cy, coreRad * 1.9);
        gCore.addColorStop(0, activeCount >= 3 ? 'rgba(56, 189, 248, 0.48)' : 'rgba(255, 107, 53, 0.24)');
        gCore.addColorStop(1, 'rgba(5, 6, 8, 0)');
        ctx.fillStyle = gCore; ctx.beginPath(); ctx.arc(cx, cy, coreRad * 1.9, 0, Math.PI * 2); ctx.fill();

        ctx.beginPath(); ctx.arc(cx, cy, coreRad, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8, 10, 14, 0.92)'; ctx.strokeStyle = activeCount === 4 ? '#38bdf8' : 'rgba(243,239,234,0.28)';
        ctx.lineWidth = 1.6; ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#f3efea'; ctx.font = '600 15px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(mult === 1 ? '1×' : `10^${Math.log10(mult).toFixed(1)}×`, cx, cy + 2);
        ctx.fillStyle = 'rgba(243,239,234,0.52)'; ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText('5-YR PRODUCT', cx, cy + 16);

        positions.forEach((pos) => {
          const e = state[pos.key];
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = e.on ? 'rgba(12, 14, 20, 0.96)' : 'rgba(12, 14, 20, 0.5)';
          ctx.strokeStyle = e.on ? e.color : 'rgba(243,239,234,0.16)'; ctx.lineWidth = e.on ? 2.2 : 1;
          if (e.on) { ctx.shadowColor = e.color; ctx.shadowBlur = 14; }
          ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

          ctx.fillStyle = e.on ? '#f3efea' : 'rgba(243,239,234,0.35)';
          ctx.font = '600 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
          ctx.fillText(`${e.factor5y}×`, pos.x, pos.y + 3);

          const lblY = pos.y < cy ? pos.y - 26 : pos.y + 34;
          ctx.fillStyle = e.on ? e.color : 'rgba(243,239,234,0.28)';
          ctx.fillText(e.label, pos.x, lblY);
        });
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 5 (idx 7 · Slide 08): LIVE RSI ODE SIMULATOR (dI/dt = k * I^alpha)
     -------------------------------------------------------------------------- */
  function initRSISim() {
    const canvas = document.getElementById('canvas-rsi');
    if (!canvas) return;
    const slAlpha = document.getElementById('rsi-alpha');
    const slGain  = document.getElementById('rsi-gain');
    const outAlpha = document.getElementById('rsi-alpha-val');
    const outGain  = document.getElementById('rsi-gain-val');
    const badge    = document.getElementById('rsi-phase-badge');
    const readout  = document.getElementById('rsi-singularity-readout');

    let alpha = 1.32, gain = 1.15, animT = 0;

    function updateMeta() {
      if (outAlpha) outAlpha.textContent = alpha.toFixed(2);
      if (outGain)  outGain.textContent  = `${gain.toFixed(2)}×`;
      if (badge) {
        if (alpha < 0.96) {
          badge.textContent = 'SUBCRITICAL · DECELERATING';
          badge.style.borderColor = '#94a3b8'; badge.style.color = '#94a3b8';
        } else if (alpha <= 1.04) {
          badge.textContent = 'EXPONENTIAL · CONSTANT DOUBLING';
          badge.style.borderColor = '#fde047'; badge.style.color = '#fde047';
        } else {
          badge.textContent = 'SUPERCRITICAL · FINITE-TIME SINGULARITY';
          badge.style.borderColor = '#38bdf8'; badge.style.color = '#38bdf8';
        }
      }
      if (readout) {
        if (alpha > 1.02) {
          const k = 0.24 * gain;
          const tCrit = 1 / (k * (alpha - 1));
          readout.textContent = `ASYMPTOTE AT T = +${tCrit.toFixed(1)} YRS`;
        } else if (alpha >= 0.96) {
          readout.textContent = 'NO FINITE WALL · SMOOTH EXPONENTIAL';
        } else {
          readout.textContent = 'RETURNS DIMINISH · PLATEAU';
        }
      }
    }

    slAlpha?.addEventListener('input', () => { alpha = parseFloat(slAlpha.value); animT = 0; updateMeta(); window.VERTICAL.audio?.playTick(0.8 + alpha * 0.45); });
    slGain?.addEventListener('input', () => { gain = parseFloat(slGain.value); animT = 0; updateMeta(); window.VERTICAL.audio?.playTick(0.9 + gain * 0.25); });
    updateMeta();

    sims[7] = {
      reset() { animT = 0; },
      draw() {
        animT = Math.min(1, animT + 0.018);
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const pad = { l: 48, r: 24, t: 24, b: 32 };
        const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;

        ctx.strokeStyle = 'rgba(243,239,234,0.065)'; ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const gy = pad.t + (ph / 4) * i;
          ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
        }

        const tMax = 12, k = 0.24 * gain, maxVal = 45;
        const exactTCrit = alpha > 1.02 ? 1 / (k * (alpha - 1)) : null;

        const pts = [];
        const dt = 0.03;
        for (let t = 0; t <= tMax; t += dt) {
          let I;
          if (Math.abs(alpha - 1) < 0.005) {
            I = Math.exp(k * t);
          } else {
            const base = 1 - (alpha - 1) * k * t;
            if (base <= 0.001) { pts.push({ t: Math.min(tMax, exactTCrit || t), I: maxVal * 1.1 }); break; }
            I = Math.pow(base, -1 / (alpha - 1));
          }
          pts.push({ t, I: Math.min(I, maxVal * 1.1) });
          if (I >= maxVal * 1.05) break;
        }

        const xOf = (t) => pad.l + (t / tMax) * pw;
        const yOf = (val) => pad.t + ph * (1 - Math.min(1, (val - 1) / (maxVal - 1)));

        if (exactTCrit !== null && exactTCrit <= tMax) {
          const bx = xOf(exactTCrit);
          const wallGrad = ctx.createLinearGradient(bx - 30, 0, bx + 14, 0);
          wallGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          wallGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.22)');
          wallGrad.addColorStop(1, 'rgba(253, 224, 71, 0.04)');
          ctx.fillStyle = wallGrad; ctx.fillRect(bx - 30, pad.t, 44, ph);

          ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(bx, pad.t); ctx.lineTo(bx, pad.t + ph); ctx.stroke(); ctx.restore();

          ctx.fillStyle = '#fde047'; ctx.font = '600 10px "JetBrains Mono", monospace';
          const placeLeft = bx > w * 0.52;
          ctx.textAlign = placeLeft ? 'right' : 'left';
          ctx.fillText(`SINGULARITY WALL · T+${exactTCrit.toFixed(1)}y`, bx + (placeLeft ? -10 : 10), pad.t + 36);
        }

        ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(243,239,234,0.22)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let t = 0; t <= tMax; t += 0.15) {
          const refI = Math.exp(k * t); if (refI > maxVal * 1.1) break;
          if (t === 0) ctx.moveTo(xOf(t), yOf(refI)); else ctx.lineTo(xOf(t), yOf(refI));
        }
        ctx.stroke(); ctx.restore();

        const drawCount = Math.max(2, Math.floor(pts.length * animT));
        const curveColor = alpha > 1.04 ? '#38bdf8' : alpha >= 0.96 ? '#fde047' : '#94a3b8';
        ctx.save(); ctx.beginPath();
        for (let i = 0; i < drawCount; i++) {
          if (i === 0) ctx.moveTo(xOf(pts[i].t), yOf(pts[i].I)); else ctx.lineTo(xOf(pts[i].t), yOf(pts[i].I));
        }
        ctx.strokeStyle = curveColor; ctx.shadowColor = curveColor; ctx.shadowBlur = 16; ctx.lineWidth = 2.8;
        ctx.stroke(); ctx.restore();

        const head = pts[drawCount - 1];
        if (head) {
          ctx.beginPath(); ctx.arc(xOf(head.t), yOf(head.I), 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fff'; ctx.shadowColor = curveColor; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
        }

        ctx.fillStyle = 'rgba(243,239,234,0.44)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        for (let yr = 0; yr <= tMax; yr += 3) ctx.fillText(`+${yr}y`, xOf(yr), h - 10);
        ctx.textAlign = 'right'; ctx.fillText('∞', pad.l - 10, pad.t + 8); ctx.fillText('1×', pad.l - 10, pad.t + ph + 3);
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 6 (idx 8 · Slide 09): DUAL CHRONOMETER + 512-DOT COPY DOUBLING GRID
     -------------------------------------------------------------------------- */
  function initDilationSim() {
    const canvas = document.getElementById('canvas-dilation');
    if (!canvas) return;
    const pills = document.querySelectorAll('[data-speed-mult]');
    const viewPills = document.querySelectorAll('[data-dilation-view]');
    const wallOut = document.getElementById('dilation-wall');
    const subjOut = document.getElementById('dilation-subj');
    const phdOut  = document.getElementById('dilation-phds');
    const resetBtn = document.getElementById('dilation-reset');

    let mult = 10000;
    let view = 'copies'; // 'copies' (512-dot doubling grid) | 'chrono' (dual orbital clock)
    let wallSec = 0;
    let lastTs = performance.now();

    // 512-dot (64x8) exponential doubling state (9 doublings, each interval shrinks 0.86^i)
    let stepIdx = 0;
    let stepClock = 0;
    const dotHeat = new Float32Array(512);
    dotHeat[0] = 1;

    pills.forEach((p) => {
      p.addEventListener('click', () => {
        pills.forEach((b) => b.classList.remove('active'));
        p.classList.add('active');
        mult = parseFloat(p.dataset.speedMult);
        window.VERTICAL.audio?.playTick(0.85 + Math.log10(mult + 1) * 0.14);
      });
    });
    viewPills.forEach((p) => {
      p.addEventListener('click', () => {
        viewPills.forEach((b) => b.classList.remove('active'));
        p.classList.add('active');
        view = p.dataset.dilationView;
        stepIdx = 0; stepClock = 0; dotHeat.fill(0); dotHeat[0] = 1;
        window.VERTICAL.audio?.playTick(1.15);
      });
    });
    resetBtn?.addEventListener('click', () => {
      wallSec = 0; stepIdx = 0; stepClock = 0; dotHeat.fill(0); dotHeat[0] = 1;
      window.VERTICAL.audio?.playTick(1.0);
    });

    sims[8] = {
      reset() { wallSec = 0; lastTs = performance.now(); stepIdx = 0; stepClock = 0; dotHeat.fill(0); dotHeat[0] = 1; },
      draw() {
        const now = performance.now();
        const dt = Math.min(0.08, (now - lastTs) / 1000);
        lastTs = now;
        wallSec += dt;

        const subjSec = wallSec * mult;
        const subjYears = subjSec / (365.25 * 86400);
        const subjDays  = subjSec / 86400;

        if (wallOut) wallOut.textContent = `${wallSec.toFixed(1)} s`;
        if (subjOut) {
          if (subjYears >= 100) subjOut.textContent = `${(subjYears / 100).toFixed(2)} CENTURIES`;
          else if (subjYears >= 1) subjOut.textContent = `${subjYears.toFixed(2)} YEARS`;
          else if (subjDays >= 1) subjOut.textContent = `${subjDays.toFixed(1)} DAYS`;
          else subjOut.textContent = `${(subjSec / 3600).toFixed(1)} HRS`;
        }
        if (phdOut) {
          const phds = subjYears / 5;
          phdOut.textContent = phds >= 1000 ? `${Math.floor(phds).toLocaleString()} PhDs` : `${phds.toFixed(1)} PhDs`;
        }

        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        if (view === 'copies') {
          // Live 64x8 = 512 accelerating copy-doubling grid (from reference deck)
          const interval = stepIdx >= 9 ? 1.8 : Math.max(0.32, 0.92 * Math.pow(0.84, stepIdx));
          stepClock += dt;
          if (stepClock >= interval) {
            stepClock = 0;
            stepIdx = (stepIdx + 1) % 10;
            if (stepIdx === 0) {
              dotHeat.fill(0);
              dotHeat[0] = 1;
            } else {
              const prevCount = Math.pow(2, stepIdx - 1);
              const nextCount = Math.min(512, Math.pow(2, stepIdx));
              for (let i = prevCount; i < nextCount; i++) dotHeat[i] = 1.0;
            }
          }
          const litCount = Math.min(512, Math.pow(2, stepIdx));
          const cols = 32, rows = 16;
          const padX = 20, padTop = 26, padBot = 28;
          const stepX = (w - padX * 2) / cols;
          const stepY = (h - padTop - padBot) / rows;
          const r = Math.max(2.1, Math.min(stepX, stepY) * 0.30);

          for (let i = 0; i < 512; i++) {
            dotHeat[i] = Math.max(0, dotHeat[i] - dt * 1.4);
            const c = i % cols, row = Math.floor(i / cols);
            const x = padX + (c + 0.5) * stepX;
            const y = padTop + (row + 0.5) * stepY;
            const lit = i < litCount;

            ctx.beginPath(); ctx.arc(x, y, lit ? r * (1 + dotHeat[i] * 0.45) : r * 0.65, 0, Math.PI * 2);
            if (!lit) {
              ctx.fillStyle = 'rgba(243, 239, 234, 0.11)';
            } else if (dotHeat[i] > 0.35) {
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 8;
            } else {
              ctx.fillStyle = i % 5 === 0 ? '#fde047' : '#38bdf8';
              ctx.shadowBlur = 0;
            }
            ctx.fill(); ctx.shadowBlur = 0;
          }

          ctx.fillStyle = '#38bdf8'; ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
          ctx.fillText(`DOUBLING ${stepIdx} OF 9 · ${litCount} PARALLEL RESEARCH COPIES`, padX, 16);
          ctx.fillStyle = 'rgba(243,239,234,0.48)'; ctx.textAlign = 'right';
          ctx.fillText('EACH TICK DOUBLES LIT COPIES AND SHORTENS INTERVAL', w - padX, h - 10);
        } else {
          // Dual Orbital Chronometer
          const cx = w * 0.5, cy = h * 0.5, maxR = Math.min(w, h) * 0.42;
          ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(243, 239, 234, 0.14)'; ctx.lineWidth = 1.5; ctx.stroke();

          const bioAng = -Math.PI / 2 + (wallSec / 60) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(cx, cy, maxR, -Math.PI / 2, bioAng);
          ctx.strokeStyle = 'rgba(243, 239, 234, 0.72)'; ctx.lineWidth = 2.2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx + Math.cos(bioAng) * maxR, cy + Math.sin(bioAng) * maxR, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#f3efea'; ctx.fill();

          const logSpd = Math.log10(Math.max(1, mult));
          for (let i = 0; i < 5; i++) {
            const rad = maxR * (0.24 + i * 0.13);
            const speed = (0.4 + logSpd * 0.85) * (i % 2 === 0 ? 1 : -1.3) * (1 + i * 0.2);
            const a0 = wallSec * speed;
            ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + Math.PI * (0.45 + logSpd * 0.16));
            ctx.strokeStyle = i % 2 === 0 ? `rgba(56, 189, 248, ${0.32 + i * 0.12})` : `rgba(253, 224, 71, ${0.28 + i * 0.1})`;
            ctx.lineWidth = i === 4 ? 2.4 : 1.5; ctx.stroke();
          }
          ctx.fillStyle = '#38bdf8'; ctx.font = '600 18px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
          ctx.fillText(mult >= 1000000 ? '10^6×' : `${mult.toLocaleString()}×`, cx, cy + 4);
          ctx.fillStyle = 'rgba(243,239,234,0.52)'; ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText('SUBJECTIVE RATE', cx, cy + 18);
        }
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 7 (idx 9 · Slide 10): BEYOND HUMAN-SHAPED MINDS
     -------------------------------------------------------------------------- */
  function initMindsSim() {
    const canvas = document.getElementById('canvas-minds');
    if (!canvas) return;
    const pills = document.querySelectorAll('[data-mind-idx]');
    const mindDesc = document.getElementById('mind-profile-desc');

    const MINDS = [
      { name: 'MOUSE', logPos: 0.10, color: '#94a3b8', stats: [0.12, 0.08, 0.02, 0.01, 0.14, 0.05], desc: '~70M neurons · ~200 Hz spiking · locked to biological evolution.' },
      { name: 'HUMAN', logPos: 0.25, color: '#f5c063', stats: [0.22, 0.24, 0.04, 0.05, 0.22, 0.34], desc: '86B neurons · ~10 bits/s conscious output · ~7-item working memory.' },
      { name: 'VON NEUMANN', logPos: 0.275, color: '#ff6b35', stats: [0.26, 0.30, 0.04, 0.06, 0.24, 0.44], desc: 'Human ceiling — notice how microscopically close this sits to average human on a cosmic scale.' },
      { name: '2026 FRONTIER', logPos: 0.46, color: '#38bdf8', stats: [0.62, 0.68, 0.58, 0.48, 0.45, 0.56], desc: 'Millions of tokens context · instant copyability · polymathic synthesis across all sciences.' },
      { name: 'ASI NODE', logPos: 0.74, color: '#a855f7', stats: [0.92, 0.90, 0.88, 0.90, 0.84, 0.92], desc: 'Self-editing weights · direct lossless telepathic state merging · 10,000-D native intuition.' },
      { name: 'PLANETARY MIND', logPos: 0.96, color: '#34d399', stats: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0], desc: 'Post-singular cognitive substrate operating at physical limits — as alien to us as calculus to an ant.' }
    ];
    const AXES = ['CLOCK SPEED', 'CONTEXT DEPTH', 'PARALLELISM', 'WEIGHT SHARE', 'SELF-EDITING', 'ABSTRACTION'];
    let targetIdx = 4, currentStats = [...MINDS[4].stats], currentPos = MINDS[4].logPos;

    function selectMind(idx) {
      targetIdx = idx;
      pills.forEach((b, i) => b.classList.toggle('active', i === idx));
      if (mindDesc) mindDesc.textContent = MINDS[idx].desc;
    }
    pills.forEach((p) => p.addEventListener('click', () => { selectMind(parseInt(p.dataset.mindIdx, 10)); window.VERTICAL.audio?.playTick(0.8 + targetIdx * 0.14); }));
    selectMind(4);

    sims[9] = {
      draw() {
        const m = MINDS[targetIdx];
        for (let i = 0; i < 6; i++) currentStats[i] += (m.stats[i] - currentStats[i]) * 0.10;
        currentPos += (m.logPos - currentPos) * 0.12;

        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const barY = 34, barL = 32, barR = w - 32, barW = barR - barL;
        ctx.strokeStyle = 'rgba(243,239,234,0.18)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(barL, barY); ctx.lineTo(barR, barY); ctx.stroke();

        const h1 = barL + MINDS[1].logPos * barW, h2 = barL + MINDS[2].logPos * barW;
        ctx.fillStyle = 'rgba(245, 192, 99, 0.36)'; ctx.fillRect(h1 - 2, barY - 9, Math.max(8, h2 - h1 + 4), 18);
        ctx.fillStyle = '#f5c063'; ctx.font = '9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText('ALL HUMANITY', (h1 + h2) * 0.5, barY - 14);

        MINDS.forEach((mind, i) => {
          ctx.beginPath(); ctx.arc(barL + mind.logPos * barW, barY, i === targetIdx ? 5.5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = i === targetIdx ? mind.color : 'rgba(243,239,234,0.45)'; ctx.fill();
        });
        ctx.beginPath(); ctx.arc(barL + currentPos * barW, barY, 10, 0, Math.PI * 2);
        ctx.strokeStyle = m.color; ctx.lineWidth = 1.4; ctx.stroke();

        const cx = w * 0.5, cy = h * 0.57, R = Math.min(w * 0.34, h * 0.35);
        for (let ring = 1; ring <= 4; ring++) {
          const rr = (R * ring) / 4;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
            if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
          ctx.closePath(); ctx.strokeStyle = 'rgba(243,239,234,0.08)'; ctx.lineWidth = 1; ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.strokeStyle = 'rgba(243,239,234,0.10)'; ctx.stroke();
          ctx.fillStyle = 'rgba(243,239,234,0.62)'; ctx.font = '9.5px "JetBrains Mono", monospace';
          ctx.textAlign = Math.abs(Math.cos(a)) < 0.2 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right';
          ctx.fillText(AXES[i], cx + Math.cos(a) * (R + 24), cy + Math.sin(a) * (R + 18) + 3);
        }
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 6, rr = R * MINDS[1].stats[i];
          if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.strokeStyle = 'rgba(245, 192, 99, 0.45)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);

        ctx.save(); ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 6, rr = R * currentStats[i];
          if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fillStyle = m.color + '28'; ctx.strokeStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 18; ctx.lineWidth = 2.4;
        ctx.fill(); ctx.stroke(); ctx.restore();
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 8 (idx 10 · Slide 11): ATOMS ARE JUST SOFTWARE NOW
     -------------------------------------------------------------------------- */
  function initAtomsSim() {
    const canvas = document.getElementById('canvas-atoms');
    if (!canvas) return;
    const pills = document.querySelectorAll('[data-atom-domain]');
    const statOut = document.getElementById('atom-collapse-stat');

    const DOMAINS = {
      compute:  { drop: '10,000×', rate: 0.92, floor: 'LANDAUER THERMAL LIMIT', color: '#34d399' },
      energy:   { drop: '50×', rate: 0.62, floor: 'SILICON + SUNLIGHT FLOOR', color: '#f5c063' },
      genomics: { drop: '1,000,000×', rate: 0.98, floor: 'REAGENT CHEMISTRY FLOOR', color: '#38bdf8' },
      matter:   { drop: '∞ → RAW CARBON', rate: 0.84, floor: 'ENTROPY + PHOTONS ONLY', color: '#a855f7' }
    };
    let domainKey = 'matter', t = 0;

    pills.forEach((p) => p.addEventListener('click', () => {
      pills.forEach((b) => b.classList.remove('active')); p.classList.add('active');
      domainKey = p.dataset.atomDomain;
      if (statOut) statOut.textContent = `${DOMAINS[domainKey].drop} COLLAPSE · FLOOR: ${DOMAINS[domainKey].floor}`;
      window.VERTICAL.audio?.playTick(1.1);
    }));

    sims[10] = {
      draw() {
        t += 0.02;
        const d = DOMAINS[domainKey];
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const pad = { l: 50, r: 24, t: 24, b: 32 };
        const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;

        const hexR = 16; ctx.strokeStyle = d.color + '20'; ctx.lineWidth = 0.8;
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 10; col++) {
            const hx = w * 0.45 + col * hexR * 1.65;
            const hy = 22 + row * hexR * 1.45 + (col % 2 ? hexR * 0.72 : 0);
            if (hx > w - 16 || hy > h - 24) continue;
            const wave = Math.sin(t * 1.8 - col * 0.45 - row * 0.3) * 0.5 + 0.5;
            ctx.beginPath();
            for (let s = 0; s < 6; s++) {
              const a = (s * Math.PI) / 3;
              const px = hx + Math.cos(a) * (hexR * 0.62 * (0.8 + wave * 0.25));
              const py = hy + Math.sin(a) * (hexR * 0.62 * (0.8 + wave * 0.25));
              if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
          }
        }

        const floorY = pad.t + ph * 0.80;
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(243,239,234,0.35)';
        ctx.beginPath(); ctx.moveTo(pad.l, floorY); ctx.lineTo(w - pad.r, floorY); ctx.stroke(); ctx.restore();
        ctx.fillStyle = 'rgba(243,239,234,0.58)'; ctx.font = '9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
        ctx.fillText('THERMODYNAMIC FLOOR (RAW ENERGY + ATOMS)', w - pad.r, floorY + 14);

        ctx.save(); ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const u = i / 60, x = pad.l + u * pw, y = floorY - Math.exp(-u * (3.0 + d.rate * 3.8)) * (ph * 0.74);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 16; ctx.lineWidth = 2.8;
        ctx.stroke(); ctx.restore();

        const pu = (t * 0.22) % 1;
        ctx.beginPath(); ctx.arc(pad.l + pu * pw, floorY - Math.exp(-pu * (3.0 + d.rate * 3.8)) * (ph * 0.74), 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.shadowColor = d.color; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(243,239,234,0.45)'; ctx.font = '9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'left'; ctx.fillText('SCARCITY ERA (2000)', pad.l, h - 10); ctx.fillText('COST (LOG)', pad.l, pad.t - 6);
        ctx.textAlign = 'right'; ctx.fillText('MATTER COMPILATION (2035+)', w - pad.r, h - 10);
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 9 (idx 13 · Slide 14): KARDASHEV & PHYSICAL LIMITS CALCULATOR
     -------------------------------------------------------------------------- */
  function initKardashevSim() {
    const canvas = document.getElementById('canvas-kardashev');
    if (!canvas) return;
    const rungs = document.querySelectorAll('.kard-rung[data-kard]');
    const flopOut = document.getElementById('kard-flops');
    const mindsOut = document.getElementById('kard-minds');
    const noteOut = document.getElementById('kard-note');

    const LEVELS = [
      { wattsExp: 1.3,  flopsExp: 16, minds: '1 HUMAN BRAIN',      rings: 1,  color: '#f3efea', note: '20 watts of glucose. ~10¹⁶ synaptic ops/s. Evolution stopped here.' },
      { wattsExp: 13.3, flopsExp: 26, minds: '8 × 10⁹ HUMANS',     rings: 2,  color: '#ff6b35', note: 'All of human civilization in 2026: ~20 TW total power consumption.' },
      { wattsExp: 17.2, flopsExp: 36, minds: '10¹⁶ HUMAN-EQUIV/S', rings: 4,  color: '#38bdf8', note: 'Kardashev I: Full planetary insolation (1.74 × 10¹⁷ W) harnessed.' },
      { wattsExp: 26.6, flopsExp: 48, minds: '10²⁸ HUMAN-EQUIV/S', rings: 7,  color: '#ffd166', note: 'Kardashev II Matrioshka Brain: Entire solar output (3.8 × 10²⁶ W) computing near Landauer cold limits.' },
      { wattsExp: 37.6, flopsExp: 59, minds: '10³⁹ HUMAN-EQUIV/S', rings: 11, color: '#c084fc', note: 'Kardashev III: 100 billion stars of the Milky Way harnessed as coherent cosmic substrate.' }
    ];
    let idx = 3, smoothRings = 7, t = 0;

    function select(i) {
      idx = i;
      rungs.forEach((r, n) => r.classList.toggle('active', n === i));
      const lv = LEVELS[i];
      if (flopOut) flopOut.textContent = `10^${lv.flopsExp} OPS/S`;
      if (mindsOut) mindsOut.textContent = lv.minds;
      if (noteOut) noteOut.textContent = lv.note;
    }
    rungs.forEach((r) => r.addEventListener('click', () => { select(parseInt(r.dataset.kard, 10)); window.VERTICAL.audio?.playTick(0.75 + idx * 0.16); }));
    select(3);

    sims[13] = {
      draw() {
        t += 0.015;
        const lv = LEVELS[idx];
        smoothRings += (lv.rings - smoothRings) * 0.08;
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const cx = w * 0.5, cy = h * 0.5, maxR = Math.min(w, h) * 0.43;
        const coreR = 14 + idx * 5;
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreR * 4.2);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.25, lv.color); grad.addColorStop(1, 'rgba(5, 6, 8, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, coreR * 4.2, 0, Math.PI * 2); ctx.fill();

        const count = Math.max(1, Math.round(smoothRings));
        for (let i = 0; i < count; i++) {
          const rx = maxR * (0.28 + (i / Math.max(1, count)) * 0.72);
          const ry = rx * (0.34 + (i % 3) * 0.14);
          ctx.save(); ctx.translate(cx, cy); ctx.rotate((i * 0.54) + t * (0.12 * (i % 2 === 0 ? 1 : -1)));
          ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.strokeStyle = lv.color + (i % 2 === 0 ? '66' : '30'); ctx.lineWidth = i === count - 1 ? 1.6 : 1; ctx.stroke();
          const nodes = 4 + idx * 2;
          for (let n = 0; n < nodes; n++) {
            const ang = t * (0.7 + i * 0.12) + (n * Math.PI * 2) / nodes;
            ctx.beginPath(); ctx.arc(Math.cos(ang) * rx, Math.sin(ang) * ry, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = '#f3efea'; ctx.fill();
          }
          ctx.restore();
        }
        ctx.fillStyle = 'rgba(243,239,234,0.45)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(`LANDAUER LIMIT: E ≥ k_B · T · ln(2)  |  POWER: 10^${lv.wattsExp.toFixed(1)} W`, cx, h - 10);
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 10 (idx 14 · Slide 15): WAKING UP THE UNIVERSE (Lightcone Seeder)
     -------------------------------------------------------------------------- */
  function initLightconeSim() {
    const canvas = document.getElementById('canvas-lightcone');
    if (!canvas) return;
    const slVel = document.getElementById('lc-velocity');
    const outVel = document.getElementById('lc-vel-val');
    const outCross = document.getElementById('lc-cross-val');
    const outAwake = document.getElementById('lc-awake-val');
    const btnLaunch = document.getElementById('lc-relaunch');

    let velC = 0.20, waveR = 0;
    const stars = [];
    for (let i = 0; i < 180; i++) {
      const arm = i % 3, dist = Math.pow(Math.random(), 0.72) * 0.45;
      const ang = arm * ((Math.PI * 2) / 3) + dist * 7.2 + (Math.random() - 0.5) * 0.75;
      stars.push({ dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist * 0.72, r: 1.0 + Math.random() * 1.9 });
    }

    function updateReadout() {
      if (outVel) outVel.textContent = `${velC.toFixed(2)} c`;
      if (outCross) outCross.textContent = `${(Math.round(105000 / velC) / 1000).toFixed(0)}k YRS (0.004% OF COSMIC AGE)`;
    }
    slVel?.addEventListener('input', () => { velC = parseFloat(slVel.value); updateReadout(); window.VERTICAL.audio?.playTick(0.8 + velC * 1.2); });
    btnLaunch?.addEventListener('click', () => { waveR = 0; window.VERTICAL.audio?.playTransition('portal'); });
    updateReadout();

    sims[14] = {
      reset() { waveR = 0; },
      draw() {
        waveR += 0.0012 + velC * 0.009;
        if (waveR > 0.56) waveR = 0.01;
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const cx = w * 0.5, cy = h * 0.5, scale = Math.min(w, h) * 1.02, radPx = waveR * scale;
        const wfGrad = ctx.createRadialGradient(cx, cy, Math.max(1, radPx - 36), cx, cy, radPx + 8);
        wfGrad.addColorStop(0, 'rgba(255, 209, 102, 0)'); wfGrad.addColorStop(0.75, 'rgba(255, 209, 102, 0.24)'); wfGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
        ctx.fillStyle = wfGrad; ctx.beginPath(); ctx.arc(cx, cy, radPx + 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, radPx, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255, 209, 102, 0.65)'; ctx.lineWidth = 1.4; ctx.stroke();

        let awakened = 0;
        stars.forEach((s) => {
          const sx = cx + s.dx * scale, sy = cy + s.dy * scale, d = Math.hypot(s.dx, s.dy), isAwake = d <= waveR;
          if (isAwake) awakened++;
          if (isAwake && Math.abs(d - waveR) < 0.09) {
            ctx.beginPath(); ctx.moveTo(cx + s.dx * 0.72 * scale, cy + s.dy * 0.72 * scale); ctx.lineTo(sx, sy);
            ctx.strokeStyle = 'rgba(255, 209, 102, 0.22)'; ctx.lineWidth = 0.7; ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(sx, sy, isAwake ? s.r * 1.35 : s.r * 0.78, 0, Math.PI * 2);
          ctx.fillStyle = isAwake ? (d > waveR - 0.04 ? '#ffffff' : '#ffd166') : 'rgba(243, 239, 234, 0.22)';
          ctx.fill();
        });
        ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fillStyle = '#38bdf8'; ctx.fill();
        if (outAwake) outAwake.textContent = `${Math.min(100, Math.round((awakened / stars.length) * 100))}% GALAXY LIT`;
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 11 (idx 16 · Slide 17): ALIEN ALIGNMENT ATTRACTOR FIELD
     -------------------------------------------------------------------------- */
  function initAlignmentSim() {
    const canvas = document.getElementById('canvas-alignment');
    if (!canvas) return;
    const pills = document.querySelectorAll('[data-attractor]');
    const descOut = document.getElementById('attractor-desc');

    const MODES = {
      paperclip: { color: '#ff5c5c', color2: '#ff8a3d', desc: 'UNALIGNED OPTIMIZATION: A vast intelligence relentlessly collapses all matter & variance into one narrow proxy metric. Irreversible cosmic monoculture.' },
      lockin:    { color: '#94a3b8', color2: '#38bdf8', desc: 'FROZEN VALUE LOCK-IN: Early brittle guardrails or a single power structure crystallizes humanity into eternal static equilibrium — zero moral growth.' },
      flourish:  { color: '#f5c063', color2: '#34d399', desc: 'COHERENT FLOURISHING: Corrigibility + deep value alignment opens a multi-attractor cosmos of boundless art, understanding, and conscious diversity.' }
    };
    let mode = 'flourish', mx = -999, my = -999, t = 0;
    const pts = Array.from({ length: 200 }, (_, i) => ({ x: Math.random(), y: Math.random(), vx: 0, vy: 0, hue: i % 2 }));
    const scatter = () => pts.forEach((p) => { p.x = 0.08 + Math.random() * 0.84; p.y = 0.08 + Math.random() * 0.84; p.vx = 0; p.vy = 0; });

    pills.forEach((p) => p.addEventListener('click', () => {
      pills.forEach((b) => b.classList.remove('active')); p.classList.add('active');
      mode = p.dataset.attractor;
      if (descOut) descOut.textContent = MODES[mode].desc;
      scatter(); window.VERTICAL.audio?.playTick(mode === 'flourish' ? 1.25 : 0.75);
    }));
    canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); mx = (e.clientX - r.left) / Math.max(r.width, 1); my = (e.clientY - r.top) / Math.max(r.height, 1); });
    canvas.addEventListener('mouseleave', () => { mx = -999; my = -999; });

    sims[16] = {
      reset() { scatter(); },
      draw() {
        t += 0.018;
        const cfg = MODES[mode];
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.fillStyle = 'rgba(8, 10, 14, 0.22)'; ctx.fillRect(0, 0, w, h);

        pts.forEach((p, idx) => {
          let ax = 0, ay = 0;
          if (mode === 'paperclip') {
            const dx = 0.78 - p.x, dy = 0.50 - p.y, d = Math.hypot(dx, dy) + 0.02;
            ax = (dx / d) * 0.0028 - (dy / d) * 0.0006; ay = (dy / d) * 0.0028 + (dx / d) * 0.0006;
            if (d < 0.03) { p.x = 0.05 + Math.random() * 0.15; p.y = Math.random(); }
          } else if (mode === 'lockin') {
            ax = ((Math.floor(idx % 14) + 1) / 15 - p.x) * 0.015;
            ay = ((Math.floor(idx / 14) + 1) / 15 - p.y) * 0.015;
          } else {
            const tx = p.hue === 0 ? 0.34 + Math.cos(t * 0.7) * 0.06 : 0.66 - Math.cos(t * 0.7) * 0.06;
            const ty = p.hue === 0 ? 0.50 + Math.sin(t * 0.9) * 0.10 : 0.50 - Math.sin(t * 0.9) * 0.10;
            const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) + 0.05, orb = p.hue === 0 ? 1 : -1;
            ax = dx * 0.0024 - (dy / d) * 0.0018 * orb; ay = dy * 0.0024 + (dx / d) * 0.0018 * orb;
          }
          if (mx >= 0 && my >= 0) {
            const mdx = p.x - mx, mdy = p.y - my, md = Math.hypot(mdx, mdy);
            if (md < 0.16 && md > 0.005) { ax += (mdx / md) * 0.003; ay += (mdy / md) * 0.003; }
          }
          p.vx = (p.vx + ax) * 0.92; p.vy = (p.vy + ay) * 0.92;
          const prevX = p.x * w, prevY = p.y * h;
          p.x += p.vx; p.y += p.vy;
          ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(p.x * w, p.y * h);
          ctx.strokeStyle = p.hue === 0 ? cfg.color : cfg.color2; ctx.lineWidth = 1.5; ctx.stroke();
        });
      }
    };
  }

  /* --------------------------------------------------------------------------
     SIM 12 (idx 19 · Slide 20): 10-GENERATION RECURSIVE BRANCHING BINARY TREE
     (1,024 glowing pulsing ember tips rising behind the Watchlist & Finale)
     -------------------------------------------------------------------------- */
  function initTreeSim() {
    const canvas = document.getElementById('canvas-tree');
    if (!canvas) return;

    // Seeded deterministic PRNG
    let seed = 29;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    const segments = [];
    const tips = [];
    const MAX_GEN = 9; // 2^9 = 512 tips (1,023 silky bezier branches, silky 60fps)

    function buildTree(x, y, angle, len, gen) {
      const bend = (rand() - 0.5) * 0.24;
      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      const cx = (x + ex) * 0.5 + Math.cos(angle + Math.PI / 2) * len * bend;
      const cy = (y + ey) * 0.5 + Math.sin(angle + Math.PI / 2) * len * bend;
      segments.push({ x, y, cx, cy, ex, ey, gen });
      if (gen >= MAX_GEN) {
        tips.push({ x: ex, y: ey, phase: rand() * Math.PI * 2 });
        return;
      }
      const spread = 0.22 + (MAX_GEN - gen) * 0.022 + rand() * 0.08;
      buildTree(ex, ey, angle - spread, len * (0.76 + rand() * 0.08), gen + 1);
      buildTree(ex, ey, angle + spread, len * (0.76 + rand() * 0.08), gen + 1);
    }
    buildTree(0, 0, -Math.PI / 2, 0.22, 0);

    let grow = 0;
    let time = 0;

    sims[19] = {
      reset() { grow = 0; },
      draw() {
        time += 0.028;
        grow = Math.min(MAX_GEN + 1.2, grow + 0.065);
        const { ctx, w, h } = setupCanvas(canvas);
        ctx.clearRect(0, 0, w, h);

        const ox = w * 0.5;
        const oy = h * 0.96;
        const sc = Math.min(w, h) * 1.15;

        segments.forEach((s) => {
          const prog = Math.max(0, Math.min(1, grow - s.gen));
          if (prog <= 0) return;
          const tFrac = s.gen / MAX_GEN;
          const r = Math.round(243 + (255 - 243) * tFrac);
          const g = Math.round(239 + (107 - 239) * tFrac);
          const b = Math.round(234 + (53 - 234) * tFrac);
          ctx.beginPath();
          ctx.moveTo(ox + s.x * sc, oy + s.y * sc);
          ctx.quadraticCurveTo(
            ox + (s.x + (s.cx - s.x) * prog) * sc,
            oy + (s.y + (s.cy - s.y) * prog) * sc,
            ox + (s.x + (s.ex - s.x) * prog) * sc,
            oy + (s.y + (s.ey - s.y) * prog) * sc
          );
          ctx.strokeStyle = `rgba(${r},${g},${b},${(0.45 - tFrac * 0.22) * prog})`;
          ctx.lineWidth = Math.max(0.55, (1 - tFrac) * 2.4);
          ctx.stroke();
        });

        if (grow > MAX_GEN) {
          const tipAlpha = Math.min(1, grow - MAX_GEN);
          tips.forEach((tp) => {
            const pulse = 0.45 + 0.55 * Math.sin(time * 1.7 + tp.phase);
            ctx.beginPath();
            ctx.arc(ox + tp.x * sc, oy + tp.y * sc, 1.4 + pulse * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 165, 95, ${tipAlpha * pulse * 0.8})`;
            ctx.fill();
          });
        }
      }
    };
  }

  /* --------------------------------------------------------------------------
     SCHEDULER (Runs ONLY the active slide's canvas at 60fps!)
     -------------------------------------------------------------------------- */
  let activeSlideIdx = 0;

  window.VERTICAL.initSimulations = function () {
    initAnchorSim();
    initHorizonsSim();
    initFuelSim();
    initEnginesSim();
    initRSISim();
    initDilationSim();
    initMindsSim();
    initAtomsSim();
    initKardashevSim();
    initLightconeSim();
    initAlignmentSim();
    initTreeSim();

    function tick() {
      const sim = sims[activeSlideIdx];
      if (sim && typeof sim.draw === 'function') sim.draw();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  window.VERTICAL.setActiveSimulation = function (idx) {
    activeSlideIdx = idx;
    const sim = sims[idx];
    if (sim && typeof sim.reset === 'function') sim.reset();
  };
})();
