// Don't Look!, end to end on a TV and four phones:
// the guesser's phone never shows the word; the TV and the describers do;
// Correct and Pass are thumb-sized; the turn result and final score appear.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];
const watch = page => { page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text()); }); };
const api = await browser.newContext();
const call = async (path, key, data) => { const response = await api.request.fetch(site + '/api/rooms' + path, { method: data ? 'POST' : 'GET', headers: key ? { 'x-game-key': key } : {}, data }); return response.status() === 204 ? undefined : response.json(); };
try {
  const { code, host } = await call('', undefined, { mode: 'dontlook', category: 'mixed', count: 1, seconds: 0 });
  const players = [];
  for (const name of ['Ada', 'Bo', 'Cy', 'Di']) players.push({ name, ...(await call(`/${code}/join`, undefined, { name })) });
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
  await tv.locator('.look-game[data-look="ready"]').waitFor({ timeout: 15000 });
  await tv.waitForTimeout(3500); // let the title sting and wipes finish
  await tv.screenshot({ path: 'browser-screenshots/dont-look-tv-ready.png' });

  // Who is who this turn.
  const roles = async () => { const out = {}; for (const player of players) { const party = (await call(`/${code}`, player.key)).party; if (party.guessing) out.guesser = player; else if (party.team === party.active) out.describer = player; else out.rival = player; } return out; };
  const { guesser, describer, rival } = await roles();
  assert.ok(guesser && describer && rival, 'two teams of two');
  await guesser.page.locator('[data-action="look-start"]').waitFor({ timeout: 8000 });
  assert.equal(await describer.page.locator('[data-action="look-start"]').count(), 0, 'only the guesser gets the start button');
  await guesser.page.screenshot({ path: 'browser-screenshots/dont-look-phone-guesser-ready.png' });
  await guesser.page.locator('[data-action="look-start"]').click();

  // The word: on the TV and the describer's phone, never on the guesser's.
  await tv.locator('.look-card strong').waitFor({ timeout: 8000 });
  const word = await tv.locator('.look-card strong').innerText();
  assert.ok(word.length >= 3);
  await describer.page.locator('.look-phone-word').waitFor({ timeout: 8000 });
  assert.ok((await describer.page.locator('.look-phone-word').innerText()).includes(word));
  await guesser.page.locator('.look-blind').waitFor({ timeout: 8000 });
  assert.equal((await guesser.page.locator('section.game').innerText()).includes(word), false, 'the guesser’s phone never shows the word');
  assert.equal(await guesser.page.locator('[data-action="look-mark"]').count(), 0);
  assert.equal(await rival.page.locator('[data-action="look-mark"]').count(), 0, 'the other team cannot mark');
  await tv.waitForTimeout(500);
  const fits = await tv.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2 && document.querySelector('.look-card strong').getBoundingClientRect().height >= 80);
  assert.ok(fits, 'the word is huge and the TV does not scroll');
  await tv.waitForTimeout(2500); // let the title sting and wipes finish
  await tv.screenshot({ path: 'browser-screenshots/dont-look-tv-word.png' });
  await describer.page.screenshot({ path: 'browser-screenshots/dont-look-phone-describer.png' });
  await guesser.page.screenshot({ path: 'browser-screenshots/dont-look-phone-guesser.png' });
  await describer.page.waitForFunction(() => [...document.querySelectorAll('.look-button')].every(button => button.getBoundingClientRect().height >= 60), null, { timeout: 4000 }).catch(() => assert.fail('thumb-sized buttons'));

  // Correct, then Pass: the count moves and the word changes each time.
  await describer.page.locator('[data-action="look-mark"][data-result="correct"]').click();
  await tv.waitForFunction(old => document.querySelector('.look-card strong')?.innerText !== old, word, { timeout: 8000 });
  assert.equal(await tv.locator('.look-count').innerText(), '1');
  const second = await tv.locator('.look-card strong').innerText();
  await describer.page.locator('[data-action="look-mark"][data-result="pass"]:not([disabled])').click();
  await tv.waitForFunction(old => document.querySelector('.look-card strong')?.innerText !== old, second, { timeout: 8000 });
  assert.equal(await tv.locator('.look-count').innerText(), '1', 'a pass does not score');
  console.log('PASS: the word is on the TV and the team’s phones only; Correct and Pass work');

  // The host stops the clock; the result lists the words; play on to the end.
  await tv.locator('[data-action="advance"]').click();
  await tv.locator('.look-game[data-look="result"] .look-words').waitFor({ timeout: 8000 });
  assert.equal(await tv.locator('.look-words li[data-got="true"]').count(), 1);
  await tv.waitForTimeout(1800); // let the title sting and wipes finish
  await tv.screenshot({ path: 'browser-screenshots/dont-look-tv-result.png' });
  for (let guard = 0; guard < 12 && (await call(`/${code}`, host)).phase !== 'finished'; guard++) {
    await tv.locator('[data-action="advance"]').first().click();
    await tv.waitForTimeout(350);
  }
  await tv.locator('.look-game[data-look="finished"]').waitFor({ timeout: 8000 });
  await tv.waitForTimeout(2500); // let the title sting and wipes finish
  await tv.screenshot({ path: 'browser-screenshots/dont-look-tv-final.png' });
  const final = (await call(`/${code}`, host)).party;
  assert.equal(final.teams.reduce((total, team) => total + team.score, 0), 1);
  assert.equal(typeof final.champion, 'number');
  console.log('PASS: turn result, both teams take turns, and a winner at full time');
  assert.deepEqual(errors, [], 'no page errors');
} finally { await browser.close(); }
