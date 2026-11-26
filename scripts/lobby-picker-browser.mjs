// Lobby-first hosting: Host game night opens a carousel lobby on the TV, the
// captain swipes games on their phone, the TV and other phones follow, and
// Play chooses the game.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir('browser-screenshots',{recursive:true});
const errors=[];
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});};
try{
  // 1. The TV hosts straight into the carousel lobby.
  const tvContext=await browser.newContext({viewport:{width:1280,height:720}});
  const tv=await tvContext.newPage(); watch(tv);
  await tv.goto(site,{waitUntil:'domcontentloaded'});
  await tv.locator('[data-action="party"]').first().click();
  await tv.locator('[data-picker-tv]').waitFor({timeout:15000});
  const {code,key:host}=JSON.parse(await tv.evaluate(()=>sessionStorage.getItem('quizmas-session')));
  assert.equal(await tv.locator('.screen-mode-title').innerText(),'Pick a game');
  const api=await browser.newContext();
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const join=async name=>(await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json();
  const ada=await join('Ada'); const bo=await join('Bo');
  const open=async key=>{const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await ctx.addInitScript(({code,key})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false})),{code,key});
    const p=await ctx.newPage();watch(p);await p.goto(site,{waitUntil:'domcontentloaded'});await p.locator('[data-picker-phone]').waitFor({timeout:15000});return p;};
  const captain=await open(ada.key); const guest=await open(bo.key);
  assert.equal(await captain.locator('[data-picker-phone][data-driver]').count(),1,'the captain drives');
  assert.equal(await guest.locator('[data-picker-phone][data-driver]').count(),0,'other phones watch');
  console.log('PASS: Host game night opens the carousel lobby');

  // 2. Captain taps next twice and swipes once: everyone follows.
  const settle=async mode=>{for(let t=0;t<40&&(await snap(host)).picker.mode!==mode;t++)await captain.waitForTimeout(150);assert.equal((await snap(host)).picker.mode,mode);};
  for(const mode of ['wheel','board']){await captain.locator('[data-action="picker-step"][data-direction="1"]').click();await settle(mode);await captain.waitForTimeout(400);}
  // A thumb flick to the left on the captain's 3D shelf.
  const shelf=await captain.locator('.picker-carousel .carousel-track').boundingBox();
  await captain.mouse.move(shelf.x+shelf.width*.8,shelf.y+shelf.height/2);await captain.mouse.down();
  await captain.mouse.move(shelf.x+shelf.width*.2,shelf.y+shelf.height/2,{steps:6});await captain.mouse.up();
  assert.equal(await captain.locator('.game').getAttribute('data-mode'),'dice','the phone wears the browsed game too');
  await tv.waitForFunction(()=>document.querySelector('.carousel-card[aria-current]')?.dataset.mode==='dice',null,{timeout:5000});
  assert.equal((await snap(host)).picker.mode,'dice');
  assert.equal(await tv.locator('.game').getAttribute('data-mode'),'dice','the TV wears the browsed game');
  await guest.waitForFunction(()=>document.querySelector('[data-picker-name]')?.textContent==='Dice Rally'&&document.querySelector('.carousel-card[aria-current]')?.dataset.mode==='dice',null,{timeout:5000});
  await tv.screenshot({path:'browser-screenshots/picker-tv.png'});
  await captain.screenshot({path:'browser-screenshots/picker-captain.png'});
  console.log('PASS: the TV and other phones follow the captain');

  // 3. Play chooses the game and closes the carousel; it can be reopened.
  await captain.locator('[data-action="picker-play"]').click();
  await tv.locator('.lobby-game').waitFor({timeout:5000});
  const chosen=await snap(host);
  assert.equal(chosen.mode,'dice'); assert.equal(chosen.picker,undefined);
  await captain.locator('[data-action="picker-open"]').click();
  await tv.locator('[data-picker-tv]').waitFor({timeout:5000});
  assert.equal((await snap(host)).picker.mode,'dice','reopens on the chosen game');
  for(const page of [tv,captain,guest]){const s=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));assert.ok(s.doc<=s.view+1,'no sideways scroll '+JSON.stringify(s));}
  console.log('PASS: Play chooses the game; Browse all games reopens the carousel');
  assert.deepEqual(errors,[],'no console errors');
}finally{await browser.close();}
