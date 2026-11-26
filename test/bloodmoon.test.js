import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ABSTAIN, advanceBloodmoon, bloodmoonRoles, publicBloodmoon, startBloodmoon, submitBloodmoon } from '../bloodmoon.js';

function table(size) {
  const room = { mode: 'bloodmoon', game: 1, phase: 'lobby', players: new Map(), lastSeen: new Map(), liveConnections: new Map(), waiting: new Map(), host: 'host', pausedAt: 0, ends: 0 };
  for (let i = 0; i < size; i++) {
    room.players.set('k' + i, { id: 'p' + i, name: 'Player ' + i, score: 0 });
    room.lastSeen.set('k' + i, Date.now());
  }
  let published = 0;
  const publish = () => { published++; };
  startBloodmoon(room, publish);
  const party = room.party;
  const withRole = role => [...party.roles].filter(([, r]) => r === role).map(([key]) => key);
  const act = (key, data) => submitBloodmoon(room, key, { game: 1, night: party.night, ...data }, publish);
  const id = key => room.players.get(key).id;
  const stop = () => clearTimeout(room.deadline);
  return { room, party, publish, withRole, act, id, stop, published: () => published };
}

test('role counts for every table size', () => {
  assert.deepEqual(bloodmoonRoles(5), { vampire: 1, oracle: 1, warden: 1, villager: 2 });
  assert.deepEqual(bloodmoonRoles(7), { vampire: 1, oracle: 1, warden: 1, villager: 4 });
  assert.deepEqual(bloodmoonRoles(8), { vampire: 2, oracle: 1, warden: 1, villager: 4 });
  assert.deepEqual(bloodmoonRoles(12), { vampire: 2, oracle: 1, warden: 1, villager: 8 });
  assert.deepEqual(bloodmoonRoles(16), { vampire: 3, oracle: 1, warden: 1, villager: 11 });
  for (const size of [5, 6, 8, 12, 16]) {
    const { party, stop } = table(size);
    const dealt = {};
    for (const role of party.roles.values()) dealt[role] = (dealt[role] ?? 0) + 1;
    assert.deepEqual(dealt, bloodmoonRoles(size));
    stop();
  }
});

test('too few players never deals roles', () => {
  const { room, party } = table(4);
  assert.equal(room.phase, 'finished');
  assert.equal(party, undefined);
});

test('nobody but the owner ever sees a living role, pick, finding or ballot', () => {
  const { room, party, withRole, act, id, stop } = table(8);
  for (const key of party.roles.keys()) act(key, { action: 'ready' });
  assert.equal(room.phase, 'blood-night');
  const [v1, v2] = withRole('vampire');
  const [oracle] = withRole('oracle');
  const [warden] = withRole('warden');
  const villagers = withRole('villager');
  assert.deepEqual(act(v1, { action: 'night', id: id(villagers[0]) }), [204]);
  assert.deepEqual(act(oracle, { action: 'night', id: id(v1) }), [204]);
  assert.deepEqual(act(warden, { action: 'night', id: id(villagers[1]) }), [204]);

  const secret = /vampire|oracle|warden|villager/;
  for (const viewer of ['host', 'stranger', ...party.roles.keys()]) {
    const view = publicBloodmoon(room, viewer);
    const { you, counts, ...shared } = view;
    assert.ok(!secret.test(JSON.stringify(shared)), `${viewer}: the shared view names no role`);
    assert.ok(view.seats.every(seat => seat.role === undefined && !('key' in seat)));
    assert.ok(!JSON.stringify(view).includes('"k'), `${viewer}: no private player keys`);
    if (viewer === 'host' || viewer === 'stranger') assert.equal(you, undefined, 'the TV has no role of its own');
    else {
      assert.equal(you.role, party.roles.get(viewer));
      // Only vampires learn who their partners are, and what they picked.
      assert.equal(you.mates.length, you.role === 'vampire' ? 1 : 0);
      if (you.role !== 'oracle') assert.equal(you.findings, undefined);
    }
  }
  assert.equal(publicBloodmoon(room, v2).you.mates[0].pick, id(villagers[0]), 'a vampire sees their partner\'s pick');
  assert.equal(publicBloodmoon(room, 'host').done, 3, 'the TV only gets a total');
  stop();
});

