// The driver's-eye window on a phone in the symbol race: your own kart from behind, the road rushing
// towards you, and any rivals close by. Drawn on a small 2D canvas from the same race snapshot the TV uses.
// It is only a picture of public race positions: it decides nothing.
const LANES = 6;
const SEE_AHEAD = 9;   // track units of road shown ahead of the kart
const SEE_BEHIND = .7;

const skies = { neon: ['#1b2444', '#3a2a6b'], desert: ['#e9b979', '#f6dba8'], snow: ['#b9d4ee', '#e6f1fb'], jungle: ['#2c5e45', '#7fc48f'], space: ['#070a18', '#231a4a'] };
const grounds = { neon: '#16233a', desert: '#b88a52', snow: '#e6eef6', jungle: '#1f4d2e', space: '#0a1024' };

function kart(ctx, x, y, size, colour, label, flames, glow) {
  ctx.save();
  ctx.translate(x, y);
  if (flames) {
    ctx.fillStyle = flames === 'boost' ? '#8fdcff' : '#ff7a1f';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * size * .2, 0); ctx.lineTo(side * size * .2 - size * .1, 0); ctx.lineTo(side * size * .16, size * (.45 + Math.random() * .3)); ctx.closePath(); ctx.fill(); }
  }
  ctx.fillStyle = '#15171f';
  for (const side of [-1, 1]) ctx.fillRect(side * size * .5 - size * .11, -size * .3, size * .22, size * .32);
  ctx.fillStyle = colour;
  ctx.beginPath(); ctx.roundRect(-size * .42, -size * .46, size * .84, size * .4, size * .1); ctx.fill();
  ctx.fillStyle = '#f6d3b3';
  ctx.beginPath(); ctx.arc(0, -size * .58, size * .17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = colour;
  ctx.beginPath(); ctx.arc(0, -size * .62, size * .18, Math.PI, 0); ctx.fill();
  if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = Math.max(2, size * .06); ctx.beginPath(); ctx.roundRect(-size * .5, -size * .82, size, size * .9, size * .14); ctx.stroke(); }
  if (label !== undefined && size > 16) {
    ctx.fillStyle = '#0b0920'; ctx.font = `900 ${Math.round(size * .26)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(label), 0, -size * .26);
  }
  ctx.restore();
}

/** Draw one frame. `racers` are the public racers, `ownId` is this phone's racer, `ahead` is how far each has moved since the snapshot. */
export function drawCockpit(canvas, { racers, ownId, track = 'neon', ahead = () => 0, time = 0, reduced = false }) {
  const ctx = canvas?.getContext?.('2d');
  const own = racers.find(racer => racer.id === ownId);
  if (!ctx || !own) return false;
  const { width: w, height: h } = canvas;
  const horizon = h * .34;
  const distance = own.distance + ahead(own);
  const sky = skies[track] ?? skies.neon;
  const gradient = ctx.createLinearGradient(0, 0, 0, horizon);
  gradient.addColorStop(0, sky[0]); gradient.addColorStop(1, sky[1]);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = grounds[track] ?? grounds.neon; ctx.fillRect(0, horizon, w, h - horizon);
  // The road narrows to the horizon; a gentle sway stands in for the bends without making anyone queasy.
  const sway = reduced ? 0 : Math.sin(distance / 9) * w * .12;
  const edge = (depth, side) => w / 2 + sway * (1 - depth) + side * (w * .04 + w * .46 * depth);
  const row = depth => horizon + (h - horizon) * depth;
  ctx.fillStyle = '#454b5c';
  ctx.beginPath(); ctx.moveTo(edge(0, -1), row(0)); ctx.lineTo(edge(0, 1), row(0)); ctx.lineTo(edge(1, 1), row(1)); ctx.lineTo(edge(1, -1), row(1)); ctx.closePath(); ctx.fill();
  // Kerb stripes and centre dashes scroll with the distance travelled, so speed is something you can see.
  const scroll = reduced ? 0 : distance % 1;
  for (let i = 0; i < 14; i++) {
    const near = Math.pow(1 - (i - scroll) / 14, 2.2);
    const far = Math.pow(1 - (i + .5 - scroll) / 14, 2.2);
    if (near <= 0 || far < 0) continue;
    for (const side of [-1, 1]) {
      ctx.fillStyle = i % 2 ? '#f4f1ea' : '#e0364f';
      ctx.beginPath(); ctx.moveTo(edge(near, side), row(near)); ctx.lineTo(edge(near, side) + side * w * .03 * near, row(near)); ctx.lineTo(edge(far, side) + side * w * .03 * far, row(far)); ctx.lineTo(edge(far, side), row(far)); ctx.closePath(); ctx.fill();
    }
    if (i % 2) { ctx.fillStyle = '#f4d35e'; const cx = d => w / 2 + sway * (1 - d); ctx.beginPath(); ctx.moveTo(cx(near) - w * .008 * near, row(near)); ctx.lineTo(cx(near) + w * .008 * near, row(near)); ctx.lineTo(cx(far) + w * .008 * far, row(far)); ctx.lineTo(cx(far) - w * .008 * far, row(far)); ctx.closePath(); ctx.fill(); }
  }
  // Everyone within sight, furthest first so nearer karts overlap them.
  const perRow = Math.min(LANES, racers.length);
  const lane = racer => ((racer.marker - 1) % perRow - (perRow - 1) / 2) / Math.max(1, perRow);
  const seen = racers.map(racer => ({ racer, gap: racer.distance + ahead(racer) - distance }))
    .filter(entry => entry.racer.finishedAt === undefined || entry.racer === own)
    .filter(entry => entry.gap <= SEE_AHEAD && entry.gap >= -SEE_BEHIND)
    .sort((a, b) => b.gap - a.gap);
  for (const { racer, gap } of seen) {
    const mine = racer === own;
    // Your own kart sits a little up from the bottom; rivals shrink towards the horizon.
    const depth = Math.pow(1 - Math.max(0, gap + SEE_BEHIND) / (SEE_AHEAD + SEE_BEHIND), 2.2) * (gap < 0 ? 1 : .86) + (gap < 0 ? 0 : 0);
    const shown = Math.max(.02, Math.min(1, depth));
    const size = h * .46 * shown;
    // Seen from your own lane: your kart is in the middle and the others sit either side of it.
    const x = w / 2 + sway * (1 - shown) + (lane(racer) - lane(own)) * w * .8 * shown + (racer.power === 'rammed' && !reduced ? Math.sin(time / 40) * size * .12 : 0);
    const y = row(shown) - (mine ? h * .06 : 0);
    const flames = racer.power === 'boost' ? 'boost' : racer.fire || racer.speed > 1.25 ? 'fire' : undefined;
    kart(ctx, x, y, size, racer.color, racer.marker, reduced ? undefined : flames, mine ? '#ffffff' : racer.shield ? '#58b7ff' : undefined);
  }
  // Speed lines when you are flying.
  if (!reduced && own.speed > 1.3) {
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) { const a = (i * 97 + Math.floor(time / 60) * 31) % 360 / 360; const x = a * w; ctx.beginPath(); ctx.moveTo(x, horizon + (h - horizon) * .15); ctx.lineTo(w / 2 + (x - w / 2) * 1.5, h); ctx.stroke(); }
  }
  return true;
}
