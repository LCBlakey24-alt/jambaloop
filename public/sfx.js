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
const musicLevel = { lobby: 0.22, finale: 0.5 };

/** Start (or keep) a music bed; looping tracks repeat until stopped. */
export function playMusic(name, { loop = true } = {}) {
  if (musicName === name && music && !music.paused) return;
  stopMusic();
  music = new Audio(`/audio/music/${name}.mp3`);
  musicName = name;
  music.loop = loop;
  music.volume = musicLevel[name] ?? 0.3;
  music.play()?.catch(() => { musicName = undefined; });
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
  if (music) music.volume = down ? 0.06 : musicLevel[musicName] ?? 0.3;
}
