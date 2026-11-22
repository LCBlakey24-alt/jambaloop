import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardQuestion, questionCategories } from '../questions.js';
import { answerValue } from '../public/scoring.js';
import { revealFrames } from '../public/ceremony.js';

test('Board Race has a question with each grade, genre and format', () => {
  const prompts = new Set();
  for (const category of questionCategories) {
    for (const type of ['choice', 'boolean', 'estimate', 'order']) {
      const grades = new Set();
      for (let level = 1; level <= 6; level++) {
        const question = boardQuestion(category, type, level, prompts);
        assert.equal(question.difficulty, level);
        assert.equal(question.category, category);
        assert.equal(question.type, type);
        assert.ok(question.prompt);
        assert.ok(!grades.has(question.prompt));
        grades.add(question.prompt);
        prompts.add(question.prompt);
      }
    }
  }
});

test('board speed bonus scales with the roll, timer and response time', () => {
  const board = { mode: 'board', opened: 1, ends: 15001, boardSpeed: 50, motion: { points: 6 } };
  assert.equal(answerValue(board, { type: 'choice' }, 0), 9);
  assert.equal(answerValue(board, { type: 'order' }, 7500), 7.5);
  assert.equal(answerValue(board, { type: 'choice' }, 15000), 6);
  assert.equal(answerValue(board, { type: 'estimate' }, 0), 6);
  assert.equal(answerValue({ ...board, ends: 0 }, { type: 'boolean' }, 0), 6);
});

test('score reveal shows every player from bottom to top with ties intact', () => {
  const players = Array.from({ length: 30 }, (_, index) => ({ id: index, score: 100 - Math.floor(index / 2) }));
  const rows = revealFrames(players).flatMap(frame => frame.rows);
  assert.deepEqual(rows.map(({ player }) => player.id), players.map(player => player.id).reverse());
  assert.deepEqual(rows.slice(-4).map(row => row.rank), [3, 3, 1, 1]);
});
