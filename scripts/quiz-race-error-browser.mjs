// A stale Quiz Race phone tap must keep the server error visible after UI refresh.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots', { recursive: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const created = await ctx.request.post(site + '/api/rooms', {
    data: { mode: 'quizrace', category: 'mixed', format: 'choice', count: 5, seconds: 0 },
  });
  assert.equal(created.status(), 201, await created.clone().text());
  const {code, host} = await created.json();
  const keys = [];
  for(const name of ['Alex', 'Bailey']) {
    const joined = await ctx.request.post(site + '/api/rooms/' + code + '/join', {data:{name}});
    assert.equal(joined.status(), 201, await joined.clone().text());
    keys.push((await joined.json()).key);
  }
  await ctx.addInitScript(room => {
    sessionStorage.setItem('quizmas-session', JSON.stringify(room));
  }, { code, key: keys[0], host: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(site, {waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.game.player-only').waitFor({timeout:15000});
  const started = await ctx.request.post(site + '/api/rooms/' + code + '/advance', {
    headers: {'x-game-key': host}, data: {game:1,phase:'lobby',index:0},
  });
  assert.equal(started.status(), 204, await started.text());
  await page.locator('[data-action="race-answer"]').first().waitFor({timeout:15000});
  let intercepted = false;
  const endpoint = '**/api/rooms/' + code + '/race-answer';
  await page.route(endpoint, async route => {
    intercepted = true;
    const body = JSON.parse(route.request().postData());
    await route.continue({postData:JSON.stringify({...body, questionId:99999})});
  });
  await page.locator('[data-action="race-answer"]').first().click();
  await page.waitForFunction(() =>
    document.querySelector('#game-error')?.textContent?.includes('no longer active'),
    {timeout:10000});
  assert.equal(intercepted,true,'Submitted a deliberately stale question identifier');
  assert.match(await page.locator('#game-error').innerText(),/no longer active/);
  assert.equal(await page.locator('[data-action="race-answer"]').first().isEnabled(),true,
    'Player can try the current question after the error');
  await page.screenshot({path:'browser-screenshots/quizrace-stale-answer-390x844.png',fullPage:false});

  await page.unroute(endpoint);
  await page.locator('[data-action="race-answer"]').first().click();
  await page.waitForFunction(() => {
    const text = document.querySelector('.race-phone-intro h2')?.textContent ?? '';
    return /Correct!|Not quite/.test(text);
  }, {timeout:10000});
  assert.equal((await page.locator('#game-error').innerText()).trim(),'',
    'Previous error should clear after a valid answer');
  assert.deepEqual(errors,[]);
  console.log('PASS: stale Quiz Race action shows a lasting error; new valid answer succeeds');
  await ctx.close();
} finally {
  await browser.close();
}
