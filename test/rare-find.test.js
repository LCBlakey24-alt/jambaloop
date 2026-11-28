import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {rareFindBank,answerMapFor,normaliseRare,selectRarePrompt} from '../rare-find-bank.js';
import {advancePartyWhenReady} from '../party-games.js';
import {rareFindView} from '../public/rare-find-view.js';

async function withServer(run){
  const child=spawn(process.execPath,['server.js'],{
    cwd:new URL('..',import.meta.url).pathname,
    env:{...process.env,PORT:'0',PUBLIC_URL:''},
    stdio:['ignore','pipe','pipe'],
  });
  let errors='';
  child.stderr.on('data',chunk=>errors+=String(chunk));
  try {
    const [line]=await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(([code])=>{throw Error('Server exited '+code+': '+errors)}),
    ]);
    const origin=String(line).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(origin,'Server did not launch '+errors);
    const request=async(path,key,data,status=200)=>{
      const response=await fetch(origin+'/api/rooms'+path,{
        method:data===undefined?'GET':'POST',
        headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
        ...(data===undefined?{}:{body:JSON.stringify(data)}),
      });
      const payload=response.status===204?null:await response.json();
      assert.equal(response.status,status,'API '+path+': '+JSON.stringify(payload));
      return payload;
    };
    await run(request);
  }finally{child.kill();}
}
const desiredHistory=id=>rareFindBank.filter(p=>p.id!==id).map(p=>p.historyId);
async function makeGame(request,{promptId='solar-planets',count=3,names=['Alex','Bailey','Charlie'],settings={}}={}){
  const room=await request('',null,{mode:'rare',rareScoring:'room',category:'mixed',format:'choice',count,seconds:0,...settings},201);
  const base='/'+room.code;
  const keys=[];
  for(const name of names)keys.push((await request(base+'/join',null,{
    name,seenQuestions:desiredHistory(promptId),
  },201)).key);
  const state=async(key=room.host)=>request(base,key);
  const advance=async(key=room.host)=>{
    const s=await state();
    return request(base+'/advance',key,{game:s.game,index:s.index,phase:s.phase},204);
  };
  const submit=(key,text,index=0,status=204)=>
    request(base+'/party',key,{game:1,index,action:'write',text},status);
  const review=(key,token,decision,canonical='',index=0,status=204)=>
    request(base+'/party',key,{game:1,index,action:'review',token,decision,canonical},status);
  await advance();
  assert.equal((await state()).phase,'rare-write');
  return {room,base,keys,state,advance,submit,review};
}

test('Rare Find teams compete on average points across unequal teams and share tied victories',async()=>{
 await withServer(async request=>{
   const game=await makeGame(request,{settings:{playStyle:'teams',teamCount:2}});
   for(let round=0;round<3;round++){
     const state=await game.state();
     const prompt=rareFindBank.find(entry=>entry.prompt===state.party.prompt);
     for(let i=0;i<game.keys.length;i++)await game.submit(game.keys[i],prompt.answers[i],round);
     assert.deepEqual((await game.state()).teams.map(t=>[t.size,t.score]),[[2,200*(round+1)],[1,200*(round+1)]]);
     await game.advance();
   }
   assert.deepEqual((await game.state()).teamWinners.sort(),[0,1]);
 });
});

test('Rare Find bank has 30+ distinct inspectable finite answer sets, aliases and stable history IDs',()=>{
  assert.ok(rareFindBank.length>=30);
  assert.equal(new Set(rareFindBank.map(p=>p.id)).size,rareFindBank.length);
  assert.equal(new Set(rareFindBank.map(p=>p.prompt)).size,rareFindBank.length);
  const categories=new Set(rareFindBank.map(p=>p.category));
  assert.ok(categories.has('Science')&&categories.has('Geography')&&categories.has('Sports'));
  for(const p of rareFindBank){
    assert.ok(p.answers.length>=3);
    assert.equal(new Set(p.answers).size,p.answers.length);
    assert.ok(p.prompt.endsWith('.'));
    assert.ok(p.historyId);
    const answerMap=answerMapFor(p);
    for(const answer of p.answers)assert.equal(answerMap.get(normaliseRare(answer)),answer);
    for(const [canonical,aliases] of Object.entries(p.aliases))
      for(const alias of aliases)assert.equal(answerMap.get(normaliseRare(alias)),canonical);
    assert.notEqual(selectRarePrompt(new Set([p.historyId])).id,p.id);
  }
  assert.equal(normaliseRare(' THE  N. Ireland! '),'n ireland');
  assert.equal(answerMapFor(rareFindBank.find(p=>p.id==='elements-first20')).get('aluminum'),'Aluminium');
  assert.equal(answerMapFor(rareFindBank.find(p=>p.id==='solar-planets')).get('planet earth'),'Earth');
  assert.equal(answerMapFor(rareFindBank.find(p=>p.id==='compass-rose')).get('ne'),'North East');
  const onlyLast=new Set(rareFindBank.slice(0,-1).map(p=>p.historyId));
  assert.equal(selectRarePrompt(onlyLast).id,rareFindBank.at(-1).id);
});

