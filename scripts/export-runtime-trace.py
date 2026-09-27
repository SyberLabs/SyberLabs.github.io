"""Export a recorded SyberRuntime run for the homepage system maps.

Runs the "Accrue, then refuse" scenario from SyberLabs/cross-platform
(platform/backend/scenarios.py) through that repository's own SyberRuntime
adapter, against the real kernel from sykosyber/syber_runtime, in a scratch
directory. Each step's outcome is what the kernel returned or raised. The log
is then read back with hash-chain validation, and the operation projection is
written to src/runtime-trace.json.

Usage: python scripts/export-runtime-trace.py path/to/cross-platform path/to/syber_runtime
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

platform = Path(sys.argv[1]).resolve()
kernel = Path(sys.argv[2]).resolve()
sys.path[:0] = [str(kernel / "src"), str(platform / "platform" / "backend")]

from adapters.syber_runtime_adapter import SyberRuntimeAdapter  # noqa: E402
from contract import EventSink, SystemRefusal  # noqa: E402
from scenarios import RUNTIME  # noqa: E402


def head(path: Path) -> str:
    return subprocess.run(["git", "-C", str(path), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()


with tempfile.TemporaryDirectory() as scratch:
    adapter = SyberRuntimeAdapter(EventSink(), "homepage-export", Path(scratch) / "runtime")
    session = SimpleNamespace(runtime=adapter)
    bag: dict = {}
    steps = []
    for step in RUNTIME.steps:
        entries_before = len(adapter.log())
        try:
            result = step.run(session, bag)
            outcome, code = "ok", None
        except SystemRefusal as refusal:  # the adapter carries the kernel's own refusal
            result, outcome, code = {"message": refusal.message.splitlines()[0][:220]}, "refused", refusal.kind
        state = adapter.state()
        open_obligations = [o for o in state["debt"]["obligations"].values() if isinstance(o, dict) and o.get("status") == "open"]
        steps.append({
            "title": step.title,
            "expected": step.expect_code or step.expect,
            "outcome": outcome,
            "code": code,
            "matched": (outcome == "refused") == (step.expect == "refused") and step.expect_code in (None, code),
            "appended": len(adapter.log()) - entries_before,
            "residualDebt": round(state["debt"]["totalResidual"], 6),
            "openObligations": len(open_obligations),
            "result": {k: v for k, v in result.items() if isinstance(v, (str, int, float, bool))},
            "plain": step.plain,
        })
    log = adapter.log()
    policy = adapter.state()["policy"]

operations = [{
    "index": i,
    "type": e["operation"]["type"],
    "hash": e["entryHash"][:12],
    "prev": (e["prevHash"] or "")[:12],
    "parents": len(e["operation"]["parents"]),
    "outputs": len(e["operation"]["outputs"]),
    "inputs": len(e["operation"]["inputs"]),
} for i, e in enumerate(log)]

out = {
    "source": "SyberLabs/cross-platform scenarios.py RUNTIME via adapters/syber_runtime_adapter.py",
    "platformCommit": head(platform),
    "kernel": "sykosyber/syber_runtime",
    "kernelCommit": head(kernel),
    "policy": policy,
    "steps": steps,
    "operations": operations,
}
assert all(s["matched"] for s in steps), [s for s in steps if not s["matched"]]
target = Path(__file__).resolve().parents[1] / "src" / "runtime-trace.json"
target.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(steps)} steps, {len(operations)} operations -> {target}")
