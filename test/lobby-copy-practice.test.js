// Lobby wording, the facts date and practice rounds (owner audit, 28 November 2026): every game's lobby
// says what that game really is, the facts date shows only where there are facts, the Start and Continue
// buttons name the right thing, and practice is offered only where it fits the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lobbyView } from '../public/game-views.js';
import { scoreBreakView } from '../public/score-break.js';
import { practicePlan, practiceView, samples } from '../public/learning.js';
import { createDraft } from '../public/answer-controls.js';
import { modes, partyModes, questionCounts, formatTypes } from '../public/game-config.js';
import { defaultPlayStyle, teamPlayModes } from '../public/team-play.js';
import { releasedGameIds } from '../released-games.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const modeName = id => modes.find(([key]) => key === id)?.[1] ?? id;
const room = (mode, overrides = {}) => ({
  code: '123456', game: 1, mode, total: questionCounts(mode, 'choice', 'mixed')[0], seconds: 20, connected: 6, playerCount: 6,
  readyCount: 0, isCaptain: true, playStyle: defaultPlayStyle(mode), teamCount: 2, boardLength: 24,
  format: ['soclose', 'wayoff'].includes(mode) ? 'estimate' : 'choice', raceStyle: mode === 'quizrace' ? 'quiz' : undefined,
  raceLength: 'medium', raceTrack: 'neon', raceDifficulty: 'mixed', players: [], teamPreview: [], player: { name: 'Ada', ready: false },
  captainName: 'Ada', joinUrl: 'https://example.test/?join=123456', qr: '', ...overrides,
});
const tv = (mode, overrides) => lobbyView(room(mode, overrides), { host: true, escape, icons: () => '', modeName });
const phone = (mode, overrides) => lobbyView(room(mode, overrides), { host: false, escape, icons: () => '', modeName });
/** The TV lobby's game summary as plain text, one line per row. */
const summary = html => html.match(/<div class="lobby-game-copy">([\s\S]*?)<\/div><\/div>/)[1]
  .replace(/<[^>]+>/g, '\n').split('\n').map(line => line.trim()).filter(Boolean).join('\n');

// Games where players cast votes; nowhere else may the lobby promise voting.
const voteModes = ['punchline', 'cards', 'bluff', 'bloodmoon', 'topanswers'];

test('every game\'s lobby summary is its own: correct plurals, voting only where there is a vote', () => {
  for (const mode of releasedGameIds) {
    for (const players of [1, 6]) {
      const text = summary(tv(mode, { connected: players, playerCount: players }));
      assert.doesNotMatch(text, /\b1 (rounds|questions|turns|levels|polls|max turns)\b/, `${mode}: no "1 rounds" (${text})`);
      assert.doesNotMatch(text, /\b0 \w+/, `${mode}: no zero counts (${text})`);
      if (!voteModes.includes(mode)) assert.doesNotMatch(text, /\bvot(e|es|ing)\b/i, `${mode} has no vote (${text})`);
    }
  }
  // The four games that used to say "1 rounds · private voting".
  for (const mode of ['bloodmoon', 'dontlook', 'shade', 'catchup']) assert.doesNotMatch(summary(tv(mode)), /rounds · private voting/, mode);
  assert.match(summary(tv('bloodmoon')), /Secret roles · vampires bite by night, the village votes by day/);
  assert.match(summary(tv('dontlook')), /Three rounds: speaking only, actions only, then anything goes/);
  assert.match(summary(tv('shade')), /One clue-giver a round, up to 8 rounds/);
  assert.match(summary(tv('catchup')), /One side sets a target against the clock, the other chases it, then they swap/);
  // Same Page and Sketch Sprint have no vote.
  assert.match(summary(tv('samepage')), /^3 rounds · score by matching answers$/m);
  assert.match(summary(tv('sketch')), /^3 rounds · one artist draws, everyone else guesses$/m);
  // Fork in the Tracks has one round per player; Spotlight one contestant round per player per turn.
  assert.match(summary(tv('tracks', { playerCount: 1, connected: 1 })), /^1 round · rotating Trolley Driver$/m);
  assert.match(summary(tv('tracks', { playerCount: 0, connected: 0 })), /^One round per player · rotating Trolley Driver$/m);
  assert.match(summary(tv('spotlight', { playerCount: 0, connected: 0 })), /^1 turn each as contestant$/m);
  // Way Off plays until one player is left, not a fixed five questions.
  assert.doesNotMatch(summary(tv('wayoff')), /5 questions/);
  assert.match(summary(tv('wayoff')), /last one standing/);
});

