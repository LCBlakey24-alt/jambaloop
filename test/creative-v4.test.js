import test from 'node:test';
import assert from 'node:assert/strict';
import * as v4 from '../creative-expansion-v4.js';
import { v2Punchlines, v2Blanks, v2Cards, v2Samepage, v2Bluff, v2ForkGood, v2ForkBad, v2Topanswers } from '../creative-expansion-v2.js';
import { punchlineV3, blankV3, cardV3 } from '../party-content-v3.js';
import { samePagePrompts } from '../same-page.js';
import { topAnswersPrompts } from '../top-answers.js';
import { sketchPrompts } from '../sketch-prompts.js';

const norm = text => String(text).normalize('NFKC').toLocaleLowerCase('en-GB').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

test('every v4 pool is large, original and free of repeats against earlier packs', () => {
  const pools = [
    ['punchline', v4.punchlineV4, [...v2Punchlines, ...punchlineV3], 60],
    ['blank', v4.blankV4, [...v2Blanks, ...blankV3], 50],
    ['card', v4.cardV4, [...v2Cards, ...cardV3], 80],
    ['bluff', v4.bluffV4, v2Bluff, 40],
    ['samepage', v4.samepageV4, v2Samepage, 40],
    ['forkGood', v4.forkGoodV4, v2ForkGood, 20],
    ['forkBad', v4.forkBadV4, v2ForkBad, 20],
  ];
  for (const [name, pool, earlier, minimum] of pools) {
    assert.ok(pool.length >= minimum, name + ' size');
    const ids = pool.map(norm);
    assert.equal(new Set(ids).size, ids.length, name + ' has a repeat');
    const before = new Set(earlier.map(norm));
    assert.deepEqual(pool.filter(item => before.has(norm(item))), [], name + ' repeats an earlier pack');
    assert.ok(pool.every(item => typeof item === 'string' && item.length >= 4 && item.length <= 170), name + ' length');
  }
});

test('prompts fit their game: blanks have one gap, cards are short noun phrases, polls have four options', () => {
  for (const sentence of v4.blankV4) assert.equal(sentence.split('____').length, 2, sentence);
  for (const card of v4.cardV4) {
    assert.ok(card.length <= 50 && !/[.?!]$/.test(card), card);
    assert.ok(/^(a|an|the|three|twelve) /.test(card), 'cards slot into any blank: ' + card);
  }
  for (const prompt of [...v4.punchlineV4, ...v4.bluffV4, ...v4.samepageV4]) assert.match(prompt, /[.?]$/, prompt);
  for (const [prompt, ...options] of v4.topanswersV4) {
    assert.equal(options.length, 4, prompt);
    assert.equal(new Set(options.map(norm)).size, 4, prompt);
  }
  for (const card of [...v4.forkGoodV4, ...v4.forkBadV4]) assert.match(card, /^(a|an) /, card);
});

test('the live games serve the new prompts', () => {
  assert.ok(samePagePrompts.includes(v4.samepageV4[0]));
  assert.ok(topAnswersPrompts.some(item => item.prompt === v4.topanswersV4[0][0]));
  assert.equal(new Set(topAnswersPrompts.map(item => norm(item.prompt))).size, topAnswersPrompts.length, 'no duplicate polls');
  assert.ok(sketchPrompts.some(item => item.answer === 'snowman'));
  assert.ok(sketchPrompts.filter(item => item.id.startsWith('object-v4-')).length >= 30);
});
