// Live phone screens (fix: live layout, 28 November 2026). Nothing on a live phone screen is drawn on top of
// anything else, the player's own move is on screen, and the captain's controls are one compact row that is
// labelled once and looks the same in every game. The layout itself is checked in a real browser at 390x844
// and 360x740; these tests pin the rules it depends on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { numberWheelRows } from '../public/answer-controls.js';
import { soCloseView } from '../public/so-close-view.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const phone = read('public/phone-simple.css');
const app = read('public/app.js');

// A small CSS reader: every rule with its selector, its declarations and the @media it sits in.
function cssRules(source) {
  const rules = [];
  const stack = [];
  let buffer = '';
  for (const char of source.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (char === '{') { stack.push(buffer.trim()); buffer = ''; }
    else if (char === '}') {
      const head = stack.pop();
      if (head && !head.startsWith('@')) rules.push({ selector: head.replace(/\s+/g, ' '), body: buffer.trim(), media: stack.filter(item => item.startsWith('@')).join(' ') });
      buffer = '';
    } else buffer += char;
  }
  return rules;
}
const declaration = (rule, property) => rule.body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`))?.[1].replace(/\s*!important/, '').trim();

// This fix's own block in phone-simple.css (other phone fixes append their own blocks after it).
function fixBlock() {
  const start = phone.indexOf('Fix: live layout');
  const end = phone.indexOf('End of fix: live layout');
  assert.ok(start > 0 && end > start, 'phone-simple.css has the live layout block');
  return cssRules(phone.slice(phone.lastIndexOf('/*', start), end));
}
// Split a selector list on its top-level commas only (not those inside :is(), :not() or :has()).
function topLevel(selector) {
  const parts = [''];
  let depth = 0;
  for (const char of selector) {
    if (char === ',' && depth === 0) { parts.push(''); continue; }
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;
    parts[parts.length - 1] += char;
  }
  return parts.map(part => part.trim());
}
const live = ':not([data-phase="lobby"]):not([data-phase="waiting"])';
const captain = ':is([data-action="advance"], [data-action="clock"], [data-action="estimate-reveal-skip"])';
const find = (rules, test, label) => {
  const rule = rules.find(test);
  assert.ok(rule, label);
  return rule;
};

test('a live phone screen grows past the phone and scrolls instead of squeezing its content on top of the buttons', () => {
  const rules = fixBlock();
  const showMode = '.mobile-deck .game.player-only:not([data-phase="lobby"]):not([data-phase="waiting"]):not([data-phase="finished"])';
  // player-live.css sizes an upright phone's live screen to exactly the phone and lets the last panel shrink.
  const squeezed = cssRules(read('public/player-live.css')).filter(rule => rule.media.includes('orientation: portrait'));
  assert.equal(declaration(find(squeezed, rule => rule.selector === showMode, 'the show-mode screen'), 'height'), '100%');
  assert.equal(declaration(find(squeezed, rule => rule.selector === showMode + ' > .game-panel:last-of-type', 'the show-mode last panel'), 'min-height'), '0');
  // This fix overrides both, with the same selector one step more specific (html.mobile-deck), loaded later.
  const screen = find(rules, rule => rule.selector === 'html' + showMode && rule.media.includes('orientation: portrait'), 'a live screen rule for upright phones');
  assert.equal(declaration(screen, 'height'), 'auto', 'the screen is not pinned to the phone height');
  assert.equal(declaration(screen, 'min-height'), '100%', 'a short screen still fills the phone, so the answers share the spare room');
  const panel = find(rules, rule => rule.selector === 'html' + showMode + ' > .game-panel:last-of-type', 'a last-panel rule');
  assert.equal(declaration(panel, 'flex-shrink'), '0', 'the last panel is never squeezed below what it holds');
  // Lists inside a screen are as tall as their rows: Same Page's groups no longer run over "Your answer".
  const lists = find(rules, rule => rule.selector.includes('.samepage-matches') && rule.selector.includes('.question-panel > .answers'), 'a rule for result lists and answers');
  assert.equal(declaration(lists, 'flex-shrink'), '0');
  assert.match(lists.selector, /^html\.mobile-deck /);
  assert.match(read('public/same-page.css'), /\.player-only \.samepage-matches \{[^}]*overflow:visible/, 'the reason: phone result rows draw outside a squeezed list');
  // The answers still grow into the spare room, so a normal four-answer question fits one screen.
  assert.match(read('public/player-live.css'), /\.question-panel > \.answers \{\s*flex:1 1 auto;[^}]*grid-auto-rows:minmax\(58px,1fr\)/);
  // phone-simple.css is the last stylesheet, after player-live.css and same-page.css.
  const sheets = [...read('public/index.html').matchAll(/<link rel="stylesheet" href="\/([^"]+)"/g)].map(match => match[1]);
  assert.equal(sheets.at(-1), 'phone-simple.css');
});

test('So Close and Way Off keep "Lock in my guess" on screen: arrows beside a five-row ruler, the typed number on one line', () => {
  const rules = fixBlock();
  const wheel = find(rules, rule => rule.selector.endsWith('.so-close-editor .so-close-wheel'), 'the wheel layout');
  assert.equal(declaration(wheel, 'grid-template-columns'), 'minmax(0, 1fr) 64px', 'the arrows sit beside the ruler, not above and below it');
  assert.equal(declaration(find(rules, rule => rule.selector.endsWith('.so-close-wheel > .ruler-wheel'), 'the ruler place'), 'grid-row'), '1 / span 2');
  assert.equal(declaration(find(rules, rule => rule.selector.endsWith('button[data-step="1"]'), 'the up arrow'), 'grid-row'), '1');
  assert.equal(declaration(find(rules, rule => rule.selector.endsWith('button[data-step="-1"]'), 'the down arrow'), 'grid-row'), '2');
  // Five rows of ruler instead of seven, and the current number stays on the reading line in the middle:
  // the ruler draws 2 × reach + 1 rows, shifted up by M rows, so row `reach` is centred when
  // (reach - M + 0.5) rows = half the ruler's height.
  const height = Number(declaration(find(rules, rule => rule.selector.endsWith('.so-close-editor .ruler-wheel'), 'the ruler height'), 'height').match(/calc\(var\(--pitch\) \* (\d+)\)/)[1]);
  const shift = Number(declaration(find(rules, rule => rule.selector.endsWith('.so-close-editor .ruler-wheel .ruler-rows'), 'the ruler rows'), 'margin-top').match(/calc\(var\(--pitch\) \* -(\d+)\)/)[1]);
  const drawn = numberWheelRows({ type: 'estimate' }, 500).match(/class="so-close-number/g).length;
  const reach = (drawn - 1) / 2;
  assert.equal(height, 5);
  assert.equal(reach - shift + 0.5, height / 2, 'the current number sits on the reading line');
  assert.ok(shift >= 1 && reach - shift >= height / 2 - 0.5, 'there are rows above and below to slide into view while dragging');
  // The typed number is still there (it is the way to enter 2,000,000 without turning the wheel), on one line with its label.
  const editor = soCloseView({ type: 'estimate', unit: 'km' }, { draft: 0, host: false }, String);
  assert.match(editor, /<label>Your guess \(km\)<input type="number" data-number/);
  assert.match(editor, /data-action="submit-special">Lock in my guess</);
  assert.equal(declaration(find(rules, rule => rule.selector.endsWith('.so-close-editor > label'), 'the typed-number row'), 'grid-template-columns'), 'auto minmax(0, 1fr)');
  // Seven step sizes share the row on a 360px phone.
  assert.equal(declaration(find(rules, rule => rule.selector.endsWith('.estimate-precision button'), 'the step sizes'), 'min-width'), '0');
});

test('the captain\'s controls are one compact row with a single "★ Captain" label, the same in every game', () => {
  const rules = fixBlock();
  const scope = 'html.mobile-deck body.playing .game.player-only' + live;
  // game-identities.css prints "★ Captain ·" inside every captain button (TV never sees it; the lobby turns it off).
  assert.match(read('public/game-identities.css'), /:is\(\[data-action="advance"\], \[data-action="clock"\]\)::before \{ content: "★ Captain · " !important;/);
  // On a live phone screen no captain button carries those words any more ...
  const cleared = find(rules, rule => rule.selector === `${scope} ${captain}::before`, 'a rule clearing the per-button prefix');
  assert.equal(declaration(cleared, 'content'), 'none');
  // ... and the first visible captain control of each row carries one small tag on its top edge.
  const tag = find(rules, rule => rule.selector === `${scope} ${captain}:not([hidden]):not(${captain}:not([hidden]) ~ *)::before`, 'the row label');
  assert.equal(declaration(tag, 'content'), '"★ Captain"');
  assert.equal(declaration(tag, 'position'), 'absolute', 'the tag takes no room of its own');
  const look = find(rules, rule => rule.selector === `${scope} ${captain}`, 'the captain look');
  assert.equal(declaration(look, 'border'), '2px solid #ffd27a', 'still unmistakably the captain\'s: the gold border');
  assert.equal(declaration(look, 'overflow'), 'visible', 'the tag is not clipped');
  assert.ok(Number.parseInt(declaration(look, 'margin-top'), 10) >= 8, 'room above the button for the tag');
  // Pause and the main button side by side, under the player's own status line.
  const row = find(rules, rule => rule.selector === `${scope} .round-footer:has(> [data-action="clock"], > [data-action="advance"])`, 'the round footer row');
  assert.equal(declaration(row, 'flex-direction'), 'row');
  assert.equal(declaration(row, 'flex-wrap'), 'wrap');
  assert.equal(declaration(find(rules, rule => rule.selector === `${scope} .round-footer > :not([data-action])`, 'the status line'), 'flex'), '1 0 100%');
  assert.equal(declaration(find(rules, rule => rule.selector === `${scope} .round-footer > [data-action="clock"]`, 'Pause'), 'flex'), '0 1 auto');
  assert.equal(declaration(find(rules, rule => rule.selector === `${scope} .round-footer > [data-action="advance"]`, 'the main button'), 'flex'), '1 1 0');
  // A phone says "Pause"; the TV keeps "Pause timer" (the extra word is hidden only on a phone).
  // (One text item inside the button, so the TV still reads "Pause timer" with an ordinary space.)
  assert.match(app, /\$\{icons\('pause'\)\} <span>Pause<span class="pause-timer-word"> timer<\/span><\/span><\/button>/);
  for (const file of readdirSync(new URL('../public/', import.meta.url)).filter(name => name.endsWith('.css'))) {
    for (const rule of cssRules(read('public/' + file)).filter(rule => rule.selector.includes('pause-timer-word'))) {
      assert.match(rule.selector, /^html\.mobile-deck /, `${file} hides "timer" on phones only`);
    }
  }
  // The row sits at the bottom of the screen on an upright phone; Hot Potato's Pause joins it there.
  const bottom = find(rules, rule => rule.media.includes('orientation: portrait') && /> \.game-panel:last-of-type > :is\(:has\(/.test(rule.selector), 'the bottom row rule');
  assert.equal(declaration(bottom, 'margin-top'), 'auto');
  assert.equal(declaration(find(rules, rule => rule.selector.endsWith('.game.player-only > .round-pace'), 'Hot Potato pause'), 'order'), '1');
});

test('a Quiz Race phone scrolls inside the screen like every other phone screen, so "Pause race" is never out of reach', () => {
  const race = read('public/quiz-race.css');
  // The race used to turn the whole page into a document scroller (to dodge the old pager); that page could not
  // scroll on a phone, so the captain's Pause race sat below the fold with no way to reach it.
  assert.doesNotMatch(race, /body:has\(\.game\[data-mode="quizrace"\]\)\s*\{[^}]*position:\s*static/);
  assert.doesNotMatch(race, /body:has\(\.game\[data-mode="quizrace"\]\) #app\s*\{[^}]*overflow:\s*visible/);
  assert.doesNotMatch(race, /html\.mobile-deck:has\(\.game\[data-mode="quizrace"\]\)/);
  assert.match(read('public/mobile-deck.css'), /\.mobile-deck #app \{[^}]*overflow-y: auto;/, 'the phone screen scrolls inside #app');
});

test('every rule in the live layout fix is phone-only: the TV is unchanged', () => {
  const rules = fixBlock();
  assert.ok(rules.length >= 20);
  for (const rule of rules) {
    for (const selector of topLevel(rule.selector)) assert.match(selector, /^html\.mobile-deck /, selector);
  }
});
