import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceQuizRace, createQuizRace, publicRaceState, racePowers, raceSpeed, submitRaceAnswer, useRacePower } from '../quiz-race.js';

const pool = Array.from({ length: 30 }, (_, i) => ({ type: 'choice', prompt: 'Q' + i, options: ['a', 'b', 'c', 'd'], correct: 0, category: 'general' }));
const start = () => {
  const race = createQuizRace([['a', { id: 'A', name: 'Ada' }], ['b', { id: 'B', name: 'Bo' }], ['c', { id: 'C', name: 'Cy' }]], pool, { length: 'short' }, 0);
  advanceQuizRace(race, 4000);
  return race;
};

test('a boost is armed before answering: a right answer is worth double, a wrong one wastes it', () => {
  const race = start();
  const [ada, bo] = ['a', 'b'].map(key => race.racers.get(key));
  assert.equal(ada.boosts, racePowers.boosts);
  assert.equal(useRacePower(race, 'a', 'boost').status, 204);
  assert.equal(ada.armed, true);
  assert.equal(ada.boosts, racePowers.boosts - 1);
  assert.equal(raceSpeed(ada, race.time), 1, 'arming does nothing by itself');
  assert.equal(useRacePower(race, 'a', 'boost').status, 409, 'it cannot be armed twice');
  assert.equal(publicRaceState(race, 'a', false).own.armed, true);
  const boosted = submitRaceAnswer(race, 'a', { questionId: ada.question.id, option: 0 }, race.time);
  const plain = submitRaceAnswer(race, 'b', { questionId: bo.question.id, option: 0 }, race.time);
  assert.ok(Math.abs(boosted.amount - plain.amount * racePowers.boostMultiplier) < 1e-9, 'double speed for that answer');
  assert.equal(ada.armed, false, 'it pays out once');
  advanceQuizRace(race, race.lastWall + 900);
  // Armed again, then a wrong answer: gone, with nothing gained.
  assert.equal(useRacePower(race, 'a', 'boost').status, 204);
  const wrong = submitRaceAnswer(race, 'a', { questionId: ada.question.id, option: 1 }, race.time);
  assert.ok(wrong.amount < 0, 'a wrong answer still slows you');
  assert.equal(ada.armed, false);
  assert.equal(ada.boosts, racePowers.boosts - 2);
  assert.equal(publicRaceState(race, 'a', false).own.fizzled, true);
  assert.equal(useRacePower(race, 'a', 'boost').status, 409, 'none left');
});

test('an armed boost is lost if the question times out', () => {
  const race = start();
  const ada = race.racers.get('a');
  useRacePower(race, 'a', 'boost');
  advanceQuizRace(race, race.lastWall + 13000);
  assert.equal(ada.armed, false);
  assert.equal(ada.timeouts, 1);
});

test('three nudges: one only lands on a rival alongside and slows them briefly; at nobody it is wasted', () => {
  const race = start();
  const [ada, bo, cy] = ['a', 'b', 'c'].map(key => race.racers.get(key));
  cy.distance += 30;
  const miss = useRacePower(race, 'c', 'ram');
  assert.equal(miss.status, 204);
  assert.equal(miss.missed, true, 'nobody near Cy');
  assert.equal(cy.rams, 2, 'a wasted nudge is spent and does not come back');
  assert.equal(publicRaceState(race, 'c', false).own.missed, true);
  assert.equal(raceSpeed(ada, race.time), 1, 'nobody was slowed');
  bo.distance += 1;
  const hit = useRacePower(race, 'a', 'ram');
  assert.equal(hit.status, 204);
  assert.equal(hit.target, 'B', 'the nearest rival alongside');
  assert.equal(ada.rams, 2);
  assert.ok(raceSpeed(bo, race.time) < 0.6, 'Bo is slowed');
  assert.equal(raceSpeed(ada, race.time), 1, 'the nudger is not');
  assert.ok(racePowers.rammed.duration <= 1500, 'only for a moment');
  advanceQuizRace(race, race.lastWall + racePowers.rammed.duration + 50);
  assert.equal(raceSpeed(bo, race.time), 1, 'and it wears off');
  // Out of range is a miss too: alongside means close.
  bo.distance = ada.distance + racePowers.ramRange + 0.5;
  assert.equal(useRacePower(race, 'a', 'ram').missed, true);
  useRacePower(race, 'a', 'ram');
  assert.equal(ada.rams, 0);
  assert.equal(useRacePower(race, 'a', 'ram').status, 409, 'only three a race');
});

test('five right in a row sets the kart on fire, on the TV and the phone, until a miss', () => {
  const race = start();
  const ada = race.racers.get('a');
  const answer = right => { const result = submitRaceAnswer(race, 'a', { questionId: ada.question.id, option: right ? 0 : 1 }, race.time); advanceQuizRace(race, race.lastWall + 900); return result; };
  for (let i = 0; i < 4; i++) answer(true);
  assert.equal(publicRaceState(race, undefined, true).racers.find(r => r.id === 'A').fire, undefined, 'not yet');
  answer(true);
  assert.equal(ada.streak, racePowers.fireStreak);
  assert.equal(publicRaceState(race, undefined, true).racers.find(r => r.id === 'A').fire, true);
  assert.equal(publicRaceState(race, 'a', false).own.onFire, true);
  answer(false);
  assert.equal(publicRaceState(race, undefined, true).racers.find(r => r.id === 'A').fire, undefined, 'a miss puts it out');
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
  assert.deepEqual([own.boosts, own.rams], [racePowers.boosts, 2]);
  assert.ok(['Bo', 'Cy'].includes(own.ramTarget));
  const victim = [...race.racers.entries()].find(([, r]) => r.power?.kind === 'rammed');
  assert.equal(publicRaceState(race, victim[0], false).own.rammedBy, 'Ada');
  const tv = publicRaceState(race, undefined, true);
  assert.equal(tv.own, undefined);
  assert.deepEqual(tv.racers.map(r => r.power).filter(Boolean).sort(), ['ram', 'rammed']);
  assert.ok(!JSON.stringify(tv.racers).includes('boosts'), 'charges stay on the owner\'s phone');
  assert.equal(racePowers.rams, 3);
});

