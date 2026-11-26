import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { reactionFor } from '../public/show-moments.js';
import { hosts, knockoutReactions, raceCalls, reactionTakes } from '../public/duo-scripts.js';
import { duoRecordings } from '../public/duo-recordings.js';

let server;
let origin;
before(async () => {
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', PUBLIC_URL: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  const [output] = await once(server.stdout, 'data');
  origin = String(output).match(/http:\/\/localhost:\d+/)[0];
});
after(() => server?.kill());

async function call(path, key, body, status) {
  const response = await fetch(origin + '/api/rooms' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (status) assert.equal(response.status, status);
  return response.status === 204 ? undefined : response.json();
}

async function room(settings) {
  const { code, host } = await call('', undefined, { category: 'mixed', count: 5, seconds: 0, ...settings }, 201);
  const path = '/' + code;
  const players = [];
  for (const name of ['Ada', 'Bo', 'Cy']) players.push({ name, ...await call(path + '/join', undefined, { name }, 201) });
  const state = key => call(path, key);
  const advance = async () => {
    const s = await state(host);
    await call(path + '/advance', host, { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion });
  };
  return { path, host, players, state, advance };
}

test('the TV sees who locked in, in order, but never what anyone chose', async () => {
  const { path, host, players, state, advance } = await room({ mode: 'classic', format: 'choice' });
  await advance();
  const [ada, bo] = players;
  for (const player of [bo, ada]) {
    const { game, index } = await state(player.key);
    await call(path + '/answer', player.key, { game, index, option: 0 }, 204);
  }
  const tv = await state(host);
  assert.deepEqual(tv.lockIns.map(entry => entry.name), ['Bo', 'Ada'], 'lock order');
  for (const entry of tv.lockIns) assert.ok(Object.keys(entry).every(field => ['id', 'name', 'avatar'].includes(field)), JSON.stringify(entry));
  const raw = JSON.stringify(tv.lockIns);
  assert.ok(!raw.includes(ada.key) && !raw.includes(bo.key), 'no private player keys');
  assert.ok(!/option|elapsed|points|won/.test(raw), 'no choices, timings or results before the reveal');
  for (const player of players) assert.equal((await state(player.key)).lockIns, undefined, `${player.name}'s phone never gets the lock-in list`);

  await advance();
  const revealed = await state(host);
  assert.equal(revealed.phase, 'reveal');
  assert.deepEqual(revealed.lockIns.map(entry => typeof entry.won), ['boolean', 'boolean'], 'after the reveal each stamp says right or wrong');
  assert.ok(!/option|elapsed|points/.test(JSON.stringify(revealed.lockIns)), 'still no choices or timings');
});

test('So Close keeps its staged reveal: no right-or-wrong stamps', async () => {
  const { path, host, players, state, advance } = await room({ mode: 'soclose', format: 'estimate' });
  await advance();
  for (const player of players) {
    const { game, index } = await state(player.key);
    await call(path + '/answer', player.key, { game, index, option: 100 }, 204);
  }
  assert.equal((await state(host)).lockIns.length, 3);
  await advance();
  const revealed = await state(host);
  assert.equal(revealed.phase, 'reveal');
  assert.equal(revealed.lockIns, undefined);
});

test('every show-moment animation is opt-in to motion', () => {
  const css = readFileSync('public/show-moments.css', 'utf8');
  const outside = css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g, '');
  assert.ok(!/\banimation\s*:/.test(outside), 'no animation outside the no-preference block');
  assert.match(readFileSync('public/show-moments.js', 'utf8'), /prefersReducedMotion\(\)/, 'staged reveal and count-ups respect reduced motion');
});

test('host reactions fit the moment, use only what the TV shows, and are all recorded', () => {
  const reveal = (wins, extra = {}) => ({ phase: 'reveal', lockIns: wins.map(won => ({ won })), ...extra });
  assert.equal(reactionFor(reveal([])), 'noanswers');
  assert.equal(reactionFor(reveal([false, false])), 'nobody');
  assert.equal(reactionFor(reveal([true, true])), 'everybody');
  assert.equal(reactionFor(reveal([true])), undefined, 'one player alone is not a full house');
  assert.equal(reactionFor(reveal([true, false, false])), 'onlyone');
  assert.equal(reactionFor(reveal([true, true, false], { players: [{ streak: 3 }] })), 'streak');
  assert.equal(reactionFor(reveal([true, true, false], { players: [{ streak: 4 }] })), undefined, 'a streak is called once');
  assert.equal(reactionFor(reveal([false], { knockout: { out: [{ outNow: true }] } })), 'knockedout');
  assert.equal(reactionFor({ phase: 'reveal' }), undefined, 'phones (no lock-in list) never react');
  assert.equal(reactionFor({ phase: 'question', index: 9, total: 10 }), 'final');
  assert.equal(reactionFor({ phase: 'question', index: 5, total: 10 }), 'halfway');
  assert.equal(reactionFor({ phase: 'question', index: 2, total: 10 }), undefined);
  for (const [key, lines] of Object.entries(reactionTakes)) {
    assert.equal(duoRecordings[key]?.length, lines.length, `${key} is recorded, one timing per line`);
    for (const [host, text] of lines) assert.ok(hosts[host] && !/\b(ada|bo|cy)\b/i.test(text), `${key}: known voice, no player names`);
  }
  // Knockout and Quiz Race have their own commentary teams.
  for (const takes of Object.values(knockoutReactions)) for (const lines of takes) assert.deepEqual(lines.map(([host]) => host), ['baz', 'clive']);
  for (const lines of Object.values(raceCalls)) for (const [host] of lines) assert.equal(host, 'vince');
});
