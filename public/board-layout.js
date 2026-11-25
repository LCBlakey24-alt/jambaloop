// Visual layout for the 3D Board Race table. Pure maths (no three.js) so it
// can be tested in Node. The game's route data in board-route.js is not
// changed: index n on either lane still means the same space; this module only
// decides where the 3D board draws it, along a smooth winding path.

// Board units: the felt spans about ±3. The path meanders round the edge,
// leaves room on the right for Question Trail to swing outwards, then spirals
// into a finish in the middle of the board.
// Gentle sine meanders (long wavelengths keep every bend wider than the
// painted path, so it never folds over itself), then a spiral to the finish.
function wave(from, to, amplitude, waves, samples = 22) {
  const [x0, z0] = from, [x1, z1] = to;
  const dx = x1 - x0, dz = z1 - z0, length = Math.hypot(dx, dz);
  const nx = -dz / length, nz = dx / length;
  return Array.from({ length: samples + 1 }, (_, k) => {
    const t = k / samples;
    const bump = Math.sin(t * Math.PI * 2 * waves) * amplitude * Math.sin(Math.PI * t);
    return [x0 + dx * t + nx * bump, z0 + dz * t + nz * bump];
  });
}
// Section lengths are balanced to the space counts (before the fork : fork :
// after the fork ≈ 1 : 1 : 2) so tiles are evenly spaced on every board size.
// Before the fork: up the lower left side, round the corner and along the front.
const front = [
  [-2.45, .75], [-2.4, 1.45], [-2.05, 2.05],
  ...wave([-1.5, 2.28], [.7, 2.28], .18, 1.2, 16), [1.2, 2.2], [1.55, 1.88],
];
// The fork: Power Lane swings into the board in a wide S while Question
// Trail arcs out to the right edge, so the two lanes split clearly.
const right = [[1.55, 1.35], [1.12, .85], [.8, .3], [.86, -.3], [1.28, -.76], [1.6, -1.28], [1.5, -1.86], [1.1, -2.24]];
// After the fork: along the back, down the upper left, then a loop into the finish.
const rest = [
  ...wave([.62, -2.32], [-1.75, -2.32], .16, 1, 14), [-2.2, -2.2], [-2.42, -1.75], [-2.34, -1.12], [-1.98, -.7],
  [-1.35, -.78], [-.6, -1.12], [.08, -.72], [.25, .05], [-.12, .7], [-.82, .95], [-1.35, .72], [-1.5, .22],
];
export const routeSketch = [...front, ...right, ...rest];
// Sketch points where Power Lane leaves and rejoins (the right-hand side).
export const forkKnots = [front.length - 1, front.length + right.length - 1];
// Inside the dice tower's exit chute (which reaches x = 2.63), so no tile sits under it.
const TRAIL_EDGE = 2.3;
// Top of the inlaid tiles: just proud of the painted path at y = .19.
export const TILE_TOP = .215;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = v => Math.hypot(v[0], v[1]);

