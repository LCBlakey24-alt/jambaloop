// Optional single-channel Jambaloop narrator. Pre-recorded MP3 where available;
// otherwise speechSynthesis reads the exact transcript locally (no AI calls or charges).
import { narration, narratorAsset } from './narration-scripts.js';

let currentMode = null;
let currentAudio = null;
let currentSpeech = null;
let generation = 0;

function presentation(mode, playing, message = '') {
  if (!mode) return;
  const btn = document.querySelector(`[data-action="narrator-toggle"][data-mode="${mode}"]`);
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(playing));
  const label = btn.querySelector('[data-narrator-label]');
  if (label) label.textContent = playing ? 'Stop narration' : 'Listen to intro';
  const symbol = btn.querySelector('[data-narrator-symbol]');
  if (symbol) symbol.textContent = playing ? '■' : '▶';
  const status = btn.closest('.narrator-controls')?.querySelector('[data-narrator-status]');
  if (status) status.textContent = message || (playing ? 'Playing introduction' : 'Ready to listen');
}

export function stopNarration() {
  generation += 1;
  const previous = currentMode;
  const audio = currentAudio;
  const speech = currentSpeech;
  currentMode = null;
  currentAudio = null;
  currentSpeech = null;
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  if (speech && 'speechSynthesis' in window) speechSynthesis.cancel();
  presentation(previous, false);
}

function finished(mode, token, message = '') {
  if (token !== generation || currentMode !== mode) return;
  stopNarration();
  if (message) presentation(mode, false, message);
}

function browserSpeech(mode, token) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    finished(mode, token, 'Voice playback is unavailable on this device. Read the introduction below.');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(narration[mode]);
  utterance.lang = 'en-GB';
  utterance.rate = 1.06;
  utterance.pitch = 1.0;
  utterance.volume = 0.82;
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(voice => voice.lang.toLowerCase() === 'en-gb' && voice.localService) ||
    voices.find(voice => voice.lang.toLowerCase() === 'en-gb') || null;
  utterance.onend = () => finished(mode, token);
  utterance.onerror = () => finished(mode, token, 'Speech could not start. You can still read the introduction below.');
  currentSpeech = utterance;
  presentation(mode, true, 'Reading aloud using this device');
  try { speechSynthesis.speak(utterance); }
  catch { finished(mode, token, 'Speech is not supported here. Read the introduction below.'); }
}

export function toggleNarration(mode) {
  if (!narration[mode]) return;
  if (currentMode === mode) { stopNarration(); return; }
  stopNarration();
  const token = generation;
  currentMode = mode;
  const asset = narratorAsset(mode);
  if (!asset) {
    browserSpeech(mode, token);
    return;
  }
  const audio = new Audio();
  currentAudio = audio;
  audio.preload = 'none'; // no cellular traffic until the user taps Listen
  audio.volume = 0.82;
  audio.src = asset;
  audio.onended = () => finished(mode, token);
  audio.onerror = () => finished(mode, token, 'Recording unavailable. Read the introduction below.');
  presentation(mode, true, 'Loading the recorded announcer');
  try {
    const result = audio.play();
    result?.then(() => {
      if (token === generation && currentMode === mode) presentation(mode, true, 'Playing the Jambaloop announcer');
    }).catch(() => finished(mode, token, 'Browser blocked audio. Tap Listen to try again.'));
  } catch {
    finished(mode, token, 'Audio is unavailable. Read the introduction below.');
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopNarration();
  });
  window.addEventListener('pagehide', stopNarration);
}
