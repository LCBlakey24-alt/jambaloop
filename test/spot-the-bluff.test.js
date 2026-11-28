import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {test} from 'node:test';
import {questionCounts} from '../public/game-config.js';
import {bluffView} from '../public/bluff-view.js';
import {bluffHint, bluffShapes} from '../bluff-hints.js';
import {bluffPromptCount, bluffScores} from '../party-games.js';
import {bluffV6} from '../bluff-prompts-v6.js';
import {setTimeout as delay} from 'node:timers/promises';

async function withServer(work,unmask='0'){
 const server=spawn(process.execPath,['server.js'],{
   env:{...process.env,PORT:'0',PUBLIC_URL:'',BLUFF_UNMASK_MS:unmask},stdio:['ignore','pipe','pipe'],
 });
 let stderr='';
 server.stderr.on('data',chunk=>stderr+=String(chunk));
 try {
   const [output]=await Promise.race([
     once(server.stdout,'data'),
     once(server,'exit').then(([code])=>{throw Error('Server exited '+code+' '+stderr);}),
   ]);
   const url=String(output).match(/http:\/\/localhost:\d+/)?.[0];
   assert.ok(url,'Could not start server: '+stderr);
   const request=async(path,key,data,status=200)=>{
     const res=await fetch(url+'/api/rooms'+path,{
       method:data===undefined?'GET':'POST',
       headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
       ...(data===undefined?{}:{body:JSON.stringify(data)}),
       signal:AbortSignal.timeout(10000),
     });
     const json=res.status===204?undefined:await res.json();
     assert.equal(res.status,status,path+' '+JSON.stringify(json));
     return json;
   };
   const create=async(count,size=4)=>{
     const setup=await request('',undefined,{
       mode:'bluff',category:'mixed',format:'choice',count,seconds:0,playStyle:'individual',
     },201);
     const path='/'+setup.code;
     const keys=[];
     for(let i=0;i<size;i++){
       const joined=await request(path+'/join',undefined,{name:'Player '+i},201);
       keys.push(joined.key);
     }
     const state=async(key=setup.host)=>request(path,key);
     const advance=async()=>{
       const now=await state();
       return request(path+'/advance',setup.host,{
         game:now.game,index:now.index,phase:now.phase
       },204);
     };
     const send=async(key,action,data={},status=204)=>{
       const now=await state(key);
       return request(path+'/party',key,{
         game:now.game,index:now.index,action,...data
       },status);
     };
     return {...setup,path,keys,state,advance,send};
   };
   await work({request,create});
 }finally {server.kill();}
}

const textEscape=value=>String(value).replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));
const icons=()=>'<i></i>';

test('Bluff 3/5/7 options are real and invalid counts are rejected',async()=>{
 assert.deepEqual(questionCounts('bluff','choice','mixed'),[3,5,7]);
 await withServer(async({request,create})=>{
   for(const count of [3,5,7]){
     const game=await create(count,3);
     assert.equal((await game.state()).total,count);
   }
   const invalid=await request('',undefined,{
     mode:'bluff',category:'mixed',format:'choice',count:8,seconds:0
   },400);
   assert.match(invalid.error,/game mode|timer/i);
 });
});

test('Bluff scores are server-authoritative, roles rotate, private prompts never leak, old actions are rejected',async()=>{
 await withServer(async({request,create})=>{
   const game=await create(5,4);
   await game.advance();
   const bluffRoles=[];
   for(let round=0;round<5;round++){
     const tv=await game.state();
     assert.equal(tv.phase,'party-write');
     assert.equal(tv.total,5);
     assert.equal(tv.index,round);
     assert.equal(tv.party.prompt,undefined,'TV host cannot reveal the prompt while answers are private');
     assert.equal(tv.party.liarId,undefined);
     assert.equal(tv.party.replies,undefined);
     const clients=await Promise.all(game.keys.map(key=>game.state(key)));
     const liarIndex=clients.findIndex(s=>s.party.bluffing);
     assert.ok(liarIndex>=0);
     bluffRoles.push(liarIndex);
     assert.equal(clients.filter(s=>s.party.bluffing).length,1);
     assert.equal(clients[liarIndex].party.prompt,undefined);
     assert.ok(clients.filter(s=>!s.party.bluffing).every(s=>s.party.prompt===clients[(liarIndex+1)%4].party.prompt));
     if(round===1){
       const stale=await request(game.path+'/party',game.keys[0],{
         game:tv.game,index:round-1,action:'write',text:'late phone'
       },409);
       assert.match(stale.error,/moved on/);
     }
     for(let i=0;i<4;i++)await game.send(game.keys[i],'write',{text:'Plausible answer '+round+' / '+i});
     const voting=await game.state();
     assert.equal(voting.phase,'party-vote');
     assert.equal(voting.party.liarId,undefined);
     assert.equal(voting.party.liarName,undefined);
     assert.equal(voting.party.caught,undefined);
     assert.equal(voting.party.correctVotes,undefined);
     assert.equal(voting.party.replies.length,4);
     assert.ok(voting.party.replies.every(r=>r.votes===undefined));
     const liarId=clients[liarIndex].player.id;
     const alternate=clients[(liarIndex+1)%4].player.id;
     const invalid=await game.send(game.keys[liarIndex],'vote',{id:liarId},400);
     assert.match(invalid.error,/another player/i);
     for(let i=0;i<4;i++){
       const target=i===liarIndex?alternate:liarId;
       await game.send(game.keys[i],'vote',{id:target});
     }
     const revealed=await game.state();
     assert.equal(revealed.phase,'party-reveal');
     assert.equal(revealed.party.liarId,liarId);
     assert.equal(revealed.party.caught,true);
     assert.equal(revealed.party.correctVotes,3);
     assert.equal(revealed.party.escaped,false);
     assert.equal(revealed.party.replies.reduce((n,r)=>n+r.votes,0),4);
     assert.equal(revealed.players.reduce((n,p)=>n+p.score,0),(round+1)*300);
     const phone=await game.state(game.keys[(liarIndex+1)%4]);
     assert.equal(phone.party.ownEarned,100);
     assert.equal(phone.party.liarId,liarId);
     await game.advance();
   }
   assert.equal(new Set(bluffRoles.slice(0,4)).size,4,
     'Every connected person should bluff once before any role repeats');
   const finale=await game.state();
   assert.equal(finale.phase,'finished');
   assert.equal(finale.players.reduce((n,p)=>n+p.score,0),1500);
   assert.equal(finale.total,5);
   const html=bluffView(finale,{
     host:true,canControl:true,escape:textEscape,reply:'',icons
   });
   assert.match(html,/THE FINAL REVEAL/);
   assert.match(html,/bluff-show-standings/);
   assert.ok(html.includes(finale.players[0].name));
 });
});

