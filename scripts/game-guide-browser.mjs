// The per-game "how to play" guide.
// 1. Start the party, pick a game: the guide plays on the TV, phones say so.
// 2. The captain skips it from their phone; it can be replayed from the lobby.
// 3. Every scene of every game's guide draws without errors (screenshots).
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { gameGuides } from '../public/guide-scripts.js';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];
const watch = page => { page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text()); }); };
const api = await browser.newContext();
const call = async (path, key, data) => (await api.request.post(site + '/api/rooms' + path, { headers: key ? { 'x-game-key': key } : {}, data })).status();
const read = async (code, key) => (await api.request.get(site + '/api/rooms/' + code, { headers: { 'x-game-key': key } })).json();
try {
  const tv = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); watch(tv);
  await tv.goto(site, { waitUntil: 'domcontentloaded' });
  await tv.locator('[data-action="party"]').first().click();
  await tv.locator('[data-gather-tv]').waitFor({ timeout: 15000 });
  const { code, key: host } = JSON.parse(await tv.evaluate(() => sessionStorage.getItem('quizmas-session')));
  const ada = await (await api.request.post(site + '/api/rooms/' + code + '/join', { data: { name: 'Ada' } })).json();
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phoneContext.addInitScript(({ code, key }) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: false })), { code, key: ada.key });
  const phone = await phoneContext.newPage(); watch(phone);
  await phone.goto(site, { waitUntil: 'domcontentloaded' });
  await phone.locator('[data-action="party-start"]').click();
  await tv.locator('.welcome-show').waitFor({ timeout: 8000 });
  await phone.locator('.picker-welcome [data-action="welcome-skip"]').click();
  await tv.locator('.welcome-show').waitFor({ state: 'detached', timeout: 25000 });

  // 1. Pick the game in view: the guide opens on the TV.
  await phone.locator('[data-action="picker-play"]').click();
  await tv.locator('.guide-show').waitFor({ timeout: 8000 });
  assert.equal(await tv.locator('.guide-stage').getAttribute('data-scene'), 'title');
  await tv.waitForFunction(() => document.querySelector('.duo-caption')?.innerText.length > 5, null, { timeout: 8000 });
  await phone.locator('.guide-phone-note').waitFor({ timeout: 8000 });
  await tv.waitForTimeout(1500);
  await tv.screenshot({ path: 'browser-screenshots/guide/flow-tv.png' });
  await phone.screenshot({ path: 'browser-screenshots/guide/flow-phone.png' });
  console.log('PASS: picking a game plays its guide on the TV, with captions, and phones are told to watch');

  // 2. The captain skips; the lobby is back; it can be replayed.
  await phone.locator('[data-action="guide-skip"]').click();
  await tv.locator('.guide-show').waitFor({ state: 'detached', timeout: 8000 });
  assert.equal(await phone.locator('.guide-phone-note').count(), 0);
  await tv.locator('[data-action="guide-play"]').first().click();
  await tv.locator('.guide-show').waitFor({ timeout: 8000 });
  await tv.locator('.guide-skip').click();
  await tv.locator('.guide-show').waitFor({ state: 'detached', timeout: 8000 });
  console.log('PASS: the captain skips from their phone, and How to play replays it');

  // 3. Every scene of every guide draws.
  const { openGuide } = await tv.evaluate(async () => { window.guideShow = await import('/guide-show.js'); return { openGuide: true }; });
  assert.ok(openGuide);
  for (const [mode, lines] of Object.entries(gameGuides)) {
    await tv.evaluate(mode => { window.guideNow?.close(); document.querySelectorAll('.guide-show').forEach(node => node.remove()); window.guideNow = window.guideShow.openGuide(document.body, mode, {}); }, mode);
    let last;
    for (let index = 0; index < lines.length; index++) {
      const scene = lines[index][2];
      if (scene === last) continue;
      last = scene;
      await tv.evaluate(index => window.guideNow.line(index), index);
      assert.equal(await tv.locator('.guide-stage').getAttribute('data-scene'), scene, `${mode}: ${scene}`);
      const box = await tv.locator('.guide-scene > *').first().boundingBox();
      assert.ok(box && box.width > 80 && box.height > 40, `${mode}: ${scene} has something to look at`);
      assert.ok(box.y + box.height <= 720 + 2 && box.x >= -2 && box.x + box.width <= 1282, `${mode}: ${scene} fits the TV`);
      await tv.waitForTimeout(650);
      await tv.screenshot({ path: `browser-screenshots/guide/${mode}-${String(index + 1).padStart(2, '0')}-${scene}.png` });
    }
  }
  console.log('PASS: every scene of all ' + Object.keys(gameGuides).length + ' guides draws and fits the TV');
  assert.deepEqual(errors, [], 'no console errors');
} finally { await browser.close(); }
