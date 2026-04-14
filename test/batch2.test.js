import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'create scene then fire scene 1 then fire clip on track 2 slot 3 then set clip loop on track 2 slot 3 from 1 to 4';

test('batch2 planner maps scene + clip actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('create_scene'));
  assert.ok(names.includes('fire_scene'));
  assert.ok(names.includes('fire_clip'));
  assert.ok(names.includes('set_clip_loop'));
});

test('batch2 validator accepts clip/scene action args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch2 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'create_scene', args: { index: 1 } },
      { action: 'fire_scene', args: { scene: 1 } },
      { action: 'fire_clip', args: { track: 2, slot: 3 } },
      { action: 'set_clip_loop', args: { track: 2, slot: 3, start: 1, end: 4, enabled: true } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };

  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
