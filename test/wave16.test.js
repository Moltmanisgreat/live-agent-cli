import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validator.js';

test('wave16 actions are supported by validator', () => {
 const plan={version:'0.1',intent:'wave16',adapter:'showcontrol-osc',actions:[{"action": "watch_clip", "args": {"track": 1, "slot": 1, "fields": ["is_playing"]}}, {"action": "watch_device", "args": {"track": 1, "device": 1, "params": ["cutoff"]}}],safety:{mutating:false,requiresExecuteFlag:false}};
 const result=validatePlan(plan);
 assert.equal(result.ok,true,result.errors.join('\n'));
});