test('team wording only where the game has teams, sides or a team option', () => {
  // Fork in the Tracks is always two teams; individual Board Race has its own line below.
  for (const mode of releasedGameIds.filter(id => !['tracks', 'board'].includes(id))) {
    const text = summary(tv(mode, { playStyle: 'individual' }));
    if (teamPlayModes.includes(mode)) assert.match(text, /Everyone plays individually/, mode);
    else assert.doesNotMatch(text, /Everyone plays individually/, `${mode} has no team option, so it says nothing about it`);
  }
  assert.match(summary(tv('tracks')), /2 balanced teams/);
  assert.match(summary(tv('dontlook')), /Two teams with 4 or more players · 2 or 3 play as one group/);
  assert.match(summary(tv('catchup')), /Two sides · players split automatically/);
  assert.match(summary(tv('showdown', { playStyle: 'teams', teamCount: 3 })), /3 balanced teams/);
  // Individual Board Race takes up to eight pieces (BOARD_PIECES), not four.
  assert.match(summary(tv('board', { playStyle: 'individual' })), /Individual racers · up to 8 pieces/);
});

test('the facts date shows only in games that ask factual questions', () => {
  const facts = /Facts checked to \d{1,2} [A-Z][a-z]+ \d{4}/;
  for (const view of [tv, phone]) {
    for (const mode of ['dontlook', 'brain', 'bloodmoon', 'shade', 'samepage', 'sketch', 'punchline', 'cards', 'bluff', 'tracks', 'topanswers']) {
      assert.doesNotMatch(view(mode), facts, `${mode} has no facts to check`);
    }
    assert.doesNotMatch(view('quizrace', { raceStyle: 'symbols' }), facts, 'Symbol Dash only matches symbols');
    for (const mode of ['classic', 'wheel', 'board', 'dice', 'knockout', 'showdown', 'quizrace', 'soclose', 'wayoff', 'catchup', 'potato', 'spotlight', 'rare']) {
      assert.match(view(mode), facts, `${mode} asks factual questions`);
    }
    assert.doesNotMatch(view('classic', { quizTitle: 'Our quiz' }), facts, 'a room’s own quiz is not ours to date');
  }
});

test('Start and Continue name the right thing for every game', () => {
  const start = mode => tv(mode).match(/data-action="advance"[^>]*>([^<]*)/)[1].trim();
  for (const mode of releasedGameIds) {
    const expected = ['board', 'quizrace'].includes(mode) ? 'Start race' : partyModes.includes(mode) ? 'Start game' : 'Start quiz';
    assert.equal(start(mode), expected, mode);
  }
  assert.equal(start('quizrace'), 'Start race', 'Quiz Race is a race');
  const scoreBreak = mode => scoreBreakView({ ...room(mode), scoreBreak: { number: 3, starts: 0, entries: [] } },
    { host: false, canControl: true, escape, icons: () => '' });
  assert.match(scoreBreak('board'), /data-action="advance">Continue race/);
  assert.doesNotMatch(scoreBreak('board'), /Continue quiz/);
  for (const mode of ['classic', 'wheel', 'dice', 'knockout', 'showdown']) assert.match(scoreBreak(mode), /data-action="advance">Continue quiz/, mode);
  const waiting = scoreBreakView({ ...room('board'), scoreBreak: { number: 3, starts: 0, entries: [] } }, { host: false, canControl: false, escape, icons: () => '' });
  assert.match(waiting, /The race resumes when the host or captain continues/);
});

