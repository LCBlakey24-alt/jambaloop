// Visual layout for the 3D Board Race table. Pure maths (no three.js) so it
// can be tested in Node. The game's route data in board-route.js decides what
// each index means; this module only decides where the board draws it.
//
// The board is a classic square lap: touching square spaces all the way round
// the edge, a bonus space on each corner, and a short finishing straight from
// the start corner in to the middle. Question Trail is a slimmer lane just
// inside the right-hand side, between the first and second corners.

// Top of the inlaid tiles: just proud of the printed board.
export const TILE_TOP = .215;
// The ring fills this much of the board (board units; the print spans about ±2.96).
export const LAP_SPAN = 5.2;
const HOME_STRAIGHT = 4;

export function lapLayout(spaces, fork) {
  const side = (spaces - HOME_STRAIGHT) / 4;
  const cell = LAP_SPAN / (side + 1);
  const half = LAP_SPAN / 2 - cell / 2;
  const lap = side * 4;
  const edges = fork.rejoin - fork.start + fork.extra;
  // Start at the near-left corner, along the front, up the right side, along the back, down the left.
  function ring(k) {
    const leg = Math.floor(k / side) % 4, step = k % side;
    if (leg === 0) return [-half + step * cell, half];
    if (leg === 1) return [half, half - step * cell];
    if (leg === 2) return [half - step * cell, -half];
    return [-half, -half + step * cell];
  }
  const trailStep = side * cell / edges;
  function kind(index, choice = 'power') {
    if (choice === 'questions' && index > fork.start && index < fork.start + edges) return 'trail';
    const base = choice === 'questions' && index >= fork.start + edges ? index - fork.extra : index;
    return base > lap ? 'home' : 'ring';
  }
  function position(index, choice = 'power') {
    const finishIndex = choice === 'questions' ? spaces + fork.extra : spaces;
    const y = index === finishIndex ? TILE_TOP + .02 : TILE_TOP;
    if (kind(index, choice) === 'trail') return { x: half - cell * .98, y, z: half - (index - fork.start) * trailStep };
    const base = choice === 'questions' && index >= fork.start + edges ? index - fork.extra : index;
    if (base <= lap) { const [x, z] = ring(base % lap); return { x, y, z }; }
    // The finishing straight: from the start corner diagonally in to the middle.
    const t = (base - lap) / HOME_STRAIGHT;
    return { x: -half * (1 - t), y, z: half * (1 - t) };
  }
  // board.js draws a square of width radius × 1.4.
  const radius = cell * .96 / 1.4;
  const trailRadius = Math.min(cell * .8, trailStep * .9) / 1.4;
  const homeStep = half * Math.SQRT2 / HOME_STRAIGHT;
  const homeScale = Math.min(1, homeStep * .68 / (cell * .96));
  /** How big a space is drawn, as a fraction of a ring space. */
  const scaleOf = (index, choice = 'power') => {
    const finishIndex = choice === 'questions' ? spaces + fork.extra : spaces;
    return index === finishIndex ? 1 : kind(index, choice) === 'home' ? homeScale : 1;
  };
  return { side, cell, half, lap, radius, trailRadius, scale: radius * 2 / .93, position, edges, kind, scaleOf };
}

// Kept under the old name for callers written against the winding layout.
export const curvedLayout = lapLayout;
