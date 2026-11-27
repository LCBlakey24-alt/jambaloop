// Shade: an original colour-clue game. Each round one player, the clue-giver,
// is shown a secret target square on a big board of colours. They say a
// one-word clue out loud and everyone else places one guess on their phone.
// Then a second single word and a second guess, then a third: three words,
// three guesses. Exact square scores 3, one away 2, two away 1; the
// clue-giver scores a point for every guess on the target or right beside it.
//
// All authority lives here: the target, whose turn it is, and the scores. The
// target goes only to the clue-giver's phone until the reveal. Guesses are
// public as they land, like pieces placed on a shared board.
import { randomInt } from 'node:crypto';
import { connectedPlayers } from './room-presence.js';
import { stopDeadline } from './room-clock.js';
import { SHADE_COLUMNS, SHADE_ROWS, shadeDistance, shadePoints, validSquare } from './public/shade-grid.js';

export const SHADE_MAX_ROUNDS = 8;
/** Guesses allowed in total once each one-word clue has been given. */
const allowance = { 'shade-clue': 1, 'shade-clue2': 2, 'shade-clue3': 3 };

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

const guessers = (room, party) => connectedPlayers(room).filter(key => key !== party.giver && party.seats.includes(key));
const placed = (party, key) => party.guesses.get(key) ?? [];

function startRound(room, publish) {
  const party = room.party;
  // The next clue-giver still in the room; skip anyone who has left.
  while (party.order.length && !connectedPlayers(room).includes(party.order[0])) party.order.shift();
  if (!party.order.length || connectedPlayers(room).filter(key => party.seats.includes(key)).length < 2) { room.phase = 'finished'; publish(room); return; }
  party.giver = party.order.shift();
  // Keep the target off the outer edge so every target has a full ring of near misses.
  party.target = [1 + randomInt(SHADE_COLUMNS - 2), 1 + randomInt(SHADE_ROWS - 2)];
  party.guesses = new Map();
  party.result = undefined;
  party.step++;
  room.phase = 'shade-clue';
  publish(room);
}

export function startShade(room, publish) {
  const seats = shuffle(connectedPlayers(room));
  stopDeadline(room);
  room.ends = 0;
  if (seats.length < 2) { room.phase = 'finished'; publish(room); return; }
  const order = seats.slice(0, SHADE_MAX_ROUNDS);
  room.party = { type: 'shade', seats, order: [...order], giver: undefined, target: undefined, guesses: new Map(), step: 0, earned: new Map(), result: undefined };
  room.count = order.length;
  room.index = 0;
  startRound(room, publish);
}

function score(room) {
  const party = room.party;
  const rows = [];
  let giverPoints = 0;
  for (const [key, squares] of party.guesses) {
    const player = room.players.get(key);
    if (!player) continue;
    const marks = squares.map(square => { const distance = shadeDistance(square, party.target); return { square, points: shadePoints(distance), near: distance <= 1 }; });
    const points = marks.reduce((total, mark) => total + mark.points, 0);
    giverPoints += marks.filter(mark => mark.near).length;
    player.score += points;
    if (marks.some(mark => mark.points === 3)) player.wins++;
    party.earned.set(key, (party.earned.get(key) ?? 0) + points);
    rows.push({ id: player.id, name: player.name, avatar: player.avatar, points, marks });
  }
  const giver = room.players.get(party.giver);
  if (giver) { giver.score += giverPoints; party.earned.set(party.giver, (party.earned.get(party.giver) ?? 0) + giverPoints); }
  party.result = { target: party.target, rows: rows.sort((a, b) => b.points - a.points), giverPoints };
}

/** Everyone who can guess has used this clue's guesses. */
const everyoneIn = (room, party) => { const keys = guessers(room, party); return keys.length > 0 && keys.every(key => placed(party, key).length >= allowance[room.phase]); };

export function advanceShade(room, publish) {
  const party = room.party;
  if (!party) return;
  if (room.phase === 'shade-clue') room.phase = 'shade-clue2';
  else if (room.phase === 'shade-clue2') room.phase = 'shade-clue3';
  else if (room.phase === 'shade-clue3') { score(room); room.phase = 'shade-reveal'; }
  else if (room.phase === 'shade-reveal') {
    if (room.index + 1 < room.count && party.order.length) { room.index++; return startRound(room, publish); }
    room.phase = 'finished';
  } else return;
  publish(room);
}

export function advanceShadeWhenReady(room, publish) {
  if (!allowance[room.phase] || !everyoneIn(room, room.party)) return false;
  advanceShade(room, publish);
  return true;
}

export function submitShade(room, key, data, publish) {
  const party = room.party;
  if (room.mode !== 'shade' || !party || data?.game !== room.game) return [409, 'This game has moved on.'];
  if (data.action !== 'guess' || !allowance[room.phase]) return [409, 'This action is not available now.'];
  if (data.step !== party.step) return [409, 'That round has gone.'];
  if (key === party.giver) return [403, 'You are giving the clues this round.'];
  if (!party.seats.includes(key)) return [403, 'You joined after this game began. Watch this one and play the next.'];
  if (!validSquare(data.square)) return [400, 'Choose a square on the board.'];
  const mine = placed(party, key);
  if (mine.length >= allowance[room.phase]) return [409, room.phase === 'shade-clue3' ? 'You have used all three guesses.' : 'Wait for the next word.'];
  if (mine.some(square => square[0] === data.square[0] && square[1] === data.square[1])) return [409, 'You have already guessed that square.'];
  party.guesses.set(key, [...mine, [data.square[0], data.square[1]]]);
  if (!advanceShadeWhenReady(room, publish)) publish(room);
  return [204];
}

export function publicShade(room, key) {
  const party = room.party;
  if (!party || party.type !== 'shade') return undefined;
  const seat = other => { const player = room.players.get(other); return { id: player?.id, name: player?.name, avatar: player?.avatar }; };
  const guessing = Boolean(allowance[room.phase]);
  const revealed = room.phase === 'shade-reveal' || room.phase === 'finished';
  const isGiver = key === party.giver;
  const canGuess = guessing && !isGiver && party.seats.includes(key);
  const active = guessers(room, party);
  return {
    type: 'shade', step: party.step, clue: allowance[room.phase] ?? 3,
    giver: party.giver ? seat(party.giver) : undefined, giving: isGiver,
    // The target is the clue-giver's secret until the reveal.
    target: isGiver || revealed ? party.target : undefined,
    // Guesses are placed in the open, like pieces on a shared board.
    guesses: [...party.guesses].filter(([other]) => room.players.has(other)).map(([other, squares]) => ({ ...seat(other), squares })),
    mine: canGuess || revealed ? placed(party, key) : undefined,
    left: canGuess ? allowance[room.phase] - placed(party, key).length : undefined,
    submissions: guessing ? active.filter(other => placed(party, other).length >= allowance[room.phase]).length : undefined,
    responseTarget: guessing ? active.length : undefined,
    result: revealed ? party.result : undefined,
    earned: room.phase === 'finished' ? party.earned.get(key) ?? 0 : undefined,
  };
}
