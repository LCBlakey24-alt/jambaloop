// Recorded sound effects and music for the TV (original ElevenLabs Sound
// Effects and Music, public/audio). Only when the host turns Sound on;
// phones stay silent. Effects are decoded once and played through Web Audio;
// music plays from an <audio> element so it can loop and dip under the hosts.
const effects = new Map();

function load(context, name) {
  if (!effects.has(name)) {
    effects.set(name, fetch(`/audio/sfx/${name}.mp3`).then(response => response.arrayBuffer())
      .then(data => context.decodeAudioData(data)).catch(() => null));
  }
  return effects.get(name);
}

/** Warm the cache so the first reveal isn't late. */
export function preloadSfx(context, names) {
  if (context) names.forEach(name => load(context, name));
}

/** Play one effect `at` seconds from now. */
export async function playSfx(context, name, { volume = 0.55, at = 0 } = {}) {
  if (context?.state !== 'running') return;
  const buffer = await load(context, name);
  if (!buffer || context.state !== 'running') return;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain).connect(context.destination);
  source.start(context.currentTime + at);
}

let music;
let musicName;
const musicLevel = { lobby: 0.22, finale: 0.5, decider: 0.4 };

/** Start (or keep) a music bed; looping tracks repeat until stopped. */
let musicQuiet = false;
let musicDucked = false;
const levelNow = () => (musicLevel[musicName] ?? 0.24) * (musicQuiet ? 0.5 : 1);
export function playMusic(name, { loop = true, quiet = false, fallback } = {}) {
  if (musicName === name && music && !music.paused) {
    // Same tune, different moment: glide between browsing and in-game volume.
    if (musicQuiet !== quiet) { musicQuiet = quiet; music.volume = musicDucked ? 0.05 : levelNow(); }
    return;
  }
  stopMusic();
  const track = new Audio(`/audio/music/${name}.mp3`);
  music = track;
  musicName = name;
  musicQuiet = quiet;
  track.loop = loop;
  track.volume = musicDucked ? 0.05 : levelNow();
  // A game without its own theme yet falls back to the house music.
  if (fallback) track.addEventListener('error', () => { if (music === track) { music = undefined; musicName = undefined; playMusic(fallback, { loop, quiet }); } }, { once: true });
  track.play()?.catch(() => { if (music === track) musicName = undefined; });
}

export function stopMusic() {
  if (!music) return;
  const fading = music;
  music = undefined;
  musicName = undefined;
  const step = () => {
    fading.volume = Math.max(0, fading.volume - 0.04);
    if (fading.volume > 0) setTimeout(step, 40); else fading.pause();
  };
  step();
}

/** Dip the music while Max and Poppy are talking. */
export function duckMusic(down) {
  musicDucked = down;
  if (music) music.volume = down ? 0.05 : levelNow();
}
