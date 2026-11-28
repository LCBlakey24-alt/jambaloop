import test from 'node:test';
import assert from 'node:assert/strict';

test('a failed recorded take starts the device voice only once', async () => {
  const spoken = [];
  const element = () => ({
    dataset: {}, isConnected: false,
    setAttribute() {}, append() {}, remove() {},
  });
  globalThis.document = {
    hidden: false, addEventListener() {}, querySelector() { return null; },
    createElement: element, body: { append(node) { node.isConnected = true; } },
  };
  globalThis.window = { addEventListener() {}, speechSynthesis: {} };
  globalThis.speechSynthesis = {
    getVoices: () => [], speak: utterance => spoken.push(utterance.text), cancel() {},
  };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  globalThis.Audio = class {
    play() {
      queueMicrotask(() => this.onerror?.());
      return Promise.reject(new Error('Media could not load'));
    }
    pause() {} removeAttribute() {} load() {}
  };

  const { playScript, stopNarration } = await import('../public/narrator.js');
  const { duoIntros } = await import('../public/duo-scripts.js');
  try {
    playScript('classic', duoIntros.classic);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(spoken.length, 1, 'one failure should produce one fallback voice');
  } finally {
    stopNarration();
    delete globalThis.Audio;
    delete globalThis.SpeechSynthesisUtterance;
    delete globalThis.speechSynthesis;
    delete globalThis.document;
    delete globalThis.window;
  }
});

test('guest presenters use an appropriate available device voice', async () => {
  const utterances = [];
  const voices = [
    { name: 'Daniel', lang: 'en-GB' },
    { name: 'Sonia', lang: 'en-GB' },
  ];
  globalThis.document = {
    querySelector() { return null; },
    createElement() { return { dataset: {}, setAttribute() {}, append() {}, remove() {} }; },
    body: { append() {} },
  };
  globalThis.window = { speechSynthesis: {} };
  globalThis.speechSynthesis = { getVoices: () => voices, speak: item => utterances.push(item), cancel() {} };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };

  const { playScript, stopNarration } = await import('../public/narrator.js');
  try {
    playScript('unrecorded-guest', [['vesper', 'Welcome to Blood Moon.']]);
    assert.equal(utterances[0].voice.name, 'Daniel');
    assert.equal(utterances[0].pitch, 0.88);
  } finally {
    stopNarration();
    delete globalThis.SpeechSynthesisUtterance;
    delete globalThis.speechSynthesis;
    delete globalThis.document;
    delete globalThis.window;
  }
});
