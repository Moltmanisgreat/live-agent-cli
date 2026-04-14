# LiveAgent Blockers

Known issues and blocked features.

## Current Status

### B7-PLANNER-001 (Resolved)
- **Summary:** Planner mappings for `save set as`, `run macro`, `watch song`, and `set confirmation policy` were corrected.
- **Status:** Resolved

### B7-EXEC-001 (Resolved)
- **Summary:** Watch features working, `project_save_as` now resolved via companion bridge.
- **Status:** Resolved

### B8-SAVEAS-001 (Resolved)
- **Summary:** Save-as now works via `companion/live-dialog-bridge/`.
- **Status:** Resolved

### KNOWN_LIMITATIONS

1. **Dialog confirmation detection** - The save-as bridge detects the Save dialog and fills the filename correctly, but various button-click methods may report failure even when save succeeds. File verification handles this gracefully.

2. **Remote Script initialization** - Ableton must have the LiveAgent Remote Script installed in `~/Music/Ableton/User Library/Remote Scripts/LiveAgent/`.

3. **macOS only** - The save/save-as companion bridge requires macOS for Accessibility API access.

## Reporting Issues

When reporting issues, include:
- macOS version
- Ableton Live version
- Error from Log.txt (for Remote Script issues)
- Command you were trying to execute
