// Live phone screens never draw controls on top of each other, and the player's own move and the captain's
// controls are on screen or a scroll of #app away (fix: live layout, 28 November 2026). Captain and ordinary
// player phones at 390x844 and 360x740 for Classic, Board Race, So Close, Way Off, Same Page with eight
// players, Quiz Race, Knockout and Bloodmoon: every visible button and line of text is measured, and any two
// that are not nested and overlap by more than 4px fail. A four-answer question still fits one 390x844 screen,
// and So Close's "Lock in my guess" is on screen without scrolling. SIZES=844x390,360x640 and ONLY=board,... narrow a run.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const site = process.env.SITE || 'http://127.0.0.1:32000';
const out = process.env.OUT || 'browser-screenshots/live-layout';
const only = process.env.ONLY ? process.env.ONLY.split(',') : undefined;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const api = await browser.newContext();
const failures = [];
const errors = [];
const sizes = process.env.SIZES ? process.env.SIZES.split(',').map(s => { const [width, height] = s.split('x').map(Number); return { width, height }; }) : [{ width: 390, height: 844 }, { width: 360, height: 740 }];

async function room(data, names) {
  const created = await api.request.post(site + '/api/rooms', { data });
  if (created.status() !== 201) throw new Error(await created.text());
  const { code, host } = await created.json();
  const players = [];
  for (const name of names) players.push({ name, ...(await (await api.request.post(`${site}/api/rooms/${code}/join`, { data: { name } })).json()) });
  const snap = async key => (await api.request.get(`${site}/api/rooms/${code}`, { headers: { 'x-game-key': key } })).json();
  const advance = async () => { const s = await snap(host); return api.request.post(`${site}/api/rooms/${code}/advance`, { headers: { 'x-game-key': host }, data: { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion } }); };
  const post = (path, key, data) => api.request.post(`${site}/api/rooms/${code}/${path}`, { headers: { 'x-game-key': key }, data });
  // The first player to join is the captain.
  return { code, host, players, snap, advance, post, captain: players[0], other: players[1] };
}

async function phone(r, player, size) {
  const ctx = await browser.newContext({ viewport: size, isMobile: true, hasTouch: true });
  await ctx.addInitScript(({ code, key }) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: false })), { code: r.code, key: player.key });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  return page;
}

