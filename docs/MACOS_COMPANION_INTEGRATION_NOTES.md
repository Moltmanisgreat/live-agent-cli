# macOS Companion Integration Notes

## Permissions

### Accessibility
Required for real GUI automation.

Enable for:

- the built `live-dialog-bridge` binary or app wrapper
- any development host launching it from Terminal during testing, if macOS attributes events there

Check in the scaffold:

- `GET /permissions`

### Automation
Only needed if the bridge uses AppleScript / Apple Events.

Possible prompts may involve:

- `live-dialog-bridge` → `Ableton Live 12 Suite`
- `live-dialog-bridge` → `System Events`

### Full Disk Access
Not required for the initial save-as path unless future logic needs broader filesystem visibility.

## How LiveAgent CLI should call it

Recommended endpoint:

- `POST http://127.0.0.1:31973/v1/dialog/save-as`

Payload:

```json
{
  "targetPath": "/absolute/path/to/file.als",
  "activateLive": true,
  "timeoutMs": 15000
}
```

Current response contract highlights:
- `mode: "ax"` when the bridge performed Accessibility-based inspection/automation planning
- `error: "accessibility_not_granted"` when AX trust is missing
- `error: "live_not_running"` when Ableton Live 12 Suite is not running
- `error: "save_dialog_not_detected"` when Live exposes no detectable save sheet/window
- `error: "save_dialog_filename_field_not_found"` when a save dialog is found but the filename field path is not reachable

## Suggested adapter shape

Create a dedicated adapter or bridge client, not a remotescript action:

```js
export async function saveLiveSetAs(targetPath) {
  const res = await fetch('http://127.0.0.1:31973/v1/dialog/save-as', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      targetPath,
      activateLive: true,
      timeoutMs: 15000,
    }),
  });

  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error || 'Save As bridge request failed');
  }
  return body;
}
```

## Routing recommendation

For `project_save_as`:

- planner stays unchanged
- executor routes to dialog bridge
- remotescript is bypassed for this action

## Minimum operator workflow

1. Start Ableton Live 12 Suite.
2. Start the bridge.
3. Verify:
   - `GET /health`
   - `GET /permissions`
4. Run LiveAgent command that emits `project_save_as`.
5. Let the executor POST to the bridge.

## Immediate next code step in the CLI repo

Add a `src/bridges/dialogBridge.js` client and route `project_save_as` there, while leaving the rest of execution on the current adapter stack.
