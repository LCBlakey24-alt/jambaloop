import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { raceLengths } from '../quiz-race.js';
import { circuitPoints, circuits, coursePath, courseSegments } from '../public/race-course.js';
import { raceTrackMarkup } from '../public/quiz-race-track.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('public/tv-immersive.css');
const app = read('public/app.js');
const html = read('public/index.html');
const race3d = read('public/race-3d.js');
const board = read('public/board.js');

test('the 2D and 3D race tracks share one course with reflected S controls', () => {
  const segments = courseSegments();
  assert.equal(segments.length, 4);
  assert.deepEqual(segments[0][0], [80, 280]);
  assert.deepEqual(segments.at(-1)[3], [1080, 180]);
  for (let i = 1; i < segments.length; i++) {
    assert.deepEqual(segments[i][0], segments[i - 1][3], 'segments are continuous');
    // Smooth joins: the first control mirrors the previous second control.
    const [px, py] = segments[i - 1][2];
    const [jx, jy] = segments[i][0];
    assert.deepEqual(segments[i][1], [2 * jx - px, 2 * jy - py]);
  }
  assert.ok(raceTrackMarkup().includes(`d="${coursePath}"`), 'the SVG fallback draws the same road');
});

test('the 3D circuit is a figure-of-eight lap whose second pass bridges the first', () => {
  assert.match(race3d, /import \{ circuits \} from '\.\/race-course\.js'/);
  assert.match(race3d, /CatmullRomCurve3\(points[^\n]*, true, 'centripetal'/, 'closed lap: start and finish share a line');
  assert.equal(circuits.medium.points, circuitPoints, 'the medium race is the figure of eight');
  const middle = circuitPoints.map((point, order) => ({ point, order })).filter(({ point: [x, , z] }) => Math.hypot(x, z) < .5);
  assert.equal(middle.length, 2, 'the course crosses the middle twice');
  const [under, over] = middle;
  assert.ok(over.order > under.order + 4, 'the crossing passes are far apart in the lap');
  assert.ok(over.point[1] - under.point[1] >= 1.5, 'cars clear the bridge');
  // Grandstand, gantry and pillars dress the circuit; twelve cars fit in rows of six.
  assert.match(race3d, /const LANES = 6;/);
  assert.match(race3d, /Start\/finish gantry: a post either side/);
  for (const [x, y, z] of circuitPoints) assert.ok(Math.abs(x) < 19.5 && Math.abs(z) < 9 && y >= 0);
});

test('three circuits, one per race length: short, the figure of eight, and a long one with ramps', () => {
  assert.deepEqual(Object.keys(circuits), Object.keys(raceLengths), 'every race length has its own circuit');
  const lap = name => circuits[name].points.reduce((sum, [x, , z], i, all) => { const [nx, , nz] = all[(i + 1) % all.length]; return sum + Math.hypot(nx - x, nz - z); }, 0);
  assert.ok(lap('short') < lap('medium') && lap('medium') * 1.4 < lap('long'), 'each is clearly longer than the last');
  const ramps = circuits.long.points.filter(([, y], i, all) => y >= .9 && all.at(i - 1)[1] === 0 && all[(i + 1) % all.length][1] === 0);
  assert.ok(ramps.length >= 4, 'the long circuit has a ramp on every straight');
  assert.ok(circuits.short.points.every(([, y]) => y === 0), 'the short one is flat out');
  // No part of a lap runs so close to another part that the two roads would overlap (the bridge excepted).
  for (const [name, { points, crossing }] of Object.entries(circuits)) {
    points.forEach(([x, , z], i) => points.forEach(([ox, , oz], j) => {
      const apart = Math.min(Math.abs(i - j), points.length - Math.abs(i - j));
      if (apart < 4 || crossing.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 5)) return;
      assert.ok(Math.hypot(x - ox, z - oz) > 4.2, `${name}: points ${i} and ${j} are too close`);
    }));
  }
  assert.match(app, /mountRace3D\(\{key:raceKey,track:s\.race\.track,course:s\.race\.course\?\?s\.raceLength,/, 'the TV draws the circuit of the race being run');
  // The crowd is made of little people, drawn in two instanced meshes, and it bobs unless motion is reduced.
  assert.match(race3d, /new THREE\.InstancedMesh\(new THREE\.CapsuleGeometry/);
  assert.match(race3d, /if \(!reducedMotion\) placeCrowd\(performance\.now\(\)\);/);
});

test('trackside models are recorded with their licence, and the race still draws if one is missing', () => {
  const models = readdirSync(new URL('../public/models/racing/', import.meta.url)).filter(name => name.endsWith('.glb')).map(name => name.replace('.glb', ''));
  const used = [...race3d.matchAll(/'(grandStand\w*|pits\w+|lightPostLarge|bannerTower\w+|flagCheckers|tentRoof)'/g)].map(match => match[1]);
  assert.ok(used.length >= 8);
  for (const name of used) assert.ok(models.includes(name), name + ' is used but not shipped');
  for (const name of models) assert.ok(used.includes(name), name + ' is shipped but not used');
  assert.match(readFileSync(new URL('../public/models/racing/LICENCE-CC0.txt', import.meta.url), 'utf8'), /Creative Commons Zero/);
  assert.match(readFileSync(new URL('../docs/BRANDING_ASSETS.md', import.meta.url), 'utf8'), /public\/models\/racing\/\*\.glb/);
  assert.match(race3d, /\.catch\(\(\) => \{ \/\* the circuit still works without it \*\/ \}\)/);
  // The outer flame of a kart on fire survives the kart model swapping in.
  assert.match(race3d, /\[glow, flame, fire, badge\]\.includes\(child\)/);
});

test('only the TV becomes immersive, and only once play starts', () => {
  assert.match(app, /const immersive = host && !\['lobby', 'waiting'\]\.includes\(s\.phase\);/);
  assert.match(app, /\$\{immersive \? 'immersive' : ''\}/);
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(sheets.slice(-5), ['/tv-immersive.css', '/answer-colours.css', '/show-moments.css', '/tv-screen.css', '/phone-simple.css']);
});

test('immersive mode hides chrome and scoreboards but keeps controls reachable', () => {
  assert.match(css, /\.immersive > \.game-top \{[^}]*opacity:0; pointer-events:none;/);
  assert.match(css, /body\.tv-chrome-visible\.playing \.immersive > \.game-top,\s*body\.playing \.immersive > \.game-top:focus-within/);
  assert.match(css, /\.immersive > :is\(\.stage-presence,\.live-lineup\) \{ display:none !important; \}/);
  assert.match(css, /\.immersive \.tv-round-hud \.tv-leaders \{ display:none !important; \}/);
  assert.match(css, /\.immersive \.tv-round \{ grid-template-columns:minmax\(0,1fr\)/);
  // Reconnection news is never hidden.
  assert.match(css, /\.immersive > \.connection-strip:not\(\[hidden\]\)/);
});

test('TV text is larger and more widely spaced', () => {
  const question = css.match(/\.immersive \.question-panel h2 \{([^}]+)\}/)[1];
  assert.match(question, /font-size:clamp\(32px,6\.4dvh,86px\)/);
  assert.match(question, /letter-spacing:\.018em/);
  const answer = css.match(/\.immersive \.question-panel \.answer \{([^}]+)\}/)[1];
  assert.match(answer, /letter-spacing:\.025em/);
});

test('3D motion is opt-out and the circuit fails safe', () => {
  // Every immersive keyframe is used only inside a no-preference block.
  const motion = css.slice(css.indexOf('(prefers-reduced-motion:no-preference)'), css.indexOf('@keyframes tv-card-swing'));
  for (const name of ['tv-card-swing', 'tv-answer-flip', 'tv-answer-pop']) assert.ok(motion.includes(name));
  assert.match(race3d, /webglcontextlost/);
  // No WebGL: the SVG track (or the phone's drawn view) remains, and that race does not try 3D again.
  assert.match(app, /catch\(\(\)=>\{ race3dLoading=undefined; race3dFailed=raceKey; \/\* No WebGL/);
  assert.match(css, /\.race-track-wrap\[data-race3d="ready"\] \.quiz-race-scene \{ visibility:hidden; \}/);
  // One persistent context per race, disposed when leaving or changing game.
  assert.ok((app.match(/disposeRace3d\(\)/g) ?? []).length >= 4);
  // The table dressing keeps one material per mesh so disposeScene() works.
  const dressing = board.slice(board.indexOf('function dressTable'), board.indexOf('export function mountTable'));
  assert.doesNotMatch(dressing, /\),\s*\[\s*\w*[Mm]aterial/, 'no material arrays');
});
