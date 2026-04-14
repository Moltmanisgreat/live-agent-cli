import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'watch tempo and track 2 volume then list watches and unwatch watch-1';

test('batch9 planner maps watch actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('watch_song'));
  assert.ok(names.includes('watch_track'));
  assert.ok(names.includes('watch_list'));
  assert.ok(names.includes('unwatch'));
});

test('batch9 validator accepts watch args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch9 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'watch_song', args: { fields: ['tempo', 'is_playing'] } },
      { action: 'watch_track', args: { track: 2, fields: ['volume'] } },
      { action: 'watch_list', args: {} },
      { action: 'unwatch', args: { id: 'watch-1' } }
    ],
    safety: { mutating: false, requiresExecuteFlag: false }
  };
  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
