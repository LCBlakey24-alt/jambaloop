/** Server-authoritative continuous Quiz Race simulation. All times are race-clock ms. */
import {questionHistoryId} from './public/question-history.js';
import {randomInt} from 'node:crypto';
import {raceSymbols, symbolGridSize} from './public/race-symbols.js';
export const raceLengths = Object.freeze({ short: 70, medium: 120, long: 190 });
// A league is three races, one on each circuit, with points for every placing.
export const leagueCircuits = Object.freeze(['short', 'medium', 'long']);
export const leaguePoints = Object.freeze([10, 8, 6, 5, 4, 3, 2, 1]);
export const leaguePointsFor = position => leaguePoints[position - 1] ?? 1;
/** A fresh league for these player keys. */
export const createLeague = keys => ({ races: leagueCircuits.length, round: 0, points: new Map([...keys].map(key => [key, 0])), gained: new Map(), last: undefined });
/** Score one finished race, given the keys in finishing order. Returns true when the league is over. */
export function scoreLeagueRace(league, order) {
  league.last = [...order];
  league.gained = new Map();
  order.forEach((key, index) => {
    const gained = leaguePointsFor(index + 1);
    league.gained.set(key, gained);
    league.points.set(key, (league.points.get(key) ?? 0) + gained);
  });
  league.round++;
  return league.round >= league.races;
}
/** The table: most points first; level on points, whoever did better in the latest race is ahead. */
export function leagueStandings(league) {
  const latest = league.last ?? [];
  const placed = key => latest.indexOf(key) + 1 || 99;
  return [...league.points].map(([key, points]) => ({ key, points, gained: league.gained.get(key) ?? 0 }))
    .sort((a, b) => b.points - a.points || placed(a.key) - placed(b.key));
}
/** The track theme for a league race: the chosen theme first, then the others in order. */
export const leagueTrack = (first, round) => raceTracks[(Math.max(0, raceTracks.indexOf(first)) + round) % raceTracks.length];
export const raceTracks = Object.freeze(['neon', 'desert', 'snow', 'jungle', 'space']);
export const raceDifficulties = Object.freeze(['easy', 'medium', 'hard', 'mixed']);
export const raceQuestionWindow = 12000;
// Two kinds of race on the same tracks: 'quiz' answers questions, 'symbols' taps the matching symbol on a grid
// that reshuffles every time. A symbol takes about a second, so its numbers are smaller and its streaks longer.
export const raceStyles = Object.freeze(['quiz', 'symbols']);
export const symbolRace = Object.freeze({ window: 4000, wait: 180, turboStreak: 10, fireStreak: 15,
  correct: Object.freeze({ fast: .95, slow: .45, fastWithin: .7, slowAfter: 2.5, duration: 1700 }),
  wrong: Object.freeze({ amount: -.5, duration: 1300 }), timeout: Object.freeze({ amount: -.35, duration: 1200 }) });
const streaksFor = race => race.style === 'symbols' ? symbolRace : racePowers;

/**
 * One grid for the symbol race. Every grid is one of four kinds, picked at random: shapes, numbers, letters
 * or a mix of all three. A tile is a token ('shape:star', 'num:42', 'let:K'); no token appears twice.
 */
