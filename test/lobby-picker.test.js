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
  return { status: response.status, data: response.status === 204 ? undefined : await response.json() };
};

test('a lobby-first room: the captain browses, everyone follows, playing a game closes the carousel', async () => {
  const { data: room } = await call('', undefined, { mode: 'classic', category: 'mixed', count: 10, seconds: 20, format: 'mixed', picker: true });
  const path = '/' + room.code;
  const { data: captain } = await call(path + '/join', undefined, { name: 'Ada' });
  const { data: guest } = await call(path + '/join', undefined, { name: 'Bo' });
  const state = async key => (await call(path, key)).data;
  const { game } = await state(room.host);
  assert.deepEqual((await state(guest.key)).picker, { mode: 'classic', version: 0 }, 'everyone sees the carousel');

  assert.equal((await call(path + '/browse', guest.key, { mode: 'wheel', game })).status, 403, 'only the captain or TV drives');
  assert.equal((await call(path + '/browse', captain.key, { mode: 'nope', game })).status, 400);
  assert.equal((await call(path + '/browse', captain.key, { mode: 'knockout', game })).status, 204);
  assert.equal((await state(guest.key)).picker.mode, 'knockout', 'phones follow the captain');
  assert.equal((await call(path + '/browse', room.host, { mode: 'potato', game })).status, 204, 'the TV can drive too');
  const lobby = await state(room.host);
  assert.equal(lobby.picker.mode, 'potato');
  assert.equal(lobby.mode, 'classic', 'browsing does not change the configured game');

  const start = await call(path + '/advance', room.host, { game, phase: 'lobby', index: lobby.index, lobbyVersion: lobby.lobbyVersion });
  assert.equal(start.status, 409, 'cannot start while a game is still being picked');

  assert.equal((await call(path + '/configure', captain.key, { mode: 'potato', category: 'mixed', count: 5, seconds: 0, format: 'choice', game, lobbyVersion: lobby.lobbyVersion })).status, 204);
  const chosen = await state(room.host);
  assert.equal(chosen.mode, 'potato');
  assert.equal(chosen.picker, undefined, 'playing a game closes the carousel');

  assert.equal((await call(path + '/browse', captain.key, { mode: 'wheel', game })).status, 409, 'browsing needs the carousel open');
  assert.equal((await call(path + '/browse', captain.key, { open: true, game })).status, 204);
  assert.equal((await state(guest.key)).picker.mode, 'potato', 'reopening starts on the current game');
});

test('rooms made without the carousel behave as before', async () => {
  const { data: room } = await call('', undefined, { mode: 'classic', category: 'mixed', count: 5, seconds: 0 });
  assert.equal((await call('/' + room.code, room.host)).data.picker, undefined);
});
