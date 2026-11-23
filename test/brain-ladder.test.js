import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {brainPuzzleBank,drawBrainPuzzle} from '../brain-ladder.js';

async function withServer(fn){
  const child=spawn(process.execPath,['server.js'],{
    cwd:new URL('..',import.meta.url).pathname,
    env:{...process.env,PORT:'0',PUBLIC_URL:''},
    stdio:['ignore','pipe','pipe'],
  });
  let error='';
  child.stderr.on('data',chunk=>error+=String(chunk));
  try{
    const [line]=await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(([code])=>{throw Error('Server quit '+code+': '+error)}),
    ]);
    const origin=String(line).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(origin,'Server failed to start: '+error);
    const request=async(path,key,data,status=200)=>{
      const reply=await fetch(origin+'/api/rooms'+path,{
        method:data===undefined?'GET':'POST',
        headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
        ...(data===undefined?{}:{body:JSON.stringify(data)}),
      });
      const result=reply.status===204?null:await reply.json();
      assert.equal(reply.status,status,'API request '+path+': '+JSON.stringify(result));
      return result;
    };
    await fn(request);
  } finally {child.kill();}
}
const correctIndex = question => {
  const all=brainPuzzleBank.flat();
  const model=all.find(q=>q.prompt===question.prompt);
  assert.ok(model,'Question must exist in the original logic generator');
  const index=question.options.indexOf(model.answer);
  assert.ok(index>=0,'The calculated answer must appear among the four options');
  return index;
};
const otherIndex=question=>(correctIndex(question)+1)%4;

test('All 240 original Brain Ladder puzzles have one calculable answer, four distinct choices and an explanation',()=>{
  assert.equal(brainPuzzleBank.length,10);
  assert.ok(brainPuzzleBank.every(tier=>tier.length===24));
  const seen=new Set();
  for(let level=1;level<=10;level++){
    for(const p of brainPuzzleBank[level-1]){
      assert.equal(p.level,level);
      assert.equal(p.options.length,4);
      assert.equal(new Set(p.options).size,4);
      assert.equal(p.options.filter(o=>o===p.answer).length,1);
      assert.ok(p.explanation.length>16);
      assert.ok(!seen.has(p.prompt),'Generated puzzle duplicated: '+p.prompt);
      seen.add(p.prompt);
      const q=drawBrainPuzzle(level,new Set([p.id]));
      assert.notEqual(q.id,p.id,'Fresh-first selection must skip an already seen puzzle');
    }
  }
  assert.equal(seen.size,240);
  assert.equal(brainPuzzleBank[0][0].answer,'10');
  assert.equal(brainPuzzleBank[1][0].answer,'8');
  assert.equal(brainPuzzleBank[2][0].answer,'Tuesday');
  assert.equal(brainPuzzleBank[3][0].answer,'6');
  assert.equal(brainPuzzleBank[4][0].answer,'20');
  assert.equal(brainPuzzleBank[5][0].answer,'3');
  assert.equal(brainPuzzleBank[6][0].answer,'27');
  assert.equal(brainPuzzleBank[7][0].answer,'Green');
  assert.equal(brainPuzzleBank[8][0].answer,'9');
  assert.equal(brainPuzzleBank[9][0].answer,'15');
});

