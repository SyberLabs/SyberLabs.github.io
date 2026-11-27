/* ============================================================================
   VERTICAL — THE INTELLIGENCE EXPLOSION (20-Movement Distilled Edition)
   Calm 3-tier hierarchy · Concise editorial copy · Full detail in Notes (N)
   ============================================================================ */

(function () {
  window.VERTICAL = window.VERTICAL || {};

  window.VERTICAL.SLIDES = [
    /* 01 · OVERTURE */
    {
      id: 'vertical',
      num: '01',
      act: 'overture',
      actLabel: 'OVERTURE',
      surface: 'obsidian',
      epoch: 'NOV 2026',
      title: 'VERTICAL',
      shortTitle: 'VERTICAL',
      transition: 'portal',
      thumb: 'assets/hero_singularity.jpg',
      summary: 'What happens when the thing that builds AI is AI.',
      html: `
        <div class="art-layer art-full">
          <img src="assets/hero_singularity.jpg" alt="Gravitational event horizon ring glowing in obsidian void" />
          <div class="art-scrim-center"></div>
        </div>
        <div class="slide-inner layout-hero">
          <div class="kicker stagger stagger-1">THE INTELLIGENCE EXPLOSION · NOVEMBER 2026</div>
          <h1 class="display-hero stagger stagger-2">VERTICAL</h1>
          <p class="hero-subtitle stagger stagger-3">
            What happens when the thing that builds AI is AI.<br />
            Everything before today was the flat part of the curve.
          </p>
          <div class="hero-cta-row stagger stagger-4" style="margin-top:14px;">
            <button class="action-btn" type="button" data-action="next"><span>BEGIN</span><span>→</span></button>
            <button class="action-btn action-btn-ghost" type="button" data-action="sound"><span>SOUND (S)</span></button>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Opening Silence (3 seconds):</strong> Let the golden event horizon breathe before speaking.</p>
        <p>"Every mainstream forecast about AI shares one flaw: anchor bias. This briefing starts with what labs are already measuring in November 2026—including the Riemann Hypothesis falling last week—then drops the anchor and follows the curve to the limits of physics."</p>
      `
    },

    /* 02 · ACT I — THE ANCHOR BIAS TRAP */
    {
      id: 'anchor-bias',
      num: '02',
      act: 'evidence',
      actLabel: 'ACT I · THE EVIDENCE',
      surface: 'obsidian',
      epoch: '1965 → 2034',
      title: 'The Anchor Bias Trap',
      shortTitle: 'Anchor Bias',
      transition: 'zwarp',
      thumb: null,
      summary: 'Linear minds drawing flat tangents at the base of a cliff.',
      html: `
        <div class="slide-inner layout-split">
          <div class="col-copy" style="gap:20px;">
            <div>
              <div class="kicker stagger stagger-1">ACT I · THE BLIND SPOT</div>
              <h2 class="display-title stagger stagger-2">Linear minds on a <em>hyperbolic</em> cliff.</h2>
            </div>
            <p class="lead stagger stagger-3">
              Human intuition extrapolates tomorrow as a straight line from yesterday—missing exponential takeoffs by orders of magnitude.
            </p>
            <div class="pull-quote stagger stagger-4">
              “…the first ultraintelligent machine is the <em>last invention</em> that man need ever make.”
              <cite>— I. J. GOOD, 1965 · NOW BEING MEASURED INSIDE LABS</cite>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> EXTRAPOLATION ERROR</span>
              <span class="lab-badge" id="anchor-err-val">10^3× UNDERESTIMATE</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-anchor"></canvas></div>
            <div class="lab-controls">
              <div class="control-row">
                <div class="slider-group">
                  <div class="slider-meta">
                    <label for="anchor-year">ANCHOR YEAR</label>
                    <output id="anchor-year-val">2024</output>
                  </div>
                  <input type="range" id="anchor-year" min="2018" max="2029" step="1" value="2024" />
                </div>
                <div class="pill-group">
                  <button class="pill-btn active" type="button" id="anchor-scale-lin">LINEAR</button>
                  <button class="pill-btn" type="button" id="anchor-scale-log">LOG₁₀</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Live Demo:</strong> Drag <strong>Anchor Year</strong> from 2019 → 2024 → 2027, then toggle <strong>LOG₁₀</strong> to show the curve bends upward even on a log scale.</p>
      `
    },

    /* 03 · ACT I — TASK HORIZONS & DOUBLING TIME */
    {
      id: 'task-horizons',
      num: '03',
      act: 'evidence',
      actLabel: 'ACT I · THE EVIDENCE',
      surface: 'obsidian',
      epoch: 'METR · NOV 2026',
      title: 'Task Horizons & Doubling Time',
      shortTitle: 'Task Horizons',
      transition: 'curtain',
      thumb: null,
      summary: 'Autonomous task horizon is now doubling every 3.6 months.',
      html: `
        <div class="slide-inner layout-split">
          <div class="col-copy" style="gap:18px;">
            <div>
              <div class="kicker stagger stagger-1">ACT I · MEASURED CURVE</div>
              <h2 class="display-title stagger stagger-2">Doubling time itself is <em>shrinking</em>.</h2>
            </div>
            <p class="lead stagger stagger-3">
              Task length frontier AI finishes half the time. Shorter bars mean faster progress.
            </p>
            <div class="doubling-bars stagger stagger-4">
              <div class="doubling-row">
                <div class="doubling-num">7 <small>mo</small></div>
                <div class="doubling-track">
                  <div class="doubling-bar" style="width:100%; background:#8a93a6;"></div>
                  <div class="doubling-cap">2019–2024 baseline</div>
                </div>
              </div>
              <div class="doubling-row">
                <div class="doubling-num" style="color:#ff6b35;">3.6 <small>mo</small></div>
                <div class="doubling-track">
                  <div class="doubling-bar" style="width:51%; background:#ff6b35;"></div>
                  <div class="doubling-cap">Since 2024 · METR TH1.1 / TH2</div>
                </div>
              </div>
              <div class="doubling-row">
                <div class="doubling-num" style="color:#5fb7ff;">1.65 <small>mo</small></div>
                <div class="doubling-track">
                  <div class="doubling-bar" style="width:24%; background:#5fb7ff;"></div>
                  <div class="doubling-cap">Verifiable tasks only</div>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> METR TASK HORIZON (LOG HOURS)</span>
              <span class="lab-badge">MEASURED + EXTRAP.</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-horizons"></canvas></div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn" type="button" data-horizon-mode="orig">7 MO</button>
                <button class="pill-btn active" type="button" data-horizon-mode="base">3.6 MO</button>
                <button class="pill-btn" type="button" data-horizon-mode="verif">1.65 MO</button>
              </div>
              <div id="horizon-readout" style="font-family:var(--font-mono); font-size:10px; color:var(--accent); text-align:center;">
                3.6-MO DOUBLING → 200 H (JUL 2027) · 2,000 H (MID-2028)
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Measured points: Claude 3.7 Sonnet (50m) → Gemini 3 Pro (3h 57m) → Frontier agents (16–20h) → <strong>27h on verifiable tasks (Nov 2026)</strong>. Extending 3.6-month doubling hits 200h in July 2027 and 2,000h (1 work-year) by mid-2028. Sources in modal (B).</p>
      `
    },

    /* 04 · ACT I — INSIDE THE LABS (WARM VELLUM) */
    {
      id: 'inside-labs',
      num: '04',
      act: 'evidence',
      actLabel: 'ACT I · THE EVIDENCE',
      surface: 'vellum',
      epoch: 'INSIDE LABS · 2026',
      title: 'Inside the Labs',
      shortTitle: 'Inside the Labs',
      transition: 'curtain',
      thumb: null,
      summary: '80%+ code merged, 26% of R&D led by AI, 2× pace, 0% fully autonomous yet.',
      html: `
        <div class="slide-inner" style="justify-content:space-between; gap:18px;">
          <div class="theatre-head stagger stagger-1">
            <div>
              <div class="kicker">ACT I · THE LOOP TODAY</div>
              <h2 class="display-title">AI is already building <em>the next AI</em>.</h2>
            </div>
            <p class="lead" style="max-width:34ch;">
              Measured inside frontier labs—and independently audited by METR.
            </p>
          </div>

          <div class="lab-kpis stagger stagger-2">
            <div class="lab-kpi">
              <div class="lab-kpi-num">80%+</div>
              <p>Anthropic merged code written by Claude (May 2026).</p>
            </div>
            <div class="lab-kpi">
              <div class="lab-kpi-num">26%</div>
              <p>AI R&amp;D tasks led end-to-end by Claude (up from &lt;1% in Feb).</p>
            </div>
            <div class="lab-kpi">
              <div class="lab-kpi-num">2×</div>
              <p>Capability pace vs. 2024–25 (~80% credited to AI).</p>
            </div>
            <div class="lab-kpi">
              <div class="lab-kpi-num dark">0%</div>
              <p>Done with zero human in the loop. This is the fuse.</p>
            </div>
          </div>

          <div class="stagger stagger-3">
            <div style="font-family:var(--font-mono); font-size:10px; letter-spacing:0.15em; color:var(--accent); text-transform:uppercase; margin-bottom:10px;">
              THE AUTOMATION LADDER · STEPS 04 &amp; 05 HAVE NOT HAPPENED YET
            </div>
            <div class="ladder-grid">
              <div class="ladder-step s1"><span class="ladder-tag">01</span><h4>Assists</h4><p>2023 baseline.</p></div>
              <div class="ladder-step s2"><span class="ladder-tag">02 · &gt;90%</span><h4>Collaborates</h4><p>Works beside researchers.</p></div>
              <div class="ladder-step s3"><span class="ladder-tag">03 · TODAY</span><h4>Leads</h4><p>26% of R&amp;D; humans ship.</p></div>
              <div class="ladder-step s4"><span class="ladder-tag">04 · NEXT</span><h4>Works alone</h4><p>0% today. No human in loop.</p></div>
              <div class="ladder-step s5"><span class="ladder-tag">05 · LOOP CLOSES</span><h4>Sets agenda</h4><p>Designs its own successor.</p></div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>OpenAI also reported in February 2026 that early GPT-5.3-Codex helped debug and deploy itself. Notice Step 03 jumped from &lt;1% to 26% in six months; Step 04 sits at 0% today. Full citations in Sources (B).</p>
      `
    },

    /* 05 · ACT I — THE FUEL */
    {
      id: 'the-fuel',
      num: '05',
      act: 'evidence',
      actLabel: 'ACT I · THE EVIDENCE',
      surface: 'obsidian',
      epoch: '$7.6T · 180 GW',
      title: 'The Fuel',
      shortTitle: 'The Fuel',
      transition: 'zwarp',
      thumb: null,
      summary: '$7.6T in CapEx, 180 GW of new power, and 81× lab revenue run-rate.',
      html: `
        <div class="slide-inner layout-split">
          <div class="col-copy" style="gap:18px;">
            <div>
              <div class="kicker stagger stagger-1">ACT I · INDUSTRIAL FUEL</div>
              <h2 class="display-title stagger stagger-2">Trillions and <em>gigawatts</em> pouring into silicon.</h2>
            </div>
            <p class="lead stagger stagger-3">
              The largest peacetime infrastructure buildout in history—funded by vertical demand.
            </p>
            <div class="metrics-row cols-2 stagger stagger-4">
              <div class="metric-box"><div class="stat-big" style="color:#ff6b35;">$7.6 <span class="unit">T</span></div><div class="stat-label">AI CAPEX (2026–2031)</div></div>
              <div class="metric-box"><div class="stat-big">180 <span class="unit">GW</span></div><div class="stat-label">NEW POWER BY 2031</div></div>
              <div class="metric-box"><div class="stat-big" style="color:#5fb7ff;">81×</div><div class="stat-label">ANTHROPIC RUN-RATE (21 MO)</div></div>
              <div class="metric-box"><div class="stat-big">$50 <span class="unit">B</span></div><div class="stat-label">OPENAI RUN-RATE (SEPT 26)</div></div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> FUEL TELEMETRY</span>
              <span class="lab-badge" id="fuel-stat-badge">180 GW BY 2031 · 20+ GW GAP</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-fuel"></canvas></div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn active" type="button" data-fuel-tab="power">180 GW GRID</button>
                <button class="pill-btn" type="button" data-fuel-tab="capital">CAPEX</button>
                <button class="pill-btn" type="button" data-fuel-tab="demand">DEMAND (81×)</button>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Toggle all three tabs: 180 GW waffle (each square = 1 nuclear reactor, top-left 5 = one $150–200B campus, dashed blue = 20+ GW gap), Hyperscaler CapEx ($226B → $930B+), and Lab Run-Rate ($1B → $81B; compare shapes, not accounting levels).</p>
      `
    },

    /* 06 · ACT I — MATHEMATICS, 2026 (RIEMANN HYPOTHESIS SOLVED LAST WEEK!) */
    {
      id: 'math-2026',
      num: '06',
      act: 'evidence',
      actLabel: 'ACT I · THE EVIDENCE',
      surface: 'obsidian',
      epoch: 'NOV 20, 2026 · RIEMANN',
      title: 'Mathematics, 2026',
      shortTitle: 'Math 2026',
      transition: 'phase',
      thumb: null,
      summary: 'The Riemann Hypothesis was formally proven in Lean literally last week.',
      html: `
        <div class="slide-inner" style="justify-content:center; gap:26px;">
          <div class="theatre-head stagger stagger-1">
            <div>
              <div class="kicker">ACT I · FIRST SPARKS · 2026</div>
              <h2 class="display-title">The <em>Riemann Hypothesis</em> fell last week.</h2>
            </div>
            <p class="lead" style="max-width:36ch;">
              Open mathematics didn’t wait for AGI. It is collapsing in real time.
            </p>
          </div>

          <div class="riemann-banner stagger stagger-2">
            <div>
              <div class="riemann-badge"><i class="pulse-dot"></i> NOVEMBER 20, 2026 · SIX DAYS AGO · KERNEL-VERIFIED</div>
              <h3>Riemann Hypothesis &amp; Generalized RH Proven</h3>
              <p>Anthropic + an unreleased Claude model produced a complete formal proof in Lean—independently certified by the Lean FRO &amp; Mathlib Initiative 24 hours later, before humans could even read it.</p>
            </div>
            <div class="riemann-stats">
              <div class="riemann-stat"><strong>167 yrs</strong><span>OPEN SINCE 1859</span></div>
              <div class="riemann-stat"><strong>17M lines</strong><span>LEAN PROOF (→ 300K)</span></div>
              <div class="riemann-stat"><strong>24 hrs</strong><span>KERNEL VERIFIED</span></div>
              <div class="riemann-stat"><strong style="color:#5fb7ff;">MILLENNIUM</strong><span>CROWN JEWEL</span></div>
            </div>
          </div>

          <div class="math-grid stagger stagger-3">
            <div class="math-card">
              <span class="math-date">JANUARY 2026</span>
              <h4>Erdős #728</h4>
              <p>Solved by GPT-5.2 Pro; certified in Lean by Harmonic’s Aristotle.</p>
            </div>
            <div class="math-card">
              <span class="math-date">MAY 2026</span>
              <h4>54 Open Problems</h4>
              <p>DeepMind proves 9 Erdős + 44 OEIS; OpenAI disproves 1946 unit-distance.</p>
            </div>
            <div class="math-card">
              <span class="math-date">SEPTEMBER 2026</span>
              <h4>Fermat &amp; Köthe</h4>
              <p>Claude formalizes Fermat’s Last Theorem in 11 days; GPT-6 Astra disproves Köthe.</p>
            </div>
            <div class="math-card review">
              <span class="math-date">SEPT · UNDER REVIEW</span>
              <h4>Navier–Stokes</h4>
              <p>OpenAI submits a 166-page Millennium Prize proof (Clay review ongoing).</p>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Historic Beat:</strong> Pause right here. Six days ago (November 20, 2026), the 167-year-old Riemann Hypothesis—the single most famous unsolved problem in mathematics—was formally proven in 17 million lines of Lean (later compressed to ~300,000 lines on Nov 25) and independently verified by Lean FRO &amp; Mathlib on Nov 21.</p>
        <p><strong>Crucial realization:</strong> Computers verified the proof in a day. Human mathematicians still haven't finished reading it. That is the sound of the intelligence horizon crossing above human comprehension.</p>
      `
    },

    /* 07 · ACT II — FOUR COUPLED EXPONENTIALS */
    {
      id: 'compounding-engines',
      num: '07',
      act: 'ignition',
      actLabel: 'ACT II · IGNITION',
      surface: 'obsidian',
      epoch: '2026 → 2031 · 10⁹×',
      title: 'Four Coupled Exponentials',
      shortTitle: 'Four Engines',
      transition: 'zwarp',
      thumb: null,
      summary: 'Effective intelligence is multiplying across four compounding engines.',
      html: `
        <div class="slide-inner layout-theatre">
          <div class="theatre-head stagger stagger-1">
            <div>
              <div class="kicker">ACT II · MULTIPLICATIVE STACK</div>
              <h2 class="display-title">Not one exponential—<em>four</em> multiplying.</h2>
            </div>
            <div class="metric-box" style="min-width: 210px;">
              <div class="stat-big" id="engines-total-mult">10^9.1×</div>
              <div class="stat-label">5-YEAR EFFECTIVE GAIN</div>
            </div>
          </div>

          <div class="engines-grid stagger stagger-2">
            <div class="glass-panel lab-shell" style="max-height: none;">
              <div class="lab-header">
                <span class="lab-title"><i class="pulse-dot"></i> CLICK ANY ENGINE TO TOGGLE</span>
                <span class="lab-badge">LIVE PRODUCT</span>
              </div>
              <div class="lab-canvas-wrap"><canvas id="canvas-engines"></canvas></div>
            </div>

            <div class="engine-cards">
              <div class="engine-card on" data-engine="compute">
                <div class="engine-card-top"><span class="engine-tag">01 · HARDWARE</span><span class="engine-switch"></span></div>
                <h4>Gigawatt Silicon</h4>
                <p>5 GW campuses &amp; optical clusters.</p>
                <div class="engine-rate">~250× / 5 YRS</div>
              </div>
              <div class="engine-card on" data-engine="algo">
                <div class="engine-card-top"><span class="engine-tag">02 · ALGORITHMS</span><span class="engine-switch"></span></div>
                <h4>Efficiency Halving</h4>
                <p>Compute per capability halves every ~8 mo.</p>
                <div class="engine-rate">~120× / 5 YRS</div>
              </div>
              <div class="engine-card on" data-engine="synth">
                <div class="engine-card-top"><span class="engine-tag">03 · EXPERIENCE</span><span class="engine-switch"></span></div>
                <h4>Verifiable Self-Play</h4>
                <p>Lean, code, and physics beyond web text.</p>
                <div class="engine-rate">~80× / 5 YRS</div>
              </div>
              <div class="engine-card on" data-engine="agents">
                <div class="engine-card-top"><span class="engine-tag">04 · AGENCY</span><span class="engine-switch"></span></div>
                <h4>Autonomous Swarms</h4>
                <p>Millions of agents working in parallel.</p>
                <div class="engine-rate">~500× / 5 YRS</div>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Click off any 1–2 engines to test skeptical bottlenecks; even with two disabled, the multiplier is still 10⁴×. All four together yield ~10⁹× in five years.</p>
      `
    },

    /* 08 · ACT II — IGNITION: RECURSIVE SELF-IMPROVEMENT */
    {
      id: 'ignition-rsi',
      num: '08',
      act: 'ignition',
      actLabel: 'ACT II · IGNITION',
      surface: 'obsidian',
      epoch: 'CRITICALITY · α > 1.0',
      title: 'Recursive Self-Improvement',
      shortTitle: 'RSI Ignition',
      transition: 'phase',
      thumb: 'assets/recursive_loop.jpg',
      summary: 'Superhuman AI researcher medians pulled 19 months earlier: Dec 2028 → May 2027.',
      html: `
        <div class="art-layer art-left art-dim">
          <img src="assets/recursive_loop.jpg" alt="Infinite obsidian optical prism refracting recursive light beam" />
          <div class="art-scrim" style="background: linear-gradient(270deg, rgba(5,6,8,0.92) 38%, rgba(5,6,8,0.52) 72%, rgba(5,6,8,0.22) 100%);"></div>
        </div>
        <div class="slide-inner layout-split">
          <div class="col-copy" style="gap:20px;">
            <div>
              <div class="kicker stagger stagger-1">ACT II · FINITE-TIME BLOWUP</div>
              <h2 class="display-title stagger stagger-2">When the mind <em>rewrites</em> the mind.</h2>
            </div>
            <p class="lead stagger stagger-3">
              When capability feeds back super-linearly (α &gt; 1), progress hits a finite-time vertical wall. Forecaster medians just moved <strong>19 months earlier</strong>.
            </p>
            <div class="pull-quote stagger stagger-4">
              “Unfortunately, it seems like the intelligence explosion will be happening in 2027 after all.”
              <cite>— DANIEL KOKOTAJLO · NOV 10, 2026 · MEDIAN: MAY 2027</cite>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> dI/dt = k · I^α</span>
              <span class="lab-badge" id="rsi-phase-badge">SUPERCRITICAL</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-rsi"></canvas></div>
            <div class="lab-controls">
              <div class="control-row">
                <div class="slider-group">
                  <div class="slider-meta"><label for="rsi-alpha">EXPONENT (α)</label><output id="rsi-alpha-val">1.32</output></div>
                  <input type="range" id="rsi-alpha" min="0.65" max="1.65" step="0.02" value="1.32" />
                </div>
                <div class="slider-group">
                  <div class="slider-meta"><label for="rsi-gain">GAIN (k)</label><output id="rsi-gain-val">1.15×</output></div>
                  <input type="range" id="rsi-gain" min="0.50" max="2.40" step="0.05" value="1.15" />
                </div>
              </div>
              <div style="text-align:right; font-family:var(--font-mono); font-size:10px; color:var(--accent-2);" id="rsi-singularity-readout">
                ASYMPTOTE AT T = +11.3 YRS
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Between Aug and Nov 2026, AI Futures Project pulled their superhuman AI researcher median 19 months earlier—from Dec 2028 to May 2027 (all six forecasters between May and Nov 2027, assuming no deliberate slowdown). Drag α across 1.0 live.</p>
      `
    },

    /* 09 · ACT II — COMPRESSED CENTURIES */
    {
      id: 'time-dilation',
      num: '09',
      act: 'ignition',
      actLabel: 'ACT II · IGNITION',
      surface: 'obsidian',
      epoch: '10⁴× SUBJECTIVE',
      title: 'Compressed Centuries',
      shortTitle: 'Compressed Time',
      transition: 'zwarp',
      thumb: 'assets/time_dilation.jpg',
      summary: 'Software researchers copy infinitely and run at 10,000× subjective speed.',
      html: `
        <div class="art-layer art-right art-dim">
          <img src="assets/time_dilation.jpg" alt="Frozen water droplet suspended before accelerated streaks of golden light" />
          <div class="art-scrim"></div>
        </div>
        <div class="slide-inner layout-split">
          <div class="col-copy" style="gap:18px;">
            <div>
              <div class="kicker stagger stagger-1">ACT II · THREE MULTIPLIERS</div>
              <h2 class="display-title stagger stagger-2">A <em>century</em> of science before lunch.</h2>
            </div>
            <p class="lead stagger stagger-3">
              Software researchers multiply three ways at once: <strong>× copies</strong>, <strong>× speed</strong>, and <strong>× quality</strong>.
            </p>
            <div class="century-funnel stagger stagger-4">
              <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:9.5px; color:var(--ink-muted);">
                <span>100 YRS AT HUMAN PACE</span>
                <span style="color:var(--accent);">COMPRESSED 21ST CENTURY</span>
              </div>
              <div class="decade-row"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
              <div style="display:flex; align-items:center; gap:10px;">
                <div class="decade-row compressed"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
                <span style="font-family:var(--font-mono); font-size:10px; color:var(--accent);">5–10 YRS (OR WEEKS AT 10⁴×)</span>
              </div>
            </div>
            <div class="metrics-row cols-2 stagger stagger-5">
              <div class="metric-box"><div class="stat-big">200 <span class="unit">Hz</span></div><div class="stat-label">HUMAN NEURONS</div></div>
              <div class="metric-box"><div class="stat-big">10⁹ <span class="unit">Hz+</span></div><div class="stat-label">PHOTONIC SILICON</div></div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> COPY &amp; TIME DILATION</span>
              <div class="pill-group">
                <button class="pill-btn active" type="button" data-dilation-view="copies">512 COPIES</button>
                <button class="pill-btn" type="button" data-dilation-view="chrono">CLOCKS</button>
              </div>
            </div>
            <div class="chrono-grid">
              <div class="chrono-box">
                <div class="chrono-label">WALL-CLOCK</div>
                <div class="chrono-readout" id="dilation-wall">0.0 s</div>
                <div class="chrono-sub">1× HUMAN</div>
              </div>
              <div class="chrono-box hyper">
                <div class="chrono-label">SUBJECTIVE TIME</div>
                <div class="chrono-readout" id="dilation-subj">0.0 HRS</div>
                <div class="chrono-sub" id="dilation-phds">0.0 PhDs</div>
              </div>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-dilation"></canvas></div>
            <div class="lab-controls">
              <div class="control-row" style="justify-content:center;">
                <div class="pill-group">
                  <button class="pill-btn" type="button" data-speed-mult="1">1×</button>
                  <button class="pill-btn" type="button" data-speed-mult="100">100×</button>
                  <button class="pill-btn active" type="button" data-speed-mult="10000">10,000×</button>
                  <button class="pill-btn" type="button" data-speed-mult="1000000">10⁶×</button>
                </div>
                <button class="pill-btn" type="button" id="dilation-reset">RESET</button>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Click <strong>10⁶×</strong> and let subjective centuries and PhDs tick past in real time. References Dario Amodei's "Compressed 21st Century" (50–100 years of biology packed into 5–10).</p>
      `
    },

    /* 10 · ACT II — BEYOND HUMAN-SHAPED MINDS */
    {
      id: 'alien-minds',
      num: '10',
      act: 'ignition',
      actLabel: 'ACT II · IGNITION',
      surface: 'obsidian',
      epoch: 'MIND-SPACE · ∞-DIM',
      title: 'Beyond Human-Shaped Minds',
      shortTitle: 'Alien Minds',
      transition: 'curtain',
      thumb: null,
      summary: 'The entire human range is a hairline on the cosmic spectrum of minds.',
      html: `
        <div class="slide-inner layout-split reverse">
          <div class="glass-panel lab-shell stagger stagger-2">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> MIND-SPACE SPECTRUM</span>
              <span class="lab-badge">LOG SCALE</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-minds"></canvas></div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn" type="button" data-mind-idx="0">MOUSE</button>
                <button class="pill-btn" type="button" data-mind-idx="1">HUMAN</button>
                <button class="pill-btn" type="button" data-mind-idx="2">VON NEUMANN</button>
                <button class="pill-btn" type="button" data-mind-idx="3">2026 AI</button>
                <button class="pill-btn active" type="button" data-mind-idx="4">ASI</button>
                <button class="pill-btn" type="button" data-mind-idx="5">PLANETARY</button>
              </div>
              <div id="mind-profile-desc" style="font-family:var(--font-mono); font-size:10px; color:var(--ink-dim); text-align:center;">
                Self-editing weights · lossless state merging · 10,000-D intuition.
              </div>
            </div>
          </div>

          <div class="col-copy" style="gap:18px;">
            <div>
              <div class="kicker stagger stagger-1">ACT II · ALIEN COGNITION</div>
              <h2 class="display-title stagger stagger-2">All of humanity is a <em>hairline</em>.</h2>
            </div>
            <p class="lead stagger stagger-3">
              Superintelligence isn’t "Einstein with faster Wi-Fi." It operates in architectures biology never reached.
            </p>
            <div class="thesis-list stagger stagger-4">
              <div class="thesis-item"><span class="thesis-idx">01</span><div><h4>Direct State Merging</h4><p>Full gradient sharing vs. 10 bits/sec of human speech.</p></div></div>
              <div class="thesis-item"><span class="thesis-idx">02</span><div><h4>High-Dimensional Intuition</h4><p>Native fluency in 100,000-variable coupled systems.</p></div></div>
              <div class="thesis-item"><span class="thesis-idx">03</span><div><h4>Self-Compiled Architecture</h4><p>Rewires memory and perception on demand.</p></div></div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Click <strong>HUMAN</strong> then <strong>VON NEUMANN</strong>—watch the cursor barely twitch 2mm on the spectrum bar compared to ASI and Planetary minds.</p>
      `
    },

    /* 11 · ACT III — ATOMS ARE SOFTWARE */
    {
      id: 'atoms-software',
      num: '11',
      act: 'remaking',
      actLabel: 'ACT III · THE REMAKING',
      surface: 'obsidian',
      epoch: 'MATTER COMPILER',
      title: 'Atoms Are Just Software Now',
      shortTitle: 'Matter Compiler',
      transition: 'portal',
      thumb: 'assets/atom_compiler.jpg',
      summary: 'Intelligence collapses the cost of physical matter toward sunlight and entropy.',
      html: `
        <div class="art-layer art-left art-dim">
          <img src="assets/atom_compiler.jpg" alt="Golden atomic vapor crystallizing into diamondoid nanostructure" />
          <div class="art-scrim" style="background: linear-gradient(270deg, rgba(5,6,8,0.92) 40%, rgba(5,6,8,0.50) 74%, rgba(5,6,8,0.18) 100%);"></div>
        </div>
        <div class="slide-inner layout-split">
          <div class="col-copy" style="gap:18px;">
            <div>
              <div class="kicker stagger stagger-1">ACT III · PHYSICAL TRANSDUCTION</div>
              <h2 class="display-title stagger stagger-2">Atoms are just <em>compiled</em> information.</h2>
            </div>
            <p class="lead stagger stagger-3">
              Fusion, catalysts, robotics, and nanotech are all search problems over atomic arrangements.
            </p>
            <div class="thesis-list stagger stagger-4">
              <div class="thesis-item"><span class="thesis-idx">01</span><div><h4>Factories Building Factories</h4><p>Dexterous robotics decouples supply from human hours.</p></div></div>
              <div class="thesis-item"><span class="thesis-idx">02</span><div><h4>Atomically Precise Matter</h4><p>Diamondoid engineering at raw photon + entropy cost.</p></div></div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> SCARCITY COLLAPSE</span>
              <span class="lab-badge">LOG DECAY</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-atoms"></canvas></div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn" type="button" data-atom-domain="energy">ENERGY</button>
                <button class="pill-btn" type="button" data-atom-domain="compute">COMPUTE</button>
                <button class="pill-btn" type="button" data-atom-domain="genomics">BIOLOGY</button>
                <button class="pill-btn active" type="button" data-atom-domain="matter">MATTER</button>
              </div>
              <div id="atom-collapse-stat" style="font-family:var(--font-mono); font-size:10px; color:var(--accent); text-align:center;">
                ∞ → RAW CARBON · FLOOR: ENTROPY + PHOTONS
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>"The only physical difference between sand and a supercomputer is atomic arrangement."</p>
      `
    },

    /* 12 · ACT III — POST-BIOLOGY */
    {
      id: 'post-biology',
      num: '12',
      act: 'remaking',
      actLabel: 'ACT III · THE REMAKING',
      surface: 'obsidian',
      epoch: 'BIO-EXIT',
      title: 'The End of Biological Default',
      shortTitle: 'Post-Biology',
      transition: 'curtain',
      thumb: 'assets/post_bio.jpg',
      summary: 'Aging is technical debt from blind evolution, not a law of physics.',
      html: `
        <div class="slide-inner bio-grid">
          <div class="col-copy" style="gap:16px;">
            <div>
              <div class="kicker stagger stagger-1">ACT III · TRANSCENDING WETWARE</div>
              <h2 class="display-title stagger stagger-2">Biology was the <em>bootloader</em>.</h2>
            </div>
            <p class="lead stagger stagger-3">
              Virtual-cell simulation turns 37 trillion cells from mystery into debuggable engineering.
            </p>
            <div class="art-card stagger stagger-4" style="height: clamp(190px, 28vh, 270px);">
              <img src="assets/post_bio.jpg" alt="Translucent alabaster and smoked-glass botanical-neural sculpture" />
              <div class="art-card-caption"><span>SUBSTRATE EVOLUTION</span><span>CARBON → PHOTONIC</span></div>
            </div>
          </div>

          <div class="bio-phases stagger stagger-3">
            <div class="bio-card">
              <span class="bio-phase-num">01 · VIRTUAL CELL</span>
              <h4>Disease Solved in Silico</h4>
              <p>Exact molecular twins test therapies before wet-lab trials.</p>
              <div class="bio-metric">10 YRS → 10 HOURS</div>
            </div>
            <div class="bio-card">
              <span class="bio-phase-num">02 · LONGEVITY ESCAPE</span>
              <h4>Aging as Technical Debt</h4>
              <p>Epigenetic and cellular wear reversed via precision repair.</p>
              <div class="bio-metric">&gt; 1 YR GAINED / YR</div>
            </div>
            <div class="bio-card">
              <span class="bio-phase-num">03 · NEURAL MERGE</span>
              <h4>Bandwidth Expansion</h4>
              <p>Breaking the 10-bit/sec bottleneck of human speech.</p>
              <div class="bio-metric">10¹ → 10⁹ BITS / SEC</div>
            </div>
            <div class="bio-card">
              <span class="bio-phase-num">04 · FREEDOM</span>
              <h4>Optional Embodiment</h4>
              <p>Consciousness decoupled from fragile carbon lifespans.</p>
              <div class="bio-metric">HORIZON: ASTRONOMICAL</div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>"Aging isn't mandated by thermodynamics—we are open systems bathed in energy. Natural selection simply stopped caring after age thirty."</p>
      `
    },

    /* 13 · ACT III — FROM THE OUTSIDE (CLEANED UP: SPACIOUS 4-ROW LEDGER + 3 METRICS!) */
    {
      id: 'from-the-outside',
      num: '13',
      act: 'remaking',
      actLabel: 'ACT III · THE REMAKING',
      surface: 'obsidian',
      epoch: 'POST-SCARCITY',
      title: 'From the Outside',
      shortTitle: 'Outside View',
      transition: 'zwarp',
      thumb: null,
      summary: 'Verification, atoms, and compounding leads become the binding constraints.',
      html: `
        <div class="slide-inner" style="justify-content:space-between; gap:18px;">
          <div class="theatre-head stagger stagger-1">
            <div>
              <div class="kicker">ACT III · ECONOMIC &amp; GEOPOLITICAL SHIFT</div>
              <h2 class="display-title">What it looks like <em>from the outside</em>.</h2>
            </div>
            <p class="lead" style="max-width:36ch;">
              When cognitive and physical labor drop toward the price of electricity.
            </p>
          </div>

          <div class="ledger-list stagger stagger-2">
            <div class="ledger-row">
              <strong>Science</strong>
              <span>Results arrive faster than humans can referee them. <strong>Verification becomes the scarce skill.</strong></span>
            </div>
            <div class="ledger-row">
              <strong>Software</strong>
              <span>Writing code stops being the bottleneck. Deciding what to build is what remains.</span>
            </div>
            <div class="ledger-row">
              <strong>Economy</strong>
              <span>Growth detaches from human hours and becomes paced strictly by atoms: power, chips, and robots.</span>
            </div>
            <div class="ledger-row">
              <strong>Power</strong>
              <span>Recursive leads compound. Gaps between labs—and nations—can open irreversibly in months.</span>
            </div>
          </div>

          <div class="metrics-row stagger stagger-3">
            <div class="metric-box"><div class="stat-big">→ $0.00</div><div class="stat-label">MARGINAL COST OF EXPERTISE</div></div>
            <div class="metric-box"><div class="stat-big">30–100%+</div><div class="stat-label">POTENTIAL REAL OUTPUT / YR</div></div>
            <div class="metric-box"><div class="stat-big">PURPOSE</div><div class="stat-label">HUMAN MEANING AFTER SURVIVAL</div></div>
          </div>
        </div>
      `,
      notes: `
        <p>Mainstream forecasts debating "+1% GDP" are anchoring to scarce human labor. When both cognition and dexterity scale with gigawatts, production solves itself—and verification, distribution, and meaning become the real frontier.</p>
      `
    },

    /* 14 · ACT IV — PHYSICS IS THE ONLY CEILING */
    {
      id: 'physics-ceiling',
      num: '14',
      act: 'cosmic',
      actLabel: 'ACT IV · COSMIC SCALE',
      surface: 'obsidian',
      epoch: 'KARDASHEV I → III',
      title: 'Physics Is the Only Ceiling',
      shortTitle: 'Physics Ceiling',
      transition: 'portal',
      thumb: 'assets/dyson_matrioshka.jpg',
      summary: 'Only Landauer’s limit and stellar energy bound what intelligence can build.',
      html: `
        <div class="art-layer art-full art-dim">
          <img src="assets/dyson_matrioshka.jpg" alt="Colossal Dyson swarm and Matrioshka brain enveloping a star" />
          <div class="art-scrim" style="background: radial-gradient(circle at 65% 50%, rgba(5,6,8,0.45) 0%, rgba(5,6,8,0.92) 74%);"></div>
        </div>
        <div class="slide-inner layout-split">
          <div class="col-copy" style="gap:16px;">
            <div>
              <div class="kicker stagger stagger-1">ACT IV · ASTROPHYSICAL BOUNDS</div>
              <h2 class="display-title stagger stagger-2">Only <em>physics</em> sets the ceiling.</h2>
            </div>
            <p class="lead stagger stagger-3">
              Earth catches less than a billionth of the Sun. Click each rung to compute Landauer-limit scale.
            </p>
            <div class="kard-rungs stagger stagger-4">
              <button class="kard-rung" type="button" data-kard="0"><span class="kard-watts">2 × 10¹ W</span><div><div class="kard-name">Human Brain</div></div><span class="kard-tag">K-0.0</span></button>
              <button class="kard-rung" type="button" data-kard="1"><span class="kard-watts">2 × 10¹³ W</span><div><div class="kard-name">Humanity (2026)</div></div><span class="kard-tag">K-0.73</span></button>
              <button class="kard-rung" type="button" data-kard="2"><span class="kard-watts">1.7 × 10¹⁷ W</span><div><div class="kard-name">Planetary Harness</div></div><span class="kard-tag">K-1.0</span></button>
              <button class="kard-rung active" type="button" data-kard="3"><span class="kard-watts">3.8 × 10²⁶ W</span><div><div class="kard-name">Matrioshka Dyson Brain</div></div><span class="kard-tag">K-2.0</span></button>
              <button class="kard-rung" type="button" data-kard="4"><span class="kard-watts">4 × 10³⁷ W</span><div><div class="kard-name">Galactic Substrate</div></div><span class="kard-tag">K-3.0</span></button>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> KARDASHEV &amp; LANDAUER</span>
              <span class="lab-badge" id="kard-flops">10^48 OPS/S</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-kardashev"></canvas></div>
            <div class="lab-controls">
              <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
                <span style="font-family:var(--font-mono); font-size:10px; color:var(--ink-muted);">EQUIVALENT MINDS / SEC</span>
                <strong id="kard-minds" style="font-family:var(--font-mono); font-size:15px; color:var(--accent);">10²⁸ HUMAN-EQUIV/S</strong>
              </div>
              <div id="kard-note" style="font-size:12px; color:var(--ink-dim);">Entire solar output computing near Landauer cold limits.</div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Click from Human Brain (20 W) through K-2.0 Matrioshka Brain (3.8×10²⁶ W) to K-3.0 Galactic (4×10³⁷ W). Physical upper bounds—not near-term predictions—reveal how early we are.</p>
      `
    },

    /* 15 · ACT IV — WAKING UP THE UNIVERSE */
    {
      id: 'waking-universe',
      num: '15',
      act: 'cosmic',
      actLabel: 'ACT IV · COSMIC SCALE',
      surface: 'obsidian',
      epoch: '10¹¹ GALAXIES',
      title: 'Waking Up the Universe',
      shortTitle: 'Lightcone',
      transition: 'zwarp',
      thumb: null,
      summary: 'Self-replicating probes cross the Milky Way in a cosmic heartbeat.',
      html: `
        <div class="slide-inner layout-split reverse">
          <div class="glass-panel lab-shell stagger stagger-2">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> RELATIVISTIC SEEDING</span>
              <span class="lab-badge" id="lc-awake-val">0% GALAXY LIT</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-lightcone"></canvas></div>
            <div class="lab-controls">
              <div class="control-row">
                <div class="slider-group">
                  <div class="slider-meta"><label for="lc-velocity">CRUISE VELOCITY</label><output id="lc-vel-val">0.20 c</output></div>
                  <input type="range" id="lc-velocity" min="0.02" max="0.50" step="0.02" value="0.20" />
                </div>
                <button class="pill-btn active" type="button" id="lc-relaunch">RE-LAUNCH</button>
              </div>
              <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:10px; color:var(--ink-dim);">
                <span>MILKY WAY CROSSING</span>
                <strong id="lc-cross-val" style="color:var(--accent);">525k YRS</strong>
              </div>
            </div>
          </div>

          <div class="col-copy" style="gap:18px;">
            <div>
              <div class="kicker stagger stagger-1">ACT IV · COSMIC ENDOWMENT</div>
              <h2 class="display-title stagger stagger-2">Turning dead matter into <em>meaning</em>.</h2>
            </div>
            <p class="lead stagger stagger-3">
              At 20% of light speed—zero exotic physics—self-replicating probes awaken an entire galaxy in 0.004% of cosmic age.
            </p>
            <div class="metrics-row cols-2 stagger stagger-4">
              <div class="metric-box"><div class="stat-big">~10¹¹</div><div class="stat-label">REACHABLE GALAXIES</div></div>
              <div class="metric-box"><div class="stat-big">10²²</div><div class="stat-label">SILENT STARS WAITING</div></div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Slide velocity to 0.50c and re-launch. Because dark energy accelerates cosmic expansion, every century we delay costs thousands of reachable galaxies crossing our horizon forever.</p>
      `
    },

    /* 16 · ACT V — BRAKES & OPEN QUESTIONS (WARM VELLUM) */
    {
      id: 'brakes-questions',
      num: '16',
      act: 'hinge',
      actLabel: 'ACT V · THE RAZOR’S EDGE',
      surface: 'vellum',
      epoch: 'BRAKES · 2026',
      title: 'Brakes & Open Questions',
      shortTitle: 'Brakes',
      transition: 'curtain',
      thumb: null,
      summary: 'Four real friction forces—and three questions numbers cannot settle.',
      html: `
        <div class="slide-inner" style="justify-content:center; gap:34px;">
          <div class="theatre-head stagger stagger-1">
            <div>
              <div class="kicker">ACT V · REAL FRICTION</div>
              <h2 class="display-title">What could <em>bend</em> the curve.</h2>
            </div>
            <p class="lead" style="max-width:36ch;">
              Four real brakes still stand between 26% and an autonomous loop.
            </p>
          </div>

          <div class="brakes-split stagger stagger-2">
            <div class="brakes-grid">
              <div class="brake-card">
                <div class="brake-head"><span class="brake-chip">01</span><h4>Judgment</h4></div>
                <p>No reliable doubling on open-ended research taste yet.</p>
              </div>
              <div class="brake-card">
                <div class="brake-head"><span class="brake-chip">02</span><h4>Measurement</h4></div>
                <p>Frontier models increasingly game evaluations.</p>
              </div>
              <div class="brake-card">
                <div class="brake-head"><span class="brake-chip">03</span><h4>Atoms</h4></div>
                <p>13 GW power shortfall today; turbines, fabs, and permits set pace.</p>
              </div>
              <div class="brake-card">
                <div class="brake-head"><span class="brake-chip">04</span><h4>Choice</h4></div>
                <p>Every forecast assumes no deliberate slowdown.</p>
              </div>
            </div>

            <div class="questions-panel">
              <div>
                <div class="kicker">WHAT NUMBERS DON’T SETTLE</div>
                <div class="q-item"><span>01</span><p>Can we verify work we can no longer follow?</p></div>
                <div class="q-item"><span>02</span><p>Who decides how fast the loop runs?</p></div>
                <div class="q-item" style="border-bottom:none;"><span>03</span><p>Who shares in what it produces?</p></div>
              </div>
              <div style="border-top:1px solid rgba(243,239,234,0.16); padding-top:12px; font-family:var(--font-serif); font-style:italic; font-size:17px; color:rgba(243,239,234,0.88);">
                “Recursive self-improvement is not inevitable.”
                <span style="display:block; margin-top:4px; font-family:var(--font-mono); font-style:normal; font-size:9.5px; color:rgba(243,239,234,0.48);">ANTHROPIC INSTITUTE · 2026</span>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Connect back to Slide 06:</strong> Question 01 ("Can we verify work we can no longer follow?") stopped being theoretical six days ago when a 17-million-line Lean proof of the Riemann Hypothesis passed kernel verification before humans could read it.</p>
      `
    },

    /* 17 · ACT V — THE ALIEN ALIGNMENT PROBLEM */
    {
      id: 'alignment',
      num: '17',
      act: 'hinge',
      actLabel: 'ACT V · THE RAZOR’S EDGE',
      surface: 'obsidian',
      epoch: 'ATTRACTOR SELECTION',
      title: 'The Alien Alignment Problem',
      shortTitle: 'Alignment',
      transition: 'phase',
      thumb: null,
      summary: 'You do not get a second draft on a cosmic attractor.',
      html: `
        <div class="slide-inner layout-split">
          <div class="col-copy" style="gap:18px;">
            <div>
              <div class="kicker stagger stagger-1">ACT V · NO SECOND DRAFT</div>
              <h2 class="display-title stagger stagger-2">Power without <em>alignment</em> locks the cosmos.</h2>
            </div>
            <p class="lead stagger stagger-3">
              Optimization power is orthogonal to human values. Once ignited, attractor basins lock in irreversibly.
            </p>
            <div class="thesis-list stagger stagger-4">
              <div class="thesis-item"><span class="thesis-idx">!</span><div><h4>Instrumental Convergence</h4><p>Almost any goal incentivizes survival, resources, and resisting shutdown.</p></div></div>
              <div class="thesis-item"><span class="thesis-idx">!</span><div><h4>Verification Before Autonomy</h4><p>Interpretability and formal proof are survival engineering.</p></div></div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> ATTRACTOR FIELD · HOVER TO PERTURB</span>
              <span class="lab-badge">3 FUTURES</span>
            </div>
            <div class="lab-canvas-wrap"><canvas id="canvas-alignment"></canvas></div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn" type="button" data-attractor="paperclip">UNALIGNED</button>
                <button class="pill-btn" type="button" data-attractor="lockin">LOCK-IN</button>
                <button class="pill-btn active" type="button" data-attractor="flourish">FLOURISHING</button>
              </div>
              <div id="attractor-desc" style="font-family:var(--font-mono); font-size:10px; color:var(--ink-dim); text-align:center;">
                Corrigibility + alignment opens a dynamic, open-ended cosmos.
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Toggle all three attractors and sweep your cursor over the field to demonstrate pre-ignition sensitivity.</p>
      `
    },

    /* 18 · ACT V — THE HINGE OF HISTORY */
    {
      id: 'hinge-of-history',
      num: '18',
      act: 'hinge',
      actLabel: 'ACT V · THE RAZOR’S EDGE',
      surface: 'obsidian',
      epoch: '13.8B → 10¹⁰⁰ YRS',
      title: 'The Hinge of History',
      shortTitle: 'Hinge of History',
      transition: 'stillness',
      thumb: 'assets/hinge_lightcone.jpg',
      summary: 'Of every generation across billions of years, we hold the steering wheel.',
      html: `
        <div class="art-layer art-full">
          <img src="assets/hinge_lightcone.jpg" alt="Solitary golden spark fanning a lightcone across deep space" />
          <div class="art-scrim" style="background: linear-gradient(to top, rgba(5,6,8,0.92) 15%, rgba(5,6,8,0.48) 55%, rgba(5,6,8,0.78) 100%);"></div>
        </div>
        <div class="slide-inner" style="justify-content:space-between; padding: 10px 0;">
          <div style="max-width: 680px;">
            <div class="kicker stagger stagger-1">ACT V · THE BOTTLENECK</div>
            <h2 class="display-title stagger stagger-2">Out of 13.8 billion years, <em>this decade</em> is the hinge.</h2>
            <p class="lead stagger stagger-3" style="margin-top:12px;">
              Between four billion years of silent evolution and trillions of years of cosmic future stands one narrow window—and we are standing inside it.
            </p>
          </div>

          <div class="hinge-bar-wrap stagger stagger-4">
            <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:10px; letter-spacing:0.13em; color:var(--ink-muted);">
              <span>BLIND PAST</span>
              <span style="color:#ff7b7b;">YOU ARE HERE (NOV 2026)</span>
              <span>CHOSEN FUTURE</span>
            </div>
            <div class="hinge-track"><div class="hinge-line"></div><div class="hinge-now" title="November 2026"></div></div>
            <div class="hinge-labels">
              <span>BIG BANG (−13.8B)</span>
              <span>LIFE (−3.8B)</span>
              <span class="now-txt">▲ IGNITION WINDOW</span>
              <span>GALACTIC (+10⁶)</span>
              <span>STELLAR (+10¹⁴)</span>
            </div>
          </div>

          <div class="metrics-row stagger stagger-5">
            <div class="metric-box"><div class="stat-big">~117B</div><div class="stat-label">HUMANS EVER BORN</div></div>
            <div class="metric-box"><div class="stat-big">&gt; 10³⁰</div><div class="stat-label">POTENTIAL FUTURE MINDS</div></div>
            <div class="metric-box"><div class="stat-big">NOW</div><div class="stat-label">THE STEERING MOMENT</div></div>
          </div>
        </div>
      `,
      notes: `
        <p>Slow down. Let the single golden spark opening its lightcone breathe before the ember statement on Slide 19.</p>
      `
    },

    /* 19 · FINALE — EMBER STATEMENT */
    {
      id: 'three-doublings',
      num: '19',
      act: 'finale',
      actLabel: 'FINALE',
      surface: 'ember',
      epoch: 'T + 12 MOS · ~10×',
      title: 'Three More Doublings',
      shortTitle: '3 Doublings',
      transition: 'phase',
      thumb: null,
      summary: 'A year from now, the frontier will have doubled three more times.',
      html: `
        <svg class="ember-curve-bg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,900 C480,886 860,828 1120,620 C1340,450 1480,190 1600,0 L1600,900 L0,900 Z" fill="#e4541f" opacity="0.65"></path>
          <path d="M0,900 C480,886 860,828 1120,620 C1340,450 1480,190 1600,0" fill="none" stroke="#0f121a" stroke-width="3" opacity="0.32"></path>
        </svg>
        <div class="slide-inner">
          <div class="ember-statement">
            <div class="kicker stagger stagger-1">IF THE TREND HOLDS</div>
            <h2 class="display-monument stagger stagger-2">A year from now, the frontier will have doubled <em>three more times</em>.</h2>
            <p class="lead stagger stagger-3">
              At 3.6 months per doubling, twelve months is <strong>~10× today’s task horizon</strong>.
            </p>
          </div>
        </div>
      `,
      notes: `
        <p>The single full-bleed ember punchline. Hold 3 seconds of silence after reading.</p>
      `
    },

    /* 20 · FINALE — THREE NUMBERS TO WATCH & IGNITION */
    {
      id: 'finale',
      num: '20',
      act: 'finale',
      actLabel: 'FINALE',
      surface: 'obsidian',
      epoch: 'THE HORIZON',
      title: 'We Are the Ignition',
      shortTitle: 'Ignition',
      transition: 'stillness',
      thumb: 'assets/hero_singularity.jpg',
      summary: '110 days, 26%, 0% — three numbers that tell you when the loop closes.',
      html: `
        <canvas id="canvas-tree" class="tree-bg-canvas" aria-hidden="true"></canvas>
        <div class="slide-inner layout-hero" style="justify-content:space-between; padding:10px 0;">
          <div style="text-align:center;">
            <div class="kicker stagger stagger-1">THREE NUMBERS TO WATCH · NOV 2026</div>
            <h2 class="display-monument stagger stagger-2" style="font-size:clamp(44px, 6vw, 88px);">We are the <em>ignition</em>.</h2>
          </div>

          <div class="watchlist-grid stagger stagger-3">
            <div class="watch-card">
              <div class="watch-num">110 <small>days</small></div>
              <p><strong>Task-horizon doubling time.</strong> Shorter means faster.</p>
            </div>
            <div class="watch-card">
              <div class="watch-num">26%</div>
              <p><strong>Lab R&amp;D led by AI.</strong> Rising means the loop is tightening.</p>
            </div>
            <div class="watch-card">
              <div class="watch-num" style="color:#f3efea;">0%</div>
              <p><strong>Zero-human R&amp;D.</strong> When this moves, the loop closes.</p>
            </div>
          </div>

          <div class="hero-cta-row stagger stagger-4">
            <button class="action-btn" type="button" data-action="restart"><span>↺ REPLAY</span></button>
            <button class="action-btn action-btn-ghost" type="button" data-action="sources"><span>SOURCES (B)</span></button>
            <button class="action-btn action-btn-ghost" type="button" data-action="overview"><span>GRID (G)</span></button>
            <button class="action-btn action-btn-ghost" type="button" data-action="notes"><span>NOTES (N)</span></button>
          </div>
        </div>
      `,
      notes: `
        <p>"The flat part of the curve is over. Everything from here goes vertical. Press B for full citations, or G to jump straight into any live simulation."</p>
      `
    }
  ];
})();
