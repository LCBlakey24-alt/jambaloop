import {randomInt} from 'node:crypto';
import {responseTarget} from './room-presence.js';

// Fully original, open-ended prompts. The social round selector avoids repeats
// in the same room until this bank is exhausted.
export const samePagePrompts = Object.freeze([
  'Name a snack you would bring to a cinema.',
  'Name a food you could happily eat every day.',
  'Name an animal you would choose as a pet.',
  'Name something you would take to a desert island.',
  'Name a colour that looks good on a car.',
  'Name a superhero power you would love to have.',
  'Name something people often forget when packing.',
  'Name a drink you would order in a café.',
  'Name something you would find inside a school bag.',
  'Name a breakfast food you would eat on holiday.',
  'Name a film you could watch again and again.',
  'Name something you would buy if you won a small prize.',
  'Name a musical instrument you wish you could play.',
  'Name an animal you would not want to meet in the wild.',
  'Name a board game people know how to play.',
  'Name a household chore everyone tries to avoid.',
  'Name somewhere you would go for a day out.',
  'Name a vegetable that people often dislike.',
  'Name something you might buy at a fairground.',
  'Name a sport you would like to try.',
  'Name something you might find under a sofa.',
  'Name an object you would not want to drop in the sea.',
  'Name a food you might eat at a barbecue.',
  'Name a country you would love to visit.',
  'Name something you would wear on a rainy day.',
  'Name a flavour of ice cream.',
  'Name a pizza topping.',
  'Name a famous fictional detective.',
  'Name a type of cake.',
  'Name a character you would invite to dinner.',
  'Name a job you think a robot could do.',
  'Name something you would keep in a kitchen drawer.',
  'Name a toy you remember playing with.',
  'Name a place you might visit on a school trip.',
  'Name an animal that could be a funny mascot.',
  'Name something you would see at a wedding.',
  'Name an item people collect as a hobby.',
  'Name a vegetable that makes a good soup.',
  'Name a reason you might arrive late to work.',
  'Name something that makes a loud noise.',
  'Name an animal you might see on a farm.',
  'Name a chocolate bar.',
  'Name a gift that someone might buy for a birthday.',
  'Name a food that is difficult to eat neatly.',
  'Name something you would pack for a camping trip.',
  'Name a game you could play without equipment.',
  'Name a thing you would look for in a hotel.',
  'Name something that belongs in a toolbox.',
  'Name a popular kind of takeaway food.',
  'Name something you might see in a museum.',
  'Name a word someone might shout during a football match.',
  'Name a fruit that belongs in a smoothie.',
  'Name a creature that would make a terrible housemate.',
  'Name a famous landmark you would like to visit.',
  'Name a thing you might find in a garden shed.',
  'Name a school subject you enjoyed.',
  'Name a pet name that makes you smile.',
  'Name a thing you would put in a time capsule.',
  'Name a treat you would buy at the seaside.',
  'Name a place you might hide in a game of hide-and-seek.',
  'Name something that people hang on the wall.',
  'Name a breakfast drink.',
  'Name something you might find in a car boot.',
  'Name a musical genre people can dance to.',
  'Name a reason people visit a theme park.',
  'Name an item you would bring to a picnic.',
  'Name an ingredient you would add to a sandwich.',
  'Name a machine you could not live without.',
  'Name something you would give a friend for good luck.',
  'Name a type of biscuit.'
]);

export function normaliseSamePageAnswer(input) {
  return String(input ?? '')
    .normalize('NFKD').replace(/\p{M}/gu,'')
    .toLocaleLowerCase('en-GB')
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .trim().replace(/\s+/g,' ');
}

