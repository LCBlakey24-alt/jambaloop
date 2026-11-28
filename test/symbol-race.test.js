import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceQuizRace, createQuizRace, publicRaceState, raceStyles, submitRaceAnswer, symbolEffect, symbolRace, symbolRound, useRacePower } from '../quiz-race.js';
import { raceSymbols, symbolGridSize, symbolMarkup } from '../public/race-symbols.js';
import { quizRaceView } from '../public/quiz-race-view.js';

const players = ['a', 'b', 'c'].map((key, i) => [key, { id: key.toUpperCase(), name: ['Ada', 'Bo', 'Cy'][i] }]);
const start = (difficulty = 'easy') => {
  const race = createQuizRace(players, [], { length: 'short', style: 'symbols', difficulty }, 0);
  advanceQuizRace(race, 3200);
  return race;
};
const tap = (race, key, right = true, at = race.time) => {
  const racer = race.racers.get(key);
  const { correct, options } = racer.question.item;
  return submitRaceAnswer(race, key, { questionId: racer.question.id, option: right ? correct : (correct + 1) % options.length }, at);
};

test('twelve symbols, each with its own shape and its own colour', () => {
  assert.equal(raceSymbols.length, 12);
  for (const field of ['id', 'name', 'colour', 'path']) assert.equal(new Set(raceSymbols.map(symbol => symbol[field])).size, 12, field + ' is unique');
  assert.match(symbolMarkup('star', true), /aria-label="star"/);
  assert.deepEqual(['easy', 'medium', 'hard'].map(level => symbolGridSize(level)), [6, 9, 12]);
  assert.deepEqual([0, .5, .9].map(progress => symbolGridSize('mixed', progress)), [6, 9, 12], 'mixed grows as the race goes on');
});

test('a grid has one right square among different symbols, and the target changes every time', () => {
  let previous;
  for (let i = 0; i < 200; i++) {
    const round = symbolRound(9, previous);
    assert.equal(new Set(round.tiles).size, 9, 'no symbol appears twice');
    assert.equal(round.tiles[round.correct], round.target);
    assert.notEqual(round.target, previous, 'never the same target twice running');
    assert.equal(round.prompt, 'Tap the ' + round.options[round.correct]);
    previous = round.target;
  }
});

test('the symbol race needs no questions, deals a grid to every phone, and never sends which square is right', () => {
  assert.deepEqual(raceStyles, ['quiz', 'symbols']);
  assert.throws(() => createQuizRace(players, [], { style: 'quiz' }, 0), /question pool/);
  assert.throws(() => createQuizRace(players, [], { style: 'other' }, 0), /Invalid race setup/);
  const race = start('medium');
  const own = publicRaceState(race, 'a', false).own;
  assert.equal(own.question.symbols.tiles.length, 9);
  assert.ok(own.question.symbols.tiles.includes(own.question.symbols.target));
  assert.equal(own.question.correct, undefined);
  assert.equal(own.question.deadline - race.time <= symbolRace.window, true);
  const tv = publicRaceState(race, undefined, true);
  assert.equal(tv.style, 'symbols');
  assert.equal(tv.own, undefined);
  assert.equal(JSON.stringify(tv).includes('tiles'), false, 'the TV never gets anybody\'s grid');
  assert.equal(race.issued.size, 0, 'symbol prompts are not remembered as seen questions');
});

test('the right symbol speeds you up (faster for a quick tap), the wrong one slows you, and a new grid follows at once', () => {
  assert.ok(symbolEffect('correct', .4).amount > symbolEffect('correct', 2).amount);
  assert.ok(symbolEffect('correct', 5).amount > 0);
  assert.ok(symbolEffect('wrong').amount < 0 && symbolEffect('timeout').amount < 0);
  const race = start();
  const [ada, bo] = ['a', 'b'].map(key => race.racers.get(key));
  assert.equal(tap(race, 'a', true).outcome, 'correct');
  assert.equal(tap(race, 'b', false).outcome, 'wrong');
  assert.ok(ada.speed > 1.4 && bo.speed < .7);
  assert.equal(submitRaceAnswer(race, 'c', { questionId: race.racers.get('c').question.id, pass: true }).status, 400, 'there is no pass in the symbol race');
  const first = ada.questionIndex;
  advanceQuizRace(race, race.lastWall + symbolRace.wait + 120);
  assert.equal(ada.question.id, first + 1, 'the grid reshuffles straight away');
  // Leaving a grid alone times out, slows you, and deals another.
  const cy = race.racers.get('c');
  advanceQuizRace(race, race.lastWall + symbolRace.window + 200);
  assert.equal(cy.timeouts, 1);
  assert.ok(cy.speed < 1);
});

