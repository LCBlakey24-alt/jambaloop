import { isConnected, responseTarget } from './room-presence.js';
import { randomBytes, randomInt } from 'node:crypto';
import { socialModes } from './public/game-config.js';
import {refreshGroupScores} from './public/team-play.js';
import {v2Punchlines,v2Blanks,v2Cards} from './creative-expansion-v2.js';
import {punchlineV3,blankV3,cardV3} from './party-content-v3.js';
import {punchlineV4,blankV4,cardV4} from './creative-expansion-v4.js';
import {punchlineV5,blankV5,cardV5} from './creative-expansion-v5.js';

const punchlines = [
  'What is the worst name for a very fancy restaurant?',
  'What would a cat put on its résumé?',
  'Invent a warning label for a trampoline.',
  'What is the least useful superpower at a birthday party?',
  'What would you hear on a weather forecast for a planet made of cheese?',
  'What should a dragon never say at a job interview?',
  'What would be a terrible password for a secret clubhouse?',
  'What is the worst thing for a magician to pull out of a hat?',
  'What excuse would a robot give for being late to school?',
  'Invent a new event for the Olympics of doing chores.',
  'What should a pigeon say in its campaign to become mayor?',
  'What is a terrible name for a children’s bedtime story?',
  ...v2Punchlines,
  ...punchlineV3,
  ...punchlineV4,
  ...punchlineV5,
];
const blanks = [
  'The holiday brochure promised sunshine and ____.',
  'The school talent show ended with ____.',
  'This year, the village is holding its first-ever festival of ____.',
  'The museum’s most popular exhibit is ____.',
  'The chef says the secret ingredient is ____.',
  'We solved the problem with teamwork and ____.',
  'The new family rule is: never leave the house without ____.',
  'The royal family has appointed ____ as its official mascot.',
  'Everything was normal until the doorbell rang and we found ____.',
  'The library now offers evening classes in ____.',
  'Our new neighbour introduced themselves by bringing ____.',
  'This holiday’s most popular souvenir is ____.',
  ...v2Blanks,
  ...blankV3,
  ...blankV4,
  ...blankV5,
];
const cards = [
  'a goose in sunglasses', 'a very dramatic potato', 'six minutes of awkward silence', 'a marching band of hamsters',
  'a dog with a clipboard', 'a suspiciously shiny spoon', 'a tiny disco ball', 'two left slippers',
  'a picnic for ants', 'a lifetime supply of toast', 'competitive napping', 'a tap-dancing cactus',
  'a suitcase full of rubber ducks', 'a giraffe in a tiny lift', 'a penguin with a business plan', 'an invisible sandwich',
  'a committee of toddlers', 'a trumpet solo from the bathroom', 'a glitter emergency', 'a llama on a skateboard',
  'a very polite ghost', 'a council of grumpy cats', 'a bucket of confetti', 'giant novelty eyebrows',
  'a mysterious button labelled “Perhaps”', 'a robot that only makes soup', 'one extremely loud sock', 'a unicycle for beginners',
  'a bowl of alphabet soup spelling “Help”', 'an umbrella that opens indoors', 'an overly competitive grandma', 'a potato with its own postcode',
  'a lopsided trophy', 'a parade of shopping trolleys', 'an important meeting about snacks', 'a banana wearing a crown',
  ...v2Cards,
  ...cardV3,
  ...cardV4,
  ...cardV5,
];
const dilemmas = [
  ['The town can fund one annual festival. Which track gets your vote?', 'A parade where all the floats are made of cake', 'A silent disco in the supermarket'],
  ['You’re booking the family holiday, and only two unusual options are left.', 'A hotel run entirely by friendly robots', 'A train where every carriage has a different theme'],
  ['Pick the town’s new public announcement system.', 'A choir singing every announcement', 'A giant puppet acting them out'],
  ['The school can replace its bell with only one sound.', 'A dramatically sustained trumpet note', 'A voice that says “Plot twist!”'],
  ['You can add one room to every house in town.', 'A pancake-making laboratory', 'A room with trampolines instead of chairs'],
  ['Choose a rule for the next family game night.', 'All instructions must be sung', 'Everyone must use a ridiculous nickname'],
  ['Pick the newest addition to the public library.', 'A room where you can borrow costumes', 'A room where dogs listen to you read'],
  ['Pick one thing to make the daily commute more fun.', 'Every bus has a tiny quiz show', 'Every station hands out surprise snacks'],
  ['The town has enough money for one very silly landmark.', 'A statue of a goose wearing a crown', 'A clock tower that dispenses popcorn'],
  ['Choose the afternoon’s entertainment at a very small theme park.', 'A race between decorated shopping trolleys', 'A talent show for household pets'],
];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function startSocialRound(room, publish) {
  const bank = room.mode === 'punchline' ? punchlines : room.mode === 'cards' ? blanks : dilemmas;
  const unseen = bank.filter(item => !room.seen.has(Array.isArray(item) ? item[0] : item));
  const item = shuffle(unseen.length ? unseen : bank)[0];
  const [prompt, ...tracks] = Array.isArray(item) ? item : [item];
  room.seen.add(prompt);
  room.party = { prompt, tracks, entries: new Map(), votes: new Map(),
    // The final round matters; this does not change vote eligibility or anonymity.
    votePoints: ['punchline', 'cards'].includes(room.mode) && room.index === room.count - 1 ? 200 : 100 };
  if (room.mode === 'cards') {
    room.party.hands = new Map([...room.players.keys()].map(key => [key, shuffle(cards).slice(0, 6)]));
    room.party.redrawn = new Set();
  }
  room.phase = tracks.length ? 'party-vote' : 'party-write';
  publish(room);
}