test('a full game: bite, guard, oracle, vote, tie, and the village wins', () => {
  const { room, party, withRole, act, id, stop } = table(6);
  advanceBloodmoon(room, () => {});
  const [vampire] = withRole('vampire');
  const [oracle] = withRole('oracle');
  const [warden] = withRole('warden');
  const [a, b, c] = withRole('villager');

  // Night 1: the Warden guards the target, so nobody is bitten.
  assert.deepEqual(act(vampire, { action: 'night', id: id(vampire) }), [400, 'Choose someone who is not a vampire.']);
  act(vampire, { action: 'night', id: id(a) });
  act(warden, { action: 'night', id: id(a) });
  act(oracle, { action: 'night', id: id(vampire) });
  assert.deepEqual(act(oracle, { action: 'night', id: id(b) }), [204], 'a second pick is ignored');
  for (const key of [a, b, c]) act(key, { action: 'night', id: id(vampire) });
  assert.equal(room.phase, 'blood-dawn', 'the night closes once everyone has acted');
  assert.equal(publicBloodmoon(room, 'host').dawn.victim, null);
  assert.deepEqual(publicBloodmoon(room, oracle).you.findings.map(f => [f.id, f.vampire]), [[id(vampire), true]]);
  assert.equal(publicBloodmoon(room, a).you.findings, undefined);

  // Day 1: a tie banishes nobody.
  advanceBloodmoon(room, () => {});
  assert.equal(room.phase, 'blood-day');
  assert.deepEqual(act(a, { action: 'vote', id: id(b) }), [409, 'This action is no longer available.']);
  advanceBloodmoon(room, () => {});
  assert.deepEqual(act(a, { action: 'vote', id: id(a) })[0], 400, 'no voting for yourself');
  act(a, { action: 'vote', id: id(b) });
  act(b, { action: 'vote', id: id(a) });
  assert.equal(publicBloodmoon(room, 'host').verdict, undefined, 'no tally before the vote closes');
  assert.equal(publicBloodmoon(room, b).you.ballot, id(a));
  for (const key of [c, oracle, warden, vampire]) act(key, { action: 'vote', id: ABSTAIN });
  assert.equal(room.phase, 'blood-verdict');
  const tie = publicBloodmoon(room, 'host').verdict;
  assert.equal(tie.banished, null);
  assert.equal(tie.tied, true);
  assert.equal(tie.abstained, 4);

  // Night 2: the Warden may not guard the same player again; the bite lands.
  advanceBloodmoon(room, () => {});
  assert.equal(party.night, 2);
  assert.equal(act(warden, { action: 'night', id: id(a) })[0], 400);
  assert.equal(act(vampire, { action: 'night', night: 1, id: id(a) })[0], 409, 'a stale night is rejected');
  act(vampire, { action: 'night', id: id(a) });
  advanceBloodmoon(room, () => {});
  assert.equal(publicBloodmoon(room, 'host').dawn.victim.id, id(a));
  assert.equal(publicBloodmoon(room, 'host').dawn.victim.role, 'villager', 'a role is public once its owner is out');
  assert.equal(act(a, { action: 'night', id: id(b) })[0], 403, 'the bitten cannot act');

  // Day 2: the village banishes the vampire and wins.
  advanceBloodmoon(room, () => {});
  advanceBloodmoon(room, () => {});
  assert.equal(act(a, { action: 'vote', id: id(vampire) })[0], 403, 'the bitten cannot vote');
  for (const key of [b, c, oracle, warden]) act(key, { action: 'vote', id: id(vampire) });
  act(vampire, { action: 'vote', id: id(b) });
  assert.equal(publicBloodmoon(room, 'host').verdict.banished.role, 'vampire');
  advanceBloodmoon(room, () => {});
  assert.equal(room.phase, 'finished');
  const end = publicBloodmoon(room, 'host');
  assert.equal(end.winner, 'village');
  assert.ok(end.seats.every(seat => seat.role), 'every role is shown at the end');
  assert.equal(room.players.get(b).score, 400, 'a surviving winner');
  assert.equal(room.players.get(a).score, 300, 'a winner who was bitten');
  assert.equal(room.players.get(vampire).score, 0);
  stop();
});

