// Diagnostic full-site scan: every game, stepped through its phases on a TV
// (1280x720), a phone (390x844) and a small phone (320x568). Saves screenshots
// and prints one JSON line per screen with anything that looks wrong.
//   SITE=http://127.0.0.1:4612 OUT=dir node scripts/site-scan.mjs [mode ...]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { modes, minimumPlayers } from '../public/game-config.js';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const out = process.env.OUT || 'browser-screenshots/scan';
const only = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await mkdir(out, { recursive: true });
const api = await browser.newContext();
const names = ['Maya', 'Oliver', 'Priya', 'Sam', 'Tess', 'Uma'];
const views = { tv: { viewport: { width: 1280, height: 720 } }, phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, small: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true } };

const measure = (page, tv) => page.evaluate(tv => {
  const root = document.querySelector('section.game') ?? document.body;
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0'; };
  const issues = [];
  const wide = document.documentElement.scrollWidth - innerWidth;
  if (wide > 1) issues.push(`sideways scroll ${wide}px`);
  if (tv) {
    const tall = Math.max(document.documentElement.scrollHeight, root.scrollHeight) - innerHeight;
    if (tall > 4) issues.push(`TV content taller than screen by ${tall}px`);
    const small = new Map();
    for (const el of root.querySelectorAll('h1,h2,h3,p,span,strong,small,li,button,label,b,em')) {
      if (!visible(el) || !el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2)) continue;
      if (el.closest('.game-top, .game-controls, [aria-hidden="true"]')) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 15) small.set(el.textContent.trim().slice(0, 28), Math.round(size));
    }
    if (small.size) issues.push('small TV text: ' + [...small].slice(0, 5).map(([t, s]) => `${s}px "${t}"`).join(', '));
  } else {
    const tiny = [...root.querySelectorAll('button, a, input, select, textarea, summary')].filter(visible).filter(el => { const r = el.getBoundingClientRect(); return r.height < 40 || r.width < 40; }).map(el => (el.textContent.trim() || el.getAttribute('aria-label') || el.tagName).slice(0, 18));
    if (tiny.length) issues.push('small tap targets: ' + [...new Set(tiny)].slice(0, 5).join(', '));
    const cut = [...root.querySelectorAll('h1,h2,p,button,strong,span')].filter(visible).filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible' && el.clientWidth > 0).map(el => el.textContent.trim().slice(0, 18));
    if (cut.length) issues.push('clipped text: ' + [...new Set(cut)].slice(0, 4).join(', '));
  }
  return issues;
}, tv);

for (const [mode] of modes) {
  if (only.length && !only.includes(mode)) continue;
  const setup = { mode, format: mode === 'soclose' ? 'estimate' : 'choice', category: 'mixed',
    count: mode === 'board' ? 12 : ['spotlight', 'bloodmoon'].includes(mode) ? 1 : ['tracks', 'samepage', 'punchline', 'cards', 'bluff', 'rare', 'sketch', 'topanswers'].includes(mode) ? 3 : 5,
    seconds: mode === 'quizrace' || ['tracks', 'samepage'].includes(mode) ? 0 : 20,
    ...(['board', 'tracks', 'showdown'].includes(mode) ? { playStyle: 'teams', teamCount: 2 } : { playStyle: 'individual' }) };
  const pages = {};
  const problems = [];
  try {
    const created = await api.request.post(site + '/api/rooms', { data: setup });
    if (created.status() !== 201) throw new Error('setup: ' + await created.text());
    const { code, host } = await created.json();
    const keys = [];
    for (let i = 0; i < Math.max(4, minimumPlayers(mode)); i++) keys.push((await (await api.request.post(`${site}/api/rooms/${code}/join`, { data: { name: names[i] } })).json()).key);
    for (const [name, options] of Object.entries(views)) {
      const context = await browser.newContext({ ...options, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const key = name === 'tv' ? host : name === 'phone' ? keys[0] : keys[1];
      await context.addInitScript(([code, key, host]) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host })), [code, key, name === 'tv']);
      const page = pages[name] = await context.newPage();
      page.on('pageerror', error => problems.push(`${name} error: ${error.message.slice(0, 120)}`));
      page.on('console', message => { if (message.type() === 'error') problems.push(`${name} console: ${message.text().slice(0, 120)}`); });
      page.on('response', response => { if (response.status() >= 400 && !response.url().includes('/api/')) problems.push(`${name} ${response.status()} ${new URL(response.url()).pathname}`); });
      await page.goto(site, { waitUntil: 'domcontentloaded' });
      await page.locator('section.game').waitFor({ timeout: 20000 });
    }
    const state = async key => (await api.request.get(`${site}/api/rooms/${code}`, { headers: { 'x-game-key': key } })).json();
    const seen = [];
    for (let step = 0; step < 16; step++) {
      const s = await state(host);
      if (!seen.includes(s.phase)) {
        seen.push(s.phase);
        for (const [name, page] of Object.entries(pages)) {
          await page.waitForFunction(phase => document.querySelector('section.game')?.dataset.phase === phase, s.phase, { timeout: 15000 }).catch(() => problems.push(`${name} never showed ${s.phase}`));
          await page.waitForTimeout(1200);
          await page.screenshot({ path: `${out}/${mode}-${seen.length}-${s.phase}-${name}.png` });
          const issues = await measure(page, name === 'tv');
          if (issues.length) console.log(JSON.stringify({ mode, phase: s.phase, view: name, issues }));
        }
      }
      if (s.phase === 'finished') break;
      if (s.phase === 'question') for (const [i, key] of keys.entries()) await api.request.post(`${site}/api/rooms/${code}/answer`, { headers: { 'x-game-key': key }, data: { game: s.game, index: s.index, option: mode === 'soclose' ? 100 + i * 40 : i % 2 } });
      await api.request.post(`${site}/api/rooms/${code}/advance`, { headers: { 'x-game-key': host }, data: { phase: s.phase, index: s.index, game: s.game, lobbyVersion: s.lobbyVersion } });
      await pages.tv.waitForTimeout(700);
    }
    console.log(JSON.stringify({ mode, phases: seen, problems: [...new Set(problems)] }));
  } catch (error) { console.log(JSON.stringify({ mode, failed: error.message.split('\n')[0], problems })); }
  for (const page of Object.values(pages)) await page.context().close();
}
await browser.close();
