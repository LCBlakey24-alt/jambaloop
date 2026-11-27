import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { hosts, momentCalls, presenters, reactionTakes, spoken } from '../public/duo-scripts.js';
import { duoRecordings, duoTake } from '../public/duo-recordings.js';
import { momentFor, potatoClockCall } from '../public/moment-calls.js';

const state = (mode, phase, extra = {}) => ({ game: 1, mode, phase, index: 0, total: 5, party: {}, ...extra });
const call = (before, next) => momentFor(before, next)?.slice(0, 2).join('/');

test('every moment line is short, spoken by a regular host, recorded, and registered for recording', () => {
  for (const [game, kinds] of Object.entries(momentCalls)) for (const [kind, lines] of Object.entries(kinds)) {
    assert.ok(lines.length >= 2, `${game}/${kind} has variety`);
    lines.forEach(([host, text], index) => {
      const key = `react-${game}-${kind}-${index + 1}`;
      assert.ok(presenters.includes(host) && hosts[host], `${key}: a regular host`);
      assert.ok(spoken(text).length > 5 && spoken(text).length <= 90, `${key}: a short call`);
      assert.doesNotMatch(spoken(text), /[\[\]—]/, `${key}: clean caption`);
      assert.deepEqual(reactionTakes[key], [[host, text]], `${key} is registered`);
      assert.ok(duoRecordings[key] && existsSync(new URL('../public' + duoTake(key), import.meta.url)), `${key} is recorded`);
    });
  }
});

test('a moment is called once, at the public beat, and never across games', () => {
  assert.equal(call(state('bluff', 'party-vote'), state('bluff', 'party-reveal', { party: { caught: true } })), 'bluff/caught');
  assert.equal(call(state('bluff', 'party-vote'), state('bluff', 'party-reveal', { party: { escaped: true } })), 'bluff/escaped');
  assert.equal(call(state('bluff', 'party-reveal', { party: { caught: true } }), state('bluff', 'party-reveal', { party: { caught: true } })), undefined, 'not repeated on a later update');
  assert.equal(call(state('bluff', 'party-vote'), state('bluff', 'party-reveal', { party: {} })), undefined, 'nothing to say when nobody voted');
  assert.equal(call(state('bluff', 'party-vote'), { ...state('bluff', 'party-reveal', { party: { caught: true } }), game: 2 }), undefined);
  assert.equal(call(undefined, state('bluff', 'party-write')), undefined);
});

test('round-opening lines are saved for the first round, and the last round gets its own', () => {
  assert.equal(call(state('punchline', 'lobby'), state('punchline', 'party-write', { party: { votePoints: 100 } })), 'funny/write');
  assert.equal(call(state('punchline', 'party-reveal', { index: 1 }), state('punchline', 'party-write', { index: 2, party: { votePoints: 100 } })), undefined);
  assert.equal(call(state('cards', 'party-reveal', { index: 3 }), state('cards', 'party-write', { index: 4, party: { votePoints: 200 } })), 'funny/final');
  assert.equal(call(state('brain', 'brain-reveal', { index: 3 }), state('brain', 'brain-question', { index: 4 })), 'brain/top');
});

test('vote and match outcomes are read from revealed counts only', () => {
  const reveal = ballot => call(state('punchline', 'party-vote'), state('punchline', 'party-reveal', { party: { ballot } }));
  assert.equal(reveal([{ votes: 3 }, { votes: 0 }]), 'funny/landslide');
  assert.equal(reveal([{ votes: 2 }, { votes: 2 }, { votes: 1 }]), 'funny/tie');
  assert.equal(reveal([{ votes: 2 }, { votes: 1 }]), 'funny/votes');
  assert.equal(reveal([{}, {}]), undefined, 'no votes, no line');
  const same = groups => call(state('samepage', 'party-write'), state('samepage', 'party-reveal', { party: { groups } }));
  assert.equal(same([{ count: 4 }]), 'samepage/all');
  assert.equal(same([{ count: 1 }, { count: 1 }]), 'samepage/none');
  assert.equal(same([{ count: 3 }, { count: 1 }]), 'samepage/big');
  assert.equal(same([{ count: 2 }, { count: 1 }]), undefined);
  const rare = groups => call(state('rare', 'rare-write'), state('rare', 'rare-reveal', { party: { results: { groups } } }));
  assert.equal(rare([{ count: 2 }, { count: 1 }]), 'rare/unique');
  assert.equal(rare([{ count: 2 }, { count: 2 }]), 'rare/shared');
  const top = results => call(state('topanswers', 'top-guess'), state('topanswers', 'top-reveal', { party: { results } }));
  assert.equal(top({ totalVotes: 4, mostVotes: 4, leaders: [0] }), 'top/unanimous');
  assert.equal(top({ totalVotes: 4, mostVotes: 2, leaders: [0, 1] }), 'top/tie');
  assert.equal(top({ totalVotes: 4, mostVotes: 3, leaders: [2] }), 'top/clear');
});

