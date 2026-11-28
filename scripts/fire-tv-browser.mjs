// A TV stick's browser (like a Fire TV Stick's): a small 960×540 page, no touchscreen. The site must treat it
// as the TV: no "made for a TV" prompt when hosting, the TV layout at 1280 wide, and the home tiles readable.
// Phones still get the prompt, now with a "This screen is our TV" choice, and ?device opens the screen check.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const fireAgent='Mozilla/5.0 (Linux; Android 9; AFTKA Build/PS7633) AppleWebKit/537.36 (KHTML, like Gecko) Silk/120.4.1 Chrome/120.0.6099.230 Safari/537.36';
const desktopAgent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const errors=[];
const tvStick=agent=>({viewport:{width:960,height:540},deviceScaleFactor:2,isMobile:true,hasTouch:false,userAgent:agent});
try{
  // 1. A Fire TV Stick, by name.
  const fire=await (await browser.newContext(tvStick(fireAgent))).newPage();
  fire.on('pageerror',e=>errors.push('fire: '+e.message));
  await fire.goto(site,{waitUntil:'domcontentloaded'});
  await fire.locator('.carousel-card').first().waitFor({timeout:15000});
  assert.ok(await fire.evaluate(()=>document.documentElement.classList.contains('tv-screen')),'recognised as the TV');
  assert.equal(await fire.evaluate(()=>document.querySelector('meta[name="viewport"]').content),'width=1280');
  await fire.waitForFunction(()=>innerWidth>=1200,null,{timeout:5000});
  const size=await fire.evaluate(()=>({w:innerWidth,h:innerHeight}));
  assert.ok(size.w===1280&&size.h>=700,'laid out like the TV screens were built: '+JSON.stringify(size));
  // As on a laptop: the game carousel, browsed with the arrow keys (the remote's left and right).
  await fire.locator('.carousel-card').first().waitFor({timeout:10000});
  assert.ok(await fire.locator('.carousel-card').count()>=24,'every game is in the carousel');
  await fire.screenshot({path:'browser-screenshots/fire-tv-home.png'});
  // Hosting goes straight to the TV lobby: no "made for a TV" prompt.
  await fire.locator('[data-action="party"]').first().click();
  await fire.locator('.host-screen').first().waitFor({timeout:15000});
  assert.equal(await fire.locator('dialog[open] .bigscreen-steps').count(),0,'no "use a laptop" prompt on the TV');
  assert.equal(await fire.evaluate(()=>document.documentElement.classList.contains('mobile-deck')),false,'never the phone layout');
  await fire.waitForTimeout(1200);
  await fire.screenshot({path:'browser-screenshots/fire-tv-lobby.png'});
  console.log('PASS: a Fire TV Stick is the TV: 1280-wide TV layout, the laptop\'s game carousel, hosts with no phone prompt');
  // 2. A TV stick that does not say what it is (a desktop browser identity) but has no touchscreen.
  const unknown=await (await browser.newContext(tvStick(desktopAgent))).newPage();
  unknown.on('pageerror',e=>errors.push('unnamed tv: '+e.message));
  await unknown.goto(site,{waitUntil:'domcontentloaded'});
  // Its 960×540 page shows the tile grid: the type and player count sit under the art, readable and never cut off.
  await unknown.locator('.game-tile').first().waitFor({timeout:15000});
  await unknown.waitForTimeout(500);
  const caption=await unknown.evaluate(()=>[...document.querySelectorAll('.game-tile')].filter(t=>t.getBoundingClientRect().width>0).map(t=>{const art=t.querySelector('.tile-art').getBoundingClientRect();const info=t.querySelector('.tile-info').getBoundingClientRect();const kind=t.querySelector('.tile-kind');return {mode:t.dataset.mode,below:info.top>=art.bottom-1,inside:info.bottom<=t.getBoundingClientRect().bottom+1,font:parseFloat(getComputedStyle(kind).fontSize),cut:kind.scrollWidth>kind.clientWidth+1};}));
  assert.ok(caption.length>=6);
  assert.ok(caption.every(c=>c.below&&c.inside),'captions sit under the art: '+JSON.stringify(caption.filter(c=>!c.below||!c.inside)));
  assert.ok(caption.every(c=>c.font>=9),'caption text is at least 9px');
  for(let page=0;page<3;page++){
    const cut=await unknown.evaluate(()=>[...document.querySelectorAll('.game-tile')].filter(t=>t.getBoundingClientRect().width>0).filter(t=>{const k=t.querySelector('.tile-kind');return k.scrollWidth>k.clientWidth+1;}).map(t=>t.dataset.mode));
    assert.deepEqual(cut,[],'no game type is cut off (page '+(page+1)+')');
    if(page<2&&await unknown.locator('.mode-pagination [data-page-next], .mode-pagination button:has-text("Next")').count())await unknown.locator('.mode-pagination button:has-text("Next")').first().click().catch(()=>{});
    await unknown.waitForTimeout(300);
  }
  await unknown.screenshot({path:'browser-screenshots/fire-tv-tiles-960.png'});
  await unknown.locator('[data-action="party"]').first().click();
  await unknown.locator('.host-screen').first().waitFor({timeout:15000});
  assert.equal(await unknown.locator('dialog[open] .bigscreen-steps').count(),0,'a screen with no touchscreen is never told it is a phone');
  console.log('PASS: a TV browser that does not name itself: readable tile captions, and it hosts without the phone prompt');
  // 3. A phone still gets the prompt, now with "This screen is our TV"; choosing it remembers the choice.
  const phoneContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const phone=await phoneContext.newPage();
  phone.on('pageerror',e=>errors.push('phone: '+e.message));
  await phone.goto(site,{waitUntil:'domcontentloaded'});
  await phone.locator('[data-action="party"]').first().click();
  await phone.locator('dialog[open] .bigscreen-steps').waitFor({timeout:8000});
  assert.equal(await phone.locator('dialog[open] [data-screen="tv"]').count(),1,'the prompt offers "This screen is our TV"');
  await phone.locator('dialog[open] [data-screen="tv"]').click();
  await phone.locator('.host-screen').first().waitFor({timeout:15000});
  assert.equal(await phone.evaluate(()=>localStorage.getItem('jambaloop-screen')),null,'a touchscreen is not remembered as a TV');
  assert.equal(await phone.evaluate(()=>sessionStorage.getItem('jambaloop-screen')),'tv','it is the TV for this visit');
  const code=await phone.evaluate(()=>JSON.parse(sessionStorage.getItem('quizmas-session')).code);
  // Later the same phone scans a friend's QR code: it is a phone again.
  const later=await phoneContext.newPage();
  later.on('pageerror',e=>errors.push('phone later: '+e.message));
  await later.goto(site+'/?join='+code,{waitUntil:'domcontentloaded'});
  await later.waitForTimeout(600);
  const joined=await later.evaluate(()=>({w:innerWidth,tv:document.documentElement.classList.contains('tv-screen'),deck:document.documentElement.classList.contains('mobile-deck')}));
  assert.deepEqual(joined,{w:390,tv:false,deck:true},'joining from a QR code is the phone view');
  console.log('PASS: a phone gets the prompt; "This screen is our TV" hosts for that visit only, and a join link is the phone view again');
  // 4. The screen check: ?device shows what the device reports and lets you choose.
  // The link is on the home page, beside "No downloads", on a TV and on a laptop.
  for(const options of [tvStick(fireAgent),{viewport:{width:1280,height:720}}]){
    const home=await (await browser.newContext(options)).newPage();
    await home.goto(site,{waitUntil:'domcontentloaded'});
    const link=home.locator('.home-tv-link');
    await link.waitFor({timeout:10000});
    assert.ok(await link.isVisible(),'"On a TV?" is visible on the home page');
    await link.click();
    await home.locator('dialog[open] [data-action="screen-choice"]').first().waitFor({timeout:5000});
  }
  const check=await (await browser.newContext(tvStick(desktopAgent))).newPage();
  check.on('pageerror',e=>errors.push('check: '+e.message));
  // Host first, so the tab has a saved room; ?device must still open and stay open.
  await check.goto(site,{waitUntil:'domcontentloaded'});
  await check.locator('[data-action="party"]').first().click();
  await check.locator('.host-screen').first().waitFor({timeout:15000});
  await check.goto(site+'/?device',{waitUntil:'domcontentloaded'});
  await check.waitForTimeout(1500);
  assert.equal(await check.locator('dialog[open] [data-action="screen-choice"]').count(),3,'the screen check stays open over a saved room');
  await check.locator('dialog[open] [data-action="screen-choice"][data-screen="tv"]').waitFor({timeout:8000});
  await check.locator('dialog[open] .screen-details summary').click();
  const report=await check.locator('dialog[open] .screen-report').innerText();
  assert.match(report,/Touch points\s+0/);
  assert.match(report,/Page size\s+\d+×\d+/);
  await check.screenshot({path:'browser-screenshots/fire-tv-screen-check.png'});
  await check.locator('dialog[open] [data-action="screen-choice"][data-screen="tv"]').click();
  await check.waitForFunction(()=>document.documentElement.classList.contains('tv-screen'),null,{timeout:8000});
  assert.equal(await check.evaluate(()=>localStorage.getItem('jambaloop-screen')),'tv');
  // ?auto clears it again.
  await check.goto(site+'/?auto',{waitUntil:'domcontentloaded'});
  assert.equal(await check.evaluate(()=>localStorage.getItem('jambaloop-screen')),null);
  console.log('PASS: "On a TV?" is on the home page; ?device shows the screen check even over a saved room; "This is our TV" sticks; ?auto clears it');
  // 5. Tile captions are never cut off, at every grid size the home page uses, on every page; and every tile is on screen.
  for(const [name,options,grid] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},false],['tablet',{viewport:{width:1024,height:768}},true],['full hd',{viewport:{width:1920,height:1080}},true]]){
    const context=await browser.newContext(options);
    if(grid)await context.addInitScript(()=>{try{localStorage.setItem('jambaloop-home-view','grid')}catch{}});
    const page=await context.newPage();
    await page.goto(site,{waitUntil:'domcontentloaded'});
    await page.locator('.game-tile').first().waitFor({timeout:15000});
    await page.waitForTimeout(400);
    for(let pageNumber=0;pageNumber<4;pageNumber++){
      const report=await page.evaluate(()=>[...document.querySelectorAll('.game-tile')].filter(t=>t.getBoundingClientRect().width>0).map(t=>{
        const k=t.querySelector('.tile-kind');const r=t.getBoundingClientRect();
        const box=t.closest('.launcher-content')?.getBoundingClientRect()??{left:0,right:innerWidth};
        const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return {mode:t.dataset.mode,cut:k.scrollWidth>k.clientWidth+1,inside:r.right<=box.right+1&&r.left>=box.left-1,reachable:Boolean(hit&&t.contains(hit))};}));
      assert.deepEqual(report.filter(t=>t.cut).map(t=>t.mode),[],`no type cut off (${name}, page ${pageNumber+1})`);
      assert.deepEqual(report.filter(t=>!t.inside||!t.reachable).map(t=>t.mode),[],`every tile is on screen (${name}, page ${pageNumber+1})`);
      const next=page.locator('.mode-pagination button:has-text("Next"):enabled');
      if(!await next.count())break;
      await next.first().click();await page.waitForTimeout(300);
    }
    await page.screenshot({path:`browser-screenshots/fire-tv-tiles-${name.replace(' ','-')}.png`});
    await context.close();
  }
  console.log('PASS: tile captions are whole and every tile is on screen at phone, tablet and full HD sizes');
  // 6. A narrow laptop window that chooses "This screen is our TV" drops the paged phone layout at once.
  const narrow=await (await browser.newContext({viewport:{width:420,height:640}})).newPage();
  await narrow.goto(site,{waitUntil:'domcontentloaded'});
  await narrow.locator('[data-action="party"]').first().click();
  await narrow.locator('dialog[open] [data-screen="tv"]').click();
  await narrow.locator('.host-screen').first().waitFor({timeout:15000});
  await narrow.waitForTimeout(500);
  assert.equal(await narrow.evaluate(()=>document.documentElement.classList.contains('mobile-deck')),false,'no paged phone layout on the chosen TV');
  console.log('PASS: choosing "This screen is our TV" in a narrow window drops the phone layout');
  assert.deepEqual(errors,[],'no page errors');
}finally{await browser.close();}
