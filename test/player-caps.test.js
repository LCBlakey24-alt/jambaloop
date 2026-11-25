import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { capacityError, maximumPlayers, modes, roomCapacity } from '../public/game-config.js';
import { playlistEditor } from '../public/game-night.js';

let server;
let origin;

before(async () => {
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', PUBLIC_URL: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  const [output] = await once(server.stdout, 'data');
  origin = String(output).match(/http:\/\/localhost:\d+/)[0];
});
after(() => server?.kill());

async function request(path, key, body, status = 200) {
  const response = await fetch(origin + '/api/rooms' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = response.status === 204 ? undefined : await response.json();
  assert.equal(response.status, status, path + ' ' + JSON.stringify(data));
  return data;
}

async function roomWith(size, settings = {}) {
  const room = await request('', undefined, { mode: 'classic', category: 'mixed', count: 5, seconds: 0, ...settings }, 201);
  const path = '/' + room.code;
  const players = [];
  for (let n = 0; n < size; n++) players.push(await request(path + '/join', undefined, { name: 'Player ' + n }, 201));
  // A state read marks each phone as present, as a real controller would.
  for (const player of players) await request(path, player.key);
  const state = () => request(path, room.host);
  return { ...room, path, players, state };
}

async function finish(room) {
  for (let step = 0; step < 20; step++) {
    const { game, index, phase } = await room.state();
    if (phase === 'finished') return room.state();
    await request(room.path + '/advance', room.host, { game, index, phase }, 204);
  }
  assert.fail('game did not finish');
}

const settingsFor = (mode, game, extra = {}) => ({ mode, category: 'mixed', count: mode === 'board' ? 12 : 5, seconds: 0, game, ...extra });

test('one shared rule describes every game limit', () => {
  assert.equal(maximumPlayers('quizrace'), 12);
  assert.equal(maximumPlayers('spotlight'), 20);
  for (const mode of ['brain', 'topanswers', 'rare']) assert.equal(maximumPlayers(mode), 30);
  assert.equal(maximumPlayers('board', 'individual'), 4);
  assert.equal(maximumPlayers('board', 'teams'), roomCapacity);
  assert.equal(maximumPlayers('board'), roomCapacity, 'A Board Race room can hold a group that switches to Teams');
  for (const [mode] of modes) assert.ok(maximumPlayers(mode) >= 4 && maximumPlayers(mode) <= roomCapacity);
  assert.equal(capacityError('quizrace', 'individual', 12), undefined);
  assert.match(capacityError('quizrace', 'individual', 13), /Quiz Race supports up to 12 players; this room has 13/);
  assert.match(capacityError('board', 'individual', 5), /four racers/);
});

test('reconfiguring to a smaller game is refused with a clear limit', async () => {
  const room = await roomWith(21);
  const { game } = await room.state();
  const refused = await request(room.path + '/configure', room.host, settingsFor('spotlight', game, { count: 1 }), 409);
  assert.match(refused.error, /Spotlight Wheel supports up to 20 players; this room has 21/);
  assert.equal((await room.state()).mode, 'classic', 'The current game is unchanged');
  await request(room.path + '/configure', room.host, settingsFor('samepage', game, { count: 3 }), 204);
});

test('the playlist cannot queue or load a game the group has outgrown', async () => {
  const room = await roomWith(10);
  let { game, night } = await room.state();
  await request(room.path + '/playlist', room.host, { game, version: night.version, queue: ['quizrace', 'samepage'] }, 204);
  // Three more friends arrive after the lineup was saved.
  for (const name of ['Late A', 'Late B', 'Late C']) await request(room.path + '/join', undefined, { name }, 201);
  ({ game, night } = await finish(room));
  const refused = await request(room.path + '/playlist/next', room.host, { game, version: night.version }, 409);
  assert.match(refused.error, /Quiz Race supports up to 12 players; this room has 13.*Edit the playlist/);
  const after = await room.state();
  assert.deepEqual(after.night.queue, ['quizrace', 'samepage'], 'A refused load leaves the lineup untouched');
  assert.equal(after.phase, 'finished');
  const unfit = await request(room.path + '/playlist', room.host, { game, version: after.night.version, queue: ['spotlight', 'quizrace'] }, 409);
  assert.match(unfit.error, /Quiz Race supports up to 12/);
  await request(room.path + '/playlist', room.host, { game, version: after.night.version, queue: ['samepage'] }, 204);
  const saved = await room.state();
  await request(room.path + '/playlist/next', room.host, { game, version: saved.night.version }, 204);
  assert.equal((await room.state()).mode, 'samepage');
});

test('a rematch into a smaller game is refused, the same game still works', async () => {
  const room = await roomWith(13);
  const { game } = await finish(room);
  const refused = await request(room.path + '/rematch', room.host, settingsFor('quizrace', game, { raceLength: 'short' }), 409);
  assert.match(refused.error, /Quiz Race supports up to 12/);
  await request(room.path + '/rematch', room.host, { game, sameGame: true }, 204);
  assert.equal((await room.state()).phase, 'lobby');
});

test('the phone playlist editor flags outgrown games and disables adding them', () => {
  const html = playlistEditor(['quizrace', 'samepage'], String, () => '', 13);
  assert.match(html, /class="playlist-unfit"[\s\S]*Quiz Race<small>Up to 12 players/);
  assert.match(html, /<option value="quizrace" disabled>Quiz Race \(up to 12 players\)/);
  assert.match(html, /<option value="samepage" >Same Page</);
  assert.doesNotMatch(playlistEditor(['quizrace'], String, () => '', 4), /playlist-unfit|disabled>Quiz/);
});
