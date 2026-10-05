# System maps: technical basis

This document specifies the **System maps** (`src/system-maps/`). Since 2026-10-05 the OmniOS, Relay and OSAHR maps are mounted on their project pages as an Inspect section (`src/system-map-embed.jsx`); the RISE map records the Worker-side Jev path that RISE #294 retired and is not mounted; Barn and SyberRuntime have no project page. It
states the network form chosen for each system, what its nodes and edges mean, what
changes over time, what a visitor can inspect, and the repository evidence behind
each choice.

The maps replace the earlier "One network. Different expressions." sphere. That
sphere drew one decorative topology per system on a shared volume. Nothing in the
repositories establishes one network or runtime across SyberLabs systems, so the
maps are separate. Each keeps its own topology.

## Evidence grades

Every map and every step carries one of three grades.

| Grade | Meaning |
| --- | --- |
| **Recorded** | Output of running the repository's own code. The export script in `scripts/` reproduces it. |
| **Rule** | Behavior reproduced from cited source code, over an example whose values are illustrative. |
| **Illustrative** | A state the code permits but that was not produced by running it. |

## Reproducing the recorded data

```sh
python scripts/export-osahr-trace.py   path/to/OSAHR_Cell           # src/osahr-trace.json
python scripts/export-barn-trace.py    path/to/bough-and-barn       # src/barn-trace.json
python scripts/export-runtime-trace.py path/to/cross-platform path/to/syber_runtime  # src/runtime-trace.json
node --experimental-strip-types scripts/export-relay-trace.mjs path/to/relay  # src/relay-trace.json
```

Commits used for the published data:

| Repository | Commit |
| --- | --- |
| SyberLabs/OSAHR_Cell | `916dfdb` |
| sykosyber/bough-and-barn | `aa8310b` |
| SyberLabs/cross-platform | `5b31b6f` |
| sykosyber/syber_runtime | `5251df5` (the commit cross-platform pins) |
| SyberLabs/relay | `ff7e5aa` |
| SyberLabs/RISE | `998d725` (read, not executed; the map is rule-based) |
| SyberLabs/OmniOS | `955a6ad` (read, not executed) |

Each script asserts its own consistency check and fails rather than writing data
that does not pass.

- **OSAHR:** delta replay reproduces every recorded state hash, and a second run from the same seed reproduces the trace.
- **Barn:** the materialized state hash equals the hash replayed from the event ledger.
- **SyberRuntime:** every step matches the outcome the cross-platform scenario predicts.

---

## Relay: provenance graph with authority regions

**Grade:** Recorded. `lib/domain.ts`, `lib/assistant-handoff.ts` and `lib/profile.ts` were executed under Node with the packet and draft from cross-platform's "The handoff is the object" scenario. The acceptance write (`lib/job-review.ts saveJobReview`) needs D1 and was not executed. The map marks it as a rule.

| Node | Meaning | Evidence |
| --- | --- | --- |
| Posting observation | An imported source record, preserved as an `observations` row | `db/schema.ts` observations; `ARCHITECTURE.md` |
| Canonical key | `jobKey(url)`: Greenhouse alias resolution plus tracking-parameter removal | `lib/domain.ts jobKey` |
| Job record v*n* | Owner-scoped `jobs` row with status, draft, `accepted_draft`, `version` | `db/schema.ts` jobs |
| Confirmed facts | User-confirmed claims. "Verified" means user-confirmed, not independently verified | README "Candidate facts" |
| Bounded packet | `assistantPrompt`: selected job, cited facts and current draft only, marked untrusted source data | `lib/assistant-handoff.ts` |
| External assistant | Any outside model. It writes nothing to Relay | README, "Integrations" |
| Returned draft | `relay.draft.v1`, `reviewRequired: true` | `assistantResult` |
| Identity/version check | Rejects mismatched key or stale version | `assistantPrompt`/`assistantResult` refusals |
| Claim gate | `unsupportedClaims`: word and number overlap with cited facts. A heuristic | `lib/profile.ts` |
| Human reviewer | Signed-in owner. The only actor who can set Ready | `validateEdit`, `saveJobReview` |
| Accepted exact text | `accepted_draft`, with version+1 and a `Draft accepted` event | `lib/job-review.ts` |

**Edges** are typed: *canonicalizes*, *identifies*, *bounded into*, *cited in*, *handed off*, *returns*, *checked by*, *grounds*, *flags for*, *accepts*, *writes*.

**What changes:** 11 recorded steps. Six succeed and five are refused:

- mismatched key
- stale packet version
- open blocker
- stale record version
- marking "Submitted" from the editor

