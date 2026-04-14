# live-agent-cli Spec (MVP)

## 1) Product definition
`live-agent-cli` is a command-line interface that converts natural language (typed first, voice second) into a structured action plan, then executes that plan against Ableton Live through a deterministic adapter.

### Key design principle
**LLM plans, executor decides.**
- LLM may only output actions from a fixed schema.
- Executor validates and runs; no arbitrary code paths.

---

## 2) System architecture

1. **Input**
   - Text: direct CLI string
   - Voice (later): speech-to-text bridge

2. **Planner**
   - Maps intent -> `ActionPlan` JSON
   - Adds confidence + ambiguity notes

3. **Validator**
   - Schema validation
   - Action allowlist validation
   - Safety validation (mutating ops require execute mode)

4. **Executor**
   - Calls adapter methods in sequence
   - Captures step-level results

5. **Adapter**
   - `showcontrol-osc` (first)
   - Future: `ableton-direct` (Remote Script/M4L)

---

## 3) CLI commands

## `live-agent plan "<intent>"`
Returns validated ActionPlan JSON only.

## `live-agent run "<intent>" [--execute]`
Builds plan and executes it (dry-run unless `--execute`).

## `live-agent run --file plan.json [--execute]`
Executes a pre-generated plan.

## `live-agent actions`
Lists supported actions + required args.

## `live-agent adapters`
Lists available adapter backends.

---

## 4) MVP action set (v0)

1. `create_track`
   - args: `{ "type": "midi" | "audio" }`

2. `select_track`
   - args: `{ "target": "selected" | "index" | "name", "value": string|number }`

3. `load_device`
   - args: `{ "track": "selected"|number|string, "device": string }`

4. `arm_track`
   - args: `{ "track": "selected"|number|string, "value": boolean }`

5. `set_monitor`
   - args: `{ "track": "selected"|number|string, "mode": "in"|"auto"|"off" }`

6. `transport_play`
   - args: `{}`

7. `transport_stop`
   - args: `{}`

8. `transport_record`
   - args: `{ "value": boolean }`

9. `session_record`
   - args: `{ "value": boolean }`

10. `wait`
   - args: `{ "ms": number }`

---

## 5) ActionPlan schema

```json
{
  "version": "0.1",
  "intent": "Create a MIDI track, load Drum Rack, arm and start recording",
  "adapter": "showcontrol-osc",
  "actions": [
    {"action":"create_track","args":{"type":"midi"}},
    {"action":"load_device","args":{"track":"selected","device":"Drum Rack"}},
    {"action":"arm_track","args":{"track":"selected","value":true}},
    {"action":"transport_record","args":{"value":true}},
    {"action":"transport_play","args":{}}
  ],
  "safety": {
    "mutating": true,
    "requiresExecuteFlag": true
  }
}
```

---

## 6) Safety model
- Default mode is dry-run.
- Mutating actions require explicit `--execute`.
- Unknown actions are rejected.
- Unknown args are rejected.
- Executor performs preflight checks:
  - adapter connection available
  - target track exists (if named/indexed)
  - device resolution supported by adapter

---

## 7) Execution result model

```json
{
  "ok": true,
  "mode": "execute",
  "adapter": "showcontrol-osc",
  "steps": [
    {"index":1,"action":"create_track","ok":true,"message":"Created MIDI track 7"},
    {"index":2,"action":"load_device","ok":true,"message":"Loaded Drum Rack"}
  ]
}
```

---

## 8) Phase plan

### Phase A (now)
- Spec + schema + scaffolding

### Phase B
- Planner + validator + dry-run executor

### Phase C
- showcontrol-osc adapter implementation for v0 actions

### Phase D
- voice input mode
- macro library ("prep vocal track", "create drum loop lane")


## 9) Delivery strategy: full coverage by batches
See `docs/BATCH_ROADMAP.md`.

Policy:
- End goal is full command coverage.
- Work ships in priority batches.
- Each batch must pass implementation + testing + stabilization before the next.


## 10) New goal tracks (2026-02-27 update)

### A) User function discovery track
- Add slash-like discoverability UX (`help`, short function lists, filters).
- Source plan: `docs/USER_FUNCTION_LIST_PLAN.md`

### B) Max for Live backend track
- Build phased adapter path using Live API / LOM via Max for Live.
- Source plan: `docs/MAX4LIVE_API_BATCHES.md`

