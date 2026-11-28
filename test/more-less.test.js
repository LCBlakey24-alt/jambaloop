import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisons} from '../more-less-bank.js';
import {questionHistoryId} from '../public/question-history.js';
import {startMoreLess,advanceMoreLess,voteMoreLess,publicMoreLess} from '../more-less.js';

const noop=()=>{};
const setup=(style='points')=>({
 mode:'moreless', moreLessStyle:style, phase:'lobby',index:0,count:3,game:7,seen:new Set(),
 players:new Map(['a','b','c'].map(key=>[key,{score:0,wins:0}])),
 lastSeen:new Map(['a','b','c'].map(key=>[key,Date.now()])),liveConnections:new Map(),
});
const correct=question => question.options.findIndex(option => question.direction==='less'
 ? option.value===Math.min(...question.options.map(o=>o.value))
 : option.value===Math.max(...question.options.map(o=>o.value)));

test('every comparison has distinct sourced values and a defined direction',()=>{
 assert.ok(comparisons.length>=10);
 assert.equal(new Set(comparisons.map(q=>q.id)).size,comparisons.length);
 for(const q of comparisons){
   assert.ok(['less','more'].includes(q.direction),q.id);
   assert.equal(q.options.length,2,q.id);
   assert.notEqual(q.options[0].value,q.options[1].value,q.id);
   assert.ok(q.source && q.unit && q.prompt,q.id);
 }
});

test('both directions score correctly without revealing votes or values beforehand',()=>{
 for (const direction of ['less','more']) {
  const room=setup();
  startMoreLess(room,noop);
  room.party.question={...comparisons.find(q=>q.direction===direction)};
  const right=correct(room.party.question);
  const view=publicMoreLess(room,'b');
  assert.equal(view.correct,undefined);
  assert.equal(view.values,undefined);
  assert.equal(voteMoreLess(room,'a',{action:'vote',game:7,index:0,option:right},noop)[0],204);
  assert.equal(publicMoreLess(room,'b').ownVote,undefined);
  assert.equal(voteMoreLess(room,'a',{action:'vote',game:7,index:0,option:right},noop)[0],409);
  assert.equal(voteMoreLess(room,'b',{action:'vote',game:6,index:0,option:right},noop)[0],409);
  assert.equal(voteMoreLess(room,'b',{action:'vote',game:7,index:0,option:1-right},noop)[0],204);
  advanceMoreLess(room,noop);
  assert.equal(room.players.get('a').score,100);
  assert.equal(room.players.get('b').score,0);
  assert.equal(publicMoreLess(room,'b').correct,right);
  assert.equal(room.phase,'moreless-reveal');
 }
});

test('elimination finishes on a sole survivor and all misses tie previous survivors',()=>{
 for(const bothWrong of [false,true]) {
  const room=setup('elimination');
  startMoreLess(room,noop);
  const right=correct(room.party.question);
  voteMoreLess(room,'a',{action:'vote',game:7,index:0,option:bothWrong?1-right:right},noop);
  voteMoreLess(room,'b',{action:'vote',game:7,index:0,option:1-right},noop);
  voteMoreLess(room,'c',{action:'vote',game:7,index:0,option:1-right},noop);
  assert.equal(room.phase,'moreless-reveal');
  assert.equal(room.moreLessAlive.size,bothWrong?3:1);
  advanceMoreLess(room,noop);
  assert.equal(room.phase,'finished');
 }
});

test('host can advance stalled rounds and missed votes cannot arrive after reveal',()=>{
 const room=setup('elimination');
 startMoreLess(room,noop);
 const right=correct(room.party.question);
 voteMoreLess(room,'a',{action:'vote',game:7,index:0,option:right},noop);
 advanceMoreLess(room,noop);
 assert.equal(room.moreLessAlive.size,1);
 assert.equal(voteMoreLess(room,'b',{action:'vote',game:7,index:0,option:right},noop)[0],403);
});

