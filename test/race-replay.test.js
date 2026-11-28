import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { advanceQuizRace, createQuizRace, publicRaceState, raceReplay, replayStep, submitRaceAnswer, useRacePower } from '../quiz-race.js';
import { replayRacers, replayTimeline } from '../public/race-replay.js';
import { quizRaceView } from '../public/quiz-race-view.js';

const players = ['a', 'b', 'c'].map((key, i) => [key, { id: key.toUpperCase(), name: ['Ada', 'Bo', 'Cy'][i] }]);
// Run a short symbol race to the end: Ada taps right every time, Bo every other time, Cy never.
function runRace() {
  const race = createQuizRace(players, [], { length: 'short', style: 'symbols', scale: .15 }, 0);
  let wall = 0;
  for (let guard = 0; guard < 4000 && !race.finished; guard++) {
    wall += 100;
    advanceQuizRace(race, wall);
    for (const [key, right] of [['a', true], ['b', guard % 2 === 0]]) {
      const racer = race.racers.get(key);
      if (!racer.question || racer.finishedAt !== undefined) continue;
      const { correct, options } = racer.question.item;
      submitRaceAnswer(race, key, { questionId: racer.question.id, option: right ? correct : (correct + 1) % options.length }, race.time);
    }
    if (guard === 60) useRacePower(race, 'a', 'boost');
  }
  return race;
}

test('the server records the race four times a second while it runs, and hands it over only once it is over', () => {
  const race = createQuizRace(players, [], { length: 'short', style: 'symbols', scale: .15 }, 0);
  advanceQuizRace(race, 5000);
  assert.equal(raceReplay(race), undefined, 'no replay while the race is on');
  const done = runRace();
  const replay = raceReplay(done);
  assert.ok(replay);
  assert.equal(replay.step, replayStep);
  assert.equal(replay.from, 3000, 'it starts when the lights go out');
  assert.deepEqual(replay.racers.map(racer => racer.name), ['Ada', 'Bo', 'Cy']);
  const finishMs = Math.max(...replay.racers.map(racer => racer.finishedAt ?? 0));
  assert.ok(replay.frames.length >= Math.floor((finishMs - 3000) / replayStep), 'a frame for every quarter second');
  for (const frame of replay.frames) assert.equal(frame.length, 3);
  // Distances only ever go forwards, and the last frame is where the race ended.
  for (let i = 1; i < replay.frames.length; i++) for (let r = 0; r < 3; r++) assert.ok(replay.frames[i][r][0] >= replay.frames[i - 1][r][0] - 1e-9);
  const final = publicRaceState(done, undefined, true).racers;
  for (const [r, racer] of replay.racers.entries()) assert.ok(Math.abs(replay.frames.at(-1)[r][0] - final.find(entry => entry.id === racer.id).distance) < .01);
  // Public things only: no questions, grids or answers in the recording.
  const text = JSON.stringify(replay);
  assert.doesNotMatch(text, /Tap the|shape:|num:|let:|prompt|options|correct/);
  assert.ok(replay.frames.some(frame => frame[0][1] === 'armed' || frame[0][1] === 'boost' || (frame[0][2] & 4)), 'power-ups are in it, so the replay shows them too');
});

test('the replay timeline: sped up, slow motion at the finish, and the whole thing over in under a minute', () => {
  const replay = raceReplay(runRace());
  const timeline = replayTimeline(replay);
  assert.ok(timeline.duration > 5000 && timeline.duration < 60000, 'duration ' + timeline.duration);
  assert.deepEqual(timeline.at(0), { at: 3000, slow: false, done: false }, 'it opens on the grid');
  assert.equal(timeline.at(timeline.duration).done, true);
  assert.equal(timeline.at(timeline.duration + 5000).at, timeline.end, 'it holds on the finishing order');
  // Race time only moves forwards as the replay plays.
  let last = 0, sawSlow = false;
  for (let play = 0; play <= timeline.duration; play += 50) {
    const { at, slow } = timeline.at(play);
    assert.ok(at >= last - 1e-9);
    last = at;
    if (slow) { sawSlow = true; assert.ok(at >= timeline.first - 5000 - 1 && at <= timeline.first + 1500 + 1, 'slow motion is around the first finish'); }
  }
  assert.ok(sawSlow, 'the finish is shown in slow motion');
  // A long race is squeezed: three minutes of racing replays in well under a minute.
  const long = { step: 250, from: 3000, length: 190, racers: [{ id: 'A', finishedAt: 183000 }, { id: 'B' }], frames: Array.from({ length: 761 }, (_, i) => [[i / 4, '', 0], [i / 5, '', 0]]) };
  assert.ok(replayTimeline(long).duration < 45000, 'long race replay ' + replayTimeline(long).duration);
});

