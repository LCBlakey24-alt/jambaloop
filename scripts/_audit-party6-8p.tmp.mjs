// Phone-layout audit (read-only): punchline, cards, bluff, samepage, rare, topanswers.
// usage: OUT=dir node scripts/_audit-party6.tmp.mjs <mode> <width> <height>
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { rareFindBank } from '../rare-find-bank.js';

const site = process.env.SITE || 'http://127.0.0.1:4613';
const OUT = process.env.OUT;
const [mode, W, H] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
const tag = `${mode}-${W}x${H}-8p`;
await mkdir(OUT + '/shots', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const api = await browser.newContext();
const errors = [];
const results = [];
const post = async (path, key, data) => {
  const r = await api.request.post(site + '/api/rooms' + path, { headers: key ? { 'x-game-key': key } : {}, data });
  const text = r.status() === 204 ? '' : await r.text();
  if (r.status() >= 400) errors.push(`POST ${path} ${r.status()} ${text.slice(0, 120)}`);
  return { status: r.status(), text };
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const created = JSON.parse((await post('', null, { mode, category: 'mixed', format: 'choice', count: 3, seconds: 20, playStyle: 'individual' })).text);
const { code, host } = created;
const get = async key => (await api.request.get(`${site}/api/rooms/${code}`, { headers: { 'x-game-key': key } })).json();
const names = ['Maya', 'Oliver', 'Priya', 'Sam', 'Tess', 'Uma', 'Victor', 'Wren'];
const keys = [];
for (const name of names) keys.push(JSON.parse((await post(`/${code}/join`, null, { name })).text).key);

async function phone(key, viewport) {
  const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript(([code, key]) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: false })), [code, key]);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 160)));
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  await page.locator('section.game').waitFor({ timeout: 20000 });
  return page;
}
const pages = { captain: await phone(keys[0], { width: W, height: H }), player: await phone(keys[1], { width: W, height: H }) };
const extras = [await phone(keys[2], { width: 360, height: 640 }), await phone(keys[3], { width: 360, height: 640 })];
const capInfo = await get(keys[0]);
if (!capInfo.isCaptain) errors.push('keys[0] is not captain');

// ---- in-page helpers ----
const SNAP = () => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[data-deck-hidden]'); };
  const dialog = document.querySelector('#dialog');
  const dOpen = Boolean(dialog?.open);
  const scope = dOpen ? document.querySelector('#dialog-content') : document.querySelector('#app');
  const pager = dOpen ? dialog.querySelector('.mobile-pager') : document.querySelector('body > .mobile-pager');
  const label = el => (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 80);
  const desc = el => {
    const a = el.dataset.action ? `[data-action="${el.dataset.action}"]` : '';
    const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + c + a + (el.name ? `[name=${el.name}]` : '');
  };
  const app = document.querySelector('#app');
  const controls = [...scope.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary')].filter(vis).map(el => {
    const r = el.getBoundingClientRect();
    return { sel: desc(el), text: label(el), top: Math.round(r.top), h: Math.round(r.height), inView: r.bottom <= innerHeight + 1 && r.top >= -1 };
  });
  const scrollers = [...scope.querySelectorAll('*')].filter(el => { const s = getComputedStyle(el); return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0 && vis(el); }).map(el => ({ sel: desc(el), client: el.clientHeight, scroll: el.scrollHeight }));
  const header = document.querySelector('body > .header');
  const headerVis = header && getComputedStyle(header).display !== 'none' ? Math.round(header.getBoundingClientRect().height) : 0;
  const headerButtons = header ? [...header.querySelectorAll('button, a')].filter(vis).map(el => label(el)) : [];
  return {
    phase: document.querySelector('section.game')?.dataset.phase,
    dialog: dOpen ? document.querySelector('#dialog-title')?.textContent?.trim() : null,
    deck: document.documentElement.classList.contains('mobile-deck'),
    pagerVisible: Boolean(pager && !pager.hidden),
    pagerText: pager && !pager.hidden ? pager.querySelector('output')?.textContent : null,
    viewport: innerHeight,
    headerHeight: headerVis, headerButtons,
    appClient: app.clientHeight, appScroll: app.scrollHeight, appOverflowY: getComputedStyle(app).overflowY,
    text: scope.innerText.replace(/\n{2,}/g, '\n').trim().slice(0, 2500),
    controls, scrollers,
  };
};
const UNPAGE = async () => {
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const dialog = document.querySelector('#dialog');
  const dOpen = Boolean(dialog?.open);
  const hiddenCount = document.querySelectorAll('[data-deck-hidden]').length;
  document.querySelectorAll('[data-deck-hidden]').forEach(e => e.removeAttribute('data-deck-hidden'));
  await raf();
  const app = document.querySelector('#app');
  const dc = document.querySelector('#dialog-content');
  const res = {
    hiddenCount,
    compactAppScroll: app.scrollHeight, compactAppClient: app.clientHeight,
    compactDialogScroll: dOpen ? dc.scrollHeight : null, compactDialogClient: dOpen ? dc.clientHeight : null,
  };
  document.documentElement.classList.remove('mobile-deck');
  await raf();
  res.docScrollHeight = document.scrollingElement.scrollHeight;
  res.dialogInnerScroll = dOpen ? dialog.querySelector('.dialog-inner')?.scrollHeight : null;
  return res;
};
const RESTORE = () => { document.documentElement.classList.add('mobile-deck'); window.dispatchEvent(new Event('resize')); };

