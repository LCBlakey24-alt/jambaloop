import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

let server;
let origin;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: '0', PUBLIC_URL: '' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const [output] = await Promise.race([
    once(server.stdout, 'data'),
    once(server, 'exit').then(([code]) => { throw new Error(`Test server exited before startup (${code}).`); }),
  ]);
  origin = String(output).match(/http:\/\/localhost:\d+/)[0];
});

after(() => { server?.kill(); });

const settings = { mode: 'classic', category: 'mixed', count: 5, seconds: 0 };

async function request(path, key, body, expected) {
  const response = await fetch(origin + '/api/rooms' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, expected, await response.clone().text());
  return response.status === 204 ? undefined : response.json();
}

async function roomWith(mode, participants) {
  const room = await request('', undefined, { ...settings, mode }, 201);
  const path = '/' + room.code;
  const players = [];
  for (let index = 1; index <= participants; index++) {
    const player = await request(path + '/join', undefined, { name: 'Player ' + index }, 201);
    players.push(player.key);
  }
  return { ...room, path, captain: players[0], players };
}

const start = ({ game, phase, index, lobbyVersion }) => ({ game, phase, index, lobbyVersion });

test('an old Start command leaves the latest lobby settings ready for review', async () => {
  const { path, host, captain } = await roomWith('classic', 1);
  const beforeEdit = await request(path, host, undefined, 200);
  await request(path + '/configure', captain, { ...settings, category: 'history', game: beforeEdit.game, lobbyVersion: beforeEdit.lobbyVersion }, 204);
  const latest = await request(path, host, undefined, 200);
  assert.ok(latest.lobbyVersion > beforeEdit.lobbyVersion);
  await request(path + '/advance', host, start(beforeEdit), 409);
  assert.equal((await request(path, host, undefined, 200)).phase, 'lobby');
  await request(path + '/advance', host, start(latest), 204);
  const active = await request(path, host, undefined, 200);
  assert.equal(active.phase, 'question');
  assert.equal(active.question.category, 'history');
});

test('a stale setup draft cannot overwrite a concurrent lobby edit', async () => {
  const { path, host, captain } = await roomWith('classic', 1);
  const lobby = await request(path, captain, undefined, 200);
  const version = { game: lobby.game, lobbyVersion: lobby.lobbyVersion };
  await request(path + '/configure', host, { ...settings, category: 'history', ...version }, 204);
  await request(path + '/configure', captain, { ...settings, category: 'science', ...version }, 409);
  const updated = await request(path, captain, undefined, 200);
  assert.equal(updated.category, 'history');
});

test('only the host transfers captaincy and the former captain immediately loses controls', async () => {
  const { path, host, captain, players: [, nextCaptain] } = await roomWith('classic', 2);
  const lobby = await request(path, nextCaptain, undefined, 200);
  const transfer = { game: lobby.game, player: lobby.player.id };
  await request(path + '/captain', captain, transfer, 403);
  await request(path + '/advance', nextCaptain, start(lobby), 403);
  await request(path + '/captain', host, transfer, 204);
  await request(path + '/advance', captain, start(lobby), 403);
  await request(path + '/configure', captain, { ...settings, game: lobby.game }, 403);
  // Earlier clients only stamped commands with the game, phase and index.
  await request(path + '/advance', nextCaptain, { game: lobby.game, phase: 'lobby', index: 0 }, 204);
  assert.equal((await request(path, host, undefined, 200)).phase, 'question');
});

test('Fill the Blank requires an integer card index and allows a valid card after rejection', async () => {
  const { path, host, captain } = await roomWith('cards', 3);
  const lobby = await request(path, host, undefined, 200);
  await request(path + '/advance', host, start(lobby), 204);
  const current = await request(path, captain, undefined, 200);
  const select = option => ({ game: current.game, index: current.index, action: 'card', option });
  assert.ok(current.party.hand.length);
  await request(path + '/party', host, select(0), 403);
  for (const invalid of [{ toString: null }, '0', [0], -1, 0.5, current.party.hand.length]) {
    await request(path + '/party', captain, select(invalid), 400);
  }
  assert.equal((await request(path, captain, undefined, 200)).party.wrote, false);
  await request(path + '/party', captain, select(0), 204);
  assert.equal((await request(path, captain, undefined, 200)).party.wrote, true);
});
