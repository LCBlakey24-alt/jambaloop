// Live guesses: phones share where their wheel is; the TV shows each number
// turning. Other phones never receive anyone else's guess.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await mkdir('browser-screenshots', { recursive: true });
try {
  const api = await browser.newContext();
  const { code, host } = await (await api.request.post(site + '/api/rooms', { data: { mode: 'soclose', format: 'estimate', category: 'mixed', count: 5, seconds: 0, playStyle: 'individual' } })).json();
  const keys = [];
  for (const name of ['Maya', 'Oliver', 'Priya']) keys.push((await (await api.request.post(`${site}/api/rooms/${code}/join`, { data: { name } })).json()).key);
  const snap = async key => (await api.request.get(`${site}/api/rooms/${code}`, { headers: { 'x-game-key': key } })).json();
  const errors = [];
  const open = async (key, isHost, options) => {
    const context = await browser.newContext(options);
    await context.addInitScript(({ code, key, isHost }) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: isHost })), { code, key, isHost });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(site, { waitUntil: 'domcontentloaded' });
    return page;
  };
  const tv = await open(host, true, { viewport: { width: 1280, height: 720 } });
  const phone = await open(keys[0], false, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await tv.locator('.game.host-screen').waitFor({ timeout: 15000 });
  const lobby = await snap(host);
  await api.request.post(`${site}/api/rooms/${code}/advance`, { headers: { 'x-game-key': host }, data: { game: lobby.game, phase: lobby.phase, index: lobby.index, lobbyVersion: lobby.lobbyVersion } });
  await phone.locator('[data-ruler]').waitFor({ timeout: 15000 });
  await tv.locator('[data-live-guesses]').waitFor({ state: 'attached', timeout: 15000 });
  assert.equal(await tv.locator('.live-guess').count(), 0, 'nothing on the board before anyone moves');

  // Maya drags her wheel; Oliver's phone shares a position through the API.
  const box = await phone.locator('[data-ruler]').boundingBox();
  await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await phone.mouse.down();
  await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 34 * 4 + 10, { steps: 14 });
  await phone.mouse.up();
  // A flick coasts on for a moment before the wheel settles.
  await phone.waitForTimeout(1800);
  const question = await snap(keys[1]);
  assert.equal((await api.request.post(`${site}/api/rooms/${code}/draft`, { headers: { 'x-game-key': keys[1] }, data: { game: question.game, index: question.index, value: 250 } })).status(), 204);
  await tv.waitForFunction(() => document.querySelectorAll('.live-guess[data-live]').length === 2, null, { timeout: 8000 });
  await tv.waitForFunction(() => [...document.querySelectorAll('.live-guess b')].some(b => b.textContent.replace(/\D/g, '') === '250'), null, { timeout: 8000 });
  const maya = Number((await phone.locator('[data-number]').inputValue()));
  assert.ok(maya >= 3, 'the drag moved the wheel: ' + maya);
  await tv.waitForFunction(value => [...document.querySelectorAll('.live-guess b')].some(b => b.textContent.replace(/\D/g, '') === String(value)), maya, { timeout: 8000 });
  await tv.screenshot({ path: 'browser-screenshots/live-guesses-tv.png' });
  // Only the TV gets the board.
  for (const key of keys) assert.equal((await snap(key)).liveGuesses, undefined, 'a phone never receives other guesses');
  const hostState = await snap(host);
  assert.deepEqual(hostState.liveGuesses.rows.map(row => row.name), ['Maya', 'Oliver']);
  assert.ok(hostState.liveGuesses.rows.every(row => Object.keys(row).every(field => ['id', 'name', 'avatar', 'value', 'locked'].includes(field))));
  assert.equal(await phone.locator('.live-guess').count(), 0, 'no board on a phone');

  // Locking in turns the tile green and stops further sharing.
  await phone.locator('[data-action="submit-special"]').click();
  await tv.locator('.live-guess[data-locked]').waitFor({ timeout: 8000 });
  assert.equal((await api.request.post(`${site}/api/rooms/${code}/draft`, { headers: { 'x-game-key': keys[0] }, data: { game: question.game, index: question.index, value: 999 } })).status(), 204);
  assert.equal((await snap(host)).liveGuesses.rows.find(row => row.name === 'Maya').value, maya, 'a locked guess cannot be moved');
  assert.deepEqual(errors, []);
  console.log('PASS: wheels turn live on the TV, lock in green, and stay off other phones');
} finally { await browser.close(); }
