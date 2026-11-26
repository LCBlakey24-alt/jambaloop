// Generate a music bed with ElevenLabs Music (the proxy supplies the key).
//   NODE_USE_ENV_PROXY=1 node scripts/generate-music.mjs <name> <seconds> "<prompt>"
import { existsSync, writeFileSync } from 'node:fs';
const [name, seconds, prompt] = process.argv.slice(2);
if (!name || !seconds || !prompt) throw new Error('Usage: generate-music.mjs <name> <seconds> "<prompt>"');
const out = new URL(`../public/audio/music/${name}.mp3`, import.meta.url);
if (existsSync(out) && !process.argv.includes('--redo')) { console.log(name + ' already exists'); process.exit(0); }
const response = await fetch('https://api.elevenlabs.io/v1/music', { method: 'POST', headers: { 'xi-api-key': 'proxy', 'content-type': 'application/json' },
  body: JSON.stringify({ prompt, music_length_ms: Number(seconds) * 1000 }) });
if (!response.ok) throw new Error(`${name}: ${response.status} ${(await response.text()).slice(0, 300)}`);
writeFileSync(out, Buffer.from(await response.arrayBuffer()));
console.log('made ' + name);
