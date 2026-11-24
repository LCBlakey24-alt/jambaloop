import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
await mkdir('browser-screenshots', {recursive:true});
try {
  const create = await phone.request.post(site + '/api/rooms', { data: {
    mode: 'cards', category: 'mixed', format: 'choice', count: 3, seconds: 0,
  } });
  assert.equal(create.status(), 201, await create.text());
  const {code, host} = await create.json();
  const keys = [];
  for(const name of ['Alex','Bailey','Charlie']) {
    const join = await phone.request.post(site + '/api/rooms/' + code + '/join', {data:{name}});
    assert.equal(join.status(), 201, await join.text());
    keys.push((await join.json()).key);
  }
  const state = async key => {
    const response = await phone.request.get(site + '/api/rooms/' + code, {
      headers: {'x-game-key': key || host},
    });
    assert.equal(response.status(), 200);
    return response.json();
  };
  const start = await phone.request.post(site + '/api/rooms/' + code + '/advance', {
    headers: {'x-game-key': host}, data:{game:1,phase:'lobby',index:0},
  });
  assert.equal(start.status(), 204, await start.text());

  await phone.addInitScript(session =>
    sessionStorage.setItem('quizmas-session', JSON.stringify(session)),
    {code, key:keys[0], host:false});
  const page = await phone.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site, {waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.play-card').first().waitFor({timeout:15000});
  assert.equal(await page.locator('.play-card').count(), 6);
  assert.equal(await page.locator('.play-card').first().getAttribute('data-hand-version'), '0');
  const before = await page.locator('.play-card').allInnerTexts();
  assert.equal(await page.locator('[data-action="social-redraw"]').count(),1);

  await page.locator('[data-action="social-redraw"]').click();
  await page.locator('.play-card[data-hand-version="1"]').first().waitFor({timeout:12000});
  const after = await page.locator('.play-card').allInnerTexts();
  assert.equal(after.length,6);
  assert.ok(after.every(card=>!before.includes(card)), 'Card refresh must replace the original hand');
  assert.equal((await state(keys[0])).party.redrawAvailable,false);
  assert.equal(await page.locator('[data-action="social-redraw"]').count(),0);

  // Simulate a tap from a stale phone render, after the cards changed.
  await page.locator('.play-card').first().evaluate(button => {button.dataset.handVersion='0';});
  await page.locator('.play-card').first().click();
  await page.waitForFunction(() =>
    document.querySelector('#game-error')?.textContent?.includes('hand has changed'),
    {timeout:12000});
  assert.match(await page.locator('#game-error').textContent(), /hand has changed/i);
  assert.equal((await state(keys[0])).party.wrote,false,'Stale card was not silently submitted');
  await page.screenshot({path:'browser-screenshots/cards-stale-hand-error-390x844.png',fullPage:false});

  await page.locator('.play-card[data-hand-version="1"]').first().click();
  await page.getByText('Entry locked in.').first().waitFor({timeout:12000});
  assert.equal((await state(keys[0])).party.wrote,true,'Current hand can still be submitted');

  // Finish the entire three-round match; the phone must display a compact
  // personal outcome and keep the complete scores behind an optional reveal.
  const partyAction = async (key, data) => {
    const response = await phone.request.post(site+'/api/rooms/'+code+'/party',{
      headers:{'x-game-key':key},data:{game:1,...data},
    });
    assert.equal(response.status(),204,'Party action: '+await response.text());
  };
  for(let round=0;round<3;round++) {
    if(round===0) {
      for(const key of keys.slice(1)) await partyAction(key,{index:round,action:'card',option:0,handVersion:0});
    } else {
      const writing = await state();
      assert.equal(writing.phase,'party-write');
      for(const key of keys) await partyAction(key,{index:round,action:'card',option:0,handVersion:0});
    }
    const voting = await state();
    assert.equal(voting.phase,'party-vote');
    for(const key of keys) {
      const playerState = await state(key);
      const ballot = playerState.party.ballot.find(entry=>!entry.yours);
      assert.ok(ballot,'Voter must have an eligible option');
      await partyAction(key,{index:round,action:'vote',id:ballot.id});
    }
    const revealed = await state();
    assert.equal(revealed.phase,'party-reveal');
    const next = await phone.request.post(site+'/api/rooms/'+code+'/advance',{
      headers:{'x-game-key':host},data:{game:1,index:round,phase:'party-reveal'},
    });
    assert.equal(next.status(),204,'Advance final round: '+await next.text());
  }
  assert.equal((await state()).phase,'finished');
  await page.locator('.party-phone-scores').waitFor({timeout:15000});
  assert.equal(await page.locator('.results-player-finish').count(),1);
  assert.equal(await page.locator('.party-phone-score-list').isVisible(),false,
    'The full ranking must start collapsed on player phones');
  await page.screenshot({path:'browser-screenshots/cards-personal-finish-390x844.png',fullPage:false});
  await page.locator('.party-phone-scores summary').click();
  assert.equal(await page.locator('.party-phone-score-list').isVisible(),true);
  assert.equal(await page.locator('.party-phone-score-list li').count(),3);
  const phoneWidth=await page.evaluate(()=>document.querySelector('#app').scrollWidth-document.querySelector('#app').clientWidth);
  assert.ok(phoneWidth<=2,'Phone results have horizontal overflow: '+phoneWidth);

  const tvContext = await browser.newContext({viewport:{width:1280,height:720}});
  await tvContext.addInitScript(session=>
    sessionStorage.setItem('quizmas-session',JSON.stringify(session)),
    {code,key:host,host:true});
  const tv = await tvContext.newPage();
  tv.on('pageerror',error=>errors.push('TV: '+error.message));
  await tv.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  await tv.locator('.game.host-screen .party-panel.results').waitFor({timeout:15000});
  assert.equal(await tv.locator('.ranking').count(),1,'TV keeps the complete player leaderboard');
  assert.equal(await tv.locator('.party-phone-scores').count(),0,'No phone-only details on TV');
  await tv.screenshot({path:'browser-screenshots/cards-tv-finish-1280x720.png',fullPage:false});
  await tvContext.close();

  assert.deepEqual(errors,[]);
  console.log('PASS: card redraw, stale-tap protection, three full rounds, personal phone results and TV leaderboard');
} finally {
  await phone.close();
  await browser.close();
}