// On a short phone (360×640, a very common Android size) every answer button
// must be fully on screen and not covered by anything, for the captain (who
// also has room controls) and for an ordinary player.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const site = process.env.SITE || 'http://127.0.0.1:32000';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const call = async (path, key, data) => {
  const response = await fetch(site + '/api/rooms' + path, { method: data === undefined ? 'GET' : 'POST', headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  return response.status === 204 ? undefined : response.json();
};
const games = [
  ['classic', { format: 'choice' }], ['classic', { format: 'boolean' }], ['classic', { format: 'order' }],
  ['knockout', { format: 'choice' }], ['showdown', { format: 'choice', playStyle: 'teams', teamCount: 2 }], ['dice', { format: 'choice' }],
];
try {
  for (const [mode, extra] of games) {
    const { code, host } = await call('', undefined, { mode, category: 'mixed', count: 5, seconds: 0, ...extra });
    assert.ok(code, mode + ' room');
    const keys = [];
    for (const name of ['Maya', 'Oliver']) keys.push((await call('/' + code + '/join', undefined, { name })).key);
    let state = await call('/' + code, host);
    await call('/' + code + '/advance', host, { game: state.game, phase: state.phase, index: state.index, lobbyVersion: state.lobbyVersion });
    for (let i = 0; i < 80; i++) {
      state = await call('/' + code, host);
      if (state.phase === 'question') break;
      if (state.phase === 'ready') await call('/' + code + '/roll', host, { game: state.game, index: state.index });
      await new Promise(done => setTimeout(done, 150));
    }
    assert.equal(state.phase, 'question', mode);
    for (const [who, key] of [['captain', keys[0]], ['player', keys[1]]]) for (const [width, height] of [[360, 640], [320, 568]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await page.addInitScript(([code, key]) => { sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: false })); sessionStorage.setItem('jambaloop-welcomed', code); }, [code, key]);
      await page.goto(site + '/?room=' + code);
      await page.locator('.answers button, .answers [draggable], .order-list li').first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(900);
      const found = await page.evaluate(() => {
        const answers = [...document.querySelectorAll('.answers button, .order-list li')];
        const problems = [];
        for (const answer of answers) {
          const box = answer.getBoundingClientRect();
          if (box.bottom > innerHeight + 1 || box.top < 0) { problems.push('off screen: ' + answer.textContent.trim().slice(0, 24)); continue; }
          // The element actually drawn at the middle and near the bottom of the button must be the button itself.
          for (const y of [box.top + box.height / 2, box.bottom - 6]) {
            const top = document.elementFromPoint(box.left + box.width / 2, y);
            if (top && !answer.contains(top) && !top.contains(answer)) problems.push('covered by ' + (top.className || top.tagName) + ': ' + answer.textContent.trim().slice(0, 24));
          }
        }
        return { count: answers.length, problems: [...new Set(problems)] };
      });
      assert.ok(found.count >= 2, `${mode} ${extra.format}: answers are shown`);
      assert.deepEqual(found.problems, [], `${mode} ${extra.format} ${who} ${width}×${height}`);
      await context.close();
    }
    console.log(`PASS: ${mode} (${extra.format}) answers are all visible and uncovered on short phones`);
  }
} finally { await browser.close(); }
