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
  assert.deepEqual(errors,[]);
  console.log('PASS: mobile card redraw protects stale taps, preserves errors, and accepts current hand');
} finally {
  await phone.close();
  await browser.close();
}