import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';

test('batch7 save-as alone does not append project_save', () => {
  const plan = planFromIntent('save set as watchdog_test.als');
  assert.deepEqual(plan.actions, [
    { action: 'project_save_as', args: { path: 'watchdog_test.als', confirm: true } }
  ]);
});

test('batch7 save-as can still chain into explicit save project', () => {
  const plan = planFromIntent('save set as watchdog_test.als and save project');
  assert.deepEqual(plan.actions, [
    { action: 'project_save_as', args: { path: 'watchdog_test.als', confirm: true } },
    { action: 'project_save', args: { confirm: true } }
  ]);
});
