// The action replay after a race: the TV plays the recorded race back on the same 3D track.
// Shared by the server (which works out how long the replay runs, so every screen agrees when it ends)
// and the TV (which draws it). Presentation only: the recording holds what the TV showed live, nothing more.

const HOLD_START = 1200;   // a moment on the grid before the karts move
const HOLD_END = 2500;     // the finishing order held on screen at the end
const SLOW_BEFORE = 5000;  // slow motion from five seconds before the first kart crosses the line...
const SLOW_AFTER = 1500;   // ...until just after
const SLOW_RATE = .6;
const BULK_TARGET = 22000; // the rest of the race is sped up to take about this long
const TAIL_RATE = 3;

/**
 * How the replay maps its own clock onto the race clock. The race is sped up, the finish is in slow motion,
 * and the stragglers after the finish are sped up again.
 */
export function replayTimeline(replay) {
  const from = replay.from;
  const end = from + Math.max(0, replay.frames.length - 1) * replay.step;
  const finishes = replay.racers.map(racer => racer.finishedAt).filter(at => Number.isFinite(at));
  const first = finishes.length ? Math.min(...finishes) : end;
  const slowFrom = Math.min(end, Math.max(from, first - SLOW_BEFORE));
  const slowTo = Math.min(end, Math.max(slowFrom, first + SLOW_AFTER));
  const bulkRate = Math.min(8, Math.max(1, (slowFrom - from) / BULK_TARGET));
  // Each piece: race time from..to, played at a rate (race ms per replay ms).
  const pieces = [
    { from, to: from, rate: 1, hold: HOLD_START },
    { from, to: slowFrom, rate: bulkRate },
    { from: slowFrom, to: slowTo, rate: SLOW_RATE, slow: true },
    { from: slowTo, to: end, rate: TAIL_RATE },
    { from: end, to: end, rate: 1, hold: HOLD_END },
  ];
  let start = 0;
  for (const piece of pieces) {
    piece.start = start;
    piece.length = piece.hold ?? (piece.to - piece.from) / piece.rate;
    start += piece.length;
  }
  const duration = Math.round(start);
  return {
    duration, first, end,
    /** The race time to show at a moment of the replay, and whether that moment is in slow motion. */
    at(play) {
      const t = Math.max(0, Math.min(duration, play));
      const piece = pieces.find(entry => t < entry.start + entry.length) ?? pieces.at(-1);
      const into = Math.max(0, t - piece.start);
      return { at: piece.hold ? piece.from : Math.min(piece.to, piece.from + into * piece.rate), slow: Boolean(piece.slow), done: t >= duration };
    },
  };
}

/** Every kart at one moment of the recorded race, in the same shape as the live race state, so the track draws it as usual. */
export function replayRacers(replay, at) {
  const frames = replay.frames;
  if (!frames.length) return [];
  const index = Math.max(0, Math.min(frames.length - 1, (at - replay.from) / replay.step));
  const low = Math.floor(index);
  const high = Math.min(frames.length - 1, low + 1);
  const mix = index - low;
  const racers = replay.racers.map((racer, i) => {
    const a = frames[low][i] ?? [0, '', 0];
    const b = frames[high][i] ?? a;
    const finished = Number.isFinite(racer.finishedAt) && racer.finishedAt <= at;
    const distance = finished ? replay.length : a[0] + (b[0] - a[0]) * mix;
    // Speed is how far the kart went in the moment around this one: 1 is cruising.
    const before = frames[Math.max(0, low - 1)][i]?.[0] ?? a[0];
    const after = frames[Math.min(frames.length - 1, high + 1)][i]?.[0] ?? b[0];
    const span = (Math.min(frames.length - 1, high + 1) - Math.max(0, low - 1)) * replay.step / 1000;
    const speed = finished ? 1 : span > 0 ? Math.max(.3, Math.min(2.8, (after - before) / span)) : 1;
    const flags = a[2] ?? 0;
    return { id: racer.id, name: racer.name, color: racer.color, marker: racer.marker, distance: +distance.toFixed(3), speed: +speed.toFixed(3),
      finishedAt: finished ? racer.finishedAt : undefined, power: a[1] || undefined,
      fire: Boolean(flags & 1) || undefined, shield: Boolean(flags & 2) || undefined, armed: Boolean(flags & 4) || undefined };
  });
  // Places as they stood at that moment: finishers in finishing order, then the rest by distance.
  const order = [...racers].sort((p, q) => (p.finishedAt !== undefined && q.finishedAt !== undefined) ? p.finishedAt - q.finishedAt
    : p.finishedAt !== undefined ? -1 : q.finishedAt !== undefined ? 1 : q.distance - p.distance || p.marker - q.marker);
  order.forEach((racer, place) => { racer.position = place + 1; });
  return racers;
}
