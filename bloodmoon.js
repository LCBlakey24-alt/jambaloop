// Bloodmoon: an original hidden-team vampire game. A few secret vampires hide
// among the villagers. Each night the vampires pick someone to bite while the
// Oracle checks one player and the Warden guards one; each day the survivors
// talk it through and vote to banish a suspect.
//
// All authority and every secret lives here. Roles, night picks, the Oracle's
// findings and ballots only ever go to the player who owns them; the TV and
// host get the same neutral view as an onlooker until the game is over.
import { randomInt } from 'node:crypto';
import { connectedPlayers, isConnected } from './room-presence.js';
import { clockExpired, stopDeadline, watchDeadline } from './room-clock.js';

export const bloodmoonTimes = Object.freeze({ roles: 45, night: 45, dawn: 0, day: 150, vote: 45, verdict: 0 });
export const BLOODMOON_MIN = 5;
export const BLOODMOON_MAX = 16;
export const ABSTAIN = 'abstain';

/** How many of each role for a table of `players`. */
export function bloodmoonRoles(players) {
  const vampires = players >= 13 ? 3 : players >= 8 ? 2 : 1;
  return { vampire: vampires, oracle: 1, warden: 1, villager: Math.max(0, players - vampires - 2) };
}

function shuffle(values, random = randomInt) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const isVampire = (party, key) => party.roles.get(key) === 'vampire';
const living = party => [...party.roles.keys()].filter(key => party.alive.has(key));
const idOf = (room, key) => room.players.get(key)?.id;
const keyOf = (room, party, id) => [...party.roles.keys()].find(key => idOf(room, key) === id);

function winner(party) {
  const alive = living(party);
  const vampires = alive.filter(key => isVampire(party, key)).length;
  if (!vampires) return 'village';
  if (vampires >= alive.length - vampires) return 'vampires';
  return undefined;
}

function enter(room, phase, seconds, publish) {
  room.phase = phase;
  stopDeadline(room);
  if (seconds) {
    room.opened = Date.now();
    room.ends = room.opened + seconds * 1000;
    watchDeadline(room, () => expireBloodmoon(room, publish));
  } else room.ends = 0;
  publish(room);
}

function finish(room, side, publish) {
  const party = room.party;
  party.winner = side;
  // A shared team win, plus a little for making it to the end.
  for (const key of party.roles.keys()) {
    const won = isVampire(party, key) === (side === 'vampires');
    const points = (won ? 300 : 0) + (won && party.alive.has(key) ? 100 : 0);
    if (points && room.players.has(key)) { room.players.get(key).score += points; party.earned.set(key, points); }
  }
  enter(room, 'finished', 0, publish);
}

export function startBloodmoon(room, publish) {
  const keys = connectedPlayers(room);
  if (keys.length < BLOODMOON_MIN) { room.phase = 'finished'; room.ends = 0; stopDeadline(room); publish(room); return; }
  const counts = bloodmoonRoles(keys.length);
  const deck = shuffle(Object.entries(counts).flatMap(([role, count]) => Array(count).fill(role)));
  const seats = shuffle(keys);
  room.party = {
    type: 'bloodmoon', roles: new Map(seats.map((key, i) => [key, deck[i]])), alive: new Set(seats),
    night: 0, ready: new Set(), picks: new Map(), ballots: new Map(), findings: new Map(), guarded: new Map(),
    fallen: [], earned: new Map(), dawn: undefined, verdict: undefined, winner: undefined, counts,
  };
  enter(room, 'blood-roles', bloodmoonTimes.roles, publish);
}

function startNight(room, publish) {
  const party = room.party;
  party.night++;
  party.picks = new Map();
  party.dawn = undefined;
  party.verdict = undefined;
  enter(room, 'blood-night', bloodmoonTimes.night, publish);
}

function resolveNight(room, publish) {
  const party = room.party;
  const alive = living(party);
  // The vampires need one clear choice; a split means nobody is bitten.
  const tally = new Map();
  for (const key of alive) if (isVampire(party, key) && party.picks.has(key)) tally.set(party.picks.get(key), (tally.get(party.picks.get(key)) ?? 0) + 1);
  const top = Math.max(0, ...tally.values());
  const leaders = [...tally].filter(([, votes]) => votes === top);
  const target = leaders.length === 1 ? leaders[0][0] : undefined;
  const warden = alive.find(key => party.roles.get(key) === 'warden');
  const guarded = warden ? party.picks.get(warden) : undefined;
  if (warden) party.guarded.set(warden, guarded);
  const oracle = alive.find(key => party.roles.get(key) === 'oracle');
  if (oracle && party.picks.has(oracle)) {
    const seen = party.picks.get(oracle);
    const list = party.findings.get(oracle) ?? [];
    list.push({ id: idOf(room, seen), name: room.players.get(seen)?.name, vampire: isVampire(party, seen), night: party.night });
    party.findings.set(oracle, list);
  }
  const victim = target && target !== guarded && party.alive.has(target) ? target : undefined;
  if (victim) {
    party.alive.delete(victim);
    party.fallen.push({ key: victim, how: 'bitten', night: party.night });
  }
  party.dawn = { victim };
  enter(room, 'blood-dawn', bloodmoonTimes.dawn, publish);
}

