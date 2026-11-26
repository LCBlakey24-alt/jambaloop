import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { get } from 'node:http';
import { setTimeout as pause } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { reconnectWindow } from '../room-presence.js';

let server;
let origin;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: '0', PUBLIC_URL: '' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const [output] = await once(server.stdout, 'data');
  origin = String(output).match(/http:\/\/localhost:\d+/)[0];
});

after(() => { server?.kill(); });

async function request(path, key, body, status = 200) {
  const response = await fetch(origin + '/api/rooms' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = response.status === 204 ? undefined : await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}

async function roomWith(mode, size, settings = {}) {
  const room = await request('', undefined, { mode, category: 'mixed', count: mode === 'board' ? 12 : 5, seconds: 0, ...settings }, 201);
  const path = '/' + room.code;
  const players = await Promise.all(Array.from({ length: size }, (_, n) =>
    request(path + '/join', undefined, { name: 'Player ' + n }, 201)));
  const state = (key = room.host) => request(path, key);
  const advance = async () => {
    const { game, index, phase } = await state();
    await request(path + '/advance', room.host, { game, index, phase }, 204);
  };
  return { ...room, path, players, state, advance };
}

async function until(read, condition, timeout = 5000) {
  const end = Date.now() + timeout;
  let state;
  do {
    state = await read();
    if (condition(state)) return state;
    await pause(80);
  } while (Date.now() < end);
  assert.fail(`waited for room state. Latest phase: ${state.phase}; connected: ${state.connected}; answered: ${state.answered}/${state.responseTarget}`);
}

async function openStream(path, key) {
  const stream = get(origin + '/api/rooms' + path + '/live', { headers: { 'x-game-key': key } });
  const [response] = await once(stream, 'response');
  assert.equal(response.statusCode, 200);
  response.resume();
  return { abort: () => response.destroy() };
}

function checkpointQuiz(length) {
  return { title: 'Score checkpoint quiz', questions: Array.from({ length }, (_, index) => ({
    type: 'boolean', prompt: `Checkpoint question ${index + 1}`, correct: 0,
  })) };
}

async function answerCheckpointRound(room, winners = []) {
  const { game, index } = await room.state();
  await Promise.all(room.players.map(({ key }, position) =>
    request(room.path + '/answer', key, { game, index, option: winners.includes(position) ? 0 : 1 }, 204)));
  await room.advance();
}

test('three-question checkpoints preserve the prior standings and expose movement without leaking live totals', async () => {
  const room = await roomWith('classic', 4, { scoreInterval: 3, customQuiz: checkpointQuiz(7) });
  const [first, second] = room.players;
  await room.advance();
  for (const [index, winners] of [[0], [0], [0, 1, 2]].entries()) {
    await answerCheckpointRound(room, winners);
    const reveal = await room.state();
    assert.equal(reveal.scoreCheckpointNext, index === 2);
    assert.deepEqual(reveal.players, []);
    const phone = await room.state(first.key);
    assert.equal(phone.answerCorrect, true);
    assert.equal(phone.player.score, 0);
    assert.equal(phone.earned, undefined);
    await room.advance();
  }
  const initial = await room.state();
  assert.equal(initial.phase, 'score-break');
  assert.equal(initial.lastTurn, false);
  assert.equal(initial.question, undefined);
  assert.ok(initial.scoreBreak.starts <= initial.now);
  assert.equal(initial.scoreBreak.number, 3);
  assert.equal(initial.scoreBreak.entryCount, 4);
  assert.deepEqual(initial.scoreBreak.entries.map(row => [row.rank, row.score]), [[1, 3000], [2, 1000], [2, 1000], [4, 0]]);
  assert.deepEqual(initial.scoreBreak.entries.map(row => row.previousIndex).sort(), [0, 1, 2, 3]);
  assert.ok(initial.scoreBreak.entries.every(row => row.previousRank === 1 && row.previousScore === 0));
  const phone = await room.state(first.key);
  assert.equal(phone.scoreBreak.entryCount, 4);
  assert.equal(phone.scoreBreak.entries, undefined);
  assert.deepEqual(phone.scoreBreak.own, initial.scoreBreak.entries[0]);
  const late = await request(room.path + '/join', undefined, { name: 'Late player' }, 201);
  const waiting = await room.state(late.key);
  assert.equal(waiting.phase, 'waiting');
  assert.equal(waiting.scoreBreak, undefined);
  await request(room.path + '/advance', room.host, { game: initial.game, index: initial.index, phase: 'reveal' }, 204);
  assert.equal((await room.state()).scoreBreak.starts, initial.scoreBreak.starts);
  assert.equal((await room.state()).phase, 'score-break');
  await room.advance();
  for (const winners of [[1, 2], [1], [1, 2]]) {
    await answerCheckpointRound(room, winners);
    assert.equal((await room.state(second.key)).player.score, 1000);
    assert.equal((await room.state(first.key)).answerCorrect, false);
    await room.advance();
  }
  const latest = await room.state();
  assert.equal(latest.scoreBreak.number, 6);
  assert.deepEqual(latest.scoreBreak.entries.map(row => [row.rank, row.score]), [[1, 4000], [2, 3000], [2, 3000], [4, 0]]);
  for (const row of latest.scoreBreak.entries) {
    const oldIndex = initial.scoreBreak.entries.findIndex(entry => entry.id === row.id);
    assert.equal(row.previousIndex, oldIndex);
    assert.equal(row.previousRank, initial.scoreBreak.entries[oldIndex].rank);
    assert.equal(row.previousScore, initial.scoreBreak.entries[oldIndex].score);
  }
  await room.advance();
  await answerCheckpointRound(room);
  assert.equal((await room.state()).scoreCheckpointNext, false);
  assert.equal((await room.state()).lastTurn, true);
  await room.advance();
  const finale = await room.state();
  assert.equal(finale.phase, 'finished');
  assert.equal(finale.scoreBreak, undefined);
  assert.ok(finale.ceremony.starts);
  assert.equal(finale.players[0].score, 4000);
});

test('five-question checkpoints and final-only settings leave the finale independent', async () => {
  await request('', undefined, { mode: 'classic', category: 'mixed', count: 5, seconds: 0, scoreInterval: 2 }, 400);
  for (const [scoreInterval, length] of [[0, 6], [1, 6], [5, 5], [5, 10]]) {
    const room = await roomWith('classic', 2, { scoreInterval, customQuiz: checkpointQuiz(length) });
    await room.advance();
    for (let round = 1; round <= length; round++) {
      const due = scoreInterval === 5 && round === 5 && length > 5;
      await answerCheckpointRound(room, [0]);
      const reveal = await room.state();
      assert.equal(reveal.scoreCheckpointNext, due);
      assert.equal(reveal.players[0]?.score, scoreInterval === 1 ? round * 1000 : undefined);
      await room.advance();
      const next = await room.state();
      assert.equal(next.phase, due ? 'score-break' : round === length ? 'finished' : 'question');
      if (due) await room.advance();
    }
    const finished = await room.state();
    assert.equal(finished.players[0].score, 1000 * length);
    assert.ok(finished.ceremony.starts);
  }
});

test('Showdown publishes team standings at the checkpoint and keeps teammate ranks private', async () => {
  const room = await roomWith('showdown', 4, { teamCount: 2, scoreInterval: 3, customQuiz: checkpointQuiz(4) });
  await room.advance();
  const players = await Promise.all(room.players.map(({ key }) => room.state(key)));
  for (let round = 0; round < 3; round++) {
    await answerCheckpointRound(room, players.flatMap((state, index) => state.player.team === 1 ? [index] : []));
    assert.ok((await room.state()).teams.every(team => team.score === 0 && team.roundPoints === undefined));
    await room.advance();
  }
  const checkpoint = await room.state();
  assert.equal(checkpoint.phase, 'score-break');
  assert.equal(checkpoint.scoreBreak.entryCount, 2);
  assert.deepEqual(checkpoint.scoreBreak.entries.map(row => [row.id, row.rank, row.score]), [[1, 1, 3000], [0, 2, 0]]);
  assert.ok(checkpoint.scoreBreak.entries.every(row => row.color));
  const phone = await room.state(room.players[0].key);
  assert.equal(phone.scoreBreak.entries, undefined);
  assert.equal(phone.scoreBreak.own.id, players[0].player.team);
});

test('4, 12 and 30 phones can lock a live answer and receive the reveal', async () => {
  for (const size of [4, 12, 30]) {
    const room = await roomWith('classic', size, { autoReveal: true });
    const streams = await Promise.all([room.host, ...room.players.map(player => player.key)].map(key => openStream(room.path, key)));
    try {
      await room.advance();
      const { game, index } = await room.state();
      await Promise.all(room.players.map(({ key }) =>
        request(room.path + '/answer', key, { game, index, option: 0 }, 204)));
      const revealed = await until(room.state, state => state.phase === 'reveal');
      assert.equal(revealed.answered, size);
      assert.equal(revealed.connected, size);
      assert.equal((await room.state(room.players.at(-1).key)).selection, 0);
    } finally {
      streams.forEach(controller => controller.abort());
    }
  }
});

test('presence grace expires, reveal proceeds, and the same key reconnects with its answer', async () => {
  const room = await roomWith('classic', 4, { autoReveal: true });
  const streams = await Promise.all([room.host, ...room.players.map(player => player.key)].map(key => openStream(room.path, key)));
  try {
    await room.advance();
    const { game, index } = await room.state();
    const absent = room.players.at(-1);
    streams.at(-1).abort();
    await Promise.all(room.players.slice(0, 3).map(({ key }) =>
      request(room.path + '/answer', key, { game, index, option: 1 }, 204)));
    assert.equal((await room.state()).responseTarget, 4);
    const revealed = await until(room.state, state => state.phase === 'reveal', reconnectWindow + 6000);
    assert.equal(revealed.connected, 3);
    const returning = await openStream(room.path, absent.key);
    try {
      const restored = await room.state(absent.key);
      assert.equal(restored.phase, 'reveal');
      assert.equal(restored.connected, 4);
      assert.equal(restored.player.name, 'Player 3');
      assert.equal((await room.state(room.players[0].key)).selection, 1);
    } finally {
      returning.abort();
    }
  } finally {
    streams.forEach(controller => controller.abort());
  }
});

test('playlist version prevents overwrites and the next game welcomes late joiners', async () => {
  const room = await roomWith('classic', 4, { difficulty: 'family' });
  const lobby = await room.state();
  const captain = (await Promise.all(room.players.map(async player => [player.key, (await room.state(player.key)).isCaptain]))).find(([, isCaptain]) => isCaptain)[0];
  const playlist = { game: lobby.game, version: lobby.night.version, queue: ['classic', 'board'] };
  await request(room.path + '/playlist', captain, playlist, 204);
  await request(room.path + '/playlist', room.host, playlist, 409);
  const questions = new Set();
  await room.advance();
  const late = await request(room.path + '/join', undefined, { name: 'Late arrival' }, 201);
  const waiting = await room.state(late.key);
  assert.equal(waiting.phase, 'waiting');
  assert.equal(waiting.question, undefined);
  assert.equal(waiting.party, undefined);
  for (let round = 0; round < 5; round++) {
    const state = await room.state();
    assert.equal(state.question.type, 'choice');
    questions.add(state.question.prompt);
    await room.advance();
    await room.advance();
  }
  const finished = await room.state();
  assert.equal(finished.night.queue[0], 'classic');
  await request(room.path + '/playlist/next', captain, { game: finished.game, version: finished.night.version }, 204);
  const next = await room.state(late.key);
  assert.equal(next.phase, 'lobby');
  assert.equal(next.player.name, 'Late arrival');
  assert.equal(next.playerCount, 5);
  assert.equal(next.code, room.code);
  assert.deepEqual(next.night.queue, ['board']);
  await room.advance();
  assert.ok(!questions.has((await room.state()).question.prompt));
});

test('game night standings award normalized podium stars across rematches', async () => {
  const room = await roomWith('classic', 3, { customQuiz: checkpointQuiz(1) });
  await room.advance();
  await answerCheckpointRound(room, [0]);
  await room.advance();
  const first = await room.state();
  assert.equal(first.phase, 'finished');
  assert.deepEqual(first.night.standings.map(player => [player.name, player.stars, player.wins, player.games]), [
    ['Player 0', 3, 1, 1],
    ['Player 1', 2, 0, 1],
    ['Player 2', 2, 0, 1],
  ]);
  assert.equal(first.night.results.length, 1);
  assert.deepEqual(first.night.results[0].winners, [first.night.standings[0].id]);

  await request(room.path + '/rematch', room.host, {game: first.game, sameGame: true}, 204);
  assert.ok((await room.state()).players.every(player => player.score === 0));
  await room.advance();
  await answerCheckpointRound(room, [1]);
  await room.advance();
  const second = await room.state();
  assert.deepEqual(second.night.standings.map(player => [player.name, player.stars, player.wins, player.games]), [
    ['Player 0', 5, 1, 2],
    ['Player 1', 5, 1, 2],
    ['Player 2', 4, 0, 2],
  ]);
  assert.equal(second.night.results.length, 2);
  assert.ok(second.night.standings.every(player => player.stars < 10), 'raw quiz points must not leak into game-night stars');
});

test('a 30-player punchline ballot includes everyone anonymously without excluding submissions', async () => {
  const room = await roomWith('punchline', 30);
  await room.advance();
  const { game, index } = await room.state();
  await Promise.all(room.players.map(({ key }, n) => request(room.path + '/party', key, { game, index, action: 'write', text: 'Joke ' + n }, 204)));
  const vote = await room.state();
  assert.equal(vote.phase, 'party-vote');
  assert.equal(vote.party.ballot.length, 30);
  assert.equal(vote.party.shortlisted, 0);
  assert.ok(vote.party.ballot.every(entry => entry.name === undefined));
  await Promise.all(room.players.map(async ({ key }) => {
    const eligible = (await room.state(key)).party.ballot.find(entry => !entry.yours);
    await request(room.path + '/party', key, { game, index, action: 'vote', id: eligible.id }, 204);
  }));
  const reveal = await room.state();
  assert.equal(reveal.phase, 'party-reveal');
  assert.equal(reveal.party.ballot.reduce((total, entry) => total + entry.votes, 0), 30);
});

test('Fill the Blank lets each player refresh a hand once before locking their answer', async () => {
  const room = await roomWith('cards', 3, { count: 3 });
  await room.advance();
  const { game, index } = await room.state();
  const { key } = room.players[0];
  const first = (await room.state(key)).party.hand;
  assert.equal(first.length, 6);
  await request(room.path + '/party', key, { game, index, action: 'redraw' }, 204);
  const second = await room.state(key);
  assert.equal(second.party.hand.length, 6);
  assert.equal(second.party.redrawAvailable, false);
  assert.equal(second.party.handVersion, 1);
  assert.ok(second.party.hand.every(card => !first.includes(card)), 'refresh must present genuinely different choices');
  await request(room.path + '/party', key, { game, index, action: 'card', option: 0, handVersion: 0 }, 409);
  assert.equal((await room.state(key)).party.wrote, false, 'outdated card must never be silently substituted');
  await request(room.path + '/party', key, { game, index, action: 'redraw' }, 409);
  await request(room.path + '/party', key, { game, index, action: 'card', option: 0, handVersion: 1 }, 204);
  await request(room.path + '/party', key, { game, index, action: 'redraw' }, 409);
  const otherPlayer = await room.state(room.players[1].key);
  assert.equal(otherPlayer.party.hand.length, 6);
  assert.ok(otherPlayer.party.hand.every(card => typeof card === 'string'), 'another player gets their own private hand');
  assert.equal((await room.state()).party.hand, undefined, 'host must never receive private cards');
});

test('Punchline Party awards double points on its third and final round', async () => {
  const room = await roomWith('punchline', 3, { count: 3 });
  const byId = new Map();
  for (let round = 0; round < 3; round++) {
    await room.advance();
    const { game, index } = await room.state();
    for (let i = 0; i < room.players.length; i++) {
      await request(room.path + '/party', room.players[i].key,
        { game, index, action: 'write', text: 'Original joke ' + round + ' - ' + i }, 204);
    }
    const ballot = await room.state();
    assert.equal(ballot.phase, 'party-vote');
    assert.equal(ballot.party.votePoints, round === 2 ? 200 : 100);
    assert.equal(ballot.party.ballot.length, 3);
    assert.ok(ballot.party.ballot.every(entry => entry.name === undefined));
    for (let i = 0; i < room.players.length; i++) {
      const key = room.players[i].key;
      const myBallot = (await room.state(key)).party.ballot;
      const desired = myBallot.find(entry => !entry.yours && entry.text.endsWith(i === 0 ? '- 1' : '- 0'));
      assert.ok(desired, 'expected eligible vote target');
      await request(room.path + '/party', key, { game, index, action: 'vote', id: desired.id }, 204);
    }
    const revealed = await room.state();
    assert.equal(revealed.phase, 'party-reveal');
    assert.equal(revealed.party.ballot.reduce((sum, entry) => sum + entry.votes, 0), 3);
    for (const player of revealed.players) byId.set(player.name, player.score);
  }
  assert.equal(byId.get('Player 0'), 800);
  assert.equal(byId.get('Player 1'), 400);
  assert.equal(byId.get('Player 2'), 0);
  await room.advance();
  assert.equal((await room.state()).phase, 'finished');
});

test('a social round with no submitted entries skips an impossible vote', async () => {
  const room = await roomWith('punchline', 3, { count: 3 });
  await room.advance();
  assert.equal((await room.state()).phase, 'party-write');
  await room.advance();
  const noVotes = await room.state();
  assert.equal(noVotes.phase, 'party-reveal');
  assert.equal(noVotes.party.ballot.length, 0);
  assert.equal(noVotes.players.reduce((sum, player) => sum + player.score, 0), 0);
  await room.advance();
  assert.equal((await room.state()).phase, 'party-write');
});

test('a social round with one author still permits everyone else to vote', async () => {
  const room = await roomWith('punchline', 3, { count: 3 });
  await room.advance();
  const {game,index} = await room.state();
  await request(room.path + '/party', room.players[0].key, {
    game,index,action:'write',text:'Only reply'
  },204);
  await room.advance();
  const ballot = await room.state();
  assert.equal(ballot.phase,'party-vote');
  assert.equal(ballot.party.ballot.length,1);
  const id=ballot.party.ballot[0].id;
  await request(room.path + '/party', room.players[0].key, {game,index,action:'vote',id},400);
  for(let i=1;i<room.players.length;i++) await request(room.path + '/party', room.players[i].key, {game,index,action:'vote',id},204);
  const reveal = await room.state();
  assert.equal(reveal.phase,'party-reveal');
  assert.equal(reveal.party.ballot[0].votes,2);
  assert.equal(reveal.players.reduce((sum, player) => sum + player.score,0),200);
});

test('Board Race records off-turn predictions and resolves them after the 3D roll', async () => {
  const room = await roomWith('board', 4);
  await room.advance();
  const { game, index, activeTeam } = await room.state();
  const players = await Promise.all(room.players.map(async ({ key }) => [key, (await room.state(key)).player.team]));
  const active = players.find(([, team]) => team === activeTeam)[0];
  const offTurn = players.find(([, team]) => team !== activeTeam)[0];
  await request(room.path + '/predict', active, { game, index, guess: 'high' }, 403);
  await request(room.path + '/predict', offTurn, { game, index, guess: 'high' }, 204);
  await request(room.path + '/roll', active, { game, index }, 204);
  const rolling = await room.state();
  assert.equal(rolling.prediction.result, undefined);
  const question = await until(room.state, state => state.phase === 'question', 7500);
  assert.equal(question.question.difficulty, question.motion.die);
  assert.equal(question.question.basePoints, question.motion.die);
  assert.equal(question.prediction.result, question.motion.die > 3 ? 'high' : 'low');
  assert.equal(question.prediction.total, 1);
  assert.equal(question.prediction.correct, Number(question.motion.die > 3));
  assert.equal((await room.state(offTurn)).player.score, 0);
});

test('scoring boosts a scheduled round and awards count submitted answers', async () => {
  const room = await roomWith('classic', 2, {
    seconds: 15, scoring: { base: 250, bonus: 100, doubles: 'third' },
    customQuiz: { title: 'Points test', questions: [
      { type: 'boolean', prompt: 'The Sun is a star.', correct: 0 },
      { type: 'boolean', prompt: 'A spider has six legs.', correct: 1 },
      { type: 'estimate', prompt: 'How many seconds in a minute?', min: 0, max: 100, correct: 60 },
    ] },
  });
  const [first, second] = room.players;
  await room.advance();
  let live = await room.state();
  const answer = (player, option) => request(room.path + '/answer', player.key, { game: live.game, index: live.index, option }, 204);
  await answer(first, 1);
  await pause(250);
  await answer(second, 0);
  await room.advance();
  assert.ok((await room.state(second.key)).earned > 300);
  await room.advance();
  live = await room.state();
  await answer(first, 1);
  await room.advance();
  await room.advance();
  live = await room.state();
  assert.equal(live.boost, 2);
  await answer(first, 59);
  await pause(40);
  await answer(second, 61);
  await room.advance();
  assert.equal((await room.state(first.key)).earned, 500);
  assert.equal((await room.state(second.key)).earned, 500);
  await room.advance();
  const finished = await room.state();
  assert.ok(finished.ceremony.starts);
  assert.equal(finished.awards.find(award => award.id === 'wrong').value, '1');
  assert.equal(finished.awards.find(award => award.id === 'comeback').value, '1');
  assert.ok(finished.awards.some(award => award.id === 'fast'));
  assert.ok(finished.awards.some(award => award.id === 'slow'));
  await request(room.path + '/ceremony', room.host, { game: finished.game }, 204);
  assert.equal((await room.state()).ceremony.skipped, true);
});

test('ready counts follow the lobby and readiness is optional', async () => {
  const room = await roomWith('classic', 4);
  const lobby = await room.state();
  const setReady = (key, ready, lobbyVersion = lobby.lobbyVersion, status = 204) =>
    request(room.path + '/ready', key, { ready, lobbyVersion }, status);
  await setReady(room.host, true, lobby.lobbyVersion, 403);
  await Promise.all(room.players.slice(0, 2).map(({ key }) => setReady(key, true)));
  assert.equal((await room.state()).readyCount, 2);
  assert.equal((await room.state(room.players[0].key)).player.ready, true);
  await setReady(room.players[0].key, false);
  assert.equal((await room.state()).readyCount, 1);
  await request(room.path + '/configure', room.host, { game: lobby.game, category: 'mixed', count: 5, seconds: 0 }, 204);
  const updated = await room.state();
  assert.equal(updated.readyCount, 0);
  assert.ok(updated.lobbyVersion > lobby.lobbyVersion);
  await setReady(room.players[2].key, true, lobby.lobbyVersion, 409);
  await room.advance();
  assert.equal((await room.state()).phase, 'question');
});

test('timed trivia freezes, keeps submitted answers and restarts the same saved quiz', async () => {
  const customQuiz = { title: 'One question', questions: [{ type: 'boolean', prompt: 'The Moon orbits Earth.', correct: 0 }] };
  const room = await roomWith('classic', 2, { seconds: 15, autoReveal: true, customQuiz, scoring: { base: 250, bonus: 500, doubles: 'final' } });
  await room.advance();
  const first = await room.state();
  const round = { game: first.game, index: first.index, phase: first.phase };
  const setPause = (key, version, paused, status = 204) =>
    request(room.path + '/pause', key, { ...round, clockVersion: version, paused }, status);
  const answer = (key, status = 204) => request(room.path + '/answer', key, { ...round, option: 0 }, status);
  await setPause(room.players[1].key, first.clockVersion, true, 403);
  await answer(room.players[0].key);
  await setPause(room.host, first.clockVersion, true);
  const frozen = await room.state();
  assert.ok(frozen.pausedAt);
  assert.equal(frozen.ends, first.ends);
  await answer(room.players[1].key, 409);
  await request(room.path + '/advance', room.host, round, 409);
  await pause(180);
  assert.equal((await room.state(room.players[0].key)).selection, 0);
  await setPause(room.host, first.clockVersion, false, 409);
  await setPause(room.host, frozen.clockVersion, false);
  const resumed = await room.state();
  assert.equal(resumed.pausedAt, undefined);
  assert.ok(resumed.ends - first.ends >= 180);
  assert.equal(resumed.ends - resumed.opened, first.ends - first.opened);
  await answer(room.players[1].key);
  await until(room.state, state => state.phase === 'reveal');
  await room.advance();
  await request(room.path + '/rematch', room.host, { game: first.game, sameGame: true }, 204);
  const replay = await room.state();
  assert.equal(replay.game, first.game + 1);
  assert.equal(replay.phase, 'lobby');
  assert.equal(replay.quizTitle, customQuiz.title);
  assert.deepEqual(replay.scoring, first.scoring);
  assert.equal(replay.playerCount, 2);
  assert.equal(replay.readyCount, 0);
});

test('Hot Potato keeps the same holder and question while paused', async () => {
  const room = await roomWith('potato', 3);
  await room.advance();
  const first = await room.state();
  const party = first.party;
  const privateStates = await Promise.all(room.players.map(({ key }) => room.state(key)));
  const holder = room.players[privateStates.findIndex(state => state.party.holding)].key;
  const round = { phase: first.phase, game: first.game, index: first.index };
  const skip = status => request(room.path + '/party', holder, { game: first.game, step: party.step, action: 'skip' }, status);
  await request(room.path + '/pause', room.host, { ...round, clockVersion: first.clockVersion, paused: true }, 204);
  const paused = await room.state();
  await skip(409);
  assert.equal(paused.party.holder.id, party.holder.id);
  assert.equal(paused.party.step, party.step);
  await request(room.path + '/pause', room.host, { ...round, clockVersion: paused.clockVersion, paused: false }, 204);
  await skip(204);
  assert.equal((await room.state()).party.step, party.step + 1);
});
