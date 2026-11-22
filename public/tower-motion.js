// Measurements are shared by the ramp meshes and the die's timed path.
export const towerOrigin = { x: 3.72, z: -.42 };
export const towerDieScale = .445;
const halfDie = .66 * towerDieScale;
const rampSurface = .057;
export const tableSurface = .188;
export const towerExit = .578;
export const towerSettle = .669;

export const towerRamps = [
  { x: .405, y: 3.23, length: .43, angle: .25, hit: .165, leave: .225, entry: .132, exit: -.187, tilt: 1.22, turn: .08, rebound: .077 },
  { x: -.405, y: 2.39, length: .43, angle: -.25, hit: .292, leave: .348, entry: -.175, exit: .187, tilt: -1.24, turn: -.08, rebound: .062 },
  { x: .405, y: 1.55, length: .43, angle: .25, hit: .414, leave: .470, entry: .157, exit: -.187, tilt: 1.22, turn: .08, rebound: .047 },
  { x: -.46, y: .61, length: 1.30, angle: .22, hit: .533, leave: towerExit, entry: -.10, exit: -1.03, tilt: .40, turn: .31, rebound: .025 },
];

const start = { x: .012, y: 4.40, angle: 0 };
const landing = { hit: .625, x: -2.65, z: .02 };
const reboundAt = .61;
const exitSpin = 2.18;
const landingAngle = towerRamps.at(-1).turn + exitSpin;
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const projection = angle => halfDie * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));

function supportedHeight(ramp, x, angle) {
  return ramp.y + ((x - ramp.x) * Math.sin(ramp.angle) + rampSurface + projection(angle - ramp.angle)) / Math.cos(ramp.angle);
}

function onRamp(ramp, t) {
  const x = mix(ramp.entry, ramp.exit, smooth(t));
  const angle = mix(ramp.tilt, ramp.turn, t);
  return { x, angle, y: supportedHeight(ramp, x, angle) + Math.sin(t * Math.PI) * ramp.rebound };
}

export const towerImpacts = [...towerRamps.map(ramp => ramp.hit), landing.hit, mix(landing.hit, towerSettle, reboundAt)];

export function towerPose(progress) {
  let from = start;
  let departed = 0;
  for (const ramp of towerRamps) {
    if (progress < ramp.hit) {
      const t = (progress - departed) / (ramp.hit - departed);
      const to = onRamp(ramp, 0);
      const x = mix(from.x, to.x, departed ? t ** 3 : smooth(t));
      const angle = mix(from.angle, to.angle, t ** (departed ? 8 : 2));
      const floor = supportedHeight(ramp, x, angle);
      return { x, z: 0, angle, y: Math.max(floor, mix(from.y, to.y, departed ? t * (.87 + .13 * t) : t * t)), blend: 0 };
    }
    if (progress < ramp.leave) {
      return { ...onRamp(ramp, (progress - ramp.hit) / (ramp.leave - ramp.hit)), z: 0, blend: 0 };
    }
    from = onRamp(ramp, 1);
    departed = ramp.leave;
  }
  if (progress < landing.hit) {
    const t = (progress - departed) / (landing.hit - departed);
    const clearance = from.y - projection(from.angle) - tableSurface;
    return {
      x: mix(from.x, landing.x, t), z: mix(0, landing.z, t), angle: from.angle + t * exitSpin,
      lift: clearance * (1 - t) + Math.sin(Math.PI * t) * .36, blend: 0,
    };
  }
  const t = Math.min(1, (progress - landing.hit) / (towerSettle - landing.hit));
  const bounce = t < reboundAt ? Math.sin(t / reboundAt * Math.PI) * .105 : Math.sin((t - reboundAt) / (1 - reboundAt) * Math.PI) * .031;
  return {
    x: mix(landing.x, -2.78, smooth(t)), z: mix(landing.z, .095, smooth(t)),
    angle: landingAngle + t * .55, lift: bounce, blend: smooth(t),
  };
}