export const symbolKinds = Object.freeze(['shapes', 'numbers', 'letters', 'mixed']);
const symbolLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const shuffled = list => { const copy = [...list]; for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
const tokenName = token => { const [kind, value] = token.split(':'); return kind === 'shape' ? raceSymbols.find(symbol => symbol.id === value).name : kind === 'num' ? 'number ' + value : 'letter ' + value; };
export function symbolRound(size, previous, kind = symbolKinds[randomInt(symbolKinds.length)]) {
  const shapes = () => shuffled(raceSymbols.map(symbol => 'shape:' + symbol.id));
  const numbers = () => { const seen = new Set(); while (seen.size < size) seen.add(1 + randomInt(99)); return [...seen].map(value => 'num:' + value); };
  const letters = () => shuffled([...symbolLetters].map(letter => 'let:' + letter));
  const pool = kind === 'shapes' ? shapes() : kind === 'numbers' ? numbers() : kind === 'letters' ? letters()
    : shuffled([...shapes().slice(0, Math.ceil(size / 3)), ...numbers().slice(0, Math.ceil(size / 3)), ...letters().slice(0, Math.ceil(size / 3))]);
  const tiles = pool.slice(0, size);
  // Never the same target twice running, so a tap is always a fresh search.
  let correct = randomInt(size);
  if (tiles[correct] === previous) correct = (correct + 1) % size;
  const names = tiles.map(tokenName);
  return { type: 'choice', category: 'Symbols', kind, prompt: 'Tap the ' + names[correct], options: names, correct, tiles, target: tiles[correct] };
}
export const raceColors = ['#1dd9be', '#ffbd43', '#ff6b71', '#8954ff', '#65aaff', '#f998d2', '#bbef7d', '#ff9a4d', '#6fd3eb', '#f1a9ff', '#d4e87a', '#efb18c'];
const wait = 700;
// Power-ups, per racer, per race.
// Nudge (kind 'ram'): three a race. It only lands on a rival who is alongside,
// within ramRange track units, and slows them for a moment. A nudge at nobody
// is wasted: it is spent and does not come back until the next race.
// Boost: arm it before you answer. If your next answer is right, that answer
// is worth double speed; if it is wrong, passed or timed out, the boost is gone.
export const racePowers = Object.freeze({ boosts: 2, rams: 3, ramRange: 2, shields: 1, shieldTime: 6000,
  // Three right answers in a row earn a turbo: one more boost, up to maxBoosts in hand.
  turboStreak: 3, maxBoosts: 3, boostMultiplier: 2,
  // Five right in a row and the kart is on fire: flames out of the back until a miss.
  fireStreak: 5,
  // Slipstream: tucked in close behind a rival, a car gains a little speed.
  slipFrom: .4, slipTo: 3, slipSpeed: .12,
  // Final sprint: over the last stretch of track a right answer is worth half as much again.
  sprintFrom: .85, sprintBonus: 1.5,
  rammed: Object.freeze({ amount: -.45, duration: 1500 }) });

/** The rival this racer would hit right now: the nearest one within range. */
export function ramTarget(race, racer) {
  let best;
  for (const other of race.racers.values()) {
    if (other === racer || other.finishedAt !== undefined) continue;
    const gap = Math.abs(other.distance - racer.distance);
    if (gap <= racePowers.ramRange && (!best || gap < Math.abs(best.distance - racer.distance))) best = other;
  }
  return best;
}

/** Use a boost or a ram. Server-authoritative: charges, range and timing. */
export function useRacePower(race, key, kind, at = race.time) {
  const racer = race.racers.get(key);
  if (!racer) return { status: 403, error: 'Join the race to use power-ups.' };
  if (race.finished || racer.finishedAt !== undefined || at < 3000 || race.paused) return { status: 409, error: 'Power-ups work once the race is under way.' };
  if (kind === 'boost') {
    if (racer.armed) return { status: 409, error: 'Your boost is already armed. Answer the next question.' };
    if (racer.boosts < 1) return { status: 409, error: 'You have no boosts left.' };
    racer.boosts--;
    racer.armed = true;
    racer.power = { kind: 'armed', at };
    return { status: 204, armed: true };
  }
  if (kind === 'ram') {
    if (racer.rams < 1) return { status: 409, error: 'You have no nudges left.' };
    const target = ramTarget(race, racer);
    racer.rams--;
    // Nobody alongside: the nudge is wasted.
    if (!target) { racer.power = { kind: 'miss', at }; return { status: 204, missed: true }; }
    racer.power = { kind: 'ram', at };
    // A raised shield soaks up the hit; the ram is still spent.
    if (target.shieldUntil > at) {
      target.power = { kind: 'blocked', at, by: racer.name };
      return { status: 204, target: target.id, blocked: true };
    }
    target.effect = { ...racePowers.rammed, start: at };
    target.power = { kind: 'rammed', at, by: racer.name };
    return { status: 204, target: target.id };
  }
  if (kind === 'shield') {
    if (racer.shields < 1) return { status: 409, error: 'You have used your shield.' };
    racer.shields--;
    racer.shieldUntil = at + racePowers.shieldTime;
    racer.power = { kind: 'shield', at };
    return { status: 204 };
  }
  return { status: 400, error: 'Unknown power-up.' };
}
const between = (v, a, b) => Math.max(a, Math.min(b, v));

export function boostEffect(outcome, seconds = 12) {
  if (outcome === 'correct') return { amount: .25 + .5 * (1 - between(seconds / 12, 0, 1)), duration: 4000 };
  if (outcome === 'wrong') return { amount: -.45, duration: 3000 };
  if (outcome === 'pass') return { amount: -.30, duration: 2000 };
  if (outcome === 'timeout') return { amount: -.60, duration: 3000 };
  throw new Error('Unknown answer outcome');
}

export function raceSpeed(racer, at) {
  const effect = racer.effect;
  if (!effect) return 1;
  const fade = between(1 - (at - effect.start) / effect.duration, 0, 1);
  return between(1 + effect.amount * fade, .4, 2.6);
}

// Integrate the linear fading speed effect exactly across any interval.
export function raceMovement(racer, fromMs, toMs) {
  if (toMs <= fromMs) return 0;
  const effect = racer.effect;
  let distance = (toMs - fromMs) / 1000;
  if (!effect) return distance;
  const a = between(fromMs - effect.start, 0, effect.duration);
  const b = between(toMs - effect.start, 0, effect.duration);
  if (b > a) {
    const integral = (b - a) - (b * b - a * a) / (2 * effect.duration);
    distance += effect.amount * integral / 1000;
  }
  return Math.max(0, distance);
}

export function createQuizRace(entries, questionPool, { length = 'medium', track = 'neon', difficulty = 'mixed', scale = 1, style = 'quiz' } = {}, now = 0) {
  if (!raceStyles.includes(style)) throw new Error('Invalid race setup');
  if (!raceLengths[length] || !raceTracks.includes(track) || !raceDifficulties.includes(difficulty)) throw new Error('Invalid race setup');
  if (entries.length < 2 || entries.length > 12) throw new Error('Quiz Race needs 2 to 12 racers');
  if (style === 'symbols') questionPool = [];
  else if (!Array.isArray(questionPool) || !questionPool.length || questionPool.some(q => q.type !== 'choice' || !Array.isArray(q.options) || !Number.isInteger(q.correct))) {
    throw new Error('A valid multiple-choice question pool is required');
  }
  return {
    lastWall: now, time: 0, length: raceLengths[length] * (scale > 0 ? scale : 1), course: length, track, difficulty, style, paused: false,
    finished: false, firstFinish: undefined, graceEnd: undefined,
    pool: questionPool, issued: new Set(), results: [],
    racers: new Map(entries.map(([key, player], i) => [key, {
      id: player.id, name: player.name, color: raceColors[i % raceColors.length], marker: i + 1,
      distance: 0, effect: null, speed: 1, questionIndex: 0, question: null, nextAt: 3000,
      feedback: null, finishedAt: undefined, correct: 0, wrong: 0, passed: 0, timeouts: 0,
      boosts: racePowers.boosts, rams: racePowers.rams, shields: racePowers.shields, shieldUntil: 0, power: null,
      streak: 0, turbos: 0, turboAt: undefined, slip: false, armed: false,
    }])),
  };
}

function issueQuestion(race, racer, at) {
  if (race.finished || racer.finishedAt !== undefined || racer.question || racer.nextAt > at || at < 3000) return false;
  const symbols = race.style === 'symbols';
  const item = symbols ? symbolRound(symbolGridSize(race.difficulty, racer.distance / race.length), racer.lastTarget)
    : race.pool[(racer.questionIndex + racer.marker - 1) % race.pool.length];
  if (symbols) racer.lastTarget = item.target; else race.issued.add(item.prompt);
  racer.questionIndex++;
  racer.question = { id: racer.questionIndex, item, started: at, deadline: at + (symbols ? symbolRace.window : raceQuestionWindow) };
  return true;
}

export function submitRaceAnswer(race, key, { questionId, option, pass = false }, at = race.time) {
  const racer = race.racers.get(key);
  if (!racer || racer.finishedAt !== undefined || race.finished || race.paused || at < 3000) return { status: 409, error: 'This race is not accepting answers.' };
  if (!racer.question || racer.question.id !== questionId || at >= racer.question.deadline) return { status: 409, error: 'This question is no longer active.' };
  if (typeof pass !== 'boolean' || (pass && option !== undefined) || (!pass && (!Number.isInteger(option) || option < 0 || option >= racer.question.item.options.length))) {
    return { status: 400, error: 'Choose an answer or Pass.' };
  }
  const outcome = pass ? 'pass' : option === racer.question.item.correct ? 'correct' : 'wrong';
  const seconds = Math.max(0, at - racer.question.started) / 1000;
  const symbols = race.style === 'symbols';
  if (symbols && pass) return { status: 400, error: 'Tap a symbol.' };
  const effect = symbols ? symbolEffect(outcome, seconds) : boostEffect(outcome, seconds);
  const sprint = outcome === 'correct' && racer.distance >= race.length * racePowers.sprintFrom;
  if (sprint) effect.amount *= racePowers.sprintBonus;
  // An armed boost pays out on this answer only: double speed if it is right, nothing if not.
  const boosted = racer.armed && outcome === 'correct';
  if (racer.armed) { racer.armed = false; racer.power = { kind: boosted ? 'boost' : 'fizzle', at }; }
  if (boosted) effect.amount *= racePowers.boostMultiplier;
  // In the symbol race one tap is over in a moment, so an armed boost also lasts twice as long.
  if (boosted && symbols) effect.duration *= 2;
  racer.streak = outcome === 'correct' ? racer.streak + 1 : 0;
  if (racer.streak && racer.streak % streaksFor(race).turboStreak === 0 && racer.boosts < racePowers.maxBoosts) {
    racer.boosts++;
    racer.turbos++;
    racer.turboAt = at;
  }
  racer.effect = { ...effect, start: at };
  racer.speed = raceSpeed(racer, at);
  racer[outcome === 'correct' ? 'correct' : outcome === 'wrong' ? 'wrong' : 'passed']++;
  racer.feedback = { outcome, at, answer: racer.question.item.options[racer.question.item.correct] };
  racer.question = null;
  racer.nextAt = at + (symbols ? symbolRace.wait : wait);
  return { status: 204, outcome, amount: effect.amount };
}

/** Speed from one tap in the symbol race: quicker is better, a wrong square brakes. */
export function symbolEffect(outcome, seconds = 4) {
  const { correct, wrong, timeout } = symbolRace;
  if (outcome === 'correct') {
    const quick = 1 - between((seconds - correct.fastWithin) / (correct.slowAfter - correct.fastWithin), 0, 1);
    return { amount: correct.slow + (correct.fast - correct.slow) * quick, duration: correct.duration };
  }
  if (outcome === 'wrong') return { ...wrong };
  if (outcome === 'timeout') return { ...timeout };
  throw new Error('Unknown answer outcome');
}

function timeoutQuestion(race, racer, at) {
  racer.effect = { ...(race.style === 'symbols' ? symbolEffect('timeout') : boostEffect('timeout')), start: at };
  racer.streak = 0;
  if (racer.armed) { racer.armed = false; racer.power = { kind: 'fizzle', at }; }
  racer.timeouts++;
  racer.feedback = { outcome: 'timeout', at, answer: racer.question.item.options[racer.question.item.correct] };
  racer.question = null;
  racer.nextAt = at + (race.style === 'symbols' ? symbolRace.wait : wait);
}

// The action replay. While the race runs the server notes, four times a second, how far every kart has gone
// and what was happening to it (boosting, nudged, on fire, shielded). The TV plays that back afterwards.
// It holds only what the TV showed live: no questions, grids or answers.
export const replayStep = 250;
function recordRace(race, last = false) {
  if (race.time < 3000) return;
  const replay = race.replay ??= { step: replayStep, from: 3000, frames: [] };
  const due = replay.from + replay.frames.length * replay.step;
  if (race.time < due && !last) return;
  // The finishing tick may already have been sampled a moment ago: do not add the same moment twice.
  if (last && replay.sampledAt === race.time) return;
  replay.sampledAt = race.time;
  // The flags as the TV showed them live: a kart that has finished is not on fire, shielded or armed any more.
  replay.frames.push([...race.racers.values()].map(racer => {
    const racing = racer.finishedAt === undefined;
    return [
      +racer.distance.toFixed(2),
      (racer.power && race.time < racer.power.at + 1800 ? racer.power.kind : ''),
      racing ? (racer.streak >= streaksFor(race).fireStreak ? 1 : 0) + (racer.shieldUntil > race.time ? 2 : 0) + (racer.armed ? 4 : 0) : 0,
    ];
  }));
}
/** The finished race as the TV saw it, for the action replay. Undefined until the race is over. */
export function raceReplay(race) {
  if (!race?.finished || !race.replay) return undefined;
  return { step: race.replay.step, from: race.replay.from, length: race.length, course: race.course, track: race.track,
    racers: [...race.racers.values()].map(racer => ({ id: racer.id, name: racer.name, color: racer.color, marker: racer.marker, finishedAt: racer.finishedAt })),
    frames: race.replay.frames };
}

export function advanceQuizRace(race, wall = race.lastWall) {
  const elapsed = Math.max(0, wall - race.lastWall);
  race.lastWall = wall;
  if (race.finished || race.paused || elapsed === 0) return false;
  const end = race.time + Math.min(elapsed, 60000);
  let changed = false;
  while (race.time < end) {
    const a = race.time;
    const b = Math.min(end, a + 50);
    // Positions at the start of the tick decide who is in whose slipstream.
    const running = [...race.racers.values()].filter(racer => racer.finishedAt === undefined).map(racer => racer.distance);
    for (const racer of race.racers.values()) {
      if (racer.finishedAt !== undefined) continue;
      racer.slip = a >= 3000 && running.some(ahead => ahead - racer.distance >= racePowers.slipFrom && ahead - racer.distance <= racePowers.slipTo);
      if (racer.question && racer.question.deadline <= a) { timeoutQuestion(race, racer, racer.question.deadline); changed = true; }
      if (issueQuestion(race, racer, a)) changed = true;
      if (b <= 3000) continue;
      const from = Math.max(a, 3000);
      const old = racer.distance;
      racer.distance += raceMovement(racer, from, b) + (racer.slip ? racePowers.slipSpeed * (b - from) / 1000 : 0);
      racer.speed = raceSpeed(racer, b);
      if (old < race.length && racer.distance >= race.length) {
        const fraction = between((race.length - old) / Math.max(racer.distance - old, 1e-9), 0, 1);
        racer.finishedAt = from + (b - from) * fraction;
        racer.distance = race.length;
        racer.question = null;
        race.results.push({ id: racer.id, name: racer.name, finishedAt: racer.finishedAt });
        if (race.firstFinish === undefined || racer.finishedAt < race.firstFinish) { race.firstFinish = racer.finishedAt; race.graceEnd = racer.finishedAt + 10000; }
        changed = true;
      }
    }
    race.time = b;
    recordRace(race);
    if (race.results.length) race.results.sort((left, right) => left.finishedAt - right.finishedAt);
    if (race.firstFinish !== undefined && (race.time >= race.graceEnd || race.results.length === race.racers.size)) {
      race.finished = true;
      recordRace(race, true);
      race.results.sort((left, right) => left.finishedAt - right.finishedAt);
      changed = true;
      break;
    }
  }
  return changed;
}

export function setRacePaused(race, paused, now) {
  if (race.finished) return false;
  advanceQuizRace(race, now);
  race.paused = paused;
  race.lastWall = now;
  return true;
}

export function racePlacings(race) {
  return [...race.racers.values()].sort((a, b) => {
    if (a.finishedAt !== undefined && b.finishedAt !== undefined) return a.finishedAt - b.finishedAt;
    if (a.finishedAt !== undefined) return -1;
    if (b.finishedAt !== undefined) return 1;
    return b.distance - a.distance || a.marker - b.marker;
  });
}

export function publicRaceState(race, key, isHost) {
  const sorted = racePlacings(race);
  const own = race.racers.get(key);
  return {
    time: race.time, length: race.length, course: race.course, track: race.track, difficulty: race.difficulty, style: race.style,
    countdown: Math.max(0, 3000 - race.time), paused: race.paused, finished: race.finished,
    // The leader is into the last stretch: right answers are worth more for anyone in it.
    finalSprint: !race.finished && sorted[0]?.distance >= race.length * racePowers.sprintFrom,
    winner: race.results[0]?.id,
    racers: sorted.map((r, i) => ({
      id: r.id, name: r.name, color: r.color, marker: r.marker, distance: +r.distance.toFixed(3), speed: +r.speed.toFixed(3),
      position: i + 1, finishedAt: r.finishedAt, trail: r.feedback?.outcome ?? 'normal',
      power: r.power && race.time < r.power.at + 1800 ? r.power.kind : undefined,
      shield: r.shieldUntil > race.time || undefined, slip: (r.slip && r.finishedAt === undefined) || undefined,
      turbo: (r.turboAt !== undefined && race.time < r.turboAt + 2500) || undefined,
      // On fire: five or more right in a row. Public, like the flames on the TV.
      fire: (r.streak >= streaksFor(race).fireStreak && r.finishedAt === undefined) || undefined,
      armed: (r.armed && r.finishedAt === undefined) || undefined,
      connected: true,
    })),
    own: own && !isHost ? {
      question: own.question ? { id: own.question.id, historyId:questionHistoryId(own.question.item.prompt), prompt: own.question.item.prompt, options: own.question.item.options, category: own.question.item.category, deadline: own.question.deadline,
        // The symbol race: which symbol to find and the grid to find it on. Which square is right is never sent.
        symbols: own.question.item.tiles ? { target: own.question.item.target, tiles: own.question.item.tiles } : undefined } : undefined,
      feedback: own.feedback && race.time < own.feedback.at + 1400 ? { ...own.feedback } : undefined,
      correct: own.correct, wrong: own.wrong, passed: own.passed, timeouts: own.timeouts,
      boosts: own.boosts, rams: own.rams, shields: own.shields, shieldLeft: Math.max(0, own.shieldUntil - race.time),
      armed: own.armed, missed: own.power?.kind === 'miss' && race.time < own.power.at + 2500,
      fizzled: own.power?.kind === 'fizzle' && race.time < own.power.at + 2500, onFire: own.streak >= streaksFor(race).fireStreak, turboStreak: streaksFor(race).turboStreak,
      streak: own.streak, turboEarned: own.turboAt !== undefined && race.time < own.turboAt + 3000,
      blocked: own.power?.kind === 'blocked' && race.time < own.power.at + 2500 ? own.power.by : undefined,
      sprint: own.finishedAt === undefined && own.distance >= race.length * racePowers.sprintFrom,
      ramTarget: own.finishedAt === undefined && race.time >= 3000 ? ramTarget(race, own)?.name : undefined,
      rammedBy: own.power?.kind === 'rammed' && race.time < own.power.at + 2500 ? own.power.by : undefined,
      nextAt: own.nextAt, position: sorted.indexOf(own) + 1, distance: +own.distance.toFixed(3),
    } : undefined,
  };
}
