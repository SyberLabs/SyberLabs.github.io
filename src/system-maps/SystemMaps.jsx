import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Stage from './Stage.jsx';
import relay from './systems/relay.jsx';
import omnios from './systems/omnios.jsx';
import rise from './systems/rise.jsx';
import barn from './systems/barn.jsx';
import osahr from './systems/osahr.jsx';
import runtime from './systems/runtime.jsx';
import './system-maps.css';

const systems = [relay, omnios, rise, barn, osahr, runtime];

const GRADES = {
  recorded: ['Recorded', 'Produced by running the repository’s code. The export script in scripts/ reproduces it.'],
  rule: ['Rule', 'Behavior reproduced from the cited source over an example; the values are illustrative.'],
  illustrative: ['Illustrative', 'A state the code permits, not produced by running it.'],
};

const OUTCOME = { refused: 'Refused', 'recorded-refusal': 'Rejected · recorded', flag: 'Flagged', stale: 'Changed' };

// Fold step effects up to the current index, so any step can be reached directly.
function fold(map, index) {
  const nodes = {}, edges = {}, subs = {};
  for (let i = 0; i <= index; i++) {
    const f = map.frames[i];
    Object.assign(nodes, f.set); Object.assign(edges, f.edges); Object.assign(subs, f.sub);
  }
  return { nodes, edges, subs };
}

function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query), on = () => setMatch(m.matches);
    on(); m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

function Grade({ grade }) {
  return <span className={`grade grade-${grade}`} title={GRADES[grade][1]}>{GRADES[grade][0]}</span>;
}

function Selection({ map, graph, selected, onClear }) {
  const isNode = selected.kind === 'node';
  const item = (isNode ? graph.nodes : graph.edges).find(x => x.id === selected.id);
  const name = id => graph.nodes.find(n => n.id === id)?.label || id;
  return <section className="inspect-selection" aria-label="Selected element">
    <div className="inspect-head"><span>{isNode ? 'NODE' : 'CONNECTION'} · {map.name.toUpperCase()}</span><button type="button" onClick={onClear} aria-label="Clear selection">Close</button></div>
    {!item ? <p>Not present at this step.</p> : isNode ? <>
      <h4>{item.label}</h4>
      <p>{item.about}</p>
      <dl><dt>Authority</dt><dd>{item.owner}</dd><dt>Source</dt><dd><code>{item.evidence}</code></dd></dl>
    </> : <>
      <h4>{name(item.from)} <i aria-hidden="true">→</i> {name(item.to)}</h4>
      <p><strong>{item.label}.</strong> {item.about}</p>
    </>}
  </section>;
}

