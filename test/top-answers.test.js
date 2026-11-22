import assert from 'node:assert/strict';
import test from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {topAnswersPrompts,chooseTopAnswersPrompt} from '../top-answers.js';

async function withServer(run){
  const child=spawn(process.execPath,['server.js'],{
    cwd:new URL('..',import.meta.url).pathname,
    env:{...process.env,PORT:'0',PUBLIC_URL:''},
    stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',chunk=>stderr+=String(chunk));
  try{
    const [line]=await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(([code])=>{throw Error('Server exited '+code+': '+stderr)}),
    ]);
    const origin=String(line).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(origin,'Server did not launch: '+stderr);
    const request=async(path,key,data,status=200)=>{
      const response=await fetch(origin+'/api/rooms'+path,{
        method:data===undefined?'GET':'POST',
        headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
        ...(data===undefined?{}:{body:JSON.stringify(data)}),
      });
      const result=response.status===204?null:await response.json();
      assert.equal(response.status,status,
        'Unexpected '+path+' status: '+JSON.stringify(result));
      return result;
    };
    await run(request);
  }finally{child.kill();}
}

test('Top Answers has at least 80 original, coherent and non-repeating room poll questions',()=>{
  assert.ok(topAnswersPrompts.length>=80);
  const prompts=new Set();
  for(const prompt of topAnswersPrompts){
    assert.ok(prompt.prompt.endsWith('?'),prompt.prompt);
    assert.equal(prompt.options.length,4);
    assert.equal(new Set(prompt.options).size,4);
    assert.ok(prompt.options.every(option=>option.length>2));
    assert.ok(prompt.historyId);
    assert.ok(!prompts.has(prompt.prompt),'Duplicate subjective prompt: '+prompt.prompt);
    prompts.add(prompt.prompt);
    const unseen=chooseTopAnswersPrompt(new Set(['topanswers:'+prompt.prompt]));
    assert.notEqual(unseen.prompt,prompt.prompt);
  }
  const seen=new Set(topAnswersPrompts.slice(0,-1).map(prompt=>prompt.historyId));
  assert.equal(chooseTopAnswersPrompt(seen).prompt,topAnswersPrompts.at(-1).prompt,
    'Fresh-first selection chooses the last unplayed question');
});

test('Three-player survey and private prediction use real vote counts with accurate scoring',async()=>{
  await withServer(async request=>{
    const room=await request('',null,{mode:'topanswers',category:'mixed',format:'choice',count:3,seconds:0},201);
    const base='/'+room.code;
    const keys=[];
    for(const name of ['Alex','Bailey','Charlie'])keys.push((await request(base+'/join',null,{name},201)).key);
    const state=(key=room.host)=>request(base,key);
    const advance=async()=>{
      const s=await state();
      await request(base+'/advance',room.host,{phase:s.phase,index:s.index,game:s.game},204);
    };
    const submit=(key,action,option,index=0,status=204)=>
      request(base+'/party',key,{game:1,index,action,option},status);
    await advance();
    assert.equal((await state()).total,3);
    const patterns=[
      {votes:[0,0,1],guesses:[0,1,0],counts:[2,1,0,0],points:[140,20,140]},
      {votes:[0,1,2],guesses:[0,1,2],counts:[1,1,1,0],points:[120,120,120]},
      {votes:[3,3,3],guesses:[0,3,2],counts:[0,0,0,3],points:[0,160,0]},
    ];
    const prompts=new Set();
    for(let turn=0;turn<patterns.length;turn++){
      const expected=patterns[turn];
      let s=await state();
      assert.equal(s.phase,'top-poll');
      assert.equal(s.index,turn);
      assert.equal(s.party.type,'topanswers');
      assert.equal(s.party.options.length,4);
      assert.equal(s.party.counts,undefined,'TV must not know poll counts before reveal');
      assert.equal(s.party.results,undefined);
      assert.ok(!prompts.has(s.party.prompt),'New round must have a fresh prompt');
      prompts.add(s.party.prompt);
      assert.equal(s.party.pollResponseTarget,3);
      const badRole=await submit(room.host,'poll',0,turn,403);
      assert.match(badRole.error,/Join as a player/);
      const invalid=await submit(keys[0],'poll',4,turn,400);
      assert.match(invalid.error,/four answers/);
      await submit(keys[0],'poll',expected.votes[0],turn);
      assert.equal((await state()).phase,'top-poll');
      assert.equal((await state()).party.counts,undefined);
      assert.equal((await state(keys[1])).party.ownPoll,undefined,
        'A player can see only their own poll vote');
      assert.equal((await state(keys[0])).party.ownPoll,expected.votes[0]);
      const repeat=await submit(keys[0],'poll',expected.votes[0],turn,409);
      assert.match(repeat.error,/already locked/);
      await submit(keys[1],'poll',expected.votes[1],turn);
      await submit(keys[2],'poll',expected.votes[2],turn);
      s=await state();
      assert.equal(s.phase,'top-guess','Move on after every voter is locked');
      assert.equal(s.party.pollCount,3);
      assert.equal(s.party.counts,undefined);
      assert.equal(s.party.results,undefined);
      assert.equal(s.party.ownPoll,undefined,'Host never receives a player vote');
      const pollTooLate=await submit(keys[0],'poll',0,turn,409);
      assert.match(pollTooLate.error,/phase has ended/);
      await submit(keys[0],'guess',expected.guesses[0],turn);
      assert.equal((await state()).party.counts,undefined,'Prediction cannot leak survey results');
      assert.equal((await state(keys[1])).party.ownPrediction,undefined);
      const wrongIndex=await submit(keys[1],'guess',-1,turn,400);
      assert.match(wrongIndex.error,/four answers/);
      await submit(keys[1],'guess',expected.guesses[1],turn);
      await submit(keys[2],'guess',expected.guesses[2],turn);
      s=await state();
      assert.equal(s.phase,'top-reveal');
      assert.deepEqual(s.party.counts,expected.counts);
      assert.equal(s.party.results.totalVotes,3);
      assert.deepEqual(s.party.results.leaders,
        expected.counts.map((v,i)=>v===Math.max(...expected.counts)?i:-1).filter(i=>i!==-1));
      for(let i=0;i<3;i++){
        const personal=await state(keys[i]);
        assert.equal(personal.party.earned,expected.points[i]);
        assert.equal(personal.party.ownPoll,expected.votes[i]);
        assert.equal(personal.party.ownPrediction,expected.guesses[i]);
      }
      const stale=await submit(keys[0],'guess',0,turn,409);
      assert.match(stale.error,/phase has ended/);
      await advance();
    }
    const finished=await state();
    assert.equal(finished.phase,'finished');
    assert.deepEqual(finished.players.map(p=>[p.name,p.score]),[
      ['Bailey',300],['Alex',260],['Charlie',260],
    ]);
    assert.equal(finished.players.reduce((sum,p)=>sum+p.score,0),820);
  });
});