test('vampires win when they match the village; split vampires bite nobody', () => {
  const { room, party, withRole, act, id, stop } = table(8);
  advanceBloodmoon(room, () => {});
  const [v1, v2] = withRole('vampire');
  const others = [...party.roles.keys()].filter(key => ![v1, v2].includes(key));
  act(v1, { action: 'night', id: id(others[0]) });
  act(v2, { action: 'night', id: id(others[1]) });
  advanceBloodmoon(room, () => {});
  assert.equal(publicBloodmoon(room, 'host').dawn.victim, null, 'a split bite is no bite');
  // Vampires may change their mind to agree.
  advanceBloodmoon(room, () => {}); advanceBloodmoon(room, () => {}); advanceBloodmoon(room, () => {}); advanceBloodmoon(room, () => {});
  assert.equal(room.phase, 'blood-night');
  for (let i = 0; room.phase !== 'finished' && i < 6; i++) {
    const target = others.find(key => party.alive.has(key) && party.roles.get(key) !== 'warden') ?? others.find(key => party.alive.has(key));
    act(v1, { action: 'night', id: id(others.find(key => party.alive.has(key) && key !== target)) });
    act(v1, { action: 'night', id: id(target) });
    act(v2, { action: 'night', id: id(target) });
    advanceBloodmoon(room, () => {});   // dawn
    advanceBloodmoon(room, () => {});   // day, or the end
    if (room.phase === 'finished') break;
    advanceBloodmoon(room, () => {});   // vote
    advanceBloodmoon(room, () => {});   // verdict (nobody voted)
    advanceBloodmoon(room, () => {});   // next night
  }
  assert.equal(room.phase, 'finished');
  assert.equal(publicBloodmoon(room, 'host').winner, 'vampires');
  assert.equal(room.players.get(v1).score, 400);
  stop();
});

test('late joiners watch without a role and cannot act', () => {
  const { room, act, stop } = table(6);
  room.players.set('late', { id: 'late-id', name: 'Late', score: 0 });
  assert.equal(act('late', { action: 'ready' })[0], 403);
  const view = publicBloodmoon(room, 'late');
  assert.equal(view.you, undefined);
  assert.equal(view.watching, true);
  stop();
});

test('over HTTP: the TV host state and a rival phone never carry a living role', async () => {
  const { spawn } = await import('node:child_process');
  const { once } = await import('node:events');
  const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', PUBLIC_URL: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    const [output] = await once(server.stdout, 'data');
    const origin = String(output).match(/http:\/\/localhost:\d+/)[0];
    const call = async (path, key, body) => {
      const response = await fetch(origin + '/api/rooms' + path, { method: body === undefined ? 'GET' : 'POST',
        headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: response.status === 204 ? undefined : await response.json() };
    };
    const { body: { code, host } } = await call('', undefined, { mode: 'bloodmoon', category: 'mixed', count: 1, seconds: 0 });
    const keys = [];
    for (const name of ['Ada', 'Bo', 'Cy', 'Di']) keys.push((await call(`/${code}/join`, undefined, { name })).body.key);
    const lobby = (await call('/' + code, host)).body;
    const start = () => call(`/${code}/advance`, host, { game: lobby.game, phase: 'lobby', index: 0, lobbyVersion: lobby.lobbyVersion });
    assert.equal((await start()).status, 409, 'four players are not enough');
    keys.push((await call(`/${code}/join`, undefined, { name: 'Ed' })).body.key);
    const ready = (await call('/' + code, host)).body;
    assert.equal((await call(`/${code}/advance`, host, { game: ready.game, phase: 'lobby', index: 0, lobbyVersion: ready.lobbyVersion })).status, 204);
    const tv = (await call('/' + code, host)).body;
    assert.equal(tv.phase, 'blood-roles');
    assert.equal(tv.party.you, undefined);
    assert.ok(!/"role"|vampire"|oracle"|warden"|villager"/.test(JSON.stringify({ ...tv.party, counts: undefined })), 'no role in the TV state');
    const roles = [];
    for (const key of keys) {
      const own = (await call('/' + code, key)).body;
      roles.push(own.party.you.role);
      assert.ok(own.party.seats.every(seat => seat.role === undefined), 'a phone sees no one else\'s role');
    }
    assert.deepEqual(roles.sort(), ['oracle', 'vampire', 'villager', 'villager', 'warden']);
    assert.equal((await call(`/${code}/party`, host, { game: tv.game, index: 0, action: 'ready' })).status, 403, 'the TV cannot act as a player');
  } finally { server.kill(); }
});
