import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {test} from 'node:test';

test('host can select a reachable QR origin; players cannot change invite URLs', async t => {
  const child = spawn(process.execPath, ['server.js'], {
    env: {...process.env, PORT:'0', PUBLIC_URL:''},
    stdio:['ignore','pipe','pipe']
  });
  t.after(() => child.kill());
  const [output] = await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(([code]) => { throw new Error('Server exited before startup: ' + code); })
  ]);
  const origin = String(output).match(/http:\/\/localhost:\d+/)?.[0];
  assert.ok(origin, 'Server should print its local URL');

  const post = (path, data, key) => fetch(origin + path, {
    method:'POST', headers:{'content-type':'application/json', ...(key ? {'x-game-key':key} : {})},
    body:JSON.stringify(data)
  });
  const createdResponse = await post('/api/rooms', {mode:'classic',category:'mixed',count:5,seconds:0});
  assert.equal(createdResponse.status,201,await createdResponse.clone().text());
  const {code,host} = await createdResponse.json();
  const stateResponse = await fetch(origin+'/api/rooms/'+code,{headers:{'x-game-key':host}});
  assert.equal(stateResponse.status,200);
  const before = await stateResponse.json();
  assert.ok(before.joinUrl.endsWith('/?join='+code));
  assert.ok(before.qr.startsWith('data:image/png;base64,'));
  assert.ok(before.joinOptions.length > 0);
  assert.equal(new URL(before.joinUrl).origin,before.joinOptions[0].origin);

  const forbidden = await post('/api/rooms/'+code+'/invite', {origin:before.joinOptions[0].origin}, 'someone-else');
  assert.equal(forbidden.status,403);
  const invalid = await post('/api/rooms/'+code+'/invite', {origin:'https://attacker.example'},host);
  assert.equal(invalid.status,400);

  const selected = before.joinOptions.at(-1);
  const response = await post('/api/rooms/'+code+'/invite',{origin:selected.origin},host);
  assert.equal(response.status,204,await response.clone().text());
  const updatedResponse = await fetch(origin+'/api/rooms/'+code,{headers:{'x-game-key':host}});
  const updated = await updatedResponse.json();
  assert.equal(updated.joinUrl,new URL('/?join='+code,selected.origin).href);
  assert.ok(updated.qr.startsWith('data:image/png;base64,'));
  assert.equal(updated.joinOptions.length,before.joinOptions.length);
});

test('Render HTTPS URL is used by new room QR links even if server listens on localhost', async t => {
  const child = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env, PORT: '0', PUBLIC_URL: '',
      RENDER_EXTERNAL_URL: 'https://jambaloop-family-test.onrender.com'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => child.kill());
  const [output] = await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(([code]) => {
      throw new Error('Server exited before startup: ' + code);
    })
  ]);
  const origin = String(output).match(/http:\/\/localhost:\d+/)?.[0];
  assert.ok(origin);
  const created = await fetch(origin + '/api/rooms', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({mode: 'classic', category: 'mixed', count: 5, seconds: 0})
  });
  assert.equal(created.status, 201, await created.clone().text());
  const {code, host} = await created.json();
  const room = await fetch(origin + '/api/rooms/' + code, {
    headers: {'x-game-key': host}
  });
  assert.equal(room.status, 200);
  const data = await room.json();
  assert.equal(data.joinUrl, 'https://jambaloop-family-test.onrender.com/?join=' + code);
  assert.deepEqual(data.joinOptions, [{
    origin: 'https://jambaloop-family-test.onrender.com',
    label: 'Public website'
  }]);
  assert.ok(data.qr.startsWith('data:image/png;base64,'));
});