test('Host can finish unresponsive polls; no votes cannot produce imaginary popularity winners',async()=>{
  await withServer(async request=>{
    const room=await request('',null,{mode:'topanswers',category:'mixed',format:'choice',count:3,seconds:0},201);
    const base='/'+room.code;
    const keys=[];
    for(const name of ['Alex','Bailey','Charlie'])keys.push((await request(base+'/join',null,{name},201)).key);
    const state=()=>request(base,room.host);
    const advance=async()=>{const s=await state();
      await request(base+'/advance',room.host,{game:s.game,index:s.index,phase:s.phase},204);
    };
    await advance();
    assert.equal((await state()).phase,'top-poll');
    await advance();
    assert.equal((await state()).phase,'top-guess');
    for(let i=0;i<keys.length;i++)await request(base+'/party',keys[i],
      {game:1,index:0,action:'guess',option:i},204);
    const reveal=await state();
    assert.equal(reveal.phase,'top-reveal');
    assert.deepEqual(reveal.party.counts,[0,0,0,0]);
    assert.deepEqual(reveal.party.results.leaders,[]);
    assert.ok(reveal.players.every(player=>player.score===0),'No real votes means no points can be awarded');
    for(const key of keys){
      const view=await request(base,key);
      assert.equal(view.party.earned,0);
    }
    await advance();
    assert.equal((await state()).phase,'top-poll');
    await request(base+'/party',keys[0],{game:1,index:1,action:'poll',option:0},204);
    await advance();
    const newGuess=await state();
    assert.equal(newGuess.phase,'top-guess');
    assert.equal(newGuess.party.pollCount,1);
    await advance();
    assert.equal((await state()).phase,'top-reveal',
      'The host can reveal if a contestant never locks a prediction');
  });
});

test('Top Answers retains unseen prompts on returning player devices',async()=>{
  await withServer(async request=>{
    const room=await request('',null,{mode:'topanswers',category:'mixed',format:'choice',count:7,seconds:0},201);
    const base='/'+room.code;
    const known=topAnswersPrompts.slice(0,-1).map(p=>p.historyId);
    await request(base+'/join',null,{name:'Alex',seenQuestions:known},201);
    await request(base+'/join',null,{name:'Bailey'},201);
    await request(base+'/join',null,{name:'Charlie'},201);
    await request(base+'/advance',room.host,{phase:'lobby',index:0,game:1},204);
    const s=await request(base,room.host);
    assert.equal(s.party.historyId,topAnswersPrompts.at(-1).historyId);
  });
});

test('Top Answers enforces 30 player poll limit',async()=>{
  await withServer(async request=>{
    const room=await request('',null,{mode:'topanswers',category:'mixed',format:'choice',count:3,seconds:0},201);
    for(let i=0;i<30;i++)await request('/'+room.code+'/join',null,{name:'Voter '+i},201);
    const refused=await request('/'+room.code+'/join',null,{name:'Voter 31'},409);
    assert.match(refused.error,/full/i);
  });
});
