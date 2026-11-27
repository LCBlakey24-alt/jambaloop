import { clockExpired, stopDeadline, watchDeadline } from './room-clock.js';
import { connectedPlayers, isConnected, responseTarget } from './room-presence.js';
import { randomInt } from 'node:crypto';
import { makeQuestions } from './questions.js';
import {v2Bluff} from './creative-expansion-v2.js';
import {bluffV4} from './creative-expansion-v4.js';
import {bluffV5} from './creative-expansion-v5.js';
import {afterHoursBluffs} from './after-hours.js';

import { partyModes, socialModes } from './public/game-config.js';
import { startSocialRound, advanceSocial, submitSocial, publicSocial, advanceSocialWhenReady } from './social-games.js';
import {startForkRound, advanceFork, submitFork, publicFork, advanceForkWhenReady} from './fork-game.js';
import {startSamePageRound, advanceSamePage, submitSamePage, publicSamePage, advanceSamePageWhenReady} from './same-page.js';
import {startSpotlightGame,advanceSpotlight,submitSpotlight,publicSpotlight} from './spotlight-wheel.js';
import {startBrainGame,advanceBrain,submitBrain,publicBrain} from './brain-ladder.js';
import {startTopAnswersRound,advanceTopAnswers,submitTopAnswers,publicTopAnswers} from './top-answers.js';
import {startRareRound,advanceRare,advanceRareWhenReady,submitRare,publicRare} from './rare-find.js';
import {startShade,advanceShade,advanceShadeWhenReady,submitShade,publicShade} from './shade-game.js';
import {startLook,advanceLook,expireLook,submitLook,publicLook} from './dont-look.js';
import {startCatchUp,advanceCatchUp,expireCatchUp,submitCatchUp,publicCatchUp} from './catch-up.js';
import {startBloodmoon,advanceBloodmoon,expireBloodmoon,submitBloodmoon,publicBloodmoon} from './bloodmoon.js';
import {startSketchRound,advanceSketch,expireSketch,submitSketch,publicSketch} from './sketch-sprint.js';
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
  'Name something you would not want to find in your cereal.',
  'What would make a terrible prize at a school fair?',
  'Name something you could accidentally leave on a train.',
  'What would be an odd thing to keep in a desk drawer?',
  'Name something a pirate might bring to a birthday party.',
  'What is a ridiculous reason to cancel a picnic?',
  'Name something you would be embarrassed to drop in a shop.',
  'What might a magician keep in their kitchen?',
  'Name a strange thing to put on top of a birthday cake.',
  'What would make an awkward present for your neighbour?',
  'Name a silly thing to wear to a job interview.',
  'What might be hidden inside a mysterious parcel?',
  'Name something that could interrupt a wedding ceremony.',
  'What would be an unusual object to find in a library?',
  'Name a terrible item to use as a bookmark.',
  'What might a superhero forget to take to work?',
  ...v2Bluff,
  ...bluffV4,
  ...bluffV5,
];

const random = list => list[randomInt(list.length)];

function potatoQuestion(room) {
  if (!room.party.pool.length) room.party.pool = makeQuestions('mixed', 600, room.seen, 'choice', room.includeChristmas);
  room.party.question = room.party.pool.shift();
  room.seen.add(room.party.question.prompt);
  room.party.step++;
}

function shuffleBluffRoles(keys) {
  const order=[...keys];
  for(let i=order.length-1;i>0;i--){
    const j=randomInt(i+1);
    [order[i],order[j]]=[order[j],order[i]];
  }
  return order;
}

function startBluffRound(room,publish) {
  const keys=connectedPlayers(room);
  if(keys.length<3){
    // This round cannot be fair with fewer than three active seats.
    room.phase='finished';
    publish(room);
    return;
  }
  if(room.index===0)room.bluffQueue=[];
  room.bluffQueue=(room.bluffQueue??[]).filter(key=>keys.includes(key));
  if(!room.bluffQueue.length)room.bluffQueue=shuffleBluffRoles(keys);
  const liar=room.bluffQueue.shift();
  const bank=room.afterDark?afterHoursBluffs:prompts;
  const available=bank.filter(prompt=>!room.seen.has(prompt));
  const prompt=random(available.length?available:bank);
  room.seen.add(prompt);
  room.party={liar,prompt,replies:new Map(),votes:new Map(),earned:new Map()};
  room.phase='party-write';
  publish(room);
}