// In the page: every visible control or line of text, clipped to its scrolling/clipping ancestors.
const measure = (page, { player, captain }) => page.evaluate(({ player, captain }) => {
  const app = document.querySelector('#app');
  const game = document.querySelector('#app > .game');
  const appBox = app.getBoundingClientRect();
  const sel = 'button, a.button, input:not([type=hidden]), textarea, select, h1, h2, h3, p, label, small, .status, li, .eyebrow, .screen-status, .timer';
  const clipOf = el => {
    let box = el.getBoundingClientRect();
    let r = { l: box.left, t: box.top, r: box.right, b: box.bottom };
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'contents') continue;
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.contain.includes('paint')) {
        const ab = a.getBoundingClientRect();
        r = { l: Math.max(r.l, ab.left), t: Math.max(r.t, ab.top), r: Math.min(r.r, ab.right), b: Math.min(r.b, ab.bottom) };
      }
    }
    return r;
  };
  const shown = el => {
    if (el.closest('[hidden], [aria-hidden="true"], .sr-only, .visually-hidden')) return false;
    const closed = el.closest('details:not([open])');
    if (closed && !el.closest('summary')) return false;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return false;
    }
    const b = el.getBoundingClientRect();
    return b.width > 2 && b.height > 2;
  };
  const items = [...game.querySelectorAll(sel)].filter(shown).map(el => {
    const c = clipOf(el);
    return { el, label: (el.tagName + '.' + [...el.classList].join('.') + ' ' + (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)), c };
  }).filter(i => i.c.r - i.c.l > 2 && i.c.b - i.c.t > 2);
  // The captain's "★ Captain" tag on the top edge of a row must not sit on whatever is above it either.
  const captainSel = '[data-action="advance"],[data-action="clock"],[data-action="estimate-reveal-skip"]';
  for (const el of game.querySelectorAll(captainSel)) {
    if (!shown(el)) continue;
    const pill = getComputedStyle(el, '::before');
    if (pill.content === 'none' || pill.content === 'normal' || pill.position !== 'absolute') continue;
    const b = el.getBoundingClientRect();
    const h = parseFloat(pill.height) || 16, w = parseFloat(pill.width) || 80;
    const top = b.top - h * 0.55;
    items.push({ el, pill: true, label: 'PILL ★ Captain on ' + (el.innerText || '').trim().slice(0, 20), c: { l: b.left + 12, r: b.left + 12 + w, t: top, b: top + h } });
  }
  // A button's own text sits inside it, and a label wraps its input: nested pairs never count.
  const overlaps = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.c.r, b.c.r) - Math.max(a.c.l, b.c.l);
    const h = Math.min(a.c.b, b.c.b) - Math.max(a.c.t, b.c.t);
    if (w > 4 && h > 4) overlaps.push(a.label + '  X  ' + b.label + ` (${Math.round(w)}x${Math.round(h)})`);
  }
  const reach = selector => {
    if (!selector) return undefined;
    const el = [...game.querySelectorAll(selector)].find(shown);
    if (!el) return { missing: selector };
    const before = app.scrollTop;
    const box = el.getBoundingClientRect();
    const onScreen = box.top >= Math.max(0, appBox.top) - 1 && box.bottom <= Math.min(innerHeight, appBox.bottom) + 1;
    el.scrollIntoView({ block: 'nearest' });
    const after = el.getBoundingClientRect();
    const x = (after.left + after.right) / 2, y = (after.top + after.bottom) / 2;
    const hit = document.elementFromPoint(x, y);
    const clickable = Boolean(hit && (el === hit || el.contains(hit)));
    const c = clipOf(el);
    const clipped = (c.b - c.t) < after.height - 2 || (c.r - c.l) < after.width - 2;
    const result = { text: (el.innerText || el.value || '').trim().slice(0, 30), onScreen, clickable, clipped, hit: hit && !clickable ? hit.tagName + '.' + hit.className + ' ' + (hit.innerText || '').slice(0, 30) : undefined, top: Math.round(box.top), bottom: Math.round(box.bottom), appBottom: Math.round(appBox.bottom) };
    app.scrollTop = before;
    return result;
  };
  return { pills: items.filter(i => i.pill).length, phase: game?.dataset.phase, mode: game?.dataset.mode, scroll: app.scrollHeight - app.clientHeight, overlaps, player: reach(player), captain: reach(captain) };
}, { player, captain });

async function check(label, pages, controls, { fit } = {}) {
  for (const [who, page, size] of pages) {
    await page.waitForTimeout(900);
    const m = await measure(page, { player: controls.player, captain: who === 'captain' ? controls.captain : undefined });
    const name = `${label} ${who} ${size.width}x${size.height}`;
    await page.screenshot({ path: `${out}/${label.replace(/\W+/g, '-')}-${who}-${size.width}x${size.height}.png` });
    const problems = [];
    if (m.overlaps.length) problems.push('overlaps: ' + m.overlaps.join(' | '));
    for (const k of ['player', 'captain']) {
      const c = m[k];
      if (!c) continue;
      if (c.missing) problems.push(`${k} control missing (${c.missing})`);
      else if (!c.clickable || c.clipped) problems.push(`${k} control not reachable: ${JSON.stringify(c)}`);
      else if (fit?.includes(k) && size.width === 390 && !c.onScreen) problems.push(`${k} control below the fold at 390x844: ${JSON.stringify(c)}`);
    }
    if (fit?.includes('screen') && size.width === 390 && m.scroll > 1) problems.push(`does not fit one screen at 390x844 (scrolls ${m.scroll}px)`);
    console.log((problems.length ? 'FAIL ' : 'ok   ') + name + ` [phase ${m.phase}, scroll ${m.scroll}, pills ${m.pills}]` + (problems.length ? '\n     ' + problems.join('\n     ') : ''));
    if (problems.length) failures.push(name);
  }
}

