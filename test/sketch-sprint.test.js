import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {test} from 'node:test';
import {sketchPrompts,normaliseSketchGuess,chooseSketchPrompt} from '../sketch-prompts.js';
import {questionCounts} from '../public/game-config.js';
import {sketchView} from '../public/sketch-view.js';

async function withGame(run){
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',PUBLIC_URL:''},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',chunk=>stderr+=String(chunk));
 try{
  const [line]=await Promise.race([once(child.stdout,'data'),once(child,'exit').then(([code])=>{throw Error('Server exited '+code+': '+stderr)})]);
  const url=String(line).match(/http:\/\/localhost:\d+/)?.[0];assert.ok(url,'No server origin '+stderr);
  const request=async(path,key,data,status=200)=>{
   const response=await fetch(url+'/api/rooms'+path,{method:data===undefined?'GET':'POST',
    headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
    ...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(10000)});
   const value=response.status===204?null:await response.json();
   assert.equal(response.status,status,path+' '+JSON.stringify(value));
   return value;
  };
  const create=async(count=3,players=4)=>{
   const room=await request('',undefined,{mode:'sketch',format:'choice',category:'mixed',count,seconds:0,playStyle:'individual'},201);
   const path='/'+room.code,keys=[];
   for(let i=0;i<players;i++)keys.push((await request(path+'/join',undefined,{name:'Artist Friend '+i},201)).key);
   const state=async(key=room.host)=>request(path,key);
   const advance=async()=>{
    const s=await state();
    await request(path+'/advance',room.host,{game:s.game,index:s.index,phase:s.phase},204);
   };
   const submit=async(key,data,status=204)=>{
    const s=await state();
    return request(path+'/party',key,{game:s.game,index:s.index,...data},status);
   };
   return {room,path,keys,state,advance,submit,request};
  };
  await run({request,create});
 }finally{child.kill();}
}
test('Sketch Sprint has 300 unique drawable prompts, validated categories and 3/5/7 round settings',async()=>{
 assert.equal(sketchPrompts.length,300);
 assert.equal(new Set(sketchPrompts.map(p=>p.answer)).size,300);
 assert.equal(new Set(sketchPrompts.map(p=>p.id)).size,300);
 assert.ok(sketchPrompts.every(p=>p.category&&p.historyId&&p.answer.length>=3));
 assert.deepEqual(questionCounts('sketch','choice','mixed'),[3,5,7]);
 assert.equal(normaliseSketchGuess(' A   GIRÁFFE, riding a BICYCLE! '),'giraffe riding a bicycle');
 const first=chooseSketchPrompt();
 assert.notEqual(chooseSketchPrompt(new Set(['sketch:'+first.id])).id,first.id);
 await withGame(async({request,create})=>{
  for(const count of [3,5,7]){
    const g=await create(count,3);
    assert.equal((await g.state()).total,count);
  }
  const bad=await request('',undefined,{mode:'sketch',format:'choice',category:'mixed',count:8,seconds:0},400);
  assert.match(bad.error,/question count|game mode|timer/i);
 });
});
test('Sketch Sprint secret prompt belongs only to artist; strokes and guesses are validated and scored once',async()=>{
 await withGame(async({create})=>{
  const g=await create(3,4);await g.advance();
  const host=await g.state();
  assert.equal(host.phase,'sketch-draw');
  assert.equal(host.party.type,'sketch');
  assert.equal(host.party.prompt,undefined);
  assert.equal(host.party.answer,undefined);
  assert.ok(host.ends>host.opened);
  const states=await Promise.all(g.keys.map(key=>g.state(key)));
  const artistIndex=states.findIndex(s=>s.party.drawing);
  assert.ok(artistIndex>=0);
  assert.equal(states.filter(s=>s.party.drawing).length,1);
  const artist=g.keys[artistIndex],answer=states[artistIndex].party.prompt;
  assert.ok(answer.length>=3);
  for(let i=0;i<4;i++)if(i!==artistIndex){
    assert.equal(states[i].party.prompt,undefined);
    assert.equal(states[i].party.answer,undefined);
    assert.ok(!JSON.stringify(states[i]).includes('"prompt":"'+answer+'"'));
  }
  assert.equal(host.party.strokes.length,0);
  const guest=g.keys.find(key=>key!==artist);
  await g.submit(guest,{action:'stroke',colour:'#17223d',weight:4,points:[[0,0],[400,400]]},403);
  await g.submit(artist,{action:'stroke',colour:'#ff00ff',weight:4,points:[[0,0],[400,400]]},400);
  await g.submit(artist,{action:'stroke',colour:'#17223d',weight:4,points:[[0,0],[1001,400]]},400);
  await g.submit(artist,{action:'stroke',colour:'#17223d',weight:4,points:[[0,0],[400,400]]});
  assert.equal((await g.state()).party.strokes.length,1);
  await g.submit(guest,{action:'guess',text:answer},204);
  assert.equal((await g.state(guest)).party.ownEarned,150);
  assert.equal((await g.state(guest)).party.guessed,true);
  await g.submit(guest,{action:'guess',text:answer},204);
  assert.equal((await g.state(guest)).party.ownEarned,150,'Repeat guesses cannot farm points');
  await g.submit(artist,{action:'guess',text:answer},403);
  const rest=g.keys.filter(key=>key!==artist&&key!==guest);
  await g.submit(rest[0],{action:'guess',text:answer});
  assert.equal((await g.state(rest[0])).party.ownEarned,100);
  await g.submit(rest[1],{action:'guess',text:answer});
  const reveal=await g.state();
  assert.equal(reveal.phase,'sketch-reveal','Round should end early when all guessers succeed');
  assert.equal(reveal.party.answer,answer);
  assert.equal(reveal.party.guessers.length,3);
  assert.equal(reveal.players.reduce((sum,p)=>sum+p.score,0),375,'150+100+75+50');
  assert.equal((await g.state(artist)).party.ownEarned,50);
  const html=sketchView(reveal,{host:true,canControl:true,escape:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;'),icons:()=>''});
  assert.match(html,/Picture revealed/);
  await g.submit(artist,{action:'stroke',colour:'#17223d',weight:4,points:[[0,0],[400,400]]},409);
  const oldIndex=reveal.index;
  await g.advance();
  const next=await g.state();
  assert.equal(next.index,oldIndex+1);
  assert.equal(next.phase,'sketch-draw');
  await g.request(g.path+'/party',guest,{game:next.game,index:oldIndex,action:'guess',text:answer},409);
 });
});
test('Sketch Sprint rotating artists, failed guesses and canvas clears cannot reveal secrets or farm points',async()=>{
 await withGame(async({create})=>{
  const g=await create(3,3);await g.advance();
  const artists=[];
  for(let round=0;round<3;round++){
   const clients=await Promise.all(g.keys.map(key=>g.state(key)));
   const who=clients.findIndex(c=>c.party.drawing);
   artists.push(who);
   const artist=g.keys[who],guest=g.keys[(who+1)%3];
   for(let i=0;i<5;i++)await g.submit(guest,{action:'guess',text:'wrong answer '+round+' '+i});
   assert.equal((await g.state(guest)).party.guessesMade,5);
   await g.submit(guest,{action:'guess',text:'one more'},409);
   await g.submit(artist,{action:'clear'});
   await g.submit(artist,{action:'clear'});
   await g.submit(artist,{action:'clear'});
   await g.submit(artist,{action:'clear'},409);
   assert.equal((await g.state()).party.strokes.length,0);
   assert.equal((await g.state()).party.prompt,undefined);
   await g.advance();
   const reveal=await g.state();
   assert.equal(reveal.phase,'sketch-reveal');
   assert.equal(reveal.party.guessers.length,0);
   await g.advance();
  }
  assert.equal(new Set(artists).size,3,'Each of the three players must get an artist turn before repetition');
  const finale=await g.state();
  assert.equal(finale.phase,'finished');
  assert.equal(finale.players.reduce((sum,p)=>sum+p.score,0),0);
 });
});