export function scoreSamePage(entries, players) {
  const groups=new Map();
  for(const [key, answer] of entries){
    if(!players.has(key)) continue;
    const id=normaliseSamePageAnswer(answer);
    if(!id) continue;
    if(!groups.has(id)) groups.set(id,{id,answer,keys:[]});
    groups.get(id).keys.push(key);
  }
  const ordered=[...groups.values()].map(group=>({
    ...group,pointsEach:Math.max(0,group.keys.length-1)*100,
  })).sort((a,b)=>b.keys.length-a.keys.length||a.answer.localeCompare(b.answer,'en-GB'));
  return ordered;
}

export function startSamePageRound(room,publish) {
  const fresh=samePagePrompts.filter(prompt=>!room.seen.has(prompt));
  const pool=fresh.length?fresh:samePagePrompts;
  const prompt=pool[randomInt(pool.length)];
  room.seen.add(prompt);
  room.party={type:'samepage',prompt,entries:new Map(),groups:undefined,roundScores:undefined};
  room.phase='party-write';
  publish(room);
}

function revealSamePage(room,publish) {
  const groups=scoreSamePage(room.party.entries,room.players);
  const roundScores=new Map();
  for(const group of groups) for(const key of group.keys){
    const player=room.players.get(key);
    player.score+=group.pointsEach;
    player.wins+=Number(group.pointsEach>0);
    roundScores.set(key,group.pointsEach);
  }
  for(const [key,player] of room.players){
    const won=(roundScores.get(key)??0)>0;
    player.rounds.push(won?'won':room.party.entries.has(key)?'miss':'skipped');
    player.streak=won?player.streak+1:0;
    player.bestStreak=Math.max(player.bestStreak,player.streak);
    if(!won) player.misses++;
  }
  room.party.groups=groups;
  room.party.roundScores=roundScores;
  room.phase='party-reveal';
  publish(room);
}

export function advanceSamePage(room,publish) {
  if(room.phase==='party-write') return revealSamePage(room,publish);
  if(room.phase!=='party-reveal') return;
  if(room.index+1<room.count){
    room.index++;
    return startSamePageRound(room,publish);
  }
  room.phase='finished';
  publish(room);
}

export function submitSamePage(room,key,data,publish) {
  if(room.phase!=='party-write'||data.action!=='write'||data.index!==room.index)
    return [409,'This round has already moved on.'];
  if(!room.players.has(key)) return [403,'Join the room to submit your own answer.'];
  if(room.party.entries.has(key)) return [409,'You have already locked in an answer.'];
  const answer=typeof data.text==='string'?data.text.trim().replace(/\s+/g,' '):'';
  if(!answer||answer.length>50||!normaliseSamePageAnswer(answer))
    return [400,'Enter an answer of 1 to 50 characters.'];
  if(/<[^>]*>|https?:\/\/|www\./i.test(answer))
    return [400,'Use a short word or phrase, without links or HTML.'];
  room.party.entries.set(key,answer);
  if(!advanceSamePageWhenReady(room,publish)) publish(room,true);
  return [204];
}

export function advanceSamePageWhenReady(room,publish){
  if(room.phase!=='party-write'||!room.party?.entries.size) return false;
  if(room.party.entries.size<responseTarget(room,room.party.entries)) return false;
  revealSamePage(room,publish);
  return true;
}

export function publicSamePage(room,key){
  const party=room.party;
  if(!party||party.type!=='samepage')return undefined;
  const revealed=room.phase==='party-reveal'||room.phase==='finished';
  return {
    type:'samepage',
    prompt:party.prompt,
    wrote:party.entries.has(key),
    submissions:party.entries.size,
    responseTarget:room.phase==='party-write'?responseTarget(room,party.entries):party.entries.size,
    ownPoints:revealed?party.roundScores?.get(key)??0:undefined,
    groups:revealed?party.groups.map(group=>({
      answer:group.answer,
      count:group.keys.length,
      pointsEach:group.pointsEach,
      players:group.keys.map(id=>{
        const player=room.players.get(id);
        return {id:player.id,name:player.name};
      })
    })):undefined,
  };
}
