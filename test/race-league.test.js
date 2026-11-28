import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createLeague, leagueCircuits, leaguePoints, leaguePointsFor, leagueStandings, leagueTrack, raceLengths, raceTracks, scoreLeagueRace } from '../quiz-race.js';
import { quizRaceView } from '../public/quiz-race-view.js';

test('a league is three races, one on each circuit, short first, on a different theme each time', () => {
  assert.deepEqual(leagueCircuits, ['short', 'medium', 'long']);
  for (const circuit of leagueCircuits) assert.ok(raceLengths[circuit]);
  assert.deepEqual([0, 1, 2].map(round => leagueTrack('jungle', round)), ['jungle', 'space', 'neon'], 'the chosen theme first, then the next ones');
  assert.ok(raceTracks.includes(leagueTrack('nonsense', 1)));
});

test('points for every place, the table adds up over the races, and the latest race breaks a tie', () => {
  assert.deepEqual(leaguePoints, [10, 8, 6, 5, 4, 3, 2, 1]);
  assert.equal(leaguePointsFor(12), 1, 'everyone who races scores');
  const league = createLeague(['a', 'b', 'c']);
  assert.equal(scoreLeagueRace(league, ['a', 'b', 'c']), false);
  assert.deepEqual(leagueStandings(league).map(row => [row.key, row.points, row.gained]), [['a', 10, 10], ['b', 8, 8], ['c', 6, 6]]);
  assert.equal(scoreLeagueRace(league, ['b', 'a', 'c']), false);
  // Level on 18: Bo won the latest race, so Bo is ahead.
  assert.deepEqual(leagueStandings(league).map(row => [row.key, row.points]), [['b', 18], ['a', 18], ['c', 12]]);
  assert.equal(scoreLeagueRace(league, ['c', 'a', 'b']), true, 'the third race ends the league');
  assert.deepEqual(leagueStandings(league).map(row => [row.key, row.points]), [['a', 26], ['b', 24], ['c', 22]]);
  assert.equal(league.round, 3);
});

const racers = [{ id: 'A', name: 'Ada', color: '#f00', marker: 1, distance: 70, speed: 1, position: 1, finishedAt: 60000 }, { id: 'B', name: 'Bo', color: '#0f0', marker: 2, distance: 60, speed: 1, position: 2 }];
const leagueState = (phase, round, extra = {}) => ({ phase, mode: 'quizrace', playerCount: 2, race: { length: 70, track: 'neon', course: 'short', racers }, player: { id: 'B' },
  league: { races: 3, round, next: leagueCircuits[round], table: [{ id: 'B', name: 'Bo', position: 1, points: 18, gained: 10 }, { id: 'A', name: 'Ada', position: 2, points: 18, gained: 8 }] }, ...extra });
const kit = { icons: () => '', replayButtons: () => '<button data-action="rematch">Replay</button>', sending: false };

