import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validator.js';

test('wave14 actions are supported by validator', () => {
 const plan={version:'0.1',intent:'wave14',adapter:'showcontrol-osc',actions:[{"action": "browser_list_categories", "args": {}}, {"action": "browser_preview", "args": {"item": "kick", "value": true}}, {"action": "browser_load_to_selected_track", "args": {"item": "kick"}}, {"action": "browser_load_sample_to_clip", "args": {"track": 1, "slot": 1, "file": "kick.wav"}}, {"action": "save_plan", "args": {"path": "plan.json"}}, {"action": "load_plan", "args": {"path": "plan.json"}}, {"action": "dry_run_validate", "args": {"plan": {"actions": []}}}, {"action": "execute_plan", "args": {"plan": {"actions": []}}}],safety:{mutating:true,requiresExecuteFlag:true}};
 const result=validatePlan(plan);
 assert.equal(result.ok,true,result.errors.join('\n'));
});
