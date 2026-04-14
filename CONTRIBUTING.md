# Contributing to live-agent-cli

## Setup

```bash
git clone <repo-url>
cd live-agent-cli
npm install
```

## Running

```bash
# List available actions
node src/index.js actions

# Plan a command (dry-run)
node src/index.js plan "create a new midi track"

# Execute a command
node src/index.js plan "create a new midi track" --execute

# Run from file
node src/index.js run --file my-plan.json --execute
```

## Architecture

- `src/index.js` - CLI entry point
- `src/actions/registry.js` - Action definitions (119 actions)
- `src/adapters/` - Adapter implementations
  - `remotescript.js` - UDP bridge to Ableton Remote Script
- `src/planner.js` - Natural language to action plan
- `src/validator.js` - Schema and safety validation

## Adding an Action

1. Add to `src/actions/registry.js`:
```javascript
my_action: {
  mutating: true,
  args: ["arg1"],
  category: "category",
  batch: 1,
  description: "What it does",
  validate: (args) => !!args.arg1
}
```

2. Add handler to `remotescript/__init__.py`:
```python
if action == 'my_action':
    # handle it
    return {'ok': True, ...}
```

3. Sync to Ableton Remote Scripts folder.

## Testing

```bash
npm test
# or
node --test
```

## Pull Requests

- Include tests for new actions
- Update docs if needed
- Run `node src/index.js actions` to verify registry
