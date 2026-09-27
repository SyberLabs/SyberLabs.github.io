"""Export a recorded OSAHR event trace for the homepage system maps.

Runs examples/adaptive_signal.py from SyberLabs/OSAHR_Cell with its published
seed, checks that the recorded deltas replay to the same state hashes and that
a second run from the same seed reproduces them, then writes src/osahr-trace.json.

Usage: python scripts/export-osahr-trace.py path/to/OSAHR_Cell
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

cell = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(cell))
spec = importlib.util.spec_from_file_location("adaptive_signal", cell / "examples" / "adaptive_signal.py")
example = importlib.util.module_from_spec(spec)
spec.loader.exec_module(example)

from osahr import EntityCount, Expr, ExternalEvent, Runtime, ScheduledAdaptation, StateAssignment  # noqa: E402

SEED = 20260729


def run():
    model, receiver_id = example.build_model()
    runtime = Runtime(model, root_seed=SEED)
    runtime.register_observable(EntityCount("agents", "Agent"))
    initial = runtime.snapshot()
    runtime.inject(ExternalEvent(3.0, "environment", 1, "external-1", "receiver-input", {"responsiveness": 0.8}))
    runtime.schedule_adaptation(ScheduledAdaptation(
        6.0, 1, "slow-regeneration",
        (StateAssignment("parameters.regeneration_rate", Expr("p.regeneration_rate * 0.5")),),
    ))
    events = runtime.run_until_time(10.0)
    return model, initial, runtime, events, receiver_id


model, initial, runtime, events, receiver_id = run()
_, _, rerun, rerun_events, _ = run()
assert [e.post_state_hash for e in events] == [e.post_state_hash for e in rerun_events], "seeded re-run diverged"
# replay_deltas checks every recorded pre-state hash; the result must equal the last post-state.
replayed = Runtime.replay_deltas(model, initial, events)
assert replayed.state_hash == events[-1].post_state_hash, "delta replay diverged"


def edge(k, v) -> dict:
    return {
        "id": str(k),
        "from": str(v.tail[0].vertex_id),
        "to": str(v.head[0].vertex_id),
        "intensity": round(v.attributes["intensity"], 6),
    }


def rounded(values: dict) -> dict:
    return {k: round(v, 6) if isinstance(v, float) else v for k, v in values.items()}


trace = []
for e in events:
    d = e.graph_delta
    trace.append({
        "i": e.event_index,
        "kind": e.kind.value,
        "t": round(e.post_time, 6),
        "cause": {
            k: (v[:12] if k in ("rule_hash", "match_id") else round(v, 6) if isinstance(v, float) else v)
            for k, v in e.cause.items() if isinstance(v, (str, int, float, bool))
        },
        "draws": len(e.random_draws),
        "createdEdges": [edge(k, v) for k, v in d.created_edges.items()],
        "deletedEdges": [edge(k, v) for k, v in d.deleted_edges.items()],
        "vertexBefore": {str(k): rounded(v) for k, v in d.updated_vertices_before.items()},
        "vertexAfter": {str(k): rounded(v) for k, v in d.updated_vertices_after.items()},
        "paramsAfter": rounded(e.parameter_after),
        "memoryAfter": rounded(e.memory_after),
        "pre": e.pre_state_hash[:12],
        "post": e.post_state_hash[:12],
    })

fresh, _ = example.build_model()
graph = fresh.graph

commit = subprocess.run(["git", "-C", str(cell), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
out = {
    "source": "SyberLabs/OSAHR_Cell examples/adaptive_signal.py",
    "commit": commit,
    "seed": SEED,
    "horizon": 10.0,
    "receiver": str(receiver_id),
    "vertices": {str(k): rounded(v.attributes) for k, v in graph.vertices.items()},
    "edges": [edge(k, v) for k, v in graph.edges.items()],
    "initialParams": rounded(fresh.parameters),
    "initialMemory": rounded(fresh.memory),
    "initialHash": events[0].pre_state_hash[:12],
    "lastEventHash": events[-1].post_state_hash[:12],
    "horizonHash": runtime.state_hash[:12],
    "replayVerified": True,
    "events": trace,
}
target = Path(__file__).resolve().parents[1] / "src" / "osahr-trace.json"
target.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(trace)} events, last event {out['lastEventHash']}, commit {commit} -> {target}")
