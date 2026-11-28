import {randomInt} from 'node:crypto';
import {isConnected} from './room-presence.js';
import {comparisons} from './more-less-bank.js';
import {questionHistoryId} from './public/question-history.js';

export function startMoreLess(room, publish) {
  if (room.index === 0) {
    room.moreLessAlive = new Set(room.players.keys());
    room.moreLessUsed = new Set();
  }
  const available = comparisons.filter(question => !room.moreLessUsed.has(question.id));
  const fresh = available.filter(question => !room.seen.has(questionHistoryId('moreless:' + question.id)));
  const pool = fresh.length ? fresh : available;
  if (!pool.length) throw new Error('More or Less question bank exhausted');
  const selected = pool[randomInt(pool.length)];
  room.moreLessUsed.add(selected.id);
  room.seen.add(questionHistoryId('moreless:' + selected.id));
  const options = [...selected.options];
  if (randomInt(2)) options.reverse();
  room.party = {type:'moreless', question:{...selected, options}, votes:new Map()};
  room.phase = 'moreless-vote';
  publish(room);
}

function responseTarget(room) {
  return [...room.moreLessAlive].filter(key => room.party.votes.has(key) || isConnected(room,key)).length;
}

export function advanceMoreLess(room, publish) {
  const party = room.party;
  if (!party || party.type !== 'moreless') return false;
  if (room.phase === 'moreless-vote') {
    const [first, second] = party.question.options;
    const firstWins = party.question.direction === 'less' ? first.value < second.value : first.value > second.value;
    const correct = firstWins ? 0 : 1;
    const prior = [...room.moreLessAlive];
    const survivors = [];
    for (const key of prior) {
      const player = room.players.get(key);
      if (!player) continue;
      if (party.votes.get(key) === correct) {
        player.score += 100;
        player.wins++;
        survivors.push(key);
      }
    }
    party.correct = correct;
    party.counts = [0,1].map(index => [...party.votes.values()].filter(value => value === index).length);
    if (room.moreLessStyle === 'elimination') {
      // If everyone misses together, the last players standing share the win.
      room.moreLessAlive = new Set(survivors.length ? survivors : prior);
      party.lastRound = survivors.length <= 1;
    }
    room.phase = 'moreless-reveal';
  } else if (room.phase === 'moreless-reveal') {
    if (party.lastRound || room.index + 1 >= room.count) room.phase = 'finished';
    else {
      room.index++;
      return startMoreLess(room,publish);
    }
  } else return false;
  publish(room);
  return true;
}

export function voteMoreLess(room,key,data,publish) {
  if (!room.players.has(key) || !room.moreLessAlive?.has(key)) return [403,'You are watching this round.'];
  if (room.party?.type !== 'moreless' || room.phase !== 'moreless-vote' || data?.game !== room.game || data.index !== room.index) return [409,'This round has ended.'];
  if (data.action !== 'vote') return [409,'That action is unavailable.'];
  if (![0,1].includes(data.option)) return [400,'Choose one of the two answers.'];
  if (room.party.votes.has(key)) return [409,'Your answer is already locked.'];
  room.party.votes.set(key,data.option);
  if (room.party.votes.size === responseTarget(room)) advanceMoreLess(room,publish);
  else publish(room);
  return [204];
}

export function moreLessReady(room,publish) {
  if (room.phase !== 'moreless-vote' || !room.party.votes.size || room.party.votes.size < responseTarget(room)) return false;
  return advanceMoreLess(room,publish);
}

export function publicMoreLess(room,key) {
  const party = room.party;
  if (!party || party.type !== 'moreless') return undefined;
  const revealed = ['moreless-reveal','finished'].includes(room.phase);
  return {
    type:'moreless', id:party.question.id, historyId:questionHistoryId('moreless:' + party.question.id), prompt:party.question.prompt, options:party.question.options.map(option=>option.label),
    locked:party.votes.has(key), ownVote:party.votes.get(key), watching:!room.moreLessAlive.has(key),
    count:party.votes.size, target:responseTarget(room), style:room.moreLessStyle,
    ...(revealed ? {correct:party.correct, counts:party.counts, values:party.question.options.map(option=>option.value),
      unit:party.question.unit,source:party.question.source,lastRound:party.lastRound} : {})
  };
}
