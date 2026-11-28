// Bloodmoon: a glance at a neighbour's phone gives no role away. Eight players (two vampires); four
// phones at 390x844 (a vampire, the Oracle, the Warden and a villager) are compared at the deal, at
// night before and after tapping, at dawn, by day and in the vote: same heading, line, text, buttons,
// highlights and role card, with the card closed. Also checks that a peeked card stays open while
// others tap, that a vampire can change their mind from inside the card, and that the Warden can guard
// themselves from it.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const out = process.env.OUT || 'browser-screenshots/bloodmoon-glance';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await mkdir(out, { recursive: true });
const errors = [];
const phoneSize = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
try {
  const api = await browser.newContext();
  const created = await api.request.post(site + '/api/rooms', { data: { mode: 'bloodmoon', category: 'mixed', count: 1, seconds: 0, playStyle: 'individual' } });
  assert.equal(created.status(), 201, await created.text());
  const { code, host } = await created.json();
  // Names of one length, so no name wraps differently on one phone.
  const names = ['Abby', 'Bram', 'Cleo', 'Dean', 'Evie', 'Finn', 'Gwen', 'Hugo'];
  const players = [];
  for (const name of names) {
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
  const open = async key => {
    const context = await browser.newContext(phoneSize);
    await context.addInitScript(({ code, key }) => sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: false })), { code, key });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return page;
  };
  const phase = (page, name) => page.locator(`.game[data-phase="${name}"] .blood-game`).waitFor({ timeout: 15000 });

  await advance();
  for (const player of players) { const own = await snap(player.key); player.role = own.party.you.role; player.id = own.player.id; }
  const pick = role => players.find(player => player.role === role);
  const vampire = pick('vampire');
  const partner = players.find(player => player.role === 'vampire' && player !== vampire);
  const oracle = pick('oracle');
  const warden = pick('warden');
  const villager = pick('villager');
  const others = players.filter(player => player.role === 'villager' && player !== villager);
  const watched = [vampire, oracle, warden, villager];
  const phones = [];
  for (const player of watched) phones.push({ player, page: await open(player.key) });

  /** What a neighbour sees: the open screen with names made alike, the timer and the captain's button left out. */
  const signature = page => page.evaluate(names => {
    const game = document.querySelector('.blood-game');
    const card = game.querySelector('.blood-role-card');
    const captain = [...game.querySelectorAll('.blood-actions')].map(node => node.innerText.trim());
    // Names, and the initials on avatars, are the only thing allowed to differ.
    const alike = text => names.reduce((value, name) => value.split(name).join('NAME'), text).replace(/^[A-Z]$/gm, 'INITIAL');
    // What is painted: content inside a closed role card is skipped, even though it still has a layout box.
    const shown = node => node.checkVisibility({ visibilityProperty: true }) && node.getBoundingClientRect().width > 0;
    const buttons = [...game.querySelectorAll('button')].filter(node => shown(node) && !node.closest('.blood-actions'));
    return {
      heading: game.querySelector('.blood-head h1')?.textContent,
      line: game.querySelector('.blood-head p')?.textContent ?? '',
      text: alike(game.innerText).split('\n').map(line => line.trim())
        .filter(line => line && !captain.includes(line) && !/^(TIME LEFT|\d+(:\d\d)?s?)$/.test(line)).sort(),
      buttons: buttons.map(node => alike(node.innerText.trim())).sort(),
      chosen: game.querySelectorAll('[data-chosen]').length,
      tags: game.querySelectorAll('.blood-tag').length,
      card: card && { open: card.open, height: Math.round(card.getBoundingClientRect().height), border: getComputedStyle(card).borderColor, background: getComputedStyle(card).backgroundColor },
      seatHeight: Math.round(game.querySelector('.blood-seats')?.getBoundingClientRect().height ?? 0),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  }, names);
  const compare = async label => {
    await phones[0].page.waitForTimeout(700);
    const seen = [];
    for (const { player, page } of phones) seen.push({ role: player.role, view: await signature(page) });
    for (const { role, view } of seen) {
      assert.ok(view.overflow <= 1, `${label}: no sideways scroll on the ${role} phone`);
      if (view.card) assert.equal(view.card.open, false, `${label}: the ${role} card is closed`);
    }
    for (const { role, view } of seen.slice(1)) assert.deepEqual(view, seen[0].view, `${label}: the ${role} phone looks like the ${seen[0].role} phone`);
    console.log(`PASS: ${label}: vampire, Oracle, Warden and villager phones look alike (${seen[0].view.buttons.length} to tap, card closed)`);
  };
  const shots = async label => { for (const { player, page } of phones) await page.screenshot({ path: `${out}/${label}-${player.role}.png` }); };

  // The deal.
  for (const { page } of phones) await phase(page, 'blood-roles');
  await compare('deal');
  await shots('1-deal');
  for (const player of players) assert.equal((await act(player, { action: 'ready' })).status(), 204);

  // Night, before anyone taps.
  for (const { page } of phones) await phase(page, 'blood-night');
  await compare('night, before tapping');
  await shots('2-night');
  // A smaller phone too.
  for (const { page } of phones) await page.setViewportSize({ width: 360, height: 740 });
  await compare('night at 360x740');
  for (const { page } of phones) await page.setViewportSize(phoneSize.viewport);

  // The vampire peeks at the card; it stays open while the others tap and the screen redraws.
  const vampirePhone = phones[0].page;
  await vampirePhone.locator('.blood-role-card summary').click();
  assert.match(await vampirePhone.locator('.blood-role-card').innerText(), new RegExp(`Your fellow vampire: ${partner.name}`));
  assert.equal((await act(partner, { action: 'night', id: others[0].id })).status(), 204);
  await vampirePhone.locator('.blood-partner-picks', { hasText: `wants to bite ${others[0].name}` }).waitFor({ timeout: 5000 });
  assert.equal(await vampirePhone.locator('.blood-role-card').evaluate(card => card.open), true, 'a peeked card stays open when the screen redraws');
  await vampirePhone.screenshot({ path: `${out}/3-night-vampire-card-open.png` });
  await vampirePhone.locator('.blood-role-card summary').click();

  // Everyone taps a seat on the open list; the Warden guards themselves from inside the card.
  await vampirePhone.locator(`.blood-seat[data-id="${others[1].id}"]`).click();
  for (const { page, player } of phones.slice(1)) {
    if (player === warden) {
      await page.locator('.blood-role-card summary').click();
      await page.screenshot({ path: `${out}/3-night-warden-card-open.png` });
      await page.locator('.blood-role-card [data-action="blood-pick"]', { hasText: 'Guard yourself' }).click();
      await page.locator('.blood-locked').waitFor({ timeout: 5000 });
      await page.locator('.blood-role-card', { hasText: 'You are guarding yourself' }).waitFor({ timeout: 5000 });
      await page.locator('.blood-role-card summary').click();
    } else await page.locator(`.blood-seat[data-id="${(player === oracle ? vampire : partner).id}"]`).click();
  }
  for (const player of others) assert.equal((await act(player, { action: 'night', id: vampire.id })).status(), 204);
  for (const { page } of phones) await page.locator('.blood-locked').waitFor({ timeout: 5000 });
  assert.equal((await snap(host)).phase, 'blood-night', 'the vampires disagree, so the night stays open');
  await compare('night, after tapping');
  await shots('4-night-locked');

  // The vampire changes their mind from inside the card, to agree with their partner; the night ends.
  await vampirePhone.locator('.blood-role-card summary').click();
  await vampirePhone.locator('.blood-repick').scrollIntoViewIfNeeded();
  await vampirePhone.screenshot({ path: `${out}/4-night-vampire-change-mind.png` });
  await vampirePhone.locator('.blood-repick [data-action="blood-pick"]', { hasText: `Bite ${others[0].name}` }).click();
  for (const { page } of phones) await phase(page, 'blood-dawn');
  const dawn = await snap(host);
  assert.equal(dawn.party.dawn.victim?.id, others[0].id, 'the changed pick counted');
  await compare('dawn');
  await phones[1].page.locator('.blood-role-card summary').click();
  await phones[1].page.waitForTimeout(600);
  assert.match(await phones[1].page.locator('.blood-findings li[data-new]').innerText(), new RegExp(`${vampire.name}.*VAMPIRE`), 'the Oracle\'s vision is in the card');
  await phones[1].page.screenshot({ path: `${out}/5-dawn-oracle-card-open.png` });

  await advance();
  for (const { page } of phones) await phase(page, 'blood-day');
  await compare('day');
  await shots('6-day');

  await advance();
  for (const { page } of phones) await phase(page, 'blood-vote');
  await compare('vote, before voting');
  for (const { page } of phones) await page.locator(`.blood-seat[data-id="${others[1].id}"]`).click();
  for (const { page } of phones) await page.locator('.blood-locked').waitFor({ timeout: 5000 });
  await compare('vote, after voting');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: the role card holds every secret; a peeked card stays open; changed picks and self-guard work from the card');
} finally {
  await browser.close();
}
