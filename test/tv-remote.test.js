import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextInDirection } from '../public/tv-remote.js';
import { looksLikeTvBrowser } from '../public/device.js';

const box = (left, top, width = 100, height = 40) => ({ left, top, width, height });

test('the remote moves to the nearest button in the direction pressed, preferring ones in line', () => {
  // A row of three buttons and one below the middle.
  const from = box(200, 100);
  const others = [box(0, 100), box(400, 100), box(200, 200), box(420, 300)];
  assert.equal(nextInDirection(from, 'left', others), 0);
  assert.equal(nextInDirection(from, 'right', others), 1, 'the one in line, not the one further down');
  assert.equal(nextInDirection(from, 'down', others), 2);
  assert.equal(nextInDirection(from, 'up', others), -1, 'nothing above: stay put');
  // A grid: right from the top-left goes to top-middle, not to bottom-middle.
  const grid = [box(150, 0), box(150, 150), box(300, 0)];
  assert.equal(nextInDirection(box(0, 0), 'right', grid), 0);
});

test('the Fire TV app is recognised as the TV, and the site listens to the remote only on a TV', () => {
  assert.ok(looksLikeTvBrowser('Mozilla/5.0 (Linux; Android 9; AFTKA; wv) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 JambaloopTV/1.0'));
  assert.ok(looksLikeTvBrowser('Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Safari/537.36 JambaloopTV/1.0'), 'by the app\'s own name');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /enableRemote\(isTvScreen\);/);
  const remote = readFileSync(new URL('../public/tv-remote.js', import.meta.url), 'utf8');
  assert.match(remote, /win\.addEventListener\('keydown'/, 'after the page\'s own key handlers');
  assert.match(remote, /event\.defaultPrevented/, 'keys the page already used (the carousel) are left alone');
  assert.match(readFileSync(new URL('../public/tv-screen.css', import.meta.url), 'utf8'), /html\.tv-screen :focus-visible \{ outline: 4px solid #ffd34d/);
});

test('the Fire TV app opens the site as the TV, full screen, with sound, and shows on the TV home screen', () => {
  const read = path => readFileSync(new URL('../fire-tv-app/' + path, import.meta.url), 'utf8');
  const activity = read('app/src/main/java/com/rookiequest/jambaloop/MainActivity.java');
  assert.match(activity, /HOME = "https:\/\/" \+ HOST \+ "\/\?tv"/);
  assert.match(activity, /setMediaPlaybackRequiresUserGesture\(false\)/);
  assert.match(activity, /setUseWideViewPort\(true\)/);
  assert.match(activity, /JambaloopTV\/1\.\d/);
  // Steady on a small stick: a stopped page engine is replaced (the site goes back to its room) instead of
  // closing the app, and display, remote or font changes never restart it.
  assert.match(activity, /public boolean onRenderProcessGone\(WebView v, RenderProcessGoneDetail detail\) \{[\s\S]*?restartPage\(\);\s+return true;/);
  assert.match(activity, /web\.loadUrl\(HOME \+ "&back=engine"\)/);
  assert.match(activity, /return !HOST\.equals\(/, 'it stays on Jambaloop');
  const manifest = read('app/src/main/AndroidManifest.xml');
  assert.match(manifest, /android\.intent\.category\.LEANBACK_LAUNCHER/);
  for (const change of ['screenSize', 'smallestScreenSize', 'screenLayout', 'density', 'fontScale', 'keyboard', 'keyboardHidden', 'navigation', 'uiMode']) {
    assert.match(manifest, new RegExp(`android:configChanges="[^"]*\\b${change}\\b`), `a ${change} change does not restart the app`);
  }
  assert.match(manifest, /android:banner="@drawable\/banner"/);
  assert.match(manifest, /android\.hardware\.touchscreen" android:required="false"/);
  assert.match(read('app/build.gradle'), /minSdk 22/);
});

test('the built app is served at /tv.apk, so a Fire TV can download it with Downloader', async () => {
  const { readFileSync, statSync } = await import('node:fs');
  const apk = new URL('../public/tv.apk', import.meta.url);
  assert.ok(statSync(apk).size > 20000 && statSync(apk).size < 5_000_000);
  const bytes = readFileSync(apk);
  assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'an APK is a zip archive');
  assert.ok(bytes.includes(Buffer.from('AndroidManifest.xml')) && bytes.includes(Buffer.from('classes.dex')));
  assert.match(readFileSync(new URL('../fire-tv-app/README.md', import.meta.url), 'utf8'), /jambaloop-family-test\.onrender\.com\/tv\.apk/);
});

test('the TV keeps its last ten page loads, so the screen check shows whether a flash was a reload', async () => {
  const { recordPageLoad, screenReport } = await import('../public/device.js');
  const store = new Map();
  const env = {
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) },
    performance: { getEntriesByType: () => [{ type: 'reload' }] },
    location: { search: '?tv&back=engine' }, navigator: { userAgent: 'JambaloopTV/1.1', maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }), screen: {},
  };
  for (let i = 0; i < 12; i++) recordPageLoad(env);
  assert.equal(JSON.parse(store.get('jambaloop-page-loads')).length, 10, 'only the last ten');
  assert.match(screenReport(env).loads, /reload \(engine\)/);
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(isTvScreen\(\)\) recordPageLoad\(\);/);
  assert.match(app, /\['Page loads', report\.loads\]/);
});
