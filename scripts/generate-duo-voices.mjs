// Generates the Double Act clips with ElevenLabs text-to-speech:
//   node scripts/generate-duo-voices.mjs [mode ...] [--dry-run]
// Clips that already exist are skipped, so nothing is paid for twice. The run
// stops before starting if the remaining monthly characters can't cover it.
// The API key comes from the environment (XI_API_KEY, or a proxy that adds it).
// Needs a paid ElevenLabs plan when run from a cloud machine: the free plan
// refuses requests from data-centre and proxy addresses.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { duoIntros, duoClip, duoVoice, hosts } from '../public/duo-scripts.js';

const api = 'https://api.elevenlabs.io/v1';
const headers = { 'xi-api-key': process.env.XI_API_KEY || 'proxy-injected', 'content-type': 'application/json' };
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const wanted = args.filter(arg => !arg.startsWith('--'));
const modes = wanted.length ? wanted : Object.keys(duoIntros);
const root = new URL('../public', import.meta.url);
mkdirSync(new URL('../public/audio/duo/', import.meta.url), { recursive: true });

const jobs = modes.flatMap(mode => (duoIntros[mode] ?? []).map(([host, text], index) => ({ mode, host, text, file: new URL('.' + duoClip(mode, index), root + '/') })))
  .filter(job => !existsSync(job.file));
const needed = jobs.reduce((sum, job) => sum + job.text.length, 0);
const plan = await (await fetch(api + '/user/subscription', { headers })).json();
if (!plan.character_limit) throw new Error('ElevenLabs rejected the key: ' + JSON.stringify(plan.detail ?? plan));
const left = plan.character_limit - plan.character_count;
console.log(`${jobs.length} clips to make, ${needed} characters; ${left} of ${plan.character_limit} left this month (${plan.tier}).`);
if (needed > left) throw new Error('Not enough characters left this month. Nothing was generated.');
if (dry) process.exit(0);

for (const job of jobs) {
  const response = await fetch(`${api}/text-to-speech/${hosts[job.host].voice}?output_format=mp3_44100_64`, {
    method: 'POST', headers,
    body: JSON.stringify({ text: job.text, model_id: duoVoice.model, voice_settings: duoVoice.settings }),
  });
  if (!response.ok) throw new Error(`${job.mode} (${job.host}): ${response.status} ${await response.text()}`);
  writeFileSync(job.file, Buffer.from(await response.arrayBuffer()));
  console.log('made', job.file.pathname.split('/public')[1]);
}
const after = await (await fetch(api + '/user/subscription', { headers })).json();
console.log(`Done. ${after.character_limit - after.character_count} characters left this month.`);
