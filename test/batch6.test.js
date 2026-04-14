import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'set arrangement position to 32 enable loop from 16 to 24 and enable punch in and punch out';

test('batch6 planner maps arrangement actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('set_arrangement_position'));
  assert.ok(names.includes('set_loop_region'));
  assert.ok(names.includes('set_punch_in'));
  assert.ok(names.includes('set_punch_out'));
});

test('batch6 validator accepts arrangement args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch6 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'set_arrangement_position', args: { value: 32 } },
      { action: 'set_loop_region', args: { start: 16, end: 24, enabled: true } },
      { action: 'set_punch_in', args: { value: true } },
      { action: 'set_punch_out', args: { value: true } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };
  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