test('Tied top votes let the bluff escape, but correct voters still score independently',async()=>{
 await withServer(async({create})=>{
   const game=await create(3,3);
   await game.advance();
   const roles=await Promise.all(game.keys.map(key=>game.state(key)));
   const liar=roles.findIndex(s=>s.party.bluffing);
   for(const key of game.keys)await game.send(key,'write',{text:'Answer'});
   const ids=roles.map(s=>s.player.id);
   // Three-way tie: everyone votes for a different, non-self candidate.
   for(let i=0;i<3;i++)await game.send(game.keys[i],'vote',{id:ids[(i+1)%3]});
   const revealed=await game.state();
   const bluffId=ids[liar];
   assert.equal(revealed.phase,'party-reveal');
   assert.equal(revealed.party.liarId,bluffId);
   assert.equal(revealed.party.caught,false);
   assert.equal(revealed.party.escaped,true);
   assert.equal(revealed.party.correctVotes,1);
   // One player spotted the bluffer (+100); the other was fooled (+50 to the bluffer), and the bluffer escaped (+100).
   assert.equal(revealed.party.fooled,1);
   assert.equal(revealed.players.reduce((n,p)=>n+p.score,0),250);
   assert.equal((await game.state(game.keys[liar])).party.ownEarned,150);
   await game.advance();
   assert.equal((await game.state()).phase,'party-write');
   assert.equal((await game.state()).index,1);
 });
});

test('Secret response markup escapes user-provided content and TV never gains the private prompt',()=>{
 const state={
   mode:'bluff',phase:'party-write',index:0,total:3,night:{queue:[]},
   player:{id:'p1'},players:[],
   party:{prompt:'<unsafe> & "quote"',bluffing:false,wrote:false,voted:false,submissions:0,responseTarget:3},
 };
 const host=bluffView(state,{host:true,canControl:true,escape:textEscape,reply:'',icons});
 assert.ok(!host.includes('<unsafe>'),'Host should never receive the secret text in writing view');
 const phone=bluffView(state,{host:false,canControl:false,escape:textEscape,reply:'<script>alert(1)</script>',icons});
 assert.ok(!phone.includes('<script>'));
 assert.ok(phone.includes('&lt;unsafe&gt;'));
 assert.ok(phone.includes('&lt;script&gt;'));
});

test('the bluffer is told what kind of answer to write, and nobody else is told anything about it',async()=>{
 assert.ok(bluffPromptCount>=200,'a bank of at least 200 prompts');
 assert.equal(new Set(bluffV6).size,bluffV6.length);
 for(const prompt of bluffV6)assert.ok(bluffShapes.includes(bluffHint(prompt)));
 assert.equal(bluffHint('Name a bad place to fall asleep.'),'A place');
 assert.equal(bluffHint('What is a good excuse for not doing the washing up?'),'A reason or an excuse');
 assert.equal(bluffHint('Name a silly thing to wear to a job interview.'),'Something to wear');
 assert.equal(bluffHint('Name something you might find under a sofa.'),'An object you could pick up or point at');
 // A hint never repeats the prompt's own subject.
 assert.ok(bluffShapes.every(shape=>shape.split(' ').length<=9));
 await withServer(async({create})=>{
   const game=await create(3,4);
   await game.advance();
   const clients=await Promise.all(game.keys.map(key=>game.state(key)));
   const bluffer=clients.find(s=>s.party.bluffing);
   const prompt=clients.find(s=>!s.party.bluffing).party.prompt;
   assert.equal(bluffer.party.hint,bluffHint(prompt));
   assert.equal(bluffer.party.prompt,undefined,'still no prompt for the bluffer');
   assert.ok(clients.filter(s=>!s.party.bluffing).every(s=>s.party.hint===undefined));
   assert.equal((await game.state()).party.hint,undefined,'the TV never shows the hint');
   const html=bluffView(bluffer,{host:false,canControl:false,escape:textEscape,reply:'',icons});
   assert.match(html,/Everyone else is writing/);
   assert.ok(html.includes(textEscape(bluffer.party.hint)));
   assert.doesNotMatch(bluffView(await game.state(),{host:true,canControl:true,escape:textEscape,reply:'',icons}),/Everyone else is writing/);
 });
});

