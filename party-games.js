import { clockExpired, stopDeadline, watchDeadline } from './room-clock.js';
import { connectedPlayers, responseTarget } from './room-presence.js';
import { randomInt } from 'node:crypto';
import { makeQuestions } from './questions.js';

import { partyModes, socialModes } from './public/game-config.js';
import { startSocialRound, advanceSocial, submitSocial, publicSocial, advanceSocialWhenReady } from './social-games.js';
import {startForkRound, advanceFork, submitFork, publicFork, advanceForkWhenReady} from './fork-game.js';
import {startSamePageRound, advanceSamePage, submitSamePage, publicSamePage, advanceSamePageWhenReady} from './same-page.js';
import {startSpotlightGame,advanceSpotlight,submitSpotlight,publicSpotlight} from './spotlight-wheel.js';
import {startBrainGame,advanceBrain,submitBrain,publicBrain} from './brain-ladder.js';
import {startTopAnswersRound,advanceTopAnswers,submitTopAnswers,publicTopAnswers} from './top-answers.js';
import {startRareRound,advanceRare,advanceRareWhenReady,submitRare,publicRare} from './rare-find.js';
export { partyModes };
const prompts = [
  'Name something you might find under a sofa.',
  'Name a strange thing to bring to a picnic.',
  'What would you buy first if you won a small lottery prize?',
  'Name something you would hate to drop in a swimming pool.',
  'Name a food that is difficult to eat neatly.',
  'What might you find at the bottom of a school bag?',
  'Name something people forget to pack for a holiday.',
  'What would make a bad alarm clock sound?',
  'Name something you might borrow from a neighbour.',
  'Name an awkward thing to carry on a bus.',
  'What would you bring to a power cut?',
  'Name something a dog might steal.',
];

const random = list => list[randomInt(list.length)];

function potatoQuestion(room) {
  if (!room.party.pool.length) room.party.pool = makeQuestions('mixed', 600, room.seen, 'choice', room.includeChristmas);
  room.party.question = room.party.pool.shift();
  room.seen.add(room.party.question.prompt);
  room.party.step++;
}

export function startParty(room, publish) {
  if (room.mode === 'rare') return startRareRound(room,publish);
  if (room.mode === 'topanswers') return startTopAnswersRound(room,publish);
  if (room.mode === 'brain') return startBrainGame(room,publish);
  if (room.mode === 'spotlight') return startSpotlightGame(room,publish);
  if (room.mode === 'samepage') return startSamePageRound(room, publish);
  if (room.mode === 'tracks') return startForkRound(room,publish);
  if (socialModes.includes(room.mode)) return startSocialRound(room, publish);
  const keys = connectedPlayers(room);
  if (room.mode === 'bluff') {
    const available = prompts.filter(prompt => !room.seen.has(prompt));
    const prompt = random(available.length ? available : prompts);
    room.seen.add(prompt);
    room.party = { liar: random(keys), prompt, replies: new Map(), votes: new Map() };
    room.phase = 'party-write';
  } else {
    room.party = { holder: random(keys), pool: [], step: 0, passes: 0 };
    potatoQuestion(room);
    room.opened = Date.now();
    room.ends = room.opened + 120000;
    room.phase = 'party-potato';
    watchDeadline(room, () => expireParty(room, publish));
  }
  publish(room);
}

export function expireParty(room, publish) {
  if (room.phase === 'party-potato' && clockExpired(room)) {
    room.phase = 'finished';
    stopDeadline(room);
    publish(room);
  }
}

export function advanceParty(room, publish) {
  if (room.mode === 'rare') return advanceRare(room,publish);
  if (room.mode === 'topanswers') return advanceTopAnswers(room,publish);
  if (room.mode === 'brain') return advanceBrain(room,publish);
  if (room.mode === 'spotlight') return advanceSpotlight(room,publish);
  if (room.mode === 'samepage') return advanceSamePage(room, publish);
  if (room.mode === 'tracks') return advanceFork(room,publish);
  if (socialModes.includes(room.mode)) return advanceSocial(room, publish);
  if (room.phase === 'party-write') room.phase = 'party-vote';
  else if (room.phase === 'party-vote') {
    const totals = new Map();
    for (const vote of room.party.votes.values()) totals.set(vote, (totals.get(vote) ?? 0) + 1);
    const liarId = room.players.get(room.party.liar).id;
    const liarVotes = totals.get(liarId) ?? 0;
    room.party.caught = liarVotes > 0 && [...totals].every(([id, count]) => id === liarId || count < liarVotes);
    room.party.totals = totals;
    room.phase = 'finished';
  } else return;
  publish(room);
}

