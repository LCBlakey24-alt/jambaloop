import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { modes } from '../public/game-config.js';
import { duoIntros, hosts, skipQuips, spoken, welcomeBack, welcomeScript } from '../public/duo-scripts.js';
import { duoRecordings, duoTake } from '../public/duo-recordings.js';

test('every game has a short Double Act intro where both hosts take turns', () => {
  assert.deepEqual(Object.keys(duoIntros).sort(), modes.map(([id]) => id).sort());
  for (const [mode, lines] of Object.entries(duoIntros)) {
    assert.ok(lines.length >= 3 && lines.length <= 6, mode);
    assert.deepEqual([...new Set(lines.map(([host]) => host))].sort(), Object.keys(hosts).sort(), `${mode}: both hosts speak`);
    for (let i = 1; i < lines.length; i++) assert.notEqual(lines[i][0], lines[i - 1][0], `${mode}: hosts alternate`);
    for (const [, text] of lines) assert.ok(spoken(text).length > 0 && spoken(text).length <= 140, `${mode}: short, captionable lines`);
  }
});

test('every recording is committed and has one timing per scripted line', () => {
  const scripts = { ...duoIntros, welcome: welcomeScript, 'welcome-back': welcomeBack,
    ...Object.fromEntries(skipQuips.map((lines, index) => [`skip-${index + 1}`, lines])) };
  for (const [key, timings] of Object.entries(duoRecordings)) {
    assert.ok(scripts[key], `${key} is a known script`);
    assert.ok(existsSync(new URL('../public' + duoTake(key), import.meta.url)), `${key}.mp3 is committed`);
    assert.equal(timings.length, scripts[key].length, `${key}: one timing per line`);
    timings.forEach(([start, end], index) => {
      assert.ok(end > start, `${key} line ${index + 1} has length`);
      if (index) assert.ok(start >= timings[index - 1][0], `${key} lines are in order`);
    });
  }
});

test('mood tags guide the voice but never reach the caption', () => {
  assert.equal(spoken('[excited] Ladies and gentlemen... it\'s [laughs] Knockout!'), 'Ladies and gentlemen... it\'s Knockout!');
  for (const lines of [...Object.values(duoIntros), welcomeScript, welcomeBack, ...skipQuips])
    for (const [, text] of lines) assert.doesNotMatch(spoken(text), /[\[\]]/);
});

test('captions always show the exact line, and nothing is generated at runtime', () => {
  const narrator = readFileSync(new URL('../public/narrator.js', import.meta.url), 'utf8');
  assert.match(narrator, /showCaption\(host, text\)/);
  assert.doesNotMatch(narrator, /elevenlabs\.io|xi-api-key/i, 'no API calls from the browser');
});

test('the Jambaloop welcome: both hosts, alternating, each line paired with a TV scene', async () => {
  const show = readFileSync(new URL('../public/welcome-show.js', import.meta.url), 'utf8');
  for (let i = 0; i < welcomeScript.length; i++) {
    const [host, text, scene] = welcomeScript[i];
    assert.ok(hosts[host] && spoken(text).length <= 140, `line ${i + 1}`);
    if (i) assert.notEqual(host, welcomeScript[i - 1][0], `line ${i + 1} alternates`);
    assert.match(show, new RegExp(`\\b${scene}: `), `scene ${scene} is drawn`);
  }
  assert.ok(/phone/i.test(welcomeScript.map(([, text]) => text).join(' ')), 'explains phones as controllers');
  assert.ok(/captain/i.test(welcomeScript.map(([, text]) => text).join(' ')), 'explains the captain');
});
