# Batch Roadmap (Full-Coverage Plan)

Goal: implement the **entire command surface** over time, in priority batches, with tests and stability gates between batches.

## Execution rule
For each batch:
1. Implement
2. Test (unit + integration/smoke)
3. Stabilize/fix
4. Document
5. Move to next batch

No skipping quality gates.

---

## Batch 1 (current) — Core creation + transport + recording
**Why first:** highest creative velocity and immediate usability.

- create_track (midi/audio)
- select_track
- load_device
- arm_track
- set_monitor
- transport_play / stop
- transport_record
- session_record
- wait

Exit criteria:
- Can reliably execute: “new MIDI track → load Drum Rack → arm → record/play”.

---

## Batch 2 — Clip & scene workflow
**Why second:** core session workflow for writing and live prep.

- create_scene
- fire_scene
- stop_scene
- fire_clip
- stop_clip
- duplicate_clip
- delete_clip
- set_clip_loop
- set_clip_name/color

Exit criteria:
- Can build and trigger simple arrangement/session patterns from NL commands.

---

## Batch 3 — Track mixer control
**Why third:** foundational mix automation.

- set_volume / get_volume
- set_pan / get_pan
- set_send
- mute / solo
- set_crossfade_assign
- set_input/output routing (where API path allows)

Exit criteria:
- Reliable mixer changes with state readback.

---

## Batch 4 — Device parameters & chains
**Why fourth:** deep sound design and instrument/effect control.

- list_devices
- select_device
- set_device_parameter
- get_device_parameter
- enable/disable_device
- rack chain select/enable (where available)
- macro control

Exit criteria:
- Can perform full device manipulation via CLI/LLM with deterministic mapping.

---

## Batch 5 — Browser/load operations
**Why fifth:** asset loading and production flow acceleration.

- browse category/search
- load instrument/effect/sample
- load preset
- place clips/files on tracks

Exit criteria:
- Natural language “find/load” flows are reliable and safe.

---

## Batch 6 — Arrangement timeline controls
**Why sixth:** composition/edit workflows beyond session mode.

- set/get arrangement position
- punch in/out
- loop region set/enable
- record mode + overdub behavior
- automation arm/re-enable

Exit criteria:
- Timeline recording/edit operations execute predictably.

---

## Batch 7 — Global song/state controls
**Why seventh:** project-level control.

- tempo set/get
- time signature set/get
- global quantization
- metronome
- count-in
- follow song/session settings

Exit criteria:
- Full global performance state controllable with readback.

---

## Batch 8 — Project/set management
**Why eighth:** high-impact but sensitive operations.

- new set
- save / save as
- collect all and save (if exposed)
- open recent/open path (if exposed)

Exit criteria:
- Safe project lifecycle actions with confirmations and checkpoints.

---

## Batch 9 — Observability/event subscriptions
**Why ninth:** reliability + advanced automation.

- watch track/device/clip/global changes
- event stream filters
- structured logs + replayable traces

Exit criteria:
- Real-time state stream supports debugging + autonomous workflows.

---

## Batch 10 — Voice + macro intelligence layer
**Why tenth:** polish and speed after deterministic core is stable.

- voice command mode
- reusable macro library
- intent templates + disambiguation prompts
- confidence scoring and confirmation policies

Exit criteria:
- Fast spoken control with low error rate and clear confirmations.

---

## Full coverage commitment
This roadmap is designed so that, by Batch 10, we cover the full intended command surface.
We can reorder minor items, but we do **not** drop coverage.
