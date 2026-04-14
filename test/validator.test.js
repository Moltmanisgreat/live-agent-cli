import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validator.js';

test('validator accepts valid plan', () => {
  const plan = {
    version: '0.1',
    intent: 'test',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'create_track', args: { type: 'midi' } },
      { action: 'transport_play', args: {} }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };
  const result = validatePlan(plan);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validator rejects unsupported action', () => {
  const plan = {
    version: '0.1',
    intent: 'test',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'hack_live', args: {} }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };
  const result = validatePlan(plan);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /unsupported action/);
});
