import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {estimates} from '../extra-questions.js';
import {soCloseBank,soCloseAudit,soCloseSourceFor} from '../so-close-bank.js';
import {makeSoCloseQuestions,questionCategories} from '../questions.js';
import {modes,minimumPlayers} from '../public/game-config.js';
import {queuedSettings} from '../public/game-night.js';
import {revealPlan,revealFrame,stageFrame} from '../public/so-close-reveal.js';
import {soCloseRevealView,soCloseView,guessRows} from '../public/so-close-view.js';

test('So Close picker handles bounds and hides actual number while guessing',()=>{
  assert.ok(modes.some(([id])=>id==='soclose'));
  assert.equal(minimumPlayers('soclose'),2);
  assert.equal(queuedSettings('soclose','club').format,'estimate');
  assert.equal(queuedSettings('soclose','club').difficulty,'standard');
  assert.deepEqual(guessRows(0,0,10),[2,1,0,null,null]);
  assert.deepEqual(guessRows(10,0,10),[null,null,10,9,8]);
  const question={min:0,max:1000,unit:'metres',correct:917};
  const phone=soCloseView(question,{draft:500},String);
  assert.match(phone,/data-so-close-rows/);
  assert.match(phone,/data-range/);
  assert.match(phone,/data-number/);
  assert.doesNotMatch(phone,/917/);
  assert.doesNotMatch(soCloseView(question,{host:true},String),/917/);
  const locked=soCloseView(question,{selection:500},String);
  assert.match(locked,/GUESS LOCKED/);
  assert.doesNotMatch(locked,/submit-special/);
});

test('So Close server keeps guesses private and awards exact and tied closest points',async t=>{
  const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',PUBLIC_URL:''},stdio:['ignore','pipe','inherit']});
  t.after(()=>server.kill());
  const [output]=await once(server.stdout,'data');
  const origin=String(output).match(/http:\/\/localhost:\d+/)[0];
  async function request(path,key,body,status=200){
    const response=await fetch(origin+'/api/rooms'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},body:JSON.stringify(body)});
    const result=response.status===204?undefined:await response.json();
    assert.equal(response.status,status,JSON.stringify(result));
    return result;
  }
  const settings={mode:'soclose',category:'mixed',format:'estimate',count:5,seconds:0};
  await request('',undefined,{...settings,format:'choice'},400);
  await request('',undefined,{...settings,privateQuestions:true},400);
  const {code,host}=await request('',undefined,settings,201);
  const path='/'+code;
  const a=await request(path+'/join',undefined,{name:'A Player'},201);
  const b=await request(path+'/join',undefined,{name:'B Player'},201);
  const state=(key=host)=>request(path,key);
  async function advance(){
    const {game,index,phase}=await state();
    await request(path+'/advance',host,{game,index,phase},204);
  }
  await advance();
  const answerBank=new Map([...Object.values(estimates).flat().map(row=>[row[0],row[1]]),...soCloseBank.map(row=>[row.prompt,row.answer])]);
  for(let round=0;round<2;round++){
    const {question,game,index}=await state();
    assert.equal(question.type,'estimate');
    assert.equal(question.correct,undefined);
    const correct=answerBank.get(question.prompt);
    assert.ok(Number.isSafeInteger(correct));
    const nearby=correct<question.max?correct+1:correct-1;
    const optionA=round===0?correct:nearby;
    await request(path+'/answer',a.key,{game,index,option:question.max+1},400);
    await request(path+'/answer',a.key,{game,index,option:optionA},204);
    await request(path+'/answer',a.key,{game,index,option:nearby},204);
    assert.equal((await state()).estimateGuesses,undefined);
    assert.equal((await state(b.key)).selection,undefined);
    assert.equal((await state(a.key)).selection,optionA);
    await request(path+'/answer',b.key,{game,index,option:nearby},204);
    const scoresBefore=(await state()).players.map(({id,score})=>({id,score}));
    await advance();
    // Guess stage: names and numbers only. No actual value, outcome, points,
    // distances or updated standings can leak through any client's state.
    const reveal=await state();
    assert.equal(reveal.estimateReveal.stage,'guesses');
    assert.equal(reveal.question.correct,undefined);
    assert.equal(reveal.question.source,undefined);
    assert.equal(reveal.closest,undefined);
    assert.equal(reveal.estimateGuesses.length,2);
    for(const row of reveal.estimateGuesses)assert.deepEqual(Object.keys(row).sort(),['guess','id','name']);
    assert.deepEqual(reveal.players.map(({id,score})=>({id,score})),scoresBefore);
    const phoneA=await state(a.key);
    assert.equal(phoneA.answerCorrect,undefined);
    assert.equal(phoneA.earned,undefined);
    assert.equal(phoneA.question.correct,undefined);
    assert.equal(phoneA.player.score,scoresBefore.find(row=>row.id===phoneA.player.id).score);
    assert.equal(phoneA.selection,optionA);
    assert.equal((await state(b.key)).estimateGuesses,undefined);
    assert.deepEqual((await state(b.key)).estimateReveal,reveal.estimateReveal);
    assert.equal(reveal.estimateReveal.count,2);
    assert.equal(reveal.estimateReveal.before,undefined);
    await request(path+'/estimate-reveal-skip',b.key,{game,index},403);
    await request(path+'/estimate-reveal-skip',host,{game,index:index+1},409);
    if(round===0)await request(path+'/estimate-reveal-skip',host,{game,index},204);
    else{
      // A premature Next completes the reveal rather than skipping past it.
      await advance();
      assert.equal((await state()).index,index);
      assert.equal((await state()).phase,'reveal');
    }
    const results=await state();
    assert.equal((await state(b.key)).estimateReveal.skipped,true);
    assert.equal(results.estimateReveal.stage,'results');
    assert.equal(results.question.correct,correct);
    assert.deepEqual(results.estimateGuesses.map(row=>row.points),round===0?[200,0]:[100,100]);
    assert.equal((await state(a.key)).earned,round===0?200:100);
    assert.equal((await state(a.key)).answerCorrect,true);
    await advance();
  }
});

