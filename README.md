# live-agent-cli

Natural-language + voice command CLI for Ableton Live.

## What it does

Turn spoken/written intents like:
- "make a new MIDI track"
- "load Drum Rack on track 2"
- "arm track 1 and start recording"

Into safe, deterministic action plans executed against Live via adapters.

## Requirements

- Node.js 18+
- Ableton Live 12 Suite (for full functionality)
- macOS (for companion save/save-as bridge)
- Ableton Remote Scripts folder access

## Installation

```bash
git clone <repo-url>
cd live-agent-cli
npm install
```

## Quickstart

```bash
# List available actions
node src/index.js actions --short

# Plan a command (dry-run, safe)
node src/index.js plan "create a new midi track"

# Execute a command
node src/index.js plan "create a new midi track" --execute

# Run from file
node src/index.js run --file my-plan.json --execute
```

## Architecture

```
┌─────────────┐      UDP/CLI        ┌──────────────────┐      Live API       ┌─────────────┐
│ live-agent  │ ◄────────────────► │ Remote Script     │ ◄────────────────► │ Ableton     │
│ (Node.js)   │   port 9000/9001  │ (Python)         │                    │ Live        │
└─────────────┘                    └──────────────────┘                    └─────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| `src/index.js` | CLI entry point |
| `src/actions/registry.js` | 119 action definitions |
| `src/adapters/remotescript.js` | UDP bridge to Ableton |
| `src/planner.js` | NL → action plan |
| `src/validator.js` | Schema + safety validation |
| `remotescript/__init__.py` | Ableton Remote Script (144 actions) |
| `companion/live-dialog-bridge/` | macOS save/save-as bridge |

## Commands

| Command | Description |
|---------|-------------|
| `node src/index.js actions` | List all actions |
| `node src/index.js plan "..."` | Plan a command (dry-run) |
| `node src/index.js run "..." --execute` | Execute a command |
| `node src/index.js run --file plan.json --execute` | Execute from file |

## Safety

- **Dry-run by default** — `--execute` required for writes
- **Action allowlist** — only registered actions run
- **Stop-on-error** — pipeline halts on failure (use `--continue-on-error` to override)

## Companion App (macOS)

For save/save-as functionality on macOS:

```bash
cd companion/live-dialog-bridge
swift build
swift run live-dialog-bridge
```

Then use the HTTP API:
- `GET /health` - Check status
- `POST /v1/dialog/save` - Simple save (Cmd+S)
- `POST /v1/dialog/save-as` - Save as with path

## Docs

- `docs/SPEC.md` - Full system specification
- `docs/BATCH_ROADMAP.md` - Action development roadmap
- `docs/COMMAND_INVENTORY.md` - All actions
- `docs/MACOS_COMPANION_DIALOG_BRIDGE.md` - Save bridge docs

## License

MIT
