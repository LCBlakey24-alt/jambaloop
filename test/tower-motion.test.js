import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tableSurface, towerDieScale, towerExit, towerImpacts, towerOrigin, towerPose, towerRamps, towerSettle } from '../public/tower-motion.js';

const half = .66 * towerDieScale;
const vertices = [-half, half].flatMap(x => [-half, half].map(y => [x, y]));

function rampCorners(pose, ramp, y) {
  const { angle, x } = pose;
  return vertices.map(([dx, dy]) => {
    const localX = x - ramp.x + dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = y - ramp.y + dx * Math.sin(angle) + dy * Math.cos(angle);
    return {
      along: localX * Math.cos(ramp.angle) + localY * Math.sin(ramp.angle),
      above: localY * Math.cos(ramp.angle) - localX * Math.sin(ramp.angle),
    };
  });
}

function overlapsRamp(points, ramp) {
  const width = ramp.length / 2;
  const bottom = -.036;
  const top = .0565;
  const corners = [[-width, bottom], [-width, top], [width, bottom], [width, top]];
  // Separating axes for the ramp and the four corners of the rotated die.
  const axes = [[1, 0], [0, 1], [points[1].along - points[0].along, points[1].above - points[0].above],
    [points[2].along - points[0].along, points[2].above - points[0].above]];
  return axes.every(([u, v]) => {
    const die = points.map(point => point.along * u + point.above * v);
    const platform = corners.map(([along, above]) => along * u + above * v);
    return Math.min(...die) < Math.max(...platform) - .001 && Math.min(...platform) < Math.max(...die) - .001;
  });
}

test('the die strikes the visible face of every tower ramp', () => {
  for (const ramp of towerRamps) {
    const pose = towerPose(ramp.hit);
    const hit = rampCorners(pose, ramp, pose.y).sort((a, b) => a.above - b.above)[0];
    assert.ok(Math.abs(hit.above - .0565) < .001);
    assert.ok(Math.abs(hit.along) < ramp.length * .47);
  }
});

test('the tower roll clears the baffles, right pane and rim tiles', () => {
  for (let sample = 0; sample <= 2500; sample++) {
    const progress = sample * towerImpacts[4] / 2500;
    const pose = towerPose(progress);
    const extent = half * (Math.abs(Math.cos(pose.angle)) + Math.abs(Math.sin(pose.angle)));
    const y = pose.y ?? tableSurface + extent + pose.lift;
    if (progress < towerExit) assert.ok(pose.x + extent < .6, `Right pane at ${progress}`);
    for (const ramp of towerRamps) {
      assert.equal(overlapsRamp(rampCorners(pose, ramp, y), ramp), false, `Ramp at ${progress}`);
    }
    // The widest race tiles have the largest footprint beside the catch area.
    if (progress >= towerExit && towerOrigin.x + pose.x + extent > 1.794) {
      assert.ok(y - extent >= .373, `Race tile at ${progress}`);
    }
  }
  const settled = towerPose(towerSettle);
  assert.equal(settled.blend, 1);
  assert.ok(Math.abs(settled.lift) < 1e-7);
});
