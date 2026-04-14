import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS } from '../src/actions.js';

test('action registry entries have required metadata shape', () => {
  for (const [name, def] of Object.entries(ACTIONS)) {
    assert.equal(typeof name, 'string');
    assert.equal(typeof def.mutating, 'boolean', `${name}: mutating`);
    assert.ok(Array.isArray(def.args), `${name}: args array`);
    assert.equal(typeof def.category, 'string', `${name}: category`);
    assert.equal(typeof def.batch, 'number', `${name}: batch`);
    assert.equal(typeof def.description, 'string', `${name}: description`);
    assert.equal(typeof def.validate, 'function', `${name}: validate`);
  }
});
