import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'set tempo to 128 set time signature to 7/8 enable metronome and set global quantization to 1/16';

test('batch7 planner maps global state actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('set_tempo'));
  assert.ok(names.includes('set_time_signature'));
  assert.ok(names.includes('set_metronome'));
  assert.ok(names.includes('set_global_quantization'));
});

test('batch7 validator accepts global state args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch7 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'set_tempo', args: { value: 128 } },
      { action: 'set_time_signature', args: { numerator: 7, denominator: 8 } },
      { action: 'set_metronome', args: { value: true } },
      { action: 'set_global_quantization', args: { value: '1/16' } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };
  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
