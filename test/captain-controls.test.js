// The captain's phone is the room's remote control (owner direction, 28 November 2026): every button it
// shows must work. Sketch Sprint and Spotlight Wheel used to show the captain "Reveal drawing", "Next
// artist", "Spin for an expert" and the like, and the server refused every one of them, because those
// games (with Rare Find and Fork in the Tracks) let only the TV host move rounds on. Now the captain moves
// every step on that the TV can, except the two steps in public/captain-controls.js, which stay with the
// TV for a reason: there the captain's phone shows no button and says that the TV moves the step on.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { partyView } from '../public/party-views.js';
import { partySettings } from '../public/game-night.js';
import { partyModes, questionCounts, minimumPlayers } from '../public/game-config.js';
import { onlyTvMovesOn, tvOnlyStepList, tvStepNote } from '../public/captain-controls.js';

const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const phone = state => partyView(state, { host: false, canControl: Boolean(state.isCaptain), escape, icons: () => '', reply: '' });
const advanceButton = /data-action="advance"/;

async function withServer(run) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, PORT: '0', PUBLIC_URL: '', ROOMS_PER_MINUTE: '5000', MAX_ROOMS: '5000', JOINS_PER_ROOM_PER_MINUTE: '5000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += String(chunk); });
  try {
    const [line] = await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(([code]) => { throw Error('Server exited ' + code + ': ' + stderr); })]);
    const origin = String(line).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(origin, 'No server origin: ' + stderr);
    const call = async (path, key, data) => {
      const response = await fetch(origin + '/api/rooms' + path, { method: data === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', ...(key ? { 'x-game-key': key } : {}) },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(10000) });
      return { status: response.status, body: response.status === 204 ? null : await response.json() };
    };
    // A room whose first player (the captain) has started the game from their phone.
    const room = async (settings, players) => {
      const made = await call('', undefined, settings);
      assert.equal(made.status, 201, JSON.stringify(made.body));
      const path = '/' + made.body.code, host = made.body.host, keys = [];
      for (let i = 0; i < players; i++) keys.push((await call(path + '/join', undefined, { name: 'Player ' + (i + 1) })).body.key);
      const state = async (key = host) => (await call(path, key)).body;
      const [captain, ...others] = keys;
      assert.equal((await state(captain)).isCaptain, true, 'the first player to join is the captain');
      const press = async (key, at, extra = {}) => call(path + '/advance', key, { game: at.game, phase: at.phase, index: at.index, ...extra });
      const lobby = await state();
      assert.equal((await press(captain, lobby, { lobbyVersion: lobby.lobbyVersion })).status, 204, 'the captain starts the game');
      const party = async (key, data) => { const at = await state(key); return call(path + '/party', key, { game: at.game, index: at.index, ...data }); };
      return { path, host, keys, captain, others, state, press, party, call };
    };
    await run({ call, room });
  } finally { child.kill(); }
}

// The game has moved on: a different step, round or party state on the TV.
const moment = state => JSON.stringify([state.phase, state.index, state.party]);

test('only two steps stay with the TV host, each for a stated reason', () => {
  assert.deepEqual(tvOnlyStepList, [['rare', 'rare-review'], ['tracks', 'party-build']]);
  for (const [mode, phase] of tvOnlyStepList) {
    assert.equal(onlyTvMovesOn(mode, phase), true);
    assert.match(tvStepNote(mode, phase), /TV host/, 'the phone says plainly that the TV moves it on');
  }
  for (const [mode, phase] of [['sketch', 'sketch-draw'], ['sketch', 'sketch-reveal'], ['spotlight', 'spotlight-ready'], ['spotlight', 'spotlight-expert'],
    ['spotlight', 'spotlight-answer'], ['spotlight', 'spotlight-reveal'], ['rare', 'rare-write'], ['rare', 'rare-reveal'], ['tracks', 'party-placed'],
    ['tracks', 'party-reveal'], ['classic', 'question'], ['classic', 'reveal'], ['constructor', 'lobby'], ['rare', 'constructor']]) {
    assert.equal(onlyTvMovesOn(mode, phase), false, `${mode} ${phase} is the captain's to move on too`);
    assert.equal(tvStepNote(mode, phase), undefined);
  }
});