test('streaks are longer in the symbol race: a boost at ten in a row, on fire at fifteen; nudges and the armed boost still work', () => {
  const race = start();
  const ada = race.racers.get('a');
  const next = () => advanceQuizRace(race, race.lastWall + symbolRace.wait + 120);
  const boosts = ada.boosts;
  for (let i = 0; i < 9; i++) { tap(race, 'a'); next(); }
  assert.equal(ada.boosts, boosts, 'nine is not enough');
  assert.equal(publicRaceState(race, undefined, true).racers.find(r => r.id === 'A').fire, undefined);
  tap(race, 'a'); next();
  assert.equal(ada.boosts, boosts + 1);
  assert.equal(publicRaceState(race, 'a', false).own.turboStreak, 10);
  for (let i = 0; i < 5; i++) { tap(race, 'a'); next(); }
  assert.equal(publicRaceState(race, undefined, true).racers.find(r => r.id === 'A').fire, true);
  assert.equal(useRacePower(race, 'a', 'boost').armed, true);
  const result = tap(race, 'a');
  assert.ok(result.amount > symbolRace.correct.fast, 'the armed boost doubles the tap');
  assert.equal(ada.effect.duration, symbolRace.correct.duration * 2, 'and lasts twice as long');
  const [bo, cy] = ['b', 'c'].map(key => race.racers.get(key));
  bo.distance = cy.distance;
  assert.equal(useRacePower(race, 'b', 'ram').target, 'C');
});

test('the phone shows the target, a grid of symbol buttons and the driver\'s-eye window; the quiz race is unchanged', () => {
  const race = start('hard');
  const base = { phase: 'race', mode: 'quizrace', playerCount: 3, player: { id: 'A' }, teams: [] };
  const kit = { host: false, canControl: false, icons: () => '', replayButtons: () => '', sending: false };
  const state = { ...base, race: publicRaceState(race, 'a', false) };
  const html = quizRaceView(state, kit);
  assert.match(html, /SYMBOL DASH/);
  assert.match(html, /data-race-cockpit/);
  assert.match(html, /TAP THE/);
  assert.equal((html.match(/data-action="race-answer"/g) ?? []).length, 12);
  assert.match(html, /data-size="12"/);
  assert.doesNotMatch(html, /race-pass/);
  for (const id of state.race.own.question.symbols.tiles) assert.ok(html.includes(`aria-label="${raceSymbols.find(symbol => symbol.id === id).name}"`), 'every square is named for a screen reader');
  const tv = quizRaceView({ ...base, race: publicRaceState(race, undefined, true) }, { ...kit, host: true, canControl: true });
  assert.match(tv, /SYMBOL DASH · TAP THE MATCHING SYMBOL/);
  assert.match(tv, /Tap the matching symbol on your phone/);
  const quiz = createQuizRace(players, [{ type: 'choice', prompt: 'Q?', options: ['a', 'b', 'c', 'd'], correct: 0, category: 'General' }], { length: 'short' }, 0);
  advanceQuizRace(quiz, 3200);
  const quizHtml = quizRaceView({ ...base, race: publicRaceState(quiz, 'a', false) }, kit);
  assert.match(quizHtml, /QUIZ RACE/);
  assert.match(quizHtml, /race-pass/);
  assert.doesNotMatch(quizHtml, /data-race-cockpit|race-symbol-grid/);
});

test('the phone window is the TV\'s own 3D scene with a chase camera, and the drawn view is only the fallback', async () => {
  const { readFileSync } = await import('node:fs');
  const read = path => readFileSync(new URL('../public/' + path, import.meta.url), 'utf8');
  const app = read('app.js'), scene = read('race-3d.js'), css = read('quiz-race.css');
  assert.match(scene, /export function mountRace3D\(\{ key, track = 'neon', course = 'medium', reducedMotion = false, chase, light = false \}\)/);
  assert.match(scene, /if \(chase && chased\) \{/, 'one scene, two cameras');
  assert.match(app, /const stage=host\?app\.querySelector\('\.race-track-wrap'\):app\.querySelector\('\[data-race-chase\]'\);/);
  assert.match(app, /chase:host\?undefined:s\.player\?\.id,light:!host,/, 'the TV still frames the whole track');
  assert.match(app, /if\(cockpit&&!race3d\?\.ready\)drawCockpit\(/, 'the drawn view only runs when 3D is not available');
  assert.match(app, /race3dFailed!==raceKey/, 'a phone without 3D does not retry on every update');
  assert.match(css, /\.race-chase\[data-race3d="ready"\] \.race-cockpit\{visibility:hidden\}/);
});
