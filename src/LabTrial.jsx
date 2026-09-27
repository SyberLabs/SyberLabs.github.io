import React, { useState } from 'react';
import './lab.css';

const labCases = {
  RISE: { question: 'Should a reading session change pace?', input: 'Reader state + passage context', proposed: 'Suggest a slower pace' },
  Commons: { question: 'Should a mission draft advance?', input: 'Mission evidence + reviewer state', proposed: 'Advance the draft' },
  Relay: { question: 'Should an application draft advance?', input: 'Sources + revisions + owner state', proposed: 'Advance the draft' },
};

function evaluateTrial({ evidence, confidence, consent, approval }) {
  if (!consent) return { status: 'HOLD', reason: 'Consent is absent. The proposed action is blocked.', rule: '01 / consent = false', color: '#dfaa8f' };
  if (evidence < 75) return { status: 'MORE EVIDENCE', reason: 'The evidence score is below the illustrative 75% gate.', rule: `02 / evidence ${evidence}% < 75%`, color: '#e2bc82' };
  if (confidence < 70) return { status: 'HUMAN REVIEW', reason: 'The illustrative confidence is below the 70% review gate.', rule: `03 / confidence ${confidence}% < 70%`, color: '#b6a5e5' };
  if (!approval) return { status: 'AWAITING APPROVAL', reason: 'The checks pass. A person still has to approve the action.', rule: '04 / approval = pending', color: '#a6c5bd' };
  return { status: 'PERMITTED', reason: 'All illustrative gates pass, including explicit human approval.', rule: '05 / all gates pass', color: '#b9cf9d' };
}

export default function LabTrial() {
  const [scenario, setScenario] = useState('RISE');
  const [evidence, setEvidence] = useState(82);
  const [confidence, setConfidence] = useState(78);
  const [consent, setConsent] = useState(true);
  const [approval, setApproval] = useState(false);
  const [trials, setTrials] = useState([]);
  const result = evaluateTrial({ evidence, confidence, consent, approval });
  const runTrial = () => {
    const snapshot = { scenario, evidence, confidence, consent, approval, ...result };
    setTrials(previous => [{ id: (previous[0]?.id ?? 0) + 1, ...snapshot }, ...previous].slice(0, 4));
  };
  const loadTrial = trial => {
    setScenario(trial.scenario);
    setEvidence(trial.evidence);
    setConfidence(trial.confidence);
    setConsent(trial.consent);
    setApproval(trial.approval);
  };
  return <section className="system lab-trial" id="trial" aria-labelledby="trial-title"><div className="system-inner">
    <div className="system-heading"><div><p className="eyebrow">AN OPEN LAB INSTRUMENT</p><h2 id="trial-title">Change the state.<br /><em>See the rule.</em></h2></div><p>Try a decision boundary. Change its inputs, run a trial, and inspect the exact rule that shaped the result.</p></div>
    <div className="lab-notice"><span>LOCAL DEMONSTRATION / POLICY v0.1</span><p>These are user controlled, illustrative inputs. This instrument makes no model call and reports no product performance.</p></div>
    <div className="lab-console" style={{ '--trial-accent': result.color }}>
      <div className="lab-controls"><div className="lab-panel-heading"><span>01 / SET THE CONDITIONS</span><strong>{labCases[scenario].question}</strong></div>
        <div className="lab-scenarios" role="group" aria-label="Choose a product scenario">{Object.keys(labCases).map(name => <button type="button" className={scenario === name ? 'is-selected' : ''} aria-pressed={scenario === name} onClick={() => setScenario(name)} key={name}>{name}</button>)}</div>
        <label className="lab-range"><span>Evidence available <strong>{evidence}%</strong></span><input type="range" min="0" max="100" value={evidence} onChange={event => setEvidence(Number(event.target.value))} /></label>
        <label className="lab-range"><span>Illustrative confidence <strong>{confidence}%</strong></span><input type="range" min="0" max="100" value={confidence} onChange={event => setConfidence(Number(event.target.value))} /></label>
        <label className="lab-check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>Consent is present</span></label>
        <label className="lab-check"><input type="checkbox" checked={approval} onChange={event => setApproval(event.target.checked)} /><span>Human approval recorded</span></label>
        <button className="lab-run" type="button" onClick={runTrial}>Run trial <span aria-hidden="true">↗</span></button>
      </div>
      <div className="lab-observation"><div className="lab-panel-heading"><span>02 / OBSERVE THE PATH</span><strong>{labCases[scenario].proposed}</strong></div>
        <div className="lab-stage" aria-hidden="true"><div className="lab-stage-ring ring-one" /><div className="lab-stage-ring ring-two" /><div className="lab-stage-core"><span>INPUT</span><b>→</b><span>RULE</span><b>→</b><span>RESULT</span></div></div>
        <div className="lab-state"><span>INPUT</span><p>{labCases[scenario].input}</p><span>ACTIVE RULE</span><p>{result.rule}</p><span>PREVIEW OUTCOME</span><strong aria-live="polite">{result.status}</strong><p>{result.reason}</p></div>
      </div>
    </div>
    <div className="lab-record"><div><p className="eyebrow">03 / RECORDED TRIALS</p><p>Run the same state twice and you get the same result. Change one input to see which rule changes.</p></div><ol aria-live="polite">{trials.length ? trials.map(trial => <li key={trial.id}><span>#{String(trial.id).padStart(2, '0')} · {trial.scenario}</span><strong>{trial.status}</strong><small>E{trial.evidence} / C{trial.confidence} / CONSENT {trial.consent ? 'YES' : 'NO'} / APPROVAL {trial.approval ? 'YES' : 'NO'}</small><code>{trial.rule}</code><button type="button" onClick={() => loadTrial(trial)} aria-label={`Load inputs from trial ${trial.id}`}>Load inputs ↗</button></li>) : <li className="lab-empty">No trials recorded yet. Set the conditions and run one.</li>}</ol></div>
  </div></section>;
}