test('Sketch Sprint: the captain reveals the drawing and calls the next artist from their phone', async () => {
  await withServer(async ({ room }) => {
    const g = await room({ mode: 'sketch', format: 'choice', category: 'mixed', count: 3, seconds: 0, playStyle: 'individual' }, 3);
    const labels = [];
    for (let turn = 0; turn < 6; turn++) {
      const at = await g.state(g.captain);
      const html = phone(at);
      assert.match(html, advanceButton, `${at.phase}: the captain has a button`);
      labels.push(html.match(/data-action="advance">([^<]+)/)[1].trim());
      assert.doesNotMatch(phone(await g.state(g.others[0])), advanceButton, 'other phones never show it');
      assert.equal((await g.press(g.others[0], at)).status, 403, 'a player who is not the captain is still refused');
      const pressed = await g.press(g.captain, at);
      assert.equal(pressed.status, 204, JSON.stringify(pressed.body));
      const after = await g.state();
      assert.notEqual(moment(after), moment(at), 'the press moved the game on');
      // A second tap of the same button (or one that arrives late) is ignored, never applied to the next step.
      assert.equal((await g.press(g.captain, at)).status, 204);
      assert.equal(moment(await g.state()), moment(after), 'a stale press changes nothing');
    }
    assert.deepEqual(labels, ['Reveal drawing', 'Next artist', 'Reveal drawing', 'Next artist', 'Reveal drawing', 'Final results']);
    assert.equal((await g.state()).phase, 'finished');
  });
});

test('Spotlight Wheel: the captain spins, skips a slow turn and calls the next contestant, but never skips their own turn', async () => {
  await withServer(async ({ room }) => {
    const g = await room({ mode: 'spotlight', category: 'mixed', format: 'choice', count: 1, seconds: 0 }, 3);
    const seen = new Set();
    for (let step = 0; step < 20; step++) {
      const at = await g.state(g.captain);
      if (at.phase === 'finished') break;
      const html = phone(at);
      const ownTurn = at.phase === 'spotlight-expert' && at.party.expertTurn || at.phase === 'spotlight-answer' && at.party.contestantTurn;
      if (ownTurn) {
        // As the expert the captain advises, and as the contestant they answer: no "skip my own turn" button.
        assert.doesNotMatch(html, advanceButton, `${at.phase}: no skip button on the captain's own turn`);
        assert.equal((await g.party(g.captain, { action: at.phase === 'spotlight-expert' ? 'advice' : 'answer', option: 0 })).status, 204);
        seen.add(at.phase + ' (own turn)');
        continue;
      }
      assert.match(html, advanceButton, `${at.phase}: the captain has a button`);
      assert.equal((await g.press(g.others[0], at)).status, 403, 'a player who is not the captain is still refused');
      assert.equal((await g.press(g.captain, at)).status, 204, `${at.phase}: the captain's button works`);
      const after = await g.state();
      assert.notEqual(moment(after), moment(at));
      assert.equal((await g.press(g.captain, at)).status, 204);
      assert.equal(moment(await g.state()), moment(after), 'a stale press changes nothing');
      seen.add(at.phase);
    }
    assert.equal((await g.state()).phase, 'finished');
    for (const phase of ['spotlight-ready', 'spotlight-expert', 'spotlight-answer', 'spotlight-reveal']) assert.ok(seen.has(phase), phase);
    assert.ok(seen.has('spotlight-answer (own turn)'), 'the captain had a turn as contestant');
  });
});

test('Rare Find: the captain closes the answers and moves on after the reveal; only the TV host finishes the answer review', async () => {
  await withServer(async ({ room }) => {
    const g = await room({ mode: 'rare', category: 'mixed', count: 3, format: 'choice', seconds: 0 }, 3);
    let at = await g.state(g.captain);
    assert.equal(at.phase, 'rare-write');
    assert.match(phone(at), /data-action="advance">Close answers</);
    assert.doesNotMatch(phone(await g.state(g.others[0])), advanceButton);
    const odd = 'Zxqv not on any list';
    assert.equal((await g.party(g.others[0], { action: 'write', text: odd })).status, 204);
    assert.equal((await g.press(g.others[1], at)).status, 403, 'a player who is not the captain is still refused');
    assert.equal((await g.press(g.captain, at)).status, 204, 'the captain closes the answers for a player who has wandered off');
    at = await g.state(g.captain);
    assert.equal(at.phase, 'rare-review');
    // The review is the TV host's alone: the captain never sees the unrecognised answers or a button for them.
    assert.doesNotMatch(JSON.stringify(at), /Zxqv/);
    const html = phone(at);
    assert.doesNotMatch(html, advanceButton, 'no dead button during the review');
    assert.ok(html.includes(escape(tvStepNote('rare', 'rare-review'))), 'the captain is told the TV moves this step on');
    const refused = await g.press(g.captain, at);
    assert.equal(refused.status, 403);
    assert.equal(refused.body.error, tvStepNote('rare', 'rare-review'));
    const tv = await g.state();
    for (const row of tv.party.reviews) assert.equal((await g.call(g.path + '/party', g.host, { game: tv.game, index: tv.index, action: 'review', token: row.token, decision: 'reject' })).status, 204);
    assert.equal((await g.press(g.host, tv)).status, 204);
    at = await g.state(g.captain);
    assert.equal(at.phase, 'rare-reveal');
    assert.match(phone(at), /data-action="advance">\s*Next rarity round/);
    assert.equal((await g.press(g.captain, at)).status, 204, 'the captain starts the next round');
    const next = await g.state();
    assert.deepEqual([next.phase, next.index], ['rare-write', 1]);
    assert.equal((await g.press(g.captain, at)).status, 204);
    assert.deepEqual([(await g.state()).phase, (await g.state()).index], ['rare-write', 1], 'a stale press changes nothing');
  });
});

