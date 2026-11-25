import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enforceTvLegibility, tvTextFloor } from '../public/tv-legibility.js';

const css = readFileSync(new URL('../public/answer-colours.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

const luminance = hex => {
  const channel = c => { const v = parseInt(hex.slice(c, c + 2), 16) / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  return .2126 * channel(1) + .7152 * channel(3) + .0722 * channel(5);
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

test('each answer has its own strong colour with AA-contrast text', () => {
  const colours = ['a', 'b', 'c', 'd'].map(letter => ({
    background: css.match(new RegExp(`--answer-${letter}:(#[0-9a-f]{6})`))[1],
    ink: css.match(new RegExp(`--answer-${letter}-ink:(#[0-9a-f]{6})`))[1],
  }));
  assert.equal(new Set(colours.map(c => c.background)).size, 4, 'four distinct colours');
  for (const { background, ink } of colours) assert.ok(contrast(background, ink) >= 4.5, `${ink} on ${background}`);
  // The shared palette feeds the TV badges and vote bars too.
  assert.match(app, /const colors = \['#c8203f', '#1d5fd0', '#f2b01e', '#0d8250'\];/);
});

test('phones show colour blocks with letters, a clear pick and a faded remainder', () => {
  // Class selectors, not <button>: locked-in answers render as <div>s and keep their colour.
  for (const selector of ['.answers > .answer', '.brain-answers > .brain-answer', '.spotlight-options > .spotlight-choice', '.top-options > .top-option']) assert.ok(css.includes(selector));
  assert.doesNotMatch(css, /-answers > button|-options > button/);
  assert.match(css, /background:#ffffff !important; color:var\(--solid\) !important;/, 'letter discs keep the letter as a non-colour cue');
  assert.match(css, /:has\(> :is\(\.selected, \.is-chosen, \.is-selected, \[aria-pressed="true"\]\)\)/);
  // The TV shows the same solid blocks, with a light vote-share bar on top.
  assert.match(css, /body \.game\.host-screen :is\(\.question-panel \.answers > \.answer, \.brain-answers > \.brain-answer, \.spotlight-options > \.spotlight-choice, \.top-options > \.top-option:not\(\.is-revealed\)\) \{\n  background:linear-gradient\(90deg,#ffffff38 0 var\(--share,0%\)/);
});

test('the TV text floor scales with screen height and is a no-op without a DOM', () => {
  assert.equal(tvTextFloor(1080), 24);
  assert.equal(tvTextFloor(720), 16);
  assert.equal(tvTextFloor(2160), 40);
  assert.equal(enforceTvLegibility(null), 0);
  assert.match(app, /if \(immersive && innerWidth > 760\) enforceTvLegibility\(app\.querySelector\('section\.game'\)\);/);
});