test('A disconnected non-responder no longer blocks automatic Rare Find completion',()=>{
  const makePlayer=name=>({id:name,name,score:0,wins:0,streak:0,bestStreak:0,misses:0});
  const room={mode:'rare',phase:'rare-write',index:0,count:3,
    players:new Map([['alex',makePlayer('Alex')],['bailey',makePlayer('Bailey')],['casey',makePlayer('Casey')]]),
    livePlayers:new Map(),lastSeen:new Map(),
    party:{type:'rare',prompt:rareFindBank.find(prompt=>prompt.id==='solar-planets'),
      entries:new Map([['alex','Mercury'],['bailey','Venus']]),decisions:new Map(),audit:[]}};
  let publications=0;
  assert.equal(advancePartyWhenReady(room,()=>publications++),true);
  assert.equal(room.phase,'rare-reveal');
  assert.equal(publications,1);
  assert.equal(room.players.get('alex').score,200);
  assert.equal(room.players.get('bailey').score,200);
  assert.equal(room.players.get('casey').score,0);
});

test('Rare Find finale displays tied contestants at the same rank',()=>{
  const html=rareFindView({phase:'finished',index:2,total:3,party:{type:'rare'},players:[
    {name:'Alex',score:500},{name:'Bailey',score:500},{name:'Casey',score:200},
  ]},{host:true,canControl:false,escape:String,icons:()=>'',reply:''});
  assert.match(html,/<b>1\.<\/b> <span[^>]*>A<\/span>Alex/);
  assert.match(html,/<b>1\.<\/b> <span[^>]*>B<\/span>Bailey/);
  assert.match(html,/<b>3\.<\/b> <span[^>]*>C<\/span>Casey/);
  assert.doesNotMatch(html,/<b>2\.<\/b>/);
});

test('Unique and matching accepted answers score fairly and remain invisible before reveal',async()=>{
  await withServer(async request=>{
    const game=await makeGame(request);
    const {room,keys,state,advance,submit}=game;
    const initial=await state();
    assert.equal(initial.total,3);
    assert.equal(initial.party.prompt,rareFindBank.find(p=>p.id==='solar-planets').prompt);
    assert.equal(initial.party.results,undefined);
    assert.equal(initial.party.reviews,undefined);
    assert.equal(initial.party.source,undefined);
    const disallowed=await submit(room.host,'Mercury',0,403);
    assert.match(disallowed.error,/Join as a player/);
    const invalid=await submit(keys[0],'<script>',0,400);
    assert.match(invalid.error,/clear answer/i);
    await submit(keys[0],'Mercury');
    assert.equal((await state()).phase,'rare-write');
    assert.equal((await state()).party.results,undefined);
    assert.equal((await state(keys[1])).party.ownAnswer,undefined);
    assert.equal((await state(keys[0])).party.ownAnswer,'Mercury');
    assert.equal((await state()).party.submissions,1);
    const repeated=await submit(keys[0],'Venus',0,409);
    assert.match(repeated.error,/already locked/);
    await submit(keys[1],' mercury ');
    await submit(keys[2],'Planet Earth');
    const revealed=await state();
    assert.equal(revealed.phase,'rare-reveal','All catalogued answers reveal automatically');
    const groups=revealed.party.results.groups;
    assert.equal(groups.length,2);
    assert.equal(groups.find(g=>g.answer==='Mercury').count,2);
    assert.equal(groups.find(g=>g.answer==='Mercury').points,100);
    assert.equal(groups.find(g=>g.answer==='Earth').count,1);
    assert.equal(groups.find(g=>g.answer==='Earth').points,200);
    assert.ok(revealed.players.length===0||revealed.players.every(row=>Number.isFinite(row.score)),
      'If the room displays live standings, scores must only be published after the answer reveal');
    assert.equal((await state(keys[0])).party.earned,100);
    assert.equal((await state(keys[2])).party.earned,200);
    const stale=await submit(keys[0],'Venus',0,409);
    assert.match(stale.error,/stage has ended/);
    await advance();
    assert.equal((await state()).index,1);
    assert.equal((await state()).phase,'rare-write');
    // Complete two more rounds with valid replies chosen from the registered source bank.
    for(let index=1;index<3;index++){
      const s=await state();
      const source=rareFindBank.find(q=>q.prompt===s.party.prompt);
      assert.ok(source);
      await submit(keys[0],source.answers[0],index);
      await submit(keys[1],source.answers[0],index);
      await submit(keys[2],source.answers[1],index);
      assert.equal((await state()).phase,'rare-reveal');
      await advance();
    }
    const end=await state();
    assert.equal(end.phase,'finished');
    assert.equal(end.players.length,3);
    assert.equal(end.players[0].score,600);
    assert.equal(end.players[1].score,300);
    assert.equal(end.players[2].score,300);
  });
});

