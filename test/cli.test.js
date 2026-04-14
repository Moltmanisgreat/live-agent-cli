import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../src/index.js');

test('cli actions returns JSON with known actions', () => {
  const out = execFileSync('node', [cliPath, 'actions', '--json'], { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.ok(parsed.actions.some(a => a.action === 'create_track'));
});

test('cli plan returns JSON plan for known intent', () => {
  const out = execFileSync('node', [cliPath, 'plan', 'make a new midi track and play', '--json'], { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.equal(parsed.version, '0.1');
  assert.ok(parsed.actions.length >= 2);
});