test('between races the TV shows the table and the next circuit; only whoever controls the room can start the next race', () => {
  const tv = quizRaceView(leagueState('race-standings', 1), { ...kit, host: true, canControl: true });
  assert.match(tv, /LEAGUE · RACE 1 OF 3 DONE/);
  assert.match(tv, /Ada wins race 1!/, 'the race winner, not the table leader');
  assert.match(tv, /Next up: the figure-of-eight circuit/);
  assert.ok(tv.indexOf('Bo') < tv.lastIndexOf('Ada'), 'the table is in league order');
  assert.match(tv, /<em>\+10<\/em> 18 pts/);
  assert.match(tv, /data-action="advance">Start race 2/);
  const phone = quizRaceView(leagueState('race-standings', 1), { ...kit, host: false, canControl: false });
  assert.match(phone, /YOUR LEAGUE POSITION/);
  assert.match(phone, /#1 <small>of 2<\/small>/);
  assert.match(phone, /18 points · \+10 that race/);
  assert.doesNotMatch(phone, /data-action="advance"/, 'a player who is not the captain cannot start the next race');
  assert.match(quizRaceView(leagueState('race-standings', 1), { ...kit, host: false, canControl: true }), /data-action="advance">Start race 2/, 'the captain can');
});

test('the league ends on the table: the champion is whoever has the most points, not whoever won the last race', () => {
  const tv = quizRaceView(leagueState('finished', 3), { ...kit, host: true, canControl: true });
  assert.match(tv, /Bo wins the league!/);
  assert.match(tv, /Ada took the last race/);
  assert.match(tv, /data-action="rematch"/);
  assert.doesNotMatch(tv, /data-action="advance"/);
  assert.match(quizRaceView(leagueState('finished', 3), { ...kit, host: false, canControl: false }), /You won the league!/);
  // A single race is unchanged.
  const single = quizRaceView({ ...leagueState('finished', 0), league: undefined }, { ...kit, host: true, canControl: true });
  assert.match(single, /Ada wins Quiz Race!/);
});

test('the setup offers a league, and the race screen says which race of the league it is', () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /name="raceLeague">\$\{selected\(\[\['off','Single race'\],\['on','League · 3 races/);
  assert.match(app, /'race-standings': 'League standings'/);
  const racing = quizRaceView(leagueState('race', 1), { ...kit, host: true, canControl: true });
  assert.match(racing, /LEAGUE RACE 2 OF 3/);
});

let server; let origin;
before(async () => {
  server = spawn(process.execPath, ['server.js'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, PORT: '0', PUBLIC_URL: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const [line] = await Promise.race([once(server.stdout, 'data'), delay(10000).then(() => { throw new Error('Server startup timeout'); })]);
  origin = String(line).match(/http:\/\/localhost:\d+/)?.[0];
});
after(() => server?.kill());
async function request(path, body, key, status = 200) {
  const res = await fetch(origin + '/api/rooms' + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'x-game-key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(res.status, status, await res.clone().text());
  return res.status === 204 ? undefined : res.json();
}

test('a league room starts on the short circuit whatever length was picked, with an empty table for the TV', async () => {
  const config = { mode: 'quizrace', format: 'choice', category: 'general', count: 5, seconds: 0, raceLength: 'long', raceDifficulty: 'medium', raceTrack: 'snow' };
  await request('', { ...config, raceLeague: 'yes' }, undefined, 400);
  const room = await request('', { ...config, raceLeague: true }, undefined, 201);
  const path = '/' + room.code;
  await request(path + '/join', { name: 'Alex' }, undefined, 201);
  const blake = await request(path + '/join', { name: 'Blake' }, undefined, 201);
  const lobby = await request(path, undefined, room.host);
  assert.equal(lobby.raceLeague, true);
  assert.equal(lobby.league, undefined, 'no table before the first race');
  await request(path + '/advance', { game: 1, phase: 'lobby', index: 0 }, room.host, 204);
  const tv = await request(path, undefined, room.host);
  assert.equal(tv.race.course, 'short');
  assert.equal(tv.race.length, raceLengths.short);
  assert.equal(tv.race.track, 'snow');
  assert.deepEqual([tv.league.races, tv.league.round, tv.league.next], [3, 0, 'short']);
  assert.deepEqual(tv.league.table.map(row => row.points), [0, 0]);
  assert.equal((await request(path, undefined, blake.key)).league.table.length, 2, 'phones get the table too: it is public');
  // A single race still uses the chosen length and has no league.
  const single = await request('', config, undefined, 201);
  for (const name of ['Cy', 'Di']) await request('/' + single.code + '/join', { name }, undefined, 201);
  await request('/' + single.code + '/advance', { game: 1, phase: 'lobby', index: 0 }, single.host, 204);
  const state = await request('/' + single.code, undefined, single.host);
  assert.equal(state.race.course, 'long');
  assert.equal(state.league, undefined);
});
