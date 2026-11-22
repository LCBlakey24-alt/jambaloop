/** Server-authoritative continuous Quiz Race simulation. All times are race-clock ms. */
export const raceLengths = Object.freeze({ short: 70, medium: 120, long: 190 });
export const raceTracks = Object.freeze(['neon', 'desert', 'snow', 'jungle', 'space']);
export const raceDifficulties = Object.freeze(['easy', 'medium', 'hard', 'mixed']);
export const raceQuestionWindow = 12000;
export const raceColors = ['#1dd9be', '#ffbd43', '#ff6b71', '#8954ff', '#65aaff', '#f998d2', '#bbef7d', '#ff9a4d'];
const wait = 700;
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
  if (entries.length < 2 || entries.length > 8) throw new Error('Quiz Race needs 2 to 8 racers');
  if (!Array.isArray(questionPool) || !questionPool.length || questionPool.some(q => q.type !== 'choice' || !Array.isArray(q.options) || !Number.isInteger(q.correct))) {
    throw new Error('A valid multiple-choice question pool is required');
  }
  return {
    lastWall: now, time: 0, length: raceLengths[length], track, difficulty, paused: false,
    finished: false, firstFinish: undefined, graceEnd: undefined,
    pool: questionPool, results: [],
    racers: new Map(entries.map(([key, player], i) => [key, {
      id: player.id, name: player.name, color: raceColors[i % raceColors.length], marker: i + 1,
      distance: 0, effect: null, speed: 1, questionIndex: 0, question: null, nextAt: 3000,
      feedback: null, finishedAt: undefined, correct: 0, wrong: 0, passed: 0, timeouts: 0,
    }])),
  };
}

function issueQuestion(race, racer, at) {
  if (race.finished || racer.finishedAt !== undefined || racer.question || racer.nextAt > at || at < 3000) return false;
  const item = race.pool[racer.questionIndex % race.pool.length];
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
    for (const racer of race.racers.values()) {
      if (racer.finishedAt !== undefined) continue;
      if (racer.question && racer.question.deadline <= a) { timeoutQuestion(race, racer, racer.question.deadline); changed = true; }
      if (issueQuestion(race, racer, a)) changed = true;
      if (b <= 3000) continue;
      const from = Math.max(a, 3000);
      const old = racer.distance;
      racer.distance += raceMovement(racer, from, b);
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
    winner: race.results[0]?.id,
    racers: sorted.map((r, i) => ({
      id: r.id, name: r.name, color: r.color, marker: r.marker, distance: +r.distance.toFixed(3), speed: +r.speed.toFixed(3),
      position: i + 1, finishedAt: r.finishedAt, trail: r.feedback?.outcome ?? 'normal',
      connected: true,
    })),
    own: own && !isHost ? {
      question: own.question ? { id: own.question.id, prompt: own.question.item.prompt, options: own.question.item.options, category: own.question.item.category, deadline: own.question.deadline } : undefined,
      feedback: own.feedback && race.time < own.feedback.at + 1400 ? { ...own.feedback } : undefined,
      correct: own.correct, wrong: own.wrong, passed: own.passed, timeouts: own.timeouts,
      nextAt: own.nextAt, position: sorted.indexOf(own) + 1, distance: +own.distance.toFixed(3),
    } : undefined,
  };
}
