import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const origin = process.env.JAMBALOOP_BROWSER_URL;
const require = createRequire(import.meta.url);

async function openBrowser(t) {
  const { chromium } = require(process.env.JAMBALOOP_PLAYWRIGHT_MODULE || 'playwright-core');
  const browser = await chromium.launch({
    executablePath: process.env.JAMBALOOP_CHROMIUM || undefined,
    args: ['--disable-webgl'],
  });
  t.after(() => browser.close());
  return browser;
}

const phoneOptions = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
};

async function join(page, code, nickname) {
  await page.goto(new URL('/?join=' + code, origin).href);
  await page.getByLabel('Nickname').fill(nickname);
  await page.locator('#join-form button.primary').tap();
  await page.locator('[data-phase="lobby"]').waitFor();
}

test('a join and a ready update preserve keyboard focus on a lobby control', { skip: !origin }, async t => {
  const browser = await openBrowser(t);
  const tv = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const captain = await browser.newPage(phoneOptions);
  const guest = await browser.newPage(phoneOptions);
  await tv.goto(origin);
  await tv.getByRole('button', { name: 'Open party lobby' }).click();
  const code = await tv.locator('.room-code').textContent();
  await join(captain, code, 'Captain');
  await tv.getByText('1 connected', { exact: true }).waitFor();

  const start = tv.getByRole('button', { name: 'Start quiz' });
  const captainReady = captain.getByRole('button', { name: 'I’m ready' });
  const hasFocus = locator => locator.evaluate(button => button === document.activeElement);
  await start.focus();
  await captainReady.focus();
  assert.ok(await hasFocus(start));
  await join(guest, code, 'Guest');
  await tv.getByText('2 connected', { exact: true }).waitFor();
  await captain.getByText('0 of 2 ready', { exact: true }).waitFor();
  assert.ok(await hasFocus(start), 'focus stays on Start quiz after a player joins');
  assert.ok(await hasFocus(captainReady), 'focus stays on the phone control after a player joins');

  await guest.getByRole('button', { name: 'I’m ready' }).tap();
  await tv.getByText('1 of 2 ready', { exact: true }).waitFor();
  await captain.getByText('1 of 2 ready', { exact: true }).waitFor();
  assert.ok(await hasFocus(start), 'focus stays on Start quiz after a player marks ready');
  assert.ok(await hasFocus(captainReady), 'focus stays on the phone control after another player marks ready');
  await tv.keyboard.press('Enter');
  await tv.locator('[data-phase="question"]').waitFor();
});

test('malformed session data recovers while unrelated browser data is kept', { skip: !origin }, async t => {
  const browser = await openBrowser(t);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  for (const badSession of ['{"code":', '{"host":true}']) {
    await page.evaluate(raw => {
      sessionStorage.setItem('quizmas-session', raw);
      sessionStorage.setItem('unrelated-session', 'keep');
      localStorage.setItem('quiz-club-theme', 'arcade');
    }, badSession);
    await page.reload();
    await page.locator('.mode-card').first().waitFor();
    const stored = await page.evaluate(() => ({
      room: sessionStorage.getItem('quizmas-session'),
      unrelated: sessionStorage.getItem('unrelated-session'),
      theme: localStorage.getItem('quiz-club-theme'),
    }));
    assert.deepEqual(stored, { room: null, unrelated: 'keep', theme: 'arcade' });
  }
  await page.getByRole('button', { name: 'Open party lobby' }).click();
  const code = await page.locator('.room-code').textContent();
  await page.reload();
  assert.equal(await page.locator('.room-code').textContent(), code);
  assert.deepEqual(errors, []);
});

test('an uploaded portrait retries after a dropped request and needs a room credential', { skip: !origin }, async t => {
  const browser = await openBrowser(t);
  const tv = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const phone = await browser.newPage(phoneOptions);
  await tv.goto(origin);
  await tv.getByRole('button', { name: 'Open party lobby' }).click();
  const code = await tv.locator('.room-code').textContent();
  const photoPath = '/api/rooms/' + code + '/avatar/';
  let attempts = 0;
  await tv.route('**' + photoPath + '*', route => ++attempts === 1 ? route.abort('failed') : route.continue());
  const interruptedPhoto = tv.waitForEvent('requestfailed', { predicate: request => request.url().includes(photoPath) });
  const authorizedPhoto = tv.waitForResponse(response => response.url().includes(photoPath));
  await phone.goto(new URL('/?join=' + code, origin).href);
  await phone.getByLabel('Nickname').fill('Guest with photo');
  const tealSquare = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFUlEQVQI12NkaGhgwAaYGHCAwSkBAMyIARCK8RJQAAAAAElFTkSuQmCC';
  await phone.getByLabel('Choose photo').setInputFiles({
    name: 'synthetic-portrait.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tealSquare, 'base64'),
  });
  await phone.locator('#selfie-preview').waitFor();
  await phone.locator('#join-form button.primary').tap();
  await interruptedPhoto;
  await phone.getByRole('button', { name: 'I’m ready' }).tap();
  const photoResponse = await authorizedPhoto;
  assert.equal(attempts, 2);
  assert.equal(photoResponse.status(), 200);
  assert.match(photoResponse.headers()['content-type'], /^image\/jpeg/);
  const image = tv.locator('.players img.player-avatar[src^="blob:"]');
  await image.waitFor();
  assert.ok(await image.evaluate(node => node.complete && node.naturalWidth > 0));
  const outsideRoom = await tv.request.get(photoResponse.url());
  assert.equal(outsideRoom.status(), 403);
});
