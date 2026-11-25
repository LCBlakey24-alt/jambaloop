// Optional browser acceptance test for the responsive one-screen Jambaloop launcher.
// Run via the GitHub Actions browser workflow; Playwright is not a runtime dependency.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {modes} from '../public/game-config.js';

const base = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const sizes=[
  [1280,720,modes.length],[1366,768,modes.length],[1920,1080,modes.length],
  [1024,768,8],[800,768,6],[390,844,4]
];
await mkdir('browser-screenshots',{recursive:true});
// Big screens open on the game shelf: a 3D carousel whose centred game themes
// the page. It must fit, respond to a remote's arrow keys, swipes and clicks,
// keep the voice guide opt-in, then hand over to the tile grid on request.
async function checkCarousel(page,width,height){
  const cards=page.locator('#game-carousel .carousel-card');
  await cards.first().waitFor({timeout:15000});
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await cards.count(),modes.length,'Every game sits on the shelf');
  const centre=()=>page.locator('.carousel-card[aria-current="true"]').getAttribute('data-mode');
  assert.equal(await centre(),modes[0][0]);
  const fit=await page.evaluate(()=>({info:document.querySelector('.carousel-info').getBoundingClientRect().bottom,
    track:document.querySelector('.carousel-track').getBoundingClientRect().bottom,doc:document.scrollingElement.scrollHeight,
    shell:document.querySelector('[data-home-shell]').dataset.homeView}));
  assert.ok(fit.info<=height+1&&fit.doc<=height+1&&fit.shell==='carousel','Shelf fits at '+width+'×'+height+': '+JSON.stringify(fit));
  await page.keyboard.press('ArrowRight');
  assert.equal(await centre(),modes[1][0],'Remote right arrow turns the shelf');
  assert.match(await page.locator('.carousel-theme.is-active').getAttribute('style'),new RegExp("--id-display:'"+'Show Wheel'),'Page takes the centred game\'s identity');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await centre(),modes[0][0]);
  if(width===1920){
    const track=await page.locator('.carousel-track').boundingBox();
    await page.mouse.move(track.x+track.width*.7,track.y+track.height/2);await page.mouse.down();
    await page.mouse.move(track.x+track.width*.3,track.y+track.height/2,{steps:6});await page.mouse.up();
    assert.equal(await centre(),modes[1][0],'Swiping left brings the next game in');
    // Light "paper" shows switch the whole home screen to ink.
    const cardsAt=modes.findIndex(([id])=>id==='cards');
    for(let i=1;i<cardsAt;i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(800);
    assert.equal(await page.locator('[data-home-shell]').getAttribute('data-carousel-scheme'),'light');
    const ink=await page.locator('.home-intro h1').evaluate(el=>getComputedStyle(el).color);
    assert.equal(ink,'rgb(42, 18, 48)','Home title switches to the paper show\'s ink');
    await page.screenshot({path:'browser-screenshots/carousel-cards-1920x1080.png'});
    // Voice guide: nothing downloads until it is switched on.
    const raceAt=modes.findIndex(([id])=>id==='quizrace');
    for(let i=cardsAt;i<raceAt;i++) await page.keyboard.press('ArrowRight');
    assert.equal(await centre(),'quizrace');
    const early=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/audio/narrator/')).length);
    assert.equal(early,0,'The voice guide is opt-in');
    const audio=page.waitForRequest(request=>request.url().endsWith('/audio/narrator/quizrace.mp3'),{timeout:8000});
    await page.locator('[data-action="carousel-voice"]').click();
    await audio;
    assert.equal(await page.locator('[data-action="carousel-voice"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-action="carousel-voice"]').click();
    await page.screenshot({path:'browser-screenshots/carousel-quizrace-1920x1080.png'});
    // Choosing the centred card opens setup for that game.
    await page.locator('.carousel-card[aria-current="true"]').click();
    assert.equal(await page.locator('#dialog').evaluate(el=>el.open),true,'Setup opens from the shelf');
    assert.equal(await page.locator('input[name="mode"]:checked').inputValue(),'quizrace');
    await page.locator('#dialog [data-action="close"]').click();
    console.log('PASS: shelf swipe, remote arrows, paper theme, opt-in voice and setup from the centre card');
  }
  await page.screenshot({path:`browser-screenshots/carousel-${width}x${height}.png`,fullPage:false});
  await page.locator('[data-action="carousel-view"]').click();
  assert.equal(await page.locator('#game-carousel').isVisible(),false,'Tile view replaces the shelf');
  console.log(`PASS: game shelf at ${width}×${height}`);
}

try {
  for(const [width,height,count] of sizes) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    await page.goto(base,{waitUntil:'networkidle',timeout:30000});
    if(width>=1000&&height>=600) await checkCarousel(page,width,height);
    await page.locator('.game-tile').first().waitFor({timeout:15000});
    await page.evaluate(()=>document.fonts.ready);
    assert.match(await page.title(),/Jambaloop.*Rookie Quest Games/);
    const publisher = page.locator('.home-publisher');
    assert.equal(await publisher.isVisible(),true,'The publisher should be credited without taking over the Jambaloop home screen');
    assert.match(await publisher.innerText(),/ROOKIE QUEST GAMES/);
    const layout=await page.evaluate(()=>{
      const tiles=[...document.querySelectorAll('.game-tile')];
      const visible=tiles.filter(tile=>{
        const r=tile.getBoundingClientRect();
        return r.width>30 && r.height>30 &&
          r.top>=0 && r.bottom<=innerHeight+2 && r.left>=0 && r.right<=innerWidth+2;
      });
      const scrollRoot=document.scrollingElement;
      return {
        documentHeight:scrollRoot.scrollHeight,
        viewportHeight:innerHeight,
        documentWidth:scrollRoot.scrollWidth,
        viewportWidth:innerWidth,
        cards:tiles.length,
        visibleCards:visible.length,
        logoWhite:getComputedStyle(document.querySelector('.site-logo-white')).display!=='none',
        accent:getComputedStyle(document.body).getPropertyValue('--home-accent').trim(),
        background:getComputedStyle(document.body).backgroundColor,
        firstFont:getComputedStyle(tiles[0].querySelector('.tile-wordmark')).fontFamily,
        pager:document.querySelector('#mode-page-output').textContent
      };
    });
    assert.ok(layout.documentHeight<=height+1,`Unexpected homepage page scroll at ${width}×${height}: ${JSON.stringify(layout)}`);
    assert.ok(layout.documentWidth<=width+1,`Unexpected horizontal page scroll at ${width}×${height}`);
    assert.equal(layout.cards,count,`Wrong page size for ${width}×${height}`);
    assert.equal(layout.visibleCards,count,`Game tiles clipped at ${width}×${height}: ${JSON.stringify(layout)}`);
    assert.equal(layout.logoWhite,true,'Light-on-dark Jambaloop logo should be used');
    assert.match(layout.background,/rgb\(16, 18, 38\)|rgb\(16, 18, 38\)/);
    await page.screenshot({path:`browser-screenshots/home-${width}x${height}.png`,fullPage:false});
    console.log(`PASS: homepage ${width}×${height} fits with ${count} tiles — ${layout.firstFont}`);

    if(width===1366) {
      assert.equal(await page.locator('#mode-pager').isVisible(),false,'Desktop should show every game without pagination');
      const shown=await page.locator('.game-tile').evaluateAll(tiles=>tiles.map(tile=>tile.dataset.mode));
      assert.deepEqual(shown,modes.map(mode=>mode[0]),'All games must be immediately accessible in desktop order');
      await page.locator('.game-tile[data-mode="quizrace"]').click();
      assert.equal(await page.locator('#game-preview').isVisible(),true,'Expanded preview missing');
      assert.equal(await page.locator('#mode-list').isVisible(),false,'Grid should hide while preview is expanded');
      assert.match(await page.locator('#game-preview').innerText(),/How to play/i);
      assert.match(await page.locator('#game-preview').innerText(),/Cross|line first|finish/i);
      assert.equal(await page.locator('#game-preview [data-action="narrator-toggle"]').count(),1);
      assert.match(await page.locator('.narrator-script p').textContent(),/Welcome to Quiz Race!/);
      const beforeAudio=await page.evaluate(() =>
        performance.getEntriesByType('resource').filter(entry=>entry.name.endsWith('/audio/narrator/quizrace.mp3')).length);
      assert.equal(beforeAudio,0,'Audio should never download before the user taps Listen');
      const audioRequest=page.waitForRequest(request=>request.url().endsWith('/audio/narrator/quizrace.mp3'),{timeout:8000});
      await page.locator('#game-preview [data-action="narrator-toggle"]').click();
      await audioRequest;
      console.log('PASS: narrator is opt-in and static Quiz Race recording starts downloading on Listen');
      await page.screenshot({path:'browser-screenshots/preview-quizrace.png'});
      await page.locator('[data-action="close-preview"]').click();
      assert.equal(await page.locator('.game-tile[data-mode="quizrace"]').isVisible(),true);
      await page.locator('.game-tile[data-mode="quizrace"]').click();
      await page.locator('#game-preview [data-action="host"]').click();
      assert.equal(await page.locator('#dialog').evaluate(el=>el.open),true,'Setup dialogue missing');
      assert.equal(await page.locator('input[name="mode"]:checked').inputValue(),'quizrace','Selected game did not reach setup');
      await page.locator('#dialog [data-action="close"]').click();
      await page.locator('[data-action="home-tab"][data-tab="topics"]').first().click();
      assert.equal(await page.locator('[data-home-panel="topics"]').isVisible(),true,'Topic browser did not open');
      assert.equal(await page.locator('[data-home-panel="games"]').isVisible(),false,'Game panel not hidden');
      await page.locator('#topic-search').fill('sports');
      assert.match((await page.locator('#category-list').innerText()).toLowerCase(),/sports/);
      await page.locator('[data-action="home-tab"][data-tab="games"]').first().click();
      assert.equal(await page.locator('[data-home-panel="games"]').isVisible(),true,'Game tab did not return');
      console.log('PASS: page navigation, Quiz Race preview, setup dialogue and topic browser');
    }
    if(width===390){
      await page.locator('[data-action="mode-page"][data-direction="1"]').click();
      assert.equal(await page.locator('.game-tile').count(),4,'Phone retains clear four-game pagination');
      await page.locator('[data-action="mode-page"][data-direction="-1"]').click();
      assert.equal(await page.locator('.game-tile').count(),4);
    }
    if (await page.locator('#game-preview').isVisible()) {
      await page.locator('#game-preview [data-action="close-preview"]').click();
    }
    await page.locator('.game-tile').first().click();
    const previewFit=await page.evaluate(() => {
      const shell=document.querySelector('#game-preview');
      const actions=shell?.querySelector('.preview-actions');
      const intro=shell?.querySelector('[data-action="narrator-toggle"]');
      const r=actions?.getBoundingClientRect(), p=shell?.getBoundingClientRect();
      const a=intro?.getBoundingClientRect();
      return {previewBottom:p?.bottom,actionsBottom:r?.bottom,actionsWidth:r?.width,
        introBottom:a?.bottom,viewportHeight:innerHeight};
    });
    assert.ok(previewFit.actionsWidth>60 && previewFit.actionsBottom<=height+2 &&
      previewFit.actionsBottom<=previewFit.previewBottom+2 &&
      previewFit.introBottom<=previewFit.previewBottom+2,
      'Expanded preview buttons clipped at '+width+'×'+height+': '+JSON.stringify(previewFit));
    await page.screenshot({path:`browser-screenshots/intro-${width}x${height}.png`,fullPage:false});
    console.log('PASS: narrator, instructions and Setup buttons fit the '+width+'×'+height+' preview');
    if([1366,390].includes(width)) {
      await page.locator('#game-preview [data-action="close-preview"]').click();
      await page.locator('.home-actions [data-action="join"]').click();
      assert.equal(await page.locator('#dialog').evaluate(el=>el.open),true,'Player join should open as a dialog');
      assert.equal(await page.locator('#join-room-code').getAttribute('inputmode'),'numeric');
      assert.equal(await page.locator('#join-player-name').getAttribute('required'),'');
      assert.equal(await page.locator('.join-photo-option').getAttribute('open'),null,'Photo upload must be optional and collapsed');
      const fit=await page.evaluate(()=>{
        const box=document.querySelector('#dialog').getBoundingClientRect();
        return {left:box.left,right:box.right,top:box.top,bottom:box.bottom};
      });
      assert.ok(fit.left>=0&&fit.right<=width+2&&fit.top>=0&&fit.bottom<=height+2,
        'Player join dialog must fit the viewport: '+JSON.stringify(fit));
      await page.screenshot({path:`browser-screenshots/player-join-${width}x${height}.png`,fullPage:false});
      await page.locator('#dialog [data-action="close"]').click();
      console.log('PASS: accessible, responsive player join dialog at '+width+'×'+height);
    }
    await page.close();
  }
  const audioPage=await browser.newPage();
  for(const id of ['classic','board','quizrace']) {
    const response=await audioPage.request.get(base+'/audio/narrator/'+id+'.mp3');
    assert.equal(response.status(),200,'Missing committed recording '+id);
    assert.ok((await response.body()).length>6000,'Empty recorded audio for '+id);
  }
  await audioPage.close();
  console.log('PASS: all three pre-recorded ElevenLabs MP3 files are bundled and served');
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  await page.goto(base,{waitUntil:'networkidle',timeout:30000});
  await page.locator('.carousel-card').first().waitFor();
  assert.equal(await page.locator('.carousel-card').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s','Reduce motion stops the shelf gliding');
  await page.locator('[data-action="carousel-view"]').click();
  await page.locator('.game-tile').first().waitFor();
  const animation=await page.locator('.game-tile .tile-motion i').first().evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(animation,'none','Reduce motion must disable card animations');
  console.log('PASS: reduced-motion disables decorative card animation');
  await page.close();
} finally { await browser.close(); }
