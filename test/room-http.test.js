import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {test} from 'node:test';
import {requestBudget} from '../room-http.js';

const jpeg = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAACAAIDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAVAQEBAAAAAAAAAAAAAAAAAAAGCP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AFAwQU//2Q==';
const settings = {mode: 'classic', category: 'mixed', count: 5, seconds: 0};

async function start(t, overrides = {}) {
  const server = spawn(process.execPath, ['server.js'], {
    env: {...process.env, PUBLIC_URL: '', TRUST_PROXY: '', PORT: '0', ...overrides},
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => server.kill());
  const origin = await Promise.race([
    once(server.stdout, 'data').then(([chunk]) => String(chunk).match(/http:\/\/localhost:\d+/)?.[0]),
    once(server, 'exit').then(([code]) => assert.fail('Server exited with code ' + code)),
  ]);
  assert.ok(origin);
  const post = (path, body, headers) => fetch(origin + path, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...headers}, body: JSON.stringify(body),
  });
  return {
    origin, post,
    async room() {
      const response = await post('/api/rooms', settings);
      assert.equal(response.status, 201, await response.clone().text());
      const {code, host} = await response.json();
      const path = '/api/rooms/' + code;
      return {code, host, path, state: () => fetch(origin + path, {headers: {'x-game-key': host}}).then(res => res.json())};
    },
  };
}

test('photo reads require room membership and disguised non-images are rejected', async t => {
  const {origin, post, room} = await start(t);
  const current = await room();
  const other = await room();
  const invalid = await post(current.path + '/join', {name: 'Fake Photo', avatar: 'data:image/jpeg;base64,QUJD', seenQuestions: []});
  assert.equal(invalid.status, 400);
  const joined = await post(current.path + '/join', {name: 'Real Photo', avatar: 'data:image/jpeg;base64,' + jpeg, seenQuestions: []});
  assert.equal(joined.status, 201);
  const {key} = await joined.json();
  const {players: [{avatar}]} = await current.state();
  for (const outsider of [undefined, other.host]) {
    const response = await fetch(origin + avatar, {headers: outsider ? {'x-game-key': outsider} : undefined});
    assert.equal(response.status, 403);
  }
  for (const member of [current.host, key]) {
    const response = await fetch(origin + avatar, {headers: {'x-game-key': member}});
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^image\/jpeg/);
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(jpeg, 'base64'));
  }
});

test('nicknames reject controls and compare equivalent Unicode spellings', async t => {
  const {post, room} = await start(t);
  const {path} = await room();
  assert.equal((await post(path + '/join', {name: 'A\nB', seenQuestions: []})).status, 400);
  assert.equal((await post(path + '/join', {name: 'Cafe\u0301', seenQuestions: []})).status, 201);
  assert.equal((await post(path + '/join', {name: 'CAFÉ', seenQuestions: []})).status, 409);
});

test('room creation and repeated joins have independent bounded budgets', async t => {
  const {post, room} = await start(t, {ROOMS_PER_MINUTE: '2', JOINS_PER_ROOM_PER_MINUTE: '2'});
  const {path} = await room();
  await room();
  const rejected = await post('/api/rooms', settings);
  assert.equal(rejected.status, 429);
  assert.ok(Number(rejected.headers.get('retry-after')) >= 1);
  assert.equal((await post(path + '/join', {name: 'Guest One', seenQuestions: []})).status, 201);
  assert.equal((await post(path + '/join', {name: 'Guest Two', seenQuestions: []})).status, 201);
  assert.equal((await post(path + '/join', {name: 'Guest Three', seenQuestions: []})).status, 429);
});

test('anonymous requests cannot extend an idle room and expiry frees capacity', async t => {
  const {origin, post, room} = await start(t, {ROOM_IDLE_MS: '250', MAX_ROOMS: '1'});
  const {path, host} = await room();
  assert.equal((await post('/api/rooms', settings)).status, 503);
  for (let attempt = 0; attempt < 12; attempt++) {
    const status = (await fetch(origin + path)).status;
    if (status === 404) break;
    assert.equal(status, 403);
    await delay(55);
  }
  assert.equal((await fetch(origin + path, {headers: {'x-game-key': host}})).status, 404);
  await room();
});

test('malformed and oversized JSON return concise API errors', async t => {
  const {origin} = await start(t);
  for (const [body, status] of [['{', 400], [JSON.stringify({padded: 'a'.repeat(130 * 1024)}), 413]]) {
    const response = await fetch(origin + '/api/rooms', {method: 'POST', headers: {'Content-Type': 'application/json'}, body});
    assert.equal(response.status, status);
    assert.deepEqual(Object.keys(await response.json()), ['error']);
  }
});

test('new shared-TV quiz rooms default to answer-only phones with a full-text fallback', async t => {
  const {post, room, origin} = await start(t);
  const current = await room();
  assert.equal((await current.state()).phoneView, 'answers');

  const joined = await post(current.path + '/join', {name:'TV Player'});
  assert.equal(joined.status,201);
  const {key}=await joined.json();
  const playerState = () => fetch(origin + current.path,{headers:{'x-game-key':key}}).then(response=>response.json());
  assert.equal((await playerState()).phoneView,'answers');
  const lobby = await current.state();
  const started = await post(current.path + '/advance', {
    game:lobby.game,index:lobby.index,phase:lobby.phase,lobbyVersion:lobby.lobbyVersion,
  },{'x-game-key':current.host});
  assert.equal(started.status,204,await started.text());
  const hostQuestion = await current.state();
  const phoneQuestion = await playerState();
  assert.equal(hostQuestion.phase,'question');
  assert.ok(hostQuestion.question.prompt, 'TV host still sees full question');
  assert.equal(phoneQuestion.question.prompt,undefined, 'phone sees controls, not duplicate TV question');
  assert.deepEqual(phoneQuestion.question.options,hostQuestion.question.options);

  // A host may explicitly enable full mobile questions for remote/accessible play.
  const full = await post('/api/rooms',{...settings,phoneView:'full'});
  assert.equal(full.status,201,await full.clone().text());
  const {code,host} = await full.json();
  const fullState = await fetch(origin+'/api/rooms/'+code,{headers:{'x-game-key':host}});
  assert.equal((await fullState.json()).phoneView,'full');
});

test('budget buckets expire without evicting active addresses', () => {
  const budget = requestBudget(1, 60_000, 2);
  assert.equal(budget.retryIn('one', 0), 0);
  assert.equal(budget.retryIn('two', 1), 0);
  assert.equal(budget.retryIn('three', 1), 60);
  assert.equal(budget.retryIn('one', 59_999), 1);
  assert.equal(budget.retryIn('three', 60_000), 0);
});
