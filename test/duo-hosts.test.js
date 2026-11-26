import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { modes } from '../public/game-config.js';
import { duoClip, duoIntros, hosts, recordedDuos } from '../public/duo-scripts.js';

test('every game has a short Double Act intro where both hosts take turns', () => {
  assert.deepEqual(Object.keys(duoIntros).sort(), modes.map(([id]) => id).sort());
  for (const [mode, lines] of Object.entries(duoIntros)) {
    assert.ok(lines.length >= 3 && lines.length <= 6, mode);
    assert.deepEqual([...new Set(lines.map(([host]) => host))].sort(), Object.keys(hosts).sort(), `${mode}: both hosts speak`);
    for (let i = 1; i < lines.length; i++) assert.notEqual(lines[i][0], lines[i - 1][0], `${mode}: hosts alternate`);
    for (const [, text] of lines) assert.ok(text.length > 0 && text.length <= 140, `${mode}: short, captionable lines`);
  }
});

test('a game is marked recorded only when every clip is committed', () => {
  for (const mode of recordedDuos) duoIntros[mode].forEach((_, index) =>
    assert.ok(existsSync(new URL('../public' + duoClip(mode, index), import.meta.url)), `${mode} clip ${index + 1}`));
});

test('captions always show the exact line, and nothing is generated at runtime', () => {
  const narrator = readFileSync(new URL('../public/narrator.js', import.meta.url), 'utf8');
  assert.match(narrator, /showCaption\(host, text\)/);
  assert.doesNotMatch(narrator, /elevenlabs\.io|xi-api-key/i, 'no API calls from the browser');
});
