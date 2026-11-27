// Don't Look!: an original describe-and-guess game. The guesser turns their
// back to the TV. A word appears on the TV; their team describes it without
// saying it, and taps Correct or Pass on their phones. Sixty seconds a turn.
// With four or more players the room plays as two teams taking turns; with
// two or three it plays as one group chasing a score together.
//
// All authority lives here: the clock, the word order and the score. The word
// goes to the TV and to every phone except the guesser's.
import { randomInt } from 'node:crypto';
import { connectedPlayers } from './room-presence.js';
import { clockExpired, stopDeadline, watchDeadline } from './room-clock.js';
import { lookDecks } from './dont-look-words.js';

export const LOOK_SECONDS = Math.max(5, Number(process.env.DONT_LOOK_SECONDS) || 60);
export const LOOK_MAX_TURNS = 8;
const teamNames = ['Owls', 'Foxes'];
const teamColours = ['#7ff3ff', '#fff36b'];

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
const allWords = () => Object.entries(lookDecks).flatMap(([deck, words]) => words.map(word => ({ deck, word })));

function nextWord(room) {
  const party = room.party;
  if (!party.pool.length) party.pool = shuffle(allWords().filter(entry => !room.seen?.has('look:' + entry.word)));
  if (!party.pool.length) party.pool = shuffle(allWords());
  party.card = party.pool.shift();
  room.seen?.add('look:' + party.card.word);
  party.step++;
}

export function startLook(room, publish) {
  const keys = shuffle(connectedPlayers(room));
  stopDeadline(room);
  room.ends = 0;
  if (keys.length < 2) { room.phase = 'finished'; publish(room); return; }
  const split = keys.length >= 4;
  const teams = (split ? [0, 1] : [0]).map(id => ({ id, name: split ? teamNames[id] : 'Everyone', colour: teamColours[id], keys: split ? keys.filter((_, index) => index % 2 === id) : keys }));
  // Guessers alternate between the teams, and each team gets the same number of turns.
  const each = Math.min(Math.max(...teams.map(team => team.keys.length)), Math.floor(LOOK_MAX_TURNS / teams.length));
  const turns = [];
  for (let n = 0; n < each; n++) for (const team of teams) turns.push({ team: team.id, guesser: team.keys[n % team.keys.length] });
  room.party = { type: 'dontlook', teams, turns, turn: 0, step: 0, pool: [], card: undefined, log: [], scores: teams.map(() => 0), passes: teams.map(() => 0), earned: new Map(), result: undefined };
  room.count = turns.length;
  room.index = 0;
  room.phase = 'look-ready';
  publish(room);
}

const current = party => party.turns[party.turn];

function startTurn(room, publish) {
  const party = room.party;
  party.log = [];
  nextWord(room);
  room.phase = 'look-turn';
  room.opened = Date.now();
  room.ends = room.opened + LOOK_SECONDS * 1000;
  watchDeadline(room, () => expireLook(room, publish));
  publish(room);
}

function endTurn(room, publish) {
  const party = room.party;
  if (room.phase !== 'look-turn') return;
  stopDeadline(room);
  room.ends = 0;
  const { team } = current(party);
  party.result = { team, correct: party.log.filter(entry => entry.got).length, passed: party.log.filter(entry => !entry.got).length, words: party.log, missed: party.card?.word };
  party.card = undefined;
  room.phase = 'look-result';
  publish(room);
}

export function expireLook(room, publish) {
  if (room.mode === 'dontlook' && room.phase === 'look-turn' && clockExpired(room)) endTurn(room, publish);
}

export function advanceLook(room, publish) {
  const party = room.party;
  if (!party) return;
  if (room.phase === 'look-ready') return startTurn(room, publish);
  if (room.phase === 'look-turn') return endTurn(room, publish);
  if (room.phase === 'look-result') {
    party.result = undefined;
    if (party.turn + 1 < party.turns.length) { party.turn++; room.index = party.turn; room.phase = 'look-ready'; }
    else room.phase = 'finished';
    publish(room);
  }
}