test('replay karts are drawn exactly where they were, places included, in the same shape as the live race', () => {
  const replay = raceReplay(runRace());
  const start = replayRacers(replay, 3000);
  assert.deepEqual(start.map(racer => racer.distance), [0, 0, 0]);
  assert.ok(start.every(racer => ['id', 'name', 'color', 'marker', 'distance', 'speed', 'position'].every(field => racer[field] !== undefined)));
  const end = replayRacers(replay, replayTimeline(replay).end);
  const ada = end.find(racer => racer.id === 'A');
  assert.equal(ada.position, 1, 'Ada tapped right every time');
  assert.equal(ada.distance, replay.length);
  assert.ok(ada.finishedAt !== undefined);
  assert.equal(end.find(racer => racer.id === 'C').position, 3);
  // Half way between two frames is half way between the two distances.
  const i = 20;
  const between = replayRacers(replay, replay.from + (i + .5) * replay.step).find(racer => racer.id === 'B').distance;
  assert.ok(Math.abs(between - (replay.frames[i][1][0] + replay.frames[i + 1][1][0]) / 2) < .002);
});

const base = { mode: 'quizrace', playerCount: 3, teams: [], player: { id: 'B' } };
const kit = { icons: () => '', replayButtons: () => '<button data-action="quick-replay">Replay this game</button>', sending: false };
test('during the replay the TV shows the track with a replay strip, phones point at the TV, and only the captain or TV can skip', () => {
  const race = runRace();
  const tvState = { ...base, phase: 'finished', race: publicRaceState(race, undefined, true) };
  const tv = quizRaceView(tvState, { ...kit, host: true, canControl: true, replaying: true });
  assert.match(tv, /race-replay-panel/);
  assert.match(tv, /Action replay/);
  assert.match(tv, /race-track-wrap/, 'the same track as the race');
  assert.match(tv, /data-replay-progress/);
  assert.match(tv, /data-action="replay-skip"/);
  assert.doesNotMatch(tv, /wins (Quiz Race|Symbol Dash)|quick-replay/, 'no result until the replay is over');
  const phoneState = { ...base, phase: 'finished', race: publicRaceState(race, 'b', false) };
  const phone = quizRaceView(phoneState, { ...kit, host: false, canControl: false, replaying: true });
  assert.match(phone, /Watch the TV/);
  assert.match(phone, /YOU FINISHED/);
  assert.doesNotMatch(phone, /replay-skip/, 'a player who is not the captain cannot skip it');
  assert.match(quizRaceView(phoneState, { ...kit, host: false, canControl: true, replaying: true }), /replay-skip/);
  // Afterwards: the normal results, with a button to watch it again on the TV.
  const after = quizRaceView(tvState, { ...kit, host: true, canControl: true, replaying: false });
  assert.match(after, /wins Symbol Dash!/, 'Symbol Dash is named as itself');
  assert.match(after, /data-action="replay-again"/);
});

test('the app plays the replay on the TV only, holds the confetti until the results, and the phone has no 3D window', () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /if\(session\.host&&replayPlaying\(state\)\)\{/);
  assert.match(app, /s\.raceReplay\?\.playing &&/, 'the end of the replay changes the state every screen compares, so nobody is left on the replay');
  assert.match(app, /raceTrackView\?\.update\(racers,loaded\.data\.length,0,reducedReplay,at\);/, 'the replay draws through the same track view as the live race');
  assert.match(app, /if \(replayPlaying\(s\)\) return;/, 'no celebration during the replay');
  assert.match(app, /if \(s\.phase === 'finished' && !replayPlaying\(s\)\) \{/, 'no Game Night panel under the replay');
  assert.match(app, /const stage=host\?app\.querySelector\('\.race-track-wrap'\):null;/, 'the 3D scene is on the TV only');
  assert.doesNotMatch(app, /race-cockpit|drawCockpit|data-race-chase/);
});

