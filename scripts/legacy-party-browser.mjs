import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']
});
await mkdir('browser-screenshots',{recursive:true});
const tvContext=await browser.newContext({viewport:{width:1280,height:720}});
const phoneContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors=[];
const check=async(response,label,status=200)=>{
  assert.equal(response.status(),status,label+': '+await response.text());
  return status===204?undefined:await response.json();
};
try {
  const created=await check(await tvContext.request.post(base+'/api/rooms',{data:{
    mode:'potato',category:'mixed',format:'choice',count:5,seconds:0
  }}),'Create Hot Potato room',201);
  const code=created.code,hostKey=created.host,keys=[];
  for(const name of ['Alex','Bailey','Charlie']){
    const joined=await check(await tvContext.request.post(base+'/api/rooms/'+code+'/join',{
      data:{name}
    }),'Join '+name,201);
    keys.push(joined.key);
  }
  const state=async(key=hostKey)=>check(await tvContext.request.get(base+'/api/rooms/'+code,{
    headers:{'x-game-key':key}
  }),'Room state');
  await check(await tvContext.request.post(base+'/api/rooms/'+code+'/advance',{
    headers:{'x-game-key':hostKey},data:{game:1,index:0,phase:'lobby'}
  }),'Start Hot Potato',204);
  const start=await state();
  assert.equal(start.phase,'party-potato');
  assert.equal(start.party.holderConnected,true);
  assert.equal(start.party.question,undefined,'TV host never sees private answer');
  const holderId=start.party.holder.id;
  const publicStates=await Promise.all(keys.map(key=>state(key)));
  const holderIndex=publicStates.findIndex(s=>s.player.id===holderId);
  assert.ok(holderIndex>=0,'One joined player is current holder');
  const phoneKey=keys[(holderIndex+1)%keys.length];
  await tvContext.addInitScript(({code,key})=>{
    sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true}));
  },{code,key:hostKey});
  await phoneContext.addInitScript(({code,key})=>{
    sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
  },{code,key:phoneKey});
  const tv=await tvContext.newPage();
  tv.on('pageerror',e=>errors.push('TV: '+e.message));
  await tv.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await tv.locator('.potato-panel').waitFor({timeout:15000});
  const phone=await phoneContext.newPage();
  phone.on('pageerror',e=>errors.push('Phone: '+e.message));
  await phone.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await phone.locator('.potato-panel').waitFor({timeout:15000});
  assert.equal(await tv.locator('[data-action="potato-rescue"]').count(),0,
    'Recovery must not be available while holder is still in reconnect grace');
  assert.equal((await state(phoneKey)).party.question,undefined,'Non-holder must not see the private question');

  // The current holder never opens a phone stream; after existing 18s grace
  // the still-online TV host can rescue their game. Another player remains
  // connected through their own phone browser session.
  await tv.locator('[data-action="potato-rescue"]').waitFor({timeout:30000});
  const before=await state();
  assert.equal(before.party.canRescue,true);
  assert.equal(before.party.holderConnected,false);
  const expires=before.ends;
  await tv.screenshot({path:'browser-screenshots/hot-potato-offline-rescue-tv-1280x720.png'});
  const bounds=await tv.evaluate(()=>({
    width:document.scrollingElement.scrollWidth,
    height:document.scrollingElement.scrollHeight,
  }));
  assert.ok(bounds.width<=1282,'TV host recovery overflowed horizontally '+JSON.stringify(bounds));
  assert.ok(bounds.height<=722,'TV host recovery overflowed vertically '+JSON.stringify(bounds));

  await tv.locator('[data-action="potato-rescue"]').click();
  await phone.locator('.potato-question').waitFor({timeout:15000});
  await phone.waitForFunction(() =>
    getComputedStyle(document.querySelector('#app')).overflowY === 'auto' &&
    [...document.querySelectorAll('.mobile-pager')].every(nav => nav.hidden),
    {timeout:10000});
  const activePhone = await phone.evaluate(() => ({
    phase:document.querySelector('.game.player-only')?.dataset.phase,
    pager:[...document.querySelectorAll('.mobile-pager')].some(nav=>!nav.hidden),
    overflow:getComputedStyle(document.querySelector('#app')).overflowY,
    choices:document.querySelectorAll('.potato-question [data-action="potato-answer"]').length,
    hiddenControls:document.querySelectorAll('.potato-question [data-deck-hidden]').length,
    horizontalOverflow:document.querySelector('#app').scrollWidth-document.querySelector('#app').clientWidth,
  }));
  assert.equal(activePhone.phase,'party-potato');
  assert.equal(activePhone.pager,false);
  assert.equal(activePhone.overflow,'auto');
  assert.equal(activePhone.choices,4);
  assert.equal(activePhone.hiddenControls,0);
  assert.ok(activePhone.horizontalOverflow<=2,'Phone cannot fit its controls horizontally: '+JSON.stringify(activePhone));

  const after=await state();
  assert.equal(after.party.rescues,1);
  assert.equal(after.party.passes,0);
  assert.equal(after.party.step,before.party.step+1);
  assert.equal(after.ends,expires,'Recovery must not restart the ticking clock');
  const own=await state(phoneKey);
  assert.equal(own.party.holding,true);
  assert.ok(own.party.question);
  assert.equal(own.party.question.correct,undefined);
  assert.equal(after.party.question,undefined);
  assert.equal(await tv.locator('[data-action="potato-rescue"]').count(),0);
  const stale=await tvContext.request.post(base+'/api/rooms/'+code+'/potato-rescue',{
    headers:{'x-game-key':hostKey},data:{game:1,step:before.party.step},
  });
  assert.equal(stale.status(),409);
  await phone.screenshot({path:'browser-screenshots/hot-potato-rescued-phone-390x844.png'});
  assert.ok((await phone.evaluate(()=>document.scrollingElement.scrollWidth))<=392);
  await phone.locator('[data-action="potato-skip"]').click();
  const skipped=await state();
  assert.equal(skipped.party.step,after.party.step+1,'The rescued phone must remain able to play');
  assert.equal(skipped.party.holder.id,after.party.holder.id);
  assert.deepEqual(errors,[]);
  console.log('PASS: Hot Potato 18-second grace, host-only recovery, no private answer leaks, 720p TV and 390px phone');
}finally{
  await tvContext.close();
  await phoneContext.close();
  await browser.close();
}
