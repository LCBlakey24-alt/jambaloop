import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeQuestions, questionCategories } from '../questions.js';
import { categories, questionCounts } from '../public/game-config.js';
import { roomTask, watchDeadline } from '../room-clock.js';

const shapes = {
  choice: q => Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.correct) && q.options[q.correct] !== undefined,
  boolean: q => q.options.join() === 'True,False' && [0, 1].includes(q.correct),
  estimate: q => Number.isFinite(q.correct) && Number.isFinite(q.min) && Number.isFinite(q.max) && q.min <= q.correct && q.correct <= q.max,
  order: q => Array.isArray(q.correct) && q.correct.length === q.options.length,
};

test('every topic can supply every question count the setup offers, in every format', () => {
  const topics = categories.map(([id]) => id);
  for (const category of topics) for (const format of ['choice', 'boolean', 'estimate', 'order', 'mixed']) {
    const most = Math.max(...questionCounts('classic', format, category));
    const supplied = makeQuestions(category, most, new Set(), format, true);
    assert.equal(supplied.length, most, `${category}/${format}: offers ${most}, supplies ${supplied.length}`);
    assert.equal(new Set(supplied.map(q => q.prompt)).size, supplied.length, `${category}/${format}: no repeats in one game`);
  }
});

test('questions always have the shape of their format, even across Mixed Bag', () => {
  for (const format of ['choice', 'boolean', 'estimate', 'order']) {
    for (const category of [...questionCategories, 'mixed']) {
      for (const question of makeQuestions(category, 60, new Set(), format, true)) {
        assert.equal(question.type, format, `${category}: ${question.prompt}`);
        assert.ok(shapes[format](question), `${category}/${format} malformed: ${question.prompt}`);
      }
    }
  }
});

test('a failing room timer is logged, never thrown out of the timer', async () => {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(' '));
  try {
    assert.doesNotThrow(() => roomTask({}, 'test', () => { throw new TypeError('boom'); }));
    const room = { ends: Date.now() + 5 };
    await new Promise(resolve => {
      watchDeadline(room, () => { setTimeout(resolve, 5); throw new Error('expired badly'); });
    });
  } finally { console.error = original; }
  assert.ok(logged.some(line => line.includes('Room test failed: TypeError boom')));
  assert.ok(logged.some(line => line.includes('Room deadline failed: Error expired badly')));
});

test('the server runs every room timer and loop through roomTask', () => {
  const server = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
  const raw = [...server.matchAll(/setTimeout\((.{0,40})/g)].map(match => match[1]).filter(call => !call.includes('roomTask'));
  assert.deepEqual(raw, [], 'bare timers: ' + raw.join(' | '));
  assert.match(server, /for \(const room of rooms\.values\(\)\) roomTask\(room, 'race tick'/);
  assert.match(server, /clampToQuestions\(room\);/);
});
