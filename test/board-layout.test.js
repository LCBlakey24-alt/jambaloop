import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { lapLayout, TILE_TOP, LAP_SPAN } from '../public/board-layout.js';
import { boardLengths, boardFork, boardPath, boardCorners, boardIsCorner, boardSide } from '../public/board-route.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('the board is one square lap of touching spaces with a corner every side', () => {
  for (const spaces of boardLengths) {
    const fork = boardFork(spaces), layout = lapLayout(spaces, fork), side = boardSide(spaces);
    assert.equal(layout.lap, side * 4);
    // Neighbours round the lap are exactly one space apart, in a straight line.
    for (let i = 1; i <= layout.lap; i++) {
      const a = layout.position(i - 1), b = layout.position(i);
      assert.ok(near(Math.abs(a.x - b.x) + Math.abs(a.z - b.z), layout.cell), `${spaces}: space ${i} touches space ${i - 1}`);
    }
    // The four corners of the lap are the four corners of the square, and the lap ends on the start.
    const corners = boardCorners(spaces).map(index => layout.position(index));
    for (const corner of corners) assert.ok(near(Math.abs(corner.x), layout.half) && near(Math.abs(corner.z), layout.half));
    assert.deepEqual(layout.position(layout.lap), layout.position(0), 'a full lap returns to the start corner');
    assert.equal(new Set(corners.map(c => `${c.x.toFixed(3)},${c.z.toFixed(3)}`)).size, 4);
  }
});

test('nothing leaves the board, and the finishing straight ends in the middle', () => {
  for (const spaces of boardLengths) {
    const fork = boardFork(spaces), layout = lapLayout(spaces, fork);
    const width = layout.radius * 1.4;
    assert.ok(width <= layout.cell, 'a ring space is no wider than its cell, so neighbours never overlap');
    for (const lane of ['power', 'questions']) {
      const last = lane === 'questions' ? spaces + fork.extra : spaces;
      for (let i = 0; i <= last; i++) {
        const p = layout.position(i, lane);
        assert.ok(Math.abs(p.x) + width / 2 <= LAP_SPAN / 2 + 1e-9 && Math.abs(p.z) + width / 2 <= LAP_SPAN / 2 + 1e-9, `${spaces}/${lane}: space ${i} is inside the border`);
      }
      const finish = layout.position(last, lane);
      assert.ok(near(finish.x, 0) && near(finish.z, 0), 'the finish is the centre of the board');
      assert.equal(finish.y, TILE_TOP + .02);
    }
    // Home-straight spaces shrink where needed so they never overlap along the diagonal.
    assert.equal(layout.kind(spaces - 1), 'home');
    const homeWidth = width * layout.scaleOf(spaces - 1);
    const a = layout.position(spaces - 2), b = layout.position(spaces - 1);
    assert.ok(Math.abs(a.x - b.x) >= homeWidth - 1e-9, `${spaces}: home-straight spaces do not overlap`);
    assert.equal(layout.scaleOf(spaces), 1);
  }
});

test('Question Trail is a slimmer lane just inside the right-hand side', () => {
  for (const spaces of boardLengths) {
    const fork = boardFork(spaces), layout = lapLayout(spaces, fork);
    // Shared spaces are drawn in the same place on both lanes.
    for (let i = 0; i <= fork.start; i++) assert.deepEqual(layout.position(i, 'questions'), layout.position(i, 'power'));
    for (let i = fork.rejoin; i <= spaces; i++) assert.deepEqual(layout.position(i + fork.extra, 'questions'), layout.position(i, 'power'));
    assert.equal(boardPath(spaces, true, 'questions').length - 1, spaces + fork.extra);
    const trailWidth = layout.trailRadius * 1.4;
    let previous;
    for (let i = fork.start + 1; i < fork.start + layout.edges; i++) {
      const p = layout.position(i, 'questions');
      assert.equal(layout.kind(i, 'questions'), 'trail');
      assert.ok(p.x < layout.half && p.x > layout.half - layout.cell * 1.05, 'one lane in from the edge');
      assert.ok(p.x + trailWidth / 2 <= layout.half - layout.cell / 2 + layout.cell * .5, 'clear of the Power Lane spaces');
      if (previous) assert.ok(previous.z - p.z >= trailWidth - 1e-9, `${spaces}: trail spaces ${i - 1} and ${i} do not overlap`);
      previous = p;
      assert.equal(boardIsCorner(spaces, i, 'questions'), false, 'no bonus corners inside the trail');
    }
  }
});

test('corner bonuses: every corner of the lap, on either lane, and nowhere else', () => {
  for (const spaces of boardLengths) {
    const fork = boardFork(spaces), side = boardSide(spaces);
    assert.deepEqual([fork.start, fork.rejoin], [side, side * 2], 'the lanes split at the first corner and rejoin at the second');
    const corners = [];
    for (let i = 1; i <= spaces; i++) if (boardIsCorner(spaces, i, 'power')) corners.push(i);
    assert.deepEqual(corners, boardCorners(spaces));
    // On Question Trail the later corners are four spaces further along.
    assert.equal(boardIsCorner(spaces, side * 3 + fork.extra, 'questions'), true);
  }
});

test('each space\'s block sits square-on under its printed face', () => {
  const board = readFileSync(new URL('../public/board.js', import.meta.url), 'utf8');
  const tiles = board.slice(board.indexOf('// Square spaces, like a printed board'), board.indexOf('board.add(tile,printed);'));
  assert.ok(tiles.length > 200, 'found the tile-building block');
  assert.doesNotMatch(tiles, /tile\.rotation\.y|printed\.rotation\.z/, 'neither the block nor its face is turned, so they always line up');
  assert.match(tiles, /new THREE\.PlaneGeometry\(width,width\)/, 'the face is exactly the size of the block');
  assert.match(board, /import \{ curvedLayout, TILE_TOP \} from '\.\/board-layout\.js'/);
});
