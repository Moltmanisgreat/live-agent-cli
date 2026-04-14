import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validator.js';

test('wave13 actions are supported by validator', () => {
 const plan={version:'0.1',intent:'wave13',adapter:'showcontrol-osc',actions:[{"action": "select_device", "args": {"track": 1, "device": 1}}, {"action": "select_rack_chain", "args": {"track": 1, "device": 1, "chain": 1}}, {"action": "enable_rack_chain", "args": {"track": 1, "device": 1, "chain": 1, "value": true}}, {"action": "set_macro", "args": {"track": 1, "device": 1, "macro": "Macro 1", "value": 0.7}}],safety:{mutating:true,requiresExecuteFlag:true}};
 const result=validatePlan(plan);
 assert.equal(result.ok,true,result.errors.join('\n'));
});
