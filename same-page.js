import { randomInt } from 'node:crypto';
import { isConnected } from './room-presence.js';
import { questionHistoryId } from './public/question-history.js';

// Original creative prompts. No survey statistics or factual claims are required.
export const samePagePrompts = Object.freeze([
  'Name something you would bring to a deserted island.',
  'Name a food that is difficult to eat without making a mess.',
  'Name a superhero power that would make school easier.',
  'Name something people always forget before going on holiday.',
  'Name an animal you would NOT want as your driving instructor.',
  'Name something you might find behind a sofa.',
  'Name a terrible name for a new rollercoaster.',
  'Name something you would never put on a pizza.',
  'Name a job an octopus might be surprisingly good at.',
  'Name a word that describes a rainy Monday.',
  'Name a film character you would want on your quiz team.',
  'Name something you would take into space.',
  'Name an everyday object that should have a warning label.',
  'Name something that would make a strange wedding present.',
  'Name something you would hate to find in your shoe.',
  'Name a snack that disappears quickly at a party.',
  'Name a place you would not want to be stuck in a queue.',
  'Name a subject you wish you could learn in five minutes.',
  'Name an animal that would be funny wearing sunglasses.',
  'Name a celebrity you would invite to a games night.',
  'Name something you would build if money were no object.',
  'Name a food that everyone at a picnic would recognise.',
  'Name something a wizard would use instead of a smartphone.',
  'Name an animal that would make a terrible secret agent.',
  'Name something you might accidentally leave on a train.',
  'Name a job you would be terrible at without any training.',
  'Name a famous fictional villain you would not trust with a pet.',
  'Name a sport that would be funnier played underwater.',
  'Name something that belongs in a time capsule.',
  'Name a household task that should be an Olympic event.',
  'Name an object you would want to be able to teleport.',
  'Name something you could never fit inside a backpack.',
  'Name the first thing you would buy with a million pounds.',
  'Name a song people often sing at celebrations.',
  'Name something you would never want to hear from your dentist.',
  'Name something you would find at a beach.',
  'Name a magical creature that could run a shop.',
  'Name a game you could play while waiting for a bus.',
  'Name a colour that would make a terrible camouflage outfit.',
  'Name something a penguin might pack for a holiday.',
  'Name something a robot would find confusing about humans.',
  'Name a funny reason for missing a meeting.',
  'Name something you would put in the world’s strangest museum.',
  'Name an animal that would be a brilliant basketball mascot.',
  'Name something you would invent to improve a long car journey.',
  'Name a food you could happily eat for breakfast every day.',
  'Name a place you would visit if you could travel anywhere instantly.',
  'Name something a dragon might collect instead of treasure.',
  'Name something you might shout after winning a board game.',
  'Name a household appliance that would make a funny pet name.',
  'Name an item you would hide in a treasure chest.',
  'Name a vegetable that could star in its own cartoon.',
  'Name something you would wear to a fancy-dress party.',
  'Name the worst possible prize on a quiz show.',
  'Name something you would expect to see at a carnival.',
  'Name something that might make a haunted house less frightening.'
]);

export function normaliseSamePageAnswer(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-GB')
    .replace(/&/g, ' and ')
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:a|an|the) /, '');
}

function choosePrompt(room) {
  const fresh = samePagePrompts.filter(prompt => !room.seen.has('samepage:' + prompt) && !room.seen.has(questionHistoryId(prompt)));
  const pool = fresh.length ? fresh : samePagePrompts;
  const prompt = pool[randomInt(pool.length)];
  room.seen.add('samepage:' + prompt);
  return prompt;
}

export function startSamePageRound(room, publish) {
  room.party = { type: 'samepage', prompt: choosePrompt(room), entries: new Map(), groups: null };
  room.phase = 'party-write';
  publish(room);
}

function calculateResults(room) {
  const groups = new Map();
  for (const [key, answer] of room.party.entries) {
    const normalised = normaliseSamePageAnswer(answer);
    const group = groups.get(normalised) ?? { key: normalised, answer, members: [] };
    group.members.push(key);
    groups.set(normalised, group);
  }
  room.party.groups = [...groups.values()]
    .map(group => ({...group, points: 100 * (group.members.length - 1)}))
    .sort((a, b) => b.members.length - a.members.length || a.answer.localeCompare(b.answer));
  for (const group of room.party.groups) {
    for (const key of group.members) {
      const player = room.players.get(key);
      if (!player) continue;
      player.score += group.points;
      if (group.points > 0) player.wins++;
    }
  }
}

export function advanceSamePage(room, publish) {
  if (room.phase === 'party-write') {
    calculateResults(room);
    room.phase = 'party-reveal';
  } else if (room.phase === 'party-reveal') {
    if (room.index + 1 < room.count) {
      room.index++;
      return startSamePageRound(room, publish);
    }
    room.phase = 'finished';
  } else return false;
  publish(room);
  return true;
}

export function submitSamePage(room, key, data, publish) {
  if (room.phase !== 'party-write' || data.index !== room.index)
    return [409, 'This answer round has ended.'];
  if (!room.players.has(key)) return [403, 'Join this game to answer.'];
  if (room.party.entries.has(key)) return [409, 'Your answer is already locked.'];
  if (data.action !== 'write' || typeof data.text !== 'string')
    return [400, 'Type an answer to submit.'];
  const answer = data.text.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!answer || answer.length > 60 || /[\u0000-\u001f\u007f]/.test(answer))
    return [400, 'Enter an answer of 1 to 60 characters.'];
  if (!normaliseSamePageAnswer(answer))
    return [400, 'Enter an answer containing letters or numbers.'];
  room.party.entries.set(key, answer);
  if (!advanceSamePageWhenReady(room, publish)) publish(room, true);
  return [204];
}

export function advanceSamePageWhenReady(room, publish) {
  if (room.phase !== 'party-write' || !room.party.entries.size) return false;
  const eligible = [...room.players.keys()].filter(key =>
    room.party.entries.has(key) || isConnected(room, key)).length;
  if (room.party.entries.size !== eligible) return false;
  return advanceSamePage(room, publish);
}

export function publicSamePage(room, key) {
  const party = room.party;
  if (!party || party.type !== 'samepage') return undefined;
  const revealed = room.phase === 'party-reveal' || room.phase === 'finished';
  const ownAnswer = party.entries.get(key);
  const groups = revealed ? party.groups.map(group => ({
    answer: group.answer, count: group.members.length, points: group.points,
    members: group.members.map(member => {
      const player = room.players.get(member);
      return {id: player.id, name: player.name};
    }),
  })) : undefined;
  const earned = revealed
    ? (party.groups.find(group => group.members.includes(key))?.points ?? 0) : undefined;
  return {
    type: 'samepage', prompt: party.prompt, historyId: questionHistoryId(party.prompt), answered: Boolean(ownAnswer),
    ownAnswer, submissions: party.entries.size,
    responseTarget: [...room.players.keys()].filter(member =>
      party.entries.has(member) || isConnected(room, member)).length,
    groups, earned,
  };
}
