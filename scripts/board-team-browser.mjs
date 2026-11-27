// End-to-end preview of board/team options in the actual browser.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader'],
});
await mkdir('browser-screenshots',{recursive:true});
try {
  for(const [width,height,style,players,groups] of [
    [1366,768,'teams',4,2],
    [1920,1080,'individual',3,3],
    [1024,768,'teams',3,3],
  ]) {
    const context=await browser.newContext({viewport:{width,height}});
    const page=await context.newPage();
    page.on('pageerror',error=>console.error('Browser runtime error:',error.message));
    await page.goto(site,{waitUntil:'networkidle',timeout:30000});
    // Big screens open on the game shelf; this workflow starts from the tile gallery.
    await page.locator('#game-carousel .carousel-card, .game-tile').first().waitFor({timeout:15000});
    if(await page.locator('[data-action="carousel-view"]').isVisible())await page.locator('[data-action="carousel-view"]').click();
    await page.locator('[data-action="preview-mode"][data-mode="board"]').click();
    await page.locator('#game-preview [data-action="party"]').click();
  await page.locator('[data-action="party-skip"]').click(); await page.locator('[data-picker-tv] [data-action="picker-settings"]').click();
    const form=page.locator('#configure-form');
    await form.locator('input[name="playStyle"][value="'+style+'"]').check();
    if(style==='teams')await form.locator('select[name="teamCount"]').selectOption(String(groups));
    await form.locator('button[type="submit"]').click();
    await page.locator('.room-code').waitFor({timeout:15000});
    const code=(await page.locator('.room-code').innerText()).trim();
    assert.match(code,/^\d{6}$/);
    for(let i=0;i<players;i++) {
      const joined=await context.request.post(site+'/api/rooms/'+code+'/join',{data:{name:'Browser '+i}});
      assert.equal(joined.status(),201,await joined.text());
    }
    await page.waitForFunction(count=>document.querySelectorAll('.lobby-team').length===count,
      groups,{timeout:15000});
    await page.waitForFunction(n=>document.querySelector('.roster-panel h2')?.textContent?.includes('('+n+')'),
      players,{timeout:15000});
    const preview=page.locator('.roster-panel .lobby-team-preview');
    assert.equal(await preview.isVisible(),true,'Balanced team preview missing');
    await page.screenshot({path:`browser-screenshots/board-${style}-lobby-${width}x${height}.png`});
    await page.locator('.roster-panel [data-action="advance"]').click();
    // The lane is chosen at the junction, not at the start: the first turn goes straight to the roll.
    await page.locator('.turn-copy [data-action="roll"]').waitFor({timeout:15000});
    assert.equal(await page.locator('.board-path-picker').count(),0,'no lane choice before the piece reaches the junction');
    await page.locator('.turn-copy [data-action="roll"]').click();
    await page.locator('#board-stage').waitFor({timeout:15000});
    const layout=await page.evaluate(()=>{
      const pageRoot=document.scrollingElement;
      const stage=document.querySelector('#board-stage')?.getBoundingClientRect();
      const controls=document.querySelector('.turn-copy')?.getBoundingClientRect();
      return {pageHeight:pageRoot.scrollHeight,pageWidth:pageRoot.scrollWidth,
        width:innerWidth,height:innerHeight,
        stageHeight:stage?.height,stageBottom:stage?.bottom,
        controlsBottom:controls?.bottom};
    });
    assert.ok(layout.pageHeight<=height+2, 'TV page scroll at '+width+'×'+height+' '+JSON.stringify(layout));
    assert.ok(layout.pageWidth<=width+2, 'TV horizontal page overflow '+JSON.stringify(layout));
    assert.ok(layout.stageHeight>175 && layout.stageBottom<=height+2,
      '3D Board stage outside TV '+JSON.stringify(layout));
    assert.ok(layout.controlsBottom<=height+2,
      'Board controls outside TV '+JSON.stringify(layout));
    await page.screenshot({path:`browser-screenshots/board-${style}-playing-${width}x${height}.png`});
    console.log(`PASS: Board ${style}, ${players} players, ${groups} groups, ${width}×${height} — no page scroll`);
    await context.close();
  }
} finally {await browser.close();}
