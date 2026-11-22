import assert from 'node:assert/strict';
import test from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {normaliseSamePageAnswer,samePagePrompts} from '../same-page.js';

test('matching ignores case, punctuation, spacing and leading articles',()=>{
  assert.equal(normaliseSamePageAnswer(' The    PIZZA! '),normaliseSamePageAnswer('pizza'));
  assert.equal(normaliseSamePageAnswer('Tea & cake'),normaliseSamePageAnswer('Tea and cake'));
  assert.notEqual(normaliseSamePageAnswer('dog'),normaliseSamePageAnswer('dogs'));
  assert.ok(samePagePrompts.length>=50);
  assert.equal(new Set(samePagePrompts).size,samePagePrompts.length);
});

async function runServer(fn){
  const server=spawn(process.execPath,['server.js'],{
    cwd:new URL('..',import.meta.url).pathname,
    env:{...process.env,PORT:'0',PUBLIC_URL:''},
    stdio:['ignore','pipe','pipe'],
  });
  let error='';
  server.stderr.on('data',chunk=>error+=String(chunk));
  try{
    const [line]=await Promise.race([
      once(server.stdout,'data'),
      once(server,'exit').then(([code])=>{throw Error('Server exited '+code+': '+error)}),
    ]);
    const origin=String(line).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(origin,'Server failed to start: '+error);
    const request=async(path,key,data,status=200)=>{
      const response=await fetch(origin+'/api/rooms'+path,{
        method:data===undefined?'GET':'POST',
        headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
        ...(data===undefined?{}:{body:JSON.stringify(data)}),
      });
      const result=response.status===204?null:await response.json();
      assert.equal(response.status,status,JSON.stringify(result));
      return result;
    };
    await fn(request);
  }finally{server.kill();}
}

test('Same Page is playable: private answers, matches, multiple rounds and final winner',async()=>{
  await runServer(async request=>{
    const made=await request('',null,{
      mode:'samepage',category:'mixed',format:'choice',count:3,seconds:0,
      playStyle:'individual',
    },201);
    const path='/'+made.code;
    const participants=[];
    for(const name of ['Alex','Blake','Charlie']) {
      const joined=await request(path+'/join',null,{name},201);
      participants.push(joined.key);
    }
    const state=async key=>request(path,key??made.host);
    const advance=async()=>{const live=await state();return request(path+'/advance',made.host,
      {game:live.game,index:live.index,phase:live.phase},204);};
    const write=(key,index,text,status=204)=>request(path+'/party',key,
      {game:1,index,action:'write',text},status);
    await advance();
    let host=await state();
    assert.equal(host.phase,'party-write');
    assert.equal(host.total,3);
    assert.equal(host.party.type,'samepage');
    assert.ok(samePagePrompts.includes(host.party.prompt));
    assert.equal(host.party.groups,undefined);
    await write(participants[0],0,'The Pizza!');
    const early=await state(participants[1]);
    assert.equal(early.party.groups,undefined,'No answers revealed before result phase');
    assert.equal(early.party.ownAnswer,undefined,'Player cannot see another answer');
    assert.equal((await state(participants[0])).party.ownAnswer,'The Pizza!');
    assert.equal((await state()).party.ownAnswer,undefined,'TV must not receive private text');
    const duplicate=await write(participants[0],0,'Ice Cream',409);
    assert.match(duplicate.error,/already locked/);
    const hostAttempt=await write(made.host,0,'pizza',403);
    assert.match(hostAttempt.error,/Join this game/);
    await write(participants[1],0,'pizza');
    assert.equal((await state()).phase,'party-write');
    await write(participants[2],0,'Ice cream');
    host=await state();
    assert.equal(host.phase,'party-reveal','Auto reveal after all connected players answer');
    const matched=host.party.groups.find(group=>group.count===2);
    assert.ok(matched);
    assert.equal(matched.points,100);
    assert.deepEqual(matched.members.map(x=>x.name).sort(),['Alex','Blake']);
    const snapshots=await Promise.all(participants.map(key=>state(key)));
    assert.deepEqual(snapshots.map(s=>s.player.score),[100,100,0]);
    assert.deepEqual(snapshots.map(s=>s.party.earned),[100,100,0]);
    const rejected=await write(participants[2],0,'Pizza',409);
    assert.match(rejected.error,/ended/);
    await advance();
    host=await state();
    assert.equal(host.phase,'party-write');
    assert.equal(host.index,1);
    assert.notEqual(host.party.prompt,early.party.prompt,'Prompts do not repeat in a session');
    await write(participants[0],1,'Dog');
    await write(participants[1],1,'Cat');
    await write(participants[2],1,'Mouse');
    assert.equal((await state()).party.groups.filter(g=>g.points>0).length,0);
    await advance();
    assert.equal((await state()).index,2);
    // Host can close a stalled round and still show actual scored answers.
    await write(participants[2],2,'a bike');
    await advance();
    assert.equal((await state()).phase,'party-reveal');
    await advance();
    host=await state();
    assert.equal(host.phase,'finished');
    assert.equal(host.players[0].score,100);
    assert.equal(host.players[1].score,100);
    assert.equal(host.players[2].score,0);
  });
});

test('Same Page refuses empty/malformed answers and preserves next-game role checks',async()=>{
  await runServer(async request=>{
    const made=await request('',null,{mode:'samepage',category:'mixed',format:'choice',count:5,seconds:0},201);
    const path='/'+made.code;
    const keys=[];
    for(const name of ['One','Two','Three'])keys.push((await request(path+'/join',null,{name},201)).key);
    await request(path+'/advance',made.host,{phase:'lobby',game:1,index:0},204);
    const write=(text)=>request(path+'/party',keys[0],{game:1,index:0,action:'write',text},400);
    assert.match((await write(' ')).error,/1 to 60/);
    assert.match((await write('x'.repeat(61))).error,/1 to 60/);
    assert.match((await write('!!!')).error,/letters or numbers/);
    const stale=await request(path+'/party',keys[0],{game:1,index:2,action:'write',text:'valid'},409);
    assert.match(stale.error,/ended/);
  });
});
