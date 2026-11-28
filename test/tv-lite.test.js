// The lighter TV mode (owner's Fire TV Stick HD was jerky, 28 November 2026). On a low-powered TV the
// floating 3D background stays off, the race and board draw at the page's own resolution without edge
// smoothing (the race 30 times a second), and decoration that never stops holds still; the game itself
// is unchanged. Measured on a CPU slowed six times: the TV lobby went from 31-40 frames a second at
// 93-95% busy to 60 frames a second at 5-8% busy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lightTv, prepareTvScreen, readScreenChoice, screenReport } from '../public/device.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const store = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), map }; };
const tvEnv = (agent, extra = {}) => ({ localStorage: store(), navigator: { userAgent: agent, maxTouchPoints: 0, ...extra }, matchMedia: () => ({ matches: false }), screen: { width: 1920, height: 1080 }, location: { search: '' } });

test('the lighter TV mode is for low-powered TVs only, and can be chosen either way', () => {
  assert.equal(lightTv(tvEnv('Mozilla/5.0 (Linux; Android 9; AFTSS Build/PS7717; wv) Chrome/120 JambaloopTV/1.1')), true, 'the Fire TV app on a stick');
  assert.equal(lightTv(tvEnv('Mozilla/5.0 (Linux; Android 9; AFTKA) AppleWebKit/537.36 Silk/120')), true, 'Silk on a Fire TV');
  assert.equal(lightTv(tvEnv('Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) Chrome/85 TV Safari/537.36')), true, 'a smart-TV browser');
  assert.equal(lightTv(tvEnv('Mozilla/5.0 (PlayStation; PlayStation 5/2.26) AppleWebKit/605.1.15')), false, 'a games console is powerful enough');
  // A TV stick that does not say what it is (no touchscreen, steered by a remote): its memory decides.
  const chosen = extra => { const env = tvEnv('Mozilla/5.0 (X11; Linux x86_64) Chrome/120', extra); env.matchMedia = query => ({ matches: !query.includes('fine') }); return env; };
  assert.equal(lightTv(chosen({ deviceMemory: 2 })), true);
  assert.equal(lightTv(chosen({ deviceMemory: 8 })), false);
  // Never on a phone or laptop.
  const laptop = tvEnv('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120');
  laptop.matchMedia = query => ({ matches: /fine/.test(query) });
  assert.equal(lightTv(laptop), false);
  // ?lite=on / off is remembered on the device, ?lite=auto forgets it.
  const env = tvEnv('Mozilla/5.0 (Linux; Android 9; AFTSS) Silk/120');
  env.localStorage.setItem('jambaloop-tv-lite', 'off');
  assert.equal(lightTv(env), false, 'turned off by hand');
  env.localStorage.setItem('jambaloop-tv-lite', 'on');
  assert.equal(lightTv(chosen({ deviceMemory: 8 })), false);
  assert.match(read('public/device.js'), /if \(lite === 'on' \|\| lite === 'off'\) globalThis\.localStorage\?\.setItem\(LITE, lite\);/);
  assert.equal(typeof readScreenChoice, 'function');
  assert.equal(screenReport(tvEnv('Mozilla/5.0 (Linux; Android 9; AFTSS) Silk/120')).lighter, 'on', 'the screen check says so');
});

test('the page is marked for the lighter mode, and each 3D scene and stylesheet honours it', () => {
  const classes = new Set();
  const doc = { documentElement: { classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } }, querySelector: () => null };
  prepareTvScreen(doc, tvEnv('Mozilla/5.0 (Linux; Android 9; AFTSS) JambaloopTV/1.1'));
  assert.ok(classes.has('tv-screen') && classes.has('tv-lite'));
  assert.match(read('public/stage-3d.js'), /&& !document\.documentElement\.classList\.contains\('tv-lite'\);/, 'no floating 3D background');
  const race = read('public/race-3d.js');
  assert.match(race, /new THREE\.WebGLRenderer\(\{ antialias: !lite,/);
  assert.match(race, /renderer\.setPixelRatio\(lite \? 1 : /);
  assert.match(race, /if \(lite && now - lastDrawn < 32\) return true;/, '30 frames a second');
  assert.match(race, /if \(!reducedMotion && !lite\) placeCrowd/, 'the crowd stands still');
  const board = read('public/board.js');
  assert.match(board, /new THREE\.WebGLRenderer\(\{ alpha: true, antialias: !lite \}\)/);
  assert.match(board, /renderer\.setPixelRatio\(lite \? 1 : /);
  const css = read('public/tv-screen.css');
  const block = css.slice(css.indexOf('/* A lighter show for low-powered TVs'));
  for (const rule of block.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(text => text.trim()).filter(Boolean)) {
    for (const part of rule.split('{')[0].split(/,(?![^(]*\))/)) assert.match(part.trim(), /^html\.tv-lite /, `${part.trim()} applies to the lighter mode only`);
  }
  assert.match(block, /html\.tv-lite \.scene-backdrop > i,/);
  assert.match(block, /backdrop-filter: none !important;/);
});
