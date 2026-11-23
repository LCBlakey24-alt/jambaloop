import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { modes } from '../public/game-config.js';
import { launcherSteps } from '../public/home-launcher.js';
import { lobbyView } from '../public/game-views.js';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const icons = name => `<span data-icon="${name}"></span>`;

test('all game modes have three original, readable player-lobby steps', () => {
  for (const [id, label] of modes) {
    const steps = launcherSteps(id);
    assert.equal(steps.length, 3, label + ' should have three useful tutorial steps');
    assert.ok(steps.every(text => text.length >= 22 && text.length <= 240), label + ' instructions must be concise');
    assert.equal(new Set(steps).size, steps.length, label + ' must not repeat a step');
  }
});

test('player lobby offers optional rules without hiding the Ready control', () => {
  const state = {
    code: '654321', game: 1, mode: 'samepage', total: 5,
    connected: 3, playerCount: 3, readyCount: 1, isCaptain: false,
    playStyle: 'individual', player: { name: 'Test Player', ready: false },
  };
  const html = lobbyView(state, { host: false, escape, icons, modeName: () => 'Same Page' });
  assert.match(html, /<details class="player-game-guide">/);
  assert.match(html, /How to play <strong>Same Page<\/strong>/);
  for (const step of launcherSteps('samepage')) assert.ok(html.includes(escape(step)));
  assert.match(html, /data-action="ready-toggle"/);
  assert.match(html, /1 of 3 ready/);
  assert.match(html, /data-action="practice"/);
  assert.doesNotMatch(html, /<details class="player-game-guide" open/);
});

test('join screen collects only a room code and nickname as required fields', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const section = app.split("} else if (mode === 'join') {")[1]?.split("} else {")[0];
  assert.ok(section, 'Join dialog should exist');
  assert.match(section, /id="join-form"/);
  assert.match(section, /id="join-room-code"/);
  assert.match(section, /pattern="\[0-9\]\{6\}"/);
  assert.match(section, /id="join-player-name"/);
  assert.match(section, /<details class="join-photo-option">/);
  assert.match(section, /class="join-room-submit" type="submit"/);
  assert.match(app, /document\.addEventListener\('paste', event =>/);
});
