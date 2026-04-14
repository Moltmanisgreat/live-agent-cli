# Max for Live API Batches (Backend Track)

Goal: define a phased implementation path for a Max for Live backend adapter using Live API / LOM.

## Core M4L API primitives
- `live.path` (resolve objects)
- `live.object` (get/set/call)
- `live.observer` (subscribe to changes)
- `js` / `v8` LiveAPI wrapper (higher-level orchestration)

---

## Batch M1 — Connectivity + song transport
- Resolve `live_set`
- Read/write:
  - tempo
  - is_playing
  - record_mode / arrangement recording
- Calls:
  - start_playing
  - stop_playing

Tests:
- can connect to `live_set`
- can read tempo
- can toggle play/stop

---

## Batch M2 — Tracks + mixer
- Enumerate tracks (`tracks` list)
- Per-track read/write:
  - arm
  - mute
  - solo
  - volume
  - panning
- track selection and naming

Tests:
- track count resolves
- set/get arm/mute/solo round-trip
- set/get volume/pan round-trip

---

## Batch M3 — Scenes + clip slots
- Enumerate scenes + clip_slots
- Calls:
  - fire scene
  - fire clip slot
  - stop clip/scene
- Clip slot existence checks

Tests:
- fire scene changes playback state as expected
- fire/stop clip works on valid slot
- invalid slot returns explicit error

---

## Batch M4 — Devices + parameters
- Enumerate devices on track
- Enumerate parameters per device
- set/get parameter values
- enable/disable device

Tests:
- device list resolves
- parameter read/write round-trip within tolerance
- missing parameter gives structured capability error

---

## Batch M5 — Observers/event stream
- Watch tempo/play state/track arm/clip playing status
- Emit normalized events to CLI adapter layer

Tests:
- observer receives updates on state change
- unsubscribe stops events
- event schema validation passes

---

## Batch M6 — Adapter integration
- Implement `max4live` adapter in `live-agent-cli`
- Map existing action schema to M4L calls
- Add adapter capability reporting

Tests:
- parity tests: same action plan works on dry-run + m4l adapter
- capability matrix exposed for unsupported actions

---

## Notes
- Some operations vary by Live version/device context; adapter must return explicit "unsupported/not-available" errors instead of silent failure.
