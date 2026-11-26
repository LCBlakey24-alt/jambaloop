// Catch Up: an original two-sided quick-fire chase. One side runs: it has a
// fixed time to answer as many questions as it can and set a target. The other
// side then gets the same time and fresh questions to beat that target. Then
// the sides swap. One question at a time is shown to everyone; any player on
// the side whose turn it is may answer, and the first answer counts.
//
// All authority lives here: the timer, the question order, the answer key and
// the scores. The correct answer is only published after the side has answered.
import { randomInt } from 'node:crypto';
import { connectedPlayers } from './room-presence.js';
import { clockExpired, stopDeadline, watchDeadline } from './room-clock.js';
import { makeQuestions } from './questions.js';

export const CATCH_UP_SECONDS = Math.max(5, Number(process.env.CATCH_UP_SECONDS) || 60);
export const CATCH_UP_FREEZE_MS = 2500;
export const CATCH_UP_ROUNDS = 2;
const sideNames = ['Comets', 'Rockets'];
const sideColours = ['#ff7a59', '#4cc9f0'];

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const round = party => Math.floor(party.leg / 2);
const runner = party => round(party) % 2;
const chasing = party => party.leg % 2 === 1;
/** The side whose turn it is to answer. */
const active = party => chasing(party) ? 1 - runner(party) : runner(party);

function nextQuestion(room) {
  const party = room.party;
  if (!party.pool.length) party.pool = shuffle(makeQuestions(room.category ?? 'mixed', 400, room.seen, 'choice', room.includeChristmas));
  party.question = party.pool.shift();
  room.seen.add(party.question.prompt);
  party.step++;
}

export function startCatchUp(room, publish) {
  const keys = shuffle(connectedPlayers(room));
  if (keys.length < 2) { room.phase = 'finished'; room.ends = 0; stopDeadline(room); publish(room); return; }
  const sides = [0, 1].map(id => ({ id, name: sideNames[id], colour: sideColours[id], keys: keys.filter((_, index) => index % 2 === id) }));
  room.party = { type: 'catchup', sides, leg: 0, scores: [], count: 0, step: 0, pool: [], question: undefined, last: undefined, frozenUntil: 0, wins: [0, 0], right: [0, 0], wrong: [0, 0], earned: new Map() };
  room.count = CATCH_UP_ROUNDS;
  room.index = 0;
  room.phase = 'catch-ready';
  room.ends = 0;
  publish(room);
}

function startLeg(room, publish) {
  const party = room.party;
  party.count = 0;
  party.last = undefined;
  party.frozenUntil = 0;
  nextQuestion(room);
  room.phase = 'catch-leg';
  room.opened = Date.now();
  room.ends = room.opened + CATCH_UP_SECONDS * 1000;
  watchDeadline(room, () => expireCatchUp(room, publish));
  publish(room);
}

function endLeg(room, publish) {
  const party = room.party;
  if (room.phase !== 'catch-leg') return;
  stopDeadline(room);
  room.ends = 0;
  party.scores[party.leg] = party.count;
  party.question = undefined;
  if (!chasing(party)) {
    // The target is set; the chasers get ready.
    party.leg++;
    room.phase = 'catch-ready';
  } else {
    const target = party.scores[party.leg - 1];
    // The chasers must beat the target; matching it is not enough.
    const caught = party.count > target;
    const winner = caught ? active(party) : runner(party);
    party.wins[winner]++;
    party.result = { round: round(party), target, chase: party.count, caught, winner };
    for (const key of party.sides[winner].keys) if (room.players.has(key)) { room.players.get(key).score += 200; party.earned.set(key, (party.earned.get(key) ?? 0) + 200); }
    room.phase = 'catch-result';
  }
  publish(room);
}

export function expireCatchUp(room, publish) {
  if (room.mode === 'catchup' && room.phase === 'catch-leg' && clockExpired(room)) endLeg(room, publish);
}

