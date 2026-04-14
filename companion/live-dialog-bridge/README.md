# live-dialog-bridge

Minimal macOS localhost bridge for GUI file-dialog automation against Ableton Live 12 Suite.

## What this scaffold includes

- tiny localhost HTTP server on `127.0.0.1:31973`
- `GET /health`
- `GET /permissions`
- `POST /v1/dialog/save-as`
- Accessibility permission detection
- Ableton Live 12 Suite process detection
- structured AX save-dialog inspection with same-folder filename-entry planning

## Build

```bash
cd /Users/gsn8/live-agent-cli/companion/live-dialog-bridge
swift build
```

## Run

```bash
swift run live-dialog-bridge
```

## Test

```bash
curl -s http://127.0.0.1:31973/health
curl -s http://127.0.0.1:31973/permissions
curl -s http://127.0.0.1:31973/v1/dialog/save-as \
  -H 'content-type: application/json' \
  -d '{"targetPath":"/Users/gsn8/Desktop/tek1 Project/test-save.als","activateLive":true,"timeoutMs":15000}'
```

## Notes

The bridge now does one concrete thing beyond pure scaffolding: it runs a structured Accessibility inspection for a save dialog and reports whether a same-folder filename entry path looks available.

It also has a real localhost HTTP test now, so `/health` is covered as an actual served endpoint rather than only through direct router calls.

Current limitations:
- it does not yet invoke `File → Save Live Set As…`
- it does not yet press Save or verify on-disk file creation
- if Live still exposes zero AX windows, the endpoint returns a structured `save_dialog_not_detected` error instead of hanging as a blind stub
