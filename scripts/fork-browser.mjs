import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE || 'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});

try {
  for(const [width,height] of [[1280,720],[1366,768],[1920,1080],[1024,768]]) {
    const ctx=await browser.newContext({viewport:{width,height}});
    const host=await ctx.newPage();
    const errors=[];
    host.on('pageerror',err=>errors.push(err.message));
    await host.goto(site,{waitUntil:'networkidle',timeout:30000});
    // Big screens open on the game shelf; this workflow starts from the tile gallery.
    await host.locator('#game-carousel .carousel-card, .game-tile').first().waitFor({timeout:15000});
    if(await host.locator('[data-action="carousel-view"]').isVisible())await host.locator('[data-action="carousel-view"]').click();
    await host.locator('[data-action="preview-mode"][data-mode="tracks"]').click();
    assert.match(await host.locator('#game-preview').innerText(),/three|sabotage|driver/i);
    // Hosting a party creates the room; Game settings then shapes the game.
    const creating=host.waitForResponse(res=>new URL(res.url()).pathname==='/api/rooms'&&res.request().method()==='POST');
    await host.locator('#game-preview [data-action="party"]').click();
    const create=await creating;
    assert.equal(create.status(),201,await create.text());
    const {code,host:hostKey}=await create.json();
    await host.locator('[data-action="party-skip"]').click(); await host.locator('[data-picker-tv] [data-action="picker-settings"]').click();
    const form=host.locator('#configure-form');
    assert.equal(await form.locator('input[name="playStyle"][value="individual"]').isDisabled(),true);
    assert.equal(await form.locator('input[name="playStyle"][value="teams"]').isChecked(),true);
    assert.equal(await form.locator('select[name="teamCount"]').inputValue(),'2');
    // One round per joined player is automatic, so the count field is hidden.
    assert.equal(await form.locator('select[name="count"]').isVisible(),false);
    await form.locator('button[type="submit"]').click();
    await host.locator('.room-code').waitFor({timeout:15000});
    const players=[];
    for(let i=0;i<4;i++){
      const join=await ctx.request.post(site+'/api/rooms/'+code+'/join',{data:{name:'Track Player '+i}});
      assert.equal(join.status(),201,await join.text());
      players.push((await join.json()).key);
    }
    const snap=async(key)=> {
      const res=await ctx.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}});
      assert.equal(res.status(),200);
      return res.json();
    };
    const contenders=await Promise.all(players.map(snap));
    const phone=async key=>{
      const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
      await c.addInitScript(({code,key})=>{
        sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false}));
      },{code,key});
      const page=await c.newPage();page.on('pageerror',err=>errors.push(err.message));
      await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
      return {context:c,page};
    };
    await host.locator('.roster-panel [data-action="advance"]').click();
    await host.locator('.fork-game[data-fork-phase="party-build"]').waitFor({timeout:15000});
    const states=await Promise.all(players.map(snap));
    assert.equal(states[0].total,4);
    const driver=states.findIndex(s=>s.party.driverTurn);
    assert.ok(driver>=0);
    const picker=states.findIndex((s,i)=>i!==driver&&s.player.team===0);
    const pickerPhone=await phone(players[picker]);
    const driverPhone=await phone(players[driver]);
    await pickerPhone.page.locator('.fork-card-pick').first().waitFor({timeout:15000});
    assert.equal(await driverPhone.page.locator('.fork-card-pick').count(),0);

    const game=states[0].game;
    for(let step=0;step<3;step++){
      await pickerPhone.page.locator('.fork-card-pick').first().click();
      const chosen=await snap(players[picker]);
      assert.equal(chosen.party.voted,true,'Phone card must be submitted');
      for(let i=0;i<players.length;i++){
        if(i===driver||i===picker)continue;
        const res=await ctx.request.post(site+'/api/rooms/'+code+'/party',{
          headers:{'x-game-key':players[i]},data:{game,index:0,action:'card',step,option:0},
        });
        assert.equal(res.status(),204,await res.text());
      }
      const placed=await snap(hostKey);
      assert.equal(placed.phase,'party-placed','each placement gets its own reveal');
      await host.locator('.fork-game[data-fork-phase="party-placed"] .fork-slot.is-new').first().waitFor({timeout:15000});
      assert.equal(await host.locator('.fork-slot.is-new').count(),2,'both new cards are revealed');
      await pickerPhone.page.locator('.fork-game[data-fork-phase="party-placed"]').waitFor({timeout:15000});
      assert.equal(await pickerPhone.page.locator('.fork-card-pick').count(),0,'no picking during the reveal');
      const moved=await ctx.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':hostKey},data:{game,index:0,phase:'party-placed'}});
      assert.equal(moved.status(),204,await moved.text());
      const stage=await snap(hostKey);
      assert.equal(stage.phase,step===2?'party-judge':'party-build');
      if(step<2){
        assert.equal(stage.party.step,step+1);
        await pickerPhone.page.locator('.fork-card-pick').first().waitFor({timeout:15000});
      }
    }
    await host.locator('.fork-game[data-fork-phase="party-judge"]').waitFor({timeout:15000});
    assert.equal(await host.locator('.fork-tile.filled').count(),6);
    const sentences=(await host.locator('.fork-track-sentence').allInnerTexts()).map(v=>v.replace(/\s+/g,' ').trim());
    assert.equal(sentences.length,2);
    assert.ok(sentences.every(v=>/If the trolley takes Track [AB], it will hit .+, .+, and .+\./.test(v)));
    const metrics=await host.evaluate(()=>{
      const board=document.querySelector('.fork-game').getBoundingClientRect();
      return {scrollHeight:document.scrollingElement.scrollHeight,
        scrollWidth:document.scrollingElement.scrollWidth,bottom:board.bottom};
    });
    assert.ok(metrics.scrollHeight<=height+2,'Host TV page scrolls: '+JSON.stringify(metrics));
    assert.ok(metrics.scrollWidth<=width+2,'Host TV overflows horizontally: '+JSON.stringify(metrics));
    assert.equal(await host.locator('.fork-judge-choice').count(),0,'Host must not judge while Driver connected');
    await driverPhone.page.locator('.fork-judge-choice[data-track="0"]').click();
    await host.locator('.fork-game[data-fork-phase="party-reveal"]').waitFor({timeout:15000});
    const final=await snap(hostKey);
    assert.equal(final.party.saved,1);
    assert.deepEqual(final.teams.map(x=>x.roundPoints),[0,1]);
    await host.screenshot({path:`browser-screenshots/fork-judge-${width}x${height}.png`});
    assert.deepEqual(errors,[]);
    console.log(`PASS: rotating Driver, 3-card stages, reveal and TV layout ${width}×${height}`);
    await pickerPhone.context.close();
    await driverPhone.context.close();
    await ctx.close();
  }
} finally {await browser.close();}
