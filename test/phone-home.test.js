// A simple phone home and less chrome in the room (owner direction, 28 November 2026): before joining, a phone
// shows one screen (logo, Resume, a big Join card, one line for whoever is hosting) instead of the 24-tile
// launcher with its own pager; in a room the game's bar is the only bar at the top; the captain is not told to
// wait for a rematch they start themselves; and the bar's Home button is a full thumb target.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modes } from '../public/game-config.js';
import { partyView } from '../public/party-views.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('public/app.js');
const css = read('public/phone-simple.css');
const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const icons = name => `<img src="/icons/${name}.svg" alt="">`;
const modeName = id => modes.find(([key]) => key === id)?.[1] ?? '';
const helpers = { escape, icons, modeName };
const home = async (details = {}) => (await import('../public/phone-home.js')).phoneHomeView(details, helpers);

test('the phone home is one screen: the logo, a big Join card and one line for the host, with no launcher or pager', async () => {
  const view = await home();
  assert.match(view, /<h1 id="phone-home-title" class="phone-home-logo"><img src="\/branding\/jambaloop-logo-white\.webp" alt="Jambaloop"/);
  // Join: room code, name and one Join button, in a form of its own (the join pop-up keeps #join-form).
  assert.match(view, /<form id="home-join-form"/);
  assert.match(view, /<input id="home-room-code" name="code"[^>]*inputmode="numeric"[^>]*pattern="\[0-9\]\{6\}" maxlength="6" required>/);
  assert.match(view, /<input id="home-player-name" name="name"[^>]*maxlength="24"[^>]*required>/);
  assert.match(view, /<button class="button primary phone-join-submit" type="submit">Join /);
  assert.equal(view.match(/type="submit"/g).length, 1, 'one way to join');
  assert.doesNotMatch(view, /id="join-form"|id="join-room-code"|id="join-player-name"|join-room-submit/, 'no clash with the join pop-up');
  // Hosting is one small line; it explains the TV (and keeps "This screen is our TV" one tap away).
  assert.match(view, /Hosting\? <button type="button" class="text-button" data-action="party">Open Jambaloop on your TV<\/button>/);
  assert.match(view, /<p class="error" role="alert" data-host-error><\/p>/);
  // Browsing the games is still there, as a small link, not the default.
  assert.match(view, /data-action="phone-browse">See the games<\/button>/);
  // None of the launcher: no tiles, pager, tabs, topic cards or My quizzes.
  assert.doesNotMatch(view, /game-tile|mode-page|mode-pagination|home-tab|category-list|data-action="library"|Page \d+ of/);
  // Nothing to resume on a fresh phone, and no camera button where the camera cannot be used.
  assert.doesNotMatch(view, /data-action="resume-room"|data-action="recent-rooms"|data-scan/);
});

