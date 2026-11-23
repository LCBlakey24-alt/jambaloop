import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {test} from 'node:test';
import {expireParty,publicParty,rescuePotato} from '../party-games.js';

const sampleQuestion=prompt=>({
  prompt,type:'choice',options:['Left','Right','Middle','Pass'],correct:1,
});
function fakePotatoRoom(){
  const now=Date.now();
  const players=new Map([
    ['absent',{id:'p1',name:'Absent',score:0}],
    ['online',{id:'p2',name:'Online',score:0}],
  ]);
  return {
    mode:'potato',phase:'party-potato',players,host:'host',
    party:{holder:'absent',pool:[
      sampleQuestion('Another question'),sampleQuestion('One more question')
    ],question:sampleQuestion('Current question'),step:1,passes:0,rescues:0},
    lastSeen:new Map([['absent',now-30000],['online',now]]),
    liveConnections:new Map(),opened:now-30000,ends:now+60000,
    pausedAt:0,seen:new Set(),
  };
}

test('Hot Potato host recovery moves only an absent holder after grace and preserves the shared timer',()=>{
  const room=fakePotatoRoom();
  let publishes=0;
  const publish=()=>publishes++;
  const before=room.ends;
  assert.equal(publicParty(room,'host').canRescue,true);
  assert.equal(publicParty(room,'online').canRescue,false);
  assert.equal(publicParty(room,'online').question,undefined);
  assert.deepEqual(rescuePotato(room,publish),[204]);
  assert.equal(publishes,1);
  assert.equal(room.party.holder,'online');
  assert.equal(room.party.step,2);
  assert.equal(room.party.rescues,1);
  assert.equal(room.party.passes,0,'A host rescue is not a correct-answer pass');
  assert.deepEqual(room.party.last,{id:'p1',result:'rescue'});
  assert.equal(room.ends,before,'Recovery does not reset or extend the timer');
  assert.equal(publicParty(room,'host').question,undefined);
  const newHolder=publicParty(room,'online');
  assert.equal(newHolder.holding,true);
  assert.equal(newHolder.question.prompt,'Another question');
  assert.equal(newHolder.question.correct,undefined);
  assert.equal(newHolder.holderConnected,undefined);
  assert.equal(newHolder.canRescue,false);
  assert.equal(rescuePotato(room,publish)[0],409,'Connected holder cannot be reassigned');
  assert.equal(publishes,1);
});

test('Hot Potato recovery never bypasses connected grace, pause, expiry or a room with no recipient',()=>{
  const room=fakePotatoRoom();
  let publishes=0;
  const publish=()=>publishes++;
  room.lastSeen.set('absent',Date.now());
  assert.match(rescuePotato(room,publish)[1],/still connected|grace/i);
  room.lastSeen.set('absent',Date.now()-30000);
  room.pausedAt=Date.now();
  assert.match(rescuePotato(room,publish)[1],/Resume the timer/);
  room.pausedAt=0;
  room.lastSeen.set('online',Date.now()-30000);
  assert.match(rescuePotato(room,publish)[1],/No other connected players/);
  room.lastSeen.set('online',Date.now());
  room.ends=Date.now()-1;
  assert.equal(rescuePotato(room,publish)[0],409);
  assert.equal(room.phase,'finished');
  assert.equal(publishes,1);
  assert.equal(rescuePotato(room,publish)[0],409);
  assert.equal(publicParty(room,'online').question,undefined);
});

