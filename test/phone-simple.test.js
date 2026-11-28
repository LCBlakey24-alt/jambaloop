// Simple phone screens (owner direction, 28 November 2026): one screen per phone view with no Back/Next
// pages, only the options that matter for the game being played, and one clear way to do each thing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { lobbyView } from '../public/game-views.js';
import { modes } from '../public/game-config.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('public/app.js');
const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const helpers = { host: false, escape, icons: () => '', modeName: id => modes.find(([key]) => key === id)?.[1] ?? id };
const lobby = (overrides = {}, extra = {}) => lobbyView({
  code: '123456', game: 1, mode: 'bloodmoon', total: 1, connected: 5, playerCount: 5, readyCount: 0, isCaptain: true,
  playStyle: 'individual', players: [], teamPreview: [], player: { name: 'Ada', ready: false }, captainName: 'Ada', ...overrides,
}, { ...helpers, ...extra });

test('phone screens are never split into pages', () => {
  const deck = read('public/mobile-deck.js');
  assert.doesNotMatch(deck, /data-deck-hidden|mobile-pager|deck-next|measure\(/, 'no pager is built');
  // Nothing else still expects a paged screen.
  for (const file of readdirSync(new URL('../public/', import.meta.url)).filter(name => /\.(js|css|html)$/.test(name))) {
    assert.doesNotMatch(read('public/' + file), /data-deck-hidden|data-deck-next|data-deck-prev|\.mobile-pager/, `${file} has no paging left`);
  }
  // A taller screen scrolls on the same page instead, in the room and in pop-ups.
  const css = read('public/mobile-deck.css');
  assert.match(css, /\.mobile-deck #app \{[^}]*overflow-y: auto;/);
  assert.match(css, /\.mobile-deck #dialog-content \{[^}]*overflow-y: auto;/);
  assert.doesNotMatch(css, /\.mobile-deck (#app|#dialog-content) \{[^}]*overflow: clip/, 'nothing on the phone is cut off');
  assert.match(app, /mobileDeck\(\);/);
});

test('the phone lobby is one simple screen: ready, how to play, and the captain\'s three buttons', () => {
  const captain = lobby();
  assert.match(captain, /data-action="ready-toggle"/);
  assert.match(captain, /class="player-game-guide"/);
  assert.match(captain, /data-action="advance"[^>]*>Start game/);
  assert.match(captain, /data-action="picker-open"[^>]*>[^<]*Change game/);
  assert.match(captain, /data-action="configure"[^>]*>[^<]*Settings/);
  // Not on the phone: the game-by-game switcher and practice rounds. (How to play can still start the TV guide.)
  assert.doesNotMatch(captain, /data-action="(lobby-mode|practice)"/);
  assert.doesNotMatch(captain, /Practice answers|Try a practice round/);
  const player = lobby({ isCaptain: false, captainName: 'Bo' });
  assert.doesNotMatch(player, /data-action="(advance|configure|picker-open|lobby-mode|practice)"/, 'only the captain runs the room');
  assert.match(player, /Bo is the captain and starts the game/);
  assert.match(player, /data-action="ready-toggle"/);
  // A saved quiz keeps its own setup: the captain gets Settings, not Change game.
  const saved = lobby({ mode: 'classic', quizTitle: 'Our quiz' });
  assert.doesNotMatch(saved, /data-action="picker-open"/);
  // After Hours is still announced in the phone lobby.
  assert.match(lobby({ mode: 'bluff', afterDark: true }), /After Hours · adults only \(18\+\)/);
  // The TV lobby keeps practice and the switcher. Practice is checked on a quiz now: Bloodmoon has no
  // practice round at all, since nothing in the quiz practice fits it (test/lobby-copy-practice.test.js).
  const tv = lobby({ mode: 'classic', format: 'choice', joinUrl: 'https://example.test/?join=123456' }, { host: true });
  assert.match(tv, /data-action="practice"/);
  assert.match(tv, /data-action="lobby-mode"/);
});

test('the phone lobby and end screen leave out what belongs on the TV', () => {
  assert.match(app, /if \(host && !partyModes\.includes\(s\.mode\)\) body \+= `<section class="game-panel lobby-guide">/, 'answer guide on the TV only');
  assert.match(app, /\['lobby', 'waiting'\]\.includes\(s\.phase\) && !s\.picker && host\) body \+= gameNightView/, 'Game Night planning on the TV only');
  assert.match(app, /const nextUp = host \|\| s\.night\.queue\.length \? gameNightView/, 'a queued playlist still reaches the captain');
  assert.match(app, /\(host \? awardView\(s\.awards, escape, icons\) : ''\)/, 'awards on the TV only');
  const css = read('public/phone-simple.css');
  assert.match(css, /\[data-phase="finished"\] \.personal-scorecard \{ display: none; \}/);
  assert.match(css, /\[data-phase="finished"\] \.actions > \[data-action="leave"\] \{ display: none; \}/);
});

test('a player leaving mid-game is asked first; the phone bar names the game', () => {
  assert.match(app, /if \(action === 'leave'\) \{\n\s+if \(session && !session\.host && state && !\['lobby', 'finished', 'waiting'\]\.includes\(state\.phase\) && !confirm\(/);
  assert.match(app, /s\.mode === 'classic' && host \? categoryName\(s\.category\) : modeName\(s\.mode\)/);
});

test('the captain\'s Settings on a phone are this game\'s settings only', () => {
  assert.match(app, /const phoneSettings = mode === 'configure' && smallScreen\(\);/);
  assert.match(app, /<form id="\$\{mode\}-form" class="\$\{phoneSettings \? 'room-settings' : ''\}">/);
  for (const field of ['quiz-source', 'score-interval-field', 'setup-presets', 'quiz-scoring', 'phone-view-field', 'theme-field']) {
    assert.match(app, new RegExp(`${field}[^>]*advanced-setting|advanced-setting[^>]*${field}`), `${field} is under More options`);
  }
  assert.match(app, /data-more-settings aria-expanded="false">More options/);
  assert.match(app, /classList\.toggle\('no-choice', !allowsTeams \|\| trolley\)/);
  const css = read('public/phone-simple.css');
  assert.match(css, /\.room-settings :is\(\.mode-options, \.explainer-slot\) \{ display: none; \}/, 'no list of every game in Settings');
  assert.match(css, /\.room-settings:not\(\.show-more\) \.advanced-setting \{ display: none; \}/);
  assert.match(css, /\.more-settings-toggle \{ display: none; \}/, 'the toggle is phone-only');
  assert.match(read('public/index.html'), /href="\/phone-simple\.css"/);
});
