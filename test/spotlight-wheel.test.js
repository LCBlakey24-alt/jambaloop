import assert from 'node:assert/strict';
import test from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {makeQuestions} from '../questions.js';

async function withServer(run) {
  const child=spawn(process.execPath,['server.js'],{
    cwd:new URL('..',import.meta.url).pathname,
    env:{...process.env,PORT:'0',PUBLIC_URL:''},
    stdio:['ignore','pipe','pipe'],
  });
  let err='';
  child.stderr.on('data',chunk=>err+=String(chunk));
  try {
    const [line]=await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(([status])=>{throw Error('Server exited '+status+': '+err);}),
    ]);
    const origin=String(line).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(origin,'Could not start server: '+err);
    const request=async(path,key,data,status=200)=>{
      const response=await fetch(origin+'/api/rooms'+path,{
        method:data===undefined?'GET':'POST',
        headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
        ...(data===undefined?{}:{body:JSON.stringify(data)}),
      });
      const result=response.status===204?null:await response.json();
      assert.equal(response.status,status,'Unexpected status for '+path+': '+JSON.stringify(result));
      return result;
    };
    await run(request);
  } finally {child.kill();}
}

function correctOption(question) {
  const original=makeQuestions(question.category,100,new Set(),'choice')
    .find(candidate=>candidate.prompt===question.prompt);
  assert.ok(original,'Question must come from real library');
  const correctText=original.options[original.correct];
  const index=question.options.indexOf(correctText);
  assert.ok(index>=0,'Correct answer must be among public options');
  return index;
}

test('Spotlight rotates contestant, keeps expert hints confidential and scores both roles',async()=>{
  await withServer(async request=>{
    const made=await request('',null,{mode:'spotlight',category:'mixed',format:'choice',count:1,seconds:0},201);
    const base='/'+made.code;
    const keys=[];
    for(const name of ['Alex','Bailey','Charlie']) keys.push((await request(base+'/join',null,{name},201)).key);
    const state=(key=made.host)=>request(base,key);
    const advance=async(key=made.host)=>{
      const s=await state();
      return request(base+'/advance',key,{game:s.game,index:s.index,phase:s.phase},key===made.host?204:403);
    };
    const action=(key,type,option,index=0,status=204)=>request(base+'/party',key,{
      game:1,index,action:type,option,
    },status);
    const ids=new Map();
    for(const key of keys) ids.set((await state(key)).player.id,key);

    await advance();
    let s=await state();
    assert.equal(s.phase,'spotlight-ready');
    assert.equal(s.total,3,'Every player becomes contestant once, ignoring setup placeholder');
    assert.equal(s.party.question,undefined);
    const used=[];
    for(let turn=0;turn<3;turn++){
      s=await state();
      assert.equal(s.index,turn);
      assert.equal(s.phase,'spotlight-ready');
      const contestant=s.party.contestant;
      assert.ok(contestant?.id);
      used.push(contestant.id);
      await advance(keys[0]);
      assert.equal((await state()).phase,'spotlight-ready','Player cannot advance the TV stage');
      await advance();
      s=await state();
      assert.equal(s.phase,'spotlight-expert');
      assert.ok(s.party.question);
      assert.equal(s.party.question.correct,undefined);
      assert.notEqual(s.party.contestant.id,s.party.expert.id,'Contestant cannot help themselves');
      const correct=correctOption(s.party.question);
      const contestantKey=ids.get(s.party.contestant.id);
      const expertKey=ids.get(s.party.expert.id);
      const bystanderKey=keys.find(key=>key!==contestantKey&&key!==expertKey);
      assert.ok(bystanderKey);
      assert.equal((await state()).party.advice,undefined,'TV cannot see an unrevealed answer');
      assert.equal((await state(bystanderKey)).party.advice,undefined);
      assert.equal((await state(contestantKey)).party.advice,undefined);
      const attacker=await action(bystanderKey,'advice',correct,turn,403);
      assert.match(attacker.error,/selected expert/);
      if(turn===1){
        // Host's opt-in fallback should always be able to finish an unresponsive turn.
        await advance();
        assert.equal((await state()).phase,'spotlight-answer');
        await advance();
        s=await state();
        assert.equal(s.phase,'spotlight-reveal');
        assert.equal(s.party.points,0);
        assert.equal(s.party.expertPoints,0);
      } else {
        await action(expertKey,'advice',correct,turn);
        s=await state();
        assert.equal(s.phase,'spotlight-answer');
        assert.equal(s.party.advice,undefined,'Host must not see private advice');
        assert.equal((await state(bystanderKey)).party.advice,undefined,'Bystander must not see private advice');
        assert.equal((await state(contestantKey)).party.advice,correct,'Only the contestant receives the expert suggestion');
        const duplicate=await action(expertKey,'advice',correct,turn,409);
        assert.match(duplicate.error,/no longer available/);
        const invalid=await action(expertKey,'answer',correct,turn,403);
        assert.match(invalid.error,/Only the current contestant/);
        await action(contestantKey,'answer',turn===0?correct:(correct+1)%4,turn);
        s=await state();
        assert.equal(s.phase,'spotlight-reveal');
        assert.equal(s.party.question.correct,correct);
        assert.equal(s.party.expertPoints,40);
        assert.equal(s.party.points,turn===0?100:0);
      }
      assert.equal((await state()).party.choice, s.party.choice,'Reveal is public');
      const stale=await action(keys[0],'answer',0,turn,409);
      assert.match(stale.error,/no longer available/);
      await advance();
    }
    assert.equal((await state()).phase,'finished');
    assert.equal(new Set(used).size,3);
    const finished=await state();
    assert.equal(finished.players.reduce((sum,p)=>sum+p.score,0),180);
  });
});

