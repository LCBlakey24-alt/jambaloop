import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir('browser-screenshots',{recursive:true});

const sizes=[[1280,720],[1920,1080],[1024,768]];
try{
  // Validate that a real player can discover and configure the new game.
  const setupContext=await browser.newContext({viewport:{width:1366,height:768}});
  const setupPage=await setupContext.newPage();
  await setupPage.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(await setupPage.locator('.game-tile').count(),19,'All games should appear on desktop');
  await setupPage.locator('.game-tile[data-mode="spotlight"]').click();
  await setupPage.locator('#game-preview [data-action="host"]').click();
  const setupForm=setupPage.locator('#host-form');
  assert.equal(await setupForm.locator('input[name="mode"]:checked').inputValue(),'spotlight');
  assert.equal(await setupForm.locator('select[name="count"]').isVisible(),true);
  assert.deepEqual(await setupForm.locator('select[name="count"] option')
    .evaluateAll(options=>options.map(option=>option.value)),['1','2','3']);
  assert.equal(await setupForm.locator('select[name="count"]').inputValue(),'1');
  assert.equal(await setupForm.locator('input[name="playStyle"][value="teams"]').isDisabled(),true);
  await setupContext.close();
  console.log('PASS: Spotlight Wheel launches from the menu with 1–3 turns per contestant');

  for(const [width,height] of sizes){
    const ctx=await browser.newContext({viewport:{width,height}});
    const errors=[];
    const created=await ctx.request.post(site+'/api/rooms',{data:{
      mode:'spotlight',category:'mixed',format:'choice',count:1,seconds:0,playStyle:'individual',
    }});
    assert.equal(created.status(),201,await created.text());
    const {code,host:hostKey}=await created.json();
    const keys=[];
    for(const name of ['Alex','Blake','Charlie']) {
      const joined=await ctx.request.post(site+'/api/rooms/'+code+'/join',{data:{name}});
      assert.equal(joined.status(),201,await joined.text());
      keys.push((await joined.json()).key);
    }
    const snap=async key=>{
      const reply=await ctx.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}});
      assert.equal(reply.status(),200);return reply.json();
    };
    const phoneFor=async key=>{
      const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
      await context.addInitScript(({code,key})=>{
        sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
      },{code,key});
      const page=await context.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
      return {context,page};
    };
    await ctx.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true}));
    },{code,key:hostKey});
    const host=await ctx.newPage();
    host.on('pageerror',error=>errors.push(error.message));
    await host.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    await host.locator('.roster-panel').waitFor({timeout:15000});
    assert.match(await host.locator('.studio-publisher').textContent(),/ROOKIE QUEST GAMES/,'TV lobby credits the publishing label');
    const start=await ctx.request.post(site+'/api/rooms/'+code+'/advance',{
      headers:{'x-game-key':hostKey},data:{phase:'lobby',game:1,index:0},
    });
    assert.equal(start.status(),204,await start.text());
    await host.locator('.spotlight-game[data-spotlight-phase="spotlight-ready"]').waitFor({timeout:15000});
    assert.equal(await host.locator('.studio-publisher').count(),0,'Publisher credit should not cover an active TV game');
    await host.screenshot({path:'browser-screenshots/spotlight-ready-'+width+'x'+height+'.png'});
    await host.locator('.spotlight-game [data-action="advance"]').click();
    await host.locator('.spotlight-game[data-spotlight-phase="spotlight-expert"]').waitFor({timeout:15000});
    const game=await snap(hostKey);
    assert.equal(game.party.type,'spotlight');
    assert.notEqual(game.party.expert.id,game.party.contestant.id);
    const identities=await Promise.all(keys.map(async key=>({key,view:await snap(key)})));
    const expertKey=identities.find(x=>x.view.player.id===game.party.expert.id).key;
    const contestantKey=identities.find(x=>x.view.player.id===game.party.contestant.id).key;
    const expert=await phoneFor(expertKey);
    const contestant=await phoneFor(contestantKey);
    await expert.page.locator('button[data-action="spotlight-advice"]').first().waitFor({timeout:15000});
    assert.equal(await contestant.page.locator('button[data-action="spotlight-answer"]').count(),0);
    assert.equal((await snap(hostKey)).party.advice,undefined);
    assert.equal((await snap(contestantKey)).party.advice,undefined);
    await expert.page.locator('button[data-action="spotlight-advice"]').first().click();
    await contestant.page.locator('button[data-action="spotlight-answer"]').first().waitFor({timeout:15000});
    assert.ok((await contestant.page.locator('.spotlight-expert-tip').innerText()).includes('Expert advice'));
    assert.equal((await snap(hostKey)).party.advice,undefined,'Expert hint must stay private from TV');
    // Portrait phones must always be able to scroll an answer button into view, even for long prompts.
    await contestant.page.locator('button[data-action="spotlight-answer"]').first().scrollIntoViewIfNeeded({timeout:15000});
    assert.equal(await contestant.page.locator('button[data-action="spotlight-answer"]').first().isVisible(),true);
    await contestant.page.locator('button[data-action="spotlight-answer"]').first().click();
    await host.locator('.spotlight-game[data-spotlight-phase="spotlight-reveal"]').waitFor({timeout:15000});
    const reveal=await snap(hostKey);
    assert.ok(Number.isInteger(reveal.party.points));
    assert.ok(Number.isInteger(reveal.party.expertPoints));
    assert.ok(reveal.party.question.correct>=0);
    assert.equal(await host.locator('.spotlight-awards>div').count(),2);
    const metrics=await host.evaluate(()=>{
      const main=document.querySelector('.spotlight-game').getBoundingClientRect();
      return {bottom:main.bottom,width:document.scrollingElement.scrollWidth,
        height:document.scrollingElement.scrollHeight};
    });
    assert.ok(metrics.bottom<=height+3,'Spotlight stage clipped '+JSON.stringify(metrics));
    assert.ok(metrics.width<=width+2,'Spotlight horizontal overflow '+JSON.stringify(metrics));
    assert.ok(metrics.height<=height+2,'Spotlight page scroll '+JSON.stringify(metrics));
    await host.screenshot({path:'browser-screenshots/spotlight-reveal-'+width+'x'+height+'.png'});
    if(width===1280) {
      await contestant.page.screenshot({path:'browser-screenshots/spotlight-contestant-phone.png'});
      await expert.page.screenshot({path:'browser-screenshots/spotlight-expert-phone.png'});
    }
    // Complete the full game and verify the final standings fit the TV stage.
    for(let turn=1;turn<3;turn++) {
      await host.locator('.spotlight-game [data-action="advance"]').click(); // next contestant
      await host.locator('.spotlight-game[data-spotlight-phase="spotlight-ready"]').waitFor({timeout:15000});
      await host.locator('.spotlight-game [data-action="advance"]').click(); // spin for expert
      await host.locator('.spotlight-game[data-spotlight-phase="spotlight-expert"]').waitFor({timeout:15000});
      await host.locator('.spotlight-game [data-action="advance"]').click(); // skip advice
      await host.locator('.spotlight-game[data-spotlight-phase="spotlight-answer"]').waitFor({timeout:15000});
      await host.locator('.spotlight-game [data-action="advance"]').click(); // reveal unanswered question
      await host.locator('.spotlight-game[data-spotlight-phase="spotlight-reveal"]').waitFor({timeout:15000});
    }
    await host.locator('.spotlight-game [data-action="advance"]').click(); // show final standings
    await host.locator('.spotlight-game[data-spotlight-phase="finished"]').waitFor({timeout:15000});
    assert.equal(await host.locator('.spotlight-final-ranking li').count(),3);
    assert.equal(await host.locator('.results-winner-banner').count(),1,'TV gets a scored winner highlight');
    await contestant.page.locator('.spotlight-game[data-spotlight-phase="finished"]').waitFor({timeout:15000});
    assert.equal(await contestant.page.locator('.results-player-finish').count(),1,'Player sees their final score and rank');
    for(const [pw,ph] of [[390,844],[844,390]]){
      await contestant.page.setViewportSize({width:pw,height:ph});
      await contestant.page.waitForFunction(()=>
        document.querySelector('.results-player-finish')?.getClientRects().length>0);
      const layout=await contestant.page.evaluate(()=>{
        const app=document.querySelector('#app');
        const compact=document.documentElement.classList.contains('mobile-deck');
        return {compact, scrollMode:getComputedStyle(app).overflowY,
          appWidth:app.scrollWidth,clientWidth:app.clientWidth,
          documentWidth:document.scrollingElement.scrollWidth,
          viewportWidth:document.documentElement.clientWidth,
          hidden:document.querySelectorAll('.results-player-finish [data-deck-hidden]').length,
          isHidden:Boolean(document.querySelector('.results-player-finish')?.closest('[data-deck-hidden]')),
          resultVisible:document.querySelector('.results-player-finish')?.getClientRects().length>0,
          pagerVisible:[...document.querySelectorAll('.mobile-pager')].some(pager=>!pager.hidden)};
      });
      if(layout.compact) assert.equal(layout.scrollMode,'auto','Compact phone finals should scroll');
      assert.ok(layout.resultVisible&&!layout.isHidden,'Player final position is reachable: '+JSON.stringify(layout));
      assert.equal(layout.hidden,0,'Result details may not be split into pages');
      assert.equal(layout.pagerVisible,false,'Final results should not show a mobile page pager');
      assert.ok(layout.appWidth<=layout.clientWidth+2,'Phone final results overflow '+pw+'x'+ph+': '+JSON.stringify(layout));
      assert.ok(layout.documentWidth<=layout.viewportWidth+2,'Final results overflow the document: '+JSON.stringify(layout));
      await contestant.page.locator('.results-player-finish').scrollIntoViewIfNeeded();
      await contestant.page.screenshot({path:'browser-screenshots/spotlight-final-phone-'+pw+'x'+ph+'.png'});
    }
    assert.match(await host.locator('.studio-publisher').textContent(),/ROOKIE QUEST GAMES/,'Final TV screen restores publisher credit');
    const finalFit=await host.evaluate(()=>{
      const board=document.querySelector('.spotlight-game').getBoundingClientRect();
      return {bottom:board.bottom,scrollWidth:document.scrollingElement.scrollWidth,
        scrollHeight:document.scrollingElement.scrollHeight};
    });
    assert.ok(finalFit.bottom<=height+3,'Spotlight final board clipped: '+JSON.stringify(finalFit));
    assert.ok(finalFit.scrollWidth<=width+2&&finalFit.scrollHeight<=height+2,
      'Spotlight final results overflow TV: '+JSON.stringify(finalFit));
    await host.screenshot({path:'browser-screenshots/spotlight-final-'+width+'x'+height+'.png'});
    assert.deepEqual(errors,[],'No JavaScript errors in the TV and phone flow');
    console.log('PASS: Spotlight Wheel complete phone/TV match, reveal and final leaderboard at '+width+'x'+height);
    await expert.context.close();
    await contestant.context.close();
    await ctx.close();
  }
}finally{await browser.close();}
