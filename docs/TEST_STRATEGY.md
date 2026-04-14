# Test Strategy (TDD-first)

Practice: think test first, then code to make tests pass.

## Rules
1. For each new batch, write/extend tests before implementation.
2. No new action is considered done without:
   - planner test (intent mapping)
   - validator test (arg + allowlist checks)
   - executor test (dry-run + execute behavior)
   - CLI test (user-facing command path)
3. Keep deterministic tests for core logic (no LLM dependency in unit tests).
4. Add adapter contract tests when real Live adapter is introduced.

## Current baseline tests
- `test/planner.test.js`
- `test/validator.test.js`
- `test/executor.test.js`
- `test/cli.test.js`

Run with:
```bash
npm test
```
