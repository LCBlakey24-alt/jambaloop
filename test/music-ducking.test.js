import test from 'node:test';
import assert from 'node:assert/strict';

test('a new background track stays quiet while a presenter is speaking', async () => {
  const tracks = [];
  globalThis.Audio = class {
    constructor(src) { this.src = src; this.paused = false; tracks.push(this); }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
    addEventListener() {}
  };
  const { playMusic, duckMusic, stopMusic } = await import('../public/sfx.js');
  try {
    playMusic('lobby');
    duckMusic(true);
    assert.equal(tracks[0].volume, 0.05);
    playMusic('game-classic');
    assert.equal(tracks[1].volume, 0.05, 'changing tracks must not drown out the voice');
    duckMusic(false);
    assert.equal(tracks[1].volume, 0.24);
  } finally {
    stopMusic();
    delete globalThis.Audio;
  }
});
