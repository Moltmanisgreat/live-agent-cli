# User Function List Plan ("slash-like" UX)

Goal: make available functions discoverable for humans, similar to `/` command menus.

## Planned commands

1. `live-agent help`
- Human-friendly overview
- Grouped by category/batch
- Includes examples

2. `live-agent actions`
- Full JSON list (already exists)
- Includes args + mutating flag + batch tag

3. `live-agent actions --short`
- Compact slash-style names only
- Example:
  - `/create_track`
  - `/load_device`
  - `/fire_scene`

4. `live-agent actions --category <name>`
- Filter by domain (transport, tracks, clips, devices, etc.)

5. `live-agent actions --batch <n>`
- Filter by rollout phase

6. Shell completion
- zsh/bash completion for command + action names

## Next steps (implementation order)
1) Add `help` command
2) Add metadata to action registry (category, batch, description)
3) Implement `--short`, `--category`, `--batch`
4) Add completion script generator
5) Add tests for each output mode