function resolveVote(room, publish) {
  const party = room.party;
  const tally = new Map();
  let abstained = 0;
  for (const [key, choice] of party.ballots) {
    if (!party.alive.has(key)) continue;
    if (choice === ABSTAIN) abstained++;
    else tally.set(choice, (tally.get(choice) ?? 0) + 1);
  }
  const top = Math.max(0, ...tally.values());
  const leaders = [...tally].filter(([, votes]) => votes === top);
  // A tie banishes nobody, so no one is sent out on a coin flip.
  const banished = leaders.length === 1 ? leaders[0][0] : undefined;
  if (banished) {
    party.alive.delete(banished);
    party.fallen.push({ key: banished, how: 'banished', night: party.night });
  }
  party.verdict = { banished, tied: leaders.length > 1, abstained, tally: [...tally].map(([key, votes]) => ({ key, votes })) };
  enter(room, 'blood-verdict', bloodmoonTimes.verdict, publish);
}

/** Everyone still in has acted, so the phase can close early. */
function everyoneIn(room, party, done) {
  const waiting = living(party).filter(key => !done.has(key) && isConnected(room, key));
  return done.size > 0 && !waiting.length;
}

export function advanceBloodmoon(room, publish) {
  const party = room.party;
  if (!party) return;
  if (room.phase === 'blood-roles') return startNight(room, publish);
  if (room.phase === 'blood-night') return resolveNight(room, publish);
  if (room.phase === 'blood-dawn') {
    const side = winner(party);
    if (side) return finish(room, side, publish);
    return enter(room, 'blood-day', bloodmoonTimes.day, publish);
  }
  if (room.phase === 'blood-day') { party.ballots = new Map(); return enter(room, 'blood-vote', bloodmoonTimes.vote, publish); }
  if (room.phase === 'blood-vote') return resolveVote(room, publish);
  if (room.phase === 'blood-verdict') {
    const side = winner(party);
    if (side) return finish(room, side, publish);
    return startNight(room, publish);
  }
}

export function expireBloodmoon(room, publish) {
  if (room.mode !== 'bloodmoon' || !room.party || !clockExpired(room)) return;
  if (['blood-roles', 'blood-night', 'blood-day', 'blood-vote'].includes(room.phase)) advanceBloodmoon(room, publish);
}

export function submitBloodmoon(room, key, data, publish) {
  const party = room.party;
  if (room.mode !== 'bloodmoon' || !party) return [409, 'This game has moved on.'];
  if (!party.roles.has(key)) return [403, 'You joined after the roles were dealt. Watch this one and play the next.'];
  if (data?.game !== room.game) return [409, 'This game has moved on.'];
  if (room.pausedAt) return [409, 'The game is paused. Try again when it resumes.'];
  if (clockExpired(room)) { expireBloodmoon(room, publish); return [409, 'Time is up.']; }

  if (data.action === 'ready' && room.phase === 'blood-roles') {
    party.ready.add(key);
    const waiting = [...party.roles.keys()].filter(other => !party.ready.has(other) && isConnected(room, other));
    if (!waiting.length) startNight(room, publish); else publish(room);
    return [204];
  }
  if (!party.alive.has(key)) return [403, 'You are out of the game. Watch quietly: no hints.'];

  if (data.action === 'night' && room.phase === 'blood-night') {
    if (data.night !== party.night) return [409, 'That night is over.'];
    const target = keyOf(room, party, data.id);
    if (!target || !party.alive.has(target)) return [400, 'Choose someone who is still in the game.'];
    const role = party.roles.get(key);
    if (role === 'vampire' && isVampire(party, target)) return [400, 'Choose someone who is not a vampire.'];
    if (role !== 'warden' && target === key) return [400, 'Choose someone else.'];
    if (role === 'warden' && party.night > 1 && party.guarded.get(key) === target) return [400, 'You cannot guard the same person two nights running.'];
    // Vampires may change their mind until the night closes so they can agree
    // without speaking; every other pick is final.
    if (party.picks.has(key) && role !== 'vampire') return [204];
    party.picks.set(key, target);
    if (everyoneIn(room, party, party.picks) && vampiresAgree(party)) resolveNight(room, publish); else publish(room);
    return [204];
  }
  if (data.action === 'vote' && room.phase === 'blood-vote') {
    if (data.night !== party.night) return [409, 'That vote is over.'];
    if (party.ballots.has(key)) return [204];
    if (data.id === ABSTAIN) party.ballots.set(key, ABSTAIN);
    else {
      const target = keyOf(room, party, data.id);
      if (!target || !party.alive.has(target) || target === key) return [400, 'Vote for another player who is still in, or abstain.'];
      party.ballots.set(key, target);
    }
    if (everyoneIn(room, party, party.ballots)) resolveVote(room, publish); else publish(room);
    return [204];
  }
  return [409, 'This action is no longer available.'];
}

