import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'set track 2 volume to 0.75 pan to -0.2 send A to 0.5 and mute track 2';

test('batch3 planner maps mixer actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('set_volume'));
  assert.ok(names.includes('set_pan'));
  assert.ok(names.includes('set_send'));
  assert.ok(names.includes('mute_track'));
});

test('batch3 validator accepts mixer args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch3 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'set_volume', args: { track: 2, value: 0.75 } },
      { action: 'set_pan', args: { track: 2, value: -0.2 } },
      { action: 'set_send', args: { track: 2, send: 'A', value: 0.5 } },
      { action: 'mute_track', args: { track: 2, value: true } },
      { action: 'solo_track', args: { track: 2, value: false } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };

  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
