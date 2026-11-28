import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { modes } from '../public/game-config.js';
import { explainer, demoView } from '../public/learning.js';

test('each setup has readable instructions, and only existing videos are offered on request', () => {
  for (const [mode] of modes) {
    const html = explainer(mode, true);
    assert.doesNotMatch(html, /undefined|autoplay/i, mode);
    assert.match(html, /How to play/);
    const video = html.match(/src="(\/videos\/[^"]+\.mp4)"/);
    if (video) {
      assert.ok(existsSync(new URL('../public' + video[1], import.meta.url)), mode);
      assert.match(html, /Video contains music/);
      assert.match(html, /<ol>/);
      assert.match(html, /preload="none"/);
    }
  }
});

test('Fork practice describes the card phases and the rotating driver', () => {
  const helpers = value => value;
  const first = demoView({mode:'tracks',step:0}, '', helpers);
  const second = demoView({mode:'tracks',step:1}, '', helpers);
  assert.match(first, /good card/i);
  assert.match(second, /sabotage.*final defence.*Trolley Driver.*spared team scores/i);
  assert.doesNotMatch(second, /vote locked/i);
});
