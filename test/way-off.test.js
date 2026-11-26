import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';

async function wayOff(names) {
  const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', PUBLIC_URL: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  const [output] = await once(server.stdout, 'data');
  const origin = String(output).match(/http:\/\/localhost:\d+/)[0];
  const call = async (path, key, data) => {
    const response = await fetch(origin + '/api/rooms' + path, { method: data === undefined ? 'GET' : 'POST',
      headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
    return { status: response.status, body: response.status === 204 ? undefined : await response.json() };
  };
  const { body: { code, host } } = await call('', undefined, { mode: 'wayoff', format: 'estimate', category: 'mixed', count: 5, seconds: 0 });
  const path = '/' + code;
  const keys = [];
  for (const name of names) keys.push((await call(path + '/join', undefined, { name })).body.key);
  const state = async key => (await call(path, key ?? host)).body;
  const advance = async () => { const s = await state(); return call(path + '/advance', host, { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion }); };
  const guess = async (i, option) => { const s = await state(); return call(path + '/answer', keys[i], { game: s.game, index: s.index, option }); };
  // The staged reveal holds the outcome back; the host can skip to it.
  const results = async () => { await advance(); const s = await state(); await call(path + '/estimate-reveal-skip', host, { game: s.game, index: s.index }); return state(); };
  return { server, state, advance, guess, results, keys, call, path };
}

test('Way Off: the furthest guess goes out each round until one player is left', async () => {
  const room = await wayOff(['Ada', 'Bo', 'Cy', 'Di']);
  try {
    await room.advance();
    let s = await room.state();
    assert.equal(s.phase, 'question');
    assert.equal(s.question.type, 'estimate');
    assert.equal(s.stillIn, 4);
    // Round 1: Di is wildly out.
    await room.guess(0, 1); await room.guess(1, 2); await room.guess(2, 3); await room.guess(3, 900000000);
    s = await room.results();
    assert.deepEqual(s.wayOut.map(row => row.name), ['Di']);
    assert.equal(s.stillIn, 3);
    assert.equal(s.lastTurn, false);
    assert.equal((await room.state(room.keys[3])).out, true);
    assert.equal((await room.state(room.keys[0])).out, false);
    await room.advance();
    // Round 2: Di cannot guess; Cy does not guess and is out for it.
    s = await room.state();
    assert.equal(s.phase, 'question');
    assert.equal((await room.guess(3, 5)).status, 409, 'an eliminated player cannot guess');
    await room.guess(0, 1); await room.guess(1, 900000000);
    s = await room.results();
    assert.deepEqual(s.wayOut.map(row => row.name), ['Cy'], 'not guessing puts you out before the furthest guess');
    await room.advance();
    // Round 3: nobody guesses, so nobody goes.
    s = await room.results();
    assert.deepEqual(s.wayOut, []);
    assert.equal(s.stillIn, 2);
    await room.advance();
    // Round 4: the last two; Bo is further away.
    await room.guess(0, 1); await room.guess(1, 900000000);
    s = await room.results();
    assert.deepEqual(s.wayOut.map(row => row.name), ['Bo']);
    assert.equal(s.lastTurn, true);
    await room.advance();
    s = await room.state();
    assert.equal(s.phase, 'finished');
    assert.equal(s.players[0].name, 'Ada', 'the survivor tops the table');
  } finally { room.server.kill(); }
});

test('Way Off: live guesses reach the TV only, and who is out is held until the reveal finishes', async () => {
  const room = await wayOff(['Ada', 'Bo', 'Cy']);
  try {
    await room.advance();
    const s = await room.state();
    assert.equal((await room.call(room.path + '/draft', room.keys[0], { game: s.game, index: s.index, value: 42 })).status, 204);
    assert.equal((await room.state()).liveGuesses.rows[0].value, 42);
    assert.equal((await room.state(room.keys[1])).liveGuesses, undefined);
    await room.guess(0, 1); await room.guess(1, 2); await room.guess(2, 900000000);
    await room.advance();
    const staged = await room.state();
    assert.equal(staged.phase, 'reveal');
    assert.equal(staged.wayOut, undefined, 'the TV does not name who is out before the staged reveal reaches the results');
  } finally { room.server.kill(); }
});