test('the phone home offers Resume for this phone\'s last room and the QR scan when the camera works', async () => {
  const rooms = [{ code: '482913', key: 'k1', name: 'Ada <3', mode: 'quizrace' }, { code: '111111', key: 'k2', name: 'Bo', mode: 'classic' }];
  const view = await home({ rooms: rooms.slice(0, 1), scan: true });
  assert.match(view, /<button type="button" class="phone-resume" data-action="resume-room" data-code="482913">/);
  assert.match(view, /<strong>Play as Ada &#60;3<\/strong>/, 'the saved name is escaped');
  assert.match(view, /<small>Quiz Race · Room 482913<\/small>/);
  assert.match(view, /id="home-player-name"[^>]*value="Ada &#60;3"/, 'the last name used on this phone is filled in');
  assert.doesNotMatch(view, /data-action="recent-rooms"/, 'one room: no list of rooms');
  assert.match(await home({ rooms }), /data-action="recent-rooms">Other rooms<\/button>/);
  // The scan button opens the join pop-up with the camera on; it is a plain button, never a second submit.
  assert.match(view, /<button type="button" class="button outline phone-join-scan" data-action="join" data-scan="1">/);
  // A room saved without a name still resumes.
  assert.match(await home({ rooms: [{ code: '222222', key: 'k3' }] }), /<strong>Room 222222<\/strong>/);
});

test('app.js shows the phone home on phones only, before the launcher, and joins from it like the join pop-up', () => {
  assert.match(app, /import \{ phoneHomeView \} from '\.\/phone-home\.js';/);
  // Same phone test as the phone layout, never in a room, and not once "See the games" is chosen.
  assert.match(app, /const phoneHomeWanted = \(\) => !session && !phoneBrowsing && smallScreen\(\) && document\.documentElement\.classList\.contains\('mobile-deck'\);/);
  assert.match(app, /const smallScreen = \(\) => !isTvScreen\(\) && /, 'a screen recognised as the TV is never a phone');
  // It is built first in the home, so its buttons come before the hidden launcher's.
  assert.match(app, /shell\.insertAdjacentHTML\('afterbegin', phoneHomeView\(\{ rooms: recentRooms\(\), scan: canScan\(\) \}/);
  assert.match(app, /phoneBrowsing = false;\n\s+syncPhoneHome\(\);/, 'opening the home again starts on the phone home');
  assert.match(app, /if \(action === 'phone-browse'\) \{[^}]*phoneBrowsing = true;\n\s+syncPhoneHome\(\);/);
  // Rotation, resizing and "This screen is our TV" switch it with the phone layout.
  assert.match(app, /new MutationObserver\(syncPhoneHome\)\.observe\(document\.documentElement, \{ attributes: true, attributeFilter: \['class'\] \}\);/);
  assert.match(app, /mobileDeck\(\);\nrenderHome\(\);/, 'the phone layout is known before the first home is drawn');
  // The Join card goes through the same join as the pop-up (remembered rooms, errors, connecting screen).
  assert.match(app, /\['host-form', 'join-form', 'home-join-form', 'configure-form', 'rematch-form'\]\.includes\(form\.id\)/);
  assert.match(app, /const avatar = form\.id === 'join-form' \? joinAvatar : undefined;/, 'a photo picked in the pop-up never rides along');
  assert.match(app, /matches\(':is\(#join-form, #home-join-form\) input\[name="code"\]'\)/, 'a pasted invite link becomes the code here too');
  // A hosting error (from "Host on this phone anyway") shows on the phone home, not in the hidden launcher.
  assert.match(app, /const message = document\.querySelector\('\.phone-home-on \[data-host-error\]'\) \?\? document\.querySelector\('#home-error'\);/);
  // ?join=CODE still opens the join pop-up with the code filled in.
  assert.match(app, /else openDialog\('join', code\);/);
  // One tap from the home's scan button to the camera.
  assert.match(app, /if \(action === 'join' && button\.dataset\.scan && canScan\(\)\) \{\n\s+openDialog\('join'\);\n\s+return content\.querySelector\('\[data-action="scan-start"\]'\)\?\.click\(\);/);
});

test('phone-only CSS: the launcher hides behind the phone home, the site header leaves the room, Home is 44px', () => {
  const block = css.slice(css.indexOf('/* ===== Phone home and less chrome in the room'));
  assert.ok(block.length > 100, 'the phone home block is appended to phone-simple.css');
  // Everything is scoped to the phone layout, except keeping the phone home hidden everywhere else.
  for (const rule of block.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(text => text.trim()).filter(Boolean)) {
    const selector = rule.split('{')[0].trim();
    if (selector === '.phone-home') continue;
    for (const part of selector.split(/,(?![^(]*\))/)) assert.match(part.trim(), /^html\.mobile-deck /, `${part.trim()} is phone-only`);
  }
  assert.match(block, /^\.phone-home \{ display: none; \}/m);
  assert.match(block, /html\.mobile-deck \[data-home-shell\]\.phone-home-on > :not\(\.phone-home\) \{ display: none !important; \}/);
  assert.match(block, /html\.mobile-deck body:has\(\[data-home-shell\]\.phone-home-on\) > \.header \{ display: none; \}/);
  // In a room: no site header above the game's own bar (lobby, waiting, finished and the connecting screen).
  assert.match(block, /html\.mobile-deck body\.playing > \.header \{ display: none; \}/);
  // Home in the game bar: at least 44px, and specific enough to beat the phone-wide 42px button rule.
  assert.match(block, /html\.mobile-deck #app \.game \.game-top \.game-controls > \[data-action="leave"\] \{ min-height: 44px; min-width: 44px; \}/);
  assert.match(read('public/mobile-deck.css'), /\.mobile-deck :is\(#dialog-content,\.game,\.hero\) \.button \{[^}]*min-height: 42px/, 'the rule it has to beat');
  // The inputs are 16px or more, so iPhones do not zoom in when they are tapped.
  assert.match(block, /#home-player-name \{ min-height: 52px; font-size: 18px; \}/);
});

test('the captain is not told to wait for a rematch they start themselves', () => {
  // The finish of quiz games: the line is for players who do not run the room.
  assert.match(app, /\$\{canControl \? '' : '<p class="status">Stay here if the captain or host starts a rematch\.<\/p>'\}/);
  assert.doesNotMatch(app, /\$\{host \? '' : '<p class="status">Stay here if the captain or host starts a rematch\.<\/p>'\}/);
  // Fork in the Tracks: the captain's phone gets the same next-game buttons as every other game.
  const players = [{ id: 'a', name: 'Ada', score: 300 }, { id: 'b', name: 'Bo', score: 100 }];
  const state = { mode: 'tracks', phase: 'finished', index: 2, total: 3, game: 1, code: '123456', playStyle: 'teams',
    teams: [{ id: 0, name: 'Red', color: '#f00', size: 1 }, { id: 1, name: 'Blue', color: '#00f', size: 1 }], players, player: players[0], rank: 1,
    night: { queue: [], played: 0 }, party: { type: 'fork', step: 2, scene: 'A quiet junction', team: 0, placed: 3, placements: [['a kettle', 'a hat', 'a cake'], ['a sofa', 'a drum', 'a kite']], driver: { id: 'b', name: 'Bo' } } };
  const shared = { escape, icons: () => '', reply: '' };
  const captain = partyView(state, { ...shared, host: false, canControl: true });
  assert.match(captain, /data-action="quick-replay"/);
  assert.doesNotMatch(captain, /Stay here for a rematch/);
  const player = partyView(state, { ...shared, host: false, canControl: false });
  assert.match(player, /Stay here for a rematch or return to the homepage\./);
  assert.doesNotMatch(player, /data-action="(quick-replay|choose-game|again)"/);
  // The TV's finish is unchanged.
  const tv = partyView(state, { ...shared, host: true, canControl: true });
  assert.match(tv, /data-action="quick-replay"/);
  assert.doesNotMatch(tv, /Stay here/);
});