The job version advances only on the accepted write.

**Inspectable:** each node's owner, each step's function, the refusal message and the authority for the step.

## OmniOS: directed context graph with wire status

**Grade:** Rule. The canvas is the shipped **Investor Shell** template (`src/core/shells/templates.ts`). Wire status and context aggregation reproduce `src/core/services/wire.service.ts`. The data states (a failing feed, a stale indicator) are illustrative.

| Node | Meaning | Evidence |
| --- | --- | --- |
| Polymarket, CoinGecko, World Bank, Hacker News | Data blocks, one live source each | Investor Shell `blocks` |
| Analyst, Strategist | Persona blocks. A persona's context is what its inbound active wires carry | README "The idea" |
| Answer (run) | One inference run and its recorded sources | `INFERENCE_LEDGER.md` |

**Edges:** wires, block to block, with status `active | stale | error | disconnected`. Port declarations are visual hints only; no wire enforces a type (`TYPED_PORT_SYSTEM.md`). A persona-to-persona wire carries a source of kind `inference` that names the parent run (`parentRunId`).

**What changes:** `updateWireStatuses` marks a wire `error` when its source block errors, and `stale` when the source has no data or is more than 5 minutes old. `aggregateWireContext` keeps only `active` wires whose source returns data. Only those reach an answer.

**Inspectable:** which wires reached each answer, and why each excluded wire was excluded. The lineage from the Strategist's answer through the Analyst's run is shown. The persistent lineage walk requires the optional Postgres ledger, which was not exercised.

## RISE: the reader-owned decision contract

**Grade:** Rule. Reproduced from `src/core/decision/` at `998d725` (`recommend.js`, `call.js`, `providers.js`, `browser.js`, `catalog.js`) and `docs/USER-OWNED-AI.md` over one illustrative request. No model was called. This map replaced the recorded map of the Worker-side Jev route on 2026-10-05, because RISE #294 retired that route: the Worker now calls no model and holds no model key.

| Node | Meaning | Evidence |
| --- | --- | --- |
| Reader request | A short preference, never an instruction that changes the menu | `recommend.js` |
| Reader's connection | OpenRouter (OAuth PKCE, key in tab memory) or local RISE with pinned Kev-4B; with neither, `NOT_CONNECTED` | `src/core/ai-connection.js`, `docs/USER-OWNED-AI.md` |
| Public catalog | Static `/content/catalog.json`, public columns only, written by the build | `catalog.js`, `browser.js loadPublicCatalog` |
| Finite choice questions | Book, pace, curve, chunk, audio, visual, style, engine, arc; each with fixed keys | `recommend.js CHOICES` |
| Jev or Kev | One call with a deadline and the reader's cancel signal; no retry, no fallback | `call.js`, `providers.js` |
| Admission | Provider and model label checked (Kev: pinned `X-Kev-Revision`); only offered keys admitted; else `INVALID_RESPONSE` / `UNATTESTED` | `providers.js validProviderResult`, `recommend.js` |
| Reading settings | Deterministic mapping of an admitted answer to audio and visual programs and a Chamber configuration | `src/core/jev-config.js`, `jev-sequence.js` |
| Chamber | Local rendering; the Worker's six former inference routes answer 410 | `worker/retired-inference.mjs` |
| Reader controls | Any setting can be changed during the reading | Chamber controls |

**What changes:** request → questions → (refused without a connection) → one call → answer → (refused if any key was not offered) → settings → reading, followed by a reader override.

**Not on this path:** the Worker, and Composer in ChatGPT, which uses the sealed `rise.current.v1` input.

## Barn: work graph, transition engine and append-only ledger

**Grade:** Recorded. `barn/src/barn/demo.py` was run against the in-memory store with three refusal probes, all using the engine's own codes.

| Node | Meaning |
| --- | --- |
| Work items | Goal, then realtime sync `[sync]`, then conflict strategy `[crdt]` with verification required |
| Agents | Chief `{generalist, architecture}`; CRDT Specialist `{crdt}`, spawned then retired |
| Artifact, verification | Design artifact, then the Chief's independent verification |
| Transition engine | `BarnEngine`, the only writer |
| Ledger | `BarnEvent` sequence 1–9 |

**Selection vs mutation:** agents propose through typed commands. The engine licenses, rejects or refuses. Only licensed commands append events.

The run shows two kinds of "no":

- `specialist.rejected` (`capability_not_required`) is a committed decision event.
- `artifact_required` and `independent_verifier_required` raise `TransitionError` and append nothing.

