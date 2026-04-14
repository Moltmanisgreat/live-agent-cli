# Execution Guardrails (Anti-Drift Protocol)

Purpose: prevent "I will do all waves" claims without actual delivery.

## Rules
1. **No progress claims without proof**
   - Any "done" or "in progress" update must include:
     - latest commit hash
     - test status (pass/total)
     - exact wave(s) touched

2. **Wave contract**
   - A wave is only "done" when all are true:
     - tests added first (failing initially)
     - implementation merged
     - full test suite green
     - `docs/WAVE_STATUS.md` updated

3. **Single-source tracking**
   - `docs/WAVE_STATUS.md` is authoritative for wave state.
   - States allowed: `not-started`, `in-progress`, `done`.

4. **No silent pauses**
   - If blocked >15 minutes, report blocker explicitly.
   - If not blocked, continue execution.

5. **Language discipline**
   - Do not say "I’m running through all waves" unless Wave 11 is already in-progress in `WAVE_STATUS.md`.
   - Do not say "done" for a wave without commit hash + green tests.