test('So Close server releases the actual answer and results on schedule',{timeout:20000},async t=>{
  const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',PUBLIC_URL:''},stdio:['ignore','pipe','inherit']});
  t.after(()=>server.kill());
  const [output]=await once(server.stdout,'data');
  const origin=String(output).match(/http:\/\/localhost:\d+/)[0];
  const call=async(path,key,body)=>{
    const response=await fetch(origin+'/api/rooms'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},body:JSON.stringify(body)});
    return response.status===204?undefined:response.json();
  };
  const {code,host}=await call('',undefined,{mode:'soclose',category:'mixed',format:'estimate',count:5,seconds:0});
  const a=await call('/'+code+'/join',undefined,{name:'Ada'});
  await call('/'+code+'/join',undefined,{name:'Bo'});
  const next=async()=>{const {game,index,phase}=await call('/'+code,host);await call('/'+code+'/advance',host,{game,index,phase});};
  await next();
  const {game,index,question}=await call('/'+code,host);
  await call('/'+code+'/answer',a.key,{game,index,option:question.min});
  await next();
  const {estimateReveal}=await call('/'+code,host);
  const plan=revealPlan(estimateReveal.count);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,estimateReveal.starts+ms-Date.now())));
  await wait(plan.duration-plan.actual+150);
  const answerStage=await call('/'+code,a.key);
  assert.equal(answerStage.estimateReveal.stage,'answer');
  assert.ok(Number.isFinite(answerStage.question.correct));
  assert.equal(answerStage.answerCorrect,undefined);
  assert.equal(answerStage.earned,undefined);
  await wait(plan.duration+150);
  const resultStage=await call('/'+code,a.key);
  assert.equal(resultStage.estimateReveal.stage,'results');
  assert.equal(resultStage.answerCorrect,true);
});