export function advanceCatchUp(room, publish) {
  const party = room.party;
  if (!party) return;
  if (room.phase === 'catch-ready') return startLeg(room, publish);
  if (room.phase === 'catch-leg') return endLeg(room, publish);
  if (room.phase === 'catch-result') {
    if (round(party) + 1 < CATCH_UP_ROUNDS) {
      party.leg++;
      party.result = undefined;
      room.index = round(party);
      room.phase = 'catch-ready';
    } else room.phase = 'finished';
    publish(room);
  }
}

export function submitCatchUp(room, key, data, publish) {
  const party = room.party;
  if (room.mode !== 'catchup' || !party) return [409, 'This game has moved on.'];
  if (data?.game !== room.game) return [409, 'This game has moved on.'];
  if (data.action !== 'answer' || room.phase !== 'catch-leg') return [409, 'This action is not available now.'];
  if (room.pausedAt) return [409, 'The game is paused.'];
  if (clockExpired(room)) { expireCatchUp(room, publish); return [409, 'Time is up.']; }
  const side = party.sides.find(entry => entry.keys.includes(key));
  if (!side) return [403, 'You joined after the sides were picked. Watch this one and play the next.'];
  if (side.id !== active(party)) return [403, 'It is the other side\'s turn.'];
  if (data.step !== party.step) return [409, 'That question has gone.'];
  if (Date.now() < party.frozenUntil) return [409, 'Your side is frozen for a moment after a wrong answer.'];
  if (!Number.isInteger(data.option) || data.option < 0 || data.option >= party.question.options.length) return [400, 'Choose one of the answers.'];
  const correct = data.option === party.question.correct;
  const player = room.players.get(key);
  party.last = { correct, answer: party.question.options[party.question.correct], by: player?.name };
  party[correct ? 'right' : 'wrong'][side.id]++;
  if (correct) {
    party.count++;
    if (player) { player.score += 20; player.wins++; party.earned.set(key, (party.earned.get(key) ?? 0) + 20); }
  } else party.frozenUntil = Date.now() + CATCH_UP_FREEZE_MS;
  nextQuestion(room);
  publish(room);
  return [204];
}

/** A round each is settled on right answers across the whole game, then on fewer wrong ones. */
function champion(party) {
  for (const [decidedBy, score] of [['rounds', party.wins], ['answers', party.right], ['mistakes', party.wrong.map(count => -count)]]) {
    if (score[0] !== score[1]) return { champion: score[0] > score[1] ? 0 : 1, decidedBy, right: party.right };
  }
  return { champion: null, right: party.right };
}

export function publicCatchUp(room, key) {
  const party = room.party;
  if (!party || party.type !== 'catchup') return undefined;
  const seat = other => { const player = room.players.get(other); return { id: player?.id, name: player?.name, avatar: player?.avatar }; };
  const mine = party.sides.find(side => side.keys.includes(key));
  const turn = active(party);
  const playing = room.phase === 'catch-leg';
  // The question goes to everyone, never with its answer key.
  const question = playing && party.question ? { prompt: party.question.prompt, options: party.question.options, category: party.question.category } : undefined;
  return {
    type: 'catchup', leg: party.leg, round: round(party), rounds: CATCH_UP_ROUNDS, seconds: CATCH_UP_SECONDS,
    chasing: chasing(party), runner: runner(party), turn, step: party.step,
    sides: party.sides.map(side => ({ id: side.id, name: side.name, colour: side.colour, wins: party.wins[side.id], members: side.keys.filter(other => room.players.has(other)).map(seat) })),
    count: playing || room.phase === 'catch-result' ? party.count : undefined,
    target: chasing(party) ? party.scores[party.leg - 1] : undefined,
    question, last: party.last, frozenFor: playing ? Math.max(0, party.frozenUntil - Date.now()) : 0,
    result: room.phase === 'catch-result' || room.phase === 'finished' ? party.result : undefined,
    side: mine?.id, canAnswer: playing && mine?.id === turn,
    earned: room.phase === 'finished' ? party.earned.get(key) ?? 0 : undefined,
    ...(room.phase === 'finished' ? champion(party) : {}),
  };
}
