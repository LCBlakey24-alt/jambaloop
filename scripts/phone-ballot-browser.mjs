// Voting on a phone with eight players: every entry is one compact row, so all seven choices are on one
// 390x844 screen in Punchline Party, and Spot the Bluff needs at most a short scroll.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];
const names = ['Ada', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal'];
const lines = ['A sofa that sings opera at 3am', 'Dancing teaspoons', 'The cat files a complaint', 'Grandma’s secret karaoke past, finally revealed on live television', 'Soup', 'A very polite volcano', 'Socks that unionise', 'The fridge light stays on out of spite'];
try {
  const api = await browser.newContext();
  for (const mode of ['punchline', 'bluff']) {
    const { code, host } = await (await api.request.post(site + '/api/rooms', { data: { mode, category: 'mixed', count: 3, seconds: 0, playStyle: 'individual' } })).json();
    const keys = [];
    for (const name of names) keys.push((await (await api.request.post(site + '/api/rooms/' + code + '/join', { data: { name } })).json()).key);
    const snap = async key => (await api.request.get(site + '/api/rooms/' + code, { headers: { 'x-game-key': key } })).json();
    const waitFor = async phase => { for (let t = 0; t < 50; t++) { if ((await snap(host)).phase === phase) return; await new Promise(r => setTimeout(r, 200)); } throw new Error('never reached ' + phase); };
    let s = await snap(host);
    await api.request.post(site + '/api/rooms/' + code + '/advance', { headers: { 'x-game-key': host }, data: { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion } });
    await waitFor('party-write');
    for (let i = 0; i < keys.length; i++) await api.request.post(site + '/api/rooms/' + code + '/party', { headers: { 'x-game-key': keys[i] }, data: { game: 1, index: 0, action: 'write', text: lines[i] } });
    s = await snap(host);
    if (s.phase === 'party-write') await api.request.post(site + '/api/rooms/' + code + '/advance', { headers: { 'x-game-key': host }, data: { game: s.game, phase: s.phase, index: s.index } });
    await waitFor('party-vote');
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await phone.addInitScript(({ code, key }) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: false })), { code, key: keys[1] });
    const page = await phone.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(site, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-action="bluff-vote"]').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    const ballot = await page.evaluate(() => {
      const app = document.querySelector('#app'); const box = app.getBoundingClientRect();
      const buttons = [...document.querySelectorAll('[data-action="bluff-vote"]')];
      return { choices: buttons.length, below: buttons.filter(b => b.getBoundingClientRect().bottom > box.bottom + 1).length,
        heights: [...document.querySelectorAll('.party-vote-card')].map(card => Math.round(card.getBoundingClientRect().height)).sort((x, y) => x - y),
        labels: [...new Set(buttons.map(b => b.textContent.trim()))], named: buttons.every(b => /^Vote for /.test(b.getAttribute('aria-label'))) };
    });
    assert.equal(ballot.choices, 7, `${mode}: seven choices (never your own entry)`);
    assert.deepEqual(ballot.labels, ['Vote'], `${mode}: short Vote buttons`);
    assert.equal(ballot.named, true, `${mode}: screen readers hear who or which entry`);
    // Before: every card was 120-142px. Now a one-line entry is a single short row; even a long one stays compact.
    assert.ok(ballot.heights[0] <= 70, `${mode}: a short entry is one compact row: ${JSON.stringify(ballot)}`);
    assert.ok(ballot.heights.at(-1) <= 110, `${mode}: even the longest entry stays compact: ${JSON.stringify(ballot)}`);
    if (mode === 'punchline') assert.equal(ballot.below, 0, `every Punchline choice is on one screen: ${JSON.stringify(ballot)}`);
    else assert.ok(ballot.below <= 2, `Spot the Bluff needs at most a short scroll: ${JSON.stringify(ballot)}`);
    await page.locator('[data-action="bluff-vote"]').last().click();
    await page.locator('.party-vote-confirmation').waitFor({ timeout: 10000 });
    console.log(`PASS: ${mode} voting with eight players fits a phone (${ballot.below} below the fold), and a vote locks in`);
    await phone.close();
  }
  assert.deepEqual(errors, [], 'no page errors');
} finally { await browser.close(); }