export default function SystemMaps() {
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [announce, setAnnounce] = useState('');
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const narrow = useMedia('(max-width: 700px)');
  const sectionRef = useRef(null);
  const tabsRef = useRef([]);
  const touched = useRef(false);

  const map = systems[active];
  const frame = map.frames[index];
  const last = map.frames.length - 1;
  const pace = map.pace || 2900;
  const state = useMemo(() => fold(map, index), [map, index]);
  const graph = frame.graph || map;

  const go = useCallback((next, { manual = false } = {}) => {
    const target = Math.max(0, Math.min(last, next));
    setAnimate(!reduced && target === index + 1);
    setIndex(target);
    if (manual) {
      touched.current = true;
      const f = map.frames[target];
      setAnnounce(`Step ${target + 1} of ${last + 1}: ${f.title}. ${f.outcome}.`);
    }
  }, [index, last, map, reduced]);

  // Play through the recorded steps once, then stop.
  useEffect(() => {
    if (!playing) return undefined;
    if (index >= last) { setPlaying(false); return undefined; }
    const timer = window.setTimeout(() => go(index + 1), index === 0 && !animate ? 900 : pace);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, pace, go, animate]);

  // Start once when the section is first seen, unless motion is reduced or the visitor has already acted.
  useEffect(() => {
    if (reduced || !sectionRef.current || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !touched.current) { setPlaying(true); observer.disconnect(); }
    }, { threshold: .45 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);

  const choose = next => {
    touched.current = true;
    setActive(next); setIndex(0); setAnimate(false); setSelected(null);
    setAnnounce(`${systems[next].name}: ${systems[next].form}. Step 1 of ${systems[next].frames.length}.`);
  };

  const onTabKey = event => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = null;
    if (event.key in keys) next = (active + keys[event.key] + systems.length) % systems.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = systems.length - 1;
    if (next === null) return;
    event.preventDefault(); choose(next); tabsRef.current[next]?.focus();
  };

  const toggle = () => {
    touched.current = true;
    if (playing) { setPlaying(false); setAnnounce('Paused.'); return; }
    if (index >= last) { setAnimate(false); setIndex(0); }
    setPlaying(true);
  };

  const onExhibitKey = event => {
    if (event.target.closest('[role="tablist"], input')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); setPlaying(false); go(index + 1, { manual: true }); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); setPlaying(false); go(index - 1, { manual: true }); }
    if (event.key === 'Escape') setSelected(null);
  };

  const select = item => {
    touched.current = true;
    setPlaying(false);
    setSelected(current => current && current.kind === item.kind && current.id === item.id ? null : item);
  };

  const stepLabel = `${String(index + 1).padStart(2, '0')} / ${String(last + 1).padStart(2, '0')}`;

  return <section className="network-section maps-section" id="maps" aria-labelledby="maps-title" ref={sectionRef}>
    <div className="network-inner">
      <div className="network-heading">
        <p className="network-eyebrow">SYSTEM MAPS / DRAWN FROM THE REPOSITORIES</p>
        <h2 id="maps-title">Separate systems.<br /><em>Each one inspectable.</em></h2>
        <p>Each map uses the structure of its own system: a provenance graph, a context graph, a decision pipeline, an event ledger, a hypergraph, or a hash-chained log. Step through what happened, open any node, and see who or what was allowed to act.</p>
      </div>

      <div className="maps-exhibit" onKeyDown={onExhibitKey}>
        <div className="maps-tabs" role="tablist" aria-label="Systems">
          {systems.map((s, i) => <button type="button" role="tab" key={s.id} id={`map-tab-${s.id}`} aria-controls="map-panel" aria-selected={i === active} tabIndex={i === active ? 0 : -1}
            ref={el => { tabsRef.current[i] = el; }} className={i === active ? 'is-active' : ''} onClick={() => choose(i)} onKeyDown={onTabKey}>
            <span>{String(i + 1).padStart(2, '0')}</span><strong>{s.name}</strong><small>{s.form}</small>
          </button>)}
        </div>

        <div className="maps-panel" id="map-panel" role="tabpanel" aria-labelledby={`map-tab-${map.id}`}>
          <div className="maps-intro"><p>{map.summary}</p><Grade grade={map.grade} /></div>
          <div className="maps-body">
            <div className="maps-stage">
              <Stage map={map} graph={graph} state={state} frame={frame} index={index} animate={animate && !reduced} duration={Math.min(1500, pace * .55)}
                layout={narrow ? 'narrow' : 'wide'} selected={selected} onSelect={select}
                label={`${map.name} ${map.form.toLowerCase()}. Select a node or connection to inspect it.`} />
              <div className="maps-transport" aria-label="Step controls">
                <button type="button" onClick={() => { setPlaying(false); go(0, { manual: true }); }} disabled={index === 0} aria-label="First step"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3v10M13 3 6 8l7 5z" /></svg></button>
                <button type="button" onClick={() => { setPlaying(false); go(index - 1, { manual: true }); }} disabled={index === 0} aria-label="Previous step"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 3 4 8l7 5z" /></svg></button>
                <button type="button" className="maps-play" onClick={toggle} aria-label={playing ? 'Pause' : index >= last ? 'Replay from the first step' : 'Play'}>
                  {playing ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg> : <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5z" /></svg>}
                  <span>{playing ? 'Pause' : index >= last ? 'Replay' : 'Play'}</span>
                </button>
                <button type="button" onClick={() => { setPlaying(false); go(index + 1, { manual: true }); }} disabled={index >= last} aria-label="Next step"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 7 5-7 5z" /></svg></button>
                <label className="maps-scrub"><span className="visually-hidden">Step</span>
                  <input type="range" min="0" max={last} value={index} aria-valuetext={`Step ${index + 1} of ${last + 1}: ${frame.title}`}
                    onChange={e => { setPlaying(false); go(Number(e.target.value), { manual: true }); }} />
                </label>
                <span className="maps-count">{stepLabel}</span>
              </div>
            </div>

            <aside className="maps-inspector" aria-label="Inspector">
              {selected && <Selection map={map} graph={graph} selected={selected} onClear={() => setSelected(null)} />}
              <section className={`inspect-step is-${frame.kind || 'ok'}`}>
                <div className="inspect-head"><span>STEP {stepLabel}</span><Grade grade={frame.grade} /></div>
                <h3>{frame.title}</h3>
                <p className="inspect-outcome"><i aria-hidden="true" />{OUTCOME[frame.kind] ? `${OUTCOME[frame.kind]} · ` : ''}{frame.outcome}</p>
                <p>{frame.detail}</p>
                <dl><dt>Authority</dt><dd>{frame.authority}</dd><dt>Source</dt><dd><code>{frame.source}</code></dd></dl>
              </section>
              <p className="inspect-hint">Select a node or connection on the map to inspect it. Arrow keys step through; Escape clears.</p>
            </aside>
          </div>
          <div className="maps-readout" aria-label={`${map.name} state`}><map.Readout index={index} frames={map.frames} /></div>
          <p className="maps-evidence"><span>EVIDENCE</span>{map.evidence.join(' · ')}</p>
        </div>
        <p className="visually-hidden" aria-live="polite">{announce}</p>
      </div>

      <div className="maps-notes">
        <div>
          <span>HOW TO READ THE MAPS</span>
          <ul className="maps-legend">
            <li><i className="lg lg-record" />Record: authoritative state</li>
            <li><i className="lg lg-artifact" />Artifact, source, or proposal</li>
            <li><i className="lg lg-gate" />Check or decision in code</li>
            <li><i className="lg lg-human" />Person</li>
            <li><i className="lg lg-agent" />Agent or model</li>
            <li><i className="lg lg-external" />Dashed: no write authority</li>
            <li><i className="lg lg-refused" />Refused attempt; nothing written</li>
          </ul>
          <p>A moving token marks an edge the current step traversed. Nothing moves between steps.</p>
        </div>
        <div>
          <span>WHERE THEY MEET</span>
          <p>These systems do not share a runtime. Bough calls OSAHR’s schedulers to check its exact results. Two other meetings happen only in <a href="https://github.com/SyberLabs/cross-platform">cross-platform</a>, a separate test harness: it runs a Relay draft through SyberRuntime and passes Bough’s advice to Barn. Barn’s own plan makes that advice a suggestion, never an authorization.</p>
        </div>
        <div>
          <span>NOT MAPPED YET</span>
          <p><strong>Turtle</strong> evaluates authority policies (P0); it is not connected to SyberRuntime and was not run here. <strong>SyberWork</strong> is a separate contract runtime. The <strong>SyberLabs SDK</strong> has no public repository yet. OmniOS’s persistent lineage needs its optional ledger database.</p>
        </div>
      </div>
    </div>
  </section>;
}
