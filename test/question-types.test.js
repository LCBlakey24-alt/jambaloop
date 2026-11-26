import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { makeQuestions } from '../questions.js';
import { categories, formatId, formatTypes, isQuestionFormat, questionCounts, questionTypes } from '../public/game-config.js';

const ids = questionTypes.map(([id]) => id);
// Every non-empty combination of the four types, in canonical form.
const combinations = Array.from({ length: 15 }, (_, mask) => formatId(ids.filter((_, bit) => (mask + 1) & (1 << bit))));

test('each ticked combination has exactly one canonical spelling', () => {
  assert.equal(new Set(combinations).size, 15);
  assert.ok(combinations.includes('mixed'), 'all four ticked is the existing Mixed formats');
  for (const format of combinations) {
    assert.ok(isQuestionFormat(format), format);
    assert.equal(formatId(formatTypes(format)), format);
  }
  assert.equal(formatId(['order', 'choice']), 'choice+order', 'order of ticking does not matter');
  for (const bad of ['', 'boolean+choice', 'choice+choice', 'mixed+choice', 'choice+boolean+estimate+order', 'choice+poll', 'choice+', undefined, ['choice']])
    assert.equal(isQuestionFormat(bad), false, String(bad));
});

test('a game only asks the question types that were ticked, in turn', () => {
  for (const format of combinations) {
    const wanted = formatTypes(format);
    const questions = makeQuestions('mixed', 15, new Set(), format, true);
    assert.equal(questions.length, 15, format);
    assert.deepEqual([...new Set(questions.map(q => q.type))].sort(), [...wanted].sort(), `${format}: every ticked type appears, nothing else`);
    assert.deepEqual(questions.slice(0, wanted.length).map(q => q.type), wanted, `${format}: types take turns`);
  }
});

test('every topic fills the largest round it offers for every combination, without repeats', () => {
  for (const [category] of categories) for (const format of combinations) {
    const most = Math.max(...questionCounts('classic', format, category));
    const questions = makeQuestions(category, most, new Set(), format, true);
    assert.equal(questions.length, most, `${category}/${format}`);
    assert.equal(new Set(questions.map(q => q.prompt)).size, most, `${category}/${format}: no repeats`);
    assert.ok(questions.every(q => formatTypes(format).includes(q.type)), `${category}/${format}: only ticked types`);
  }
});

test('only estimate/order picks on a single topic are capped at five', () => {
  assert.deepEqual(questionCounts('classic', 'estimate+order', 'nba'), [5]);
  assert.deepEqual(questionCounts('classic', 'boolean+estimate', 'nba'), [5, 10, 15]);
  assert.deepEqual(questionCounts('classic', 'estimate+order', 'mixed'), [5, 10, 15]);
});

let server;
let origin;
before(async () => {
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', PUBLIC_URL: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  const [output] = await once(server.stdout, 'data');
  origin = String(output).match(/http:\/\/localhost:\d+/)[0];
});
after(() => server?.kill());

const create = body => fetch(origin + '/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'classic', category: 'mixed', count: 10, seconds: 0, ...body }) });

test('the server accepts ticked combinations and rejects malformed ones', async () => {
  const room = await create({ format: 'boolean+estimate' });
  assert.equal(room.status, 201);
  const { code, host } = await room.json();
  const state = await (await fetch(origin + '/api/rooms/' + code, { headers: { 'x-game-key': host } })).json();
  assert.equal(state.format, 'boolean+estimate');
  for (const format of ['estimate+boolean', 'choice+choice', '', 'choice+poll', ['choice']])
    assert.equal((await create({ format })).status, 400, JSON.stringify(format));
  assert.equal((await create({ mode: 'wheel', format: 'choice+order' })).status, 201, 'Spin the Wheel rotates through the ticked types');
  assert.equal((await create({ mode: 'board', count: 12, format: 'boolean+order' })).status, 201, 'Board Race rotates through the ticked types');
});