function advanceBluff(room,publish) {
  const party=room.party;
  if(!party)return;
  if(room.phase==='party-write'){
    room.phase='party-vote';
  }else if(room.phase==='party-vote'){
    const totals=new Map();
    for(const vote of party.votes.values())totals.set(vote,(totals.get(vote)??0)+1);
    const liarId=room.players.get(party.liar).id;
    const liarVotes=totals.get(liarId)??0;
    party.caught=liarVotes>0&&[...totals].every(([id,count])=>id===liarId||count<liarVotes);
    party.totals=totals;
    party.correctVotes=0;
    for(const [key,vote] of party.votes){
      if(vote!==liarId)continue;
      const player=room.players.get(key);
      player.score+=100;
      party.earned.set(key,100);
      party.correctVotes++;
    }
    party.escaped=!party.caught&&party.votes.size>0&&party.replies.has(party.liar);
    if(party.escaped){
      room.players.get(party.liar).score+=100;
      party.earned.set(party.liar,(party.earned.get(party.liar)??0)+100);
    }
    room.phase='party-reveal';
  }else if(room.phase==='party-reveal'){
    if(room.index+1<room.count){
      room.index++;
      return startBluffRound(room,publish);
    }
    room.phase='finished';
  }else return;
  publish(room);
}

export function startParty(room, publish) {
  if(room.mode==='catchup')return startCatchUp(room,publish);
  if(room.mode==='dontlook')return startLook(room,publish);
  if(room.mode==='shade')return startShade(room,publish);
  if(room.mode==='bloodmoon')return startBloodmoon(room,publish);
  if(room.mode==='sketch')return startSketchRound(room,publish);
  if (room.mode === 'rare') return startRareRound(room,publish);
  if (room.mode === 'topanswers') return startTopAnswersRound(room,publish);
  if (room.mode === 'brain') return startBrainGame(room,publish);
  if (room.mode === 'spotlight') return startSpotlightGame(room,publish);
  if (room.mode === 'samepage') return startSamePageRound(room, publish);
  if (room.mode === 'tracks') return startForkRound(room,publish);
  if (room.mode === 'bluff') return startBluffRound(room,publish);
  if (socialModes.includes(room.mode)) return startSocialRound(room, publish);
  const keys = connectedPlayers(room);
  room.party = { holder: random(keys), pool: [], step: 0, passes: 0, rescues: 0 };
  potatoQuestion(room);
  room.opened = Date.now();
  room.ends = room.opened + 120000;
  room.phase = 'party-potato';
  watchDeadline(room, () => expireParty(room, publish));
  publish(room);
}

/**
 * Host-only recovery when a holder has genuinely dropped off after the reconnect grace.
 * No one can use this to bypass an active holder, paused game, or expired timer.
 */
export function rescuePotato(room, publish) {
  if(room.mode!=='potato'||room.phase!=='party-potato'||!room.party) return [409,'Hot Potato is not active.'];
  if(room.pausedAt) return [409,'Resume the timer before moving the potato.'];
  if(clockExpired(room)){expireParty(room,publish);return [409,'Hot Potato has ended.'];}
  const oldHolder=room.party.holder;
  if(isConnected(room,oldHolder))return [409,'The holder is still connected or within their reconnection grace period.'];
  const recipients=connectedPlayers(room).filter(key=>key!==oldHolder);
  if(!recipients.length)return [409,'No other connected players are available.'];
  room.party.holder=random(recipients);
  room.party.rescues=(room.party.rescues??0)+1;
  room.party.last={id:room.players.get(oldHolder).id,result:'rescue'};
  potatoQuestion(room);
  publish(room);
  return [204];
}

export function expireParty(room, publish) {
  if(room.mode==='catchup')return expireCatchUp(room,publish);
  if(room.mode==='dontlook')return expireLook(room,publish);
  if(room.mode==='bloodmoon')return expireBloodmoon(room,publish);
  if(room.mode==='sketch')return expireSketch(room,publish);
  if (room.phase === 'party-potato' && clockExpired(room)) {
    room.phase = 'finished';
    stopDeadline(room);
    publish(room);
  }
}

