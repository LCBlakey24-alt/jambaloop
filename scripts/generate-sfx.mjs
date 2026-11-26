// Original game-show sound effects from ElevenLabs Sound Effects (text to
// sound). Writes public/audio/sfx/<name>.mp3; existing files are skipped.
//   NODE_USE_ENV_PROXY=1 node scripts/generate-sfx.mjs [name ...] [--redo]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

export const effects = {
  drumroll: ['Tense snare drum roll building up, TV game show studio, no ending hit', 2.6],
  correct: ['Bright cheerful game show correct answer chime, two rising tones, sparkly', 1.4],
  wrong: ['Short comedic game show wrong answer buzzer, friendly not harsh', 1.0],
  reveal: ['Big TV quiz show reveal sting, orchestral hit with a cymbal swell', 2.2],
  lockin: ['Soft satisfying pop click, playful UI confirmation sound', 0.5],
  whoosh: ['Fast airy whoosh transition, TV graphics swoosh', 0.8],
  cheer: ['Small studio audience cheering and clapping enthusiastically', 3.5],
  fanfare: ['Triumphant short brass fanfare for a game show winner', 3.0],
  bell: ['Boxing ring bell, three quick dings', 2.0],
  wheel: ['Prize wheel spinning with a ratcheting clicker that slows down and stops', 4.0],
  sizzle: ['Cartoon hot potato sizzling then a comedic puff explosion', 2.0],
  tick: ['Single tense clock tick, game show countdown, crisp and short', 0.5],
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const headers = { 'xi-api-key': process.env.XI_API_KEY || 'proxy-injected', 'content-type': 'application/json' };
  const args = process.argv.slice(2);
  const redo = args.includes('--redo');
  const names = args.filter(arg => !arg.startsWith('--'));
  const folder = new URL('../public/audio/sfx/', import.meta.url);
  mkdirSync(folder, { recursive: true });
  for (const name of (names.length ? names : Object.keys(effects))) {
    const file = new URL(name + '.mp3', folder);
    if (existsSync(file) && !redo) continue;
    const [text, duration_seconds] = effects[name];
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_96', {
      method: 'POST', headers, body: JSON.stringify({ text, duration_seconds, prompt_influence: 0.5 }) });
    if (!response.ok) throw new Error(`${name}: ${response.status} ${await response.text()}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    console.log('made', name);
  }
}
