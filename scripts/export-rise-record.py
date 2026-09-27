"""Export one recorded Jev reading decision for the homepage system maps.

Pairs a case from SyberLabs/RISE scripts/jev-eval-cases.json with the decision
recorded for it in the full post-fix production run
(scripts/jev-eval-production-broad-post-2026-09-27.json) and scores it against
the case's own expectations. Writes src/rise-record.json.

Usage: python scripts/export-rise-record.py path/to/RISE [case-id]
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

rise = Path(sys.argv[1]).resolve()
case_id = sys.argv[2] if len(sys.argv) > 2 else "vivid-combined"
cases = {c["id"]: c for c in json.loads((rise / "scripts" / "jev-eval-cases.json").read_text(encoding="utf-8"))}
run = json.loads((rise / "scripts" / "jev-eval-production-broad-post-2026-09-27.json").read_text(encoding="utf-8"))
rows = {r["id"]: r["decision"] for r in run["rows"]}


def matches(case: dict, decision: dict) -> list[dict]:
    return [{"field": k, "expected": v, "got": decision.get(k), "matched": decision.get(k) in v} for k, v in case["expect"].items()]


scored = [m for c in cases.values() if c["id"] in rows for m in matches(c, rows[c["id"]])]
case = cases[case_id]
commit = subprocess.run(["git", "-C", str(rise), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
out = {
    "source": "SyberLabs/RISE scripts/jev-eval-cases.json + scripts/jev-eval-production-broad-post-2026-09-27.json",
    "commit": commit,
    "model": run["model"],
    "release": "789cd63",
    "case": {"id": case_id, "intent": case["intent"], "decision": rows[case_id], "checks": matches(case, rows[case_id])},
    "run": {"cases": len(rows), "explicitChecks": len(scored), "matched": sum(m["matched"] for m in scored)},
}
target = Path(__file__).resolve().parents[1] / "src" / "rise-record.json"
target.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
print(json.dumps(out, indent=1))