function vampiresAgree(party) {
  const picks = living(party).filter(key => isVampire(party, key)).map(key => party.picks.get(key));
  return picks.every(pick => pick && pick === picks[0]);
}

const roleCopy = Object.freeze({
  vampire: { name: 'Vampire', team: 'vampires', brief: 'Each night, choose a villager to bite. By day, blend in and get someone else banished.' },
  oracle: { name: 'Oracle', team: 'village', brief: 'Each night, check one player and learn whether they are a vampire. Share it wisely.' },
  warden: { name: 'Warden', team: 'village', brief: 'Each night, guard one player from the vampires. Not the same person twice running.' },
  villager: { name: 'Villager', team: 'village', brief: 'Listen, question and vote. Each night, note who you suspect most.' },
});

export function publicBloodmoon(room, key) {
  const party = room.party;
  if (!party || party.type !== 'bloodmoon') return undefined;
  const over = room.phase === 'finished';
  const seat = other => { const player = room.players.get(other); return { id: player?.id, name: player?.name, avatar: player?.avatar }; };
  const fallen = new Map(party.fallen.map(row => [row.key, row]));
  const mine = party.roles.get(key);
  const done = room.phase === 'blood-roles' ? party.ready : room.phase === 'blood-night' ? party.picks : room.phase === 'blood-vote' ? party.ballots : undefined;
  const expected = room.phase === 'blood-roles' ? [...party.roles.keys()] : living(party);
  const view = {
    type: 'bloodmoon', night: party.night, counts: party.counts,
    // Join order would not leak anything, but seats are shuffled anyway.
    seats: [...party.roles.keys()].map(other => ({
      ...seat(other), alive: party.alive.has(other), connected: isConnected(room, other),
      how: fallen.get(other)?.how,
      // When they fell, for the village chronicle on the TV: public the moment it happens.
      fellNight: fallen.get(other)?.night, fellOrder: fallen.has(other) ? party.fallen.findIndex(row => row.key === other) + 1 : undefined,
      // A role is public only once its owner is out, or the game is over.
      role: fallen.has(other) || over ? party.roles.get(other) : undefined,
    })),
    aliveCount: party.alive.size,
    // Vampires not yet caught. Roles are revealed as players fall, so this is already public arithmetic.
    hiding: party.counts.vampire - party.fallen.filter(row => party.roles.get(row.key) === 'vampire').length,
    // Totals only: never which role has or has not acted.
    done: done ? [...done.keys()].filter(other => expected.includes(other)).length : undefined,
    expected: done ? expected.filter(other => done.has(other) || isConnected(room, other)).length : undefined,
    dawn: party.dawn && ['blood-dawn', 'blood-day', 'blood-vote'].includes(room.phase)
      ? { victim: party.dawn.victim ? { ...seat(party.dawn.victim), role: party.roles.get(party.dawn.victim) } : null } : undefined,
    verdict: party.verdict && room.phase === 'blood-verdict' ? {
      banished: party.verdict.banished ? { ...seat(party.verdict.banished), role: party.roles.get(party.verdict.banished) } : null,
      tied: party.verdict.tied, abstained: party.verdict.abstained,
      tally: party.verdict.tally.map(row => ({ ...seat(row.key), votes: row.votes })).sort((a, b) => b.votes - a.votes),
    } : undefined,
    winner: over ? party.winner : undefined,
    seconds: bloodmoonTimes,
  };
  if (!mine) return { ...view, watching: room.players.has(key) };
  const alive = party.alive.has(key);
  const pick = party.picks.get(key);
  const mates = mine === 'vampire' ? [...party.roles.keys()].filter(other => other !== key && isVampire(party, other)) : [];
  view.you = {
    role: mine, ...roleCopy[mine], alive, ready: party.ready.has(key),
    mates: mates.map(other => ({ ...seat(other), alive: party.alive.has(other),
      pick: room.phase === 'blood-night' && party.picks.has(other) ? idOf(room, party.picks.get(other)) : undefined })),
    pick: room.phase === 'blood-night' && pick ? idOf(room, pick) : undefined,
    barred: mine === 'warden' && party.night > 1 && room.phase === 'blood-night' ? idOf(room, party.guarded.get(key)) : undefined,
    findings: mine === 'oracle' ? party.findings.get(key) ?? [] : undefined,
    voted: room.phase === 'blood-vote' ? party.ballots.has(key) : undefined,
    ballot: room.phase === 'blood-vote' && party.ballots.has(key) ? (party.ballots.get(key) === ABSTAIN ? ABSTAIN : idOf(room, party.ballots.get(key))) : undefined,
    earned: over ? party.earned.get(key) ?? 0 : undefined,
  };
  return view;
}
