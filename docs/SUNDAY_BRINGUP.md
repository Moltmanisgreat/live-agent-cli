# Sunday Bring-up Plan (Mac mini + Live 12 beta)

## Objective
Connect `live-agent-cli` to a real Live backend and validate core command execution.

## Preconditions
- Ableton Live 12 beta installed and launches
- Max for Live available
- Local bridge patch/script running (to be implemented)
- `npm test` green before hardware test

## Bring-up sequence
1. `npm test`
2. `node src/index.js adapters --json`
3. Validate dry-run baseline:
   - `node src/index.js run "create midi track and play" --json`
4. Attempt max4live adapter preflight:
   - `node src/index.js run "set tempo to 120" --execute --adapter max4live --json`
5. Implement bridge transport and re-run step 4 until preflight passes.

## Smoke scenarios (real backend)
- Create track + load device + arm + record/play
- Scene fire + clip fire/stop
- Tempo + time signature + metronome
- Save project safety flow

## Exit criteria
- Preflight passes on max4live adapter
- At least 10 high-value commands execute successfully on Live
- Failures captured in compatibility log with exact error strings
