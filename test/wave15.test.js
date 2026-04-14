import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validator.js';

test('wave15 actions are supported by validator', () => {
 const plan={version:'0.1',intent:'wave15',adapter:'showcontrol-osc',actions:[{"action": "arrangement_select_time", "args": {"start": 1, "end": 8}}, {"action": "arrangement_split_clip", "args": {"track": 1, "time": 8}}, {"action": "arrangement_consolidate", "args": {"track": 1, "start": 1, "end": 8}}, {"action": "arrangement_duplicate_time", "args": {"start": 1, "end": 8}}, {"action": "arrangement_delete_time", "args": {"start": 1, "end": 8}}, {"action": "arrangement_set_locator", "args": {"name": "A", "time": 16}}, {"action": "arrangement_jump_to_locator", "args": {"name": "A"}}, {"action": "quantize_clip", "args": {"track": 1, "slot": 1, "grid": "1/16", "amount": 1}}],safety:{mutating:true,requiresExecuteFlag:true}};
 const result=validatePlan(plan);
 assert.equal(result.ok,true,result.errors.join('\n'));
});
