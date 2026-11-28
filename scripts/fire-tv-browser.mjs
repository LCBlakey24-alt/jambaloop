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
  assert.equal(await phone.evaluate(()=>localStorage.getItem('jambaloop-screen')),'tv','remembered on this device');
  console.log('PASS: a phone gets the prompt, and "This screen is our TV" hosts and is remembered');
  // 4. The screen check: ?device shows what the device reports and lets you choose.
  const check=await (await browser.newContext(tvStick(desktopAgent))).newPage();
  check.on('pageerror',e=>errors.push('check: '+e.message));
  await check.goto(site+'/?device',{waitUntil:'domcontentloaded'});
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
  console.log('PASS: ?device shows the screen check; "This is our TV" sticks; ?auto clears it');
  assert.deepEqual(errors,[],'no page errors');
}finally{await browser.close();}