test('Only the host can adjudicate; approved synonyms share rarity groups; audit records review actions',async()=>{
  await withServer(async request=>{
    const {room,keys,state,advance,submit,review}=await makeGame(request,{promptId:'uk-countries'});
    await submit(keys[0],'Wales');
    await submit(keys[1],'Cymru');
    await submit(keys[2],'Narnia');
    let s=await state();
    assert.equal(s.phase,'rare-review');
    assert.equal(s.party.reviewCount,2);
    assert.equal(s.party.remaining,2);
    assert.match(s.party.reviewSource,/ons\.gov\.uk/,'Reviewing host must have the source reference');
    assert.equal(s.party.results,undefined,'Premature score reveal is prohibited');
    const player=await state(keys[0]);
    assert.equal(player.party.reviews,undefined);
    assert.equal(player.party.answerChoices,undefined);
    assert.equal(player.party.reviewSource,undefined,'Only the TV host receives review source controls');
    assert.equal(player.party.ownAnswer,'Wales');
    assert.equal(player.party.results,undefined);
    const rows=s.party.reviews;
    const cymru=rows.find(row=>row.answer==='Cymru');
    const narnia=rows.find(row=>row.answer==='Narnia');
    assert.ok(cymru&&narnia);
    const playerCannotApprove=await review(keys[0],cymru.token,'approve','Wales',0,403);
    assert.match(playerCannotApprove.error,/Only the TV host/);
    const badCanonical=await review(room.host,cymru.token,'approve','Atlantis',0,400);
    assert.match(badCanonical.error,/recognised answer/);
    const badToken=await review(room.host,'u999','approve','Wales',0,400);
    assert.match(badToken.error,/currently under review/);
    await advance(); // Attempts to bypass incomplete review must not expose answers.
    assert.equal((await state()).phase,'rare-review');
    await review(room.host,cymru.token,'approve','Wales');
    await review(room.host,narnia.token,'reject');
    s=await state();
    assert.equal(s.party.remaining,0);
    assert.equal(s.party.reviews.find(r=>r.answer==='Cymru').canonical,'Wales');
    assert.equal(s.party.reviews.find(r=>r.answer==='Narnia').decision,'reject');
    assert.equal(s.party.results,undefined);
    await advance();
    s=await state();
    assert.equal(s.phase,'rare-reveal');
    const wales=s.party.results.groups.find(g=>g.answer==='Wales');
    assert.equal(wales.count,2,'The alternate name Cymru should be matched to Wales, not counted as unique');
    assert.equal(wales.points,100);
    assert.equal(wales.reviewed,true);
    assert.equal(s.party.results.invalidCount,1);
    assert.equal(s.party.results.invalid[0].answer,'Narnia');
    assert.equal(s.party.audit.length,2);
    assert.equal(s.party.audit[0].canonical,'Wales');
    assert.equal((await state(keys[0])).party.earned,100);
    assert.equal((await state(keys[1])).party.earned,100);
    assert.equal((await state(keys[2])).party.earned,0);
  });
});

test('Host accepts a distinct legitimate answer with explicit disclosure and logs changed review decisions',async()=>{
  await withServer(async request=>{
    const {room,keys,state,submit,review,advance}=await makeGame(request,{promptId:'month-names'});
    await submit(keys[0],'January');
    await submit(keys[1],'Januarius');
    await submit(keys[2],'February');
    let s=await state();
    assert.equal(s.phase,'rare-review');
    const token=s.party.reviews[0].token;
    await review(room.host,token,'reject');
    await review(room.host,token,'approve','January');
    s=await state();
    assert.equal(s.party.reviews[0].canonical,'January');
    await advance();
    const result=await state();
    assert.equal(result.phase,'rare-reveal');
    assert.equal(result.party.results.groups.find(x=>x.answer==='January').count,2);
    assert.equal(result.party.audit.length,2);
    assert.equal(result.party.audit[1].previous.kind,'reject');
  });
});

