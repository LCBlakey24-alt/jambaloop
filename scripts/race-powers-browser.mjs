// Quiz Race power-ups on a phone: one boost, and rams that only work when a
// rival is in range. The TV's commentator calls the hit.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const errors=[];
try{
  const api=await browser.newContext();
  const {code,host}=await (await api.request.post(site+'/api/rooms',{data:{mode:'quizrace',category:'mixed',count:5,seconds:0,format:'choice',raceLength:'short'}})).json();
  const players=[];for(const name of ['Ada','Bo'])players.push(await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json());
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const open=async(key,isHost,options)=>{const ctx=await browser.newContext(options);await ctx.addInitScript(({code,key,isHost})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:isHost})),{code,key,isHost});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(site,{waitUntil:'domcontentloaded'});return p;};
  const tv=await open(host,true,{viewport:{width:1280,height:720}});
  await tv.locator('[data-action="sound"]').waitFor({timeout:15000});await tv.locator('[data-action="sound"]').click();
  const phone=await open(players[0].key,false,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const s=await snap(host);
  await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});
  const ram=phone.locator('.race-power.is-ram'); const boost=phone.locator('.race-power.is-boost');
  await ram.waitFor({timeout:20000});
  await phone.waitForFunction(()=>!document.querySelector('.race-power.is-ram')?.disabled,null,{timeout:15000});
  assert.match(await ram.innerText(),/Hit Bo · 3 left/,'side by side off the line: Bo is in range');
  await phone.screenshot({path:'browser-screenshots/race-powers-phone.png'});
  await ram.click();
  await phone.waitForFunction(()=>/2 left/.test(document.querySelector('.race-power.is-ram')?.innerText??''),null,{timeout:8000});
  assert.equal((await snap(players[0].key)).race.own.rams,2);
  assert.equal((await snap(players[1].key)).race.own.rammedBy,'Ada','Bo is told who hit them');
  await tv.waitForFunction(()=>document.querySelector('.duo-caption')?.dataset.host==='vince',null,{timeout:12000});
  console.log('PASS: Ada rams Bo from her phone; Bo is slowed and told; Vince is on commentary');
  await boost.click();
  await phone.waitForFunction(()=>document.querySelector('.race-power.is-boost')?.disabled&&/in a row for a turbo/.test(document.querySelector('.race-power.is-boost').innerText),null,{timeout:8000});
  assert.equal((await snap(players[0].key)).race.own.boosts,0);
  console.log('PASS: the boost works once, then says how to earn a turbo');
  // Shield: once per race, and it counts down on the button.
  const shield=phone.locator('.race-power.is-shield');
  assert.match(await shield.innerText(),/Blocks rams for 6s/);
  await shield.click();
  await phone.waitForFunction(()=>/Up · \d+s/.test(document.querySelector('.race-power.is-shield')?.innerText??''),null,{timeout:8000});
  assert.equal((await snap(players[0].key)).race.own.shields,0);
  await tv.waitForFunction(()=>[...document.querySelectorAll('.race-rank-status')].some(node=>node.textContent.includes('🛡')),null,{timeout:8000});
  console.log('PASS: the shield goes up from the phone and shows on the TV standings');
  const size=await phone.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));assert.ok(size.doc<=size.view+1,'no sideways scroll');
  assert.deepEqual(errors,[],'no page errors');
}finally{await browser.close();}
