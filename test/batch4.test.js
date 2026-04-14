import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';
import { validatePlan } from '../src/validator.js';

const intent = 'list devices on track 2 then set device 1 parameter cutoff to 0.62 and enable device 1';

test('batch4 planner maps device actions', () => {
  const plan = planFromIntent(intent);
  const names = plan.actions.map(a => a.action);
  assert.ok(names.includes('list_devices'));
  assert.ok(names.includes('set_device_parameter'));
  assert.ok(names.includes('enable_device'));
});

test('batch4 validator accepts device action args', () => {
  const plan = {
    version: '0.1',
    intent: 'batch4 validation',
    adapter: 'showcontrol-osc',
    actions: [
      { action: 'list_devices', args: { track: 2 } },
      { action: 'set_device_parameter', args: { track: 2, device: 1, parameter: 'cutoff', value: 0.62 } },
      { action: 'enable_device', args: { track: 2, device: 1, value: true } }
    ],
    safety: { mutating: true, requiresExecuteFlag: true }
  };

  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
