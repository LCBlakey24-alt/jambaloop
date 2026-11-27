import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceLook, expireLook, publicLook, startLook, submitLook, LOOK_MAX_TURNS } from '../dont-look.js';
import { lookDecks } from '../dont-look-words.js';

function table(size) {
  const room = { mode: 'dontlook', game: 1, phase: 'lobby', seen: new Set(), players: new Map(), lastSeen: new Map(), liveConnections: new Map(), waiting: new Map(), host: 'host', pausedAt: 0, ends: 0, index: 0 };
  for (let i = 0; i < size; i++) { room.players.set('k' + i, { id: 'p' + i, name: 'Player ' + i, score: 0, wins: 0 }); room.lastSeen.set('k' + i, Date.now()); }
  const publish = () => {};
  startLook(room, publish);
  const send = (key, data) => submitLook(room, key, { game: 1, ...data }, publish);
  const mark = (key, result = 'correct') => send(key, { action: 'mark', step: room.party.step, result });
  const turn = () => room.party.turns[room.party.turn];
  const describer = () => room.party.teams[turn().team].keys.find(key => key !== turn().guesser);
  return { room, send, mark, turn, describer, go: () => advanceLook(room, publish), stop: () => clearTimeout(room.deadline) };
}

test('the decks: plenty of distinct, short, family words', () => {
  const words = Object.values(lookDecks).flat();
  assert.ok(Object.keys(lookDecks).length >= 8 && words.length >= 240);
  assert.equal(new Set(words.map(word => word.toLowerCase())).size, words.length, 'no word appears twice');
  for (const word of words) assert.ok(word.length >= 3 && word.length <= 32, word);
});

test('four or more play as two even teams with equal turns; two or three play as one group', () => {
  const { room, stop } = table(5);
  assert.equal(room.party.teams.length, 2);
  assert.deepEqual(room.party.teams.map(team => team.keys.length).sort(), [2, 3]);
  const perTeam = [0, 1].map(id => room.party.turns.filter(turn => turn.team === id).length);
  assert.equal(perTeam[0], perTeam[1], 'both teams get the same number of turns');
  assert.ok(room.party.turns.every((turn, index) => turn.team === index % 2), 'teams alternate');
  assert.ok(room.party.turns.every(turn => room.party.teams[turn.team].keys.includes(turn.guesser)));
  stop();
  const small = table(3);
  assert.equal(small.room.party.teams.length, 1);
  assert.equal(small.room.party.turns.length, 3, 'everyone guesses once');
  small.stop();
  const big = table(20);
  assert.ok(big.room.count <= LOOK_MAX_TURNS);
  big.stop();
  assert.equal(table(1).room.phase, 'finished');
});

test('the word reaches the TV and the describers, never the guesser', () => {
  const { room, send, turn, describer, stop } = table(4);
  const { guesser } = turn();
  assert.equal(room.phase, 'look-ready');
  assert.equal(publicLook(room, 'host').card, undefined, 'no word before the clock starts');
  assert.equal(send(describer(), { action: 'start' })[0], 403, 'only the guesser starts their own turn');
  assert.equal(send(guesser, { action: 'start' })[0], 204);
  assert.equal(room.phase, 'look-turn');
  const word = room.party.card.word;
  assert.equal(publicLook(room, 'host').card.word, word);
  assert.equal(publicLook(room, describer()).card.word, word);
  const guesserView = publicLook(room, guesser);
  assert.equal(guesserView.card, undefined);
  assert.equal(JSON.stringify(guesserView).includes(word), false, 'the word is nowhere in the guesser’s state');
  assert.equal(guesserView.canMark, false);
  assert.equal(publicLook(room, describer()).canMark, true);
  stop();
});

test('only the guesser’s team marks; correct scores for the whole team, pass moves on, stale taps are refused', () => {
  const { room, send, mark, turn, describer, go, stop } = table(4);
  const { team, guesser } = turn();
  const rival = room.party.teams[1 - team].keys[0];
  go();
  const step = room.party.step;
  assert.equal(mark(guesser)[0], 403, 'the guesser cannot mark their own answers');
  assert.equal(mark(rival)[0], 403, 'the other team cannot mark');
  assert.equal(send(describer(), { action: 'mark', step, result: 'maybe' })[0], 400);
  const first = room.party.card.word;
  assert.equal(mark(describer())[0], 204);
  assert.notEqual(room.party.card.word, first, 'a new word straight away');
  assert.equal(send(describer(), { action: 'mark', step, result: 'correct' })[0], 409, 'a second tap on the old word does not count');
  assert.equal(mark(describer(), 'pass')[0], 204);
  assert.equal(room.party.scores[team], 1);
  assert.equal(room.party.passes[team], 1);
  for (const key of room.party.teams[team].keys) assert.equal(room.players.get(key).score, 10, 'the whole team scores');
  assert.equal(room.players.get(rival).score, 0);
  // A passed word is not shown back to the guesser, who is still guessing.
  assert.equal(publicLook(room, guesser).last.word, undefined);
  assert.equal(publicLook(room, 'host').last.got, false);
  room.pausedAt = Date.now();
  assert.equal(mark(describer())[0], 409, 'no marking while paused');
  room.pausedAt = 0;
  stop();
});

test('the clock ends the turn, the result lists the words, and the game ends with a winner or a draw', () => {
  const { room, mark, describer, go, stop } = table(4);
  for (let turn = 0; turn < room.count; turn++) {
    assert.equal(room.phase, 'look-ready');
    go();
    if (turn === 0) { mark(describer()); mark(describer()); }
    room.ends = Date.now() - 1;
    expireLook(room, () => {});
    assert.equal(room.phase, 'look-result');
    assert.equal(mark('k0')[0], 409, 'no marking after time');
    const result = publicLook(room, 'host').result;
    assert.equal(result.correct, turn === 0 ? 2 : 0);
    assert.equal(typeof result.missed, 'string', 'the word on screen when time ran out is shown');
    go();
  }
  assert.equal(room.phase, 'finished');
  const final = publicLook(room, 'host');
  assert.equal(final.champion, room.party.turns[0].team);
  assert.equal(final.decidedBy, 'correct');
  assert.equal(typeof publicLook(room, 'k0').earned, 'number');
  stop();
});
