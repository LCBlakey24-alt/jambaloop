import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({
 headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});
const tvContext=await browser.newContext({viewport:{width:1280,height:720}});
const phoneContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors=[];
try{
 const api=async(path,key,data,status=200)=>{
   const response=await tvContext.request.fetch(base+'/api/rooms'+path,{
     method:data===undefined?'GET':'POST',
     headers:{...(key?{'x-game-key':key}:{})},
     ...(data===undefined?{}:{data}),
   });
   assert.equal(response.status(),status,path+': '+await response.text());
   return status===204?undefined:await response.json();
 };
 const created=await api('',undefined,{
   mode:'bluff',category:'mixed',format:'choice',count:3,seconds:0,playStyle:'individual'
 },201);
 const path='/'+created.code;
 const players=[];
 for(let i=0;i<3;i++){
   const user=await api(path+'/join',undefined,{name:'Contestant '+(i+1)},201);
   players.push(user.key);
 }
 const state=async(key=created.host)=>api(path,key);
 await api(path+'/advance',created.host,{phase:'lobby',game:1,index:0},204);
 const current=await state();
 assert.equal(current.phase,'party-write');
 assert.equal(current.total,3);
 assert.equal(current.party.prompt,undefined,'TV cannot see secret prompt in write stage');
 const privately=await Promise.all(players.map(key=>state(key)));
 const liar=privately.findIndex(s=>s.party.bluffing);
 assert.ok(liar>=0);
 const phoneIndex=(liar+1)%3;
 const phoneKey=players[phoneIndex];
 const question=privately[phoneIndex].party.prompt;
 assert.ok(question);
 assert.equal(privately[liar].party.prompt,undefined);
 assert.ok(privately[liar].party.hint,'the bluffer is told what kind of answer to write');
 assert.ok(privately.filter((_,i)=>i!==liar).every(s=>s.party.hint===undefined));
 await tvContext.addInitScript(({code,key})=>{
   sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true}));
 },{code:created.code,key:created.host});
 await phoneContext.addInitScript(({code,key})=>{
   sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
 },{code:created.code,key:phoneKey});
 const tv=await tvContext.newPage();
 const phone=await phoneContext.newPage();
 tv.on('pageerror',e=>errors.push('TV: '+e.message));
 phone.on('pageerror',e=>errors.push('Phone: '+e.message));
 await tv.goto(base,{waitUntil:'domcontentloaded'});
 await phone.goto(base,{waitUntil:'domcontentloaded'});
 await tv.locator('.bluff-game[data-bluff-phase="party-write"]').waitFor();
 await phone.locator('.bluff-game[data-bluff-phase="party-write"]').waitFor();
 assert.ok(!(await tv.locator('.bluff-game').innerText()).includes(question),'Secret prompt leaked into TV HTML');
 assert.match(await phone.locator('.bluff-show-intro').innerText(),/secret prompt/i);
 assert.ok((await phone.locator('.bluff-show-intro').innerText()).includes(question));
 await phone.locator('.bluff-show-entry textarea').fill('A sensible suggestion from my phone');
 await phone.locator('.bluff-show-entry button').click();
 for(let i=0;i<3;i++){
   if(i===phoneIndex)continue;
   await api(path+'/party',players[i],{
     index:0,game:1,action:'write',text:'Other player '+i+' thinks of toast'
   },204);
 }
 const voting=await state();
 assert.equal(voting.phase,'party-vote');
 assert.equal(voting.party.liarId,undefined);
 assert.equal(voting.party.liarName,undefined);
 await tv.locator('.bluff-game[data-bluff-phase="party-vote"]').waitFor();
 await phone.locator('.bluff-game[data-bluff-phase="party-vote"]').waitFor();
 assert.equal(await tv.locator('.bluff-show-cards .bluff-card').count(),3);
 assert.equal(await phone.locator('.bluff-show-cards .bluff-card').count(),3);
 // All ballot entries must remain reachable without opening the mobile deck pager.
 for (const [width,height] of [[390,844],[844,390]]) {
   await phone.setViewportSize({width,height});
   await phone.waitForFunction(()=>document.documentElement.classList.contains('mobile-deck') &&
     getComputedStyle(document.querySelector('#app')).overflowY==='auto');
   const layout=await phone.evaluate(()=>{
     const app=document.querySelector('#app');
     const cards=[...document.querySelectorAll('.bluff-show-cards .bluff-card')];
     return {scroll:getComputedStyle(app).overflowY, width:app.scrollWidth, available:app.clientWidth,
       hidden:cards.filter(card=>Boolean(card.closest('[data-deck-hidden]'))).length,
       pager:[...document.querySelectorAll('.mobile-pager')].some(nav=>!nav.hidden),
       choices:document.querySelectorAll('.bluff-show-cards [data-action="bluff-vote"]').length};
   });
   assert.equal(layout.hidden,0,'Hidden voting card at '+width+'x'+height+': '+JSON.stringify(layout));
   assert.equal(layout.pager,false,'Active ballot must not paginate at '+width+'x'+height);
   assert.ok(layout.width<=layout.available+2,'Ballot overflow at '+width+'x'+height+': '+JSON.stringify(layout));
   assert.equal(layout.choices,2,'Player should have two legal choices and cannot vote for themselves');
   await phone.locator('.bluff-show-cards [data-action="bluff-vote"]').last().scrollIntoViewIfNeeded();
   await phone.screenshot({path:'browser-screenshots/bluff-ballot-phone-'+width+'x'+height+'.png'});
 }
 await phone.setViewportSize({width:390,height:844});
 assert.equal(await tv.locator('.bluff-show-truth').count(),0);
 const liarId=privately[liar].player.id;
 const otherId=privately[(liar+1)%3].player.id;
 for(let i=0;i<3;i++){
   if(i===phoneIndex)continue;
   await api(path+'/party',players[i],{
     game:1,index:0,action:'vote',id:i===liar?otherId:liarId
   },204);
 }
 await phone.locator('[data-action="bluff-vote"][data-id="'+liarId+'"]').click();
 // First the count: the votes are public, the bluffer is not, and nobody can skip ahead.
 const counting=await state();
 assert.equal(counting.phase,'party-reveal');
 assert.equal(counting.party.stage,'count');
 assert.equal(counting.party.liarId,undefined,'the server holds the bluffer back during the count');
 assert.ok(counting.players.every(p=>p.score===0),'scores wait for the unmasking');
 await tv.locator('.bluff-game[data-bluff-phase="party-reveal"]').waitFor();
 await phone.locator('.bluff-game[data-bluff-phase="party-reveal"]').waitFor();
 assert.match(await tv.locator('.bluff-show-intro h1').innerText(),/votes are in/i);
 assert.equal(await tv.locator('.bluff-show-suspect').count(),1,'the most suspected player is marked');
 assert.equal(await tv.locator('.bluff-show-truth, .bluff-show-unmask, [data-action="advance"]').count(),0);
 await tv.waitForTimeout(900);
 await tv.screenshot({path:'browser-screenshots/bluff-count-tv-1280x720.png'});
 // Then the unmasking, pushed by the server.
 await tv.locator('.bluff-show-unmask').waitFor({timeout:12000});
 const revealed=await state();
 assert.equal(revealed.party.stage,'unmask');
 assert.equal(revealed.party.caught,true);
 assert.equal(revealed.party.correctVotes,2);
 assert.equal(revealed.party.fooled,0);
 assert.equal(revealed.players.reduce((n,p)=>n+p.score,0),200);
 assert.match(await tv.locator('.bluff-show-unmask').innerText(),/THE BLUFFER WAS[\s\S]*Contestant[\s\S]*CAUGHT/i);
 assert.equal(await tv.locator('.bluff-show-truth').count(),1);
 await phone.locator('.bluff-show-earned').waitFor({timeout:12000});
 assert.match(await phone.locator('.bluff-show-earned').innerText(),/\+100/);
 await tv.waitForTimeout(1300);
 const metrics=await tv.evaluate(()=>({
   scrollWidth:document.scrollingElement.scrollWidth,
   scrollHeight:document.scrollingElement.scrollHeight,
 }));
 assert.ok(metrics.scrollWidth<=1282,'Bluff TV overflow X '+JSON.stringify(metrics));
 assert.ok(metrics.scrollHeight<=722,'Bluff TV overflow Y '+JSON.stringify(metrics));
 await tv.screenshot({path:'browser-screenshots/bluff-vote-reveal-tv-1280x720.png'});
 await phone.screenshot({path:'browser-screenshots/bluff-vote-reveal-phone-390x844.png'});
 assert.ok(await phone.evaluate(()=>document.scrollingElement.scrollWidth<=392));
 await tv.setViewportSize({width:1920,height:1080});
 await tv.screenshot({path:'browser-screenshots/bluff-vote-reveal-tv-1920x1080.png'});
 await api(path+'/advance',created.host,{phase:'party-reveal',game:1,index:0},204);
 const second=await state();
 assert.equal(second.index,1);
 assert.equal(second.phase,'party-write');
 assert.equal(second.party.liarId,undefined);
 assert.equal(second.party.prompt,undefined);
 await tv.locator('.bluff-game[data-bluff-phase="party-write"]').waitFor();
 assert.ok(!(await tv.locator('.bluff-game').innerText()).includes(second.party.prompt??'SECRET UNDEFINED'));
 assert.deepEqual(errors,[]);
 console.log('PASS: Spot the Bluff private writing, genuine scoring and reveal, 720p/1080p TV and 390px phone');
}finally{
 await phoneContext.close();
 await tvContext.close();
 await browser.close();
}
