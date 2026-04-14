# LOM Canonical Reference (Placeholder)

Purpose: store the official Ableton Live Object Model (LOM) command/property inventory used as source-of-truth for full API coverage audits.

Status: placeholder (to be filled from official Live/Max for Live API docs on the Live 12 beta machine).

## Required sections
1. Song-level properties + callable methods
2. Track-level properties + methods
3. Scene/ClipSlot/Clip objects
4. Device/Parameter/Chain objects
5. Browser/load operations
6. Observer-capable properties/events

## Audit workflow
1. Update this file from official docs.
2. Run coverage diff against `src/actions.js`.
3. Update `docs/API_GAP_REPORT.md` and backlog batches.