**Also drawn:** capability chips (held, met, unmet gaps, pending verification), the engine's decision per step, the active-agent budget (4, from the run), and the ledger itself. A refusal leaves a mark where an event would have gone.

**Inspectable:** each event's actor, work item and decision reason. The audit compares materialized state with state replayed from the ledger (`c8be63a20d9c` in both for the published run; Barn assigns fresh ids, so each recording has its own hash). The "why" chain runs goal → sync → conflict → capability `crdt` → request → CRDT Specialist.

**Bough:** Bough compiles exact jump chains over OSAHR. Barn's integration plan (§7) makes Bough's output advice, never authorization. Bough is not called in this run, and the map does not draw it as connected. **Graft** (the stricter licensing join) exists only as an unpublished working tree, so it is listed under uncertainty.

## OSAHR: typed directed hypergraph under stochastic rewriting

**Grade:** Recorded. This is `examples/adaptive_signal.py` from OSAHR_Cell: seed `20260729`, horizon t = 10, 25 committed events, and replay verified.

| Element | Meaning |
| --- | --- |
| Vertices | Two `Agent` vertices with attributes `value` and `responsiveness` |
| Hyperedges | `Signal`, with a `source` role (tail) and a `target` role (head), and attribute `intensity` |
| Rules | `regenerate-signal` creates a Signal, and matches both orientations. `receive-signal` deletes the matched Signal and updates the target's `value` and `responsiveness` |
| Boundary | Input handle `receiver-input` merges attributes into the bound vertex |
| Augmented state | X = (G, B, R, Θ, Z, t, n). Θ holds rates and Z holds `received_count` and `intensity_ema` |

**What changes:**

- 22 internal rewrites.
- One external input at t = 3.0, which sets responsiveness to 0.8.
- One scheduled adaptation at t = 6.0, which halves `regeneration_rate`.

Each event carries its hazard, total activity, pre-state hash and post-state hash.

**Inspectable:** each event's rule, match, hazard, graph delta, Θ, Z and hash pair. The last event's post-state hash is `355530880eff`.

## SyberRuntime: hash-chained operation log and obligation state

**Grade:** Recorded. This is the "Accrue, then refuse" scenario from cross-platform, run through its own SyberRuntime adapter against the kernel at `5251df5`.

| Element | Meaning |
| --- | --- |
| Operations | ThreadCreate, Feature, Test, Test, Stabilize. Each entry stores its hash and the previous entry's |
| Artifact | `billing.py`, in the content-addressed blob store |
| Obligation | Floor-rigor verification obligation, `open` then `discharged`. Debt = 2 × 1.5 × 1 × 1.0 = 3.0 |
| Stabilize | `stabilize()` refuses with `StabilizationBlockedError` while a floor obligation is open, before writing |

**What changes:** 8 steps and 5 appended operations. Two refusals append nothing. A failing check is recorded and discharges nothing.

**Inspectable:** the hash chain, the debt, the obligation status and the replay-determinism result.

---

## The "What it does" face

Every card flips to an outcome face (`src/system-maps/outcomes.js`): who the system is for, a four-step journey that names who acts at each step (you, the system, an outside tool, or a rule in code), three outcomes, and what stays in the user's control. Each sentence restates a behavior documented above or in the repository's README, including its limits. For example:

- Relay does not send applications on its own.
- Jev's 48 of 49 counts explicit preferences, not whole requests.
- OmniOS lineage across personas needs the optional ledger.
- Barn verification applies when the task requires it.
- OSAHR models mechanisms, not calibrated forecasts.

Status labels (Live app, Early release, Local-first preview, Research prototype, Research kernel) follow each repository's own description.

## Relationships and uncertainty

| Relationship | Status | Evidence |
| --- | --- | --- |
| Relay → SyberRuntime | Composes only in cross-platform's adapter layer. Neither product calls the other | `cross-platform/docs/INTEGRATION_MAP.md` |
| Barn → Bough | Advisor specified in Barn's plan §7, implemented only in cross-platform's adapter | `docs/INTEGRATION_PLAN.md` |
| Bough → OSAHR | Bough invokes OSAHR's schedulers for exact-vs-sampled agreement | `bough/compare.py` |
| Shared runtime | None. The maps run separately | — |

**Not mapped:**

- **Turtle** (`turtle-shells`): a P0 policy evaluator for authority envelopes. It is not connected to SyberRuntime, and Rust was not available to run it here.
- **SyberWork**: a separate contract-execution application.
- **SyberLabs SDK**: no repository found.
- **Graft**: unpublished.
- **OmniOS inference ledger lineage**: requires Postgres.