test('HTTP points and elimination games keep answers private and reach final results',async()=>{
 const {spawn}=await import('node:child_process');
 const {once}=await import('node:events');
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url).pathname,
   env:{...process.env,PORT:'0',PUBLIC_URL:''},stdio:['ignore','pipe','pipe']});
 try {
  const [line]=await once(child.stdout,'data');
  const origin=String(line).match(/http:\/\/localhost:\d+/)?.[0];
  assert.ok(origin);
  const request=async(path,key,data,status=200)=>{
   const response=await fetch(origin+'/api/rooms'+path,{method:data===undefined?'GET':'POST',headers:{
     'content-type':'application/json',...(key?{'x-game-key':key}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
   const body=response.status===204?null:await response.json();
   assert.equal(response.status,status,JSON.stringify(body));
   return body;
  };
  const created=await request('',null,{mode:'moreless',moreLessStyle:'points',category:'mixed',format:'choice',count:3,seconds:0},201);
  const base='/'+created.code;
  const keys=[];
  for(const name of ['Alex','Bailey','Charlie'])keys.push((await request(base+'/join',null,{name},201)).key);
  let state=await request(base,created.host);
  assert.equal(state.total,3);
  assert.equal(state.moreLessStyle,'points');
  await request(base+'/advance',created.host,{game:state.game,index:state.index,phase:state.phase},204);
  for(let round=0;round<3;round++) {
   state=await request(base,created.host);
   assert.equal(state.phase,'moreless-vote');
   assert.equal(state.party.correct,undefined);
   assert.equal(state.party.values,undefined);
   const q=comparisons.find(item=>item.id===state.party.id);
   const selected=q.options[correct(q)].label;
   const right=state.party.options.indexOf(selected);
   for(const key of keys)await request(base+'/party',key,{game:state.game,index:state.index,action:'vote',option:right},204);
   state=await request(base,created.host);
   assert.equal(state.phase,'moreless-reveal');
   assert.equal(state.party.correct,right);
   await request(base+'/advance',created.host,{game:state.game,index:state.index,phase:state.phase},204);
  }
  state=await request(base,created.host);
  assert.equal(state.phase,'finished');
  assert.deepEqual(state.players.map(player=>player.score),[300,300,300]);

  const eliminated=await request('',null,{mode:'moreless',moreLessStyle:'elimination',category:'mixed',format:'choice',count:5,seconds:0},201);
  const path='/'+eliminated.code;
  const players=[];
  for(const name of ['Drew','Eden','Finn'])players.push((await request(path+'/join',null,{name},201)).key);
  state=await request(path,eliminated.host);
  assert.equal(state.moreLessStyle,'elimination');
  assert.equal(state.total,5);
  await request(path+'/advance',eliminated.host,{game:state.game,index:state.index,phase:state.phase},204);
  state=await request(path,eliminated.host);
  const q=comparisons.find(item=>item.id===state.party.id);
  const right=state.party.options.indexOf(q.options[correct(q)].label);
  for(const [i,key] of players.entries())await request(path+'/party',key,{game:state.game,index:state.index,action:'vote',option:i?1-right:right},204);
  state=await request(path,eliminated.host);
  assert.equal(state.phase,'moreless-reveal');
  await request(path+'/advance',eliminated.host,{game:state.game,index:state.index,phase:state.phase},204);
  state=await request(path,eliminated.host);
  assert.equal(state.phase,'finished');
  assert.equal(state.players[0].name,'Drew');
  assert.equal(state.players[0].score,100);
 } finally { child.kill(); }
});

test('seen comparisons are avoided until their pool is exhausted',()=>{
 const room=setup();
 for(const q of comparisons.slice(0,-1))room.seen.add(questionHistoryId('moreless:'+q.id));
 startMoreLess(room,noop);
 assert.equal(room.party.question.id,comparisons.at(-1).id);
 assert.equal(publicMoreLess(room,'a').historyId,questionHistoryId('moreless:'+comparisons.at(-1).id));
});
