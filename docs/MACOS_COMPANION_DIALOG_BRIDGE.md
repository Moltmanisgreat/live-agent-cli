# macOS Companion Dialog Bridge for Ableton Live Save As

## Implementation Status: ✅ WORKING

The companion bridge is built and operational. Save-as automation is functional.

## Architecture

```
live-agent CLI
    |
    | local HTTP POST /v1/dialog/save-as
    v
LiveAgent Dialog Bridge (macOS Swift process, localhost only)
    |
    | AppKit + Accessibility APIs + AppleScript fallbacks
    v
Ableton Live 12 Suite UI
    |
    | native Save panel / sheet
    v
.als file written to disk
```

## Key Implementation Details

### Process Name Discovery
Ableton Live runs as process name `"Live"`, NOT `"Ableton Live 12 Suite"`. The bridge uses dynamic process detection:

```
if exists process "Live" then
    set targetProcess to "Live"
else if exists process "Ableton Live 12 Suite" then
    set targetProcess to "Ableton Live 12 Suite"
```

This was a critical fix — using the wrong process name caused all automation to fail silently.

### Save Dialog Strategy

The save-as flow uses **Cmd+Shift+G "Go to Folder"** as the primary method:

1. Trigger File → Save As (Cmd+Shift+S)
2. Wait for save dialog
3. **Primary method**: Cmd+Shift+G opens "Go to Folder" → type full path → Return
4. Fallback 1: Direct AX filename field set
5. Fallback 2: Cmd+Return keystroke
6. Fallback 3: Regular Return with process targeting
7. **Confirm save** via AX API → Save button click, or keystroke-based fallbacks

This approach handles the full path correctly (`/Users/gsn/Desktop/My Project/MyFile.als`) without folder-by-folder navigation.

### Confirm Save Detection

The bridge detects successful save completion by monitoring:
1. Dialog dismissal
2. File existence at target path
3. File size > 0

If a "Replace" confirmation dialog appears, it's handled via AX button detection.

## API

Base URL: `http://127.0.0.1:31973`

### `GET /health`
```json
{ "ok": true, "service": "live-dialog-bridge", "targetApp": "Ableton Live 12 Suite" }
```

### `GET /permissions`
```json
{
  "ok": true,
  "accessibilityTrusted": true,
  "automationNotes": ["If Apple Events are used, macOS may prompt for Automation permission."]
}
```

### `POST /v1/dialog/save-as`
```json
{
  "targetPath": "/Users/gsn8/Desktop/test-project.als",
  "activateLive": true,
  "timeoutMs": 15000
}
```

Success response:
```json
{
  "ok": true,
  "fileCreated": true,
  "filePath": "/Users/gsn8/Desktop/test-project Project/test-project.als",
  "fileSize": 13785,
  "mode": "full_save_flow",
  "notes": ["SUCCESS: Go-to-folder method worked: success: used_go_to_folder_Live"]
}
```

Error codes:
- `live_not_running` — Ableton Live is not running
- `accessibility_not_granted` — AX trust not granted
- `save_dialog_not_detected` — Save dialog didn't appear
- `save_dialog_filename_field_not_found` — Can't set filename
- `replace_confirmation_required` — "Replace" dialog needs handling
- `save_timeout` — Save didn't complete within timeout

## Routing from LiveAgent CLI

The executor routes `project_save_as` to the dialog bridge, bypassing remotescript:

```js
// In src/executor.js or src/adapters/
const res = await fetch('http://127.0.0.1:31973/v1/dialog/save-as', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ targetPath, activateLive: true, timeoutMs: 15000 }),
});
const body = await res.json();
if (!body.ok || !body.fileCreated) throw new Error(body.error || 'Save As failed');
```

## Permissions Required

1. **Accessibility** — System Settings → Privacy & Security → Accessibility → grant to live-dialog-bridge
2. **Automation** — may prompt for bridge → Ableton Live when using AppleScript fallbacks

## Build & Run

```bash
cd companion/live-dialog-bridge
swift build
swift run
# Or open in Xcode:
open LiveDialogBridge.xcodeproj
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Save dialog not detected | Grant Accessibility permission |
| Wrong process errors | Update to latest bridge (uses "Live" process name) |
| "Replace" dialog hangs | Check for existing file at target path |
| Timeout on first save | Increase timeoutMs, ensure Live is frontmost |

## History

- **2026-04-14**: Save-as flow working. Cmd+Shift+G "Go to Folder" method enables full path handling. Process name discovery fixed from hardcoded `"Ableton Live 12 Suite"` → dynamic `"Live"/"Ableton Live 12 Suite"`.
- **2026-04-04**: Initial scaffold built, save confirmation fix committed.
