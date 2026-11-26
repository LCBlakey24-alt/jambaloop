import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceCatchUp, publicCatchUp, startCatchUp, submitCatchUp, CATCH_UP_FREEZE_MS } from '../catch-up.js';

function table(size) {
  const room = { mode: 'catchup', game: 1, phase: 'lobby', category: 'mixed', includeChristmas: false, seen: new Set(), players: new Map(), lastSeen: new Map(), liveConnections: new Map(), waiting: new Map(), host: 'host', pausedAt: 0, ends: 0 };
  for (let i = 0; i < size; i++) { room.players.set('k' + i, { id: 'p' + i, name: 'Player ' + i, score: 0, wins: 0 }); room.lastSeen.set('k' + i, Date.now()); }
  const publish = () => {};
  startCatchUp(room, publish);
  const party = room.party;
  const answer = (key, right = true) => {
    const option = right ? party.question.correct : (party.question.correct + 1) % party.question.options.length;
    return submitCatchUp(room, key, { game: 1, action: 'answer', step: party.step, option }, publish);
  };
  const go = () => advanceCatchUp(room, publish);
  return { room, party, answer, go, stop: () => clearTimeout(room.deadline) };
}

test('two balanced sides; one runs, the other chases, then they swap', () => {
  const { room, party, answer, go, stop } = table(5);
  assert.deepEqual(party.sides.map(side => side.keys.length).sort(), [2, 3]);
  assert.equal(room.phase, 'catch-ready');
  const [a, b] = party.sides.map(side => side.keys[0]);
  // Round 1: side 0 runs and gets three.
  go();
  assert.equal(room.phase, 'catch-leg');
  assert.ok(room.ends > Date.now(), 'the server owns the clock');
  assert.equal(answer(b)[0], 403, 'the other side cannot answer during the run');
  for (let i = 0; i < 3; i++) assert.deepEqual(answer(a), [204]);
  go();
  assert.equal(room.phase, 'catch-ready');
  assert.equal(publicCatchUp(room, 'host').target, 3);
  // Side 1 chases: matching the target is not enough.
  go();
  assert.equal(answer(a)[0], 403);
  for (let i = 0; i < 3; i++) answer(b);
  go();
  assert.equal(room.phase, 'catch-result');
  let view = publicCatchUp(room, 'host');
  assert.deepEqual([view.result.target, view.result.chase, view.result.caught, view.result.winner], [3, 3, false, 0]);
  // Round 2: the sides swap; side 1 runs, side 0 chases and beats it.
  go();
  assert.equal(publicCatchUp(room, 'host').runner, 1);
  go(); answer(b); go();
  go(); answer(a); answer(a); go();
  view = publicCatchUp(room, 'host');
  assert.deepEqual([view.result.target, view.result.chase, view.result.caught, view.result.winner], [1, 2, true, 0]);
  go();
  assert.equal(room.phase, 'finished');
  assert.equal(publicCatchUp(room, 'host').champion, 0);
  assert.equal(room.players.get(a).score, 400 + 5 * 20, 'two round wins plus twenty per correct answer');
  stop();
});

test('the answer key never leaves the server, and a wrong answer freezes the side', () => {
  const { room, party, answer, go, stop } = table(4);
  go();
  const key = party.sides[0].keys[0];
  for (const viewer of ['host', key, party.sides[1].keys[0]]) {
    const view = publicCatchUp(room, viewer);
    assert.ok(view.question.options.length >= 2);
    assert.ok(!('correct' in view.question), 'no answer key in the question');
    assert.equal(view.last, undefined);
    assert.ok(!JSON.stringify(view).includes('"k'), 'no private player keys');
  }
  assert.equal(publicCatchUp(room, key).canAnswer, true);
  assert.equal(publicCatchUp(room, party.sides[1].keys[0]).canAnswer, false);
  const before = party.step;
  assert.deepEqual(answer(key, false), [204]);
  assert.equal(party.count, 0);
  assert.equal(party.step, before + 1, 'a wrong answer still moves to a new question');
  assert.equal(publicCatchUp(room, 'host').last.correct, false);
  assert.ok(publicCatchUp(room, 'host').frozenFor > CATCH_UP_FREEZE_MS - 500);
  assert.equal(answer(key)[0], 409, 'no answers while frozen');
  assert.equal(submitCatchUp(room, key, { game: 1, action: 'answer', step: before, option: 0 }, () => {})[0], 409, 'a stale question is rejected');
  stop();
});

test('late joiners watch, and one player is not enough', () => {
  const { room, go, stop } = table(4);
  go();
  room.players.set('late', { id: 'late-id', name: 'Late', score: 0, wins: 0 });
  assert.equal(submitCatchUp(room, 'late', { game: 1, action: 'answer', step: room.party.step, option: 0 }, () => {})[0], 403);
  assert.equal(publicCatchUp(room, 'late').side, undefined);
  stop();
  const solo = table(1);
  assert.equal(solo.room.phase, 'finished');
});
