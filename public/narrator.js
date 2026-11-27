// Optional single-channel Jambaloop narrator. Pre-recorded MP3 where available;
// otherwise speechSynthesis reads the exact transcript locally (no AI calls or charges).
import { narration, narratorAsset } from './narration-scripts.js';
import { duoIntros, hosts, spoken, welcomeScript } from './duo-scripts.js';
import { duoRecordings, duoTake } from './duo-recordings.js';
import { duckMusic } from './sfx.js';

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
  hideCaption();
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

/* ------------------------------------------------------- double act -- */
// Two hosts take turns, each line captioned on screen. Recorded clips play
// where they exist; otherwise the device's British voices read the lines.
let caption;

function showCaption(host, text) {
  if (typeof document === 'undefined') return;
  duckMusic(true);
  caption ??= Object.assign(document.createElement('div'), { className: 'duo-caption' });
  caption.setAttribute('role', 'status');
  caption.dataset.host = host;
  caption.innerHTML = '';
  const name = document.createElement('b');
  name.textContent = hosts[host].name;
  const line = document.createElement('span');
  line.textContent = text;
  caption.append(name, line);
  if (!caption.isConnected) document.body.append(caption);
}

function hideCaption() { caption?.remove(); duckMusic(false); }

function hostVoice(host) {
  const voices = 'speechSynthesis' in window ? speechSynthesis.getVoices().filter(voice => /^en-GB/i.test(voice.lang)) : [];
  const male = /male|daniel|george|arthur|ryan|oliver|thomas|brian/i;
  const female = /female|serena|kate|martha|libby|sonia|hazel|susan|amy|emma|lily/i;
  const pick = host === 'max' ? voices.find(voice => male.test(voice.name) && !/female/i.test(voice.name)) : voices.find(voice => female.test(voice.name));
  return pick ?? voices[host === 'max' ? 0 : Math.min(1, voices.length - 1)] ?? null;
}

function playDuo(mode, token, { lines = duoIntros[mode], onLine, onDone } = {}) {
  const live = () => token === generation && currentMode === mode;
  const done = () => { if (!live()) return; hideCaption(); finished(mode, token); onDone?.(); };
  const timings = duoRecordings[mode];
  // Recorded: one take of the whole exchange; captions follow its line timings.
  if (timings && timings.length === lines.length) {
    const audio = new Audio(duoTake(mode));
    currentAudio = audio;
    audio.volume = 0.9;
    let shown = -1;
    const follow = () => {
      if (!live()) return;
      let index = 0;
      while (index + 1 < timings.length && audio.currentTime >= timings[index + 1][0]) index++;
      if (index === shown) return;
      shown = index;
      const [host, text] = lines[index];
      showCaption(host, spoken(text));
      onLine?.(index, lines[index]);
    };
    audio.ontimeupdate = follow;
    audio.onplaying = follow;
    audio.onended = done;
    audio.onerror = () => { currentAudio = null; speakLines(mode, token, lines, { onLine, onDone }); };
    presentation(mode, true, 'Playing Max and Poppy');
    // If the browser refuses to play, the device voice (or timed captions) carries on.
    audio.play()?.catch(() => { if (live()) { currentAudio = null; speakLines(mode, token, lines, { onLine, onDone }); } });
    return;
  }
  speakLines(mode, token, lines, { onLine, onDone });
}

/** Not recorded yet: the device's British voices read the lines in turn. */
function speakLines(mode, token, lines, { onLine, onDone }) {
  let index = 0;
  const next = () => {
    if (token !== generation || currentMode !== mode) return;
    if (index >= lines.length) { hideCaption(); finished(mode, token); onDone?.(); return; }
    const [host, raw] = lines[index];
    const text = spoken(raw);
    onLine?.(index, lines[index]);
    index += 1;
    showCaption(host, text);
    if (!('speechSynthesis' in window)) { setTimeout(next, 450 + text.length * 55); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.voice = hostVoice(host);
    // Two hosts, two sounds, even when a device has only one British voice.
    utterance.pitch = host === 'max' ? 0.88 : 1.18;
    utterance.rate = 1.04;
    utterance.volume = 0.86;
    // No voice on this device: the caption still stays up for reading time.
    const readingTime = 700 + text.length * 50;
    utterance.onend = () => setTimeout(next, 160);
    utterance.onerror = () => setTimeout(next, readingTime);
    currentSpeech = utterance;
    try { speechSynthesis.speak(utterance); } catch { setTimeout(next, readingTime); }
  };
  presentation(mode, true, 'Max and Poppy, read aloud by this device');
  next();
}

/**
 * Max and Poppy's welcome to Jambaloop. onLine(index, [host, text, scene])
 * fires as each line starts so the TV can change scene; onDone when it ends
 * (not when it is stopped early).
 */
export function playWelcome({ onLine, onDone } = {}) {
  playScript('welcome', welcomeScript, { onLine, onDone });
}

/** Any short Max and Poppy exchange (skip quips, welcome back). */
export function playScript(key, lines, { onLine, onDone } = {}) {
  stopNarration();
  const token = generation;
  currentMode = key;
  playDuo(key, token, { lines, onLine, onDone });
}

// Reading a public question aloud with the device's own British voice. It is
// opt-in on the TV, never blocks a timer, and steps aside for the hosts.
let reading;
export const canReadAloud = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
export function stopReading() {
  if (!reading) return;
  reading = undefined;
  if (canReadAloud()) speechSynthesis.cancel();
  duckMusic(false);
}
export function readAloud(text, tries = 0) {
  stopReading();
  if (!canReadAloud() || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  reading = utterance;
  // A host line that is already playing finishes first.
  if (currentMode && tries < 24) { setTimeout(() => { if (reading === utterance) readAloud(text, tries + 1); }, 300); return; }
  utterance.lang = 'en-GB';
  utterance.rate = 1.04;
  utterance.volume = 0.9;
  utterance.voice = hostVoice('poppy');
  const done = () => { if (reading === utterance) { reading = undefined; duckMusic(false); } };
  utterance.onend = done;
  utterance.onerror = done;
  duckMusic(true);
  try { speechSynthesis.speak(utterance); } catch { done(); }
}

export const narrationPlaying = () => currentMode ?? (reading ? 'reading' : undefined);
export const isWelcomeNarration = () => ['welcome', 'welcome-back'].includes(currentMode) || /^skip-/.test(currentMode ?? '');

export function toggleNarration(mode) {
  if (!narration[mode] && !duoIntros[mode]) return;
  if (currentMode === mode) { stopNarration(); return; }
  stopNarration();
  const token = generation;
  currentMode = mode;
  // The double act leads unless only the single announcer has been recorded.
  if (duoIntros[mode] && (duoRecordings[mode] || !narratorAsset(mode))) { playDuo(mode, token); return; }
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
