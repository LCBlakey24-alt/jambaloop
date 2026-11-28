import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { looksLikeTvBrowser, prepareTvScreen, readScreenChoice, rememberScreen, screenKind, tvLayoutWidth } from '../public/device.js';

// A tiny stand-in for the browser: what the device reports, and a localStorage.
const store = new Map();
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) };
const device = ({ agent = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537.36', touch = 0, pointer = 'fine', anyFine = pointer === 'fine', screen = [1920, 1080], width = 1280 } = {}) => ({
  navigator: { userAgent: agent, maxTouchPoints: touch }, screen: { width: screen[0], height: screen[1] }, innerWidth: width,
  matchMedia: query => ({ matches: query === '(any-pointer: fine)' ? anyFine : query.includes(`pointer: ${pointer}`) }),
});

test('Fire TV sticks and common smart-TV browsers are recognised by name; phones and laptops are not', () => {
  for (const agent of [
    'Mozilla/5.0 (Linux; Android 9; AFTKA Build/PS7633) AppleWebKit/537.36 (KHTML, like Gecko) Silk/120.4.1 Chrome/120 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; AFTMM Build/NS6265; wv) AppleWebKit/537.36 Version/4.0 Chrome/70 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; AFTSSS) AmazonWebAppPlatform/3.4.0',
    'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 SamsungBrowser/4.0 TV Safari/537.36',
    'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/79 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; BRAVIA 4K VH2 Build/QTG3.200305.006.S285) AppleWebKit/537.36 Chrome/96 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Chromecast) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108 Safari/537.36 CrKey/1.56',
  ]) assert.ok(looksLikeTvBrowser(agent), agent);
  for (const agent of [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Version/17.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; KFTRWI) AppleWebKit/537.36 Silk/120 Chrome/120 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  ]) assert.ok(!looksLikeTvBrowser(agent), agent);
});

test('a screen with no touchscreen, steered by a remote, on a landscape screen is the TV; a phone and a laptop are not', () => {
  store.clear();
  assert.equal(screenKind(device({ touch: 0, pointer: 'coarse', screen: [960, 540] })), 'tv', 'a TV stick that does not name itself');
  assert.equal(screenKind(device({ touch: 0, pointer: 'none', screen: [960, 540] })), 'tv');
  assert.equal(screenKind(device({ touch: 5, pointer: 'coarse', screen: [390, 844] })), undefined, 'a phone');
  assert.equal(screenKind(device({ touch: 10, pointer: 'coarse', screen: [1366, 1024] })), undefined, 'a touch tablet');
  assert.equal(screenKind(device({ touch: 0, pointer: 'fine', screen: [1920, 1080] })), undefined, 'a laptop');
  assert.equal(screenKind(device({ touch: 0, pointer: 'coarse', anyFine: true, screen: [1920, 1080] })), undefined, 'a laptop with a mouse too');
});

test('the choice made on a device wins, and ?tv, ?phone and ?auto set or clear it', () => {
  store.clear();
  readScreenChoice('?tv');
  assert.equal(screenKind(device()), 'tv');
  readScreenChoice('?phone');
  assert.equal(screenKind(device({ agent: 'AFTKA Silk' })), 'phone', 'even a Fire TV can be told it is a phone');
  readScreenChoice('?auto');
  assert.equal(store.size, 0);
  assert.equal(readScreenChoice('?device'), true, '?device asks for the screen check');
  rememberScreen('nonsense');
  assert.equal(store.size, 0, 'only tv or phone are remembered');
});

test('on a TV the page is laid out 1280 wide and marked as the TV; elsewhere nothing changes', () => {
  store.clear();
  const page = () => {
    const attributes = { content: 'width=device-width, initial-scale=1' };
    const classes = new Set();
    return { meta: attributes, doc: { documentElement: { classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name) } }, querySelector: () => ({ setAttribute: (key, value) => { attributes[key] = value; } }) }, classes };
  };
  const tv = page();
  assert.equal(prepareTvScreen(tv.doc, device({ agent: 'AFTKA', width: 960 })), true);
  assert.equal(tv.meta.content, `width=${tvLayoutWidth}`);
  assert.ok(tv.classes.has('tv-screen'));
  const laptop = page();
  assert.equal(prepareTvScreen(laptop.doc, device({ width: 1440 })), false);
  assert.equal(laptop.meta.content, 'width=device-width, initial-scale=1');
  assert.ok(!laptop.classes.has('tv-screen'));
});

test('the app: TVs never get the phone prompt or the phone layout, phones can say "This screen is our TV", and tile captions sit under the art', () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /const smallScreen = \(\) => !isTvScreen\(\) && \(matchMedia\('\(max-width: 760px\)'\)\.matches \|\| \(hasTouchscreen\(\) &&/);
  assert.match(app, /data-screen="tv"[^>]*>This screen is our TV: host here<\/button>/);
  assert.match(app, /if \(button\.dataset\.screen === 'tv'\) \{ rememberScreen\('tv'\); prepareTvScreen\(\); \}/);
  assert.match(readFileSync(new URL('../public/mobile-deck.js', import.meta.url), 'utf8'), /const phoneLayout = \(\) => media\.matches && !isTvScreen\(\);/);
  assert.match(readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'), /data-action="device">On a TV\?<\/button>/);
  const css = readFileSync(new URL('../public/tv-screen.css', import.meta.url), 'utf8');
  assert.match(css, /\.game-tile \{ display: grid !important; grid-template-rows: minmax\(0, 1fr\) auto; \}/, 'the caption is a row of its own, under the art');
  assert.match(css, /\.tile-info \{\n  position: static !important;/);
  assert.match(css, /\.tile-players-word \{ display: none; \}/, 'narrow tiles shorten "1+ players" rather than cutting the type off');
});