async function withServer(run){
  const child=spawn(process.execPath,['server.js'],{
    env:{...process.env,PORT:'0',PUBLIC_URL:''},
    stdio:['ignore','pipe','pipe']
  });
  let err='';
  child.stderr.on('data',chunk=>err+=String(chunk));
  try{
    const [out]=await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(([code])=>{throw Error('Server exited '+code+' '+err);}),
    ]);
    const origin=String(out).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(origin,'Server did not start '+err);
    const request=async(path,key,data,expected=200)=>{
      const response=await fetch(origin+'/api/rooms'+path,{
        method:data===undefined?'GET':'POST',
        headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
        ...(data===undefined?{}:{body:JSON.stringify(data)}),
        signal:AbortSignal.timeout(10000),
      });
      const result=response.status===204?undefined:await response.json();
      assert.equal(response.status,expected,path+': '+JSON.stringify(result));
      return result;
    };
    const room=async(mode,count=5,size=3)=>{
      const created=await request('',undefined,{
        mode,category:'mixed',format:'choice',count,seconds:0,
      },201);
      const path='/'+created.code;
      const keys=[];
      for(let i=0;i<size;i++){
        const player=await request(path+'/join',undefined,{name:'Guest '+i},201);
        keys.push(player.key);
      }
      const state=async(key=created.host)=>request(path,key);
      const advance=async()=>{
        const current=await state();
        return request(path+'/advance',created.host,{
          game:current.game,index:current.index,phase:current.phase
        },204);
      };
      const submit=async(key,action,more={},status=204)=>{
        const current=await state(key);
        return request(path+'/party',key,{
          game:current.game,index:current.index,action,...more
        },status);
      };
      return {...created,path,keys,state,advance,submit};
    };
    await run({request,room});
  }finally{child.kill();}
}

test('Hot Potato recovery endpoint is host-only, rejects stale turns and active holders',async()=>{
 await withServer(async({request,room})=>{
   const game=await room('potato',5,3);
   await game.advance();
   const initial=await game.state();
   assert.equal(initial.phase,'party-potato');
   assert.equal(initial.party.canRescue,false);
   const holder=game.keys[(await Promise.all(game.keys.map(key=>game.state(key))))
       .findIndex(state=>state.party.holding)];
   assert.ok(holder);
   const body={game:initial.game,step:initial.party.step};
   const bad=request(game.path+'/potato-rescue',game.keys[1],body,403);
   assert.match((await bad).error,/TV host/);
   const current=await request(game.path+'/potato-rescue',game.host,body,409);
   assert.match(current.error,/still connected|grace/i);
   assert.equal((await game.state()).party.step,initial.party.step);
   const stale=await request(game.path+'/potato-rescue',game.host,{...body,step:0},409);
   assert.match(stale.error,/moved on/);
   const invalid=await game.submit(game.keys.find(key=>key!==holder),'answer',{
      step:initial.party.step,option:0
   },409);
   assert.match(invalid.error,/potato|moved on/);
 });
});

test('Fill the Blank preserves private hands, validates cards and votes, then reveals real scores',async()=>{
 await withServer(async({room})=>{
   const game=await room('cards',5,3);
   await game.advance();
   const lobby=await game.state();
   assert.equal(lobby.phase,'party-write');
   assert.equal(lobby.party.hand,undefined,'TV host must not see private cards');
   const states=await Promise.all(game.keys.map(key=>game.state(key)));
   assert.ok(states.every(state=>state.party.hand?.length===6));
   assert.ok(states.every(state=>state.party.ballot===undefined));
   const wrong=await game.submit(game.keys[0],'card',{option:999,index:0},400);
   assert.match(wrong.error,/Choose a card/);
   for(const key of game.keys) await game.submit(key,'card',{option:0,index:0});
   const vote=await game.state();
   assert.equal(vote.phase,'party-vote');
   assert.equal(vote.party.ballot.length,3);
   assert.ok(vote.party.ballot.every(item=>item.name===undefined&&item.votes===undefined));
   const privateBallots=await Promise.all(game.keys.map(key=>game.state(key)));
   for(let i=0;i<game.keys.length;i++){
     const key=game.keys[i];
     const theirs=privateBallots[i].party.ballot.find(item=>!item.yours);
     assert.ok(theirs);
     await game.submit(key,'vote',{id:theirs.id,index:0});
   }
   const revealed=await game.state();
   assert.equal(revealed.phase,'party-reveal');
   const totalVotes=revealed.party.ballot.reduce((n,row)=>n+row.votes,0);
   assert.equal(totalVotes,3);
   assert.equal(revealed.players.reduce((n,p)=>n+p.score,0),300);
   await game.advance();
   assert.equal((await game.state()).phase,'party-write');
   assert.equal((await game.state()).index,1);
 });
});
