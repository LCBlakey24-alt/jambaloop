import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sportChoice, sportBoolean, sportEstimate, sportOrder } from '../trivia-pack-sports.js';
import { screenChoice, screenBoolean, screenEstimate, screenOrder } from '../trivia-pack-screen.js';
import { topupChoice, topupBoolean } from '../trivia-pack-topups.js';
import { makeQuestions, questionCategories } from '../questions.js';
import { categories, categoryGroups, specialistCategories, wheelCategories } from '../public/game-config.js';
import { questionHistoryId } from '../public/question-history.js';
import { extraChoiceQuestions, extraBooleanQuestions } from '../question-expansion-v2.js';
import { estimates, orders } from '../extra-questions.js';
import { verifiedChoiceQuestions } from '../verified-questions.js';

const norm = text => String(text).normalize('NFKC').toLocaleLowerCase('en-GB').replace(/\s+/g, ' ').trim();
const choice = [sportChoice, screenChoice, topupChoice];
const boolean = [sportBoolean, screenBoolean, topupBoolean];
const estimate = [sportEstimate, screenEstimate];
const order = [sportOrder, screenOrder];
const rows = packs => packs.flatMap(pack => Object.entries(pack).flatMap(([category, items]) => items.map(row => ({ category, row }))));

test('specialist packs are full topics of their own, kept out of Mixed Bag and the wheel', () => {
  assert.deepEqual(specialistCategories, ['football', 'nba', 'nfl', 'nhl', 'f1', 'olympics', 'disney', 'superheroes']);
  for (const id of specialistCategories) {
    assert.ok(questionCategories.includes(id), id + ' is playable');
    assert.ok(categoryGroups.some(([, ids]) => ids.includes(id)), id + ' has a browsing group');
    assert.ok(!wheelCategories(true).some(([wheelId]) => wheelId === id), id + ' stays off the wheel');
    assert.ok(makeQuestions(id, 99, new Set(), 'choice').length >= 50, id + ' choice');
    assert.ok(makeQuestions(id, 99, new Set(), 'boolean').length >= 20, id + ' true/false');
    assert.ok(makeQuestions(id, 99, new Set(), 'estimate').length >= 5, id + ' estimates');
    assert.ok(makeQuestions(id, 99, new Set(), 'order').length >= 5, id + ' orders');
  }
  for (let round = 0; round < 20; round++) {
    for (const format of ['choice', 'boolean', 'estimate', 'order']) {
      assert.ok(makeQuestions('mixed', 60, new Set(), format, true).every(q => !specialistCategories.includes(q.category)), 'Mixed Bag stays everyday');
    }
  }
  assert.equal(new Set(categories.map(([id]) => id)).size, categories.length);
});

test('every new multiple-choice question has four distinct, non-empty options', () => {
  for (const { category, row: [prompt, ...options] } of rows(choice)) {
    assert.ok(prompt.length >= 12 && prompt.length <= 210, prompt);
    assert.match(prompt, /\?$/, category + ': choice prompts are questions: ' + prompt);
    assert.equal(options.length, 4, prompt);
    assert.ok(options.every(option => typeof option === 'string' && option.trim()), prompt);
    assert.equal(new Set(options.map(norm)).size, 4, 'repeated option: ' + prompt);
  }
});

test('true/false, estimates and orders are well formed and balanced', () => {
  for (const pack of boolean) for (const [category, items] of Object.entries(pack)) {
    assert.ok(items.every(([text, value]) => text.length >= 12 && typeof value === 'boolean'), category);
    const falses = items.filter(([, value]) => !value).length;
    assert.ok(falses >= items.length * .2 && falses <= items.length * .8, category + ' balance ' + falses + '/' + items.length);
  }
  for (const { row: [prompt, answer, unit, low, high] } of rows(estimate)) {
    assert.ok(Number.isSafeInteger(answer) && answer >= 0, 'whole-number answers can be guessed exactly: ' + prompt);
    assert.ok(low <= answer && answer <= high && low < high, prompt);
    assert.equal(typeof unit, 'string');
  }
  for (const { row: [prompt, ...items] } of rows(order)) {
    assert.equal(items.length, 4, prompt);
    assert.equal(new Set(items.map(norm)).size, 4, prompt);
  }
});

test('no new prompt repeats a question that is already in the library', () => {
  const source = readFileSync(new URL('../questions.js', import.meta.url), 'utf8');
  const existing = new Set([
    ...[...source.matchAll(/^\s*\[\s*(['"])(.+?)\1\s*,/gm)].map(match => match[2]),
    ...[extraChoiceQuestions, extraBooleanQuestions].flatMap(pack => Object.values(pack).flat().map(row => row[0])),
    ...Object.values(verifiedChoiceQuestions).flat().map(item => item.prompt),
  ].map(questionHistoryId));
  // Estimates and orders the packs added are appended to these shared objects at import.
  const packPrompts = rows([...choice, ...boolean, ...estimate, ...order]).map(({ row }) => row[0]);
  const ids = packPrompts.map(questionHistoryId);
  assert.equal(new Set(ids).size, ids.length, 'a pack prompt appears twice');
  const originalEstimates = Object.values(estimates).flat().map(row => row[0]).filter(prompt => !packPrompts.includes(prompt));
  const originalOrders = Object.values(orders).flat().map(row => row[0]).filter(prompt => !packPrompts.includes(prompt));
  for (const prompt of [...originalEstimates, ...originalOrders]) existing.add(questionHistoryId(prompt));
  const clashes = packPrompts.filter(prompt => existing.has(questionHistoryId(prompt)));
  assert.deepEqual(clashes, []);
});
