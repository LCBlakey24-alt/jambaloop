// The driver's-eye window on a phone in the symbol race: a chase camera behind your own kart on the
// real circuit, with its bends and ramps, the kerbs, the crowd, and any rivals in sight.
// Drawn on a 2D canvas from the same public race snapshot the TV uses. It is only a picture: it decides nothing.
import { circuits } from './race-course.js';

const ROAD_HALF = 1.85;
const LANES = 6;
const CAMERA_BACK = 1.3;    // how far behind your kart the camera sits
const CAMERA_HEIGHT = 1.05;
const SEE = 46;             // how far down the road is drawn
const STEP = .5;

const looks = {
  neon:   { sky: ['#141b3c', '#4a2f7a'], grass: ['#16233a', '#1b2b47'], road: ['#454b5c', '#4b5264'], kerb: ['#e0364f', '#f4f1ea'], line: '#f4d35e', glow: '#ff7ad9', tree: '#2f7d5b' },
  desert: { sky: ['#f0a95f', '#fbe3b0'], grass: ['#b88a52', '#c2945b'], road: ['#3b3330', '#433a36'], kerb: ['#d6452f', '#f4f1ea'], line: '#f2d16b', glow: '#fff3c4', tree: '#4c9a58' },
  snow:   { sky: ['#8fbbe6', '#eaf4fc'], grass: ['#e6eef6', '#dbe6f1'], road: ['#39414f', '#414a59'], kerb: ['#2f7de0', '#ffffff'], line: '#ffffff', glow: '#ffffff', tree: '#2f6e62' },
  jungle: { sky: ['#1d4a37', '#8fd3a0'], grass: ['#1f4d2e', '#245735'], road: ['#2e3331', '#353b38'], kerb: ['#e0a12f', '#f4f1ea'], line: '#f4f1ea', glow: '#ffe9a8', tree: '#2fa35a' },
  space:  { sky: ['#05060f', '#2a1c58'], grass: ['#0a1024', '#0e1530'], road: ['#3a3f58', '#424863'], kerb: ['#8f6bff', '#c9b8ff'], line: '#ffd34d', glow: '#c9b8ff', tree: '#8f6bff' },
};
const crowdColours = ['#ff5d8f', '#ffd34d', '#4fd1c5', '#8f6bff', '#ff8f5a', '#f4f1ea', '#5aa9ff', '#7bd66a'];

// Each circuit, sampled once: for a distance round the lap, which way the road points and how high it is.
const laps = new Map();
function lap(course) {
  if (laps.has(course)) return laps.get(course);
  const { points } = circuits[course] ?? circuits.medium;
  const at = (i, t) => {
    const p = k => points[(i + k + points.length) % points.length];
    const [a, b, c, d] = [p(-1), p(0), p(1), p(2)];
    return [0, 1, 2].map(n => .5 * ((2 * b[n]) + (-a[n] + c[n]) * t + (2 * a[n] - 5 * b[n] + 4 * c[n] - d[n]) * t * t + (-a[n] + 3 * b[n] - 3 * c[n] + d[n]) * t * t * t));
  };
  const fine = [];
  for (let i = 0; i < points.length; i++) for (let k = 0; k < 24; k++) fine.push(at(i, k / 24));
  const samples = [];
  let total = 0;
  for (let i = 0; i < fine.length; i++) {
    const here = fine[i], next = fine[(i + 1) % fine.length];
    samples.push({ at: total, heading: Math.atan2(next[2] - here[2], next[0] - here[0]), height: here[1] });
    total += Math.hypot(next[0] - here[0], next[2] - here[2]);
  }
  const result = { samples, total };
  laps.set(course, result);
  return result;
}
function roadAt({ samples, total }, s) {
  const wrapped = ((s % total) + total) % total;
  let low = 0, high = samples.length - 1;
  while (low < high) { const mid = (low + high + 1) >> 1; if (samples[mid].at <= wrapped) low = mid; else high = mid - 1; }
  return samples[low];
}
const turn = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