async function openAll(r) {
  const pages = [];
  for (const size of sizes) {
    pages.push(['captain', await phone(r, r.captain, size), size]);
    pages.push(['player', await phone(r, r.other, size), size]);
  }
  return pages;
}
const waitPhase = (pages, phase) => Promise.all(pages.map(([, p]) => p.locator(`#app > .game[data-phase="${phase}"]`).waitFor({ timeout: 20000 })));
const close = async pages => { for (const [, p] of pages) await p.context().close(); };

const scenarios = {
  async classic() {
    const r = await room({ mode: 'classic', category: 'mixed', count: 5, seconds: 30, format: 'choice' }, ['Ada', 'Bo', 'Cy']);
    const pages = await openAll(r);
    await r.advance();
    await waitPhase(pages, 'question');
    { const s = await r.snap(r.host); await r.post('pause', r.host, { game: s.game, index: s.index, phase: s.phase, paused: true, clockVersion: s.clockVersion }); }
    await Promise.all(pages.map(([, p]) => p.locator('.round-break').waitFor({ timeout: 15000 })));
    await check('classic paused', pages, { captain: '[data-action="clock"]' });
    { const s = await r.snap(r.host); await r.post('pause', r.host, { game: s.game, index: s.index, phase: s.phase, paused: false, clockVersion: s.clockVersion }); }
    await Promise.all(pages.map(([, p]) => p.locator('.question-panel .answer').first().waitFor({ timeout: 15000 })));
    await check('classic question', pages, { player: '.answer[data-action="answer"]:last-of-type', captain: '[data-action="advance"]' }, { fit: ['player', 'captain', 'screen'] });
    await pages[1][1].locator('.answer[data-action="answer"]').first().click();
    await check('classic locked', pages.slice(1, 2), { player: '.answer' });
    await r.advance();
    await waitPhase(pages, 'reveal');
    await check('classic reveal', pages, { captain: '[data-action="advance"]' }, { fit: ['captain'] });
    await close(pages);
  },
  async board() {
    const r = await room({ mode: 'board', category: 'mixed', count: 12, seconds: 30, format: 'choice', playStyle: 'individual' }, ['Ada', 'Bo', 'Cy']);
    const pages = await openAll(r);
    await r.advance();
    await waitPhase(pages, 'ready');
    await check('board ready', pages, { captain: '[data-action="roll"], [data-action="advance"]' });
    let s = await r.snap(r.host);
    await r.post('roll', r.host, { game: s.game, index: s.index });
    await waitPhase(pages, 'question');
    await check('board question', pages, { player: '.answer[data-action="answer"]', captain: '[data-action="advance"]' });
    await r.advance();
    await waitPhase(pages, 'reveal');
    await check('board reveal', pages, { captain: '[data-action="advance"]' });
    await close(pages);
  },
  async soclose() { await estimate('soclose'); },
  async wayoff() { await estimate('wayoff'); },
  async samepage() {
    const names = ['Ada', 'Bo', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'];
    const r = await room({ mode: 'samepage', category: 'mixed', format: 'choice', count: 3, seconds: 0 }, names);
    const pages = await openAll(r);
    await r.advance();
    await waitPhase(pages, 'party-write');
    await check('samepage write', pages, { player: '.samepage-answer-form button[type="submit"], .samepage-answer-form button', captain: '[data-action="advance"]' });
    const words = process.env.WORDS ? process.env.WORDS.split(',') : ['Pizza', 'pizza', 'Chips', 'Curry', 'Toast', 'Soup', 'Salad', 'Pasta'];
    for (const [i, p] of r.players.entries()) { const s = await r.snap(p.key); await r.post('party', p.key, { game: s.game, index: s.index, action: 'write', text: words[i] }); }
    await waitPhase(pages, 'party-reveal');
    await check('samepage reveal', pages, { captain: '[data-action="advance"]' });
    await close(pages);
  },
  async quizrace() {
    const r = await room({ mode: 'quizrace', category: 'mixed', count: 5, seconds: 0, format: 'choice', raceLength: 'short' }, ['Ada', 'Bo', 'Cy']);
    const pages = await openAll(r);
    await r.advance();
    await Promise.all(pages.map(([, p]) => p.locator('.race-answer, .answer[data-action], [data-action="race-answer"]').first().waitFor({ timeout: 25000 })));
    await check('quizrace race', pages, { player: '.race-answer, [data-action="race-answer"], .answer[data-action]', captain: '[data-action="clock"]' });
    await close(pages);
  },
  async knockout() {
    const r = await room({ mode: 'knockout', category: 'mixed', format: 'choice', count: 5, seconds: 30 }, ['Ada', 'Bo', 'Cy']);
    const pages = await openAll(r);
    await r.advance();
    await waitPhase(pages, 'question');
    await check('knockout question', pages, { player: '.answer[data-action="answer"]', captain: '[data-action="advance"]' }, { fit: ['player', 'captain'] });
    await r.advance();
    await waitPhase(pages, 'reveal');
    await check('knockout reveal', pages, { captain: '[data-action="advance"]' });
    await close(pages);
  },
  async bloodmoon() {
    const r = await room({ mode: 'bloodmoon', category: 'mixed', count: 1, seconds: 0, playStyle: 'individual' }, ['Maya', 'Oliver', 'Priya', 'Sam', 'Tess', 'Uma']);
    const pages = await openAll(r);
    await r.advance();
    await waitPhase(pages, 'blood-roles');
    await check('bloodmoon roles', pages, { player: '[data-action="blood-ready"]', captain: '[data-action="advance"]' });
    for (const p of r.players) { const s = await r.snap(p.key); await r.post('party', p.key, { game: s.game, index: s.index, night: s.party.night, action: 'ready' }); }
    await waitPhase(pages, 'blood-night');
    await check('bloodmoon night', pages, { captain: '[data-action="advance"]' });
    await close(pages);
  },
};

async function estimate(mode) {
  const r = await room({ mode, category: 'mixed', format: 'estimate', count: 5, seconds: 30 }, ['Ada', 'Bo', 'Cy', 'Dee']);
  const pages = await openAll(r);
  await r.advance();
  await waitPhase(pages, 'question');
  await Promise.all(pages.map(([, p]) => p.locator('.so-close-editor').waitFor({ timeout: 15000 })));
  await check(mode + ' question', pages, { player: '[data-action="submit-special"]', captain: '[data-action="advance"]' }, { fit: ['player'] });
  for (const [i, p] of r.players.entries()) { const own = await r.snap(p.key); await r.post('answer', p.key, { game: own.game, index: own.index, option: 100 + i * 40 }); }
  { const s = await r.snap(r.host); if (s.phase === 'question') await r.advance(); }
  await Promise.all(pages.map(([, p]) => p.locator('.so-close-broadcast').waitFor({ timeout: 20000 })));
  await pages[0][1].waitForTimeout(2500);
  await check(mode + ' reveal', pages, { captain: '[data-action="estimate-reveal-skip"], [data-action="advance"]' });
  await close(pages);
}

for (const [name, run] of Object.entries(scenarios)) {
  if (only && !only.includes(name)) continue;
  try { await run(); } catch (error) { failures.push(name + ' crashed'); console.log('CRASH ' + name + ': ' + error.message); }
}
await browser.close();
if (errors.length) { console.log('page errors:', [...new Set(errors)]); failures.push('page errors'); }
if (failures.length) { console.log(`FAIL: ${failures.length} live phone screens: ${failures.join(', ')}`); process.exitCode = 1; }
else console.log('PASS: no live phone screen draws a control on top of another; every main control is on screen or a scroll away');