const quizPool = Array.from({ length: 30 }, (_, i) => ({ type: 'choice', category: 'general', prompt: 'Question ' + i + '?', options: ['A', 'B', 'C', 'D'], correct: 0 }));
const grid = () => {
  const race = createQuizRace([['a', { id: 'a', name: 'Ada' }], ['b', { id: 'b', name: 'Bo' }], ['c', { id: 'c', name: 'Cy' }]], quizPool, { length: 'medium' }, 0);
  advanceQuizRace(race, 3100);
  return race;
};
const answer = (race, key, right = true) => {
  const racer = race.racers.get(key);
  return submitRaceAnswer(race, key, { questionId: racer.question.id, option: right ? 0 : 1 }, race.time);
};

test('a shield soaks up a ram for six seconds, once per race', () => {
  const race = grid();
  assert.equal(useRacePower(race, 'b', 'shield').status, 204);
  assert.equal(useRacePower(race, 'b', 'shield').status, 409, 'only one shield');
  assert.equal(publicRaceState(race, 'b', false).racers.find(r => r.id === 'b').shield, true);
  const hit = useRacePower(race, 'a', 'ram');
  assert.equal(hit.status, 204);
  assert.ok(hit.target === 'b' || hit.target === 'c');
  const target = [...race.racers.values()].find(r => r.id === hit.target);
  if (target.id === 'b') {
    assert.equal(hit.blocked, true);
    assert.notEqual(target.effect?.amount, racePowers.rammed.amount, 'the shielded car is not slowed');
    assert.equal(publicRaceState(race, 'b', false).own.blocked, 'Ada');
  }
  assert.equal(race.racers.get('a').rams, racePowers.rams - 1, 'the ram is spent either way');
  // The shield runs out.
  advanceQuizRace(race, race.lastWall + racePowers.shieldTime + 100);
  assert.equal(publicRaceState(race, 'b', false).racers.find(r => r.id === 'b').shield, undefined);
  race.racers.get('b').distance = race.racers.get('a').distance;
  race.racers.get('c').distance = 0;
  race.racers.get('a').distance = race.racers.get('b').distance = 20;
  assert.equal(useRacePower(race, 'a', 'ram').blocked, undefined, 'no shield, the ram lands');
});

test('three right answers in a row earn a turbo boost, capped, and a miss resets the run', () => {
  const race = grid();
  const ada = race.racers.get('a');
  const next = () => { advanceQuizRace(race, race.lastWall + 800); };
  for (let i = 0; i < 2; i++) { assert.equal(answer(race, 'a').status, 204); next(); }
  assert.equal(ada.boosts, racePowers.boosts, 'two right is not a turbo');
  answer(race, 'a', false); next();
  assert.equal(ada.streak, 0, 'a wrong answer resets the run');
  for (let i = 0; i < 3; i++) { answer(race, 'a'); next(); }
  assert.equal(ada.boosts, racePowers.boosts + 1, 'turbo earned');
  assert.equal(ada.turbos, 1);
  assert.equal(publicRaceState(race, 'a', false).own.turboEarned, true);
  for (let i = 0; i < 3; i++) { answer(race, 'a'); next(); }
  assert.equal(ada.boosts, racePowers.maxBoosts, 'never more than the cap in hand');
});

test('slipstream helps a car tucked in behind, and the final sprint makes right answers worth more', () => {
  const race = grid();
  const [ada, bo, cy] = ['a', 'b', 'c'].map(key => race.racers.get(key));
  ada.distance = 20; bo.distance = 18.5; cy.distance = 5;
  for (const racer of [ada, bo, cy]) { racer.effect = null; racer.question = { id: 99, item: quizPool[0], started: race.time, deadline: race.time + 60000 }; }
  const before = [ada.distance, bo.distance, cy.distance];
  advanceQuizRace(race, race.lastWall + 1000);
  const moved = [ada, bo, cy].map((racer, i) => racer.distance - before[i]);
  assert.ok(Math.abs(moved[0] - 1) < 1e-6, 'the leader gets no tow');
  assert.ok(Math.abs(moved[2] - 1) < 1e-6, 'too far back for a tow');
  assert.ok(Math.abs(moved[1] - (1 + racePowers.slipSpeed)) < 1e-6, 'tucked in behind: a little faster');
  const view = publicRaceState(race, 'b', false);
  assert.equal(view.racers.find(r => r.id === 'b').slip, true);
  assert.equal(view.finalSprint, false);
  // Final sprint.
  ada.distance = race.length * racePowers.sprintFrom + 1;
  ada.question = { id: 100, item: quizPool[0], started: race.time, deadline: race.time + 60000 };
  bo.question = { id: 100, item: quizPool[0], started: race.time, deadline: race.time + 60000 };
  const sprint = submitRaceAnswer(race, 'a', { questionId: 100, option: 0 }, race.time);
  const normal = submitRaceAnswer(race, 'b', { questionId: 100, option: 0 }, race.time);
  assert.ok(Math.abs(sprint.amount - normal.amount * racePowers.sprintBonus) < 1e-9);
  assert.equal(publicRaceState(race, 'a', false).finalSprint, true);
  assert.equal(publicRaceState(race, 'a', false).own.sprint, true);
});
