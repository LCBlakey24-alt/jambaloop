import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
let server;
let origin;
before(async () => {
  server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:'0',PUBLIC_URL:''},stdio:['ignore','pipe','pipe']});
  let stderr='';server.stderr.on('data',x=>stderr+=String(x));
  const [line]=await Promise.race([
    once(server.stdout,'data'),
    once(server,'exit').then(([code])=>{throw new Error('Server exited '+code+': '+stderr)}),
    delay(10000).then(()=>{throw new Error('Server startup timeout: '+stderr)}),
  ]);
  origin=String(line).match(/http:\/\/localhost:\d+/)?.[0];
  assert.ok(origin,'Server did not provide listening address: '+line);
});
after(()=>server?.kill());
const config={mode:'quizrace',format:'choice',category:'general',count:5,seconds:0,raceLength:'short',raceDifficulty:'medium',raceTrack:'neon'};
async function request(path,body, key, status=200){
  const res=await fetch(origin+'/api/rooms'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal(res.status,status,await res.clone().text());
  return res.status===204?undefined:res.json();
}

test('Quiz Race integrates with rooms, private questions, pause and answer validation',async()=>{
  const room=await request('',config,undefined,201);
  const path='/'+room.code;
  const alice=await request(path+'/join',{name:'Alex'},undefined,201);
  const bob=await request(path+'/join',{name:'Blake'},undefined,201);
  const lobby=await request(path,undefined,room.host);
  assert.equal(lobby.mode,'quizrace');
  assert.equal(lobby.playerCount,2);
  assert.equal(lobby.race,undefined);
  await request(path+'/advance',{game:1,phase:'lobby',index:0},room.host,204);
  const starting=await request(path,undefined,room.host);
  assert.equal(starting.phase,'race-countdown');
  assert.equal(starting.race.track,'neon');
  assert.equal(starting.race.length,70);
  assert.equal(starting.race.own,undefined);
  await delay(3400);
  const host=await request(path,undefined,room.host);
  const a=await request(path,undefined,alice.key);
  const b=await request(path,undefined,bob.key);
  assert.equal(host.phase,'race');
  assert.ok(a.race.own.question);
  assert.equal(b.race.own.question.id,1);
  assert.ok(a.race.own.question.options.length>=4);
  assert.ok(host.race.racers.some(x=>x.distance>0));
  assert.equal(host.race.own,undefined);
  assert.equal(JSON.stringify(host.race).includes(a.race.own.question.prompt),false);
  assert.equal(b.race.own.question.correct,undefined);
  const q=a.race.own.question;
  await request(path+'/race-answer',{game:1,questionId:q.id,pass:true},alice.key,204);
  const rejected=await fetch(origin+'/api/rooms'+path+'/race-answer',{method:'POST',headers:{'content-type':'application/json','x-game-key':alice.key},body:JSON.stringify({game:1,questionId:q.id,pass:true})});
  assert.equal(rejected.status,409);
  const old=await request(path,undefined,alice.key);
  assert.equal(old.race.own.passed,1);
  await request(path+'/pause',{phase:'race',paused:true,game:1,index:0,clockVersion:old.clockVersion},room.host,204);
  const frozen=await request(path,undefined,alice.key);
  assert.ok(frozen.pausedAt);
  assert.ok(frozen.race.paused);
  const before=frozen.race.racers.find(x=>x.id===frozen.player.id).distance;
  await delay(320);
  const after=await request(path,undefined,alice.key);
  assert.equal(after.race.racers.find(x=>x.id===after.player.id).distance,before);
  await request(path+'/pause',{phase:'race',paused:false,game:1,index:0,clockVersion:after.clockVersion},room.host,204);
  assert.equal((await request(path,undefined,room.host)).race.paused,false);
});
