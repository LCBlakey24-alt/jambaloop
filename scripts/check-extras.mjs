// Validate an estimate/order pack before it is wired in:
//   node scripts/check-extras.mjs trivia-extras-1.js
// A pack exports one object: { category: { estimate: [[prompt, answer, unit, min, max], ...], order: [[prompt, first, second, third, fourth], ...] } }.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { makeQuestions } from '../questions.js';
import { categories } from '../public/game-config.js';
import { soCloseBank } from '../so-close-bank.js';
import { questionHistoryId } from '../public/question-history.js';

const norm = text => String(text).normalize('NFKC').toLocaleLowerCase('en-GB').replace(/\s+/g, ' ').trim();
const library = new Set(soCloseBank.map(row => questionHistoryId(row.prompt)));
for (const [id] of categories) for (const format of ['choice', 'boolean', 'estimate', 'order']) {
  try { for (const question of makeQuestions(id, 9999, new Set(), format, true)) library.add(questionHistoryId(question.prompt)); } catch { /* no bank */ }
}
const problems = [], seen = new Set();
let estimates = 0, orders = 0;
for (const file of process.argv.slice(2)) {
  const module = await import(pathToFileURL(resolve(file)));
  for (const pack of Object.values(module)) for (const [category, formats] of Object.entries(pack)) {
    if (!categories.some(([id]) => id === category)) problems.push(`unknown category ${category}`);
    for (const row of formats.estimate ?? []) {
      estimates++;
      const [prompt, answer, unit, low, high] = row;
      if (row.length !== 5 || typeof prompt !== 'string' || prompt.length < 12 || prompt.length > 210 || !prompt.endsWith('?')) problems.push(`${category}: bad estimate prompt: ${prompt}`);
      if (!Number.isSafeInteger(answer) || answer < 0 || typeof unit !== 'string' || !unit.trim()) problems.push(`${category}: answer must be a whole number with a unit: ${prompt}`);
      if (!(Number.isSafeInteger(low) && Number.isSafeInteger(high) && low >= 0 && low < answer && answer < high)) problems.push(`${category}: min < answer < max must hold: ${prompt}`);
      if (high - low < 4 || (answer - low) / (high - low) < .12 || (answer - low) / (high - low) > .88) problems.push(`${category}: answer sits too near an end of its range (keep it between 12% and 88%): ${prompt}`);
    }
    for (const row of formats.order ?? []) {
      orders++;
      const [prompt, ...items] = row;
      if (typeof prompt !== 'string' || prompt.length < 12 || prompt.length > 210 || !/[.?]$/.test(prompt)) problems.push(`${category}: bad order prompt: ${prompt}`);
      if (items.length !== 4 || items.some(item => typeof item !== 'string' || !item.trim() || item.length > 48) || new Set(items.map(norm)).size !== 4) problems.push(`${category}: needs four distinct short items: ${prompt}`);
    }
    for (const row of [...(formats.estimate ?? []), ...(formats.order ?? [])]) {
      const id = questionHistoryId(row[0]);
      if (library.has(id)) problems.push(`${category}: already in the library: ${row[0]}`);
      if (seen.has(id)) problems.push(`${category}: repeated: ${row[0]}`);
      seen.add(id);
    }
  }
}
console.log(`${estimates} estimates, ${orders} orders checked.`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('OK');
