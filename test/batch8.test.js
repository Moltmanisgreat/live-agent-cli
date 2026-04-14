import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'new set then save as my_new_song and save project';

test('batch8 planner maps project lifecycle actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('project_new'));
  assert.ok(names.includes('project_save_as'));
  assert.ok(names.includes('project_save'));
});

test('batch8 validator accepts project lifecycle args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch8 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'project_new', args: { confirm: true } },
      { action: 'project_save_as', args: { path: 'my_new_song.als', confirm: true } },
      { action: 'project_save', args: { confirm: true } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };
  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
