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
