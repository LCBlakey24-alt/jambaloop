import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE || 'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});

try{
  for(const [width,height] of [[1280,720],[1920,1080],[1024,768]]) {
    const context=await browser.newContext({viewport:{width,height}});
    const makeRoom=await context.request.post(site+'/api/rooms',{data:{
      mode:'samepage',category:'mixed',format:'choice',count:3,seconds:0,
    }});
    assert.equal(makeRoom.status(),201,await makeRoom.text());
    const {code,host:hostKey}=await makeRoom.json();
    const keys=[];
    for(const name of ['Avery','Bailey','Charlie']) {
      const joined=await context.request.post(site+'/api/rooms/'+code+'/join',{data:{name}});
      assert.equal(joined.status(),201,await joined.text());
      keys.push((await joined.json()).key);
    }
    await context.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true}));
    },{code,key:hostKey});
    const host=await context.newPage();
    const pageErrors=[];
    host.on('pageerror',e=>pageErrors.push(e.message));
    await host.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    const phoneContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    await phoneContext.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
    },{code,key:keys[0]});
    const phone=await phoneContext.newPage();
    phone.on('pageerror',e=>pageErrors.push(e.message));
    await phone.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    await host.locator('.roster-panel').waitFor({timeout:15000});
    const started=await context.request.post(site+'/api/rooms/'+code+'/advance',{
      headers:{'x-game-key':hostKey},data:{game:1,index:0,phase:'lobby'},
    });
    assert.equal(started.status(),204,await started.text());
    await host.locator('.samepage-game[data-samepage-phase="party-write"]').waitFor({timeout:15000});
    await phone.locator('.samepage-answer-form').waitFor({timeout:15000});
    assert.equal(await host.locator('.samepage-group').count(),0,'No private answers on TV before reveal');
    const stats=await host.evaluate(()=>{
      const root=document.querySelector('.samepage-game').getBoundingClientRect();
      return {width:document.scrollingElement.scrollWidth,height:document.scrollingElement.scrollHeight,bottom:root.bottom};
    });
    assert.ok(stats.width<=width+2,'TV has horizontal overflow '+JSON.stringify(stats));
    assert.ok(stats.height<=height+2,'TV has vertical overflow '+JSON.stringify(stats));
    assert.ok(stats.bottom<=height+2,'Game stage is clipped '+JSON.stringify(stats));
    await host.screenshot({path:`browser-screenshots/samepage-tv-prompt-${width}x${height}.png`});
    if(width===1280)await phone.screenshot({path:'browser-screenshots/samepage-phone-entry.png'});

    const answers=['the Pizza!','pizza','Water'];
    for(let i=0;i<keys.length;i++){
      const posted=await context.request.post(site+'/api/rooms/'+code+'/party',{
        headers:{'x-game-key':keys[i]},
        data:{game:1,index:0,action:'write',text:answers[i]},
      });
      assert.equal(posted.status(),204,await posted.text());
    }
    await host.locator('.samepage-game[data-samepage-phase="party-reveal"]').waitFor({timeout:15000});
    await phone.locator('.samepage-matches').waitFor({timeout:15000});
    assert.equal(await host.locator('.samepage-group.matched').count(),1);
    const text=await host.locator('.samepage-group.matched').innerText();
    assert.match(text,/100/);
    assert.match(text,/Avery/);
    assert.match(text,/Bailey/);
    const revealStats=await host.evaluate(()=>({
      width:document.scrollingElement.scrollWidth,height:document.scrollingElement.scrollHeight,
      bottom:document.querySelector('.samepage-game').getBoundingClientRect().bottom,
    }));
    assert.ok(revealStats.width<=width+2,'TV reveal overflows horizontally: '+JSON.stringify(revealStats));
    assert.ok(revealStats.height<=height+2,'TV reveal overflows vertically: '+JSON.stringify(revealStats));
    assert.ok(revealStats.bottom<=height+2,'TV reveal clipped: '+JSON.stringify(revealStats));
    await host.screenshot({path:`browser-screenshots/samepage-tv-reveal-${width}x${height}.png`});
    if(width===1280)await phone.screenshot({path:'browser-screenshots/samepage-phone-reveal.png'});
    assert.deepEqual(pageErrors,[]);
    console.log('PASS: Same Page TV and phone gameplay '+width+'×'+height+', secret answers and matching result');
    await phoneContext.close();
    await context.close();
  }
}finally{await browser.close();}
