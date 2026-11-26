import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

let server;
let origin;
before(async () => {
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', PUBLIC_URL: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  const [output] = await once(server.stdout, 'data');
  origin = String(output).match(/http:\/\/localhost:\d+/)[0];
});
after(() => server?.kill());

const call = async (path, key, body) => {
  const response = await fetch(origin + '/api/rooms' + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return response.status === 204 ? undefined : response.json();
};

test('the knockout ladder shows lives to the TV only, and who fell only after the reveal', async () => {
  const quiz = { title: 'Ladder', questions: Array.from({ length: 4 }, (_, i) => ({ type: 'boolean', prompt: 'Ladder ' + i, correct: 0 })) };
  const { code, host } = await call('', undefined, { mode: 'knockout', category: 'mixed', count: 4, seconds: 0, customQuiz: quiz });
  const path = '/' + code;
  const [ada, bo] = [await call(path + '/join', undefined, { name: 'Ada' }), await call(path + '/join', undefined, { name: 'Bo' })];
  const state = key => call(path, key);
  const advance = async () => { const s = await state(host); await call(path + '/advance', host, { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion }); };
  await advance();
  for (let round = 0; round < 3; round++) {
    for (const [player, option] of [[ada, 0], [bo, 1]]) { const s = await state(player.key); await call(path + '/answer', player.key, { game: s.game, index: s.index, option }); }
    const question = await state(host);
    assert.ok(question.knockout.survivors.every(row => !row.lost && !row.outNow), 'nothing is marked before the reveal');
    assert.ok(!/option|selection|won|elapsed|points|key/.test(JSON.stringify(question.knockout)), 'no answers, results or keys');
    assert.equal((await state(ada.key)).knockout, undefined, 'phones never get the ladder');
    await advance();
    const reveal = await state(host);
    const boRow = [...reveal.knockout.survivors, ...reveal.knockout.out].find(row => row.name === 'Bo');
    assert.equal(boRow.lost, true, `round ${round + 1}: Bo lost a heart`);
    assert.equal(boRow.lives, 2 - round);
    assert.equal((await state(bo.key)).lostLife, true, 'Bo’s own phone knows');
    assert.equal((await state(ada.key)).lostLife, undefined, 'Ada’s phone does not hear about Bo');
    if (round === 2) {
      assert.deepEqual(reveal.knockout.out.map(row => [row.name, row.outNow]), [['Bo', true]]);
      assert.equal((await state(bo.key)).knockedOut, true);
    } else await advance();
  }
});

// Knockout runs until one player is left: six levels, then a closest-number decider.
import { spawn as spawnServer } from 'node:child_process';
import { once as onceEvent } from 'node:events';
import { reactionFor as reactionForKnockout } from '../public/show-moments.js';

async function knockoutRoom(names, body = {}) {
  const server = spawnServer(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', PUBLIC_URL: '', KNOCKOUT_PER_LEVEL: '2' }, stdio: ['ignore', 'pipe', 'inherit'] });
  const [output] = await onceEvent(server.stdout, 'data');
  const origin = String(output).match(/http:\/\/localhost:\d+/)[0];
  const call = async (path, key, data) => {
    const response = await fetch(origin + '/api/rooms' + path, { method: data === undefined ? 'GET' : 'POST',
      headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
    return response.status === 204 ? undefined : response.json();
  };
  const { code, host } = await call('', undefined, { mode: 'knockout', category: 'mixed', count: 5, seconds: 0, ...body });
  const path = '/' + code;
  const keys = [];
  for (const name of names) keys.push((await call(path + '/join', undefined, { name })).key);
  const state = key => call(path, key ?? host);
  const advance = async () => { const s = await state(); await call(path + '/advance', host, { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion }); };
  const answer = async (i, option) => { const s = await state(); await call(path + '/answer', keys[i], { game: s.game, index: s.index, option }); };
  return { server, state, advance, answer, keys };
}

test('Knockout runs six levels and never stops at a tie', async () => {
  // The test server plays two questions per level (twelve in all) instead of ten.
  const quiz = { title: 'Twelve', questions: Array.from({ length: 12 }, (_, i) => ({ type: 'boolean', prompt: 'Planned ' + i, correct: 0 })) };
  const room = await knockoutRoom(['Ada', 'Bo', 'Cy'], { customQuiz: quiz });
  try {
    assert.equal((await room.state()).total, 12, 'the lobby shows the full ladder');
    await room.advance();
    for (let index = 0; index < 12; index++) {
      const question = await room.state();
      assert.equal(question.phase, 'question');
      assert.equal(question.level, Math.floor(index / 2) + 1, 'a new level every block of questions');
      assert.equal(question.decider, undefined);
      if (index === 2) assert.equal(reactionForKnockout({ ...question, lockIns: [] }), 'levelup');
      // Cy drops out over the first three questions; Ada and Bo are always right.
      await room.answer(0, 0); await room.answer(1, 0);
      await room.advance();
      const revealed = await room.state();
      assert.equal(revealed.lastTurn, false, 'two players standing: never the last turn');
      assert.equal(revealed.remaining, index < 2 ? 3 : 2);
      await room.advance();
    }
    // After the sixth level comes the decider: a closest-number question.
    const decider = await room.state();
    assert.equal(decider.phase, 'question');
    assert.equal(decider.decider, true);
    assert.equal(decider.question.type, 'estimate');
    assert.equal(reactionForKnockout({ ...decider, lockIns: [] }), 'decider');
    assert.equal((await room.state(room.keys[0])).deciderBoard, undefined);
    // Nobody guesses: nobody is out and the decider is played again.
    await room.advance();
    const blank = await room.state();
    assert.equal(blank.remaining, 2);
    assert.equal(blank.knockoutNote, 'noguess');
    await room.advance();
    const again = await room.state();
    assert.equal(again.decider, true);
    assert.notEqual(again.question.prompt, decider.question.prompt);
    // Both guess; the closer one wins outright, whatever hearts they had.
    await room.answer(0, 1); await room.answer(1, 1e9);
    await room.advance();
    const settled = await room.state();
    assert.equal(settled.remaining, 1);
    assert.equal(settled.lastTurn, true);
    assert.deepEqual(settled.deciderBoard.map(row => row.winner), [false, true], 'furthest first, winner last');
    assert.ok(Object.keys(settled.deciderBoard[0]).every(field => ['id', 'name', 'avatar', 'guess', 'gap', 'winner'].includes(field)));
    assert.equal((await room.state(room.keys[1])).deciderBoard, undefined, 'phones do not get the board');
    await room.advance();
    const end = await room.state();
    assert.equal(end.phase, 'finished');
    assert.equal(end.players.filter(player => player.lives > 0).length, 1, 'exactly one player left standing');
  } finally { room.server.kill(); }
});

test('Knockout draws harder questions each level and spares the last players standing', async () => {
  const room = await knockoutRoom(['Ada', 'Bo', 'Cy']);
  try {
    await room.advance();
    const first = await room.state();
    assert.equal(first.level, 1);
    assert.ok(['choice', 'boolean'].includes(first.question.type));
    // Nobody ever answers: hearts drop together, and the last heart is spared.
    for (let i = 0; i < 4; i++) { await room.advance(); if ((await room.state()).phase === 'reveal') await room.advance(); }
    const later = await room.state();
    assert.equal(later.phase, 'question', 'the game is still going');
    assert.equal(later.remaining, 3, 'a question that would knock everyone out knocks out nobody');
    // One player alone gets question one right while two others are wrong three times: a first-round win needs all others out.
    assert.equal(reactionForKnockout({ mode: 'knockout', phase: 'reveal', quickWin: true, lockIns: [] }), 'firstround');
    assert.equal(reactionForKnockout({ mode: 'knockout', phase: 'question', index: 59, total: 60, lockIns: [] }), undefined, 'no "final question" call in Knockout');
  } finally { room.server.kill(); }
});
