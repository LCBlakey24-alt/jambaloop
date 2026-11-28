import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { releasedGameIds } from '../released-games.js';
import { isEstimateShow, modes, questionCounts } from '../public/game-config.js';
import { partySettings, queuedSettings } from '../public/game-night.js';

// Every path that picks a game without the full setup form builds its
// settings from queuedSettings or partySettings: the lobby carousel's
// "Play this game", the TV lobby's quick switch, hosting from a game's tile
// and the Game Night playlist. Bloodmoon, Catch Up, Shade and Don't Look!
// play one game (count 1) and Way Off is a closest-number show, so a
// hand-written count of 5 or a 'choice' format was refused by the server and
// the captain's phone showed "Check the game settings".
const everyGame = [...new Set([...releasedGameIds, ...modes.map(([id]) => id)])];

let server;
let origin;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: '0', PUBLIC_URL: '', ROOMS_PER_MINUTE: '5000', MAX_ROOMS: '5000' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
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
  assert.equal(response.status, status, path + ' ' + JSON.stringify(body) + ' -> ' + JSON.stringify(data));
  return data;
}

test('the released list and the game catalogue name the same games', () => {
  assert.deepEqual([...releasedGameIds].sort(), modes.map(([id]) => id).sort());
});

test('quick settings follow the server\'s own length and format rules for every game', () => {
  for (const mode of everyGame) {
    for (const [label, build] of [['queuedSettings', queuedSettings], ['partySettings', partySettings]]) {
      const settings = build(mode, 'club');
      assert.equal(settings.mode, mode);
      if (isEstimateShow(mode)) {
        assert.equal(settings.format, 'estimate', `${label}(${mode}) is a closest-number show`);
        assert.equal(settings.difficulty, 'standard', `${label}(${mode}) has no curated difficulty`);
      }
      // Knockout always plays its full ladder; the server ignores the count.
      if (mode === 'knockout') continue;
      const format = settings.privateQuestions ? 'choice' : settings.format;
      assert.ok(questionCounts(mode, format, settings.category).includes(settings.count),
        `${label}(${mode}) sends count ${settings.count}; allowed ${questionCounts(mode, format, settings.category)}`);
    }
  }
  for (const mode of ['bloodmoon', 'catchup', 'shade', 'dontlook']) {
    assert.equal(queuedSettings(mode, 'club').count, 1, mode + ' plays one game');
    assert.equal(partySettings(mode, 'club').count, 1, mode + ' plays one game');
  }
  assert.equal(partySettings('wayoff', 'club').format, 'estimate');
  // The games that already worked keep the lengths they had.
  assert.equal(queuedSettings('board', 'club').count, 12);
  assert.equal(queuedSettings('spotlight', 'club').count, 1);
  assert.equal(queuedSettings('topanswers', 'club').count, 3);
  assert.equal(queuedSettings('rare', 'club').count, 3);
  assert.equal(queuedSettings('samepage', 'club').count, 5);
  assert.equal(queuedSettings('classic', 'club').count, 5);
  assert.equal(queuedSettings('classic', 'club').difficulty, 'family');
  assert.deepEqual([partySettings('classic', 'club').count, partySettings('classic', 'club').format], [10, 'mixed']);
  assert.equal(partySettings('board', 'club').count, 12);
  assert.equal(queuedSettings('soclose', 'club').format, 'estimate');
});

test('hosting a party from any game tile opens a room the server accepts', async () => {
  for (const mode of everyGame) {
    const room = await request('', undefined, { ...partySettings(mode, 'club'), picker: true }, 201);
    const state = await request('/' + room.code, room.host);
    assert.equal(state.picker.mode, mode, mode + ' starts the carousel on its own tile');
  }
});

test('the captain\'s "Play this game" and the TV\'s quick switch load every released game', async () => {
  const room = await request('', undefined, { ...partySettings('classic', 'club'), picker: true }, 201);
  const path = '/' + room.code;
  const captain = await request(path + '/join', undefined, { name: 'Captain' }, 201);
  const read = () => request(path, room.host);
  assert.equal((await request(path, captain.key)).isCaptain, true);
  await request(path + '/browse', captain.key, { open: true, skipIntro: true, game: (await read()).game }, 204);
  for (const mode of everyGame) {
    // Captain phone: open the carousel, centre the game, tap Play this game.
    let { game, lobbyVersion } = await read();
    await request(path + '/browse', captain.key, { open: true, mode, game }, 204);
    await request(path + '/configure', captain.key, { ...partySettings(mode, 'club'), game, lobbyVersion }, 204);
    const picked = await read();
    assert.equal(picked.mode, mode, 'Play this game loads ' + mode);
    assert.equal(picked.picker, undefined, 'the carousel closes once ' + mode + ' is chosen');
    // TV lobby: the ‹ › quick switch to the same game.
    ({ game, lobbyVersion } = picked);
    await request(path + '/configure', room.host, { ...queuedSettings(mode, 'club'), game, lobbyVersion }, 204);
    assert.equal((await read()).mode, mode, 'the quick switch loads ' + mode);
  }
});

const oneQuestion = { title: 'Warm-up', questions: [{ type: 'boolean', prompt: 'Warm-up question', correct: 0 }] };

async function finish(path, host) {
  for (let step = 0; step < 20; step++) {
    const { game, index, phase } = await request(path, host);
    if (phase === 'finished') return request(path, host);
    await request(path + '/advance', host, { game, index, phase }, 204);
  }
  assert.fail('the warm-up game did not finish');
}

test('a Game Night playlist can load every released game next', async () => {
  for (const mode of everyGame) {
    const room = await request('', undefined, { mode: 'classic', category: 'mixed', count: 5, seconds: 0, customQuiz: oneQuestion }, 201);
    const path = '/' + room.code;
    await request(path + '/join', undefined, { name: 'Player' }, 201);
    const lobby = await request(path, room.host);
    await request(path + '/playlist', room.host, { game: lobby.game, version: lobby.night.version, queue: [mode] }, 204);
    const finished = await finish(path, room.host);
    await request(path + '/playlist/next', room.host, { game: finished.game, version: finished.night.version }, 204);
    const next = await request(path, room.host);
    assert.equal(next.mode, mode, 'the playlist loads ' + mode);
    assert.equal(next.phase, 'lobby');
  }
});
