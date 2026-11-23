// Phone-first acceptance: a real room and two devices at both phone orientations.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({
  headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
await mkdir('browser-screenshots', { recursive: true });
try {
  for (const [width, height] of [[390, 844], [844, 390]]) {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true, isMobile: true
    });
    const errors = [];
    const create = await context.request.post(site + '/api/rooms', { data: {
      mode: 'classic', format: 'choice', category: 'general', count: 5,
      seconds: 30, playStyle: 'individual', autoReveal: false
    } });
    assert.equal(create.status(), 201, await create.text());
    const { code, host } = await create.json();
    const playerKeys = [];
    for (const name of ['Alex', 'Bailey']) {
      const joined = await context.request.post(site + '/api/rooms/' + code + '/join', { data: { name } });
      assert.equal(joined.status(), 201, await joined.text());
      playerKeys.push((await joined.json()).key);
    }
    await context.addInitScript(session => {
      sessionStorage.setItem('quizmas-session', JSON.stringify(session));
    }, { code, key: playerKeys[0], host: false });

    const player = await context.newPage();
    player.on('pageerror', error => errors.push(error.message));
    await player.goto(site, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await player.locator('.phone-lobby').waitFor({ timeout: 15000 });
    const advance = await context.request.post(site + '/api/rooms/' + code + '/advance', {
      headers: { 'x-game-key': host }, data: { game: 1, index: 0, phase: 'lobby' }
    });
    assert.equal(advance.status(), 204, await advance.text());

    await player.locator('.player-only[data-phase="question"] .question-panel').waitFor({ timeout: 15000 });
    const choices = player.locator('.question-panel .answer[data-action="answer"]');
    assert.equal(await choices.count(), 4, 'Four real quiz choices should appear on the phone');
    assert.equal(await player.locator('.player-timer .timer').count(), 1, 'Time remaining should be legible');
    const layout = await player.evaluate(() => {
      const app = document.querySelector('#app');
      const choices = [...document.querySelectorAll('.question-panel .answer[data-action="answer"]')];
      return {
        scrollMode: getComputedStyle(app).overflowY,
        appWidth: app.scrollWidth,
        clientWidth: app.clientWidth,
        hiddenChoices: choices.filter(choice => Boolean(choice.closest('[data-deck-hidden]'))).length,
        pagerVisible: [...document.querySelectorAll('.mobile-pager')].some(nav => !nav.hidden),
        choicesMinHeight: Math.min(...choices.map(choice => choice.getBoundingClientRect().height))
      };
    });
    assert.equal(layout.scrollMode, 'auto', 'Quiz phone must allow one continuous scroll');
    assert.equal(layout.hiddenChoices, 0, 'No question options may be hidden behind another page');
    assert.equal(layout.pagerVisible, false, 'Do not paginate an active question');
    assert.ok(layout.appWidth <= layout.clientWidth + 2, 'Horizontal overflow on ' + width + 'x' + height + ': ' + JSON.stringify(layout));
    assert.ok(layout.choicesMinHeight >= 55, 'Tappable answers should be comfortable in both orientations');
    await player.screenshot({ path: `browser-screenshots/player-question-${width}x${height}.png`, fullPage: false });

    await choices.nth(1).click();
    await player.locator('.player-answer-feedback[data-feedback="locked"]').waitFor({ timeout: 10000 });
    assert.equal(await choices.nth(1).isDisabled(), true, 'The selection must not be submitted twice');
    assert.match(await player.locator('.player-answer-feedback').innerText(), /Answer locked in/);
    await player.screenshot({ path: `browser-screenshots/player-locked-${width}x${height}.png`, fullPage: false });

    const reveal = await context.request.post(site + '/api/rooms/' + code + '/advance', {
      headers: { 'x-game-key': host }, data: { game: 1, index: 0, phase: 'question' }
    });
    assert.equal(reveal.status(), 204, await reveal.text());
    await player.locator('.player-only[data-phase="reveal"] .player-answer-feedback').waitFor({ timeout: 10000 });
    const state = await player.locator('.player-answer-feedback').getAttribute('data-feedback');
    assert.ok(['correct', 'incorrect'].includes(state), 'Player receives a clear post-reveal result');
    assert.equal(await player.locator('.question-panel .answer').count(), 4);
    assert.deepEqual(errors, []);
    await player.screenshot({ path: `browser-screenshots/player-reveal-${width}x${height}.png`, fullPage: false });
    await context.close();
    console.log('PASS: live phone question/answer/reveal at ' + width + 'x' + height);
  }
} finally {
  await browser.close();
}
