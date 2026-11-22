import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE || 'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});

try {
  for(const [width,height] of [[1280,720],[1366,768],[1920,1080],[1024,768]]) {
    const context=await browser.newContext({viewport:{width,height}});
    const host=await context.newPage();
    const hostErrors=[];
    host.on('pageerror',error=>hostErrors.push(error.message));
    await host.goto(site,{waitUntil:'networkidle',timeout:30000});
    await host.locator('[data-action="preview-mode"][data-mode="tracks"]').click();
    assert.match(await host.locator('#game-preview').innerText(),/three|sabotage|judge/i);
    await host.locator('#game-preview [data-action="host"]').click();
    const form=host.locator('#host-form');
    assert.equal(await form.locator('input[name="playStyle"][value="individual"]').isDisabled(),true);
    assert.equal(await form.locator('input[name="playStyle"][value="teams"]').isChecked(),true);
    assert.equal(await form.locator('select[name="teamCount"]').inputValue(),'2');
    await form.locator('select[name="count"]').selectOption('5');
    const create=host.waitForResponse(response=>new URL(response.url()).pathname==='/api/rooms'&&response.request().method()==='POST');
    await form.locator('button[type="submit"]').click();
    const created=await create;
    assert.equal(created.status(),201,await created.text());
    const {code,host:hostKey}=await created.json();
    await host.locator('.room-code').waitFor({timeout:15000});
    const players=[];
    for(let i=0;i<4;i++){
      const joined=await context.request.post(site+'/api/rooms/'+code+'/join',{data:{name:'Track Player '+i}});
      assert.equal(joined.status(),201,await joined.text());
      players.push((await joined.json()).key);
    }
    const phoneContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    await phoneContext.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
    },{code,key:players[0]});
    const phone=await phoneContext.newPage();
    phone.on('pageerror',error=>console.log('PHONE_JS_ERROR',error.message));
    phone.on('response',response=>{
      if(response.url().includes('/party'))console.log('PHONE_PARTY_RESPONSE',response.status(),response.url());
    });
    await phone.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    await host.locator('.roster-panel [data-action="advance"]').click();
    await host.locator('.fork-game[data-fork-phase="party-build"]').waitFor({timeout:16000});
    await phone.locator('.fork-card-pick').first().waitFor({timeout:16000});
    const view=await context.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':hostKey}});
    assert.equal(view.status(),200);
    const body=await view.json();
    const game=body.game;
    for(let step=0;step<3;step++){
      await phone.locator('.fork-card-pick').first().click();
      // Inspect server acknowledgement separately from UI visibility to catch errors.
      await phone.waitForTimeout(700);
      const phoneSnap=await context.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':players[0]}});
      const phoneState=await phoneSnap.json();
      console.log('PHONE_AFTER_PICK',{
        stage:step,phase:phoneState.phase,serverStep:phoneState.party?.step,
        voted:phoneState.party?.voted,voteCount:phoneState.party?.submissions,
        clientPhase:await phone.locator('.fork-game').getAttribute('data-fork-phase'),
        gameError:await phone.locator('#game-error').textContent().catch(()=>'not found')
      });
      assert.equal(phoneState.party?.voted,true,'Phone must submit its card vote');
      await phone.locator('.fork-locked').waitFor({timeout:8000});
      for(let i=1;i<players.length;i++){
        const response=await context.request.post(site+'/api/rooms/'+code+'/party',{
          headers:{'x-game-key':players[i]},
          data:{game,index:0,action:'card',step,option:0},
        });
        assert.equal(response.status(),204,await response.text());
      }
      if(step<2){
        const stageResponse=await context.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':hostKey}});
        const stageData=await stageResponse.json();
        console.log('Trolley after placement '+(step+1),{
          serverPhase:stageData.phase,serverStep:stageData.party?.step,serverVotes:stageData.party?.submissions,
          hostText:(await host.locator('.fork-intro .eyebrow').textContent().catch(()=>'')),
          phoneText:(await phone.locator('.fork-intro .eyebrow').textContent().catch(()=>'')),
        });
        assert.equal(stageData.phase,'party-build','Server did not advance to the next placement');
        assert.equal(stageData.party.step,step+1,'Server did not advance to expected card stage');
        await host.waitForFunction((expected)=>document.querySelector('.fork-game')?.dataset.forkPhase==='party-build' &&
          document.querySelector('.fork-intro .eyebrow')?.textContent?.includes('PLACEMENT '+expected+'/3'),step+2,{timeout:15000});
        await phone.locator('.fork-card-pick').first().waitFor({timeout:15000});
      }
    }
    await host.locator('.fork-game[data-fork-phase="party-judge"]').waitFor({timeout:16000});
    const trackNames=await host.locator('.fork-tile.filled').count();
    assert.equal(trackNames,6,'Both trolley tracks need 3 complete cards');
    const sentences=await host.locator('.fork-track-sentence').allTextContents();
    assert.equal(sentences.length,2);
    assert.ok(sentences.every(s=>/If the trolley takes Track [AB], it will hit .+, .+, and .+\./.test(s)));
    const viewport=await host.evaluate(()=>{
      const board=document.querySelector('.fork-game').getBoundingClientRect();
      const buttons=[...document.querySelectorAll('.fork-judge-choice')].map(node=>node.getBoundingClientRect().bottom);
      return {scrollHeight:document.scrollingElement.scrollHeight,
        scrollWidth:document.scrollingElement.scrollWidth,
        bottom:board.bottom,buttons};
    });
    assert.ok(viewport.scrollHeight<=height+2,'Host TV page scrolls: '+JSON.stringify(viewport));
    assert.ok(viewport.scrollWidth<=width+2,'Host TV page overflows horizontally: '+JSON.stringify(viewport));
    assert.ok(viewport.buttons.length===2&&viewport.buttons.every(bottom=>bottom<=height+2),
      'Host judge buttons clipped: '+JSON.stringify(viewport));
    await host.screenshot({path:`browser-screenshots/fork-judge-${width}x${height}.png`});
    await phone.screenshot({path:`browser-screenshots/fork-phone-${width}x${height}.png`});
    await host.locator('.fork-judge-choice[data-track="0"]').click();
    await host.locator('.fork-game[data-fork-phase="party-reveal"]').waitFor({timeout:15000});
    assert.match(await host.locator('.fork-outcome').innerText(),/Track A gets hit/);
    const result=await context.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':hostKey}});
    const state=await result.json();
    assert.deepEqual(state.teams.map(group=>group.score),[0,1]);
    assert.deepEqual(state.party.placements.map(arr=>arr.filter(Boolean).length),[3,3]);
    assert.deepEqual(hostErrors,[]);
    console.log(`PASS: 2-team trolley gameplay, complete 3-card sentence, judge and no TV scroll at ${width}×${height}`);
    await phoneContext.close();
    await context.close();
  }
}finally{await browser.close();}
