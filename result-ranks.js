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
