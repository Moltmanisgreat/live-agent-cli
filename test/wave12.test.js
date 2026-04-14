import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validator.js';

test('wave12 actions are supported by validator', () => {
  const plan = {version:'0.1', intent:'wave12', adapter:'showcontrol-osc', actions:[{"action": "create_clip", "args": {"track": 1, "slot": 1, "length": 4}}, {"action": "delete_track", "args": {"track": 1}}, {"action": "duplicate_track", "args": {"track": 1}}, {"action": "rename_track", "args": {"track": 1, "name": "T1"}}, {"action": "set_track_color", "args": {"track": 1, "color": "red"}}, {"action": "delete_scene", "args": {"scene": 1}}, {"action": "duplicate_scene", "args": {"scene": 1}}, {"action": "rename_scene", "args": {"scene": 1, "name": "S1"}}, {"action": "rename_clip", "args": {"track": 1, "slot": 1, "name": "C1"}}, {"action": "set_clip_color", "args": {"track": 1, "slot": 1, "color": "blue"}}, {"action": "stop_all_clips", "args": {"track": 1}}, {"action": "play", "args": {}}, {"action": "tap_tempo", "args": {}}, {"action": "undo", "args": {}}], safety:{mutating:true, requiresExecuteFlag:true}};
  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
