import test from 'node:test';
import assert from 'node:assert/strict';
import { planFromIntent } from '../src/planner.js';

test('planner maps core intent to expected ordered actions', () => {
  const plan = planFromIntent('make a new midi track load drum rack arm track and start recording then play');
  assert.equal(plan.actions.length, 5);
  assert.deepEqual(plan.actions.map(a => a.action), [
    'create_track',
    'load_device',
    'arm_track',
    'transport_record',
    'transport_play'
  ]);
});

test('planner throws on unmappable intent', () => {
  assert.throws(() => planFromIntent('do something mysterious'), /No mappable actions found/);
});
