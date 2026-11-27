// One music bed per game, made with ElevenLabs Music (the proxy supplies the key).
//   NODE_USE_ENV_PROXY=1 node scripts/generate-game-music.mjs [mode ...] [--redo]
// Writes public/audio/music/game-<mode>.mp3. Every prompt is original: a mood
// and instrumentation, never a named song, artist or show.
import { existsSync, writeFileSync } from 'node:fs';

const tail = ' Instrumental only, no vocals. Written as a seamless loop: steady energy throughout, no intro build and no big ending.';
export const prompts = {
  classic: 'Classic TV quiz show theme. Bright brass stabs, walking bass, crisp snare, warm big-band studio feel, confident and playful, 118 bpm.',
  wheel: 'Glitzy game show wheel music. Sparkling glockenspiel, bouncy organ, shuffling drums, cheeky and bright with a carnival swing, 124 bpm.',
  board: 'Cosy board game adventure. Plucky pizzicato strings, marimba, light hand percussion and a friendly clarinet tune, jaunty, 108 bpm.',
  dice: 'Casino lounge funk. Rhythm guitar, clavinet, tight drums and a muted trumpet, cool and a bit cheeky, 112 bpm.',
  knockout: 'Retro 8-bit arcade fighter music. Chiptune square-wave lead, driving bass arpeggio, punchy drum machine, tense but fun, 140 bpm.',
  punchline: 'Comedy club house band. Upright bass, brushed drums, jazzy piano and a cheeky muted trombone, light and mischievous, 126 bpm.',
  cards: 'Quirky lounge exotica. Vibraphone, bongos, nylon guitar and a silly slide whistle now and then, relaxed and daft, 104 bpm.',
  tracks: 'Runaway train bluegrass. Chugging acoustic guitar like train wheels, banjo, fiddle, washboard and harmonica, urgent and comic, 150 bpm.',
  bluff: 'Sneaky spy caper. Tiptoe pizzicato bass, finger snaps, muted guitar twang, soft bongos and a sly flute, suspicious and playful, 100 bpm.',
  bloodmoon: 'Gothic Transylvanian night. Slow pipe organ, low cello drone, distant choir pads, a cimbalom figure and wind, eerie and serious, 70 bpm. No comedy.',
  potato: 'Frantic ticking countdown. Fast pizzicato strings, woodblock ticking like a clock, kazoo-like synth and a rising panic feel, comic, 160 bpm.',
  quizrace: 'High-speed racing synthwave. Driving bass, bright synth lead, gated drums and engine-like filter sweeps, fast and glossy, 150 bpm.',
  showdown: 'Stadium team anthem. Marching snare, big brass riff, hand claps and stomps, bold and competitive, 122 bpm.',
  samepage: 'Warm feel-good indie pop. Ukulele, hand claps, glockenspiel, soft bass and whistled-style synth tune, friendly, 110 bpm.',
  spotlight: 'Prime-time spotlight show. Smooth electric piano, slow funk bass, shimmering cymbals and a tense string pad, hushed suspense, 96 bpm.',
  brain: 'Thinking music. Minimal electronica with ticking hi-hats, soft marimba pattern, gentle synth pulses and glassy pads, curious and focused, 100 bpm.',
  topanswers: 'Upbeat survey show disco. Four-on-the-floor drums, funky bass, string stabs and bright horns, big-smile energy, 120 bpm.',
  rare: 'Treasure hunt adventure. Mysterious harp glissandos, hand drums, pan flute and plucked strings, exploring a jungle temple, 105 bpm.',
  soclose: 'Tense precision game. Light ticking percussion, pulsing synth bass, pizzicato strings and a rising shimmer, careful and suspenseful, 110 bpm.',
  wayoff: 'Elimination round tension. Deep timpani hits, heartbeat kick drum, low strings ostinato and a cold synth, dramatic, 92 bpm.',
  catchup: 'Chase scene breakbeat. Fast funky drums, wah guitar, punchy brass hits and a racing bassline, breathless and fun, 138 bpm.',
  shade: 'Colourful dreamy art-pop. Soft electric piano chords, plucky synth arpeggio that shifts key like changing colours, light brushed beat and warm bass, curious and bright, 104 bpm.',
  dontlook: 'Frantic fun charades music. Fast ska-style offbeat guitar, bouncing bass, bright trumpet riff and a ticking woodblock, excitable and silly, 156 bpm.',
  sketch: 'Playful art studio doodle music. Toy piano, ukulele, shaker, tuba oom-pah and a kazoo-style lead, scribbly and silly, 116 bpm.',
};

const wanted = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const redo = process.argv.includes('--redo');
const list = (wanted.length ? wanted : Object.keys(prompts)).filter(mode => prompts[mode]);
const make = async mode => {
  const out = new URL(`../public/audio/music/game-${mode}.mp3`, import.meta.url);
  if (existsSync(out) && !redo) return console.log(mode + ' already exists');
  const response = await fetch('https://api.elevenlabs.io/v1/music', { method: 'POST', headers: { 'xi-api-key': 'proxy', 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: prompts[mode] + tail, music_length_ms: 45000 }) });
  if (!response.ok) return console.log(`FAILED ${mode}: ${response.status} ${(await response.text()).slice(0, 200)}`);
  writeFileSync(out, Buffer.from(await response.arrayBuffer()));
  console.log('made ' + mode);
};
if (import.meta.url === `file://${process.argv[1]}`) {
  const queue = [...list];
  await Promise.all([1, 2].map(async () => { while (queue.length) await make(queue.shift()); }));
}
