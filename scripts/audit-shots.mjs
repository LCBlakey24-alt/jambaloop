// Diagnostic: screenshot the TV and one phone for every game at its first live
// screen, so the whole library can be reviewed side by side.
//   SITE=http://127.0.0.1:4612 OUT=dir node scripts/audit-shots.mjs [mode ...]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { modes, minimumPlayers } from '../public/game-config.js';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const out = process.env.OUT || 'browser-screenshots/audit';
const only = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await mkdir(out, { recursive: true });
const settle = page => page.evaluate(() => Promise.race([
  Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))),
  new Promise(resolve => setTimeout(resolve, 3000)),
]));
const report = [];
const api = await browser.newContext();
for (const [mode] of modes) {
  if (only.length && !only.includes(mode)) continue;
  const setup = { mode, format: mode === 'soclose' ? 'estimate' : 'choice', category: 'mixed',
    count: mode === 'board' ? 12 : ['spotlight', 'bloodmoon'].includes(mode) ? 1 : ['tracks', 'samepage'].includes(mode) ? 3 : 5,
    seconds: mode === 'quizrace' || ['tracks', 'samepage'].includes(mode) ? 0 : 20,
    ...(['board', 'tracks', 'showdown'].includes(mode) ? { playStyle: 'teams', teamCount: 2 } : { playStyle: 'individual' }) };
  const tv = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  try {
    const created = await api.request.post(site + '/api/rooms', { data: setup });
    if (created.status() !== 201) throw new Error('setup: ' + await created.text());
    const { code, host } = await created.json();
    const keys = [];
    for (let i = 0; i < Math.max(4, minimumPlayers(mode)); i++) keys.push((await (await api.request.post(`${site}/api/rooms/${code}/join`, { data: { name: ['Maya', 'Oliver', 'Priya', 'Sam', 'Tess', 'Uma'][i] ?? 'P' + i } })).json()).key);
    await tv.addInitScript(([code, key]) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: true })), [code, host]);
    await phone.addInitScript(([code, key]) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: false })), [code, keys[0]]);
    const tvPage = await tv.newPage();
    const phonePage = await phone.newPage();
    const errors = [];
    for (const page of [tvPage, phonePage]) { page.on('pageerror', error => errors.push(error.message)); await page.goto(site, { waitUntil: 'domcontentloaded' }); await page.locator('section.game').waitFor({ timeout: 6000 }).catch(async error => { console.log('DBG', (await page.evaluate(() => document.body.innerText)).slice(0, 200), errors); throw error; }); }
    const state = async () => (await api.request.get(`${site}/api/rooms/${code}`, { headers: { 'x-game-key': host } })).json();
    const s = await state();
    await api.request.post(`${site}/api/rooms/${code}/advance`, { headers: { 'x-game-key': host }, data: { phase: s.phase, index: s.index, game: s.game, lobbyVersion: s.lobbyVersion } });
    for (const page of [tvPage, phonePage]) { await page.waitForFunction(() => document.querySelector('section.game')?.dataset.phase !== 'lobby', { timeout: 15000 }); await page.waitForTimeout(600); await settle(page); }
    await tvPage.screenshot({ path: `${out}/${mode}-tv.png` });
    await phonePage.screenshot({ path: `${out}/${mode}-phone.png` });
    const overflow = await phonePage.evaluate(() => ({ wide: document.documentElement.scrollWidth - innerWidth, tall: document.documentElement.scrollHeight - innerHeight,
      small: [...document.querySelectorAll('section.game button:not([hidden])')].filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.height < 40 || r.width < 40); }).map(b => b.textContent.trim().slice(0, 20)) }));
    report.push({ mode, phase: (await state()).phase, errors, ...overflow });
  } catch (error) { report.push({ mode, failed: error.message.split('\n')[0] }); }
  await tv.close(); await phone.close();
}
await browser.close();
console.log(report.map(row => JSON.stringify(row)).join('\n'));