test('Fork in the Tracks: the captain moves on after each placement and verdict and starts the rematch; the card vote stays with the TV', async () => {
  await withServer(async ({ room }) => {
    const g = await room({ mode: 'tracks', category: 'mixed', format: 'mixed', seconds: 0, count: 3, playStyle: 'teams', teamCount: 2 }, 3);
    const phases = new Set();
    for (let step = 0; step < 60; step++) {
      const at = await g.state(g.captain);
      phases.add(at.phase);
      const html = phone(at);
      if (at.phase === 'finished') {
        assert.match(html, /data-action="(quick-replay|choose-game)"/, 'the captain can start the next game');
        assert.equal((await g.call(g.path + '/rematch', g.captain, { game: at.game, sameGame: true })).status, 204);
        break;
      }
      if (at.phase === 'party-build') {
        assert.doesNotMatch(html, advanceButton, 'no dead button during the card vote');
        assert.ok(html.includes(escape(tvStepNote('tracks', 'party-build'))), 'the captain is told the TV can close the vote early');
        const refused = await g.press(g.captain, at);
        assert.equal(refused.status, 403);
        assert.equal(refused.body.error, tvStepNote('tracks', 'party-build'));
        for (const key of g.keys) {
          const own = await g.state(key);
          if (own.phase === 'party-build' && !own.party.driverTurn && !own.party.voted) await g.party(key, { action: 'card', step: own.party.step, option: 0 });
        }
        continue;
      }
      if (at.phase === 'party-judge') {
        assert.doesNotMatch(html, advanceButton, 'the Trolley Driver decides, not the captain');
        for (const key of g.keys) if ((await g.state(key)).party.canJudge) await g.party(key, { action: 'judge', track: 0 });
        continue;
      }
      assert.match(html, advanceButton, `${at.phase}: the captain has a button`);
      assert.doesNotMatch(phone(await g.state(g.others[0])), advanceButton, 'other phones never show it');
      assert.equal((await g.press(g.others[0], at)).status, 403, 'a player who is not the captain is still refused');
      assert.equal((await g.press(g.captain, at)).status, 204, `${at.phase}: the captain's button works`);
      assert.notEqual(moment(await g.state()), moment(at));
    }
    for (const phase of ['party-build', 'party-placed', 'party-judge', 'party-reveal', 'finished']) assert.ok(phases.has(phase), phase);
    assert.equal((await g.state()).phase, 'lobby', 'the rematch is ready');
  });
});

test('every party game: each button on the captain\'s phone moves the game on, and each end screen lets the captain play again', async () => {
  await withServer(async ({ room }) => {
    const problems = [];
    // Hot Potato has no step buttons (it runs on its countdown; pausing is covered elsewhere).
    for (const mode of partyModes.filter(id => id !== 'potato')) {
      const g = await room({ ...partySettings(mode), count: questionCounts(mode, 'choice', 'mixed')[0], seconds: 0 }, Math.max(4, minimumPlayers(mode)));
      for (let step = 0; step < 60; step++) {
        const at = await g.state(g.captain);
        const html = phone(at);
        for (const key of g.others) if (advanceButton.test(phone(await g.state(key)))) problems.push(`${mode} ${at.phase}: a player who is not the captain has a button`);
        if (at.phase === 'finished') {
          if (!/data-action="(quick-replay|choose-game)"/.test(html)) problems.push(`${mode}: the end screen has no way for the captain to play again`);
          break;
        }
        const before = moment(await g.state());
        if (advanceButton.test(html)) {
          if (onlyTvMovesOn(mode, at.phase)) problems.push(`${mode} ${at.phase}: a button for a step only the TV moves on`);
          const pressed = await g.press(g.captain, at);
          if (pressed.status !== 204) problems.push(`${mode} ${at.phase}: the captain's button was refused (${pressed.status} ${pressed.body?.error})`);
          else if (moment(await g.state()) === before) problems.push(`${mode} ${at.phase}: the captain's button did nothing`);
          else continue;
        }
        // No captain button here: move on as the TV and the players would.
        const tv = await g.state();
        await g.press(g.host, tv);
        if (moment(await g.state()) !== before) continue;
        if (tv.phase === 'rare-review') for (const row of tv.party.reviews ?? []) await g.call(g.path + '/party', g.host, { game: tv.game, index: tv.index, action: 'review', token: row.token, decision: 'reject' });
        for (const key of g.keys) if ((await g.state(key)).party?.canJudge) await g.party(key, { action: 'judge', track: 0 });
        if (moment(await g.state()) === before) { problems.push(`${mode} ${tv.phase}: stuck`); break; }
      }
    }
    assert.deepEqual(problems, []);
  });
});