test('reveal shows each guess before answer and winner, and groups large rooms',()=>{
  const reveal={starts:10000,count:2,skipped:false};
  assert.deepEqual(revealFrame(reveal,10000),{kind:'opening',shown:0});
  assert.deepEqual(revealFrame(reveal,11000),{kind:'guesses',shown:1,from:0});
  assert.deepEqual(revealFrame(reveal,11900),{kind:'guesses',shown:2,from:1});
  assert.equal(revealFrame(reveal,12800).kind,'suspense');
  assert.equal(revealFrame(reveal,14600).kind,'actual');
  assert.equal(revealFrame(reveal,16300).kind,'winner');
  assert.equal(revealFrame({...reveal,skipped:true},10000).kind,'winner');
  assert.ok(revealPlan(300).groups<=10);
  assert.ok(revealPlan(300).duration<=14000);
  assert.equal(revealFrame({...reveal,count:0},11000).kind,'suspense');
  const state={estimateReveal:reveal,question:{correct:917,min:0,max:1000,unit:'metres'},estimateGuesses:[
    {id:'a',name:'Winner',guess:920,won:true,points:100,distance:3},
    {id:'b',name:'Other',guess:800,won:false,points:0,distance:117}
  ]};
  const guess=soCloseRevealView(state,{kind:'guesses',from:0,shown:1},true,String);
  assert.match(guess,/Other/);
  assert.doesNotMatch(guess,/917|Winner|100 pts/);
  const actual=soCloseRevealView(state,{kind:'actual',shown:2},true,String);
  assert.match(actual,/917/);
  assert.doesNotMatch(actual,/Winner|100 pts/);
  const finish=soCloseRevealView(state,{kind:'winner',shown:2},true,String);
  assert.match(finish,/Winner wins the round/);
  assert.match(finish,/Other/);
  const phone=soCloseRevealView({...state,selection:920,answerCorrect:true,earned:100},{kind:'suspense',shown:2},false,String);
  assert.doesNotMatch(phone,/917|100 pts|You win/);
});

test('clients hold the previous frame until the server releases that stage',()=>{
  const actual={kind:'actual',shown:3}, winner={kind:'winner',shown:3};
  assert.deepEqual(stageFrame(actual,{count:3,stage:'guesses'}),{kind:'suspense',shown:3});
  assert.deepEqual(stageFrame(winner,{count:3,stage:'guesses'}),{kind:'suspense',shown:3});
  assert.deepEqual(stageFrame(winner,{count:3,stage:'answer'}),{kind:'actual',shown:3});
  assert.deepEqual(stageFrame(winner,{count:3,stage:'results'}),winner);
  assert.deepEqual(stageFrame({kind:'guesses',shown:1,from:0},{count:3,stage:'guesses'}),{kind:'guesses',shown:1,from:0});
});

test('So Close measurement bank is structurally sound, sourced and preferred',()=>{
  assert.deepEqual(soCloseAudit(),[]);
  assert.ok(soCloseBank.length>=70,'At least seventy dedicated measurement prompts');
  for(const row of soCloseBank){
    assert.ok(questionCategories.includes(row.category),row.category);
    assert.equal(soCloseSourceFor(row.prompt),row.source);
    assert.equal(row.status,'sourced','Do not claim verification without a second check');
  }
  const prompts=new Set(soCloseBank.map(row=>row.prompt));
  const mixed=makeSoCloseQuestions('mixed',15,new Set());
  assert.equal(mixed.length,15);
  assert.equal(new Set(mixed.map(q=>q.prompt)).size,15,'No repeats in one match');
  assert.ok(mixed.every(q=>prompts.has(q.prompt)),'Mixed Bag uses the measurement bank');
  assert.ok(new Set(mixed.map(q=>q.category)).size>=8,'Mixed Bag spreads across subjects');
  for(const q of mixed)assert.ok(q.type==='estimate'&&q.min<q.correct&&q.correct<q.max);
  // Unseen prompts come first; a thin category tops up from the estimate bank without repeats.
  const seen=new Set(soCloseBank.filter(row=>row.category==='space').slice(0,3).map(row=>row.prompt));
  const space=makeSoCloseQuestions('space',5,seen);
  assert.ok(space.slice(0,2).every(q=>!seen.has(q.prompt)));
  const art=makeSoCloseQuestions('art',5,new Set());
  assert.equal(art.length,5);
  assert.equal(new Set(art.map(q=>q.prompt)).size,5);
  assert.ok(art.some(q=>prompts.has(q.prompt)));
});
