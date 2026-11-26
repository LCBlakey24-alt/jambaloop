import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAROUSEL_REACH, carouselInfo, carouselOffsets, carouselView, wrapIndex } from '../public/game-carousel.js';
import { modes } from '../public/game-config.js';
import { lobbyView } from '../public/game-views.js';

test('the shelf is circular: every card takes its shortest signed distance from the centre', () => {
  assert.deepEqual(carouselOffsets(7, 0), [0, 1, 2, 3, -3, -2, -1]);
  assert.deepEqual(carouselOffsets(19, 18).slice(0, 3), [1, 2, 3]);
  assert.equal(carouselOffsets(19, 18)[17], -1);
  for (const count of [1, 2, 6, 19]) for (let index = 0; index < count; index++) {
    const offsets = carouselOffsets(count, index);
    assert.equal(offsets[index], 0);
    assert.equal(new Set(offsets).size, count, 'no two cards share a slot');
    assert.ok(offsets.every(offset => Math.abs(offset) <= count / 2));
  }
  assert.equal(wrapIndex(-1, 19), 18);
  assert.equal(wrapIndex(19, 19), 0);
});

test('only nearby cards are reachable; the centre one is current and speaks its show', () => {
  const html = carouselView(modes, 0, false);
  assert.equal(html.match(/class="carousel-card"/g).length, modes.length);
  assert.equal(html.match(/aria-current="true"/g).length, 1);
  assert.equal(html.match(/tabindex="-1" aria-hidden="true"/g).length, modes.length - (2 * CAROUSEL_REACH + 1));
  const info = carouselInfo(modes.find(([id]) => id === 'cards'), false);
  assert.match(info, /--id-display:'Show Cards'/);
  // The landing page only starts parties; this one opens on Fill the Blank.
  assert.match(info, /data-action="party" data-mode="cards"/);
  assert.match(info, /aria-pressed="false"/, 'voice guide starts off');
  assert.match(carouselInfo(modes[0], true), /aria-pressed="true"/);
  assert.match(carouselInfo(['x', '<b>', '<i>'], false), /&#60;b&#62;/, 'escaped copy');
});

test('the captain can flick between games from the lobby; saved quizzes are left alone', () => {
  const base = { mode: 'classic', isCaptain: true, players: [], playerCount: 1, connected: 1, code: '123456', game: 1,
    player: { name: 'Ada', ready: false }, scoring: { base: 500 }, total: 5, seconds: 20, phoneView: 'answers' };
  const helpers = { host: false, escape: String, icons: () => '', modeName: id => modes.find(([key]) => key === id)?.[1] ?? id };
  const phone = lobbyView(base, helpers);
  assert.match(phone, /data-action="lobby-mode" data-mode="sketch"/, 'wraps round to the last game');
  assert.match(phone, /data-action="lobby-mode" data-mode="wheel"/);
  assert.doesNotMatch(lobbyView({ ...base, isCaptain: false }, helpers), /data-action="lobby-mode"/, 'only the captain or TV switches');
  assert.doesNotMatch(lobbyView({ ...base, quizTitle: 'My quiz' }, helpers), /data-action="lobby-mode"/);
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /api\('\/' \+ session\.code \+ '\/configure', \{ \.\.\.queuedSettings\(button\.dataset\.mode, state\.theme\), game: state\.game, lobbyVersion: state\.lobbyVersion \}\)/);
  // Voice is opt-in and waits for the shelf to settle.
  assert.match(app, /if \(carouselVoice\) carouselTimer = setTimeout/);
});
