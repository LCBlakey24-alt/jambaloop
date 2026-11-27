import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { modes } from '../public/game-config.js';
import { asksFacts, factsCheckedLabel, factsCheckedOn } from '../public/content-date.js';

test('the facts-checked date matches the latest written-up review and is shown in question-game lobbies', () => {
  const reviews = readdirSync(new URL('../docs/', import.meta.url)).map(name => name.match(/^QUESTION_FACT_CHECK_(\d{4}-\d{2}-\d{2})\.md$/)?.[1]).filter(Boolean).sort();
  assert.equal(factsCheckedOn, reviews.at(-1), 'bump the date only with a written review, and never leave it behind one');
  assert.match(factsCheckedLabel(), /^Facts checked to \d{1,2} [A-Z][a-z]+ \d{4}$/);
  const views = readFileSync(new URL('../public/game-views.js', import.meta.url), 'utf8');
  assert.match(views, /asksFacts\(state\.mode\) && !state\.quizTitle \? `<small class="facts-checked">\$\{factsCheckedLabel\(\)\}/, 'shown for built-in question games, not for a room’s own quiz');
  for (const mode of ['classic', 'wheel', 'board', 'dice', 'knockout', 'showdown', 'quizrace', 'soclose', 'wayoff', 'catchup', 'rare', 'potato', 'spotlight', 'brain']) assert.ok(asksFacts(mode), mode);
  for (const mode of ['punchline', 'cards', 'bluff', 'samepage', 'sketch', 'bloodmoon']) assert.ok(!asksFacts(mode), mode);
  for (const [id] of modes) assert.equal(typeof asksFacts(id), 'boolean');
});

test('every topic has enough questions to play several rounds without repeats', async () => {
  const { makeQuestions } = await import('../questions.js');
  const { categories } = await import('../public/game-config.js');
  for (const [id, name] of categories) {
    if (id === 'mixed' || id === 'news') continue; // news is deliberately small and dated
    const prompts = new Set(makeQuestions(id, 5000, new Set(), 'mixed', true).map(question => question.prompt));
    assert.ok(prompts.size >= 80, `${name} has only ${prompts.size} questions`);
  }
});