export function submitParty(room, key, data, publish) {
  expireParty(room, publish);
  if (room.mode === 'rare') {
    if (data?.game !== room.game) return [409,'This game has moved on.'];
    return submitRare(room,key,data,publish);
  }
  if (room.mode === 'tracks') {
    if (data?.game !== room.game) return [409,'This game has moved on.'];
    return submitFork(room,key,data,publish);
  }
  if (!room.players.has(key)) return [403, 'Join as a player to take a turn.'];
  if (data?.game !== room.game) return [409, 'This game has moved on.'];
  if (room.mode === 'topanswers') return submitTopAnswers(room,key,data,publish);
  if (room.mode === 'brain') return submitBrain(room,key,data,publish);
  if (room.mode === 'spotlight') return submitSpotlight(room,key,data,publish);
  if (room.mode === 'samepage') return submitSamePage(room, key, data, publish);
  if (socialModes.includes(room.mode) && room.party) return submitSocial(room, key, data, publish);
  const party = room.party;
  if (room.phase === 'party-write' && data.action === 'write') {
    const reply = typeof data.text === 'string' ? data.text.trim() : '';
    if (!reply || reply.length > 100) return [400, 'Enter a reply of 1 to 100 characters.'];
    if (!party.replies.has(key)) party.replies.set(key, reply);
    if (!advancePartyWhenReady(room, publish)) publish(room, true);
    return [204];
  }
  if (room.phase === 'party-vote' && data.action === 'vote') {
    const voter = room.players.get(key);
    if (data.id === voter.id || ![...room.players.values()].some(player => player.id === data.id)) {
      return [400, 'Vote for another player in the room.'];
    }
    if (!party.votes.has(key)) party.votes.set(key, data.id);
    if (!advancePartyWhenReady(room, publish)) publish(room, true);
    return [204];
  }
  if (room.phase === 'party-potato' && ['skip', 'answer'].includes(data.action)) {
    if (room.pausedAt) return [409, 'The timer is paused. Try again when it resumes.'];
    if (key !== party.holder || data.step !== party.step) return [409, 'The potato or question has moved on.'];
    if (data.action === 'answer' && (!Number.isInteger(data.option) || data.option < 0 || data.option >= party.question.options.length)) {
      return [400, 'Choose one of the answers.'];
    }
    if (data.action === 'answer' && data.option === party.question.correct) {
      const recipients = connectedPlayers(room).filter(other => other !== key);
      if (recipients.length) {
        party.holder = random(recipients);
        party.passes++;
      }
      party.last = { id: room.players.get(key).id, result: recipients.length ? 'pass' : 'alone' };
    } else party.last = { id: room.players.get(key).id, result: data.action === 'skip' ? 'skip' : 'miss' };
    potatoQuestion(room);
    publish(room);
    return [204];
  }
  return [409, 'This action is no longer available.'];
}

export function publicParty(room, key) {
  if (room.mode === 'rare') return publicRare(room,key);
  if (room.mode === 'topanswers') return publicTopAnswers(room,key);
  if (room.mode === 'brain') return publicBrain(room,key);
  if (room.mode === 'spotlight') return publicSpotlight(room,key);
  if (room.mode === 'samepage') return publicSamePage(room, key);
  if (room.mode === 'tracks') return publicFork(room,key);
  const party = room.party;
  if (!party) return;
  if (socialModes.includes(room.mode)) return publicSocial(room, key);
  const players = room.players;
  if (room.mode === 'potato') {
    const holder = players.get(party.holder);
    const { correct, ...question } = party.question;
    return {
      holder: { id: holder.id, name: holder.name, avatar: holder.avatar },
      holding: key === party.holder,
      step: party.step, passes: party.passes, last: party.last,
      question: room.phase === 'party-potato' && key === party.holder ? question : undefined,
    };
  }
  const writing = room.phase === 'party-write';
  const finished = room.phase === 'finished';
  const player = players.get(key);
  return {
    prompt: writing ? player && key !== party.liar ? party.prompt : undefined : party.prompt,
    bluffing: writing && key === party.liar,
    wrote: party.replies.has(key), voted: party.votes.has(key),
    submissions: writing ? party.replies.size : party.votes.size,
    responseTarget: responseTarget(room, writing ? party.replies : party.votes),
    replies: writing ? undefined : [...players].map(([id, entry]) => ({
      id: entry.id, name: entry.name, avatar: entry.avatar, text: party.replies.get(id),
      votes: finished ? party.totals.get(entry.id) ?? 0 : undefined,
    })),
    liarId: finished ? players.get(party.liar).id : undefined,
    liarName: finished ? players.get(party.liar).name : undefined,
    caught: finished ? party.caught : undefined,
  };
}

export function advancePartyWhenReady(room, publish) {
  if (room.mode === 'rare') return advanceRareWhenReady(room,publish);
  if (room.mode === 'samepage') return advanceSamePageWhenReady(room, publish);
  if (room.mode === 'tracks') return advanceForkWhenReady(room,publish);
  if (!['party-write', 'party-vote'].includes(room.phase)) return false;
  if (socialModes.includes(room.mode)) return advanceSocialWhenReady(room, publish);
  const party = room.party;
  const submissions = room.phase === 'party-write' ? party.replies : party.votes;
  const target = responseTarget(room, submissions);
  if (!submissions.size || submissions.size !== target) return false;
  advanceParty(room, publish);
  return true;
}