export function submitLook(room, key, data, publish) {
  const party = room.party;
  if (room.mode !== 'dontlook' || !party || data?.game !== room.game) return [409, 'This game has moved on.'];
  const { team, guesser } = current(party);
  const side = party.teams[team];
  if (data.action === 'start') {
    if (room.phase !== 'look-ready') return [409, 'This turn has already started.'];
    if (key !== guesser) return [403, 'Only the guesser starts their own turn.'];
    startTurn(room, publish);
    return [204];
  }
  if (data.action !== 'mark' || room.phase !== 'look-turn') return [409, 'This action is not available now.'];
  if (room.pausedAt) return [409, 'The game is paused.'];
  if (clockExpired(room)) { expireLook(room, publish); return [409, 'Time is up.']; }
  if (key === guesser) return [403, 'You are guessing. Your team marks the answers.'];
  if (!side.keys.includes(key)) return [403, 'It is the other team’s turn.'];
  if (data.step !== party.step) return [409, 'That word has gone.'];
  if (!['correct', 'pass'].includes(data.result)) return [400, 'Choose Correct or Pass.'];
  const got = data.result === 'correct';
  party.log.push({ word: party.card.word, got });
  if (got) {
    party.scores[team]++;
    for (const member of side.keys) { const player = room.players.get(member); if (player) { player.score += 10; party.earned.set(member, (party.earned.get(member) ?? 0) + 10); } }
    const hero = room.players.get(guesser);
    if (hero) hero.wins++;
  } else party.passes[team]++;
  nextWord(room);
  publish(room);
  return [204];
}

/** Most correct wins; level on that, fewer passes; otherwise a draw. One group has no winner to name. */
function champion(party) {
  if (party.teams.length < 2) return { champion: null };
  if (party.scores[0] !== party.scores[1]) return { champion: party.scores[0] > party.scores[1] ? 0 : 1, decidedBy: 'correct' };
  if (party.passes[0] !== party.passes[1]) return { champion: party.passes[0] < party.passes[1] ? 0 : 1, decidedBy: 'passes' };
  return { champion: null };
}

export function publicLook(room, key) {
  const party = room.party;
  if (!party || party.type !== 'dontlook') return undefined;
  const seat = other => { const player = room.players.get(other); return { id: player?.id, name: player?.name, avatar: player?.avatar }; };
  const turn = current(party);
  const playing = room.phase === 'look-turn';
  const isGuesser = key === turn.guesser;
  const mine = party.teams.find(team => team.keys.includes(key));
  return {
    type: 'dontlook', step: party.step, seconds: LOOK_SECONDS, turn: party.turn, turns: party.turns.length,
    teams: party.teams.map(team => ({ id: team.id, name: team.name, colour: team.colour, score: party.scores[team.id], passes: party.passes[team.id], members: team.keys.filter(other => room.players.has(other)).map(seat) })),
    active: turn.team, guesser: seat(turn.guesser), guessing: isGuesser, team: mine?.id,
    // The word goes to the TV and to everyone except the player guessing it.
    card: playing && !isGuesser && party.card ? { word: party.card.word, deck: party.card.deck } : undefined,
    canMark: playing && !isGuesser && mine?.id === turn.team,
    canStart: room.phase === 'look-ready' && isGuesser,
    count: playing ? party.log.filter(entry => entry.got).length : undefined,
    last: playing && party.log.length ? { got: party.log.at(-1).got, word: isGuesser && !party.log.at(-1).got ? undefined : party.log.at(-1).word } : undefined,
    result: room.phase === 'look-result' ? party.result : undefined,
    earned: room.phase === 'finished' ? party.earned.get(key) ?? 0 : undefined,
    ...(room.phase === 'finished' ? champion(party) : {}),
  };
}