function kart(ctx, x, y, size, colour, label, { flames, ring, lean = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  // Shadow on the road.
  ctx.fillStyle = '#00000055';
  ctx.beginPath(); ctx.ellipse(0, 0, size * .58, size * .12, 0, 0, Math.PI * 2); ctx.fill();
  if (flames) {
    for (const side of [-1, 1]) {
      const length = size * (.5 + Math.random() * .45);
      const fire = ctx.createLinearGradient(0, -size * .1, 0, length);
      fire.addColorStop(0, flames === 'boost' ? '#dff6ff' : '#fff2a8'); fire.addColorStop(.5, flames === 'boost' ? '#58d5ff' : '#ff8a1f'); fire.addColorStop(1, '#ff2d1600');
      ctx.fillStyle = fire;
      ctx.beginPath(); ctx.moveTo(side * size * .2 - size * .09, -size * .1); ctx.lineTo(side * size * .2 + size * .09, -size * .1); ctx.lineTo(side * size * .2, length); ctx.closePath(); ctx.fill();
    }
  }
  // Rear tyres.
  ctx.fillStyle = '#15171f';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(side * size * .47 - size * .13, -size * .34, size * .26, size * .36, size * .07); ctx.fill(); }
  // Rear wing, body and bumper.
  ctx.fillStyle = '#20232e'; ctx.fillRect(-size * .5, -size * .66, size, size * .07);
  ctx.fillStyle = colour;
  ctx.beginPath(); ctx.roundRect(-size * .5, -size * .74, size, size * .1, size * .04); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-size * .36, -size * .52, size * .72, size * .42, size * .1); ctx.fill();
  ctx.fillStyle = '#ffffff33'; ctx.beginPath(); ctx.roundRect(-size * .3, -size * .5, size * .6, size * .1, size * .05); ctx.fill();
  ctx.fillStyle = '#ff3b3b'; for (const side of [-1, 1]) ctx.fillRect(side * size * .27 - size * .06, -size * .2, size * .12, size * .05);
  // Driver: shoulders and helmet.
  ctx.fillStyle = '#2a2e3b'; ctx.beginPath(); ctx.roundRect(-size * .17, -size * .7, size * .34, size * .22, size * .06); ctx.fill();
  ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(0, -size * .8, size * .17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffffcc'; ctx.beginPath(); ctx.arc(0, -size * .8, size * .17, Math.PI * 1.15, Math.PI * 1.85); ctx.lineTo(0, -size * .8); ctx.fill();
  if (label !== undefined && size > 18) {
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.roundRect(-size * .13, -size * .42, size * .26, size * .22, size * .04); ctx.fill();
    ctx.fillStyle = '#0b0920'; ctx.font = `900 ${Math.round(size * .2)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(label), 0, -size * .3);
  }
  if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = Math.max(2, size * .05); ctx.beginPath(); ctx.ellipse(0, -size * .4, size * .7, size * .62, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

/** Draw one frame. `ahead(racer)` is how far a racer has moved since the snapshot. */
export function drawCockpit(canvas, { racers, ownId, track = 'neon', course = 'medium', length = 120, ahead = () => 0, time = 0, reduced = false }) {
  const ctx = canvas?.getContext?.('2d');
  const own = racers.find(racer => racer.id === ownId);
  if (!ctx || !own) return false;
  // Sharp on any phone: the canvas is sized to the pixels it covers.
  const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
  const wide = Math.round((canvas.clientWidth || canvas.width) * ratio), tall = Math.round((canvas.clientHeight || canvas.height) * ratio);
  if (wide && tall && (canvas.width !== wide || canvas.height !== tall)) { canvas.width = wide; canvas.height = tall; }
  const { width: w, height: h } = canvas;
  const look = looks[track] ?? looks.neon;
  const circuit = lap(course);
  const scale = circuit.total / Math.max(1, length);       // race distance to distance round this circuit
  const position = racer => (racer.distance + ahead(racer)) * scale;
  const ownAt = position(own);
  const perRow = Math.min(LANES, racers.length);
  const spacing = Math.min(.95, (ROAD_HALF * 2 - .5) / perRow);
  const lane = racer => ((racer.marker - 1) % perRow - (perRow - 1) / 2) * spacing;
  const here = roadAt(circuit, ownAt);
  const cameraAt = ownAt - CAMERA_BACK;
  const cameraX = lane(own) * .6;
  const cameraY = roadAt(circuit, cameraAt).height + CAMERA_HEIGHT;
  // The horizon dips and lifts a little with the slope of the road ahead.
  const slope = roadAt(circuit, ownAt + 4).height - here.height;
  const horizon = h * (.38 - Math.max(-.08, Math.min(.08, slope * .05)));
  const focal = h * .62;
  const project = (x, y, z) => ({ x: w / 2 + (x - cameraX) * focal / z, y: horizon + (cameraY - y) * focal / z, s: focal / z });

  // Sky, with the theme's glow on the horizon and a few far-off stands.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon + 2);
  sky.addColorStop(0, look.sky[0]); sky.addColorStop(1, look.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const bend = turn(roadAt(circuit, ownAt + 10).heading, here.heading);
  const drift = reduced ? 0 : -bend * w * .5;
  ctx.fillStyle = look.glow + '55';
  ctx.beginPath(); ctx.arc(w * .72 + drift * .3, horizon * .55, h * .11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#00000038';
  for (let i = -2; i < 7; i++) { const x = ((i * w * .23 + drift) % (w * 1.6) + w * 1.6) % (w * 1.6) - w * .3; const tallness = h * (.05 + ((i * 37) % 5 + 5) % 5 * .012); ctx.fillRect(x, horizon - tallness, w * .16, tallness + 2); }
  ctx.fillStyle = look.grass[0]; ctx.fillRect(0, horizon, w, h - horizon);

  // The road, built from far to near so nearer strips cover farther ones.
  const strips = [];
  let x = 0;
  for (let z = .7; z < SEE; z += STEP) {
    const road = roadAt(circuit, cameraAt + z);
    if (z > CAMERA_BACK) x += Math.sin(turn(road.heading, here.heading)) * STEP;
    strips.push({ z, x: reduced ? 0 : x, y: road.height, index: Math.floor((cameraAt + z) / 1.5), at: cameraAt + z });
  }
  const finishAt = circuit.total;
  for (let i = strips.length - 2; i >= 0; i--) {
    const far = strips[i + 1], near = strips[i];
    const a = project(far.x, far.y, far.z), b = project(near.x, near.y, near.z);
    if (b.y <= a.y) continue;                       // hidden behind a crest
    const band = near.index % 2;
    const quad = (left, right, colour) => { ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(a.x + left * a.s, a.y); ctx.lineTo(a.x + right * a.s, a.y); ctx.lineTo(b.x + right * b.s, b.y + 1); ctx.lineTo(b.x + left * b.s, b.y + 1); ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = look.grass[band]; ctx.fillRect(0, a.y, w, b.y - a.y + 1);
    quad(-ROAD_HALF - .3, ROAD_HALF + .3, look.kerb[band]);
    quad(-ROAD_HALF, ROAD_HALF, look.road[band]);
    if (band) quad(-.06, .06, look.line);
    // The chequered line, when the finish is in sight.
    const toFinish = finishAt - near.at;
    if (toFinish >= 0 && toFinish < STEP * 2) for (let c = 0; c < 8; c++) quad(-ROAD_HALF + c * ROAD_HALF / 4, -ROAD_HALF + (c + 1) * ROAD_HALF / 4, (c + (toFinish < STEP ? 1 : 0)) % 2 ? '#101218' : '#f4f1ea');
    // Spectators along both sides and a tree every so often, as flat cut-outs.
    if (near.z > 1.6 && near.z < 30) {
      const person = b.s * .5;
      if (person > 1.2) for (const side of [-1, 1]) for (let row = 0; row < 2; row++) {
        const seed = near.index * 7 + row * 3 + (side > 0 ? 11 : 0) + Math.floor(near.at / STEP) * 13;
        if (seed % 5 === 0) continue;
        const px = b.x + side * (ROAD_HALF + 1.4 + row * .5) * b.s;
        const hop = reduced ? 0 : Math.abs(Math.sin(time / 180 + seed)) * person * .25;
        ctx.fillStyle = crowdColours[Math.abs(seed) % crowdColours.length];
        ctx.fillRect(px - person * .22, b.y - person * .75 - hop, person * .44, person * .55);
        ctx.fillStyle = '#e8b98f'; ctx.beginPath(); ctx.arc(px, b.y - person * .92 - hop, person * .2, 0, Math.PI * 2); ctx.fill();
      }
      if (Math.floor(near.at / STEP) % 9 === 0) for (const side of [-1, 1]) {
        const px = b.x + side * (ROAD_HALF + 4.2) * b.s, size = b.s * 2.2;
        ctx.fillStyle = '#5b4636'; ctx.fillRect(px - size * .05, b.y - size * .5, size * .1, size * .5);
        ctx.fillStyle = look.tree; ctx.beginPath(); ctx.arc(px, b.y - size * .7, size * .3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // Karts in sight, farthest first. A kart sits on the road at its own distance and lane.
  const xAt = z => { let last = strips[0]; for (const strip of strips) { if (strip.z > z) break; last = strip; } return last.x; };
  const seen = racers.filter(racer => racer.finishedAt === undefined || racer === own)
    .map(racer => ({ racer, z: position(racer) - cameraAt }))
    .filter(entry => entry.z > .75 && entry.z < SEE - 2)
    .sort((p, q) => q.z - p.z);
  for (const { racer, z } of seen) {
    const mine = racer === own;
    const point = project(xAt(z) + lane(racer), roadAt(circuit, cameraAt + z).height, z);
    const size = point.s * 1.05;
    const rammed = racer.power === 'rammed' && !reduced;
    const flames = reduced ? undefined : racer.power === 'boost' ? 'boost' : racer.fire || racer.speed > 1.3 ? 'fire' : undefined;
    kart(ctx, point.x + (rammed ? Math.sin(time / 40) * size * .12 : 0), point.y, size, racer.color, racer.marker,
      { flames, ring: racer.shield ? '#58b7ff' : racer.armed ? '#58d5ff' : undefined, lean: mine && !reduced ? Math.max(-.06, Math.min(.06, bend * .3)) + (rammed ? Math.sin(time / 50) * .1 : 0) : 0 });
    if (!mine && size > 14) {
      ctx.font = `800 ${Math.max(10, Math.round(size * .26))}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#000000aa'; const text = racer.name ?? ''; const pad = size * .12; const tw = ctx.measureText(text).width;
      ctx.beginPath(); ctx.roundRect(point.x - tw / 2 - pad, point.y - size * 1.34, tw + pad * 2, size * .34, size * .1); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillText(text, point.x, point.y - size * 1.02);
    }
  }
  // Speed you can feel: streaks at the edges when you are flying, a red edge when you have been slowed.
  if (!reduced && own.speed > 1.3) {
    ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = Math.max(1, w * .004);
    for (let i = 0; i < 12; i++) { const side = i % 2 ? 1 : -1; const off = ((i * 53 + Math.floor(time / 45) * 29) % 100) / 100; const y0 = horizon + (h - horizon) * (.1 + off * .7); ctx.beginPath(); ctx.moveTo(w / 2 + side * w * (.3 + off * .12), y0); ctx.lineTo(w / 2 + side * w * (.42 + off * .2), y0 + h * .12); ctx.stroke(); }
  }
  if (own.speed < .9) { const edge = ctx.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, w * .62); edge.addColorStop(0, '#ff2a2a00'); edge.addColorStop(1, '#ff2a2a66'); ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h); }
  // A small readout: place and speed.
  const place = racers.findIndex(racer => racer === own) + 1;
  const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  ctx.font = `900 ${Math.round(h * .13)}px system-ui, sans-serif`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = '#00000088'; ctx.beginPath(); ctx.roundRect(h * .04, h * .04, h * .46, h * .2, h * .05); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillText(ordinal(place), h * .08, h * .075);
  const bar = Math.max(0, Math.min(1, (own.speed - .4) / 2.2));
  ctx.fillStyle = '#00000088'; ctx.beginPath(); ctx.roundRect(w - h * .5, h * .06, h * .46, h * .1, h * .05); ctx.fill();
  ctx.fillStyle = own.speed > 1.3 ? '#ffd34d' : own.speed < .9 ? '#ff6b71' : '#1dd9be'; ctx.beginPath(); ctx.roundRect(w - h * .5 + 3, h * .06 + 3, Math.max(6, (h * .46 - 6) * bar), h * .1 - 6, h * .04); ctx.fill();
  return true;
}