async function captureOne(role, page, name, { fullShot = true } = {}) {
  await page.waitForTimeout(250);
  const first = await page.evaluate(SNAP);
  const base = `${OUT}/shots/${tag}-${name}-${role}`;
  await page.screenshot({ path: `${base}-p1.png` });
  const shots = [first];
  if (first.pagerVisible && first.pagerText) {
    const total = Number(first.pagerText.split('/')[1]);
    const scope = first.dialog ? '#dialog .mobile-pager' : 'body > .mobile-pager';
    for (let i = 1; i < total; i++) {
      await page.locator(`${scope} [data-deck-next]`).click();
      await page.waitForTimeout(200);
      shots.push(await page.evaluate(SNAP));
      await page.screenshot({ path: `${base}-p${i + 1}.png` });
    }
    for (let i = 1; i < total; i++) { await page.locator(`${scope} [data-deck-prev]`).click(); await page.waitForTimeout(60); }
  }
  const unpaged = await page.evaluate(UNPAGE);
  if (fullShot && !first.dialog) await page.screenshot({ path: `${base}-unpaged.png`, fullPage: true });
  await page.evaluate(RESTORE);
  await page.waitForTimeout(250);
  results.push({ mode, size: `${W}x${H}`, role, screen: name, pages: shots, unpaged });
}
async function capture(name, opts = {}, which = ['captain', 'player']) {
  await sleep(opts.delay ?? 1100);
  await Promise.all(which.map(role => captureOne(role, pages[role], name, opts)));
}
async function waitPhase(phase, list = Object.values(pages)) {
  await Promise.all(list.map(p => p.waitForFunction(ph => document.querySelector('section.game')?.dataset.phase === ph, phase, { timeout: 15000 }).catch(() => errors.push('never showed ' + phase))));
}
const hostState = () => get(host);
async function advance() {
  const s = await hostState();
  return post(`/${code}/advance`, host, { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion });
}
async function party(key, data) { const s = await get(key); return post(`/${code}/party`, key, { game: s.game, index: s.index, ...data }); }
async function ensurePhaseAfter(old) {
  for (let i = 0; i < 20; i++) { const s = await hostState(); if (s.phase !== old) return s.phase; await sleep(150); }
  await advance();
  return (await hostState()).phase;
}

// ---- LOBBY ----
await waitPhase('lobby');
await capture('lobby');
// ---- START ----
await advance();
const allKeys = keys;
const others = keys.slice(2);
const everyone = keys;
let bluffer;

