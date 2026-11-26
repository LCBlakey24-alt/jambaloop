// Catch Up end to end: four players in two sides, a TV and two phones.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await mkdir('browser-screenshots', { recursive: true });
const errors = [];
try {
  const api = await browser.newContext();
  const created = await api.request.post(site + '/api/rooms', { data: { mode: 'catchup', category: 'mixed', count: 1, seconds: 0, playStyle: 'individual' } });
  assert.equal(created.status(), 201, await created.text());
  const { code, host } = await created.json();
  const players = [];
  for (const name of ['Maya', 'Oliver', 'Priya', 'Sam']) players.push({ name, ...await (await api.request.post(`${site}/api/rooms/${code}/join`, { data: { name } })).json() });
  const snap = async key => (await api.request.get(`${site}/api/rooms/${code}`, { headers: { 'x-game-key': key } })).json();
  const advance = async () => { const s = await snap(host); const r = await api.request.post(`${site}/api/rooms/${code}/advance`, { headers: { 'x-game-key': host }, data: { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion } }); assert.ok(r.ok(), await r.text()); };
  const open = async (key, isHost, options) => {
    const context = await browser.newContext(options);
    await context.addInitScript(({ code, key, isHost }) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: isHost })), { code, key, isHost });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(site, { waitUntil: 'domcontentloaded' });
    return page;
  };
  const tv = await open(host, true, { viewport: { width: 1280, height: 720 } });
  await tv.locator('.game.host-screen').waitFor({ timeout: 15000 });
  await advance();
  await tv.locator('.catch-game[data-catch="ready"]').waitFor({ timeout: 15000 });
  for (const player of players) player.side = (await snap(player.key)).party.side;
  const first = (await snap(host)).party.turn;
  const runner = players.find(player => player.side === first), chaser = players.find(player => player.side !== first);
  const runPhone = await open(runner.key, false, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const chasePhone = await open(chaser.key, false, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await tv.screenshot({ path: 'browser-screenshots/catch-up-ready-tv.png' });

  // The run: the question is on the TV with no answer marked; only the running side has buttons.
  await advance();
  await tv.locator('.catch-game[data-catch="leg"] .catch-question').waitFor({ timeout: 15000 });
  await runPhone.locator('.catch-button').first().waitFor({ timeout: 15000 });
  assert.equal(await runPhone.locator('.catch-button').count(), 4);
  assert.equal(await chasePhone.locator('.catch-button').count(), 0, 'the other side has nothing to tap');
  assert.equal(await tv.locator('.catch-options li').count(), 4);
  assert.equal(await tv.locator('.catch-options [data-correct], .catch-options .correct').count(), 0, 'the TV never marks the answer');
  assert.equal((await snap(host)).party.question.correct, undefined);
  const tap = await runPhone.locator('.catch-button').first().boundingBox();
  assert.ok(tap.height >= 56, 'thumb-sized buttons');
  assert.ok(await runPhone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll');
  // Tap answers until the count moves or the side is frozen; either way the question changes.
  const before = (await snap(host)).party.step;
  await runPhone.locator('.catch-button').first().click();
  await tv.waitForFunction(step => true, before);
  await tv.locator('.catch-last[data-correct]').waitFor({ timeout: 8000 });
  assert.ok((await snap(host)).party.step > before, 'a fresh question follows every answer');
  await tv.screenshot({ path: 'browser-screenshots/catch-up-run-tv.png' });
  await runPhone.screenshot({ path: 'browser-screenshots/catch-up-run-phone.png' });
  await advance();
  await tv.locator('.catch-game[data-catch="ready"]').waitFor({ timeout: 15000 });
  const target = (await snap(host)).party.target;
  assert.match(await tv.locator('.catch-head h1').innerText(), new RegExp('beat ' + target, 'i'));

  // The chase: the sides have swapped who may answer; the target shows on the track.
  await advance();
  await chasePhone.locator('.catch-button').first().waitFor({ timeout: 15000 });
  assert.equal(await runPhone.locator('.catch-button').count(), 0);
  assert.equal(await tv.locator('.catch-target').count(), 1);
  await tv.screenshot({ path: 'browser-screenshots/catch-up-chase-tv.png' });
  await advance();
  await tv.locator('.catch-game[data-catch="result"] .catch-result').waitFor({ timeout: 15000 });
  await tv.screenshot({ path: 'browser-screenshots/catch-up-result-tv.png' });
  // Round two and the end.
  for (const phase of ['ready', 'leg', 'ready', 'leg', 'result']) { await advance(); await tv.locator(`.catch-game[data-catch="${phase}"]`).waitFor({ timeout: 15000 }); }
  await advance();
  await tv.locator('.game[data-phase="finished"] .catch-game').waitFor({ timeout: 15000 });
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: run, chase, swap and full time on a TV and two phones');
} finally { await browser.close(); }