test('Host can close stalled rounds; late player submissions fail with no fabricated score',async()=>{
  await withServer(async request=>{
    const {room,keys,state,submit,advance}=await makeGame(request);
    await submit(keys[0],'Venus');
    await advance();
    assert.equal((await state()).phase,'rare-reveal');
    assert.equal((await state(keys[0])).party.earned,200);
    assert.equal((await state(keys[1])).party.earned,0);
    const stale=await submit(keys[1],'Mercury',0,409);
    assert.match(stale.error,/stage has ended/);
    const captainCannotAdvance=await request('/'+room.code+'/advance',keys[0],
      {game:1,phase:'rare-reveal',index:0},403);
    assert.match(captainCannotAdvance.error,/TV host/);
    await advance();
    assert.equal((await state()).phase,'rare-write');
  });
});

test('Rare Find accepts only its three supported game lengths and preserves players on rematch',async()=>{
  await withServer(async request=>{
    for(const count of [3,5,7]){
      const room=await request('',null,{mode:'rare',rareScoring:'room',category:'mixed',count,format:'choice',seconds:0},201);
      assert.equal((await request('/'+room.code,room.host)).total,count);
    }
    const invalid=await request('',null,{mode:'rare',rareScoring:'room',category:'mixed',count:4,format:'choice',seconds:0},400);
    assert.match(invalid.error,/question count|Choose a game mode/i);

    const game=await makeGame(request);
    for(let round=0;round<3;round++){
      await game.advance();
      assert.equal((await game.state()).phase,'rare-reveal');
      await game.advance();
      assert.equal((await game.state()).phase,round===2?'finished':'rare-write');
    }
    const finished=await game.state();
    assert.equal(finished.playerCount,3);
    await request(game.base+'/rematch',game.room.host,{game:finished.game,sameGame:true},204);
    const lobby=await game.state();
    assert.equal(lobby.phase,'lobby');
    assert.equal(lobby.mode,'rare');
    assert.equal(lobby.total,3);
    assert.equal(lobby.playerCount,3);
    assert.ok(lobby.players.every(player=>player.score===0));
  });
});

test('Thirty Rare Find contestants can submit and receive real room rarity scores',async()=>{
  await withServer(async request=>{
    const room=await request('',null,{mode:'rare',rareScoring:'room',category:'mixed',count:3,format:'choice',seconds:0},201);
    const base='/'+room.code,keys=[];
    for(let i=0;i<30;i++)keys.push((await request(base+'/join',null,{name:'Finder '+i,
      seenQuestions:desiredHistory('solar-planets')},201)).key);
    const refused=await request('/'+room.code+'/join',null,{name:'Climber 31'},409);
    assert.match(refused.error,/full/i);
    await request(base+'/advance',room.host,{game:1,index:0,phase:'lobby'},204);
    for(const key of keys)await request(base+'/party',key,{game:1,index:0,action:'write',text:'Mercury'},204);
    const reveal=await request(base,room.host);
    assert.equal(reveal.phase,'rare-reveal');
    assert.equal(reveal.party.results.responded,30);
    assert.deepEqual(reveal.party.results.groups.map(group=>({answer:group.answer,count:group.count,points:group.points})),
      [{answer:'Mercury',count:30,points:50}]);
    assert.equal((await request(base,keys[0])).party.earned,50);
  });
});

test('Research panel awards different values for unseen-by-the-room answers and one shared-answer deduction',async()=>{
 const {panelBank}=await import('../rare-find-bank.js');
 await withServer(async request=>{
   const room=await request('',null,{mode:'rare',category:'mixed',format:'choice',count:3,seconds:0},201);
   const base='/'+room.code;
   const seenQuestions=panelBank.filter(p=>p.category!=='Chemical Element').map(p=>p.historyId);
   const keys=[];
   for(const name of ['Alex','Bea','Cleo','Drew'])keys.push((await request(base+'/join',null,{name,seenQuestions},201)).key);
   const state=async(key=room.host)=>request(base,key);
   assert.equal((await state()).rareScoring,'panel');
   await request(base+'/advance',room.host,{game:1,index:0,phase:'lobby'},204);
   assert.equal((await state()).party.prompt,'Name a chemical element.');
   for(const [i,text] of ['Yttrium','Oxygen','Aluminum','Aluminium'].entries()){
     assert.equal((await state(keys[i])).party.results,undefined);
     await request(base+'/party',keys[i],{game:1,index:0,action:'write',text},204);
   }
   const groups=(await state()).party.results.groups;
   assert.equal(groups.find(g=>g.answer==='oxygen').points,65);
   assert.equal(groups.find(g=>g.answer==='yttrium').points,191);
   const matched=groups.find(g=>g.answer==='aluminium');
   assert.equal(matched.count,2);
   assert.equal(matched.points,matched.basePoints-5);
 });
});
