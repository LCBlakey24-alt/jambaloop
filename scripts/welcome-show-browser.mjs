// The Jambaloop welcome: Max and Poppy's animated opener on the TV.
// 1. New players: it plays; the captain can skip from their phone (a quip, then off).
// 2. It plays once per room, can be replayed, and steps aside when the captain browses.
// 3. Everyone returning: the hosts ask, and the captain chooses on their phone.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});};
const api=await browser.newContext();
const hostRoom=async()=>{const tv=await (await browser.newContext({viewport:{width:1280,height:720}})).newPage();watch(tv);
  await tv.goto(site,{waitUntil:'domcontentloaded'});await tv.locator('[data-action="party"]').first().click();await tv.locator('[data-gather-tv]').waitFor({timeout:15000});
  return {tv,code:JSON.parse(await tv.evaluate(()=>sessionStorage.getItem('quizmas-session'))).code};};
const phoneFor=async(code,key)=>{const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.addInitScript(({code,key})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false})),{code,key});
  const p=await ctx.newPage();watch(p);await p.goto(site,{waitUntil:'domcontentloaded'});await p.locator('[data-picker-phone], [data-gather-phone]').first().waitFor({timeout:15000});return p;};
const scene=(tv,name)=>tv.waitForFunction(s=>document.querySelector('.welcome-stage')?.dataset.scene===s,name,{timeout:20000});
try{
  // 1. New players: the welcome plays; the captain skips it from their phone.
  const {tv,code}=await hostRoom();
  assert.equal(await tv.locator('.welcome-show').count(),0,'waits for players');
  const ada=await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name:'Ada'}})).json();
  // The waiting room: nothing plays until someone presses Start the party.
  await tv.locator('[data-gather-tv] .gather-players li').first().waitFor({timeout:8000});
  await tv.waitForTimeout(1500);
  assert.equal(await tv.locator('.welcome-show').count(),0,'waits for Start the party');
  assert.equal(await tv.locator('[data-picker-tv]').count(),0,'no carousel in the waiting room');
  const captain=await phoneFor(code,ada.key);
  assert.equal(await captain.locator('[data-picker-phone]').count(),0,'phones wait too');
  await tv.screenshot({path:'browser-screenshots/party-gather-tv.png'});
  await captain.screenshot({path:'browser-screenshots/party-gather-phone.png'});
  await captain.locator('[data-action="party-start"]').click();
  await tv.locator('.welcome-show').waitFor({timeout:8000});
  await scene(tv,'hello'); await scene(tv,'devices');
  await captain.locator('[data-picker-phone]').waitFor({timeout:8000});
  console.log('PASS: the captain starts the party from their phone and the welcome plays');
  await captain.locator('.picker-welcome [data-action="welcome-skip"]').click();
  await scene(tv,'skip');
  assert.ok((await tv.locator('.duo-caption').innerText()).length>5,'the hosts react with a quip');
  await tv.locator('.welcome-show').waitFor({state:'detached',timeout:20000});
  assert.equal(await captain.evaluate(()=>localStorage.getItem('jambaloop-returning')),'1','this phone now counts as returning');
  console.log('PASS: the captain skips from their phone; the hosts sign off with a quip');

  // 2. Once per room, replayable, and the captain browsing ends it.
  await tv.reload(); await tv.locator('[data-picker-tv]').waitFor({timeout:15000}); await tv.waitForTimeout(1500);
  assert.equal(await tv.locator('.welcome-show').count(),0,'plays once per room');
  await tv.locator('[data-action="welcome-play"]').click(); await scene(tv,'hello');
  const s=await (await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':ada.key}})).json();
  await api.request.post(site+'/api/rooms/'+code+'/browse',{headers:{'x-game-key':ada.key},data:{mode:'wheel',game:s.game}});
  await tv.locator('.welcome-show').waitFor({state:'detached',timeout:8000});
  console.log('PASS: replayable, and it steps aside when the captain browses');

  // 3. Everyone has played before: the hosts ask; the captain chooses.
  const room2=await hostRoom();
  const cy=await (await api.request.post(site+'/api/rooms/'+room2.code+'/join',{data:{name:'Cy',returning:true}})).json();
  await room2.tv.locator('[data-action="party-start"]:not([disabled])').click();
  await scene(room2.tv,'back');
  assert.equal(await room2.tv.locator('[data-welcome="tour"]').count(),1,'the TV offers the choice too');
  const cap2=await phoneFor(room2.code,cy.key);
  await cap2.locator('.picker-welcome [data-action="welcome-skip"]').waitFor();
  assert.match(await cap2.locator('.picker-welcome').innerText(),/played before/);
  await room2.tv.screenshot({path:'browser-screenshots/welcome-back-tv.png'});
  await cap2.screenshot({path:'browser-screenshots/welcome-back-phone.png'});
  await cap2.locator('.picker-welcome [data-action="welcome-skip"]').click();
  await scene(room2.tv,'skip');
  await room2.tv.locator('.welcome-show').waitFor({state:'detached',timeout:20000});
  console.log('PASS: a returning room is asked, and "Skip, let\'s play" hands straight over');
  assert.deepEqual(errors,[],'no console errors');
}finally{await browser.close();}
