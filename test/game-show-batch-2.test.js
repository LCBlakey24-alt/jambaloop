import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { showIdentity, showMark } from '../public/show-identity.js';
import { modeStyle } from '../public/mode-style.js';
import { scoreReveal } from '../public/ceremony.js';

const css = readFileSync(new URL('../public/game-show-batch-2.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const batch = ['board', 'dice', 'quizrace'];

test('batch two loads after batch one and before the shared polish layer', () => {
  const one = html.indexOf('href="/game-show-batch-1.css"');
  const two = html.indexOf('href="/game-show-batch-2.css"');
  const polish = html.indexOf('href="/visual-polish.css"');
  assert.ok(one >= 0 && two > one && polish > two);
});

test('each batch two show has its own studio, finale, palette and TV stage', () => {
  assert.equal(new Set(batch.map(id => showIdentity(id).studio)).size, 3);
  assert.equal(new Set(batch.map(id => showIdentity(id).finale)).size, 3);
  assert.equal(new Set(batch.map(id => modeStyle(id).backdrop)).size, 3);
  for (const id of batch) {
    assert.ok(css.includes(`.game.host-screen[data-mode="${id}"]`), id + ' TV stage');
    assert.ok(css.includes(`.tile-art[data-show="${id}"]`), id + ' launcher cover');
    const reveal = scoreReveal(true, { mode: id, ceremony: { starts: 0 } });
    assert.ok(reveal.includes(showIdentity(id).finale) && reveal.includes(showMark(id)));
    assert.ok(reveal.includes('data-action="ceremony-skip"'), 'finale stays skippable');
  }
});

test('batch two motion is show-specific, cheap to composite and reduced-motion safe', () => {
  for (const name of ['board-card-flip', 'deco-sweep', 'neon-floor', 'neon-tick']) assert.match(css, new RegExp('@keyframes ' + name));
  // The neon floor scrolls with a transform, never by repainting a background.
  const floor = css.match(/@keyframes neon-floor \{([^\n]+)\}/)[1];
  assert.match(floor, /translateY/);
  assert.doesNotMatch(floor, /background-position/);
  const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion:reduce)'));
  for (const selector of ['.game[data-mode="board"] .question-panel .answer', '.race-track-wrap[data-track="neon"]::before', '.race-countdown']) {
    assert.ok(reduced.includes(selector), selector + ' must stop for reduced motion');
  }
  // Letter badges stay upright: diamonds are drawn with clip-path, not rotation.
  assert.doesNotMatch(css, /answer strong \{[^}]*rotate\(/);
});
