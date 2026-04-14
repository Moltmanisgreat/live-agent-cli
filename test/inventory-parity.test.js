import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTIONS } from '../src/actions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadInventoryActions() {
  const p = path.resolve(__dirname, '../docs/COMMAND_INVENTORY.md');
  const text = fs.readFileSync(p, 'utf8');
  const out = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const m = line.match(/^-\s+([a-zA-Z0-9_]+)/);
    if (!m) continue;
    const name = m[1];
    if (name[0] === name[0]?.toLowerCase()) out.add(name);
  }
  return out;
}

test('all inventory actions exist in ACTIONS registry', () => {
  const inventory = loadInventoryActions();
  const implemented = new Set(Object.keys(ACTIONS));
  const missing = [...inventory].filter((a) => !implemented.has(a));
  assert.equal(missing.length, 0, `Missing actions: ${missing.join(', ')}`);
});
