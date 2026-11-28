// A player's own status on their phone (phone audit, 28 November 2026): Brain Ladder phones never showed
// your lives or whether you were right; Catch Up phones showed a bare number and no time left; Hot Potato
// told everyone who was caught but never told the others they were safe; the paused screen told the
// captain to wait for the captain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { brainLadderView, livesLabel, ownVerdict } from '../public/brain-ladder-view.js';
import { catchUpView } from '../public/catch-up-view.js';
import { partyFinale } from '../public/party-finale.js';

const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const icons = () => '';
const roster = [{ id: 'a', name: 'Ada', lives: 2, score: 100 }, { id: 'b', name: 'Bo', lives: 1, score: 0 }, { id: 'c', name: 'Cy', lives: 0, score: 0 }];
const brain = (phase, party, player) => ({ phase, index: 0, total: 5, mode: 'brain', player, party: { type: 'brain', level: 1, roster, remaining: 2,
  question: { prompt: 'Which is odd?', options: ['1', '2', '3', '4'], ...(phase === 'brain-reveal' ? { correct: 0, explanation: 'One is odd.' } : {}) }, ...party } });

test('Brain Ladder phones show your lives while you climb, and your own verdict at each reveal', () => {
  const question = brainLadderView(brain('brain-question', { ownLives: 1, canAnswer: true }, { id: 'b' }), { host: false, canControl: false, escape, icons });
  assert.match(question, /aria-label="Your lives: 1 of 2">YOUR LIVES <b aria-hidden="true">♥♡<\/b>/);
  assert.match(livesLabel(0), /YOU’RE WATCHING/);
  const outcomes = [{ id: 'a', correct: true, answered: true, lives: 2, gained: 100, eliminated: false },
    { id: 'b', correct: false, answered: true, lives: 1, gained: 0, eliminated: false },
    { id: 'd', correct: false, answered: false, lives: 0, gained: 0, eliminated: true }];
  assert.match(ownVerdict({ outcomes }, { id: 'a' }), /✓ Right! \+100 points/);
  assert.match(ownVerdict({ outcomes }, { id: 'b' }), /✗ Not this time: you lost a life/);
  assert.match(ownVerdict({ outcomes }, { id: 'd' }), /✗ No answer in time: you’re out/);
  assert.match(ownVerdict({ outcomes }, { id: 'c' }), /You’re watching this climb/, 'already out before this level');
  const reveal = brainLadderView(brain('brain-reveal', { ownLives: 1, outcomes }, { id: 'b' }), { host: false, canControl: false, escape, icons });
  assert.match(reveal, /class="brain-verdict is-wrong"/);
  assert.doesNotMatch(reveal, /eliminated this step/, 'the room tally stays on the TV');
  const tv = brainLadderView(brain('brain-reveal', { outcomes }, undefined), { host: true, canControl: true, escape, icons });
  assert.match(tv, /eliminated this step/);
  assert.doesNotMatch(tv, /brain-verdict/);
});

test('Catch Up: the watching side sees whose count it is, and phones show the seconds left', () => {
  const sides = [{ id: 's1', name: 'Comets', colour: '#f00', members: [{ id: 'a', name: 'Ada' }], rounds: 0 }, { id: 's2', name: 'Rockets', colour: '#00f', members: [{ id: 'b', name: 'Bo' }], rounds: 0 }];
  const state = { phase: 'catch-leg', mode: 'catchup', index: 0, total: 2, player: { id: 'b' },
    party: { type: 'catchup', sides, turn: 0, side: 1, round: 0, rounds: 2, count: 5, chasing: true, target: 7, canAnswer: false, question: { prompt: 'Q', options: ['a', 'b', 'c', 'd'] } } };
  const html = catchUpView(state, { host: false, canControl: false, escape, icons });
  assert.match(html, /<strong>Comets: 5<\/strong> <span>· they need more than 7<\/span>/);
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(s\.phase === 'catch-leg' && !host && s\.ends\) timer = '<span class="player-timer"/);
});

test('Hot Potato tells everyone else they are safe; the pause screen speaks to the captain', () => {
  const state = { phase: 'finished', mode: 'potato', player: { id: 'a' }, party: { holder: { id: 'b', name: 'Bailey' }, passes: 3 } };
  const safe = partyFinale(state, { host: false, escape, variant: 'potato' });
  assert.match(safe, /<strong>You’re safe!<\/strong>/);
  assert.match(safe, /Bailey got caught · 3 successful passes/);
  const caught = partyFinale({ ...state, player: { id: 'b' } }, { host: false, escape, variant: 'potato' });
  assert.match(caught, /You got caught!/);
  assert.doesNotMatch(caught, /safe/);
  assert.match(partyFinale(state, { host: true, escape, variant: 'potato' }), /Bailey was caught!/);
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /canControl \? 'Tap Resume timer when everyone is ready\.' : 'The round continues when the captain resumes\.'/);
});
