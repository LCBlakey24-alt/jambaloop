import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceQuizRace, createQuizRace, publicRaceState, racePowers, raceSpeed, useRacePower } from '../quiz-race.js';

const pool = Array.from({ length: 30 }, (_, i) => ({ type: 'choice', prompt: 'Q' + i, options: ['a', 'b', 'c', 'd'], correct: 0, category: 'general' }));
const start = () => {
  const race = createQuizRace([['a', { id: 'A', name: 'Ada' }], ['b', { id: 'B', name: 'Bo' }], ['c', { id: 'C', name: 'Cy' }]], pool, { length: 'short' }, 0);
  advanceQuizRace(race, 4000);
  return race;
};

test('one boost per race: it speeds you up, then it is gone', () => {
  const race = start();
  assert.equal(useRacePower(race, 'a', 'boost').status, 204);
  const ada = race.racers.get('a');
  assert.equal(ada.boosts, 0);
  assert.ok(raceSpeed(ada, race.time) > 1.8, 'boosting');
  assert.equal(useRacePower(race, 'a', 'boost').status, 409, 'only one');
  const before = [...race.racers.values()].map(r => r.distance);
  advanceQuizRace(race, 6000);
  const gain = [...race.racers.values()].map((r, i) => r.distance - before[i]);
  assert.ok(gain[0] > gain[1] + 0.5, 'the boosted car pulls ahead');
});

test('three rams: only in range, the victim slows, a miss costs nothing', () => {
  const race = start();
  const [ada, bo, cy] = ['a', 'b', 'c'].map(key => race.racers.get(key));
  cy.distance += 30;
  assert.equal(useRacePower(race, 'c', 'ram').status, 409, 'nobody near Cy');
  assert.equal(cy.rams, 3, 'a miss keeps the charge');
  bo.distance += 1;
  const hit = useRacePower(race, 'a', 'ram');
  assert.equal(hit.status, 204);
  assert.equal(hit.target, 'B', 'the nearest rival in range');
  assert.equal(ada.rams, 2);
  assert.ok(raceSpeed(bo, race.time) < 0.6, 'Bo is slowed');
  assert.equal(raceSpeed(ada, race.time), 1, 'the rammer is not');
  useRacePower(race, 'a', 'ram'); useRacePower(race, 'a', 'ram');
  assert.equal(ada.rams, 0);
  assert.equal(useRacePower(race, 'a', 'ram').status, 409, 'only three');
});

test('power-ups are refused before the lights go out, after finishing and for strangers', () => {
  const race = createQuizRace([['a', { id: 'A', name: 'Ada' }], ['b', { id: 'B', name: 'Bo' }]], pool, {}, 0);
  advanceQuizRace(race, 1000);
  assert.equal(useRacePower(race, 'a', 'boost').status, 409, 'countdown');
  advanceQuizRace(race, 4000);
  assert.equal(useRacePower(race, 'zzz', 'boost').status, 403);
  assert.equal(useRacePower(race, 'a', 'teleport').status, 400);
  race.racers.get('a').finishedAt = 1;
  assert.equal(useRacePower(race, 'a', 'boost').status, 409, 'finished');
});

test('each phone sees its own charges and target; the TV sees only the flashes', () => {
  const race = start();
  useRacePower(race, 'a', 'ram');
  const own = publicRaceState(race, 'a', false).own;
  assert.deepEqual([own.boosts, own.rams], [1, 2]);
  assert.ok(['Bo', 'Cy'].includes(own.ramTarget));
  const victim = [...race.racers.entries()].find(([, r]) => r.power?.kind === 'rammed');
  assert.equal(publicRaceState(race, victim[0], false).own.rammedBy, 'Ada');
  const tv = publicRaceState(race, undefined, true);
  assert.equal(tv.own, undefined);
  assert.deepEqual(tv.racers.map(r => r.power).filter(Boolean).sort(), ['ram', 'rammed']);
  assert.ok(!JSON.stringify(tv.racers).includes('boosts'), 'charges stay on the owner\'s phone');
  assert.equal(racePowers.rams, 3);
});