test('Spotlight handles twenty individual players without duplicating contestant turns',async()=>{
  await withServer(async request=>{
    const made=await request('',null,{mode:'spotlight',category:'mixed',format:'choice',count:1,seconds:0},201);
    const base='/'+made.code;
    const keys=[];
    for(let i=0;i<20;i++) keys.push((await request(base+'/join',null,{name:'Guest '+i},201)).key);
    const full=await request(base+'/join',null,{name:'Guest 21'},409);
    assert.match(full.error,/full/i);
    const state=()=>request(base,made.host);
    const advance=async()=>{
      const s=await state();
      return request(base+'/advance',made.host,{game:s.game,index:s.index,phase:s.phase},204);
    };
    await advance();
    assert.equal((await state()).total,20);
    const turns=[];
    const topics=[];
    const prompts=[];
    for(let i=0;i<20;i++){
      let s=await state();
      turns.push(s.party.contestant.id);
      await advance();
      s=await state();
      assert.equal(s.phase,'spotlight-expert');
      assert.notEqual(s.party.contestant.id,s.party.expert.id);
      topics.push(s.party.question.category);
      prompts.push(s.party.question.prompt);
      await advance();
      await advance();
      assert.equal((await state()).phase,'spotlight-reveal');
      await advance();
    }
    assert.equal(new Set(turns).size,20);
    assert.equal(new Set(topics.slice(0,15)).size,15,'All fifteen playable topics appear before a topic repeats');
    assert.equal(new Set(prompts).size,20,'Every contestant receives an unseen question in this game');
    assert.equal((await state()).phase,'finished');
  });
});

test('Spotlight rejects incorrect role, stale round and invalid option indices',async()=>{
  await withServer(async request=>{
    const made=await request('',null,{mode:'spotlight',category:'mixed',format:'choice',count:3,seconds:0},201);
    const base='/'+made.code;
    const keys=[];
    for(let i=0;i<3;i++) keys.push((await request(base+'/join',null,{name:'Player '+i},201)).key);
    const advance=async()=>{const s=await request(base,made.host);
      await request(base+'/advance',made.host,{game:s.game,index:s.index,phase:s.phase},204);};
    await advance();
    await advance();
    const s=await request(base,made.host);
    const expert=keys.find(Boolean);
    const byId=await Promise.all(keys.map(async key=>({key,state:await request(base,key)})));
    const e=byId.find(x=>x.state.player.id===s.party.expert.id).key;
    for(const option of [-1,4,1.5,'1',null]) {
      const result=await request(base+'/party',e,{game:1,index:0,action:'advice',option},400);
      assert.match(result.error,/Choose an available answer/);
    }
    const stale=await request(base+'/party',e,{game:1,index:9,action:'advice',option:0},409);
    assert.match(stale.error,/round has changed/);
    const wrongGame=await request(base+'/party',e,{game:10,index:0,action:'advice',option:0},409);
    assert.match(wrongGame.error,/game has moved on/);
    const hostCannotAnswer=await request(base+'/party',made.host,{game:1,index:0,action:'advice',option:0},403);
    assert.match(hostCannotAnswer.error,/Join as a player/);
    assert.ok(expert);
  });
});

test('Spotlight extended games give every participant the same number of turns',async()=>{
  await withServer(async request=>{
    const made=await request('',null,{mode:'spotlight',category:'mixed',format:'choice',count:2,seconds:0},201);
    const base='/'+made.code;
    for(const name of ['Taylor','Robin','Jamie','Morgan']) await request(base+'/join',null,{name},201);
    const state=()=>request(base,made.host);
    const advance=async()=>{const s=await state();await request(base+'/advance',made.host,
      {phase:s.phase,game:s.game,index:s.index},204);};
    await advance();
    assert.equal((await state()).total,8);
    const counts=new Map();
    for(let i=0;i<8;i++){
      const s=await state();
      const id=s.party.contestant.id;
      counts.set(id,(counts.get(id)||0)+1);
      await advance(); // expert selection
      await advance(); // expert skipped
      await advance(); // no final answer
      await advance(); // next contestant or results
    }
    assert.equal((await state()).phase,'finished');
    assert.equal(counts.size,4);
    assert.deepEqual([...counts.values()].sort(),[2,2,2,2]);
  });
});
