/** Server-authoritative continuous Quiz Race simulation. All times are race-clock ms. */
import {questionHistoryId} from './public/question-history.js';
export const raceLengths = Object.freeze({ short: 70, medium: 120, long: 190 });
export const raceTracks = Object.freeze(['neon', 'desert', 'snow', 'jungle', 'space']);
export const raceDifficulties = Object.freeze(['easy', 'medium', 'hard', 'mixed']);
export const raceQuestionWindow = 12000;
export const raceColors = ['#1dd9be', '#ffbd43', '#ff6b71', '#8954ff', '#65aaff', '#f998d2', '#bbef7d', '#ff9a4d', '#6fd3eb', '#f1a9ff', '#d4e87a', '#efb18c'];
const wait = 700;
// Power-ups: one boost and three rams per racer, per race. A ram only lands
// on a rival within ramRange track units; a miss costs nothing.
export const racePowers = Object.freeze({ boosts: 1, rams: 3, ramRange: 4, shields: 1, shieldTime: 6000,
  // Three right answers in a row earn a turbo: one more boost, up to maxBoosts in hand.
  turboStreak: 3, maxBoosts: 2,
  // Slipstream: tucked in close behind a rival, a car gains a little speed.
  slipFrom: .4, slipTo: 3, slipSpeed: .12,
  // Final sprint: over the last stretch of track a right answer is worth half as much again.
  sprintFrom: .85, sprintBonus: 1.5,
  boost: Object.freeze({ amount: .9, duration: 3000 }), rammed: Object.freeze({ amount: -.5, duration: 2500 }) });

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
    if (racer.boosts < 1) return { status: 409, error: 'You have used your boost.' };
    racer.boosts--;
    racer.effect = { ...racePowers.boost, start: at };
    racer.power = { kind: 'boost', at };
    return { status: 204 };
  }
  if (kind === 'ram') {
    if (racer.rams < 1) return { status: 409, error: 'You have no rams left.' };
    const target = ramTarget(race, racer);
    if (!target) return { status: 409, error: 'Nobody is close enough to ram.' };
    racer.rams--;
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
  return between(1 + effect.amount * fade, .4, 2);
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

export function createQuizRace(entries, questionPool, { length = 'medium', track = 'neon', difficulty = 'mixed' } = {}, now = 0) {
  if (!raceLengths[length] || !raceTracks.includes(track) || !raceDifficulties.includes(difficulty)) throw new Error('Invalid race setup');
  if (entries.length < 2 || entries.length > 12) throw new Error('Quiz Race needs 2 to 12 racers');
  if (!Array.isArray(questionPool) || !questionPool.length || questionPool.some(q => q.type !== 'choice' || !Array.isArray(q.options) || !Number.isInteger(q.correct))) {
    throw new Error('A valid multiple-choice question pool is required');
  }
  return {
    lastWall: now, time: 0, length: raceLengths[length], track, difficulty, paused: false,
    finished: false, firstFinish: undefined, graceEnd: undefined,
    pool: questionPool, issued: new Set(), results: [],
    racers: new Map(entries.map(([key, player], i) => [key, {
      id: player.id, name: player.name, color: raceColors[i % raceColors.length], marker: i + 1,
      distance: 0, effect: null, speed: 1, questionIndex: 0, question: null, nextAt: 3000,
      feedback: null, finishedAt: undefined, correct: 0, wrong: 0, passed: 0, timeouts: 0,
      boosts: racePowers.boosts, rams: racePowers.rams, shields: racePowers.shields, shieldUntil: 0, power: null,
      streak: 0, turbos: 0, turboAt: undefined, slip: false,
    }])),
  };
}

function issueQuestion(race, racer, at) {
  if (race.finished || racer.finishedAt !== undefined || racer.question || racer.nextAt > at || at < 3000) return false;
  const item = race.pool[(racer.questionIndex + racer.marker - 1) % race.pool.length];
  race.issued.add(item.prompt);
  racer.questionIndex++;
  racer.question = { id: racer.questionIndex, item, started: at, deadline: at + raceQuestionWindow };
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
  const effect = boostEffect(outcome, seconds);
  const sprint = outcome === 'correct' && racer.distance >= race.length * racePowers.sprintFrom;
  if (sprint) effect.amount *= racePowers.sprintBonus;
  racer.streak = outcome === 'correct' ? racer.streak + 1 : 0;
  if (racer.streak && racer.streak % racePowers.turboStreak === 0 && racer.boosts < racePowers.maxBoosts) {
    racer.boosts++;
    racer.turbos++;
    racer.turboAt = at;
  }
  racer.effect = { ...effect, start: at };
  racer.speed = raceSpeed(racer, at);
  racer[outcome === 'correct' ? 'correct' : outcome === 'wrong' ? 'wrong' : 'passed']++;
  racer.feedback = { outcome, at, answer: racer.question.item.options[racer.question.item.correct] };
  racer.question = null;
  racer.nextAt = at + wait;
  return { status: 204, outcome, amount: effect.amount };
}

function timeoutQuestion(race, racer, at) {
  racer.effect = { ...boostEffect('timeout'), start: at };
  racer.streak = 0;
  racer.timeouts++;
  racer.feedback = { outcome: 'timeout', at, answer: racer.question.item.options[racer.question.item.correct] };
  racer.question = null;
  racer.nextAt = at + wait;
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
    if (race.results.length) race.results.sort((left, right) => left.finishedAt - right.finishedAt);
    if (race.firstFinish !== undefined && (race.time >= race.graceEnd || race.results.length === race.racers.size)) {
      race.finished = true;
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
    time: race.time, length: race.length, track: race.track, difficulty: race.difficulty,
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
      connected: true,
    })),
    own: own && !isHost ? {
      question: own.question ? { id: own.question.id, historyId:questionHistoryId(own.question.item.prompt), prompt: own.question.item.prompt, options: own.question.item.options, category: own.question.item.category, deadline: own.question.deadline } : undefined,
      feedback: own.feedback && race.time < own.feedback.at + 1400 ? { ...own.feedback } : undefined,
      correct: own.correct, wrong: own.wrong, passed: own.passed, timeouts: own.timeouts,
      boosts: own.boosts, rams: own.rams, shields: own.shields, shieldLeft: Math.max(0, own.shieldUntil - race.time),
      streak: own.streak, turboEarned: own.turboAt !== undefined && race.time < own.turboAt + 3000,
      blocked: own.power?.kind === 'blocked' && race.time < own.power.at + 2500 ? own.power.by : undefined,
      sprint: own.finishedAt === undefined && own.distance >= race.length * racePowers.sprintFrom,
      ramTarget: own.finishedAt === undefined && race.time >= 3000 ? ramTarget(race, own)?.name : undefined,
      rammedBy: own.power?.kind === 'rammed' && race.time < own.power.at + 2500 ? own.power.by : undefined,
      nextAt: own.nextAt, position: sorted.indexOf(own) + 1, distance: +own.distance.toFixed(3),
    } : undefined,
  };
}
