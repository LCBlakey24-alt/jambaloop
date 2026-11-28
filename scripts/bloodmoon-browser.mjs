// Bloodmoon end to end: six players, a TV and two phones. Plays a night, a
// day and a vote, checks that the TV never renders a living player's role,
// and that each phone only shows its own.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const out = process.env.OUT || 'browser-screenshots/bloodmoon';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await mkdir(out, { recursive: true });
const errors = [];
try {
  const api = await browser.newContext();
  const created = await api.request.post(site + '/api/rooms', { data: { mode: 'bloodmoon', category: 'mixed', count: 1, seconds: 0, playStyle: 'individual' } });
  assert.equal(created.status(), 201, await created.text());
  const { code, host } = await created.json();
  const players = [];
  for (const name of ['Maya', 'Oliver', 'Priya', 'Sam', 'Tess', 'Uma']) {
    const joined = await api.request.post(`${site}/api/rooms/${code}/join`, { data: { name } });
    assert.equal(joined.status(), 201, await joined.text());
    players.push({ name, ...await joined.json() });
  }
  const snap = async key => (await api.request.get(`${site}/api/rooms/${code}`, { headers: { 'x-game-key': key } })).json();
  const advance = async () => {
    const s = await snap(host);
    const response = await api.request.post(`${site}/api/rooms/${code}/advance`, { headers: { 'x-game-key': host }, data: { game: s.game, phase: s.phase, index: s.index, lobbyVersion: s.lobbyVersion } });
    assert.ok(response.ok(), await response.text());
  };
  const act = async (player, data) => {
    const s = await snap(player.key);
    return api.request.post(`${site}/api/rooms/${code}/party`, { headers: { 'x-game-key': player.key }, data: { game: s.game, index: s.index, night: s.party.night, ...data } });
  };
  const open = async (key, isHost, options) => {
    const context = await browser.newContext(options);
    await context.addInitScript(({ code, key, isHost }) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: isHost })), { code, key, isHost });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return page;
  };
  const phase = (page, name) => page.locator(`.game[data-phase="${name}"] .blood-game`).waitFor({ timeout: 15000 });
  const shot = async (page, name) => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${name}.png` }); };
  const secret = /\b(Vampire|Oracle|Warden|Villager)\b/;
  const tvIsNeutral = async label => {
    const text = await tv.locator('.blood-village').innerText();
    assert.ok(!secret.test(text), `${label}: the TV roster names no living role (${text.replace(/\s+/g, ' ').slice(0, 120)})`);
    assert.equal(await tv.locator('.blood-role-card').count(), 0, `${label}: no role card on the TV`);
  };

  const tv = await open(host, true, { viewport: { width: 1280, height: 720 } });
  await tv.locator('.game.host-screen').waitFor({ timeout: 15000 });
  await advance();
  await phase(tv, 'blood-roles');
  for (const player of players) { const own = await snap(player.key); player.role = own.party.you.role; player.id = own.player.id; }
  const vampire = players.find(player => player.role === 'vampire');
  const oracle = players.find(player => player.role === 'oracle');
  const warden = players.find(player => player.role === 'warden');
  const villagers = players.filter(player => player.role === 'villager');
  assert.equal(villagers.length, 3, 'six players: one vampire, Oracle, Warden and three villagers');
  const vampirePhone = await open(vampire.key, false, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const villagerPhone = await open(villagers[0].key, false, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phase(vampirePhone, 'blood-roles');
  await phase(villagerPhone, 'blood-roles');
  await tvIsNeutral('deal');
  // The role card starts closed on every phone, so a glance gives nothing away; the player taps to peek.
  for (const page of [vampirePhone, villagerPhone]) assert.equal(await page.locator('.blood-role-card').evaluate(card => card.open), false, 'the role card starts closed');
  assert.ok(!/Vampire|Villager/.test(await vampirePhone.locator('.blood-game').innerText()), 'a closed card names no role');
  await vampirePhone.locator('.blood-role-card summary').click();
  await villagerPhone.locator('.blood-role-card summary').click();
  assert.match(await vampirePhone.locator('.blood-role-card h2').innerText(), /Vampire/);
  assert.match(await villagerPhone.locator('.blood-role-card h2').innerText(), /Villager/);
  assert.ok(!/Vampire/.test(await villagerPhone.locator('.blood-game').innerText()), 'a villager\'s phone names no vampire');
  await shot(tv, 'tv-1-roles'); await shot(vampirePhone, 'phone-vampire-1-role'); await shot(villagerPhone, 'phone-villager-1-role');
  console.log('PASS: roles are dealt to phones only');

  // Everyone taps ready; night falls on its own.
  await vampirePhone.locator('[data-action="blood-ready"]').click();
  await villagerPhone.locator('[data-action="blood-ready"]').click();
  for (const player of players.filter(p => p !== vampire && p !== villagers[0])) assert.equal((await act(player, { action: 'ready' })).status(), 204);
  await phase(tv, 'blood-night');
  await phase(vampirePhone, 'blood-night');
  await phase(villagerPhone, 'blood-night');
  await tvIsNeutral('night');
  assert.equal(await tv.locator('.blood-village button').count(), 0, 'nothing to tap on the TV');
  assert.equal(await vampirePhone.locator('.blood-seat[data-action="blood-pick"]').count(), 5, 'the vampire can pick any of the five others');
  assert.equal(await villagerPhone.locator('.blood-seat[data-action="blood-pick"]').count(), 5, 'a villager\'s phone looks just as busy');
  // At a glance the two phones look alike: same heading, same closed role card.
  const glance = page => page.evaluate(() => [document.querySelector('.blood-head h1').textContent, getComputedStyle(document.querySelector('.blood-role-card')).borderColor, document.querySelector('.blood-role-card').open]);
  assert.deepEqual(await glance(vampirePhone), await glance(villagerPhone), 'night screens give no role away at a glance');
  const overflow = await vampirePhone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 1, 'no sideways scroll on the phone');
  const tap = await vampirePhone.locator('.blood-seat[data-action="blood-pick"]').first().boundingBox();
  assert.ok(tap.height >= 44 && tap.width >= 44, 'big tap targets');
  await shot(tv, 'tv-2-night'); await shot(vampirePhone, 'phone-vampire-2-night'); await shot(villagerPhone, 'phone-villager-2-night');

  // The vampire bites a villager; the Warden guards someone else.
  const victim = villagers[1];
  await vampirePhone.locator(`.blood-seat[data-id="${victim.id}"]`).click();
  await vampirePhone.locator('.blood-locked').waitFor({ timeout: 5000 });
  await villagerPhone.locator('.blood-seat[data-action="blood-pick"]').first().click();
  assert.equal((await act(oracle, { action: 'night', id: vampire.id })).status(), 204);
  assert.equal((await act(warden, { action: 'night', id: villagers[2].id })).status(), 204);
  assert.equal((await act(villagers[2], { action: 'night', id: vampire.id })).status(), 204);
  assert.equal((await snap(host)).phase, 'blood-night', 'the night waits for everyone');
  assert.equal((await act(victim, { action: 'night', id: vampire.id })).status(), 204);
  await phase(tv, 'blood-dawn');
  assert.match(await tv.locator('.blood-news').innerText(), new RegExp(victim.name + ' was bitten'));
  const oracleView = await snap(oracle.key);
  assert.deepEqual(oracleView.party.you.findings.map(f => [f.name, f.vampire]), [[vampire.name, true]], 'only the Oracle learns the result');
  assert.equal((await snap(host)).party.you, undefined);
  await shot(tv, 'tv-3-dawn');
  console.log('PASS: night resolves, the TV announces the bite, the Oracle\'s finding stays private');

  await advance();
  await phase(tv, 'blood-day');
  await phase(vampirePhone, 'blood-day');
  await tvIsNeutral('day');
  await shot(tv, 'tv-4-day'); await shot(vampirePhone, 'phone-vampire-4-day');
  await advance();
  await phase(tv, 'blood-vote');
  await phase(villagerPhone, 'blood-vote');
  await shot(villagerPhone, 'phone-villager-5-vote');
  await villagerPhone.locator(`.blood-seat[data-id="${vampire.id}"]`).click();
  await villagerPhone.locator('.blood-locked').waitFor({ timeout: 5000 });
  assert.equal(await tv.locator('.blood-tally').count(), 0, 'no tally before the vote closes');
  await shot(tv, 'tv-5-vote');
  for (const player of [oracle, warden, villagers[2]]) assert.equal((await act(player, { action: 'vote', id: vampire.id })).status(), 204);
  assert.equal((await act(victim, { action: 'vote', id: vampire.id })).status(), 403, 'the bitten player has no vote');
  await vampirePhone.locator('[data-action="blood-vote"][data-id="abstain"]').click();
  await phase(tv, 'blood-verdict');
  assert.match(await tv.locator('.blood-news').innerText(), new RegExp(vampire.name + ' is banished'));
  await shot(tv, 'tv-6-verdict');
  await advance();
  await tv.locator('.game[data-phase="finished"] .blood-finished').waitFor({ timeout: 15000 });
  assert.match(await tv.locator('.blood-head h1').innerText(), /village wins/i);
  assert.equal(await tv.locator('.blood-cast li').count(), 6, 'every role is shown at the end');
  await vampirePhone.locator('.blood-finished').waitFor({ timeout: 15000 });
  await shot(tv, 'tv-7-finished'); await shot(vampirePhone, 'phone-vampire-7-finished');
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: vote, verdict and village win');
} finally {
  await browser.close();
}
