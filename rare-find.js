import {isConnected} from './room-presence.js';
import {normaliseRare,answerMapFor,selectRarePrompt} from './rare-find-bank.js';

function eligibleCount(room,map){
 return [...room.players.keys()].filter(key=>map.has(key)||isConnected(room,key)).length;
}
function reviewRows(room){
 const party=room.party;
 const approved=answerMapFor(party.prompt);
 const unknown=new Map();
 for(const entry of party.entries.values()){
  const normalized=normaliseRare(entry);
  if(approved.has(normalized))continue;
  const group=unknown.get(normalized)||{key:normalized,label:entry,count:0};
  group.count++;
  unknown.set(normalized,group);
 }
 return [...unknown.values()].map((row,index)=>({
  token:'u'+index,answer:row.label,count:row.count,normalized:row.key,
  decision:party.decisions.get(row.key),
 }));
}
function scoreRareRound(room){
 const party=room.party;
 const allowed=answerMapFor(party.prompt);
 const groups=new Map();
 const invalid=[];
 for(const [key,answer] of party.entries){
  const norm=normaliseRare(answer);
  const curated=allowed.get(norm);
  const accepted=party.decisions.get(norm)==='approve';
  const canonical=curated||(accepted?norm:undefined);
  const player=room.players.get(key);
  if(!player)continue;
  if(!canonical){invalid.push({id:player.id,name:player.name,answer});continue;}
  const group=groups.get(canonical)||{answer:curated||answer,canonical,reviewed:!curated,members:[]};
  group.members.push({id:player.id,name:player.name,key});
  groups.set(canonical,group);
 }
 const scored=[...groups.values()].map(group=>{
  const total=group.members.length;
  const points=total===1?200:total===2?100:50;
  for(const member of group.members){
    const player=room.players.get(member.key);
    player.score+=points;
    player.wins++;
    player.streak++;
    player.bestStreak=Math.max(player.bestStreak,player.streak);
  }
  return {answer:group.answer,count:total,points,reviewed:group.reviewed,
    members:group.members.map(({id,name})=>({id,name}))};
 }).sort((a,b)=>b.points-a.points||a.answer.localeCompare(b.answer));
 for(const item of invalid){
   const player=[...room.players.values()].find(p=>p.id===item.id);
   if(player){player.misses++;player.streak=0;}
 }
 party.results={groups:scored,invalid:invalid.map(item=>({id:item.id,name:item.name,answer:item.answer})),
   responded:party.entries.size,valid:scored.reduce((n,g)=>n+g.count,0),
   invalidCount:invalid.length};
 party.earned=new Map();
 for(const [key,player] of room.players){
   const found=scored.find(g=>g.members.some(m=>m.id===player.id));
   party.earned.set(key,found?.points??0);
 }
 room.phase='rare-reveal';
}

export function startRareRound(room,publish){
 const prompt=selectRarePrompt(room.seen);
 room.seen.add(prompt.historyId);
 room.seen.add('rarefind:'+prompt.id);
 room.party={type:'rare',prompt,entries:new Map(),decisions:new Map(),audit:[],results:undefined,earned:undefined};
 room.phase='rare-write';
 publish(room);
}

export function advanceRare(room,publish){
 if(room.phase==='rare-write'){
  const unknown=reviewRows(room);
  if(unknown.length){room.phase='rare-review';publish(room);return true;}
  scoreRareRound(room);
 } else if(room.phase==='rare-review'){
  if(reviewRows(room).some(row=>!row.decision))return false;
  scoreRareRound(room);
 } else if(room.phase==='rare-reveal'){
  if(room.index+1<room.count){room.index++;return startRareRound(room,publish);}
  room.phase='finished';
 }else return false;
 publish(room);
 return true;
}

export function submitRare(room,key,data,publish){
 const party=room.party;
 if(!party||party.type!=='rare')return [409,'Rare Find is not active.'];
 if(data?.index!==room.index)return [409,'This Rare Find round has moved on.'];
 if(data?.action==='review'){
  if(key!==room.host)return [403,'Only the TV host can approve unusual answers.'];
  if(room.phase!=='rare-review')return [409,'Answer review is not open.'];
  if(!['approve','reject'].includes(data.decision))return [400,'Choose approve or reject.'];
  const row=reviewRows(room).find(item=>item.token===data.token);
  if(!row)return [400,'Choose an answer currently under review.'];
  const previous=row.decision;
  party.decisions.set(row.normalized,data.decision);
  party.audit.push({answer:row.answer,decision:data.decision,previous:previous||null,
    at:Date.now(),actor:'TV host'});
  publish(room);
  return [204];
 }
 if(!room.players.has(key))return [403,'Join as a player to submit an answer.'];
 if(room.phase!=='rare-write'||data.action!=='write')return [409,'The answer-entry stage has ended.'];
 if(party.entries.has(key))return [409,'Your Rare Find answer is already locked.'];
 if(typeof data.text!=='string')return [400,'Type a valid answer.'];
 const answer=data.text.normalize('NFKC').trim().replace(/\s+/g,' ');
 if(answer.length<1||answer.length>60||/[\u0000-\u001f\u007f<>]/.test(answer)||!/[\p{L}\p{N}]/u.test(answer))
   return [400,'Enter a clear answer of 1 to 60 characters.'];
 party.entries.set(key,answer);
 const eligible=eligibleCount(room,party.entries);
 if(party.entries.size&&party.entries.size===eligible)advanceRare(room,publish);
 else publish(room);
 return [204];
}

export function publicRare(room,key){
 const party=room.party;
 if(!party||party.type!=='rare')return undefined;
 const isHost=key===room.host;
 const revealed=['rare-reveal','finished'].includes(room.phase);
 const reviewing=room.phase==='rare-review';
 const own=party.entries.get(key);
 const reviews=isHost&&reviewing?reviewRows(room):undefined;
 return {type:'rare',category:party.prompt.category,prompt:party.prompt.prompt,
   historyId:party.prompt.historyId,
   answered:party.entries.has(key),ownAnswer:own,submissions:party.entries.size,
   responseTarget:eligibleCount(room,party.entries),
   reviewCount:reviewing?reviewRows(room).length:undefined,
   reviews,remaining:isHost&&reviewing?reviews.filter(row=>!row.decision).length:undefined,
   // Do not reveal anyone else's answer, validated/invalid status, or points before reveal.
   ...(revealed?{results:party.results,source:party.prompt.source,
       audit:party.audit.map(({answer,decision,actor,at})=>({answer,decision,actor,at})),
       earned:party.earned?.get(key)??0}:{}),
 };
}
