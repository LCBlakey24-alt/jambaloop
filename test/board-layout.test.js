import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { curvedLayout, routeSketch, smoothCurve, forkKnots, TILE_TOP } from '../public/board-layout.js';
import { boardFork, boardLengths, boardPath } from '../public/board-route.js';

function tilesFor(spaces) {
  const fork = boardFork(spaces);
  const layout = curvedLayout(spaces, fork);
  const tiles = [];
  for (let i = 0; i <= spaces; i++) {
    const lane = i > fork.start && i < fork.rejoin ? 'P' : '';
    tiles.push({ id: lane + i, r: layout.radius * (i === spaces ? 1.18 : lane ? .86 : 1), ...layout.position(i, 'power') });
  }
  for (let i = fork.start + 1; i < fork.start + layout.edges; i++) tiles.push({ id: 'Q' + i, r: layout.trailRadius, ...layout.position(i, 'questions') });
  return { fork, layout, tiles };
}

test('the curved board never overlaps tiles and stays on the felt for every length', () => {
  for (const spaces of boardLengths) {
    const { tiles } = tilesFor(spaces);
    for (let a = 0; a < tiles.length; a++) {
      assert.ok(Math.abs(tiles[a].x) + tiles[a].r < 2.9 && Math.abs(tiles[a].z) + tiles[a].r < 2.9, `${spaces}: ${tiles[a].id} leaves the board`);
      for (let b = a + 1; b < tiles.length; b++) {
        const gap = Math.hypot(tiles[a].x - tiles[b].x, tiles[a].z - tiles[b].z) - tiles[a].r - tiles[b].r;
        assert.ok(gap > 0, `${spaces}: ${tiles[a].id} overlaps ${tiles[b].id} (${gap.toFixed(3)})`);
      }
    }
  }
});

test('the curved layout keeps the route data meaning of every index', () => {
  for (const spaces of boardLengths) {
    const { fork, layout } = tilesFor(spaces);
    // Shared tiles are drawn in the same place on both lanes.
    for (let i = 0; i <= fork.start; i++) assert.deepEqual(layout.position(i, 'questions'), layout.position(i, 'power'));
    for (let i = fork.rejoin; i <= spaces; i++) assert.deepEqual(layout.position(i + fork.extra, 'questions'), layout.position(i, 'power'));
    // Both finishes are the same raised tile; the route lengths are unchanged.
    assert.equal(layout.position(spaces + fork.extra, 'questions').y, TILE_TOP + .02);
    assert.equal(layout.position(1, 'power').y, TILE_TOP, 'tiles are inlaid, level with the path');
    assert.equal(boardPath(spaces, true, 'questions').length - 1, spaces + fork.extra);
    // Pawns move forward: consecutive spaces are close neighbours.
    for (const lane of ['power', 'questions']) {
      const last = lane === 'questions' ? spaces + fork.extra : spaces;
      for (let i = 1; i <= last; i++) {
        const a = layout.position(i - 1, lane), b = layout.position(i, lane);
        assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1.6, `${spaces}/${lane}: jump at ${i}`);
      }
    }
  }
});

test('the fork sits on the right-hand side and the route loops inward to finish', () => {
  const main = smoothCurve(routeSketch);
  for (const knot of forkKnots) assert.ok(routeSketch[knot][0] > 1, 'fork knots are on the right');
  const end = main.getPointAt(1);
  assert.ok(Math.hypot(end.x, end.z) < 1.7, 'finish is inside the board, away from the edges');
  // Every bend is wider than the painted path, so it cannot fold over itself.
  const samples = 900, points = Array.from({ length: samples + 1 }, (_, i) => main.getPointAt(i / samples));
  for (let i = 4; i < samples - 4; i++) {
    const [a, b, c] = [points[i - 4], points[i], points[i + 4]];
    const ab = Math.hypot(b.x - a.x, b.z - a.z), bc = Math.hypot(c.x - b.x, c.z - b.z), ca = Math.hypot(a.x - c.x, a.z - c.z);
    const area = Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)) / 2;
    if (area) assert.ok(ab * bc * ca / (4 * area) > .3, `tight bend at ${b.x.toFixed(2)},${b.z.toFixed(2)}`);
  }
  const board = readFileSync(new URL('../public/board.js', import.meta.url), 'utf8');
  assert.match(board, /import \{ curvedLayout, TILE_TOP \} from '\.\/board-layout\.js'/);
});
