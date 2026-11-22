import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { publicOrigin, requestBudget } from '../room-http.js';

const jpeg = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABAf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCCAUkN/9k=';
const settings = { category: 'mixed', count: 5, seconds: 0 };

async function start(t, overrides = {}) {
  const server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PUBLIC_URL: '', TRUST_PROXY: '', PORT: '0', ...overrides },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => server.kill());
  const origin = await Promise.race([
    once(server.stdout, 'data').then(([chunk]) => String(chunk).match(/http:\/\/localhost:\d+/)?.[0]),
    once(server, 'exit').then(([code]) => assert.fail('Server exited with code ' + code)),
  ]);
  assert.ok(origin);
  const post = (path, body, headers) => fetch(origin + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  return {
    origin, post,
    async room(headers) {
      const response = await post('/api/rooms', settings, headers);
      assert.equal(response.status, 201, await response.clone().text());
      const { code, host } = await response.json();
      const path = '/api/rooms/' + code;
      return { code, host, path, state: () => fetch(origin + path, { headers: { 'x-game-key': host } }).then(res => res.json()) };
    },
  };
}

test('local invites use the listening address instead of request host and forwarding headers', async t => {
  const { room, origin } = await start(t);
  const current = await room({ 'x-forwarded-host': 'example.test', 'x-forwarded-proto': 'https' });
  const { joinUrl } = await current.state();
  const url = new URL(joinUrl);
  assert.equal(url.protocol, 'http:');
  assert.notEqual(url.hostname, 'example.test');
  assert.equal(url.port, new URL(origin).port);
  assert.equal(url.searchParams.get('join'), current.code);
});

test('the configured canonical origin determines all generated invites', async t => {
  const { room } = await start(t, { PUBLIC_URL: 'https://games.example.test/' });
  const current = await room({ 'x-forwarded-host': 'other.example.test', 'x-forwarded-proto': 'http' });
  assert.equal((await current.state()).joinUrl, 'https://games.example.test/?join=' + current.code);
  for (const value of ['ftp://games.example.test', 'https://user@games.example.test', 'https://games.example.test/path', 'https://games.example.test?q=1']) {
    assert.throws(() => publicOrigin(value), /PUBLIC_URL/);
  }
});

test('photo reads require a member of that room and non-photo uploads are rejected', async t => {
  const { origin, post, room } = await start(t);
  const current = await room();
  const other = await room();
  const invalid = await post(current.path + '/join', { name: 'Photo', avatar: 'data:image/jpeg;base64,bm90IGEgcGhvdG8=' });
  assert.equal(invalid.status, 400);
  const joined = await post(current.path + '/join', { name: 'Photo', avatar: 'data:image/jpeg;base64,' + jpeg });
  assert.equal(joined.status, 201);
  const { key } = await joined.json();
  const { players: [{ avatar }] } = await current.state();
  for (const outsider of [undefined, other.host]) {
    const response = await fetch(origin + avatar, { headers: outsider ? { 'x-game-key': outsider } : undefined });
    assert.equal(response.status, 403);
  }
  for (const member of [current.host, key]) {
    const response = await fetch(origin + avatar, { headers: { 'x-game-key': member } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^image\/jpeg/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(jpeg, 'base64'));
  }
});

test('nicknames reject control characters and compare equivalent Unicode spellings', async t => {
  const { post, room } = await start(t);
  const { path } = await room();
  assert.equal((await post(path + '/join', { name: 'A\nB' })).status, 400);
  assert.equal((await post(path + '/join', { name: 'Cafe\u0301' })).status, 201);
  assert.equal((await post(path + '/join', { name: 'CAFÉ' })).status, 409);
});

test('room creation and repeated joins have independent bounded budgets', async t => {
  const { post, room } = await start(t, { ROOMS_PER_MINUTE: '2', JOINS_PER_ROOM_PER_MINUTE: '2' });
  const { path } = await room();
  await room();
  const rejected = await post('/api/rooms', settings, { 'x-forwarded-for': '198.51.100.7' });
  assert.equal(rejected.status, 429);
  assert.ok(Number(rejected.headers.get('retry-after')) >= 1);
  assert.equal((await post(path + '/join', { name: 'Guest One' })).status, 201);
  assert.equal((await post(path + '/join', { name: 'Guest Two' })).status, 201);
  assert.equal((await post(path + '/join', { name: 'Guest Three' })).status, 429);
});

test('anonymous requests cannot extend an idle room and expiry frees room capacity', async t => {
  const { origin, post, room } = await start(t, { ROOM_IDLE_MS: '250', MAX_ROOMS: '1' });
  const { path, host } = await room();
  assert.equal((await post('/api/rooms', settings)).status, 503);
  for (let i = 0; i < 12; i++) {
    const status = (await fetch(origin + path)).status;
    if (status === 404) break;
    assert.equal(status, 403);
    await delay(55);
  }
  assert.equal((await fetch(origin + path, { headers: { 'x-game-key': host } })).status, 404);
  assert.equal((await fetch(origin + path + '/avatar/expired', { headers: { 'x-game-key': host } })).status, 404);
  await room();
});

test('malformed and oversized JSON get short JSON errors', async t => {
  const { origin } = await start(t);
  for (const [body, status] of [['{', 400], [JSON.stringify({ padded: 'a'.repeat(130 * 1024) }), 413]]) {
    const response = await fetch(origin + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(response.status, status);
    assert.deepEqual(Object.keys(await response.json()), ['error']);
  }
});

test('budget buckets expire without evicting active addresses or resetting the same address', () => {
  const budget = requestBudget(1, 60_000, 2);
  assert.equal(budget.retryIn('one', 0), 0);
  assert.equal(budget.retryIn('two', 1), 0);
  assert.equal(budget.retryIn('three', 1), 60);
  assert.equal(budget.retryIn('one', 59_999), 1);
  assert.equal(budget.retryIn('three', 60_000), 0);
});
