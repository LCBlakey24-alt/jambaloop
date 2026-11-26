// Checks every recorded Max and Poppy take with ElevenLabs speech-to-text:
// the transcript must match the script's words (mood tags are never spoken).
//   NODE_USE_ENV_PROXY=1 node scripts/check-duo-voices.mjs [key ...]
import { readFileSync } from 'node:fs';
import { duoIntros, reactionTakes, skipQuips, spoken, welcomeBack, welcomeScript } from '../public/duo-scripts.js';
import { duoRecordings, duoTake } from '../public/duo-recordings.js';

const scripts = { ...duoIntros, welcome: welcomeScript, 'welcome-back': welcomeBack,
  ...Object.fromEntries(skipQuips.map((lines, index) => [`skip-${index + 1}`, lines])),
  ...reactionTakes };
const words = text => text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
// Share of the script's words found, in order, in the transcript.
function match(expected, heard) {
  let at = 0; let found = 0;
  for (const word of expected) { const next = heard.indexOf(word, at); if (next >= 0) { found++; at = next + 1; } }
  return found / expected.length;
}
const wanted = process.argv.slice(2);
let worst = 1;
for (const key of (wanted.length ? wanted : Object.keys(duoRecordings))) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(new URL('../public' + duoTake(key), import.meta.url))], { type: 'audio/mpeg' }), key + '.mp3');
  form.append('model_id', 'scribe_v1');
  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': process.env.XI_API_KEY || 'proxy-injected' }, body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(key + ': ' + JSON.stringify(result));
  const score = match(words(scripts[key].map(([, text]) => spoken(text)).join(' ')), words(result.text));
  worst = Math.min(worst, score);
  console.log(`${score >= 0.9 ? 'ok  ' : 'LOW '} ${key.padEnd(12)} ${(score * 100).toFixed(0)}%  ${result.text.slice(0, 90)}`);
}
console.log(`Worst match: ${(worst * 100).toFixed(0)}%`);
