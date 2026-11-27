// Shade, end to end on a TV and three phones:
// the TV shows the whole colour board and never the target; the clue-giver's
// phone shows the secret square; guessers zoom in, pick and place; guesses
// land on the TV; the reveal scores 3/2/1; everyone gets a turn, then scores.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];
const watch = page => { page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text()); }); };
const api = await browser.newContext();
const call = async (path, key, data) => { const response = await api.request.fetch(site + '/api/rooms' + path, { method: data ? 'POST' : 'GET', headers: key ? { 'x-game-key': key } : {}, data }); return response.status() === 204 ? undefined : response.json(); };
try {
  const { code, host } = await call('', undefined, { mode: 'shade', category: 'mixed', count: 1, seconds: 0 });
  const players = [];
  for (const name of ['Ada', 'Bo', 'Cy']) players.push({ name, ...(await call(`/${code}/join`, undefined, { name })) });
  const open = async (key, isHost, viewport) => {
    const context = await browser.newContext({ viewport, ...(isHost ? {} : { isMobile: true, hasTouch: true }) });
    await context.addInitScript(([code, key, host]) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host })), [code, key, isHost]);
    const page = await context.newPage(); watch(page);
    await page.goto(site, { waitUntil: 'domcontentloaded' });
    await page.locator('section.game').waitFor({ timeout: 20000 });
    return page;
  };
  const tv = await open(host, true, { width: 1280, height: 720 });
  for (const player of players) player.page = await open(player.key, false, { width: 390, height: 844 });
  const lobby = await call(`/${code}`, host);
  await call(`/${code}/advance`, host, { game: lobby.game, phase: 'lobby', index: lobby.index, lobbyVersion: lobby.lobbyVersion });
  await tv.locator('.shade-board').waitFor({ timeout: 15000 });

  // The TV: the whole board, no target anywhere.
  assert.equal(await tv.locator('.shade-board > i').count(), 480);
  assert.equal(await tv.locator('.shade-board .is-target').count(), 0, 'the TV never shows the target while guessing');
  const fits = await tv.evaluate(() => { const box = document.querySelector('.shade-board').getBoundingClientRect(); return box.bottom <= innerHeight && box.right <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 2; });
  assert.ok(fits, 'the board fits a 720p TV without scrolling');
  const hostState = await call(`/${code}`, host);
  assert.equal(hostState.party.target, undefined);

  // Phones: one clue-giver with the secret, two guessers with the magnifier.
  let giver; const guessers = [];
  for (const player of players) ((await call(`/${code}`, player.key)).party.giving ? (giver = player) : guessers.push(player));
  assert.ok(giver && guessers.length === 2);
  const target = (await call(`/${code}`, giver.key)).party.target;
  await giver.page.locator('.shade-secret .shade-swatch').waitFor({ timeout: 8000 });
  assert.match(await giver.page.locator('.shade-head').innerText(), /First word/);
  assert.equal(await giver.page.locator('[data-action="shade-zoom"]').count(), 0, 'the clue-giver cannot guess');
  await tv.screenshot({ path: 'browser-screenshots/shade-tv-clue.png' });
  await giver.page.screenshot({ path: 'browser-screenshots/shade-phone-giver.png' });

  // A guesser taps the small board, zooms, picks a square and places it.
  const place = async (page, [c, r]) => {
    await page.locator(`[data-action="shade-zoom"][data-c="${c}"][data-r="${r}"]`).click();
    const cell = page.locator(`[data-action="shade-select"][data-c="${c}"][data-r="${r}"]`);
    await cell.waitFor({ timeout: 5000 });
    await page.waitForTimeout(350); // the magnifier scales in
    const box = await cell.boundingBox();
    assert.ok(box.width >= 40 && box.height >= 40, 'magnified squares are finger-sized');
    await cell.click();
    await page.locator('[data-action="shade-place"]:not([disabled])').click();
  };
  const [first, second] = guessers;
  // Step towards the middle of the board so every test square exists.
  const dx = target[0] < 15 ? 1 : -1; const dy = target[1] < 8 ? 1 : -1;
  await first.page.locator('.shade-mini').waitFor({ timeout: 8000 });
  await first.page.screenshot({ path: 'browser-screenshots/shade-phone-aim.png' });
  await first.page.locator(`[data-action="shade-zoom"][data-c="${target[0]}"][data-r="${target[1]}"]`).click();
  await first.page.locator('.shade-zoom').waitFor();
  await first.page.waitForTimeout(400);
  await first.page.screenshot({ path: 'browser-screenshots/shade-phone-zoom.png' });
  await first.page.locator('[data-action="shade-back"]').click();
  await place(first.page, target);
  await tv.locator('.shade-pin').first().waitFor({ timeout: 8000 });
  await first.page.locator('.shade-note').waitFor({ timeout: 8000 });
  assert.match(await first.page.locator('.shade-head').innerText(), /next word/i);
  await place(second.page, [target[0] + 2 * dx, target[1]]);

  // Second word, then third: one more guess after each, then the reveal by itself.
  await tv.locator('.shade-badge', { hasText: 'SECOND WORD' }).waitFor({ timeout: 8000 });
  await giver.page.locator('.shade-head', { hasText: 'Second word' }).waitFor({ timeout: 8000 });
  await first.page.locator('.shade-mini').waitFor({ timeout: 8000 });
  await place(first.page, [target[0] + dx, target[1] + dy]);
  await place(second.page, [target[0], target[1] + dy]);
  await tv.locator('.shade-badge', { hasText: 'THIRD WORD' }).waitFor({ timeout: 8000 });
  await first.page.locator('.shade-mini').waitFor({ timeout: 8000 });
  await place(first.page, [target[0] + dx, target[1]]);
  await second.page.locator('.shade-mini').waitFor({ timeout: 8000 });
  await tv.screenshot({ path: 'browser-screenshots/shade-tv-guesses.png' });
  await place(second.page, [target[0] + 2 * dx, target[1] + 2 * dy]);
  await tv.locator('.shade-board .is-target').waitFor({ timeout: 8000 });
  await tv.waitForTimeout(1000); // the found square zooms in, and its marker with it
  // Markers sit on their own square: none is wider than a square and a half.
  const sizes = await tv.evaluate(() => { const cell = document.querySelector('.shade-board > i').getBoundingClientRect().width; return [...document.querySelectorAll('.shade-pin')].map(pin => pin.getBoundingClientRect().width / cell); });
  assert.ok(sizes.length >= 5 && sizes.every(size => size <= 1.5), 'guess markers stay on their own square: ' + sizes.map(size => size.toFixed(2)).join(' '));
  await tv.locator('.shade-board .is-target').waitFor({ timeout: 8000 });
  await tv.waitForTimeout(900);
  await tv.screenshot({ path: 'browser-screenshots/shade-tv-reveal.png' });
  const reveal = await call(`/${code}`, host);
  assert.deepEqual(reveal.party.result.target, target);
  assert.deepEqual(reveal.party.result.rows.map(row => row.points), [7, 4], '3+2+2 and 1+2+1');
  assert.equal(reveal.party.result.giverPoints, 4);
  assert.match(await first.page.locator('.shade-note').innerText(), /7 points/);
  assert.match(await giver.page.locator('.shade-note').innerText(), /4 points/);
  await first.page.screenshot({ path: 'browser-screenshots/shade-phone-reveal.png' });
  console.log('PASS: secret target, zoom-and-place guessing, live pins on the TV, and 3/2/1 scoring');

  // Everyone gets a turn, then the final scores.
  for (let round = 1; round < 3; round++) {
    await tv.locator('[data-action="advance"]').click();
    await tv.waitForFunction(index => document.querySelector('.shade-kicker')?.textContent.includes(`ROUND ${index + 1} `), round, { timeout: 8000 });
    await tv.locator('[data-action="advance"]').click();
    await tv.locator('.shade-badge', { hasText: 'SECOND WORD' }).waitFor({ timeout: 8000 });
    await tv.locator('[data-action="advance"]').click();
    await tv.locator('.shade-badge', { hasText: 'THIRD WORD' }).waitFor({ timeout: 8000 });
    await tv.locator('[data-action="advance"]').click();
    await tv.locator('.shade-board .is-target').waitFor({ timeout: 8000 });
  }
  await tv.locator('[data-action="advance"]').click();
  await tv.locator('.shade-final').waitFor({ timeout: 8000 });
  await tv.screenshot({ path: 'browser-screenshots/shade-tv-final.png' });
  assert.equal((await call(`/${code}`, host)).phase, 'finished');
  console.log('PASS: three clue-givers in turn, then final scores');
  assert.deepEqual(errors, [], 'no page errors');
} finally { await browser.close(); }
