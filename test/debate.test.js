import test from 'node:test';
import assert from 'node:assert/strict';
import {startDebate,voteDebate,advanceDebate,publicDebate,expireDebate} from '../debate.js';
import {stopDeadline} from '../room-clock.js';

for(const size of [4,5,12])test('Floor Time rotates both speaking positions for '+size+' players',()=>{
 const keys=Array.from({length:size},(_,i)=>'seat'+i);
 const room={index:0,game:1,players:new Map(keys.map(name=>[name,{name,score:0,wins:0}])),
   lastSeen:new Map(keys.map(k=>[k,Date.now()])),seen:new Set()};
 const publish=()=>{};
 const ballot=(key,option,extra={})=>voteDebate(room,key,{action:'vote',index:room.index,game:1,option,...extra},publish)[0];
 const positions=[[],[]];
 const topics=new Set();
 try{
   startDebate(room,publish);
   for(let i=0;i<size;i++){
     const p=room.party;
     topics.add(p.topic[0]);
     p.speakers.forEach((k,side)=>positions[side].push(k));
     assert.equal(room.ends-room.opened,60000);
     room.ends=Date.now()-1;expireDebate(room,publish);
     assert.equal(room.phase,'debate-second');
     advanceDebate(room,publish);
     assert.equal(ballot(p.speakers[0],0),403);
     const jury=keys.filter(k=>!p.speakers.includes(k));
     assert.equal(ballot(jury[0],2),400);
     assert.equal(ballot(jury[0],1,{index:i-1}),409);
     const before=room.players.get(p.speakers[0]).score;
     jury.forEach((k,j)=>{
       const side=size===12?(j<8?0:1):j%2;
       assert.equal(ballot(k,side),204);
       if(j===0){
         assert.equal(ballot(k,side),409);
         assert.equal(publicDebate(room,'host').counts,undefined);
       }
     });
     assert.equal(room.phase,'debate-reveal');
     assert.equal(room.players.get(p.speakers[0]).score-before,size===12?6:size%2);
     advanceDebate(room,publish);
   }
   assert.equal(room.phase,'finished');
   for(const side of positions)assert.deepEqual(side.sort(),[...keys].sort());
   assert.equal(topics.size,size);
 }finally{stopDeadline(room);}
});
