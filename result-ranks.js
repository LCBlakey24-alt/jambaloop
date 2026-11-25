/**
 * Competition ranks for an already ordered list of players or teams.
 *
 * Most Jambaloop games allow joint places for equal scores / lives. Quiz Race
 * instead has an authoritative track finishing order: racers can all have
 * the same rounded score (100) but different finish positions. Passing
 * distinctPositions preserves the race's 1st/2nd/3rd order on result screens
 * and in the game-night standings.
 */
export function placementRanks(rows, compare, distinctPositions = false) {
  const ranks = new Map();
  let rank = 1;
  rows.forEach((row, index) => {
    if (index && (distinctPositions || compare(row, rows[index - 1]) !== 0)) rank = index + 1;
    ranks.set(row.id, rank);
  });
  return ranks;
}

/**
 * Final places for a finished game. Hot Potato has no points: the player
 * caught holding it (`caughtId`) finishes last and everyone else shares first.
 */
export function finishRanks(rows, compare, { distinctPositions = false, caughtId } = {}) {
  if (caughtId !== undefined) return new Map(rows.map(row => [row.id, row.id === caughtId ? rows.length : 1]));
  return placementRanks(rows, compare, distinctPositions);
}

/** Orders rows so a caught Hot Potato holder is listed last; otherwise by `compare`. */
export function caughtLast(rows, compare, caughtId) {
  return [...rows].sort((a, b) => (caughtId === undefined ? 0 : Number(a.id === caughtId) - Number(b.id === caughtId)) || compare(a, b));
}

/** Game Night stars for one finished game. Being caught is a loss even when it is only 2nd of 2. */
export function nightAward(placing, caught = false) {
  if (caught || !placing) return { stars: 0, win: false, podium: false };
  return { stars: Math.max(0, 4 - placing), win: placing === 1, podium: placing <= 3 };
}
