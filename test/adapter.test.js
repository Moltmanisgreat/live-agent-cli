import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../src/index.js');

test('adapters command lists available backends', () => {
  const out = execFileSync('node', [cliPath, 'adapters', '--json'], { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.ok(parsed.adapters.some((a) => a.name === 'showcontrol-osc'));
  assert.ok(parsed.adapters.some((a) => a.name === 'max4live'));
});

test('run with max4live adapter fails preflight with clear message', () => {
  let err;
  try {
    execFileSync('node', [cliPath, 'run', 'set tempo to 120', '--execute', '--adapter', 'max4live', '--json'], { encoding: 'utf8' });
  } catch (e) {
    err = e;
  }
  assert.ok(err);
  const stderr = err.stderr?.toString() ?? '';
  const stdout = err.stdout?.toString() ?? '';
  assert.match(stdout + stderr, /not connected yet|not implemented/i);
});
