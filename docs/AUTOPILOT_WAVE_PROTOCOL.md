# Autopilot Wave Protocol (11 → 16)

Goal: ensure multi-wave execution continues automatically without needing "go" between waves.

## Autopilot contract
When mission is "complete Waves 11–16", execution mode is **AUTO_CONTINUE=true**.

### Rules
1. Start Wave 11 immediately.
2. On wave completion, auto-start next wave in same session.
3. Do not pause between waves unless a real blocker exists.
4. If blocked, emit blocker report with exact blocker + attempted fixes.
5. Resume automatically once blocker is cleared.

## Stop conditions (only)
- All waves 11–16 are marked `done`.
- A hard blocker exists (missing dependency/permission/spec ambiguity).
- User explicitly says stop/pause.

## Completion proof per wave
A wave is `done` only if all true:
- failing tests were added first
- implementation committed
- full test suite green
- `docs/WAVE_STATUS.md` updated with commit hash + test count

## Reporting cadence
- Report only at wave boundaries:
  - "Wave X done" + commit hash + tests + next wave auto-started
- No vague progress messages.

## Default next action
If no blocker and not complete: **start next wave now**.
