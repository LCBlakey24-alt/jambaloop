import test from 'node:test';
import assert from 'node:assert/strict';
import { modes } from '../public/game-config.js';
import { releasedGameIds } from '../released-games.js';

test('launcher catalogue matches the explicit released game list', () => {
  assert.deepEqual(modes.map(([id]) => id), [...releasedGameIds]);
  assert.equal(new Set(releasedGameIds).size, releasedGameIds.length, 'Game IDs must be unique');
  // The eighteen original games stay registered alongside So Close.
  for (const id of ['classic', 'wheel', 'board', 'dice', 'knockout', 'punchline', 'cards', 'tracks', 'bluff',
    'potato', 'quizrace', 'showdown', 'samepage', 'spotlight', 'brain', 'topanswers', 'rare', 'sketch']) {
    assert.ok(releasedGameIds.includes(id), id + ' must remain released');
  }
});