let server, origin;
test.before(async () => {
  server = spawn(process.execPath, ['server.js'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, PORT: '0', PUBLIC_URL: '', RACE_LENGTH_SCALE: '0.03' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const [line] = await Promise.race([once(server.stdout, 'data'), delay(10000).then(() => { throw new Error('Server startup timeout'); })]);
  origin = String(line).match(/http:\/\/localhost:\d+/)?.[0];
});
test.after(() => server?.kill());
async function request(path, body, key, status = 200) {
  const res = await fetch(origin + '/api/rooms' + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'x-game-key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(res.status, status, path + ' ' + await res.clone().text());
  return res.status === 204 ? undefined : res.json();
}

test('on the server: the replay starts when the race ends, every screen is told when it ends, and it can be skipped or watched again', async () => {
  const room = await request('', { mode: 'quizrace', format: 'choice', category: 'general', count: 5, seconds: 0, raceLength: 'short', raceStyle: 'symbols', raceDifficulty: 'easy' }, undefined, 201);
  const path = '/' + room.code;
  const [ada, bo] = [await request(path + '/join', { name: 'Ada' }, undefined, 201), await request(path + '/join', { name: 'Bo' }, undefined, 201)];
  await request(path + '/race-replay', undefined, ada.key, 404);
  await request(path + '/advance', { game: 1, phase: 'lobby', index: 0 }, room.host, 204);
  // Ada taps the right tile until the race is over.
  let state;
  for (let i = 0; i < 400; i++) {
    state = await request(path, undefined, ada.key);
    if (state.phase === 'finished') break;
    const q = state.race.own?.question;
    if (state.phase === 'race' && q?.symbols) await fetch(origin + '/api/rooms' + path + '/race-answer', { method: 'POST', headers: { 'content-type': 'application/json', 'x-game-key': ada.key }, body: JSON.stringify({ game: 1, questionId: q.id, option: q.symbols.tiles.indexOf(q.symbols.target) }) });
    await delay(60);
  }
  assert.equal(state.phase, 'finished');
  const tv = await request(path, undefined, room.host);
  assert.ok(tv.raceReplay, 'the replay is on');
  assert.ok(tv.raceReplay.until > tv.now, 'and still playing');
  assert.equal(tv.raceReplay.until - tv.raceReplay.startedAt, replayTimeline(await request(path + '/race-replay', undefined, room.host)).duration, 'the server and the TV agree how long it runs');
  assert.equal(tv.raceReplay.playing, true);
  const boView = (await request(path, undefined, bo.key)).raceReplay;
  assert.deepEqual([boView.id, boView.startedAt, boView.until], [tv.raceReplay.id, tv.raceReplay.startedAt, tv.raceReplay.until], 'phones are told the same times');
  const replay = await request(path + '/race-replay', undefined, bo.key);
  assert.equal(replay.racers.length, 2);
  await request(path + '/race-replay', undefined, undefined, 403);
  // Only the captain or the TV can skip or restart it.
  const captain = (await request(path, undefined, ada.key)).isCaptain ? ada : bo;
  const other = captain === ada ? bo : ada;
  await request(path + '/race-replay', { game: 1, action: 'skip' }, other.key, 403);
  await request(path + '/race-replay', { game: 1, action: 'rewind' }, room.host, 400);
  await request(path + '/race-replay', { game: 2, action: 'skip' }, room.host, 409);
  await request(path + '/race-replay', { game: 1, action: 'skip' }, captain.key, 204);
  const skipped = await request(path, undefined, room.host);
  assert.ok(skipped.raceReplay.until <= skipped.now, 'skipped: the results are up');
  assert.equal(skipped.raceReplay.playing, false, 'and every screen\'s state says so, so phones move on too');
  await request(path + '/race-replay', { game: 1, action: 'again' }, room.host, 204);
  const again = await request(path, undefined, room.host);
  assert.ok(again.raceReplay.until > again.now);
  assert.equal(again.raceReplay.id, skipped.raceReplay.id + 1);
  // A rematch clears it.
  await request(path + '/rematch', { game: 1, sameGame: true }, room.host, 204);
  const fresh = await request(path, undefined, room.host);
  assert.equal(fresh.raceReplay, undefined);
  await request(path + '/race-replay', undefined, room.host, 404);
});
