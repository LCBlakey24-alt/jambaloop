// Validate a levelled trivia pack before it is wired in:
//   node scripts/check-levels.mjs trivia-levels-1.js
// Each pack exports one object: { category: { choice: {1..6: rows}, boolean: {1..6: rows} } }.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { makeQuestions } from '../questions.js';
import { categories } from '../public/game-config.js';
import { questionHistoryId } from '../public/question-history.js';

const norm = text => String(text).normalize('NFKC').toLocaleLowerCase('en-GB').replace(/\s+/g, ' ').trim();
const library = new Set();
for (const [id] of categories) for (const format of ['choice', 'boolean', 'estimate', 'order']) {
  try { for (const question of makeQuestions(id, 9999, new Set(), format, true)) library.add(questionHistoryId(question.prompt)); } catch { /* no bank */ }
}
const problems = [];
const seen = new Map();
let choice = 0, boolean = 0;
for (const file of process.argv.slice(2)) {
  const module = await import(pathToFileURL(resolve(file)));
  for (const pack of Object.values(module)) for (const [category, formats] of Object.entries(pack)) {
    if (!categories.some(([id]) => id === category)) problems.push(`${file}: unknown category ${category}`);
    for (const level of [1, 2, 3, 4, 5, 6]) {
      for (const row of formats.choice?.[level] ?? []) {
        choice++;
        const [prompt, ...options] = row;
        if (typeof prompt !== 'string' || prompt.length < 12 || prompt.length > 210 || !prompt.endsWith('?')) problems.push(`${category} L${level}: bad prompt: ${prompt}`);
        if (options.length !== 4 || options.some(option => typeof option !== 'string' || !option.trim()) || new Set(options.map(norm)).size !== 4) problems.push(`${category} L${level}: needs four distinct text options: ${prompt}`);
        if (options.some(option => option.length > 60)) problems.push(`${category} L${level}: an option is over 60 characters: ${prompt}`);
      }
      for (const row of formats.boolean?.[level] ?? []) {
        boolean++;
        if (typeof row[0] !== 'string' || row[0].length < 12 || row[0].endsWith('?') || typeof row[1] !== 'boolean' || row.length !== 2) problems.push(`${category} L${level}: bad true/false row: ${row[0]}`);
      }
      for (const row of [...(formats.choice?.[level] ?? []), ...(formats.boolean?.[level] ?? [])]) {
        const id = questionHistoryId(row[0]);
        if (library.has(id)) problems.push(`${category} L${level}: already in the library: ${row[0]}`);
        if (seen.has(id)) problems.push(`${category} L${level}: repeated in the packs: ${row[0]}`);
        seen.set(id, true);
      }
      if (!formats.choice?.[level]?.length) problems.push(`${category}: no choice questions at level ${level}`);
      if (!formats.boolean?.[level]?.length) problems.push(`${category}: no true/false at level ${level}`);
    }
    const flat = Object.values(formats.boolean ?? {}).flat();
    const falses = flat.filter(row => row[1] === false).length;
    if (flat.length && (falses < flat.length * .35 || falses > flat.length * .65)) problems.push(`${category}: true/false balance ${falses} false of ${flat.length}`);
  }
}
console.log(`${choice} choice, ${boolean} true/false checked.`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('OK');
