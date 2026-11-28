/**
 * Every game ID the launcher is expected to offer, in catalogue order.
 *
 * Tests and browser checks compare against this explicit list instead of a
 * bare tile count, so adding a game is a deliberate one-line change here and
 * dropping or renaming an existing game still fails the suite.
 */
export const releasedGameIds = Object.freeze([
  'classic', 'wheel', 'board', 'dice', 'knockout', 'punchline',
  'cards', 'tracks', 'bluff', 'bloodmoon', 'potato', 'quizrace', 'showdown',
  'samepage', 'spotlight', 'brain', 'topanswers', 'rare', 'soclose', 'wayoff', 'catchup', 'shade', 'dontlook', 'sketch', 'debate',
]);
