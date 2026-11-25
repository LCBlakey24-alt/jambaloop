import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stingFor, stingView } from '../public/show-sting.js';

const state = (phase, index = 0, extra = {}) => ({ code: '123456', game: 1, phase, index, total: 5, mode: 'classic', ...extra });

test('a title sting plays at kick-off and a final band before the last round, on the TV only', () => {
  assert.equal(stingFor('123456/1/0/lobby', state('question'), true), 'title');
  assert.equal(stingFor('123456/1/0/lobby', state('party-write', 0, { mode: 'punchline' }), true), 'title');
  assert.equal(stingFor('123456/1/0/lobby', state('question'), false), null, 'phones never get stings');
  assert.equal(stingFor(undefined, state('question'), true), null, 'a mid-game reload stays quiet');
  assert.equal(stingFor('999999/1/0/lobby', state('question'), true), null, 'another room');
  assert.equal(stingFor('123456/0/0/finished', state('question'), true), null, 'a previous game');
  assert.equal(stingFor('123456/1/3/reveal', state('question', 4), true), 'final');
  assert.equal(stingFor('123456/1/4/question', state('reveal', 4), true), null, 'once per round, not on the reveal');
  assert.equal(stingFor('123456/1/2/reveal', state('question', 3), true), null);
  assert.equal(stingFor('123456/1/0/lobby', state('lobby'), true), null);
});

test('stings wear the show identity, are decorative and respect reduced motion', () => {
  const html = stingView('title', 'knockout');
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /--id-display:'Show Knockout'/);
  assert.match(html, /<span>KNOCK<\/span><span>OUT<\/span>/);
  assert.match(stingView('final', 'classic', 'Final question'), /<span>Final<\/span><span>question<\/span>/);
  const css = readFileSync(new URL('../public/show-sting.css', import.meta.url), 'utf8');
  assert.match(css, /\.show-sting \{ position:fixed; inset:0; z-index:900; pointer-events:none;/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\) \{ \.show-sting \{ display:none; \} \}/);
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(enter\) playSting\(stingFor\(renderedPhase, s, host\), s, \{ reducedMotion: matchMedia/);
});