export function advanceSocial(room, publish) {
  const party = room.party;
  if (room.phase === 'party-write') {
    // Every submitted entry appears in the secret ballot. Previously a random
    // six-entry shortlist excluded most players in larger rooms from earning votes.
    party.ballot = shuffle(party.entries.values());
    room.phase = 'party-vote';
    // An empty ballot (or a lone entry with no other connected voters) cannot
    // receive a legal vote. Reveal immediately rather than stranding the room.
    if (socialTarget(room) === 0) {
      party.totals = new Map();
      room.phase = 'party-reveal';
    }
  } else if (room.phase === 'party-vote') {
    party.totals = new Map();
    for (const vote of party.votes.values()) party.totals.set(vote, (party.totals.get(vote) ?? 0) + 1);
    for (const entry of party.entries.values()) room.players.get(entry.key).score += party.votePoints * (party.totals.get(entry.id) ?? 0);
    refreshGroupScores(room);
    room.phase = 'party-reveal';
  } else if (room.phase === 'party-reveal') {
    if (room.index + 1 < room.count) {
      room.index++;
      return startSocialRound(room, publish);
    }
    room.phase = 'finished';
  } else return;
  publish(room);
}

export function submitSocial(room, key, data, publish) {
  if (data.index !== room.index) return [409, 'This round has moved on.'];
  const party = room.party;
  if (room.mode === 'cards' && room.phase === 'party-write' && data.action === 'redraw') {
    if (party.entries.has(key) || party.redrawn.has(key)) return [409, 'Your hand is already locked or refreshed.'];
    const previous = party.hands.get(key);
    if (!previous) return [403, 'Join the room to choose a card.'];
    const candidates = cards.filter(card => !previous.includes(card));
    if (candidates.length < 6) return [409, 'No unused cards are available.'];
    party.hands.set(key, shuffle(candidates).slice(0, 6));
    party.redrawn.add(key);
    publish(room, true);
    return [204];
  }
  if (room.phase === 'party-write' && ['write', 'card'].includes(data.action)) {
    if (room.mode === 'cards' && data.action === 'card' &&
        (data.handVersion ?? 0) !== (party.redrawn.has(key) ? 1 : 0))
      return [409, 'Your hand has changed. Select a card from the current hand.'];
    const text = room.mode === 'cards' ? party.hands.get(key)?.[data.option]
      : typeof data.text === 'string' ? data.text.trim() : '';
    if (typeof text !== 'string' || !text || text.length > 100) return [400, room.mode === 'cards' ? 'Choose a card from your hand.' : 'Enter a reply of 1 to 100 characters.'];
    if (!party.entries.has(key)) party.entries.set(key, { id: randomBytes(12).toString('hex'), key, text });
    if (!advanceSocialWhenReady(room, publish)) publish(room, true);
    return [204];
  }
  if (room.phase === 'party-vote' && data.action === 'vote') {
    const valid = party.tracks.length ? ['0', '1'].includes(data.id)
      : party.ballot.some(entry => entry.id === data.id && entry.key !== key);
    if (!valid) return [400, 'Choose an eligible entry.'];
    if (!party.votes.has(key)) party.votes.set(key, data.id);
    if (!advanceSocialWhenReady(room, publish)) publish(room, true);
    return [204];
  }
  return [409, 'This action is no longer available.'];
}

export function advanceSocialWhenReady(room, publish) {
  const submissions = room.phase === 'party-write' ? room.party.entries : room.party.votes;
  if (!submissions.size || submissions.size !== socialTarget(room)) return false;
  advanceSocial(room, publish);
  return true;
}

function socialTarget(room) {
  const party = room.party;
  if (room.phase === 'party-write') return responseTarget(room, party.entries);
  if (party.tracks.length || party.ballot?.length > 1) return responseTarget(room, party.votes);
  const onlyEntry = party.ballot?.[0];
  if (!onlyEntry) return 0;
  return [...room.players.keys()].filter(key => key !== onlyEntry.key && (party.votes.has(key) || isConnected(room, key))).length;
}

export function publicSocial(room, key) {
  const party = room.party;
  const writing = room.phase === 'party-write';
  const revealed = room.phase === 'party-reveal' || room.phase === 'finished';
  return {
    prompt: party.prompt, tracks: party.tracks,
    submissions: writing ? party.entries.size : party.votes.size,
    responseTarget: socialTarget(room),
    shortlisted: 0,
    votePoints: party.votePoints,
    redrawAvailable: writing && room.mode === 'cards' && party.hands?.has(key) === true && !party.entries.has(key) && !party.redrawn?.has(key),
    handVersion: writing && room.mode === 'cards' && party.hands?.has(key) ? (party.redrawn.has(key) ? 1 : 0) : undefined,
    wrote: party.entries.has(key), voted: party.votes.has(key),
    hand: writing ? party.hands?.get(key) : undefined,
    ballot: party.ballot?.map(entry => ({
      id: entry.id, text: entry.text, yours: entry.key === key,
      name: revealed ? room.players.get(entry.key).name : undefined,
      votes: revealed ? party.totals.get(entry.id) ?? 0 : undefined,
    })),
    trackVotes: revealed && party.tracks.length ? [party.totals.get('0') ?? 0, party.totals.get('1') ?? 0] : undefined,
  };
}

export { socialModes };
