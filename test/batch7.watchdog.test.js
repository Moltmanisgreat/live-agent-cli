import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';

test('watchdog batch7 planner coverage preserves full macro name phrase', () => {
  const plan = planFromIntent('run macro create track and play');
  assert.deepEqual(plan.actions, [
    { action: 'run_macro', args: { name: 'create track and play' } }
  ]);
});

test('watchdog batch7 planner coverage keeps macro and policy separate', () => {
  const plan = planFromIntent('run macro create track and play then set confirmation policy to cautious');
  assert.deepEqual(plan.actions, [
    { action: 'run_macro', args: { name: 'create track and play' } },
    { action: 'set_confirmation_policy', args: { value: 'cautious' } }
  ]);
});
