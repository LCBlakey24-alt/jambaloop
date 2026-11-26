// Knockout survivor ladder end to end: pixel hearts shatter on the TV when a
// player loses a life, a knocked-out player gets an X and drops to the
// knocked-out row while survivors move up, and phones break their own heart.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir('browser-screenshots',{recursive:true});
const errors=[];
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
  const api=await browser.newContext();
  const quiz={title:'Knockout check',questions:Array.from({length:5},(_,i)=>({type:'boolean',prompt:'Knockout question '+(i+1),correct:0}))};
  const created=await api.request.post(site+'/api/rooms',{data:{mode:'knockout',category:'mixed',format:'choice',count:5,seconds:0,customQuiz:quiz}});
  assert.equal(created.status(),201,await created.text());
  const {code,host}=await created.json();
  const players={};
  for(const name of ['Ada','Bo','Cy','Dee']) players[name]=await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json();
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const advance=async()=>{const s=await snap(host);const r=await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});assert.ok(r.ok(),await r.text());};
  const answer=async(name,option)=>{const s=await snap(players[name].key);await api.request.post(site+'/api/rooms/'+code+'/answer',{headers:{'x-game-key':players[name].key},data:{game:s.game,index:s.index,option}});};
  const open=async(key,isHost,options)=>{const ctx=await browser.newContext(options);await ctx.addInitScript(({code,key,isHost})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:isHost})),{code,key,isHost});const p=await ctx.newPage();watch(p);await p.goto(site,{waitUntil:'domcontentloaded'});return p;};
  const tv=await open(host,true,{viewport:{width:1280,height:720}});
  const bo=await open(players.Bo.key,false,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await advance();
  await tv.locator('.ko-ladder .ko-rung').first().waitFor({timeout:15000});
  assert.equal(await tv.locator('.ko-rung').count(),4,'four players on the ladder');
  assert.equal(await tv.locator('.ko-rung').first().locator('.pixel-heart[data-heart="full"]').count(),3,'three hearts each');
  assert.equal((await snap(players.Ada.key)).knockout,undefined,'phones never get the ladder');
  const wrong={1:['Bo','Cy'],2:['Bo','Dee'],3:['Bo','Dee']};
  for(const round of [1,2,3]){
    for(const name of ['Ada','Bo','Cy','Dee']) await answer(name,wrong[round].includes(name)?1:0);
    await advance();
    await tv.locator('.game[data-phase="reveal"]').waitFor();
    if(round<3){
      await pause(3200);
      const shattered=await tv.locator('.ko-rung[data-lost]').count();
      assert.equal(shattered,2,`round ${round}: two players lost a heart`);
      await advance();
      await tv.locator('.game[data-phase="question"]').waitFor();
    }
  }
  // Round three: Bo loses the last heart.
  await pause(900); await tv.screenshot({path:'browser-screenshots/knockout-1-drumroll.png'});
  await tv.locator('.pixel-heart.is-shattering').first().waitFor({timeout:4000});
  await pause(250); await tv.screenshot({path:'browser-screenshots/knockout-2-shatter.png'});
  await tv.locator('.ko-rung.is-ko').waitFor({timeout:4000});
  assert.equal(await tv.locator('.ko-rung.is-ko .ko-name').innerText(),'BO','Bo gets the X');
  await pause(450); await tv.screenshot({path:'browser-screenshots/knockout-3-ko.png'});
  await tv.waitForFunction(()=>document.querySelector('.ko-ladder')?.dataset.koStage==='settle',null,{timeout:5000});
  await pause(900);
  assert.deepEqual(await tv.locator('.ko-rung:visible .ko-name').allInnerTexts(),['ADA','CY','DEE'],'survivors move up in order of lives left');
  assert.equal(await tv.locator('.ko-out li[title="Bo"]').count(),1,'Bo is in the knocked-out row');
  await tv.screenshot({path:'browser-screenshots/knockout-4-settled.png'});
  await bo.locator('.life-info',{hasText:'Knocked out!'}).waitFor({timeout:5000});
  await bo.screenshot({path:'browser-screenshots/knockout-phone.png'});
  console.log('PASS: hearts shatter, Bo is knocked out with an X, survivors move up');
  assert.deepEqual(errors,[],'no console errors');
}finally{await browser.close();}