test('practice is offered only where it fits: no practice button in Bloodmoon and the other games without one', () => {
  const none = ['bloodmoon', 'dontlook', 'shade', 'catchup', 'samepage', 'sketch', 'spotlight', 'tracks', 'soclose', 'wayoff'];
  for (const mode of none) {
    assert.doesNotMatch(tv(mode), /data-action="practice"|Practice answers|Try a practice round/, `${mode} has no practice button`);
    assert.equal(practicePlan(room(mode)), undefined, mode);
  }
  assert.doesNotMatch(tv('quizrace', { raceStyle: 'symbols' }), /data-action="practice"/, 'Symbol Dash has no questions to practise');
  // A real walk-through of the game itself.
  for (const mode of ['board', 'wheel', 'dice', 'bluff', 'punchline', 'cards', 'rare', 'topanswers', 'brain', 'potato']) {
    assert.match(tv(mode), /data-action="practice">Try a practice round</, mode);
  }
  // Question games without a walk-through practise their answers.
  for (const mode of ['classic', 'knockout', 'showdown', 'quizrace']) assert.match(tv(mode), /data-action="practice">Practice answers</, mode);
  // Fork in the Tracks' old walk-through (a vote between two tracks) no longer describes the game.
  assert.doesNotMatch(read('public/learning.js'), /\btracks: \[\s*\['Choose a track'/);
});

test('the practice dialog shows only the answer types this room uses', () => {
  const offered = html => [...html.matchAll(/data-action="practice-type" data-type="(\w+)"/g)].map(([, type]) => type);
  const render = plan => {
    const sample = samples[plan.types[0]];
    return practiceView({ sample, draft: createDraft(sample), types: plan.types }, escape);
  };
  for (const format of ['choice', 'boolean', 'estimate', 'order', 'choice+boolean', 'boolean+order', 'mixed']) {
    // The dialog lists the types it is given, and nothing else.
    const html = render({ types: formatTypes(format) });
    if (formatTypes(format).length > 1) assert.deepEqual(offered(html), formatTypes(format), `${format}: the switcher lists this room's types only`);
    else {
      assert.deepEqual(offered(html), [], `${format}: one type needs no switcher`);
      assert.match(html, new RegExp(`class="practice-type-name">${{ choice: 'Multiple choice', boolean: 'True or false', estimate: 'Closest number', order: 'Put in order' }[format]}<`));
    }
    // And the room's plan gives it exactly the types its format asks.
    for (const mode of ['classic', 'showdown', 'wheel', 'board', 'dice']) {
      assert.deepEqual(practicePlan(room(mode, { format })).types, formatTypes(format), `${mode} ${format}`);
    }
  }
  // Multiple choice only: never the four types the owner found in Bloodmoon.
  assert.doesNotMatch(render({ types: ['choice'] }), /True or false|Closest number|Put in order/);
  // Quiz Race asks multiple choice only; Knockout adds its closest-number decider; a saved quiz uses its own types.
  assert.deepEqual(practicePlan(room('quizrace', { format: 'choice' })).types, ['choice']);
  assert.deepEqual(practicePlan(room('knockout', { format: 'mixed' })).types, ['choice', 'boolean', 'estimate']);
  assert.deepEqual(practicePlan(room('knockout', { format: 'order' })).types, ['choice', 'estimate']);
  assert.deepEqual(practicePlan(room('classic', { format: 'choice', quizTypes: ['order', 'choice'] })).types, ['choice', 'order']);
  assert.deepEqual(practicePlan(room('showdown', { format: 'choice', quizTypes: ['choice', 'boolean'] })).types, ['choice', 'boolean']);
  // Outside a room (the home page's How to play) every type can be tried.
  assert.deepEqual(practicePlan(undefined).types, ['choice', 'boolean', 'estimate', 'order']);
  // The dialog and the walk-throughs' "Try an answer" step use the room's plan, not a fixed list.
  const app = read('public/app.js');
  assert.match(app, /const plan = practicePlan\(session \? state : undefined\);/);
  assert.match(app, /showPractice\(plan\.types\.includes\(value\) \? value : plan\.types\[0\], plan\.types\)/);
  assert.match(app, /const types = practicePlan\(state\)\?\.types \?\? \[\];\n\s+return showPractice\(types\[0\] \?\? 'choice', types\);/);
  assert.doesNotMatch(app, /showPractice\('choice'\)/);
});
