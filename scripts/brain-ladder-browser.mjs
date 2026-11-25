import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {brainPuzzleBank} from '../brain-ladder.js';
import { releasedGameIds } from '../released-games.js';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});

const correctIndex=q=>{
  const model=brainPuzzleBank.flat().find(p=>p.prompt===q.prompt);
  assert.ok(model,'Puzzle must originate in verified generator');
  return q.options.indexOf(model.answer);
};
const fit=async(page,width,height,label)=>{
  const stats=await page.evaluate(()=>{
    const stage=document.querySelector('.brain-game').getBoundingClientRect();
    return {bottom:stage.bottom,width:document.scrollingElement.scrollWidth,
      height:document.scrollingElement.scrollHeight};
  });
  assert.ok(stats.width<=width+2,label+' horizontally clipped: '+JSON.stringify(stats));
  assert.ok(stats.height<=height+2,label+' vertically scrolled: '+JSON.stringify(stats));
  assert.ok(stats.bottom<=height+3,label+' stage outside TV: '+JSON.stringify(stats));
};

try {
  // Make sure users can reach the game and choose a short or long climb.
  const startCtx=await browser.newContext({viewport:{width:1366,height:768}});
  const setup=await startCtx.newPage();
  await setup.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  // Big screens open on the game shelf; this workflow starts from the tile gallery.
  await setup.locator('#game-carousel .carousel-card, .game-tile').first().waitFor({timeout:15000});
  if(await setup.locator('[data-action="carousel-view"]').isVisible())await setup.locator('[data-action="carousel-view"]').click();
  assert.deepEqual(await setup.locator('.game-tile').evaluateAll(tiles=>tiles.map(tile=>tile.dataset.mode)),[...releasedGameIds],'All released games should appear on desktop');
  await setup.locator('.game-tile[data-mode="brain"]').click();
  assert.match(await setup.locator('#game-preview').innerText(),/Brain Ladder/i);
  await setup.locator('#game-preview [data-action="host"]').click();
  const form=setup.locator('#host-form');
  assert.equal(await form.locator('input[name="mode"]:checked').inputValue(),'brain');
  assert.equal(await form.locator('select[name="count"]').isVisible(),true);
  assert.deepEqual(await form.locator('select[name="count"] option').evaluateAll(options=>options.map(o=>o.value)),['5','7','10']);
  assert.equal(await form.locator('input[name="playStyle"][value="teams"]').isDisabled(),true);
  await startCtx.close();
  console.log('PASS: Brain Ladder is discoverable and supports 5, 7 and 10 levels');

  for(const [width,height] of [[1280,720],[1920,1080],[1024,768]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const errors=[];
    const created=await ctx.request.post(site+'/api/rooms',{data:{
      mode:'brain',category:'mixed',format:'choice',count:5,seconds:0,playStyle:'individual',
    }});
    assert.equal(created.status(),201,await created.text());
    const {code,host:hostKey}=await created.json();
    const keys=[];
    for(const name of ['Alex','Bailey','Charlie']){
      const joined=await ctx.request.post(site+'/api/rooms/'+code+'/join',{data:{name}});
      assert.equal(joined.status(),201,await joined.text());
      keys.push((await joined.json()).key);
    }
    const state=async(key=hostKey)=>{
      const response=await ctx.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}});
      assert.equal(response.status(),200);
      return response.json();
    };
    const postAnswer=async(key,index,option)=>{
      const response=await ctx.request.post(site+'/api/rooms/'+code+'/party',{
        headers:{'x-game-key':key},data:{game:1,index,action:'answer',option},
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

    const phoneCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    await phoneCtx.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
    },{code,key:keys[0]});
    const phone=await phoneCtx.newPage();
    phone.on('pageerror',error=>errors.push(error.message));
    await phone.goto(site,{waitUntil:'domcontentloaded',timeout:30000});

    const started=await ctx.request.post(site+'/api/rooms/'+code+'/advance',{
      headers:{'x-game-key':hostKey},data:{game:1,index:0,phase:'lobby'},
    });
    assert.equal(started.status(),204,await started.text());
    await host.locator('.brain-game[data-brain-phase="brain-question"]').waitFor({timeout:15000});
    await phone.locator('button[data-action="brain-answer"]').first().waitFor({timeout:15000});
    assert.equal(await host.locator('button[data-action="brain-answer"]').count(),0,'TV never accepts answers');
    assert.equal((await state()).party.question.correct,undefined,'TV cannot see the secret answer before reveal');
    await fit(host,width,height,'Brain Ladder question');
    await host.screenshot({path:'browser-screenshots/brain-tv-question-'+width+'x'+height+'.png'});
    if(width===1280)await phone.screenshot({path:'browser-screenshots/brain-phone-answer.png'});

    const seen=new Set();
    for(let level=0;level<5;level++){
      const live=await state();
      assert.equal(live.index,level);
      assert.equal(live.party.level,level+1);
      assert.ok(!seen.has(live.party.question.prompt));
      seen.add(live.party.question.prompt);
      const correct=correctIndex(live.party.question);
      await phone.locator('button[data-action="brain-answer"][data-option="'+correct+'"]').click();
      await phone.locator('.brain-locked').waitFor({timeout:15000});
      assert.equal((await state()).party.question.correct,undefined,'Early answer must remain secret');
      await postAnswer(keys[1],level,correct);
      await postAnswer(keys[2],level,correct);
      await host.locator('.brain-game[data-brain-phase="brain-reveal"]').waitFor({timeout:15000});
      assert.equal(await host.locator('.brain-answer.is-correct').count(),1);
      assert.equal(await host.locator('.brain-explanation').count(),1);
      await fit(host,width,height,'Brain Ladder solution');
      if(level===0) {
        await host.screenshot({path:'browser-screenshots/brain-tv-reveal-'+width+'x'+height+'.png'});
        if(width===1280) await phone.screenshot({path:'browser-screenshots/brain-phone-reveal.png'});
      }
      await host.locator('.brain-next').click();
      if(level<4)await host.locator('.brain-game[data-brain-phase="brain-question"]').waitFor({timeout:15000});
    }
    await host.locator('.brain-game[data-brain-phase="finished"]').waitFor({timeout:15000});
    assert.equal(await host.locator('.brain-final-leaders li').count(),3);
    assert.equal((await state()).party.remaining,3,'All players who answered correctly survive');
    await fit(host,width,height,'Brain Ladder final results');
    await host.screenshot({path:'browser-screenshots/brain-tv-final-'+width+'x'+height+'.png'});
    assert.deepEqual(errors,[],'Browser must not throw while rendering');
    console.log('PASS: Brain Ladder full 5-level TV and mobile session '+width+'x'+height);
    await phoneCtx.close();
    await ctx.close();
  }
}finally{await browser.close();}
