import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceShade, publicShade, startShade, submitShade, SHADE_MAX_ROUNDS } from '../shade-game.js';
import { SHADE_COLUMNS, SHADE_ROWS, shadeColour, shadeDistance, shadeName, shadePoints, validSquare } from '../public/shade-grid.js';

function table(size) {
  const room = { mode: 'shade', game: 1, phase: 'lobby', players: new Map(), lastSeen: new Map(), liveConnections: new Map(), waiting: new Map(), host: 'host', pausedAt: 0, ends: 0, index: 0 };
  for (let i = 0; i < size; i++) { room.players.set('k' + i, { id: 'p' + i, name: 'Player ' + i, score: 0, wins: 0 }); room.lastSeen.set('k' + i, Date.now()); }
  const publish = () => {};
  startShade(room, publish);
  // A fixed target well inside the board, so offsets in these tests always land on it.
  if (room.party) room.party.target = [10, 8];
  const guess = (key, square) => submitShade(room, key, { game: 1, action: 'guess', step: room.party.step, square }, publish);
  return { room, guess, go: () => advanceShade(room, publish) };
}
const offset = (target, dc, dr) => [target[0] + dc, target[1] + dr];

test('the board: 480 distinct squares, named by row letter and column number', () => {
  const colours = new Set();
  for (let c = 0; c < SHADE_COLUMNS; c++) for (let r = 0; r < SHADE_ROWS; r++) colours.add(shadeColour(c, r));
  assert.equal(colours.size, SHADE_COLUMNS * SHADE_ROWS, 'no two squares are the same colour');
  assert.equal(shadeName(0, 0), 'A1');
  assert.equal(shadeName(29, 15), 'P30');
  assert.ok(validSquare([29, 15]) && !validSquare([30, 0]) && !validSquare([0, -1]) && !validSquare([1.5, 2]) && !validSquare('A1'));
  assert.deepEqual([0, 1, 2, 3].map(shadePoints), [3, 2, 1, 0], 'exact 3, one away 2, two away 1');
  assert.equal(shadeDistance([5, 5], [6, 4]), 1, 'diagonals count as one step');
});

test('the target is the clue-giver’s secret until the reveal', () => {
  const { room, go } = table(4);
  const giver = room.party.giver;
  const other = [...room.players.keys()].find(key => key !== giver);
  assert.equal(room.phase, 'shade-clue');
  assert.deepEqual(publicShade(room, giver).target, room.party.target, 'the clue-giver sees it');
  assert.equal(publicShade(room, other).target, undefined, 'a guesser does not');
  assert.equal(publicShade(room, 'host').target, undefined, 'nor does the TV');
  assert.equal(JSON.stringify(publicShade(room, 'host')).includes(JSON.stringify(room.party.target)), false, 'it is nowhere in the TV state');
  go(); go(); go();
  assert.equal(room.phase, 'shade-reveal');
  assert.deepEqual(publicShade(room, 'host').target, room.party.target);
});

test('one guess after each of three one-word clues, and the round moves on by itself', () => {
  const { room, guess } = table(3);
  const { giver, target } = room.party;
  const [a, b] = [...room.players.keys()].filter(key => key !== giver);
  assert.equal(guess(giver, target)[0], 403, 'the clue-giver cannot guess');
  assert.equal(guess(a, [99, 0])[0], 400);
  assert.equal(guess(a, target)[0], 204);
  assert.equal(guess(a, offset(target, 1, 0))[0], 409, 'only one guess on the first clue');
  assert.equal(publicShade(room, 'host').guesses.length, 1, 'guesses land on the shared board');
  assert.equal(publicShade(room, a).left, 0);
  assert.equal(guess(b, offset(target, 2, 2))[0], 204);
  assert.equal(room.phase, 'shade-clue2', 'everyone has guessed, so the second word opens');
  assert.equal(publicShade(room, a).left, 1);
  assert.equal(publicShade(room, 'host').clue, 2);
  assert.equal(guess(a, target)[0], 409, 'not the same square twice');
  assert.equal(guess(a, offset(target, 1, 1))[0], 204);
  assert.equal(guess(a, offset(target, 3, 0))[0], 409, 'one guess per word');
  assert.equal(guess(b, offset(target, -1, 0))[0], 204);
  assert.equal(room.phase, 'shade-clue3', 'then the third word');
  assert.equal(guess(a, offset(target, 3, 0))[0], 204);
  assert.equal(room.phase, 'shade-clue3');
  assert.equal(guess(b, offset(target, 0, -2))[0], 204);
  assert.equal(room.phase, 'shade-reveal', 'all guesses in, so the square is revealed');
});

test('scoring: 3, 2, 1 by distance, and the clue-giver earns one per guess on or beside the target', () => {
  const { room, guess } = table(3);
  const { giver, target } = room.party;
  const [a, b] = [...room.players.keys()].filter(key => key !== giver);
  guess(a, target); guess(b, offset(target, 2, 0));
  guess(a, offset(target, 1, 1)); guess(b, offset(target, -1, 0));
  guess(a, offset(target, 3, 3)); guess(b, offset(target, 0, 2));
  assert.equal(room.players.get(a).score, 3 + 2 + 0);
  assert.equal(room.players.get(b).score, 1 + 2 + 1);
  assert.equal(room.players.get(giver).score, 3, 'three guesses were on or beside the target');
  const result = publicShade(room, 'host').result;
  assert.deepEqual(result.rows.map(row => row.points), [5, 4]);
  assert.equal(result.giverPoints, 3);
  assert.equal(publicShade(room, a).earned, undefined, 'totals wait for the end');
});

test('everyone gives clues once (up to a cap), then the game ends; a stale or late action is refused', () => {
  const { room, guess, go } = table(3);
  const givers = [];
  for (let round = 0; round < 3; round++) {
    givers.push(room.party.giver);
    assert.equal(room.index, round);
    const stale = room.party.step - 1;
    assert.equal(submitShade(room, 'k0', { game: 1, action: 'guess', step: stale, square: [1, 1] }, () => {})[0] >= 403, true);
    go(); go(); go();
    assert.equal(room.phase, 'shade-reveal');
    assert.equal(guess('k1', [2, 2])[0], 409, 'no guessing at the reveal');
    go();
  }
  assert.equal(new Set(givers).size, 3, 'a different clue-giver every round');
  assert.equal(room.phase, 'finished');
  assert.equal(typeof publicShade(room, 'k0').earned, 'number');
  assert.equal(submitShade(room, 'k0', { game: 2, action: 'guess', step: 1, square: [1, 1] }, () => {})[0], 409);
  const big = table(12);
  assert.equal(big.room.count, SHADE_MAX_ROUNDS, 'a big room does not run all night');
  assert.equal(table(1).room.phase, 'finished', 'not enough players to play');
});