test('the reveal is staged on the server: the count first, then the bluffer, and no score moves until then',async()=>{
 await withServer(async({create})=>{
   const game=await create(3,4);
   await game.advance();
   const clients=await Promise.all(game.keys.map(key=>game.state(key)));
   const liar=clients.findIndex(s=>s.party.bluffing);
   const ids=clients.map(s=>s.player.id);
   for(const key of game.keys)await game.send(key,'write',{text:'An answer'});
   // Two spot the bluffer, one is fooled; the bluffer votes for a neighbour.
   const honest=[0,1,2,3].filter(i=>i!==liar);
   await game.send(game.keys[honest[0]],'vote',{id:ids[liar]});
   await game.send(game.keys[honest[1]],'vote',{id:ids[liar]});
   await game.send(game.keys[honest[2]],'vote',{id:ids[honest[0]]});
   await game.send(game.keys[liar],'vote',{id:ids[honest[0]]});
   for(const key of [game.host,...game.keys]){
     const counting=await game.state(key);
     assert.equal(counting.phase,'party-reveal');
     assert.equal(counting.party.stage,'count');
     assert.ok(counting.party.unmaskIn>0);
     assert.deepEqual(counting.party.replies.map(r=>r.votes).sort(),[0,0,2,2],'the counts are public');
     assert.equal(counting.party.suspects.length,2,'a tie for most suspected');
     for(const field of ['liarId','liarName','caught','escaped','correctVotes','fooled','ownEarned'])assert.equal(counting.party[field],undefined,field+' is held back during the count');
     assert.ok(counting.players.every(p=>p.score===0),'no score moves during the count');
     assert.equal(JSON.stringify(counting).includes('"bluffing":true'),false);
   }
   const tvHtml=bluffView(await game.state(),{host:true,canControl:true,escape:textEscape,reply:'',icons});
   assert.match(tvHtml,/The votes are in/);
   assert.match(tvHtml,/MOST SUSPECTED/);
   assert.doesNotMatch(tvHtml,/bluff-show-truth|THE BLUFFER WAS|data-action="advance"/,'no bluffer and no skipping during the count');
   // The host cannot jump past the unmasking.
   await game.advance();
   assert.equal((await game.state()).index,0);
   assert.equal((await game.state()).phase,'party-reveal');
   await delay(700);
   const shown=await game.state();
   assert.equal(shown.party.stage,'unmask');
   assert.equal(shown.party.liarId,ids[liar]);
   assert.equal(shown.party.caught,false,'level on votes: the bluffer escapes');
   assert.equal(shown.party.fooled,1);
   const score=id=>shown.players.find(p=>p.id===id).score;
   assert.equal(score(ids[liar]),bluffScores.fooled+bluffScores.escaped);
   assert.equal(score(ids[honest[0]]),bluffScores.spotted);
   assert.equal(score(ids[honest[2]]),0);
   const html=bluffView(shown,{host:true,canControl:true,escape:textEscape,reply:'',icons});
   assert.match(html,/THE BLUFFER WAS/);
   assert.match(html,/ESCAPED/);
   assert.match(html,/2 players spotted it · 1 fooled · \+150 for the bluffer/);
   assert.match(html,/data-action="advance"/);
   // Titles at the end come from the server's running records.
   for(let round=1;round<3;round++){
     await game.advance();
     for(const key of game.keys)await game.send(key,'write',{text:'Round '+round});
     const now=await Promise.all(game.keys.map(key=>game.state(key)));
     const state=await game.state();
     const targets=state.party.replies.map(r=>r.id);
     for(let i=0;i<4;i++)await game.send(game.keys[i],'vote',{id:targets.find(id=>id!==now[i].player.id)});
     await delay(700);
   }
   await game.advance();
   const finale=await game.state();
   assert.equal(finale.phase,'finished');
   assert.ok(finale.party.titles.eye.count>=1);
   assert.ok(finale.party.titles.eye.names.length>=1);
   const end=bluffView(finale,{host:true,canControl:true,escape:textEscape,reply:'',icons});
   assert.match(end,/SHARPEST EYE/);
   assert.match(end,/\+50 for every player you fool/);
 },'400');
});
