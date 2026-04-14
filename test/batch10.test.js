import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'run macro quick_drum_record and set confirmation policy to strict';

test('batch10 planner maps macro and policy actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('run_macro'));
  assert.ok(names.includes('set_confirmation_policy'));
});

test('batch10 validator accepts macro/policy args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch10 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'run_macro', args: { name: 'quick_drum_record' } },
      { action: 'set_confirmation_policy', args: { value: 'strict' } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };
  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
