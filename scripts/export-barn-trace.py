"""Export a recorded Barn run for the homepage system maps.

Runs Barn's own bootstrap demo, then the steps of its completion demo with the
same command ids (barn/src/barn/demo.py in sykosyber/bough-and-barn), against
the in-memory store. Three refusal probes are inserted where they apply.
Every refusal is the engine's own TransitionError or rejected decision. The
script checks that replaying the event ledger reproduces the materialized
state hash, then writes src/barn-trace.json.

Usage: python scripts/export-barn-trace.py path/to/bough-and-barn
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from pathlib import Path

repo = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(repo / "barn" / "src"))

from barn.audit import audit_run  # noqa: E402
from barn.causal import why_agent_exists  # noqa: E402
from barn.demo import bootstrap_demo  # noqa: E402
from barn.engine import BarnEngine, TransitionError  # noqa: E402
from barn.store import InMemoryGraphStore  # noqa: E402


async def main() -> dict:
    engine = BarnEngine(InMemoryGraphStore())
    boot = await bootstrap_demo(engine)
    run_id = boot["state"]["id"]
    state = await engine.store.get_run(run_id)
    chief = next(a for a in state.agents.values() if a.role == "Chief")
    specialist = next(a for a in state.agents.values() if a.role == "CRDT Specialist")
    work_id = specialist.spawned_because_work_id
    sync_id = next(w.id for w in state.work_items.values() if "sync" in w.required_capabilities)

    refusals = []
    after = len(await engine.store.list_events(run_id))

    async def probe(label, call):
        nonlocal after
        try:
            result = await call()
            reason = getattr(result, "reason", None)
            outcome = getattr(result, "outcome", None)
            refusals.append({"after": after, "label": label, "code": reason, "outcome": str(outcome) if outcome else None})
        except TransitionError as error:
            refusals.append({"after": after, "label": label, "code": str(error), "outcome": "refused"})
        after = len(await engine.store.list_events(run_id))

    await probe("Request a specialist whose capability no work requires", lambda: engine.request_specialist(
        run_id, requesting_agent_id=chief.id, work_id=sync_id, capability="crdt",
        role="CRDT Specialist", reason="probe", command_id="probe:capability"))
    await probe("Resolve the conflict work before any artifact exists", lambda: engine.resolve_work(
        run_id, actor_agent_id=specialist.id, work_id=work_id, command_id="probe:resolve-early"))

    artifact = await engine.submit_artifact(
        run_id, agent_id=specialist.id, work_id=work_id, kind="design",
        uri="memory://crdt-strategy.md", content_hash="demo-crdt-strategy-v1", command_id="demo:artifact-crdt")
    after = len(await engine.store.list_events(run_id))
    await probe("The specialist verifies its own artifact", lambda: engine.record_verification(
        run_id, verifier_agent_id=specialist.id, artifact_id=artifact.id, passed=True,
        evidence="self review", command_id="probe:self-verify"))

    # The remaining steps of complete_demo, unchanged.
    await engine.record_verification(
        run_id, verifier_agent_id=chief.id, artifact_id=artifact.id, passed=True,
        evidence="Independent chief review: strategy defines deterministic merge semantics.",
        command_id="demo:verify-crdt")
    await engine.resolve_work(run_id, actor_agent_id=specialist.id, work_id=work_id, command_id="demo:resolve-crdt")
    await engine.retire_agent(run_id, agent_id=specialist.id, command_id="demo:retire-crdt")

    final = await engine.store.get_run(run_id)
    report = await audit_run(engine.store, run_id)
    assert report.matches, report.replay_error or "Barn replay diverged"
    why = await why_agent_exists(engine.store, run_id, specialist.id)
    done = {
        "state": final.model_dump(mode="json"),
        "events": [e.model_dump(mode="json") for e in await engine.store.list_events(run_id)],
        "specialist_why": why.model_dump(mode="json"),
    }

    names = {a["id"]: a["role"] for a in done["state"]["agents"].values()}
    works = {w["id"]: w["title"] for w in done["state"]["work_items"].values()}
    events = []
    for e in done["events"]:
        payload = e["payload"]
        keep = {}
        for key in ("decision", "reason", "role", "passed", "evidence", "kind", "status", "title", "capability"):
            if key in payload:
                keep[key] = payload[key]
        if "decision" in keep:
            d = keep["decision"]
            keep["decision"] = {k: d.get(k) for k in ("outcome", "reason", "capability")}
        events.append({
            "seq": e["seq"],
            "type": e["type"],
            "command": e["command_id"],
            "actor": names.get(e["actor_agent_id"]),
            "work": works.get(e["work_id"]),
            "payload": keep,
        })
    commit = subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    return {
        "source": "sykosyber/bough-and-barn barn/src/barn/demo.py",
        "commit": commit,
        "goal": done["state"]["goal"],
        "maxActiveAgents": done["state"]["max_active_agents"],
        "agents": [{"role": a["role"], "status": a["status"], "capabilities": sorted(a["capabilities"])} for a in done["state"]["agents"].values()],
        "work": [{"title": w["title"], "status": w["status"], "requires": sorted(w["required_capabilities"])} for w in done["state"]["work_items"].values()],
        "events": events,
        "refusals": refusals,
        "why": [{"kind": step["kind"], "label": step["label"]} for step in done["specialist_why"]["steps"]],
        "stateHash": report.materialized_hash[:12],
        "replayHash": report.replayed_hash[:12],
    }


out = asyncio.run(main())
target = Path(__file__).resolve().parents[1] / "src" / "barn-trace.json"
target.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(out['events'])} events, {len(out['refusals'])} refusals, replay {out['replayHash']} -> {target}")
