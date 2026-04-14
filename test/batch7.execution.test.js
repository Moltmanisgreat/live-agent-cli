import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validator.js';

test('batch7 execution guard accepts cautious confirmation policy', () => {
  const plan = {
    version: '0.1',
    intent: 'set confirmation policy to cautious',
    adapter: 'remotescript',
    actions: [
      { action: 'set_confirmation_policy', args: { value: 'cautious' } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };

  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