/** Centripetal Catmull-Rom polyline with an arc-length table. */
export function smoothCurve(points, samplesPerSegment = 48) {
  const pts = [
    [2 * points[0][0] - points[1][0], 2 * points[0][1] - points[1][1]],
    ...points,
    [2 * points.at(-1)[0] - points.at(-2)[0], 2 * points.at(-1)[1] - points.at(-2)[1]],
  ];
  const samples = [];
  for (let i = 0; i < pts.length - 3; i++) {
    const [p0, p1, p2, p3] = pts.slice(i, i + 4);
    const t0 = 0;
    const t1 = t0 + Math.sqrt(len(sub(p1, p0))) || 1e-4;
    const t2 = t1 + Math.sqrt(len(sub(p2, p1))) || t1 + 1e-4;
    const t3 = t2 + Math.sqrt(len(sub(p3, p2))) || t2 + 1e-4;
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = t1 + (t2 - t1) * s / samplesPerSegment;
      const lerp = (a, b, ta, tb) => [
        ((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta),
        ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta),
      ];
      const a1 = lerp(p0, p1, t0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, t0, t2), b2 = lerp(a2, a3, t1, t3);
      samples.push(lerp(b1, b2, t1, t2));
    }
  }
  samples.push(points.at(-1));
  const knotSample = index => Math.min(samples.length - 1, index * samplesPerSegment);
  const lengths = [0];
  for (let i = 1; i < samples.length; i++) lengths.push(lengths[i - 1] + len(sub(samples[i], samples[i - 1])));
  const total = lengths.at(-1);
  function locate(u) {
    const target = Math.min(1, Math.max(0, u)) * total;
    let lo = 0, hi = lengths.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lengths[mid] < target) lo = mid; else hi = mid; }
    const span = lengths[hi] - lengths[lo] || 1;
    return [lo, hi, (target - lengths[lo]) / span];
  }
  return {
    getLength: () => total,
    knotU: index => lengths[knotSample(index)] / total,
    getPointAt(u) {
      const [lo, hi, f] = locate(u);
      return { x: samples[lo][0] + (samples[hi][0] - samples[lo][0]) * f, y: 0, z: samples[lo][1] + (samples[hi][1] - samples[lo][1]) * f };
    },
    getTangentAt(u) {
      const [lo, hi] = locate(u);
      const d = sub(samples[hi], samples[lo]);
      const l = len(d) || 1;
      return { x: d[0] / l, y: 0, z: d[1] / l };
    },
  };
}

/**
 * Positions for every board index on both lanes. Question Trail swings out
 * towards the board edge on the right and rejoins Power Lane.
 */
export function curvedLayout(spaces, fork) {
  const main = smoothCurve(routeSketch);
  const uStart = main.knotU(forkKnots[0]), uRejoin = main.knotU(forkKnots[1]);
  // Anchor the fork to the right-hand side: piecewise spacing per section.
  const mainU = index => index <= fork.start ? uStart * index / fork.start
    : index <= fork.rejoin ? uStart + (uRejoin - uStart) * (index - fork.start) / (fork.rejoin - fork.start)
    : uRejoin + (1 - uRejoin) * (index - fork.rejoin) / (spaces - fork.rejoin);
  const total = main.getLength();
  const spacing = Math.min(uStart * total / fork.start, (uRejoin - uStart) * total / (fork.rejoin - fork.start), (1 - uRejoin) * total / (spaces - fork.rejoin));
  // Chords across wave peaks are shorter than path spacing: size tiles conservatively.
  const radius = Math.min(.32, spacing * .36);
  // Question Trail: its own smooth arc from the fork out towards the right
  // edge and back to the rejoin point, clear of Power Lane's wiggles.
  const from = main.getPointAt(uStart), to = main.getPointAt(uRejoin);
  const bulge = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    const x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
    bulge.push([x + (TRAIL_EDGE - x) * Math.pow(Math.sin(Math.PI * t), .3), z]);
  }
  const trail = smoothCurve(bulge);
  const edges = fork.rejoin - fork.start + fork.extra;
  // Trail tiles fit their own (shorter) arc, so they can be a little smaller.
  const trailRadius = Math.min(radius * .86, trail.getLength() * .84 / edges * .44);
  function position(index, choice = 'power') {
    const finishIndex = choice === 'questions' ? spaces + fork.extra : spaces;
    let point;
    // Trail tiles sit slightly in from each junction so they clear the shared tiles.
    if (choice === 'questions' && index > fork.start && index < fork.start + edges) point = trail.getPointAt(.5 + ((index - fork.start) / edges - .5) * .84);
    else point = main.getPointAt(mainU(choice === 'questions' && index >= fork.start + edges ? index - fork.extra : index));
    // Tiles are inlaid in the board: pawns stand on their tops (y), level with the path.
    return { x: point.x, y: index === finishIndex ? TILE_TOP + .02 : TILE_TOP, z: point.z };
  }
  return { main, trail, radius, trailRadius, scale: radius * 2 / .93, position, edges };
}
