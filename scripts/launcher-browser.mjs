// Optional browser acceptance test for the responsive one-screen Jambaloop launcher.
// Run via the GitHub Actions browser workflow; Playwright is not a runtime dependency.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const sizes=[
  [1280,720,8],[1366,768,8],[1920,1080,8],
  [1024,768,8],[800,768,6],[390,844,4]
];
await mkdir('browser-screenshots',{recursive:true});
try {
  for(const [width,height,count] of sizes) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    await page.goto(base,{waitUntil:'networkidle',timeout:30000});
    await page.locator('.game-tile').first().waitFor({timeout:15000});
    await page.evaluate(()=>document.fonts.ready);
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
      await page.locator('[data-action="mode-page"][data-direction="1"]').click();
      assert.equal(await page.locator('.game-tile').count(),4,'Second page should contain remaining four modes');
      await page.locator('.game-tile[data-mode="quizrace"]').click();
      assert.equal(await page.locator('#game-preview').isVisible(),true,'Expanded preview missing');
      assert.equal(await page.locator('#mode-list').isVisible(),false,'Grid should hide while preview is expanded');
      assert.match(await page.locator('#game-preview').innerText(),/How to play/i);
      assert.match(await page.locator('#game-preview').innerText(),/Cross|line first|finish/i);
      assert.equal(await page.locator('#game-preview [data-action="narrator-toggle"]').count(),1);
      assert.match(await page.locator('.narrator-script').innerText(),/Welcome to Quiz Race!/);
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
  await page.locator('.game-tile').first().waitFor();
  const animation=await page.locator('.game-tile .tile-motion i').first().evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(animation,'none','Reduce motion must disable card animations');
  console.log('PASS: reduced-motion disables decorative card animation');
  await page.close();
} finally { await browser.close(); }
