// Installing Jambaloop from the browser on a phone (no app store): Chrome finds nothing stopping it,
// the service worker runs, the install button appears when the browser offers and asks when tapped,
// an iPhone gets the Share → Add to Home Screen steps, no internet shows the offline page, the room API
// is untouched, and the TV is never offered it.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
const site = process.env.SITE || 'http://127.0.0.1:32000';
const executablePath = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const args = ['--no-sandbox', '--disable-dev-shm-usage'];
const errors = [];
const addSlot = page => page.evaluate(() => {
  const slot = document.createElement('div');
  slot.setAttribute('data-install-slot', '');
  document.querySelector('#app').prepend(slot);
});
const offer = page => page.evaluate(() => {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = () => { window.installAsked = true; };
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  dispatchEvent(event);
});

// 1. A normal browser profile (installing is never offered in a private window): nothing stops Chrome installing.
const profile = mkdtempSync(join(tmpdir(), 'jambaloop-install-'));
const phone = await chromium.launchPersistentContext(profile, { headless: true, executablePath, args, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
try {
  const page = await phone.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  const worker = await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; return { scope: registration.scope, active: Boolean(registration.active) }; });
  assert.equal(worker.active, true, 'the service worker is running');
  assert.equal(new URL(worker.scope).pathname, '/', 'it covers the whole site');
  const cdp = await phone.newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  assert.deepEqual(manifest.errors, [], 'the app manifest has no errors');
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installabilityErrors, [], 'Chrome can install Jambaloop');
  // Chrome makes its own offer to an installable site, and the phone home's button appears for it.
  await page.locator('.phone-home [data-action="install-app"]').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('[data-action="install-app"]').count(), 1, 'one install button');
  console.log('PASS: Chrome can install Jambaloop as an app, and the phone home offers it');

  // 3. No internet: the service worker has the offline page stored, ready to show. (How a page load
  // behaves with the network cut is checked against sw.js itself in test/install-app.test.js: the
  // browser's own offline switch does not reach service workers the same way in every Chrome build.)
  const stored = await page.evaluate(async () => {
    const response = await caches.match('/offline.html');
    return response ? await response.text() : '';
  });
  assert.match(stored, /can.t reach the internet/, 'the offline page is stored');
  assert.equal(await page.evaluate(async () => (await fetch('/api/rooms/000000')).status), 404, 'the room API goes to the server');
  console.log('PASS: the offline page is stored for when there is no internet; the room API is untouched');
} finally {
  await phone.close();
  rmSync(profile, { recursive: true, force: true });
}

const browser = await chromium.launch({ headless: true, executablePath, args });
try {
  // 2. The install button (a private window, where Chrome never offers by itself, so the offer is simulated):
  // hidden until the browser offers, then one tap asks the browser and the button goes away.
  const android = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const tap = await android.newPage();
  tap.on('pageerror', error => errors.push(error.message));
  await tap.goto(site, { waitUntil: 'domcontentloaded' });
  await tap.locator('.phone-home [data-install-slot]').waitFor({ state: 'attached', timeout: 10000 });
  await tap.waitForTimeout(150);
  assert.equal(await tap.locator('[data-action="install-app"]').count(), 0, 'no button before the browser offers');
  assert.equal(await tap.locator('.phone-home [data-install-slot]').isHidden(), true, 'the slot stays out of the way');
  await offer(tap);
  await tap.locator('.phone-home [data-action="install-app"]').waitFor({ timeout: 5000 });
  await tap.locator('[data-action="install-app"]').click();
  await tap.waitForFunction(() => window.installAsked === true);
  await tap.waitForFunction(() => !document.querySelector('[data-action="install-app"]'));
  console.log('PASS: the install button asks the browser, then goes away');

  // 4. iPhone: the Share → Add to Home Screen steps instead of a button.
  const iphone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const page = await iphone.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  await page.locator('.phone-home .install-offer-ios summary').waitFor({ timeout: 10000 });
  await page.locator('.install-offer-ios summary').click();
  assert.match(await page.locator('.install-offer-ios').textContent(), /Add to Home Screen/);
  console.log('PASS: an iPhone is shown how to add Jambaloop to the home screen');

  // 5. The TV: never offered, and no service worker (the Fire TV app has its own offline screen).
  const tv = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const screen = await tv.newPage();
  screen.on('pageerror', error => errors.push(error.message));
  await screen.goto(site + '/?tv', { waitUntil: 'load' });
  await addSlot(screen);
  await offer(screen);
  await screen.waitForTimeout(300);
  assert.equal(await screen.locator('[data-action="install-app"]').count(), 0, 'the TV is not offered the phone app');
  assert.equal(await screen.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0, 'no service worker on the TV');
  console.log('PASS: the TV is never offered it');
  assert.deepEqual(errors, [], 'no page errors');
} finally {
  await browser.close();
}
