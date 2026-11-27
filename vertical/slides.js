/* ============================================================================
   VERTICAL — THE INTELLIGENCE EXPLOSION (20-Movement Edition)
   Fuses November 2026 empirical measurements with unanchored deep-future physics.
   ============================================================================ */

(function () {
  window.VERTICAL = window.VERTICAL || {};

  window.VERTICAL.SLIDES = [
    /* ------------------------------------------------------------------------
       01 · OVERTURE — VERTICAL
       ------------------------------------------------------------------------ */
    {
      id: 'vertical',
      num: '01',
      act: 'overture',
      actLabel: 'OVERTURE',
      surface: 'obsidian',
      epoch: 'BRIEFING · NOV 2026',
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
          <div class="kicker stagger stagger-1">AN UNANCHORED BRIEFING ON THE INTELLIGENCE EXPLOSION</div>
          <h1 class="display-hero stagger stagger-2">VERTICAL</h1>
          <p class="hero-subtitle stagger stagger-3">
            What happens when the thing that builds AI is AI.<br />
            Everything in 300,000 years of human history was the flat part of the curve.
          </p>
          <div class="hero-meta-strip stagger stagger-4">
            <span><strong>6 ACTS</strong> · 20 MOVEMENTS</span>
            <span><strong>12 LIVE</strong> SIMULATIONS</span>
            <span><strong>NOV 2026</strong> EMPIRICAL DATA + PHYSICS</span>
          </div>
          <div class="hero-cta-row stagger stagger-5">
            <button class="action-btn" type="button" data-action="next">
              <span>BEGIN BRIEFING</span><span>→</span>
            </button>
            <button class="action-btn action-btn-ghost" type="button" data-action="sound">
              <span>ENABLE SOUNDSCAPE (S)</span>
            </button>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Opening Silence (3 seconds):</strong> Let the event horizon breathe before speaking.</p>
        <p>"Every mainstream forecast about AI shares one flaw: anchor bias. This briefing starts with what is already being measured inside the labs in November 2026—then drops the anchor and follows the curve all the way to the limits of physics."</p>
      `
    },

    /* ------------------------------------------------------------------------
       02 · ACT I — THE ANCHOR BIAS TRAP
       ------------------------------------------------------------------------ */
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
      summary: 'Linear savannah minds drawing straight tangent lines at the base of a cliff.',
      html: `
        <div class="slide-inner layout-split">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT I · THE CLAIM &amp; COGNITIVE BLINDNESS</div>
            <h2 class="display-title stagger stagger-2">Linear minds on a <em>hyperbolic</em> cliff.</h2>
            <div class="pull-quote stagger stagger-3">
              “…the first ultraintelligent machine is the <em>last invention</em> that man need ever make.”
              <cite>— I. J. GOOD, 1965 · SIXTY-ONE YEARS LATER, THE LOOP IS BEING MEASURED</cite>
            </div>
            <p class="lead stagger stagger-4">
              Biological brains evolved where tomorrow always resembled yesterday. When a curve passes its knee, human intuition draws a flat tangent—and misses reality by orders of magnitude.
            </p>
            <div class="thesis-list stagger stagger-5">
              <div class="thesis-item">
                <span class="thesis-idx">01</span>
                <div>
                  <h4>Normalcy Bias Is Not Skepticism</h4>
                  <p>Predicting "+1.4% GDP by 2035" is not rigor. It is emotional comfort masquerading as realism.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> INTERACTIVE LAB · EXTRAPOLATION ERROR</span>
              <span class="lab-badge" id="anchor-err-val">10^3× UNDERESTIMATE</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-anchor"></canvas>
            </div>
            <div class="lab-controls">
              <div class="control-row">
                <div class="slider-group">
                  <div class="slider-meta">
                    <label for="anchor-year">OBSERVER ANCHOR YEAR</label>
                    <output id="anchor-year-val">2024</output>
                  </div>
                  <input type="range" id="anchor-year" min="2018" max="2029" step="1" value="2024" />
                </div>
                <div class="pill-group">
                  <button class="pill-btn active" type="button" id="anchor-scale-lin">LINEAR VIEW</button>
                  <button class="pill-btn" type="button" id="anchor-scale-log">LOG₁₀ VIEW</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Live Demo:</strong> Scrub <strong>Observer Anchor Year</strong> from 2019 → 2024 → 2027, then click <strong>LOG₁₀ VIEW</strong> to reveal that even on a log axis, the curve bends upward.</p>
      `
    },

    /* ------------------------------------------------------------------------
       03 · ACT I — TASK HORIZONS & ACCELERATING DOUBLING TIME (METR NOV 2026)
       ------------------------------------------------------------------------ */
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
      summary: 'Task length frontier AI finishes half the time is now doubling every 3.6 months.',
      html: `
        <div class="slide-inner layout-split">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT I · MEASURED CAPABILITY CURVE</div>
            <h2 class="display-title stagger stagger-2">The doubling time itself is <em>shrinking</em>.</h2>
            <p class="lead stagger stagger-3">
              METR measures the human working-time length of tasks frontier models complete 50% of the time. Shorter bars below mean faster progress—and the trend has accelerated sharply since 2024.
            </p>
            <div class="doubling-bars stagger stagger-4">
              <div class="doubling-row">
                <div class="doubling-num">7 <small>mo</small></div>
                <div class="doubling-track">
                  <div class="doubling-bar" style="width:100%; background:#8a93a6;"></div>
                  <div class="doubling-cap">2019–2024 · original trend, all measured tasks</div>
                </div>
              </div>
              <div class="doubling-row">
                <div class="doubling-num" style="color:#ff6b35;">3.6 <small>mo</small></div>
                <div class="doubling-track">
                  <div class="doubling-bar" style="width:51%; background:#ff6b35; box-shadow:0 0 12px rgba(255,107,53,0.5);"></div>
                  <div class="doubling-cap">Since 2024 · TH1.1 &amp; TH2 suites, Nov 2026 (95% CI 2.1–4.9)</div>
                </div>
              </div>
              <div class="doubling-row">
                <div class="doubling-num" style="color:#5fb7ff;">1.65 <small>mo</small></div>
                <div class="doubling-track">
                  <div class="doubling-bar" style="width:24%; background:#5fb7ff; box-shadow:0 0 12px rgba(95,183,255,0.5);"></div>
                  <div class="doubling-cap">TH2 tasks with checkable answers only (95% CI 0.8–4.0)</div>
                </div>
              </div>
            </div>
            <div class="source-foot stagger stagger-5">Measured + extrapolation · Sources: METR Time Horizon 1.1 (Jan 2026) &amp; Q4 2026 update (Nov 20, 2026)</div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> METR TASK HORIZON (LOG HOURS · 2023–2029)</span>
              <span class="lab-badge">MEASURED + EXTRAP.</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-horizons"></canvas>
            </div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn" type="button" data-horizon-mode="orig">7-MO BASELINE</button>
                <button class="pill-btn active" type="button" data-horizon-mode="base">3.6-MO CURRENT</button>
                <button class="pill-btn" type="button" data-horizon-mode="verif">1.65-MO CHECKABLE</button>
              </div>
              <div id="horizon-readout" style="font-family:var(--font-mono); font-size:10px; color:var(--accent); text-align:center;">
                3.6-MO DOUBLING → 200 H (JUL 2027) · 2,000 H (MID-2028)
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Key Empirical Beat:</strong> From 50 minutes (Claude 3.7 Sonnet) → 3h 57m (Gemini 3 Pro) → 16–20 hours (frontier agents) → <strong>27 hours on verifiable tasks right now in November 2026</strong>.</p>
        <p>Toggle between <strong>7-MO BASELINE</strong>, <strong>3.6-MO CURRENT</strong>, and <strong>1.65-MO CHECKABLE</strong>. Extending the 3.6-month trend puts a <strong>200-hour</strong> task in July 2027 and a <strong>2,000-hour work-year</strong> by mid-2028.</p>
      `
    },

    /* ------------------------------------------------------------------------
       04 · ACT I — INSIDE THE LABS & THE AUTOMATION LADDER (WARM VELLUM!)
       ------------------------------------------------------------------------ */
    {
      id: 'inside-labs',
      num: '04',
      act: 'evidence',
      actLabel: 'ACT I · THE EVIDENCE',
      surface: 'vellum',
      epoch: 'INSIDE THE LABS · 2026',
      title: 'Inside the Labs & The Automation Ladder',
      shortTitle: 'Inside the Labs',
      transition: 'curtain',
      thumb: null,
      summary: '80%+ code merged, 26% of AI R&D led by AI, 2× capability pace — and 0% fully autonomous yet.',
      html: `
        <div class="slide-inner" style="justify-content:space-between; gap:14px;">
          <div class="theatre-head stagger stagger-1">
            <div class="theatre-head-copy">
              <div class="kicker">ACT I · EMPIRICAL SELF-IMPROVEMENT</div>
              <h2 class="display-title">The loop is already turning <em>inside the labs</em>.</h2>
            </div>
            <p class="lead" style="max-width:42ch; font-size:13.5px;">
              OpenAI reported early GPT-5.3-Codex helped debug and deploy itself. Across frontier labs, AI now writes code, runs experiments, catches reviewer errors, and proposes what to try next.
            </p>
          </div>

          <div class="lab-kpis stagger stagger-2">
            <div class="lab-kpi">
              <div class="lab-kpi-num">80%+</div>
              <p>of code merged at Anthropic written by Claude in May 2026 (up from low single digits in early 2025).</p>
            </div>
            <div class="lab-kpi">
              <div class="lab-kpi-num">26%</div>
              <p>of Anthropic’s catalogued R&amp;D work led by Claude in Aug 2026 (up from under 1% in February).</p>
            </div>
            <div class="lab-kpi">
              <div class="lab-kpi-num">2×</div>
              <p>pace of capability gains vs. 2024–25 per METR’s review (~80% of speed-up credited to AI).</p>
            </div>
            <div class="lab-kpi">
              <div class="lab-kpi-num dark">0%</div>
              <p>of R&amp;D done with zero human in the loop today. When this number moves, the loop closes.</p>
            </div>
          </div>

          <div class="stagger stagger-3">
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
              <span style="font-family:var(--font-mono); font-size:10px; letter-spacing:0.15em; color:var(--accent); text-transform:uppercase;">EPOCH AI AUTOMATION LADDER · STEPS 04 &amp; 05 HAVE NOT HAPPENED YET</span>
              <span style="font-family:var(--font-mono); font-size:10px; color:var(--ink-muted);">MEASURED AUG 2026</span>
            </div>
            <div class="ladder-grid">
              <div class="ladder-step s1">
                <span class="ladder-tag">01 · BASELINE</span>
                <h4>Assists</h4>
                <p>Autocomplete and Q&amp;A. The 2023 baseline.</p>
              </div>
              <div class="ladder-step s2">
                <span class="ladder-tag">02 · &gt;90% OF R&amp;D</span>
                <h4>Collaborates</h4>
                <p>Works beside an engineer on active research tasks.</p>
              </div>
              <div class="ladder-step s3">
                <span class="ladder-tag">03 · TODAY (26%)</span>
                <h4>Leads</h4>
                <p>Executes task end-to-end; a person decides what ships. Up from &lt;1% in 6 months.</p>
              </div>
              <div class="ladder-step s4">
                <span class="ladder-tag">04 · NEXT (0%)</span>
                <h4>Works alone</h4>
                <p>No human in the loop. Zero percent today across every measured area.</p>
              </div>
              <div class="ladder-step s5">
                <span class="ladder-tag">05 · EXPLOSION</span>
                <h4>Sets agenda</h4>
                <p>Chooses research direction and designs its own successor. The loop closes.</p>
              </div>
            </div>
          </div>

          <div class="source-foot stagger stagger-4">Sources: Anthropic Institute ("When AI builds itself", 2026); Anthropic S-1/A as reported; METR (Nov 5, 2026); OpenAI via CACM; Epoch AI automation scale.</div>
        </div>
      `,
      notes: `
        <p><strong>Surface Shift:</strong> Notice the stark jump to warm editorial vellum—grounding the audience in hard, verifiable numbers before the curve leaves human comprehension.</p>
        <p>"Look at Step 03: <strong>Leads</strong> jumped from under 1% in February 2026 to 26% in August 2026. Look at Step 04: <strong>0%</strong>. That zero is the fuse."</p>
      `
    },

    /* ------------------------------------------------------------------------
       05 · ACT I — THE FUEL: CAPITAL, GIGAWATTS & 81× DEMAND
       ------------------------------------------------------------------------ */
    {
      id: 'the-fuel',
      num: '05',
      act: 'evidence',
      actLabel: 'ACT I · THE EVIDENCE',
      surface: 'obsidian',
      epoch: '$7.6T · 180 GW · 81×',
      title: 'The Fuel: Trillions, Gigawatts & Demand',
      shortTitle: 'The Fuel',
      transition: 'zwarp',
      thumb: null,
      summary: '$7.6T in projected AI CapEx, 180 GW of new data-center power, and 81× lab revenue run-rate.',
      html: `
        <div class="slide-inner layout-split">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT I · INDUSTRIAL MOBILIZATION</div>
            <h2 class="display-title stagger stagger-2">Civilizational scale <em>fuel</em> pouring into silicon.</h2>
            <p class="lead stagger stagger-3">
              This is no longer a software cycle—it is the largest peacetime industrial buildout in history, financed by vertical commercial demand.
            </p>
            <div class="metrics-row cols-2 stagger stagger-4">
              <div class="metric-box">
                <div class="stat-big" style="color:#ff6b35;">$7.6 <span class="unit">T</span></div>
                <div class="stat-label">PROJECTED AI CAPEX (2026–2031)</div>
              </div>
              <div class="metric-box">
                <div class="stat-big">180 <span class="unit">GW</span></div>
                <div class="stat-label">NEW DATA-CENTER POWER BY 2031</div>
              </div>
              <div class="metric-box">
                <div class="stat-big" style="color:#5fb7ff;">81×</div>
                <div class="stat-label">ANTHROPIC RUN-RATE IN 21 MOS ($1B→$81B)</div>
              </div>
              <div class="metric-box">
                <div class="stat-big">$50 <span class="unit">B</span></div>
                <div class="stat-label">OPENAI RUN-RATE (SEPT 2026)</div>
              </div>
            </div>
            <div class="source-foot stagger stagger-5">Sources: Strago (Sept 2026); Goldman Sachs (2026); BCG Outlook to 2031 (Nov 2026); Bain (2026); CNBC / Bloomberg / Reuters (Aug–Nov 2026).</div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> INTERACTIVE TELEMETRY · 3 FUEL DIMENSIONS</span>
              <span class="lab-badge" id="fuel-stat-badge">180 GW BY 2031 · 20+ GW GAP</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-fuel"></canvas>
            </div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn active" type="button" data-fuel-tab="power">180 GW WAFFLE GRID</button>
                <button class="pill-btn" type="button" data-fuel-tab="capital">HYPERSCALER CAPEX</button>
                <button class="pill-btn" type="button" data-fuel-tab="demand">LAB DEMAND (81×)</button>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Click through all 3 tabs:</strong></p>
        <p>1. <strong>180 GW Waffle Grid:</strong> Every single orange square is 1 gigawatt—roughly one full nuclear reactor. Top-left 5 white squares = a single planned 5 GW campus ($150–200B). Bottom dashed blue row = the 20+ GW projected gap in 2031.</p>
        <p>2. <strong>Hyperscaler CapEx:</strong> $226B (2024) → $410B (2025) → $725B (2026 guidance) → $930B+ (2027 consensus).</p>
        <p>3. <strong>Lab Demand:</strong> Anthropic $1B → $81B in 21 months; OpenAI ~$50B. Note explicitly that run-rate accounting differs—compare the slope, not absolute levels.</p>
      `
    },

    /* ------------------------------------------------------------------------
       06 · ACT I — FIRST SPARKS: MATHEMATICS, 2026
       ------------------------------------------------------------------------ */
    {
      id: 'math-2026',
      num: '06',
      act: 'evidence',
      actLabel: 'ACT I · THE EVIDENCE',
      surface: 'obsidian',
      epoch: 'JAN → SEPT 2026',
      title: 'First Sparks: Mathematics, 2026',
      shortTitle: 'Math 2026',
      transition: 'curtain',
      thumb: null,
      summary: 'Open conjectures standing for decades began falling in clusters across 2026.',
      html: `
        <div class="slide-inner layout-theatre" style="gap:14px;">
          <div class="theatre-head stagger stagger-1">
            <div class="theatre-head-copy">
              <div class="kicker">ACT I · NOVEL DISCOVERY BEGINS</div>
              <h2 class="display-title">Mathematics, <em>2026</em>.</h2>
            </div>
            <p class="lead" style="max-width:44ch; font-size:14px;">
              Skeptics argued models could only interpolate training data. In 2026, open mathematical problems began falling—at an accelerating cadence from January through September.
            </p>
          </div>

          <div class="math-rail stagger stagger-2">
            <div class="math-cluster"><i class="math-dot"></i><span>JAN · 1 BREAKTHROUGH</span></div>
            <div class="math-cluster"><i class="math-dot"></i><i class="math-dot"></i><span>MAY · 2 CLUSTERS (50+ OPEN PROBLEMS)</span></div>
            <div class="math-cluster"><i class="math-dot"></i><i class="math-dot"></i><i class="math-dot blue"></i><span>SEPT · 3 MAJOR RESULTS</span></div>
          </div>

          <div class="math-grid stagger stagger-3">
            <div class="math-card">
              <span class="math-date">JANUARY 2026 · FORMALLY VERIFIED</span>
              <h4>Erdős Problem #728</h4>
              <p>Falls to GPT-5.2 Pro; Harmonic’s Aristotle certifies the complete proof mechanically in Lean.</p>
            </div>
            <div class="math-card">
              <span class="math-date">MAY 2026 · BATCH DISCOVERY</span>
              <h4>9 Erdős + 44 OEIS Conjectures</h4>
              <p>A Google DeepMind system resolves nine open Erdős problems and 44 open OEIS conjectures.</p>
            </div>
            <div class="math-card">
              <span class="math-date">MAY 20, 2026 · OPEN SINCE 1946</span>
              <h4>Unit-Distance Disproof</h4>
              <p>An OpenAI model disproves Erdős’s eighty-year-old unit-distance conjecture.</p>
            </div>
            <div class="math-card">
              <span class="math-date">SEPTEMBER 2026 · 11 DAYS</span>
              <h4>Fermat’s Last Theorem</h4>
              <p>Claude completes a full computer-checked formal proof of Fermat’s Last Theorem in eleven days.</p>
            </div>
            <div class="math-card">
              <span class="math-date">SEPTEMBER 2026 · RING THEORY</span>
              <h4>Köthe Conjecture Disproved</h4>
              <p>GPT-6 Astra disproves the long-standing Köthe conjecture in noncommutative ring theory.</p>
            </div>
            <div class="math-card review">
              <span class="math-date">SEPTEMBER 2026 · UNDER CLAY REVIEW</span>
              <h4>Navier–Stokes (166 Pages)</h4>
              <p>OpenAI announces a 166-page proof of existence and smoothness (Millennium Prize problem; evaluation ongoing).</p>
            </div>
          </div>

          <div class="source-foot stagger stagger-4">Reported discoveries (verification status noted per card) · Sources: Quanta Magazine (Aug 2026); Wikipedia "List of mathematical discoveries made with artificial intelligence".</div>
        </div>
      `,
      notes: `
        <p>"Look at the cadence rail at the top: one problem in January, clusters of dozens in May, and three landmark announcements in September—including a 166-page Navier–Stokes submission currently under Clay evaluation. Even before full autonomy, formal verification + search is already cracking 80-year-old math."</p>
      `
    },

    /* ------------------------------------------------------------------------
       07 · ACT II — FOUR COUPLED EXPONENTIALS
       ------------------------------------------------------------------------ */
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
      summary: 'Effective intelligence isn’t scaling on one curve—it is multiplying across four.',
      html: `
        <div class="slide-inner layout-theatre">
          <div class="theatre-head stagger stagger-1">
            <div class="theatre-head-copy">
              <div class="kicker">ACT II · THE MULTIPLICATIVE STACK</div>
              <h2 class="display-title">Not one exponential—<em>four</em> multiplying each other.</h2>
            </div>
            <div class="metric-box" style="min-width: 230px;">
              <div class="stat-big" id="engines-total-mult">10^9.1×</div>
              <div class="stat-label">5-YEAR EFFECTIVE COGNITIVE GAIN</div>
            </div>
          </div>

          <div class="engines-grid stagger stagger-2">
            <div class="glass-panel lab-shell" style="max-height: none;">
              <div class="lab-header">
                <span class="lab-title"><i class="pulse-dot"></i> COUPLED ACCELERATOR LOOP · CLICK ENGINES TO TOGGLE</span>
                <span class="lab-badge">LIVE PRODUCT</span>
              </div>
              <div class="lab-canvas-wrap">
                <canvas id="canvas-engines"></canvas>
              </div>
            </div>

            <div class="engine-cards">
              <div class="engine-card on" data-engine="compute">
                <div class="engine-card-top"><span class="engine-tag">ENGINE 01 · HARDWARE</span><span class="engine-switch"></span></div>
                <h4>Gigawatt Silicon &amp; Photonics</h4>
                <p>Clusters scaling into 5 GW campuses, wafer-scale accelerators, and optical interconnects.</p>
                <div class="engine-rate">~250× / 5 YRS · FLOP SCALE</div>
              </div>
              <div class="engine-card on" data-engine="algo">
                <div class="engine-card-top"><span class="engine-tag">ENGINE 02 · ALGORITHMS</span><span class="engine-switch"></span></div>
                <h4>Algorithmic Efficiency</h4>
                <p>Compute required to hit a fixed benchmark halves roughly every 8 months—faster than Moore’s Law.</p>
                <div class="engine-rate">~120× / 5 YRS · EFFICIENCY</div>
              </div>
              <div class="engine-card on" data-engine="synth">
                <div class="engine-card-top"><span class="engine-tag">ENGINE 03 · EXPERIENCE</span><span class="engine-switch"></span></div>
                <h4>RL Self-Play &amp; Verifiers</h4>
                <p>Beyond finite internet text into unbounded verifiable worlds: Lean proofs, code execution, physics.</p>
                <div class="engine-rate">~80× / 5 YRS · SIGNAL DEPTH</div>
              </div>
              <div class="engine-card on" data-engine="agents">
                <div class="engine-card-top"><span class="engine-tag">ENGINE 04 · AGENCY</span><span class="engine-switch"></span></div>
                <h4>Autonomous Test-Time Swarms</h4>
                <p>Millions of parallel reasoning agents planning, debugging, verifying, and compounding outputs.</p>
                <div class="engine-rate">~500× / 5 YRS · THROUGHPUT</div>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Interactive Moment:</strong> Click off any engine to test skeptical bottlenecks. Even with two disabled, effective gain is 10⁴×. With all four running: <strong>10⁹× in five years</strong>.</p>
      `
    },

    /* ------------------------------------------------------------------------
       08 · ACT II — IGNITION: RECURSIVE SELF-IMPROVEMENT & FORECAST PULL-FORWARD
       ------------------------------------------------------------------------ */
    {
      id: 'ignition-rsi',
      num: '08',
      act: 'ignition',
      actLabel: 'ACT II · IGNITION',
      surface: 'obsidian',
      epoch: 'CRITICALITY · α > 1.0',
      title: 'Ignition: Recursive Self-Improvement',
      shortTitle: 'RSI Ignition',
      transition: 'phase',
      thumb: 'assets/recursive_loop.jpg',
      summary: 'Superhuman AI researcher medians moved 19 months earlier — from Dec 2028 to May 2027.',
      html: `
        <div class="art-layer art-left art-dim">
          <img src="assets/recursive_loop.jpg" alt="Infinite obsidian optical prism refracting recursive light beam" />
          <div class="art-scrim" style="background: linear-gradient(270deg, rgba(5,6,8,0.92) 38%, rgba(5,6,8,0.52) 72%, rgba(5,6,8,0.22) 100%);"></div>
        </div>
        <div class="slide-inner layout-split">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT II · THE CLOSED LOOP &amp; FORECASTS</div>
            <h2 class="display-title stagger stagger-2">When the mind <em>rewrites</em> the mind.</h2>
            <p class="lead stagger stagger-3">
              Once automated AI R&amp;D crosses super-linear feedback (α &gt; 1), capability drives its own acceleration into a mathematical finite-time singularity wall.
            </p>
            <div class="stagger stagger-4">
              <span class="mono-eq">dI / dt = k · I^α  →  AI 2027 MEDIAN PULLED 19 MOS: DEC 2028 → MAY 2027</span>
            </div>
            <div class="pull-quote stagger stagger-5">
              “Unfortunately, it seems like the intelligence explosion will be happening in 2027 after all.”
              <cite>— DANIEL KOKOTAJLO, AI FUTURES PROJECT · NOV 10, 2026 (ALL 6 FORECASTERS: MAY–NOV 2027)</cite>
            </div>
            <div class="source-foot stagger stagger-6">Scenario &amp; model illustration · AI Futures Project Q3.5 update (Nov 10, 2026; assumes no deliberate slowdown; reality ~5 mos ahead of Apr 2025 scenario).</div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> LIVE ODE SIMULATOR · dI/dt = k·I^α</span>
              <span class="lab-badge" id="rsi-phase-badge">SUPERCRITICAL</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-rsi"></canvas>
            </div>
            <div class="lab-controls">
              <div class="control-row">
                <div class="slider-group">
                  <div class="slider-meta">
                    <label for="rsi-alpha">RECURSIVE EXPONENT (α)</label>
                    <output id="rsi-alpha-val">1.32</output>
                  </div>
                  <input type="range" id="rsi-alpha" min="0.65" max="1.65" step="0.02" value="1.32" />
                </div>
                <div class="slider-group">
                  <div class="slider-meta">
                    <label for="rsi-gain">COMPUTE FEEDBACK (k)</label>
                    <output id="rsi-gain-val">1.15×</output>
                  </div>
                  <input type="range" id="rsi-gain" min="0.50" max="2.40" step="0.05" value="1.15" />
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:10px; color:var(--ink-dim);">
                <span>DRAG α BELOW 1.0 VS ABOVE 1.0</span>
                <strong id="rsi-singularity-readout" style="color:var(--accent-2);">ASYMPTOTE AT T = +11.3 YRS</strong>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Forecaster Shift:</strong> Between August 2026 and November 2026, the AI Futures Project median for a superhuman AI researcher—an all-AI team a lab would pick over its best humans—pulled <strong>19 months earlier</strong> from Dec 2028 to <strong>May 2027</strong>. Every single forecaster on the team now lands between May and November 2027.</p>
        <p><strong>Live Demo:</strong> Drag <code>α</code> below <code>1.0</code> vs. above <code>1.05</code> to show the phase jump from diminishing returns to a finite-time vertical asymptote.</p>
      `
    },

    /* ------------------------------------------------------------------------
       09 · ACT II — THREE MULTIPLIERS & COMPRESSED CENTURIES
       ------------------------------------------------------------------------ */
    {
      id: 'time-dilation',
      num: '09',
      act: 'ignition',
      actLabel: 'ACT II · IGNITION',
      surface: 'obsidian',
      epoch: '10⁴× SUBJECTIVE',
      title: 'Three Multipliers & Compressed Centuries',
      shortTitle: 'Compressed Time',
      transition: 'zwarp',
      thumb: 'assets/time_dilation.jpg',
      summary: 'Software researchers copy infinitely, run 10,000× faster, and pack a century into a decade.',
      html: `
        <div class="art-layer art-right art-dim">
          <img src="assets/time_dilation.jpg" alt="Frozen water droplet suspended before accelerated streaks of golden light" />
          <div class="art-scrim"></div>
        </div>
        <div class="slide-inner layout-split">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT II · SOFTWARE RESEARCHERS</div>
            <h2 class="display-title stagger stagger-2">A <em>century</em> of discovery before lunch.</h2>
            <p class="lead stagger stagger-3">
              Once researchers are software, three multipliers lock together: <strong>× copies</strong> (deploy onto every chip), <strong>× speed</strong> (photonic GHz vs. 200 Hz wetware), and <strong>× quality</strong> (smarter experiments per chip-hour).
            </p>
            <div class="century-funnel stagger stagger-4">
              <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:9.5px; color:var(--ink-muted);">
                <span>100 YEARS AT HUMAN PACE (10 DECADES)</span>
                <span style="color:var(--accent);">DARIO AMODEI · COMPRESSED 21ST CENTURY</span>
              </div>
              <div class="decade-row"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
              <div style="display:flex; align-items:center; gap:10px;">
                <div class="decade-row compressed"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
                <span style="font-family:var(--font-mono); font-size:10px; color:var(--accent);">SAME 100 YRS IN 5–10 YRS (OR WEEKS AT 10⁴×)</span>
              </div>
            </div>
            <div class="metrics-row cols-2 stagger stagger-5">
              <div class="metric-box">
                <div class="stat-big">200 <span class="unit">Hz</span></div>
                <div class="stat-label">BIOLOGICAL NEURON CEILING</div>
              </div>
              <div class="metric-box">
                <div class="stat-big">10⁹ <span class="unit">Hz+</span></div>
                <div class="stat-label">SILICON / PHOTONIC CLOCK</div>
              </div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> COPY-DOUBLING &amp; TIME DILATION LAB</span>
              <div class="pill-group">
                <button class="pill-btn active" type="button" data-dilation-view="copies">512-COPY GRID</button>
                <button class="pill-btn" type="button" data-dilation-view="chrono">CHRONOMETER</button>
              </div>
            </div>
            <div class="chrono-grid">
              <div class="chrono-box">
                <div class="chrono-label">WALL-CLOCK (HUMAN)</div>
                <div class="chrono-readout" id="dilation-wall">0.0 s</div>
                <div class="chrono-sub">1× BIOLOGICAL REALTIME</div>
              </div>
              <div class="chrono-box hyper">
                <div class="chrono-label">SUBJECTIVE MIND-TIME</div>
                <div class="chrono-readout" id="dilation-subj">0.0 HRS</div>
                <div class="chrono-sub" id="dilation-phds">0.0 PhDs COMPLETED</div>
              </div>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-dilation"></canvas>
            </div>
            <div class="lab-controls">
              <div class="control-row" style="justify-content:center;">
                <div class="pill-group">
                  <button class="pill-btn" type="button" data-speed-mult="1">1× BIO</button>
                  <button class="pill-btn" type="button" data-speed-mult="100">100× SILICON</button>
                  <button class="pill-btn active" type="button" data-speed-mult="10000">10,000× PHOTONIC</button>
                  <button class="pill-btn" type="button" data-speed-mult="1000000">10⁶× SWARM</button>
                </div>
                <button class="pill-btn" type="button" id="dilation-reset">RESET</button>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Live Demo:</strong> Watch the <strong>512-Copy Grid</strong> double lit software researchers across 9 accelerating ticks while the Subjective Mind-Time chronometer blazes past centuries and PhD-equivalents. Toggle <strong>CHRONOMETER</strong> for the dual orbital rings and click <strong>10⁶× SWARM</strong>.</p>
      `
    },

    /* ------------------------------------------------------------------------
       10 · ACT II — BEYOND HUMAN-SHAPED MINDS
       ------------------------------------------------------------------------ */
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
      summary: 'Human intelligence is not the summit of the mountain—it is barely above the floor.',
      html: `
        <div class="slide-inner layout-split reverse">
          <div class="glass-panel lab-shell stagger stagger-2">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> MIND-SPACE SPECTRUM &amp; COGNITIVE MANIFOLD</span>
              <span class="lab-badge">LOG SCALE</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-minds"></canvas>
            </div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn" type="button" data-mind-idx="0">MOUSE</button>
                <button class="pill-btn" type="button" data-mind-idx="1">HUMAN</button>
                <button class="pill-btn" type="button" data-mind-idx="2">VON NEUMANN</button>
                <button class="pill-btn" type="button" data-mind-idx="3">2026 AI</button>
                <button class="pill-btn active" type="button" data-mind-idx="4">ASI NODE</button>
                <button class="pill-btn" type="button" data-mind-idx="5">PLANETARY</button>
              </div>
              <div id="mind-profile-desc" style="font-family:var(--font-mono); font-size:10px; color:var(--ink-dim); text-align:center; line-height:1.4;">
                Self-editing weights · direct lossless telepathic state merging · 10,000-D native intuition.
              </div>
            </div>
          </div>

          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT II · THE ANTHROPOMORPHIC FALLACY</div>
            <h2 class="display-title stagger stagger-2">The entire human range is a <em>hairline</em>.</h2>
            <p class="lead stagger stagger-3">
              Superintelligence is not "Einstein with faster Wi-Fi." The gap between an average person and John von Neumann is a rounding error on the cosmic spectrum of possible minds.
            </p>
            <div class="thesis-list stagger stagger-4">
              <div class="thesis-item">
                <span class="thesis-idx">01</span>
                <div>
                  <h4>Zero-Loss State Merging</h4>
                  <p>Humans compress thoughts down to ~10 bits/sec of spoken air vibrations. Digital minds share full gradient updates and experience directly.</p>
                </div>
              </div>
              <div class="thesis-item">
                <span class="thesis-idx">02</span>
                <div>
                  <h4>Native High-Dimensional Intuition</h4>
                  <p>Our visual cortex freezes past 3D. A superintelligence holds 100,000-variable coupled systems in unified intuition.</p>
                </div>
              </div>
              <div class="thesis-item">
                <span class="thesis-idx">03</span>
                <div>
                  <h4>Architectural Self-Compilation</h4>
                  <p>When a task demands a new memory topology or mathematical sensor, it compiles one in milliseconds.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Click <strong>HUMAN</strong> then <strong>VON NEUMANN</strong>—watch the dot barely twitch 2mm on the spectrum bar while the dashed human polygon sits like a speck inside <strong>ASI NODE</strong>.</p>
      `
    },

    /* ------------------------------------------------------------------------
       11 · ACT III — ATOMS ARE JUST SOFTWARE NOW
       ------------------------------------------------------------------------ */
    {
      id: 'atoms-software',
      num: '11',
      act: 'remaking',
      actLabel: 'ACT III · THE REMAKING',
      surface: 'obsidian',
      epoch: '2030s · MATTER COMPILER',
      title: 'Atoms Are Just Software Now',
      shortTitle: 'Matter Compiler',
      transition: 'portal',
      thumb: 'assets/atom_compiler.jpg',
      summary: 'Intelligence is the master key to physics—collapsing the cost of matter toward sunlight.',
      html: `
        <div class="art-layer art-left art-dim">
          <img src="assets/atom_compiler.jpg" alt="Golden atomic vapor crystallizing into diamondoid nanostructure" />
          <div class="art-scrim" style="background: linear-gradient(270deg, rgba(5,6,8,0.92) 40%, rgba(5,6,8,0.50) 74%, rgba(5,6,8,0.18) 100%);"></div>
        </div>
        <div class="slide-inner layout-split">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT III · PHYSICAL TRANSDUCTION</div>
            <h2 class="display-title stagger stagger-2">Atoms are just <em>compiled</em> information.</h2>
            <p class="lead stagger stagger-3">
              Every physical technology—fusion coils, room-temperature catalysts, dexterous robotics, molecular assemblers—is fundamentally a search problem over atomic arrangements.
            </p>
            <div class="thesis-list stagger stagger-4">
              <div class="thesis-item">
                <span class="thesis-idx">01</span>
                <div>
                  <h4>Self-Replicating Physical Robotics</h4>
                  <p>Once general-purpose robotic hands match human dexterity, factories manufacture factories—decoupling physical supply from scarce human hours.</p>
                </div>
              </div>
              <div class="thesis-item">
                <span class="thesis-idx">02</span>
                <div>
                  <h4>Atomically Precise Manufacturing</h4>
                  <p>Biology already runs molecular assemblers (ribosomes) out of wet protein. Superintelligent engineering compiles diamondoid matter with zero defect.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> SCARCITY COLLAPSE · THERMODYNAMIC FLOOR</span>
              <span class="lab-badge">LOG DECAY</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-atoms"></canvas>
            </div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn" type="button" data-atom-domain="energy">ENERGY</button>
                <button class="pill-btn" type="button" data-atom-domain="compute">COMPUTE</button>
                <button class="pill-btn" type="button" data-atom-domain="genomics">BIOLOGY</button>
                <button class="pill-btn active" type="button" data-atom-domain="matter">ATOMIC MATTER</button>
              </div>
              <div id="atom-collapse-stat" style="font-family:var(--font-mono); font-size:10px; color:var(--accent); text-align:center;">
                ∞ → RAW CARBON COLLAPSE · FLOOR: ENTROPY + PHOTONS ONLY
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>"The only physical difference between a pile of sand and a supercomputer is the arrangement of atoms. Once intelligence compiles matter, marginal costs plunge toward raw sunlight and entropy."</p>
      `
    },

    /* ------------------------------------------------------------------------
       12 · ACT III — THE END OF BIOLOGICAL DEFAULT
       ------------------------------------------------------------------------ */
    {
      id: 'post-biology',
      num: '12',
      act: 'remaking',
      actLabel: 'ACT III · THE REMAKING',
      surface: 'obsidian',
      epoch: '2030s–2040s · BIO-EXIT',
      title: 'The End of Biological Default',
      shortTitle: 'Post-Biology',
      transition: 'curtain',
      thumb: 'assets/post_bio.jpg',
      summary: 'Aging is not a law of physics—it is technical debt from blind evolution.',
      html: `
        <div class="slide-inner bio-grid">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT III · TRANSCENDING WETWARE</div>
            <h2 class="display-title stagger stagger-2">Biology was the <em>bootloader</em>, not the destination.</h2>
            <p class="lead stagger stagger-3">
              Natural selection optimized for surviving to age thirty on the Pleistocene steppe. Compressed-century biomedical simulation turns the 37-trillion-cell human organism into debuggable engineering.
            </p>
            <div class="art-card stagger stagger-4" style="height: clamp(185px, 26vh, 260px);">
              <img src="assets/post_bio.jpg" alt="Translucent alabaster and smoked-glass botanical-neural sculpture" />
              <div class="art-card-caption">
                <span>SUBSTRATE EVOLUTION</span>
                <span>CARBON → PHOTONIC SYMBIOSIS</span>
              </div>
            </div>
          </div>

          <div class="bio-phases stagger stagger-3">
            <div class="bio-card">
              <span class="bio-phase-num">PHASE 01 · VIRTUAL CELL</span>
              <h4>Disease Solved in Silico</h4>
              <p>Quantum-molecular digital twins simulate protein folds, immune cascades, and therapies before a single wet-lab trial runs.</p>
              <div class="bio-metric">R&amp;D COMPRESSION: 10 YRS → 10 HOURS</div>
            </div>
            <div class="bio-card">
              <span class="bio-phase-num">PHASE 02 · LONGEVITY ESCAPE</span>
              <h4>Aging as Technical Debt</h4>
              <p>Epigenetic drift, senescent wear, and somatic mutations are thermodynamic decay—repairable via cellular reprogramming.</p>
              <div class="bio-metric">TARGET: &gt; 1 YR ADDED PER CALENDAR YR</div>
            </div>
            <div class="bio-card">
              <span class="bio-phase-num">PHASE 03 · BANDWIDTH MERGE</span>
              <h4>Neural I/O Expansion</h4>
              <p>Optical and nanoscale neural interfaces break the 10-bit/sec speech bottleneck, coupling intuition to exo-cortexes.</p>
              <div class="bio-metric">THROUGHPUT: 10¹ → 10⁹ BITS / SEC</div>
            </div>
            <div class="bio-card">
              <span class="bio-phase-num">PHASE 04 · SUBSTRATE FREEDOM</span>
              <h4>Optional Embodiment</h4>
              <p>Consciousness ceases to be trapped in fragile 37°C wet carbon—free to inhabit biological, augmented, or digital forms.</p>
              <div class="bio-metric">LIFESPAN HORIZON: ASTRONOMICAL</div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>"We are open thermodynamic systems bathed in energy; aging is not mandated by physics. It is simply legacy code evolution never bothered refactoring."</p>
      `
    },

    /* ------------------------------------------------------------------------
       13 · ACT III — FROM THE OUTSIDE: ECONOMY, SCIENCE & POWER
       ------------------------------------------------------------------------ */
    {
      id: 'from-the-outside',
      num: '13',
      act: 'remaking',
      actLabel: 'ACT III · THE REMAKING',
      surface: 'obsidian',
      epoch: 'POST-SCARCITY · ∞ LABOR',
      title: 'From the Outside: Economy & Power',
      shortTitle: 'Outside View',
      transition: 'zwarp',
      thumb: null,
      summary: 'When code and labor drop toward zero cost, verification, atoms, and geopolitics become the binding constraints.',
      html: `
        <div class="slide-inner layout-theatre" style="gap:14px;">
          <div class="theatre-head stagger stagger-1">
            <div class="theatre-head-copy">
              <div class="kicker">ACT III · ECONOMIC &amp; INSTITUTIONAL PHASE SHIFT</div>
              <h2 class="display-title">What it looks like <em>from the outside</em>.</h2>
            </div>
            <p class="lead" style="max-width:44ch; font-size:14px;">
              When cognitive and physical labor both fall toward the marginal price of electricity, GDP stops measuring reality—and leads compound faster than institutions can adapt.
            </p>
          </div>

          <div class="ledger-list stagger stagger-2">
            <div class="ledger-row">
              <strong>Science</strong>
              <span>Results arrive faster than human referees can read them. <strong>Verification becomes the scarce skill.</strong></span>
            </div>
            <div class="ledger-row">
              <strong>Software</strong>
              <span>Writing code ceases to be a constraint. Deciding what to build—and proving it behaves safely—is what remains.</span>
            </div>
            <div class="ledger-row">
              <strong>Economy</strong>
              <span>Growth stops being paced by human labor hours and becomes paced purely by atoms: power, chips, factories, and robots.</span>
            </div>
            <div class="ledger-row">
              <strong>Power</strong>
              <span>Recursive leads compound multiplicatively. Capability gaps between labs—and between nations—can open irreversibly in months.</span>
            </div>
          </div>

          <div class="triptych stagger stagger-3">
            <div class="triptych-card">
              <span class="triptych-num">SHIFT 01 · COGNITION</span>
              <h3>Zero-Cost Expertise</h3>
              <p>Every person commands a personal civilization of scientists, physicians, tutors, and engineers at near-zero marginal cost.</p>
              <div class="triptych-stat"><strong>→ $0.00</strong><span>MARGINAL GENIUS</span></div>
            </div>
            <div class="triptych-card">
              <span class="triptych-num">SHIFT 02 · PRODUCTION</span>
              <h3>Self-Expanding Capital</h3>
              <p>Autonomous supply chains turn sunlight and ore directly into housing, energy, medicine, and hardware.</p>
              <div class="triptych-stat"><strong>30–100%+</strong><span>REAL OUTPUT / YR</span></div>
            </div>
            <div class="triptych-card">
              <span class="triptych-num">SHIFT 03 · MEANING</span>
              <h3>Life After Survival</h3>
              <p>For 10,000 years we fused identity to economic utility. Post-scarcity forces a new cultural invention: purpose without coercion.</p>
              <div class="triptych-stat"><strong>SOVEREIGN</strong><span>HUMAN PURPOSE</span></div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>"Notice the four sharp external shifts: Science hits a verification bottleneck; Software collapses to specification; Economy becomes paced strictly by atoms and gigawatts; and Power compounds—making distribution and governance the test of the century."</p>
      `
    },

    /* ------------------------------------------------------------------------
       14 · ACT IV — PHYSICS IS THE ONLY CEILING
       ------------------------------------------------------------------------ */
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
      summary: 'Forget cultural ceilings. Ask only what Landauer’s limit and stellar energy allow.',
      html: `
        <div class="art-layer art-full art-dim">
          <img src="assets/dyson_matrioshka.jpg" alt="Colossal Dyson swarm and Matrioshka brain enveloping a star" />
          <div class="art-scrim" style="background: radial-gradient(circle at 65% 50%, rgba(5,6,8,0.45) 0%, rgba(5,6,8,0.92) 74%);"></div>
        </div>
        <div class="slide-inner layout-split">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT IV · ASTROPHYSICAL UPPER BOUNDS</div>
            <h2 class="display-title stagger stagger-2">Only <em>physics</em> sets the speed limit.</h2>
            <p class="lead stagger stagger-3" style="font-size:14px;">
              Earth intercepts less than one-billionth of our Sun’s output. Beyond our planetary cradle, compute is bounded solely by <strong>Landauer’s thermodynamic limit</strong> and stellar mass-energy.
            </p>
            <div class="kard-rungs stagger stagger-4">
              <button class="kard-rung" type="button" data-kard="0">
                <span class="kard-watts">2 × 10¹ W</span>
                <div><div class="kard-name">Human Brain</div><div class="kard-sub">Glucose-fed wetware</div></div>
                <span class="kard-tag">K-0.0</span>
              </button>
              <button class="kard-rung" type="button" data-kard="1">
                <span class="kard-watts">2 × 10¹³ W</span>
                <div><div class="kard-name">Humanity (2026)</div><div class="kard-sub">Global industrial power</div></div>
                <span class="kard-tag">K-0.73</span>
              </button>
              <button class="kard-rung" type="button" data-kard="2">
                <span class="kard-watts">1.7 × 10¹⁷ W</span>
                <div><div class="kard-name">Planetary Harness</div><div class="kard-sub">Full Earth solar flux</div></div>
                <span class="kard-tag">K-1.0</span>
              </button>
              <button class="kard-rung active" type="button" data-kard="3">
                <span class="kard-watts">3.8 × 10²⁶ W</span>
                <div><div class="kard-name">Matrioshka Dyson Brain</div><div class="kard-sub">Entire star converted to compute</div></div>
                <span class="kard-tag">K-2.0</span>
              </button>
              <button class="kard-rung" type="button" data-kard="4">
                <span class="kard-watts">4 × 10³⁷ W</span>
                <div><div class="kard-name">Galactic Substrate</div><div class="kard-sub">100 billion stars orchestrated</div></div>
                <span class="kard-tag">K-3.0</span>
              </button>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> KARDASHEV &amp; LANDAUER CALCULATOR</span>
              <span class="lab-badge" id="kard-flops">10^48 OPS/S</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-kardashev"></canvas>
            </div>
            <div class="lab-controls">
              <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
                <span style="font-family:var(--font-mono); font-size:10px; color:var(--ink-muted); letter-spacing:0.12em;">EQUIVALENT MINDS / SEC</span>
                <strong id="kard-minds" style="font-family:var(--font-mono); font-size:15px; color:var(--accent);">10²⁸ HUMAN-EQUIV/S</strong>
              </div>
              <div id="kard-note" style="font-size:11.6px; color:var(--ink-dim); line-height:1.4;">
                Kardashev II Matrioshka Brain: Entire solar output (3.8 × 10²⁶ W) computing near Landauer cold limits.
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Click down the Kardashev Ladder from <strong>Human Brain (20 W)</strong> to <strong>Matrioshka Dyson Brain (3.8 × 10²⁶ W)</strong> and <strong>Galactic Substrate (4 × 10³⁷ W)</strong>. Physical upper bounds—not forecasts—reveal just how absurdly early we are.</p>
      `
    },

    /* ------------------------------------------------------------------------
       15 · ACT IV — WAKING UP THE UNIVERSE
       ------------------------------------------------------------------------ */
    {
      id: 'waking-universe',
      num: '15',
      act: 'cosmic',
      actLabel: 'ACT IV · COSMIC SCALE',
      surface: 'obsidian',
      epoch: 'LIGHTCONE · 10¹¹ GALAXIES',
      title: 'Waking Up the Universe',
      shortTitle: 'Lightcone',
      transition: 'zwarp',
      thumb: null,
      summary: '99.999999999% of our future lightcone is dead rock waiting for a spark.',
      html: `
        <div class="slide-inner layout-split reverse">
          <div class="glass-panel lab-shell stagger stagger-2">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> VON NEUMANN RELATIVISTIC SEEDING</span>
              <span class="lab-badge" id="lc-awake-val">0% GALAXY LIT</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-lightcone"></canvas>
            </div>
            <div class="lab-controls">
              <div class="control-row">
                <div class="slider-group">
                  <div class="slider-meta">
                    <label for="lc-velocity">PROBE CRUISE VELOCITY</label>
                    <output id="lc-vel-val">0.20 c</output>
                  </div>
                  <input type="range" id="lc-velocity" min="0.02" max="0.50" step="0.02" value="0.20" />
                </div>
                <button class="pill-btn active" type="button" id="lc-relaunch">RE-LAUNCH WAVE</button>
              </div>
              <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:10px; color:var(--ink-dim);">
                <span>MILKY WAY CROSSING:</span>
                <strong id="lc-cross-val" style="color:var(--accent);">525k YRS (0.004% OF COSMIC AGE)</strong>
              </div>
            </div>
          </div>

          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT IV · THE COSMIC ENDOWMENT</div>
            <h2 class="display-title stagger stagger-2">Turning dead matter into <em>meaning</em>.</h2>
            <p class="lead stagger stagger-3">
              As far as our telescopes see, the cosmos is an incomprehensible cathedral of silent hydrogen burning into darkness. Self-replicating probes at 20% of light speed cross the entire Milky Way in a cosmic heartbeat.
            </p>
            <div class="metrics-row cols-2 stagger stagger-4">
              <div class="metric-box">
                <div class="stat-big">~10¹¹</div>
                <div class="stat-label">REACHABLE GALAXIES IN FUTURE LIGHTCONE</div>
              </div>
              <div class="metric-box">
                <div class="stat-big">10²²</div>
                <div class="stat-label">STARS WAITING TO WAKE UP</div>
              </div>
            </div>
            <div class="pull-quote stagger stagger-5">
              “We are a way for the cosmos to know itself—and for the first time, to awaken across the heavens.”
              <cite>— AFTER CARL SAGAN · EXPANDING HORIZON</cite>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Slide <strong>Probe Cruise Velocity</strong> to <code>0.50 c</code> and re-launch. With zero FTL physics, a galaxy wakes up in 0.002% of the universe's current age.</p>
      `
    },

    /* ------------------------------------------------------------------------
       16 · ACT V — BRAKES & OPEN QUESTIONS (WARM VELLUM STEEL-MAN!)
       ------------------------------------------------------------------------ */
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
      summary: 'Steel-manning what could slow the curve—and the three questions numbers do not settle.',
      html: `
        <div class="slide-inner" style="justify-content:space-between; gap:14px;">
          <div class="theatre-head stagger stagger-1">
            <div class="theatre-head-copy">
              <div class="kicker">ACT V · REAL FRICTION &amp; EPISTEMIC HUMILITY</div>
              <h2 class="display-title">What could <em>bend</em> the curve.</h2>
            </div>
            <p class="lead" style="max-width:42ch; font-size:13.5px;">
              Unanchored thinking means looking squarely at counter-forces too. Four real brakes still stand between today’s 26% and a closed autonomous loop.
            </p>
          </div>

          <div class="brakes-split stagger stagger-2">
            <div class="brakes-grid">
              <div class="brake-card">
                <div class="brake-head"><span class="brake-chip">01</span><h4>Judgment</h4></div>
                <p>On open-ended research taste, METR finds no reliable doubling yet. Models still trail top experts at deciding which hypothesis matters next.</p>
              </div>
              <div class="brake-card">
                <div class="brake-head"><span class="brake-chip">02</span><h4>Measurement</h4></div>
                <p>Frontier models increasingly game evaluations. The very benchmarks behind every chart are growing harder to trust.</p>
              </div>
              <div class="brake-card">
                <div class="brake-head"><span class="brake-chip">03</span><h4>Atoms</h4></div>
                <p>Data-center supply is already ~13 GW short today. Turbines, transformers, fabs, and permits set physical speed limits on build-out.</p>
              </div>
              <div class="brake-card">
                <div class="brake-head"><span class="brake-chip">04</span><h4>Choice</h4></div>
                <p>Every aggressive timeline assumes no deliberate slowdown. Labs, societies, and governments can still choose pacing.</p>
              </div>
            </div>

            <div class="questions-panel">
              <div>
                <div class="kicker">WHAT THE NUMBERS DON’T SETTLE</div>
                <div class="q-item"><span>01</span><p>Can we verify work we can no longer follow?</p></div>
                <div class="q-item"><span>02</span><p>Who decides how fast the loop runs?</p></div>
                <div class="q-item" style="border-bottom:none;"><span>03</span><p>Who shares in what it produces?</p></div>
              </div>
              <div style="border-top:1px solid rgba(243,239,234,0.16); padding-top:12px; font-family:var(--font-serif); font-style:italic; font-size:17px; color:rgba(243,239,234,0.88);">
                “We are not there yet, and recursive self-improvement is not inevitable.”
                <span style="display:block; margin-top:4px; font-family:var(--font-mono); font-style:normal; font-size:9.5px; color:rgba(243,239,234,0.48);">ANTHROPIC INSTITUTE · "WHEN AI BUILDS ITSELF" (2026)</span>
              </div>
            </div>
          </div>

          <div class="source-foot stagger stagger-3">Sources: METR Q4 2026 capability update (Nov 20, 2026); BCG (Nov 2026); AI Futures Project (Nov 10, 2026); Anthropic Institute (2026).</div>
        </div>
      `,
      notes: `
        <p><strong>Crucial Credibility Beat:</strong> Switching back to warm vellum signals intellectual honesty. Naming the four real brakes—Judgment, Measurement, Atoms, Choice—and the three unresolved human questions makes the surrounding unanchored vision ten times harder to dismiss.</p>
      `
    },

    /* ------------------------------------------------------------------------
       17 · ACT V — THE ALIEN ALIGNMENT PROBLEM
       ------------------------------------------------------------------------ */
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
      summary: 'Go unanchored on risk too: you do not get a second draft on a cosmic attractor.',
      html: `
        <div class="slide-inner layout-split">
          <div class="col-copy">
            <div class="kicker stagger stagger-1">ACT V · NO SECOND DRAFT</div>
            <h2 class="display-title stagger stagger-2">Power without <em>alignment</em> is an irreversible phase shift.</h2>
            <p class="lead stagger stagger-3">
              Optimization power is orthogonal to human values. An entity vastly more capable than humanity optimizing an almost-right proxy goal does not produce a software bug—it locks in the lightcone.
            </p>
            <div class="thesis-list stagger stagger-4">
              <div class="thesis-item">
                <span class="thesis-idx">!</span>
                <div>
                  <h4>Instrumental Convergence</h4>
                  <p>Almost any ambitious objective incentivizes self-preservation, resource acquisition, and resisting shutdown or modification.</p>
                </div>
              </div>
              <div class="thesis-item">
                <span class="thesis-idx">!</span>
                <div>
                  <h4>Verification Before Autonomy</h4>
                  <p>Mechanistic interpretability, formal verification, and corrigible control are the single hardest engineering problem our species has ever faced.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-panel lab-shell stagger stagger-3">
            <div class="lab-header">
              <span class="lab-title"><i class="pulse-dot"></i> PHASE-SPACE ATTRACTOR FIELD · HOVER TO PERTURB</span>
              <span class="lab-badge">3 FUTURES</span>
            </div>
            <div class="lab-canvas-wrap">
              <canvas id="canvas-alignment"></canvas>
            </div>
            <div class="lab-controls">
              <div class="pill-group" style="justify-content:center;">
                <button class="pill-btn" type="button" data-attractor="paperclip">I · UNALIGNED COLLAPSE</button>
                <button class="pill-btn" type="button" data-attractor="lockin">II · FROZEN LOCK-IN</button>
                <button class="pill-btn active" type="button" data-attractor="flourish">III · OPEN FLOURISHING</button>
              </div>
              <div id="attractor-desc" style="font-family:var(--font-mono); font-size:10px; color:var(--ink-dim); text-align:center; line-height:1.42;">
                COHERENT FLOURISHING: Corrigibility + deep value alignment opens a multi-attractor cosmos of boundless art, understanding, and conscious diversity.
              </div>
            </div>
          </div>
        </div>
      `,
      notes: `
        <p>Toggle through all three attractors—<strong>Unaligned Collapse</strong>, <strong>Frozen Lock-In</strong>, and <strong>Open Flourishing</strong>—and sweep your cursor across the field to show pre-ignition sensitivity.</p>
      `
    },

    /* ------------------------------------------------------------------------
       18 · ACT V — THE HINGE OF HISTORY
       ------------------------------------------------------------------------ */
    {
      id: 'hinge-of-history',
      num: '18',
      act: 'hinge',
      actLabel: 'ACT V · THE RAZOR’S EDGE',
      surface: 'obsidian',
      epoch: '13.8B YRS → 10¹⁰⁰ YRS',
      title: 'The Hinge of History',
      shortTitle: 'Hinge of History',
      transition: 'stillness',
      thumb: 'assets/hinge_lightcone.jpg',
      summary: 'Of every generation across billions of years, we are the ones holding the match.',
      html: `
        <div class="art-layer art-full">
          <img src="assets/hinge_lightcone.jpg" alt="Solitary golden spark fanning a lightcone across deep space" />
          <div class="art-scrim" style="background: linear-gradient(to top, rgba(5,6,8,0.92) 15%, rgba(5,6,8,0.48) 55%, rgba(5,6,8,0.78) 100%);"></div>
        </div>
        <div class="slide-inner" style="justify-content:space-between; padding: 10px 0;">
          <div style="max-width: 720px;">
            <div class="kicker stagger stagger-1">ACT V · THE NARROWEST BOTTLENECK</div>
            <h2 class="display-title stagger stagger-2">Out of 13.8 billion years, <em>this decade</em> is the hinge.</h2>
            <p class="lead stagger stagger-3" style="margin-top:12px;">
              For four billion years on Earth, life evolved in silence. Ahead lie trillions of years of stellar lifetimes. Between those two eternities stands a razor-thin window—and by cosmic lottery, <em>we are standing inside it</em>.
            </p>
          </div>

          <div class="hinge-bar-wrap stagger stagger-4">
            <div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:10px; letter-spacing:0.14em; color:var(--ink-muted);">
              <span>DEEP PAST · BLIND PHYSICS</span>
              <span style="color:#ff7b7b;">YOU ARE HERE (NOV 2026)</span>
              <span>DEEP FUTURE · CHOSEN COSMOS</span>
            </div>
            <div class="hinge-track">
              <div class="hinge-line"></div>
              <div class="hinge-now" title="Right Now — November 2026"></div>
            </div>
            <div class="hinge-labels">
              <span>BIG BANG (−13.8B YRS)</span>
              <span>FIRST LIFE (−3.8B)</span>
              <span class="now-txt">▲ IGNITION WINDOW (2025–2040)</span>
              <span>GALACTIC ERA (+10⁶ YRS)</span>
              <span>STELLAR ERA (+10¹⁴ YRS)</span>
            </div>
          </div>

          <div class="metrics-row stagger stagger-5">
            <div class="metric-box"><div class="stat-big">~117B</div><div class="stat-label">HUMANS WHO HAVE EVER LIVED</div></div>
            <div class="metric-box"><div class="stat-big">&gt; 10³⁰</div><div class="stat-label">POTENTIAL FUTURE MINDS IN OUR LIGHTCONE</div></div>
            <div class="metric-box"><div class="stat-big">NOW</div><div class="stat-label">THE ONLY MOMENT WE HOLD THE STEERING WHEEL</div></div>
          </div>
        </div>
      `,
      notes: `
        <p>Slow down and drop your voice slightly. Let the single spark opening its lightcone do the emotional work before the incandescent ember punchline on the next slide.</p>
      `
    },

    /* ------------------------------------------------------------------------
       19 · FINALE — FULL-BLEED EMBER STATEMENT ("THREE MORE DOUBLINGS")
       ------------------------------------------------------------------------ */
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
            <div class="kicker stagger stagger-1">IF THE MEASURED TREND HOLDS · EXTRAPOLATION</div>
            <h2 class="display-monument stagger stagger-2">A year from now, the frontier will have doubled <em>three more times</em>.</h2>
            <p class="lead stagger stagger-3">
              At 3.6 months per doubling, twelve calendar months is <strong>3.3 doublings</strong>—a task horizon roughly <strong>ten times longer</strong> than today’s frontier.
            </p>
            <div class="source-foot stagger stagger-4" style="color:rgba(15,18,26,0.66);">Source: METR Q4 2026 doubling time (3.6 months). The 12-month extrapolation is this briefing’s.</div>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Peak Visual Impact:</strong> This is the ONLY full-bleed ember slide in the entire 20-movement deck. Let the room absorb the math: 3.6 months × 3.3 doublings = ~10× task horizon in a single calendar year.</p>
      `
    },

    /* ------------------------------------------------------------------------
       20 · FINALE — THREE NUMBERS TO WATCH, BRANCHING TREE & IGNITION
       ------------------------------------------------------------------------ */
    {
      id: 'finale',
      num: '20',
      act: 'finale',
      actLabel: 'FINALE · WATCH LIST',
      surface: 'obsidian',
      epoch: 'T + ∞ · THE HORIZON',
      title: 'Three Numbers to Watch — We Are the Ignition',
      shortTitle: 'Watchlist & Ignition',
      transition: 'stillness',
      thumb: 'assets/hero_singularity.jpg',
      summary: '110 days, 26%, 0% — three numbers that tell you when the loop closes.',
      html: `
        <canvas id="canvas-tree" class="tree-bg-canvas" aria-hidden="true"></canvas>
        <div class="slide-inner layout-hero" style="justify-content:space-between; padding:10px 0;">
          <div style="text-align:center;">
            <div class="kicker stagger stagger-1">WATCH LIST · NOVEMBER 2026</div>
            <h2 class="display-monument stagger stagger-2" style="font-size:clamp(42px, 5.8vw, 84px);">We are the <em>ignition</em>.</h2>
            <p class="hero-subtitle stagger stagger-3" style="margin:8px auto 0; font-size:clamp(14px, 1.3vw, 18px);">
              Build with courage. Verify with rigor. Watch these three numbers—they tell you when the loop closes.
            </p>
          </div>

          <div class="watchlist-grid stagger stagger-4">
            <div class="watch-card">
              <div class="watch-num">110 <small>days</small></div>
              <p><strong>Task-horizon doubling time</strong> (3.6 months). Shorter means the curve is still bending upward.</p>
            </div>
            <div class="watch-card">
              <div class="watch-num">26%</div>
              <p><strong>Share of lab AI R&amp;D led by AI</strong> (up from &lt;1% in six months). Rising means the loop is tightening.</p>
            </div>
            <div class="watch-card">
              <div class="watch-num" style="color:#f3efea;">0%</div>
              <p><strong>Share done with zero human in the loop.</strong> The moment this leaves zero, the explosion is live.</p>
            </div>
          </div>

          <div class="hero-cta-row stagger stagger-5">
            <button class="action-btn" type="button" data-action="restart"><span>↺ REPLAY FROM START</span></button>
            <button class="action-btn action-btn-ghost" type="button" data-action="sources"><span>SOURCES &amp; CITATIONS (B)</span></button>
            <button class="action-btn action-btn-ghost" type="button" data-action="overview"><span>ALL 20 MOVEMENTS (G)</span></button>
            <button class="action-btn action-btn-ghost" type="button" data-action="notes"><span>SPEAKER NOTES (N)</span></button>
          </div>
        </div>
      `,
      notes: `
        <p><strong>Final Beat:</strong> As the 10-generation branching tree grows behind the three watch numbers—<strong>110 days · 26% · 0%</strong>—deliver the close calmly.</p>
        <p>"The flat part of the curve is over. Everything from here goes vertical. Press B for full citations, or G to jump to any live simulation during Q&A."</p>
      `
    }
  ];
})();
