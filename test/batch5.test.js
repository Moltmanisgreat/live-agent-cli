import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'search browser for 808 kick then load item 1 to track 3 and load preset bass mono on operator';

test('batch5 planner maps browser/loading actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('browser_search'));
  assert.ok(names.includes('browser_load_to_track'));
  assert.ok(names.includes('browser_load_preset'));
});

test('batch5 validator accepts browser/loading args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch5 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'browser_search', args: { query: '808 kick' } },
      { action: 'browser_load_to_track', args: { item: '1', track: 3 } },
      { action: 'browser_load_preset', args: { device: 'Operator', preset: 'Bass Mono' } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };

  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
