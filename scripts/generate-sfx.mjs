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
  tick: ['Single tense clock tick, game show countdown, crisp and short', 0.5],  // One short musical sting per game, in that game's style (title card).
  'sting-classic': ['Classic TV quiz show opening sting, bright brass and timpani, grand and warm, instrumental', 4],
  'sting-wheel': ['Carnival fairground game show sting, calliope organ and cymbal crash, playful, instrumental', 4],
  'sting-board': ['Cheerful board game adventure sting, plucky strings and woodblock, cosy, instrumental', 4],
  'sting-dice': ['Art deco jazz club sting, swinging brass and brushed drums with a rattle of dice, instrumental', 4],
  'sting-knockout': ['Boxing arena entrance sting, heavy drums, stadium brass hit and a ring bell, instrumental', 4],
  'sting-punchline': ['Comedy club sting, cheeky slide whistle, rimshot and a brass wah-wah, instrumental', 3.5],
  'sting-cards': ['Elegant parlour card game sting, harpsichord flourish and soft chime, instrumental', 3.5],
  'sting-tracks': ['Steam train whistle then a punchy industrial percussion sting, instrumental', 4],
  'sting-bluff': ['Film noir detective sting, sneaky double bass, muted trumpet and a suspense hit, instrumental', 4],
  'sting-potato': ['Frantic comedic countdown sting, fast xylophone run ending in a sizzle, instrumental', 3.5],
  'sting-quizrace': ['Synthwave racing game sting, neon arpeggio and engine rev into a big synth hit, instrumental', 4],
  'sting-showdown': ['Sports arena team showdown sting, stomping drums, crowd clap and brass stab, instrumental', 4],
  'sting-samepage': ['Breezy tropical sting, marimba and ukulele with a light chime, friendly, instrumental', 3.5],
  'sting-spotlight': ['Theatre spotlight sting, dramatic piano glissando and velvet orchestral swell, instrumental', 4],
  'sting-brain': ['Futuristic science lab sting, glassy synth pulses rising to a clean digital chime, instrumental', 4],
  'sting-topanswers': ['Seventies funk game show sting, wah guitar, disco strings and horn stab, instrumental', 4],
  'sting-rare': ['Treasure discovery sting, mysterious harp shimmer into a triumphant chime, instrumental', 4],
  'sting-bloodmoon': ['Gothic mystery sting, a tolling church bell, a dramatic low string swell and a harpsichord flourish, instrumental', 4],
  'sting-wayoff': ['Cheeky game show sting, a rising slide whistle that overshoots, a comedy boing and a bright brass hit, instrumental', 3.5],
  'sting-catchup': ['Fast chase game show sting, galloping drums, urgent brass riff and a whip-crack ending, instrumental', 3.5],
  'sting-shade': ['Bright artistic game show sting, a quick rising xylophone run through a scale, a paint splash and a shimmering chord, instrumental', 3.5],
  'sting-sketch': ['Playful doodle sting, pencil scribble sound then bouncy pizzicato and a pop, instrumental', 3.5],
  'sting-soclose': ['Precise measuring sting, ticking tape measure, plucked notes stepping up to a ding, instrumental', 3.5],
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
