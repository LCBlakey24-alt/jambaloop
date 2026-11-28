import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL('../' + path, import.meta.url), 'utf8');
}

test('live quiz phones identify pending, locked and revealed answers without altering the server outcome', async () => {
  const app = await source('public/app.js');
  assert.match(app, /const playerFeedback = !host && \(revealed \|\| locked \|\| sending \|\| eliminated\)/);
  assert.match(app, /data-feedback="\$\{revealed \? won \? 'correct' : 'incorrect'/);
  assert.match(app, /Answer locked in/);
  assert.match(app, /Sending your answer/);
  assert.match(app, /Correct answer!/);
  assert.match(app, /class="player-timer"/);
  assert.match(app, /class="time-track"/);
  assert.match(app, /submittingAnswer = answer/);
});

test('active question controls are kept on a single scrollable mobile surface', async () => {
  const [deck, style, html] = await Promise.all([
    source('public/mobile-deck.js'),
    source('public/player-live.css'),
    source('public/index.html')
  ]);
  assert.doesNotMatch(deck, /data-deck-hidden|mobile-pager/, 'live controls are never split into pages');
  assert.match(style, /overflow-y: auto;/);
  assert.match(style, /min-height: 65px/);
  assert.match(style, /prefers-reduced-motion: reduce/);
  assert.match(html, /href="\/player-live\.css"/);
});
