import {randomInt} from 'node:crypto';
import {isConnected} from './room-presence.js';
import {forkGoodCards, forkBadCards, forkScenes, forkStages} from './public/fork-cards.js';

// Each round has a new player Trolley Driver; all other players are
// randomly dealt into two balanced teams by the authoritative room server.
function deal(room, kind) {
  const bank = kind === 'bad' ? forkBadCards : forkGoodCards;
  room.forkUsed ??= {good:new Set(),bad:new Set()};
  const used = room.forkUsed[kind];
  let available = bank.filter(value => !used.has(value));
  if (available.length < 6) {
    used.clear();
    available = [...bank];
  }
  for(let i=available.length-1;i>0;i--) {
    const j=randomInt(i+1);
    [available[i],available[j]]=[available[j],available[i]];
  }
  const cards=available.slice(0,6);
  for(const card of cards) used.add(card);
  return [cards.slice(0,3),cards.slice(3,6)];
}

function assignRoundRoles(room) {
  room.forkDriverOrder ??= [...room.players.keys()];
  const driverKey = room.forkDriverOrder[room.index % room.forkDriverOrder.length];
  for (const team of room.teams) {
    team.members = [];
    team.size = 0;
    team.roundPoints = 0;
    // Teams are reshuffled every round, so only individual points carry forward.
    team.score = 0;
  }
  delete room.players.get(driverKey).team;
  const competitors = [...room.players].filter(([key]) => key !== driverKey);
  for (let i=competitors.length-1;i>0;i--) {
    const j = randomInt(i+1);
    [competitors[i],competitors[j]] = [competitors[j],competitors[i]];
  }
  competitors.forEach(([key,player],index) => {
    const teamId = index % 2;
    player.team = teamId;
    const team = room.teams[teamId];
    team.size++;
    team.members.push({id:player.id,name:player.name});
  });
  return driverKey;
}

function eligibleVoters(room, votes) {
  let count = 0;
  for (const key of room.players.keys()) {
    if (key === room.party?.driverKey) continue;
    if (votes.has(key) || isConnected(room, key)) count++;
  }
  return count;
}

export function startForkRound(room, publish) {
  if (room.mode !== 'tracks' || room.teams.length !== 2) throw new Error('Fork in the Tracks requires two teams.');
  const driverKey = assignRoundRoles(room);
  const driverPlayer = room.players.get(driverKey);
  room.party = {
    type:'fork', driverKey, driver:{id:driverPlayer.id,name:driverPlayer.name},
    step:0, placements:[[null,null,null],[null,null,null]],
    hands:deal(room,'good'), votes:new Map(), judgeChoice:null, winner:null,
    scene:forkScenes[room.index % forkScenes.length],
  };
  room.phase='party-build';
  publish(room);
}

function winningCard(votes, teamId, hand, room) {
  const choices=[0,0,0];
  let first=null;
  for(const [key,option] of votes) {
    if(room.players.get(key)?.team !== teamId)continue;
    if(first===null) first=option;
    choices[option]++;
  }
  const largest=Math.max(...choices);
  // If the team is tied, respect the first submitted vote; if nobody is
  // connected, permit the host to keep the round moving using card 1.
  const pick=first!==null && choices[first]===largest
    ? first : choices.indexOf(largest);
  return hand[pick];
}

function lockPlacement(room, publish) {
  const party=room.party;
  if (!party || room.phase!=='party-build') return false;
  const slot=party.step;
  for(const team of room.teams) {
    const chosen=winningCard(party.votes,team.id,party.hands[team.id],room);
    const destination=slot===1 ? 1-team.id : team.id;
    party.placements[destination][slot]=chosen;
  }
  party.votes=new Map();
  if(slot===2) {
    room.phase='party-judge';
  }else {
    party.step++;
    party.hands=deal(room,forkStages[party.step].kind);
  }
  publish(room);
  return true;
}

export function forkReadyToLock(room) {
  if(room.phase!=='party-build' || !room.party?.votes?.size) return false;
  const votes=room.party.votes;
  if (votes.size < eligibleVoters(room,votes)) return false;
  // If a whole team is missing, don't auto-select on their behalf.
  return room.teams.every(team=>[...votes.keys()].some(key=>room.players.get(key)?.team===team.id));
}

export function advanceForkWhenReady(room,publish) {
  if(!forkReadyToLock(room))return false;
  return lockPlacement(room,publish);
}

export function advanceFork(room,publish) {
  if(room.phase==='party-build') {
    // The host may close a placement even when a phone disconnects.
    if(lockPlacement(room,publish))return true;
  }
  if(room.phase==='party-reveal') {
    if(room.index+1<room.count) {
      room.index++;
      startForkRound(room,publish);
    }else {
      room.phase='finished';
      publish(room);
    }
    return true;
  }
  // During judging the host must choose a track to hit; no accidental skip.
  return false;
}

export function submitFork(room,key,data,publish) {
  const party=room.party;
  if(!party || party.type!=='fork')return [409,'The fork game has not started.'];
  if(data?.index !== room.index)return [409,'This round has already moved on.'];
  if(data.action==='card' && room.phase==='party-build') {
    const player=room.players.get(key);
    if(!player || ![0,1].includes(player.team))return [403,'Join one of the two teams to place a card.'];
    if(data.step!==party.step)return [409,'That placement has already ended.'];
    if(!Number.isInteger(data.option)||data.option<0||data.option>=3)
      return [400,'Select one of the three cards.'];
    if(party.votes.has(key))return [409,'You have already chosen this placement.'];
    party.votes.set(key,data.option);
    if(!advanceForkWhenReady(room,publish))publish(room,true);
    return [204];
  }
  if(data.action==='judge' && room.phase==='party-judge') {
    if(key!==party.driverKey && !(key===room.host && !isConnected(room, party.driverKey)))
      return [403,'Only the current Trolley Driver can pull the lever.'];
    if(!Number.isInteger(data.track) || ![0,1].includes(data.track))
      return [400,'Choose Track A or Track B.'];
    const hit=data.track;
    const saved=1-hit;
    party.judgeChoice=hit;
    party.winner=saved;
    room.teams[saved].score+=1;
    room.teams[saved].roundPoints=1;
    room.teams[hit].roundPoints=0;
    for(const player of room.players.values()){
      if(player.team===saved){player.score+=100;player.wins++;}
    }
    room.phase='party-reveal';
    publish(room);
    return [204];
  }
  return [409,'This action is not available during the current trolley phase.'];
}

export function publicFork(room,key) {
  const party=room.party;
  if(!party || party.type!=='fork')return undefined;
  const player=room.players.get(key);
  const team=player?.team;
  return {
    type:'fork',
    scene:party.scene,
    step:party.step,
    stage:room.phase==='party-build' ? forkStages[party.step] : null,
    placements:party.placements.map(arr=>[...arr]),
    hand:room.phase==='party-build' && [0,1].includes(team) ? [...party.hands[team]] : undefined,
    voted:party.votes.has(key),
    submissions:party.votes.size,
    responseTarget:room.phase==='party-build' ? eligibleVoters(room,party.votes) : 0,
    driver:party.driver,
    driverTurn:key===party.driverKey,
    driverConnected:isConnected(room,party.driverKey),
    canJudge:key===party.driverKey || (key===room.host && !isConnected(room,party.driverKey)),
    judge:key===party.driverKey,
    team,
    hit:party.judgeChoice,
    saved:party.winner,
    allPlaced:room.phase==='party-judge'||room.phase==='party-reveal'||room.phase==='finished',
  };
}