test('the trolley, the sketch, the dice, the wheel, the ladder and the teams', () => {
  assert.equal(call(state('tracks', 'party-placed', { party: { step: 0 } }), state('tracks', 'party-build', { party: { step: 1 } })), 'tracks/sabotage');
  assert.equal(call(state('tracks', 'party-placed'), state('tracks', 'party-judge')), 'tracks/judge');
  assert.equal(call(state('tracks', 'party-judge'), state('tracks', 'party-reveal')), 'tracks/lever');
  const drawing = count => state('sketch', 'sketch-draw', { ends: 100000, party: { correctCount: count } });
  assert.equal(call(drawing(0), drawing(1)), 'sketch/first');
  assert.equal(call(drawing(1), drawing(2)), undefined, 'only the first correct guess is called');
  assert.equal(call(drawing(0), state('sketch', 'sketch-reveal', { now: 100000, party: { correctCount: 0 } })), 'sketch/nobody');
  assert.equal(call(drawing(2), state('sketch', 'sketch-reveal', { now: 40000, party: { correctCount: 3 } })), 'sketch/cracked');
  const rolled = (multiplier, index = 0) => call(state('dice', 'rolling', { index }), state('dice', 'question', { index, motion: { multiplier } }));
  assert.equal(rolled(3, 1), 'dice/triple');
  assert.equal(rolled(2, 1), 'dice/double');
  assert.equal(rolled(1, 1), undefined, 'an ordinary roll is mostly left alone');
  assert.equal(rolled(3, 4), undefined, 'the final question keeps its own line');
  assert.equal(call(state('wheel', 'ready'), state('wheel', 'rolling')), 'wheel/spin');
  assert.equal(call(state('wheel', 'ready', { index: 1 }), state('wheel', 'rolling', { index: 1 })), undefined);
  const climb = (outcomes, remaining, was = 3) => call(state('brain', 'brain-question', { party: { remaining: was } }), state('brain', 'brain-reveal', { party: { outcomes, remaining } }));
  assert.equal(climb([{ correct: true }, { correct: true }], 2), 'brain/allright');
  assert.equal(climb([{ correct: false }, { correct: false }], 2), 'brain/nobody');
  assert.equal(climb([{ correct: false, eliminated: true }, { correct: true }], 2), 'brain/out');
  assert.equal(climb([{ correct: false, eliminated: true }, { correct: true }], 1), 'brain/last');
  const teams = (a, b) => [{ id: 'a', score: a }, { id: 'b', score: b }];
  assert.equal(call(state('showdown', 'reveal', { teams: teams(5, 3) }), state('showdown', 'score-break', { teams: teams(5, 8) })), 'showdown/lead');
  assert.equal(call(state('showdown', 'reveal', { teams: teams(5, 3) }), state('showdown', 'score-break', { teams: teams(5, 5) })), 'showdown/level');
  assert.equal(call(state('showdown', 'reveal', { teams: teams(5, 3) }), state('showdown', 'score-break', { teams: teams(9, 3) })), undefined);
  assert.equal(call(state('showdown', 'question', { teams: teams(5, 3) }), state('showdown', 'reveal', { teams: teams(5, 8) })), undefined, 'not before the scores are on screen');
});

test('Hot Potato: start, the clock marks once each, and the burn', () => {
  assert.equal(call(state('potato', 'lobby'), state('potato', 'party-potato')), 'potato/start');
  assert.equal(call(state('potato', 'party-potato'), state('potato', 'finished')), 'potato/burned');
  assert.equal(potatoClockCall(60500, 59900), 'minute');
  assert.equal(potatoClockCall(59900, 59000), undefined);
  assert.equal(potatoClockCall(20400, 19900), 'twenty');
  assert.equal(potatoClockCall(undefined, 19900), undefined, 'a reload mid-game does not shout');
  assert.equal(potatoClockCall(400, 0), undefined);
});