export function advanceParty(room, publish) {
  if(room.mode==='catchup')return advanceCatchUp(room,publish);
  if(room.mode==='dontlook')return advanceLook(room,publish);
  if(room.mode==='shade')return advanceShade(room,publish);
  if(room.mode==='bloodmoon')return advanceBloodmoon(room,publish);
  if(room.mode==='sketch')return advanceSketch(room,publish);
  if (room.mode === 'rare') return advanceRare(room,publish);
  if (room.mode === 'topanswers') return advanceTopAnswers(room,publish);
  if (room.mode === 'brain') return advanceBrain(room,publish);
  if (room.mode === 'spotlight') return advanceSpotlight(room,publish);
  if (room.mode === 'samepage') return advanceSamePage(room, publish);
  if (room.mode === 'tracks') return advanceFork(room,publish);
  if (room.mode === 'bluff') return advanceBluff(room,publish);
  if (socialModes.includes(room.mode)) return advanceSocial(room, publish);
}

export function submitParty(room, key, data, publish) {
  if(room.mode==='catchup')return submitCatchUp(room,key,data,publish);
  if(room.mode==='dontlook')return submitLook(room,key,data,publish);
  if(room.mode==='shade')return submitShade(room,key,data,publish);
  if(room.mode==='bloodmoon')return submitBloodmoon(room,key,data,publish);
  if(room.mode==='sketch')return submitSketch(room,key,data,publish);
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
  if (room.mode === 'bluff' && data.index !== room.index) return [409, 'This Bluff round has moved on.'];
  if (room.phase === 'party-write' && data.action === 'write') {
    const reply = typeof data.text === 'string' ? data.text.trim() : '';
    if (!reply || reply.length > 100) return [400, 'Enter a reply of 1 to 100 characters.'];
    if (!party.replies.has(key)) party.replies.set(key, reply);
    if (!advancePartyWhenReady(room, publish)) publish(room, true);
    return [204];
  }
  if (room.phase === 'party-vote' && data.action === 'vote') {
    const voter = room.players.get(key);
    if (data.id === voter.id || ![...room.players].some(([candidate,player]) => party.replies.has(candidate)&&player.id === data.id)) {
      return [400, 'Vote for another player who submitted a reply.'];
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
  if(room.mode==='catchup')return publicCatchUp(room,key);
  if(room.mode==='dontlook')return publicLook(room,key);
  if(room.mode==='shade')return publicShade(room,key);
  if(room.mode==='bloodmoon')return publicBloodmoon(room,key);
  if(room.mode==='sketch')return publicSketch(room,key);
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
      // Everyone in join order, so seats round the TV circle never reshuffle.
      seats: [...players.entries()].map(([seatKey, seat]) => ({ id: seat.id, name: seat.name, avatar: seat.avatar, connected: isConnected(room, seatKey) })),
      holding: key === party.holder,
      step: party.step, passes: party.passes, rescues: party.rescues??0, last: party.last,
      holderConnected: key===room.host ? isConnected(room,party.holder) : undefined,
      canRescue: key===room.host && room.phase==='party-potato' && !room.pausedAt && !clockExpired(room) && !isConnected(room,party.holder)
        && connectedPlayers(room).some(other=>other!==party.holder),
      question: room.phase === 'party-potato' && key === party.holder ? question : undefined,
    };
  }
  const writing = room.phase === 'party-write';
  const revealed = ['party-reveal','finished'].includes(room.phase);
  const player = players.get(key);
  return {
    prompt: writing ? player && key !== party.liar ? party.prompt : undefined : party.prompt,
    bluffing: writing && key === party.liar,
    wrote: party.replies.has(key), voted: party.votes.has(key),
    submissions: writing ? party.replies.size : party.votes.size,
    responseTarget: responseTarget(room, writing ? party.replies : party.votes),
    replies: writing ? undefined : [...players].filter(([id])=>party.replies.has(id)).map(([id, entry]) => ({
      id: entry.id, name: entry.name, avatar: entry.avatar, text: party.replies.get(id),
      votes: revealed ? party.totals.get(entry.id) ?? 0 : undefined,
    })),
    liarId: revealed ? players.get(party.liar).id : undefined,
    liarName: revealed ? players.get(party.liar).name : undefined,
    caught: revealed ? party.caught : undefined,
    escaped: revealed ? party.escaped : undefined,
    correctVotes: revealed ? party.correctVotes : undefined,
    ownEarned: revealed ? party.earned.get(key)??0 : undefined,
  };
}

export function advancePartyWhenReady(room, publish) {
  if (room.mode === 'catchup') return false;
  if (room.mode === 'dontlook') return false;
  if (room.mode === 'shade') return advanceShadeWhenReady(room, publish);
  if (room.mode === 'bloodmoon') return false;
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
