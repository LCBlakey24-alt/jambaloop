import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {rareFindBank} from '../rare-find-bank.js';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});
const historyExcept=id=>rareFindBank.filter(p=>p.id!==id).map(p=>p.historyId);
const fit=async(page,width,height,label)=>{
  const metrics=await page.evaluate(()=>{
    const rect=document.querySelector('.rare-game').getBoundingClientRect();
    return {bottom:rect.bottom,width:document.scrollingElement.scrollWidth,
      height:document.scrollingElement.scrollHeight};
  });
  assert.ok(metrics.bottom<=height+3,label+' TV stage clipped '+JSON.stringify(metrics));
  assert.ok(metrics.width<=width+2,label+' horizontal overflow '+JSON.stringify(metrics));
  assert.ok(metrics.height<=height+2,label+' vertical scroll '+JSON.stringify(metrics));
};
try{
  const menuContext=await browser.newContext({viewport:{width:1366,height:768}});
  const page=await menuContext.newPage();
  await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(await page.locator('.game-tile').count(),17,'All games should appear on desktop');
  await page.locator('.game-tile[data-mode="rare"]').click();
  assert.match(await page.locator('#game-preview').innerText(),/Rare Find/);
  await page.locator('#game-preview [data-action="host"]').click();
  assert.equal(await page.locator('#host-form input[name="mode"]:checked').inputValue(),'rare');
  assert.deepEqual(await page.locator('#host-form select[name="count"] option')
    .evaluateAll(options=>options.map(option=>option.value)),['3','5','7']);
  assert.equal(await page.locator('#host-form input[name="playStyle"][value="teams"]').isDisabled(),true);
  await menuContext.close();
  console.log('PASS: Rare Find discoverable, original preview and 3/5/7 rounds');

  for(const [width,height] of [[1280,720],[1920,1080],[1024,768]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const errors=[];
    const created=await ctx.request.post(site+'/api/rooms',{data:{
      mode:'rare',category:'mixed',format:'choice',count:3,seconds:0,playStyle:'individual',
    }});
    assert.equal(created.status(),201,await created.text());
    const {code,host:hostKey}=await created.json();
    const keys=[];
    for(const name of ['Alex','Bailey','Charlie']){
      const joined=await ctx.request.post(site+'/api/rooms/'+code+'/join',{
        data:{name,seenQuestions:historyExcept('solar-planets')},
      });
      assert.equal(joined.status(),201,await joined.text());
      keys.push((await joined.json()).key);
    }
    const state=async(key=hostKey)=>{
      const response=await ctx.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}});
      assert.equal(response.status(),200);
      return response.json();
    };
    const answer=async(key,index,text)=>{
      const response=await ctx.request.post(site+'/api/rooms/'+code+'/party',{
        headers:{'x-game-key':key},data:{game:1,index,action:'write',text},
      });
      assert.equal(response.status(),204,await response.text());
    };
    await ctx.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true}));
    },{code,key:hostKey});
    const host=await ctx.newPage();
    host.on('pageerror',error=>errors.push('TV: '+error.message));
    await host.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    await host.locator('.roster-panel').waitFor({timeout:15000});
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    await mobile.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
    },{code,key:keys[0]});
    const phone=await mobile.newPage();
    phone.on('pageerror',error=>errors.push('Phone: '+error.message));
    await phone.goto(site,{waitUntil:'domcontentloaded',timeout:30000});

    const started=await ctx.request.post(site+'/api/rooms/'+code+'/advance',{
      headers:{'x-game-key':hostKey},data:{phase:'lobby',index:0,game:1},
    });
    assert.equal(started.status(),204,await started.text());

    for(let round=0;round<3;round++){
      await host.locator('.rare-game[data-rare-phase="rare-write"]').waitFor({timeout:15000});
      await phone.locator('#bluff-form textarea').waitFor({timeout:15000});
      const snapshot=await state();
      const prompt=rareFindBank.find(p=>p.prompt===snapshot.party.prompt);
      assert.ok(prompt,'Challenge must originate in the curated catalogue');
      assert.equal(snapshot.party.results,undefined,'TV must not see submissions during writing');
      await fit(host,width,height,'Rare Find entry '+round);
      if(round===0){
        await host.screenshot({path:'browser-screenshots/rare-entry-tv-'+width+'x'+height+'.png'});
        if(width===1280)await phone.screenshot({path:'browser-screenshots/rare-entry-phone.png'});
      }
      await phone.locator('#bluff-form textarea').fill(round===2?'Unrecognised fictional answer':round===0?'Mercury':prompt.answers[0]);
      await phone.locator('#bluff-form button[type="submit"]').click();
      await phone.locator('.rare-locked').waitFor({timeout:15000});
      assert.equal((await state()).party.results,undefined);
      await answer(keys[1],round,round===0?'Planet Earth':prompt.answers[0]);
      await answer(keys[2],round,round===0?'Mercury':prompt.answers[1]);
      if(round===2){
        await host.locator('.rare-game[data-rare-phase="rare-review"]').waitFor({timeout:15000});
        const before=await state(keys[1]);
        assert.equal(before.party.reviews,undefined,'Players never see the host review queue');
        assert.equal(before.party.results,undefined);
        assert.equal(await host.locator('.rare-review-row').count(),1);
        await fit(host,width,height,'Rare Find host review');
        await host.screenshot({path:'browser-screenshots/rare-review-tv-'+width+'x'+height+'.png'});
        await host.locator('[data-action="rare-review-reject"]').click();
        await host.locator('.rare-footer [data-action="advance"]:not(:disabled)').click();
      }
      await host.locator('.rare-game[data-rare-phase="rare-reveal"]').waitFor({timeout:15000});
      assert.ok((await state()).party.results);
      assert.equal((await state()).party.results.responded,3);
      await fit(host,width,height,'Rare Find reveal '+round);
      if(round===0){
        const reveal=(await state()).party.results;
        assert.equal(reveal.groups.find(g=>g.answer==='Mercury').count,2);
        assert.equal(reveal.groups.find(g=>g.answer==='Earth').points,200);
        await host.screenshot({path:'browser-screenshots/rare-reveal-tv-'+width+'x'+height+'.png'});
        if(width===1280)await phone.screenshot({path:'browser-screenshots/rare-reveal-phone.png'});
      }
      await host.locator('.rare-footer [data-action="advance"]').click();
    }
    await host.locator('.rare-game[data-rare-phase="finished"]').waitFor({timeout:15000});
    assert.equal(await host.locator('.rare-final-leaders li').count(),3);
    await fit(host,width,height,'Rare Find final podium');
    await host.screenshot({path:'browser-screenshots/rare-finale-tv-'+width+'x'+height+'.png'});
    assert.deepEqual(errors,[],'No TV or phone JavaScript errors');
    console.log('PASS: Rare Find complete 3-round verified, rejected-review TV and phone session '+width+'x'+height);
    await mobile.close();
    await ctx.close();
  }
} finally {await browser.close();}