test('Three players climb, answers stay secret, eliminated players spectate, final scores remain accurate',async()=>{
  await withServer(async request=>{
    const room=await request('',null,{mode:'brain',category:'mixed',format:'choice',count:5,seconds:0},201);
    const url='/'+room.code;
    const keys=[];
    for(const name of ['Alex','Blake','Charlie'])keys.push((await request(url+'/join',null,{name},201)).key);
    const state=(key=room.host)=>request(url,key);
    const advance=async()=>{
      const s=await state();
      await request(url+'/advance',room.host,{phase:s.phase,index:s.index,game:s.game},204);
    };
    const answer=(key,option,stage,status=204)=>request(url+'/party',key,{
      game:1,index:stage,action:'answer',option,
    },status);
    await advance();
    let s=await state();
    assert.equal(s.phase,'brain-question');
    assert.equal(s.total,5);
    assert.equal(s.party.question.correct,undefined);
    assert.equal(s.party.question.explanation,undefined);
    assert.equal(s.party.remaining,3);
    assert.deepEqual(s.party.roster.map(p=>p.lives),[2,2,2]);
    const one=s.party.question;
    const badHost=await answer(room.host,0,0,403);
    assert.match(badHost.error,/Join as a player/);
    const invalid=await answer(keys[0],9,0,400);
    assert.match(invalid.error,/four answers/);
    await answer(keys[0],correctIndex(one),0);
    assert.equal((await state()).phase,'brain-question');
    assert.equal((await state()).party.question.correct,undefined);
    const privateState=await state(keys[1]);
    assert.equal(privateState.party.ownAnswer,undefined);
    assert.equal(privateState.party.submissions,1);
    assert.equal(privateState.party.question.explanation,undefined);
    const dup=await answer(keys[0],otherIndex(one),0,409);
    assert.match(dup.error,/already locked/);
    await answer(keys[1],otherIndex(one),0);
    await answer(keys[2],otherIndex(one),0);
    s=await state();
    assert.equal(s.phase,'brain-reveal');
    assert.equal(s.party.question.correct,correctIndex(one));
    assert.match(s.party.question.explanation,/.{16}/);
    assert.deepEqual(s.party.roster.map(p=>p.lives),[2,1,1]);
    assert.equal(s.party.outcomes.filter(o=>o.correct).length,1);
    assert.equal((await state(keys[0])).party.earned,100);
    const stale=await answer(keys[0],0,0,409);
    assert.match(stale.error,/closed/);
    await advance();
    s=await state();
    assert.equal(s.index,1);
    assert.equal(s.phase,'brain-question');
    assert.notEqual(s.party.question.prompt,one.prompt);
    await answer(keys[0],correctIndex(s.party.question),1);
    await answer(keys[1],otherIndex(s.party.question),1);
    await answer(keys[2],otherIndex(s.party.question),1);
    s=await state();
    assert.equal(s.phase,'brain-reveal');
    assert.deepEqual(s.party.roster.map(p=>p.lives),[2,0,0]);
    assert.equal(s.party.remaining,1);
    await advance();
    s=await state();
    assert.equal(s.index,2);
    assert.equal(s.party.responseTarget,1);
    const spectate=await answer(keys[1],0,2,403);
    assert.match(spectate.error,/spectating/);
    for(let level=2;level<5;level++){
      s=await state();
      assert.equal(s.party.level,level+1);
      await answer(keys[0],correctIndex(s.party.question),level);
      assert.equal((await state()).phase,'brain-reveal','One survivor should auto-reveal without waiting on eliminated players');
      await advance();
    }
    const done=await state();
    assert.equal(done.phase,'finished');
    assert.equal(done.party.remaining,1);
    assert.equal(done.players[0].name,'Alex');
    assert.equal(done.players[0].score,100+120+140+160+180);
    assert.equal(done.players.reduce((sum,p)=>sum+p.score,0),700);
    assert.equal(done.party.roster.filter(p=>p.lives>0).length,1);
  });
});

test('Brain Ladder finishes early if no players survive and respects each selected level count',async()=>{
  await withServer(async request=>{
    const created=await request('',null,{mode:'brain',category:'mixed',format:'choice',count:10,seconds:0},201);
    const base='/'+created.code;
    const keys=[];
    for(const name of ['A','B'])keys.push((await request(base+'/join',null,{name},201)).key);
    const state=()=>request(base,created.host);
    const advance=async()=>{const s=await state();await request(base+'/advance',created.host,{game:s.game,index:s.index,phase:s.phase},204);};
    await advance();
    assert.equal((await state()).total,10);
    for(let level=0;level<2;level++){
      const live=await state();
      for(const key of keys)await request(base+'/party',key,{game:1,index:level,action:'answer',option:otherIndex(live.party.question)},204);
      assert.equal((await state()).phase,'brain-reveal');
      await advance();
    }
    const finished=await state();
    assert.equal(finished.phase,'finished');
    assert.equal(finished.index,1,'The last played level should remain visible on the result state');
    assert.equal(finished.party.remaining,0);
  });
});

test('Returning devices keep unseen Brain Ladder puzzles ahead of previously played variants',async()=>{
  await withServer(async request=>{
    const created=await request('',null,{mode:'brain',category:'mixed',format:'choice',count:7,seconds:0},201);
    const base='/'+created.code;
    const seen=brainPuzzleBank[0].slice(0,17).map(p=>p.historyId);
    await request(base+'/join',null,{name:'Returning',seenQuestions:seen},201);
    await request(base+'/join',null,{name:'Friend'},201);
    await request(base+'/advance',created.host,{game:1,index:0,phase:'lobby'},204);
    const live=await request(base,created.host);
    assert.equal(live.phase,'brain-question');
    assert.equal(live.party.question.historyId,brainPuzzleBank[0].at(-1).historyId);
  });
});

test('Brain Ladder limits a single game room to 30 contestants',async()=>{
  await withServer(async request=>{
    const room=await request('',null,{mode:'brain',category:'mixed',format:'choice',count:5,seconds:0},201);
    for(let i=0;i<30;i++) await request('/'+room.code+'/join',null,{name:'Climber '+i},201);
    const refused=await request('/'+room.code+'/join',null,{name:'Climber 31'},409);
    assert.match(refused.error,/full/i);
  });
});
