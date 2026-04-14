import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../src/index.js');

test('help command prints usage and key sections', () => {
  const out = execFileSync('node', [cliPath, 'help'], { encoding: 'utf8' });
  assert.match(out, /Usage:/);
  assert.match(out, /Commands:/);
  assert.match(out, /Examples:/);
});

test('actions --short prints slash-style action names', () => {
  const out = execFileSync('node', [cliPath, 'actions', '--short'], { encoding: 'utf8' });
  assert.match(out, /\/create_track/);
  assert.match(out, /\/transport_play/);
});

test('actions --category transport filters output', () => {
  const out = execFileSync('node', [cliPath, 'actions', '--category', 'transport'], { encoding: 'utf8' });
  assert.match(out, /transport_play/);
  assert.doesNotMatch(out, /create_track/);
});

test('actions --batch 2 filters output to batch 2 actions', () => {
  const out = execFileSync('node', [cliPath, 'actions', '--batch', '2'], { encoding: 'utf8' });
  assert.match(out, /fire_scene/);
  assert.doesNotMatch(out, /transport_play/);
});
