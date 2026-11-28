// The phone's home is one simple screen (owner direction, 28 November 2026): the logo, Resume, a big Join card and
// one line for whoever is hosting, with no game tiles or pager. Joining from it lands in the lobby, ?join=CODE still
// opens the join pop-up with the code filled in, Resume puts the same player back, and "See the games" still shows
// the launcher. In a room the site header is gone, the bar's Home button is 44px, and the captain is not told to
// wait for a rematch. Laptops keep the full launcher.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir('browser-screenshots',{recursive:true});
const errors=[];
const phoneAt=size=>({viewport:size,isMobile:true,hasTouch:true});
const watch=(page,label)=>{page.on('pageerror',error=>errors.push(label+': '+error.message));return page;};
try{
  const api=await browser.newContext();
  const call=async(path,key,data)=>{
    const response=data===undefined?await api.request.get(site+'/api/rooms'+path,{headers:key?{'x-game-key':key}:{}})
      :await api.request.post(site+'/api/rooms'+path,{headers:key?{'x-game-key':key}:{},data});
    assert.ok(response.ok(),path+': '+response.status()+' '+await response.text());
    return response.status()===204?undefined:response.json();
  };
  const newRoom=()=>call('',undefined,{mode:'classic',category:'mixed',count:5,seconds:20,format:'choice'});
  // What a phone screen shows: anything off the screen, too small to tap, too small to read, or launcher left over.
  const measure=page=>page.evaluate(()=>{
    const app=document.querySelector('#app');
    const shown=[...document.querySelectorAll('.phone-home :is(button, input, a)')].filter(el=>el.getBoundingClientRect().height>0);
    const texts=[...document.querySelectorAll('.phone-home *')].filter(el=>el.getBoundingClientRect().height>0&&[...el.childNodes].some(node=>node.nodeType===3&&node.textContent.trim()));
    return {
      overflow:app.scrollHeight-app.clientHeight, page:document.scrollingElement.scrollHeight-innerHeight, wide:document.scrollingElement.scrollWidth-innerWidth,
      offscreen:shown.filter(el=>el.getBoundingClientRect().bottom>innerHeight+1).map(el=>el.textContent.trim()||el.id),
      small:shown.filter(el=>el.getBoundingClientRect().height<44).map(el=>(el.textContent.trim()||el.id)+' '+Math.round(el.getBoundingClientRect().height)),
      tinyText:texts.filter(el=>parseFloat(getComputedStyle(el).fontSize)<12).map(el=>el.textContent.trim().slice(0,30)),
      launcher:[...document.querySelectorAll('.game-tile, #mode-pager, .home-tabs, .home-intro, .carousel-card')].filter(el=>el.getBoundingClientRect().height>0).length,
      header:getComputedStyle(document.querySelector('body > .header')).display,
    };
  });

  for(const size of [{width:390,height:844},{width:360,height:740}]){
    const tag=size.width+'x'+size.height;
    // 1. A fresh phone: one screen, nothing to page through, every button a thumb target.
    const context=await browser.newContext(phoneAt(size));
    const page=watch(await context.newPage(),'phone '+tag);
    await page.goto(site,{waitUntil:'domcontentloaded'});
    await page.locator('.phone-home #home-room-code').waitFor({timeout:15000});
    await page.evaluate(()=>document.fonts.ready);
    const fresh=await measure(page);
    assert.deepEqual(fresh,{overflow:0,page:0,wide:0,offscreen:[],small:[],tinyText:[],launcher:0,header:'none'},'the phone home is one screen at '+tag);
    assert.equal(await page.locator('.phone-resume').count(),0,'nothing to resume yet');
    await page.screenshot({path:`browser-screenshots/phone-home-${tag}.png`});
    // 2. Join from the home: code and name, then straight into the lobby, with no site header above the game's bar.
    const room=await newRoom();
    await page.locator('#home-room-code').fill(room.code);
    await page.locator('#home-player-name').fill('Ada');
    await page.locator('#home-join-form [type="submit"]').tap();
    await page.locator('.phone-lobby').waitFor({timeout:15000});
    assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('quizmas-session')).code),room.code);
    assert.match(await page.locator('.phone-lobby').innerText(),/Ada/);
    const lobby=await page.evaluate(()=>{const home=document.querySelector('.game-top [data-action="leave"]').getBoundingClientRect();
      return {header:getComputedStyle(document.querySelector('body > .header')).display,home:[home.width>=44,home.height>=44],top:Math.round(document.querySelector('.game-top').getBoundingClientRect().top)};});
    assert.deepEqual({header:lobby.header,home:lobby.home},{header:'none',home:[true,true]},'one bar at the top of the lobby, with a 44px Home: '+JSON.stringify(lobby));
    assert.ok(lobby.top<=12,'the game bar is at the top of the phone: '+lobby.top);
    await page.screenshot({path:`browser-screenshots/phone-home-lobby-${tag}.png`});
    // 3. Home, then Resume: the same player is back in the same room, not a second copy.
    await page.locator('.game-top [data-action="leave"]').tap();
    await page.locator('.phone-resume').waitFor({timeout:10000});
    assert.match(await page.locator('.phone-resume').innerText(),new RegExp('Play as Ada[\\s\\S]*Room '+room.code));
    assert.equal(await page.locator('#home-player-name').inputValue(),'Ada','the name used last is filled in');
    const withResume=await measure(page);
    assert.deepEqual([withResume.overflow,withResume.offscreen,withResume.small],[0,[],[]],'the home with Resume still fits at '+tag);
    await page.screenshot({path:`browser-screenshots/phone-home-resume-${tag}.png`});
    await page.locator('.phone-resume').tap();
    await page.locator('.phone-lobby').waitFor({timeout:15000});
    const players=(await call('/'+room.code,room.host)).players.length;
    assert.equal(players,1,'Resume reuses the same seat');
    // 4. ?join=CODE (the TV's QR code): the join pop-up opens with the code filled in and joins.
    const guest=watch(await (await browser.newContext(phoneAt(size))).newPage(),'join link '+tag);
    await guest.goto(site+'/?join='+room.code,{waitUntil:'domcontentloaded'});
    await guest.locator('dialog[open] #join-room-code').waitFor({timeout:10000});
    assert.equal(await guest.locator('#join-room-code').inputValue(),room.code);
    await guest.locator('#join-player-name').fill('Bo');
    await guest.locator('.join-room-submit').tap();
    await guest.locator('.phone-lobby').waitFor({timeout:15000});
    assert.equal(await guest.evaluate(()=>getComputedStyle(document.querySelector('body > .header')).display),'none');
    // 5. "See the games" still shows the launcher; the hosting line explains the TV and keeps "This screen is our TV".
    const browse=watch(await (await browser.newContext(phoneAt(size))).newPage(),'browse '+tag);
    await browse.goto(site,{waitUntil:'domcontentloaded'});
    await browse.locator('.phone-home [data-action="party"]').tap();
    await browse.locator('dialog[open] .bigscreen-steps').waitFor({timeout:8000});
    assert.equal(await browse.locator('dialog[open] [data-screen="tv"]').count(),1);
    await browse.locator('dialog[open] [data-action="close"]').tap();
    await browse.locator('[data-action="phone-browse"]').tap();
    await browse.locator('.game-tile').first().waitFor({timeout:8000});
    assert.equal(await browse.locator('.phone-home').count(),0);
    assert.ok(await browse.locator('#mode-pager').isVisible(),'the launcher is as it was');
    assert.ok(await browse.locator('.home-actions [data-action="join"]').isVisible());
  }
  console.log('PASS: the phone home is one screen at 390x844 and 360x740; Join, ?join=CODE and Resume land in the lobby with no site header; See the games still works');

  // 6. A laptop keeps the full launcher.
  const laptop=watch(await (await browser.newContext({viewport:{width:1280,height:800}})).newPage(),'laptop');
  await laptop.goto(site,{waitUntil:'domcontentloaded'});
  await laptop.locator('.carousel-card, .game-tile').first().waitFor({timeout:15000});
  assert.equal(await laptop.locator('.phone-home').count(),0,'no phone home on a laptop');
  for(const selector of ['body > .header','.home-intro [data-action="party"]','.home-intro [data-action="join"]','.home-tabs','.home-tv-link'])
    assert.ok(await laptop.locator(selector).first().isVisible(),selector+' is on the laptop home');
  await laptop.screenshot({path:'browser-screenshots/phone-home-laptop-1280x800.png'});
  console.log('PASS: the laptop home is the full launcher');

  // 7. The finish: the captain gets the next-game buttons and no "stay here" line; other players get the line.
  const room=await newRoom();
  const seats=[];for(const name of ['Ada','Bo'])seats.push(await call('/'+room.code+'/join',undefined,{name}));
  const captain=(await Promise.all(seats.map(async seat=>(await call('/'+room.code,seat.key)).isCaptain?seat:undefined))).find(Boolean);
  const other=seats.find(seat=>seat!==captain);
  for(let step=0;step<60;step++){
    const s=await call('/'+room.code,room.host);
    if(s.phase==='finished')break;
    await call('/'+room.code+'/advance',room.host,{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion});
  }
  const finish=async seat=>{
    const context=await browser.newContext(phoneAt({width:390,height:844}));
    await context.addInitScript(({code,key})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false})),{code:room.code,key:seat.key});
    const page=watch(await context.newPage(),'finish');
    await page.goto(site,{waitUntil:'domcontentloaded'});
    await page.locator('.game.player-only[data-phase="finished"]').waitFor({timeout:15000});
    return page;
  };
  const captainPage=await finish(captain);
  assert.equal(await captainPage.locator('text=Stay here if the captain or host starts a rematch').count(),0,'the captain is not told to wait for a rematch');
  assert.ok(await captainPage.locator('[data-action="quick-replay"]').isVisible());
  assert.equal(await captainPage.evaluate(()=>getComputedStyle(document.querySelector('body > .header')).display),'none');
  await captainPage.screenshot({path:'browser-screenshots/phone-home-captain-finish.png'});
  const otherPage=await finish(other);
  assert.ok(await otherPage.locator('text=Stay here if the captain or host starts a rematch').isVisible(),'other players still see it');
  console.log('PASS: the captain\'s finish has the next-game buttons and no rematch line; other players keep the line');
  assert.deepEqual(errors,[],'no page errors');
}finally{await browser.close();}
