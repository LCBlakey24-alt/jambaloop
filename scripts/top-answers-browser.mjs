import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import { releasedGameIds } from '../released-games.js';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});

async function fit(page,width,height,label) {
  const metrics=await page.evaluate(()=>{
    const stage=document.querySelector('.top-game').getBoundingClientRect();
    return {bottom:stage.bottom,scrollWidth:document.scrollingElement.scrollWidth,
      scrollHeight:document.scrollingElement.scrollHeight};
  });
  assert.ok(metrics.scrollWidth<=width+2,label+' horizontal overflow '+JSON.stringify(metrics));
  assert.ok(metrics.scrollHeight<=height+2,label+' vertical page overflow '+JSON.stringify(metrics));
  assert.ok(metrics.bottom<=height+3,label+' stage beyond viewport '+JSON.stringify(metrics));
}

try{
  // Ensure there is a working navigation and a real length selector.
  const menu=await browser.newContext({viewport:{width:1366,height:768}});
  const launcher=await menu.newPage();
  await launcher.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  // Big screens open on the game shelf; this workflow starts from the tile gallery.
  await launcher.locator('#game-carousel .carousel-card, .game-tile').first().waitFor({timeout:15000});
  if(await launcher.locator('[data-action="carousel-view"]').isVisible())await launcher.locator('[data-action="carousel-view"]').click();
  assert.deepEqual(await launcher.locator('.game-tile').evaluateAll(tiles=>tiles.map(tile=>tile.dataset.mode)),[...releasedGameIds],'All released games should appear on desktop');
  await launcher.locator('.game-tile[data-mode="topanswers"]').click();
  assert.match(await launcher.locator('#game-preview').innerText(),/Top Answers/);
  await launcher.locator('#game-preview [data-action="party"]').click();
  await launcher.locator('[data-picker-tv] [data-action="picker-settings"]').click();
  assert.equal(await launcher.locator('#configure-form input[name="mode"]:checked').inputValue(),'topanswers');
  assert.deepEqual(await launcher.locator('#configure-form select[name="count"] option')
    .evaluateAll(options=>options.map(option=>option.value)),['3','5','7']);
  assert.equal(await launcher.locator('#configure-form input[name="playStyle"][value="teams"]').isDisabled(),true);
  await menu.close();
  console.log('PASS: Top Answers can be hosted from the game menu in 3, 5 or 7 rounds');

  for(const [width,height] of [[1280,720],[1920,1080],[1024,768]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const errors=[];
    const made=await ctx.request.post(site+'/api/rooms',{data:{
      mode:'topanswers',category:'mixed',count:3,seconds:0,format:'choice',playStyle:'individual',
    }});
    assert.equal(made.status(),201,await made.text());
    const {code,host:hostKey}=await made.json();
    const keys=[];
    for(const name of ['Alex','Bailey','Charlie']){
      const joined=await ctx.request.post(site+'/api/rooms/'+code+'/join',{data:{name}});
      assert.equal(joined.status(),201,await joined.text());
      keys.push((await joined.json()).key);
    }
    const snap=async(key=hostKey)=>{
      const response=await ctx.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}});
      assert.equal(response.status(),200);
      return response.json();
    };
    const submit=async(key,index,action,option)=>{
      const response=await ctx.request.post(site+'/api/rooms/'+code+'/party',{
        headers:{'x-game-key':key},data:{game:1,index,action,option},
      });
      assert.equal(response.status(),204,await response.text());
    };
    await ctx.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true}));
    },{code,key:hostKey});
    const host=await ctx.newPage();
    host.on('pageerror',error=>errors.push(error.message));
    await host.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    await host.locator('.roster-panel').waitFor({timeout:15000});

    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    await mobile.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
    },{code,key:keys[0]});
    const phone=await mobile.newPage();
    phone.on('pageerror',error=>errors.push(error.message));
    await phone.goto(site,{waitUntil:'domcontentloaded',timeout:30000});

    const started=await ctx.request.post(site+'/api/rooms/'+code+'/advance',{
      headers:{'x-game-key':hostKey},data:{phase:'lobby',game:1,index:0},
    });
    assert.equal(started.status(),204,await started.text());
    const prompts=new Set();
    for(let round=0;round<3;round++){
      await host.locator('.top-game[data-top-phase="top-poll"]').waitFor({timeout:15000});
      await phone.locator('button[data-action="top-poll"]').first().waitFor({timeout:15000});
      const question=await snap();
      assert.ok(!prompts.has(question.party.prompt));
      prompts.add(question.party.prompt);
      assert.equal(question.party.counts,undefined,'Poll votes must not leak to TV');
      assert.equal(question.party.results,undefined);
      await fit(host,width,height,'Top Answers polling');
      if(round===0){
        await host.screenshot({path:'browser-screenshots/top-poll-tv-'+width+'x'+height+'.png'});
        if(width===1280)await phone.screenshot({path:'browser-screenshots/top-poll-phone.png'});
      }
      await phone.locator('button[data-action="top-poll"][data-option="0"]').click();
      await phone.locator('.top-progress-locked').waitFor({timeout:15000});
      await submit(keys[1],round,'poll',0);
      await submit(keys[2],round,'poll',1);
      await host.locator('.top-game[data-top-phase="top-guess"]').waitFor({timeout:15000});
      await phone.locator('button[data-action="top-guess"]').first().waitFor({timeout:15000});
      assert.equal((await snap()).party.counts,undefined,'TV cannot see room-vote totals during predictions');
      await fit(host,width,height,'Top Answers predicting');
      if(round===0)await host.screenshot({path:'browser-screenshots/top-guess-tv-'+width+'x'+height+'.png'});
      await phone.locator('button[data-action="top-guess"][data-option="0"]').click();
      await submit(keys[1],round,'guess',0);
      await submit(keys[2],round,'guess',1);
      await host.locator('.top-game[data-top-phase="top-reveal"]').waitFor({timeout:15000});
      const outcome=await snap();
      assert.deepEqual(outcome.party.counts,[2,1,0,0]);
      assert.deepEqual(outcome.party.results.leaders,[0]);
      assert.equal(outcome.party.results.totalVotes,3);
      assert.equal(await host.locator('.top-vote-tally').count(),4);
      assert.equal(await host.locator('.top-option.is-leader').count(),1);
      assert.equal((await snap(keys[0])).party.earned,140);
      await fit(host,width,height,'Top Answers reveal');
      if(round===0){
        await host.screenshot({path:'browser-screenshots/top-reveal-tv-'+width+'x'+height+'.png'});
        if(width===1280)await phone.screenshot({path:'browser-screenshots/top-reveal-phone.png'});
      }
      await host.locator('.top-advance [data-action="advance"]').click();
    }
    await host.locator('.top-game[data-top-phase="finished"]').waitFor({timeout:15000});
    assert.equal(await host.locator('.top-final-scores li').count(),3);
    await fit(host,width,height,'Top Answers final');
    await host.screenshot({path:'browser-screenshots/top-final-tv-'+width+'x'+height+'.png'});
    assert.deepEqual(errors,[],'Host TV and private phone must run without JavaScript errors');
    console.log('PASS: Top Answers full poll/predict/reveal and standings at '+width+'x'+height);
    await mobile.close();
    await ctx.close();
  }
}finally{await browser.close();}
