// Installing Jambaloop on a phone from the browser, with no app store (owner request, 28 November 2026):
// Chrome's ⋮ → Install app, or Safari's Share → Add to Home Screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { installKind, installOfferView, isAppleMobile, onInstallChange, promptInstall, runningAsApp, setUpInstall } from '../public/install-app.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pngSize = path => {
  const data = readFileSync(new URL('../public' + path, import.meta.url));
  assert.equal(data.toString('ascii', 1, 4), 'PNG', `${path} is a PNG`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};

test('the app manifest has what browsers need to install Jambaloop', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(manifest.name, 'Jambaloop');
  assert.equal(manifest.short_name, 'Jambaloop');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone', 'opens full screen, like an app');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  const icon = (size, purpose) => manifest.icons.find(entry => entry.sizes === `${size}x${size}` && entry.purpose === purpose);
  for (const [size, purpose] of [[192, 'any'], [512, 'any'], [512, 'maskable']]) {
    const entry = icon(size, purpose);
    assert.ok(entry, `a ${size}px ${purpose} icon`);
    assert.equal(entry.type, 'image/png');
    assert.deepEqual(pngSize(entry.src), [size, size], `${entry.src} really is ${size}x${size}`);
  }
  assert.deepEqual(pngSize('/app-icons/apple-touch-icon.png'), [180, 180], 'the iPhone home-screen icon');
});

test('every page links the manifest and the home-screen icon', () => {
  const html = read('public/index.html');
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/app-icons\/apple-touch-icon\.png">/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Jambaloop">/);
  // Content must not slide under the iPhone clock: the page does not use the safe-area insets.
  assert.doesNotMatch(html, /black-translucent/);
});

test('the service worker only shows an offline page: games, pictures and the room API never come from a cache', () => {
  const worker = read('public/sw.js');
  assert.match(worker, /if \(request\.mode !== 'navigate' \|\| request\.method !== 'GET'\) return;/, 'only page loads are handled');
  assert.match(worker, /fetch\(request\)\.catch\(/, 'the network always comes first');
  assert.match(worker, /const KEEP = \['\/offline\.html', '\/app-icons\/icon-192\.png'\];|const KEEP = \[OFFLINE, '\/app-icons\/icon-192\.png'\];/, 'only the offline page and its icon are stored');
  assert.doesNotMatch(worker, /\/api/, 'the room API is never touched');
  assert.ok(existsSync(new URL('../public/offline.html', import.meta.url)));
  assert.match(read('public/offline.html'), /addEventListener\('online', \(\) => location\.reload\(\)\)/, 'it tries again by itself');
  // Browsers check the worker and manifest for updates on every visit.
  assert.match(read('server.js'), /app\.use\(\['\/sw\.js', '\/manifest\.webmanifest'\], \(_req, res, next\) => \{\n\s+res\.set\('Cache-Control', 'no-cache'\);/);
});

// A stand-in window: events, a display mode and a navigator.
function fakeWindow({ agent = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/131.0 Mobile', standalone = false, worker = true } = {}) {
  const target = new EventTarget();
  const registered = [];
  return Object.assign(target, {
    registered,
    isSecureContext: true,
    matchMedia: query => ({ matches: standalone && query.includes('standalone') }),
    navigator: { userAgent: agent, platform: 'Linux armv8l', maxTouchPoints: 5,
      serviceWorker: worker ? { register: path => { registered.push(path); return Promise.resolve(); } } : undefined },
  });
}

test('the install offer: one tap where the browser offers it, Share steps on an iPhone, never on the TV or inside the app', async () => {
  const win = fakeWindow();
  let changes = 0;
  const stop = onInstallChange(() => changes++);
  setUpInstall({ win, isTv: () => false });
  win.dispatchEvent(new Event('load'));
  assert.deepEqual(win.registered, ['/sw.js'], 'the service worker is registered once the page has loaded');
  assert.equal(installKind({ win }), '', 'nothing to offer until the browser offers');
  const offer = new Event('beforeinstallprompt', { cancelable: true });
  let asked = 0;
  offer.prompt = () => { asked++; };
  offer.userChoice = Promise.resolve({ outcome: 'dismissed' });
  win.dispatchEvent(offer);
  assert.equal(offer.defaultPrevented, true, 'the browser\'s own mini-bar is held back for our button');
  assert.equal(installKind({ win }), 'prompt');
  assert.equal(installKind({ win, isTv: () => true }), '', 'never on the TV');
  assert.equal(installKind({ win: fakeWindow({ standalone: true }) }), '', 'not inside the installed app');
  assert.match(installOfferView('prompt'), /data-action="install-app"[^>]*>[^<]*Install Jambaloop/);
  assert.equal(await promptInstall(), false, 'a dismissed offer is not an install');
  assert.equal(asked, 1);
  assert.equal(installKind({ win }), '', 'the browser\'s offer can only be used once');
  assert.ok(changes >= 2, 'the screen is told when the offer arrives and when it is used');
  stop();

  const iphone = fakeWindow({ agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile Safari/604.1' });
  assert.equal(isAppleMobile(iphone.navigator), true);
  assert.equal(installKind({ win: iphone }), 'ios');
  assert.match(installOfferView('ios'), /Share button[\s\S]*Add to Home Screen/);
  assert.equal(isAppleMobile({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 }), true, 'an iPad that asks for the desktop site');
  assert.equal(runningAsApp(fakeWindow({ standalone: true })), true);
  assert.equal(installOfferView(''), '');

  // The TV registers no service worker: the Fire TV app shows its own offline screen.
  const tv = fakeWindow();
  setUpInstall({ win: tv, isTv: () => true });
  tv.dispatchEvent(new Event('load'));
  assert.deepEqual(tv.registered, []);
});

test('the app wires the install offer in', () => {
  const app = read('public/app.js');
  assert.match(app, /setUpInstall\(\{ isTv: isTvScreen \}\);/);
  assert.match(app, /if \(action === 'install-app'\) return promptInstall\(\);/);
  assert.match(app, /installOfferView\(installKind\(\{ isTv: isTvScreen \}\), icons\)/);
});
