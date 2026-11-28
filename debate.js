import {randomInt} from 'node:crypto';
import {connectedPlayers,isConnected} from './room-presence.js';
import {clockExpired,stopDeadline,watchDeadline} from './room-clock.js';

const topics=[
 ['The best family holiday','A theme park','A beach house'],
 ['One free ticket','A concert','A cup final'],
 ['The best rainy afternoon','Board games','A film marathon'],
 ['Your dream kitchen perk','A personal chef','Someone to do the washing up'],
 ['The best way to explore','A train journey','A road trip'],
 ['One tiny superpower','Always find lost things','Always catch the bus'],
 ['The perfect birthday cake','Chocolate fudge','Lemon drizzle'],
 ['The best seat','The front row','The balcony'],
 ['A free Saturday lesson','Pottery','Salsa dancing'],
 ['One wild neighbour','A chatty parrot','A curious penguin'],
 ['A school trip for grown-ups','A space centre','A chocolate factory'],
 ['A perfect picnic spot','The riverbank','A hilltop'],
 ['Keep one holiday tradition','Sending postcards','Bringing home souvenirs'],
 ['A surprise weekend away','A treehouse','A lighthouse'],
 ['The best midnight snack','Toast','Cereal'],
 ['One extra room at home','A tiny cinema','A games room'],
];

function openPitch(room,phase,publish){
 room.phase=phase;
 room.opened=Date.now();
 room.ends=room.opened+60000;
 watchDeadline(room,()=>expireDebate(room,publish));
 publish(room);
}

export function startDebate(room,publish){
 if(room.index===0){
   room.debateSeats=connectedPlayers(room);
   for(let i=room.debateSeats.length-1;i>0;i--){
     const j=randomInt(i+1);
     [room.debateSeats[i],room.debateSeats[j]]=[room.debateSeats[j],room.debateSeats[i]];
   }
   room.count=room.debateSeats.length;
   const offsets=room.debateSeats.map((_,i)=>i);
   room.debateOrder=offsets.filter(i=>i%2===0).concat(offsets.filter(i=>i%2===1));
 }
 const seats=room.debateSeats;
 const start=room.debateOrder[room.index];
 const fresh=topics.filter(([title])=>!room.seen.has('debate:'+title));
 const pool=fresh.length?fresh:topics;
 const topic=pool[randomInt(pool.length)];
 room.seen.add('debate:'+topic[0]);
 room.party={type:'debate',topic,speakers:[seats[start],seats[(start+1)%seats.length]],votes:new Map()};
 openPitch(room,'debate-first',publish);
}

export function advanceDebate(room,publish){
 const p=room.party;
 if(room.phase==='debate-first')return openPitch(room,'debate-second',publish);
 if(room.phase==='debate-second'){
   stopDeadline(room);
   room.ends=0;
   room.phase='debate-vote';
 }else if(room.phase==='debate-vote'){
   const counts=[0,0];
   for(const side of p.votes.values())counts[side]++;
   p.counts=counts;
   const margin=Math.abs(counts[0]-counts[1]);
   if(margin){
     const winner=room.players.get(p.speakers[counts[0]>counts[1]?0:1]);
     winner.score+=margin;
     winner.wins++;
   }
   room.phase='debate-reveal';
 }else if(room.phase==='debate-reveal'){
   if(room.index+1<room.count){room.index++;return startDebate(room,publish);}
   room.phase='finished';
 }else return;
 publish(room);
}

export function expireDebate(room,publish){
 if(['debate-first','debate-second'].includes(room.phase)&&clockExpired(room))advanceDebate(room,publish);
}
export function debateReady(room,publish){
 if(room.phase!=='debate-vote'||!room.party.votes.size)return false;
 const p=room.party;
 for(const key of room.players.keys()){
   if(!p.speakers.includes(key)&&isConnected(room,key)&&!p.votes.has(key))return false;
 }
 advanceDebate(room,publish);
 return true;
}
export function voteDebate(room,key,data,publish){
 if(room.party?.type!=='debate')return [409,'The debate has not started.'];
 if(!room.players.has(key)||room.party.speakers.includes(key))return [403,'Only the audience votes.'];
 if(data?.game!==room.game||data.index!==room.index||room.phase!=='debate-vote'||room.party.votes.has(key))return [409,'This ballot is closed.'];
 if(data.action!=='vote'||![0,1].includes(data.option))return [400,'Choose one speaker.'];
 room.party.votes.set(key,data.option);
 if(!debateReady(room,publish))publish(room);
 return [204];
}
export function publicDebate(room,key){
 const p=room.party;
 if(p?.type!=='debate')return;
 return {type:p.type,topic:p.topic,speakers:p.speakers.map(k=>room.players.get(k).name),
   mySide:p.speakers.indexOf(key),locked:p.votes.has(key),voted:p.votes.size,counts:p.counts};
}
