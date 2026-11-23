import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {EventEmitter, once} from 'node:events';
import {get} from 'node:http';
import {setTimeout as pause} from 'node:timers/promises';
import {after, before, test} from 'node:test';
import {isConnected, liveConnection, reconnectWindow, trackConnection} from '../room-presence.js';

let server;
let origin;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    env: {...process.env, PORT: '0', PUBLIC_URL: ''},
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const [output] = await Promise.race([
    once(server.stdout, 'data'),
    once(server, 'exit').then(([code]) => assert.fail('Room server exited before listening: ' + code)),
  ]);
  origin = String(output).match(/http:\/\/localhost:\d+/)[0];
});

after(() => server?.kill());

async function post(path, body) {
  const response = await fetch(origin + '/api/rooms' + path, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body),
  });
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}

async function openLive(path, key) {
  const stream = get(origin + path + '/live', {headers: {'x-game-key': key}});
  const [response] = await once(stream, 'response');
  response.resume();
  return response;
}

test('duplicate live streams are bounded and can reconnect after close', async t => {
  const {code, host} = await post('', {mode: 'classic', category: 'mixed', count: 5, seconds: 0});
  const {key} = await post('/' + code + '/join', {name: 'Player', seenQuestions: []});
  const path = '/api/rooms/' + code;

  for (const member of [host, key]) {
    const main = await openLive(path, member);
    t.after(() => main.destroy());
    assert.equal(main.statusCode, 200);
    const duplicate = await openLive(path, member);
    t.after(() => duplicate.destroy());
    assert.equal(duplicate.statusCode, 409);
    assert.ok(Number(duplicate.headers['retry-after']) > 0);
    assert.equal(main.destroyed, false);

    main.destroy();
    const deadline = Date.now() + 2000;
    let reopened;
    do {
      reopened = await openLive(path, member);
      if (reopened.statusCode === 200) break;
      reopened.destroy();
      await pause(20);
    } while (Date.now() < deadline);
    t.after(() => reopened.destroy());
    assert.equal(reopened.statusCode, 200);
  }
});

test('a delayed stream close preserves its replacement and grace window', () => {
  const key = 'player';
  const room = {players: new Map([[key, {}]]), waiting: new Map(), lastSeen: new Map(), liveConnections: new Map()};
  const first = new EventEmitter();
  const second = new EventEmitter();

  trackConnection(room, key, first);
  first.destroyed = true;
  assert.equal(liveConnection(room, key), undefined);
  trackConnection(room, key, second);
  first.emit('close');
  assert.equal(liveConnection(room, key), second);
  assert.equal(room.lastSeen.has(key), false);

  second.emit('close');
  const lastSeen = room.lastSeen.get(key);
  assert.ok(isConnected(room, key, lastSeen + reconnectWindow - 1));
  assert.equal(isConnected(room, key, lastSeen + reconnectWindow), false);
});
