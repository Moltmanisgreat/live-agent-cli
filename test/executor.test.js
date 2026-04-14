import test from 'node:test';
import assert from 'node:assert/strict';
import { executePlan } from '../src/executor.js';
import { DryRunAdapter } from '../src/adapters/dryrun.js';

const mutatingPlan = {
  version: '0.1',
  intent: 'create and play',
  adapter: 'showcontrol-osc',
  actions: [
    { action: 'create_track', args: { type: 'midi' } },
    { action: 'transport_play', args: {} }
  ],
  safety: { mutating: true, requiresExecuteFlag: true }
};

test('executor dry-runs mutating plan without --execute', async () => {
  const result = await executePlan(mutatingPlan, new DryRunAdapter(), { execute: false });
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.steps.length, 2);
  assert.match(result.warnings[0], /Re-run with --execute/);
});

test('executor executes steps with --execute', async () => {
  const result = await executePlan(mutatingPlan, new DryRunAdapter(), { execute: true });
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'execute');
  assert.equal(result.steps.length, 2);
});
