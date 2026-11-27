import test from 'node:test';
import assert from 'node:assert/strict';
import * as v5 from '../creative-expansion-v5.js';
import * as v4 from '../creative-expansion-v4.js';
import { boardQuestion, levelled, makeQuestions } from '../questions.js';
import { isSpecialist } from '../public/game-config.js';

const norm = text => String(text).normalize('NFKC').toLocaleLowerCase('en-GB').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

test('levelled trivia packs: 17 everyday and 8 specialist topics, six levels each, valid and not already in the library', () => {
  assert.equal(Object.keys(levelled).length, 25);
  for (const [category, formats] of Object.entries(levelled)) for (const level of [1, 2, 3, 4, 5, 6]) {
    // Everyday topics carry 5 and 3 per level; the specialist topics, added later, carry 10 and 5.
    assert.equal(formats.choice[level].length, isSpecialist(category) ? 10 : 5, `${category} level ${level} choice`);
    assert.equal(formats.boolean[level].length, isSpecialist(category) ? 5 : 3, `${category} level ${level} true/false`);
  }
  // The validator checks shape, balance and repeats against everything already in the banks.
  const files = [1, 2, 3, 4, 5, 6, 7, 8].map(n => `trivia-levels-${n}.js`);
  const prompts = Object.values(levelled).flatMap(formats => [...Object.values(formats.choice).flat(), ...Object.values(formats.boolean).flat()].map(row => norm(row[0])));
  assert.equal(new Set(prompts).size, prompts.length, 'a levelled prompt appears twice');
  assert.equal(prompts.length, 17 * 48 + 8 * 90);
  assert.ok(files.length === 8);
  assert.equal(Object.keys(levelled).filter(isSpecialist).length, 8);
  // They are playable in the ordinary quiz too.
  const classic = new Set(makeQuestions('history', 999, new Set(), 'choice').map(question => question.prompt));
  assert.ok(levelled.history.choice[6].every(row => classic.has(row[0])));
});

test('Board Race and Knockout draw levelled questions at the right level, unseen ones first', () => {
  // Board Race plays the everyday topics; the specialist packs are for the topic quizzes.
  for (const [category, formats] of Object.entries(levelled).filter(([id]) => !isSpecialist(id))) for (const format of ['choice', 'boolean']) for (const level of [1, 6]) {
    const pool = new Set(formats[format][level].map(row => row[0]));
    const seen = new Set();
    const drawn = new Set();
    for (let i = 0; i < 12; i++) { const question = boardQuestion(category, format, level, seen); seen.add(question.prompt); drawn.add(question.prompt); assert.equal(question.difficulty, level); }
    assert.ok([...pool].every(prompt => drawn.has(prompt)), `${category} ${format} level ${level} reaches every levelled row before repeating`);
  }
});

test('v5 party prompts are original, well formed and bigger than the minimums', () => {
  const pools = [['punchline', 60], ['blank', 50], ['card', 80], ['bluff', 40], ['samepage', 40], ['forkGood', 24], ['forkBad', 24], ['sketchObjects', 40]];
  for (const [name, minimum] of pools) {
    const pool = v5[name + 'V5'];
    assert.ok(pool.length >= minimum, name + ' size');
    const ids = pool.map(norm);
    assert.equal(new Set(ids).size, ids.length, name + ' has a repeat');
    const before = new Set(v4[name + 'V4'].map(norm));
    assert.deepEqual(pool.filter(item => before.has(norm(item))), [], name + ' repeats v4');
    assert.ok(pool.every(item => typeof item === 'string' && item.length >= 4 && item.length <= 170), name + ' length');
  }
  for (const sentence of v5.blankV5) assert.equal(sentence.split('____').length, 2, sentence);
  for (const card of v5.cardV5) assert.ok(card.length <= 50 && !/[.?!]$/.test(card) && /^(a|an|the|three|twelve) /.test(card), card);
  for (const prompt of [...v5.punchlineV5, ...v5.bluffV5, ...v5.samepageV5]) assert.match(prompt, /[.?]$/, prompt);
  assert.ok(v5.topanswersV5.length >= 30);
  for (const [prompt, ...options] of v5.topanswersV5) { assert.equal(options.length, 4, prompt); assert.equal(new Set(options.map(norm)).size, 4, prompt); }
});
