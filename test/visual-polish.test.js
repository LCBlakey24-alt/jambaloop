import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { celebrate, countUp, prefersReducedMotion } from '../public/motion.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('public/visual-polish.css');
const html = read('public/index.html');
const app = read('public/app.js');
const board = read('public/board.js');

test('visual polish loads after every game stylesheet; only the identity, TV, answer-colour, show-moment and simple-phone layers follow it', () => {
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(sheets.slice(sheets.indexOf('/visual-polish.css') + 1), ['/game-identities.css', '/tv-immersive.css', '/answer-colours.css', '/show-moments.css', '/tv-screen.css', '/phone-simple.css']);
});

test('every decorative animation has a reduced-motion opt-out', () => {
  const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion:reduce)'));
  for (const selector of ['.mode-list .game-tile', '.game.phase-enter .answers .answer', '.timer.urgent',
    '.podium-place', '.scene-backdrop > i', '.confetti-layer', '.game-tile::after']) {
    assert.ok(reduced.includes(selector), selector + ' must be disabled for reduced motion');
  }
  // Entrances never start fully invisible, so a frozen frame still shows the stage.
  for (const name of ['journey-stage-in', 'journey-answer-in', 'answer-deal']) {
    const rule = css.match(new RegExp('@keyframes ' + name + ' \\{ from \\{ opacity:([.\\d]+)'));
    assert.ok(rule && Number(rule[1]) > 0, name + ' must start partly visible');
  }
});

test('launcher gap and tile sizing use the same values at seven columns', () => {
  assert.match(css, /body:not\(\.playing\) \.home-shell \.mode-list \{ gap:var\(--tile-gap\); \}/);
  assert.match(css, /--shell-inline:min\(1400px,calc\(100vw - 40px\)\)/);
  assert.match(css, /6 \* var\(--tile-gap\)[^;]*\/7\)/);
});

test('TV reveal keeps standings in the sidebar instead of a second full-width board', () => {
  assert.doesNotMatch(app, /<div class="game-panel round-leaders"><h2>Leaderboard<\/h2>/);
  assert.match(app, /s\.players\.slice\(0, 8\)/);
});

test('motion helpers are safe no-ops without a browser or with reduced motion', () => {
  assert.equal(prefersReducedMotion(), true);
  assert.equal(celebrate('test/key'), false);
  assert.doesNotThrow(() => countUp(null));
});

test('3D table avoids per-mount environment prefiltering and idles only on the TV', () => {
  assert.doesNotMatch(board, /PMREMGenerator|scene\.environment\s*=/);
  assert.match(board, /NeutralToneMapping/);
  assert.match(board, /closest\('\.host-screen'\)/);
  assert.match(board, /prefers-reduced-motion/);
});