async function roundFlow(round, detailed) {
  const s = await hostState();
  const cap = detailed ? capture : async () => {};
  if (['punchline', 'cards'].includes(mode)) {
    await waitPhase('party-write');
    await cap('write-open');
    const submit = async k => mode === 'cards' ? party(k, { action: 'card', option: 0, handVersion: 0 }) : party(k, { action: 'write', text: 'A reply from ' + k.slice(0, 4) });
    if (round === 2 && !detailed) { /* final round note */ }
    await submit(keys[0]); await submit(keys[1]);
    await cap('write-locked');
    for (const k of others) await submit(k);
    await ensurePhaseAfter('party-write');
    await waitPhase('party-vote');
    await cap('vote-open');
    const vote = async k => { const st = await get(k); const pick = st.party.ballot.find(e => !e.yours); return party(k, { action: 'vote', id: pick.id }); };
    await vote(keys[0]); await vote(keys[1]);
    await cap('vote-locked');
    for (const k of others) await vote(k);
    await ensurePhaseAfter('party-vote');
    await waitPhase('party-reveal');
    await cap('reveal');
    await advance();
  } else if (mode === 'bluff') {
    await waitPhase('party-write');
    const priv = await Promise.all(keys.map(k => get(k)));
    const liar = priv.findIndex(p => p.party.bluffing);
    bluffer = liar;
    if (detailed) {
      await cap('write-open');
      if (false) {
        const lp = extras[liar - 2];
        await lp.setViewportSize({ width: W, height: H });
        pages.bluffer = lp;
        await capture('write-open', {}, ['bluffer']);
        delete pages.bluffer;
      }
    }
    for (const k of [keys[0], keys[1]]) await party(k, { action: 'write', text: 'Something sensible ' + k.slice(0, 3) });
    await cap('write-locked');
    for (const k of others) await party(k, { action: 'write', text: 'Another answer ' + k.slice(0, 3) });
    await ensurePhaseAfter('party-write');
    await waitPhase('party-vote');
    await cap('vote-open');
    const ids = priv.map(p => p.player.id);
    const vote = async (k, i) => party(k, { action: 'vote', id: ids[(i + 1) % ids.length] });
    await vote(keys[0], 0); await vote(keys[1], 1);
    await cap('vote-locked');
    for (let i = 2; i < keys.length; i++) await vote(keys[i], i);
    await ensurePhaseAfter('party-vote');
    await waitPhase('party-reveal');
    if (detailed) await capture('reveal-count', { delay: 400, fullShot: false });
    await Promise.all(Object.values(pages).map(p => p.locator('.bluff-show-unmask').waitFor({ timeout: 12000 }).catch(() => errors.push('no unmask'))));
    await cap('reveal-unmask');
    await advance();
  } else if (mode === 'samepage') {
    await waitPhase('party-write');
    await cap('write-open');
    await party(keys[0], { action: 'write', text: 'Pizza' }); await party(keys[1], { action: 'write', text: 'pizza' });
    await cap('write-locked');
    for (const [i,k] of others.entries()) await party(k, { action: 'write', text: ['Water','Toast','Pizza','Chips','Tea','Cake'][i] });
    await ensurePhaseAfter('party-write');
    await waitPhase('party-reveal');
    await cap('reveal');
    await advance();
  } else if (mode === 'rare') {
    await waitPhase('rare-write');
    const st = await hostState();
    const prompt = rareFindBank.find(p => p.prompt === st.party.prompt);
    const a = prompt?.answers ?? ['x', 'y'];
    await cap('write-open');
    await party(keys[0], { action: 'write', text: a[0] });
    await party(keys[1], { action: 'write', text: detailed ? 'Zorblax Fictional' : a[1] ?? a[0] });
    await cap('write-locked');
    for (const [i,k] of others.entries()) await party(k, { action: 'write', text: a[(i+1) % a.length] });
    for (let i = 0; i < 20; i++) { if ((await hostState()).phase !== 'rare-write') break; await sleep(150); }
    let ph = (await hostState()).phase;
    if (ph === 'rare-write') { await advance(); ph = (await hostState()).phase; }
    if (ph === 'rare-review') {
      await waitPhase('rare-review');
      await cap('review');
      const hs = await hostState();
      for (const row of hs.party.reviews ?? []) await post(`/${code}/party`, host, { game: hs.game, index: hs.index, action: 'review', token: row.token, decision: 'reject' });
      await sleep(300);
      await advance();
    }
    await waitPhase('rare-reveal');
    await cap('reveal');
    await advance();
  } else if (mode === 'topanswers') {
    await waitPhase('top-poll');
    await cap('poll-open');
    await party(keys[0], { action: 'poll', option: 0 }); await party(keys[1], { action: 'poll', option: 1 });
    await cap('poll-locked');
    for (const [i,k] of others.entries()) await party(k, { action: 'poll', option: i % 4 });
    await ensurePhaseAfter('top-poll');
    await waitPhase('top-guess');
    await cap('guess-open');
    await party(keys[0], { action: 'guess', option: 0 }); await party(keys[1], { action: 'guess', option: 1 });
    await cap('guess-locked');
    for (const [i,k] of others.entries()) await party(k, { action: 'guess', option: i % 4 });
    await ensurePhaseAfter('top-guess');
    await waitPhase('top-reveal');
    await cap('reveal');
    await advance();
  }
}
for (let round = 0; round < 3; round++) await roundFlow(round, round === 0);
await waitPhase('finished');
await capture('finished', { delay: 2500 });
// player-only details toggle for social finish
const hasDetails = await pages.player.evaluate(() => Boolean(document.querySelector('.party-phone-scores')));
if (hasDetails) {
  await pages.player.evaluate(() => { document.querySelector('.party-phone-scores').open = true; });
  await capture('finished-scores-open', { delay: 400 }, ['player']);
}
await writeFile(`${OUT}/${tag}.json`, JSON.stringify({ mode, size: `${W}x${H}`, code, bluffer, errors, results }, null, 1));
console.log(JSON.stringify({ tag, screens: results.length, errors }));
await browser.close();
