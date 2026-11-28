// Bloodmoon: a glance at a neighbour's phone must not give their role away (CLAUDE.md: keep private
// roles out of other players' views). Each test plays real rounds through the engine, draws every
// living player's phone, and compares everything outside the role card the player taps to peek.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { ABSTAIN, advanceBloodmoon, publicBloodmoon, startBloodmoon, submitBloodmoon } from '../bloodmoon.js';
import { bloodmoonView } from '../public/bloodmoon-view.js';

const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

function table(size) {
  const room = { mode: 'bloodmoon', game: 1, phase: 'lobby', players: new Map(), lastSeen: new Map(), liveConnections: new Map(), waiting: new Map(), host: 'host', pausedAt: 0, ends: 0 };
  // Every name starts with the same letter, so avatars (an initial) match too.
  for (let i = 0; i < size; i++) {
    room.players.set('k' + i, { id: 'p' + i, name: 'Player ' + i, score: 0 });
    room.lastSeen.set('k' + i, Date.now());
  }
  startBloodmoon(room, () => {});
  const party = room.party;
  const withRole = role => [...party.roles].filter(([, r]) => r === role).map(([key]) => key);
  const act = (key, data) => submitBloodmoon(room, key, { game: 1, night: party.night, ...data }, () => {});
  const id = key => room.players.get(key).id;
  const stop = () => clearTimeout(room.deadline);
  return { room, party, withRole, act, id, stop };
}

/** One player's phone, exactly as the app draws it (a plain player, not the captain). */
const phone = (room, key) => bloodmoonView({ phase: room.phase, ends: room.ends, party: publicBloodmoon(room, key), player: { id: room.players.get(key).id } },
  { host: false, canControl: false, escape, icons: () => '' });

const cardPattern = /<details class="blood-role-card"[^>]*>[\s\S]*?<\/details>/g;
/** The role card, which only its owner opens. */
const card = html => html.match(cardPattern)?.[0] ?? '';
/**
 * What a neighbour sees at a glance: everything but the inside of the closed role card, with names
 * and ids made alike, and the list of players compared as a set (each phone marks its own seat "You").
 */
function glance(html) {
  const summary = card(html).match(/<summary>[\s\S]*?<\/summary>/)?.[0] ?? '';
  return html.replace(cardPattern, `<ROLE-CARD ${summary}>`)
    .replace(/Player \d+/g, 'NAME').replace(/data-id="p\d+"/g, 'data-id="ID"')
    .replace(/(<ul class="blood-seats[^"]*">)([\s\S]*?)(<\/ul>)/, (all, open, items, close) =>
      open + (items.match(/<li[\s\S]*?<\/li>/g) ?? []).sort().join('') + close)
    .replace(/\s+/g, ' ');
}

/** Every living player's phone looks the same at a glance, and each has one closed role card. */
function assertAlike(room, party, label) {
  const keys = [...party.roles.keys()].filter(key => party.alive.has(key));
  const views = keys.map(key => ({ key, role: party.roles.get(key), html: phone(room, key) }));
  for (const view of views) {
    assert.equal(view.html.match(cardPattern)?.length, 1, `${label}: ${view.role} has one role card`);
    assert.doesNotMatch(card(view.html), /<details[^>]*\sopen[\s>]/, `${label}: ${view.role}'s role card starts closed`);
  }
  const first = views[0];
  for (const view of views.slice(1)) assert.equal(glance(view.html), glance(first.html), `${label}: the ${view.role} phone looks like the ${first.role} phone at a glance`);
  return views;
}

// Copy that would name a role, or a role's private action or result, if it were on the open screen.
const privateCopy = /Who will you (bite|check|guard)|Who do you suspect|Fellow vampire|fellow vampire|partner|Guarded last night|guarded|Your vision|wants to bite|hunch|is a VAMPIRE|not a vampire|Guard yourself|Bite /;
const outside = html => html.replace(cardPattern, '');

test('the deal: every role\'s phone looks alike, and the role stays in a closed card', () => {
  const { room, party, withRole, act, stop } = table(8);
  assert.equal(room.phase, 'blood-roles');
  assertAlike(room, party, 'deal');
  for (const key of party.roles.keys()) assert.doesNotMatch(outside(phone(room, key)), /Vampire|Oracle|Warden|Villager/, 'no role name outside the card');
  assert.match(card(phone(room, withRole('vampire')[0])), /<h2>Vampire<\/h2>[\s\S]*Your fellow vampire/, 'the vampire\'s card holds the role and partner');
  // Ready looks the same for everyone too.
  for (const key of party.roles.keys()) if (key !== [...party.roles.keys()].at(-1)) act(key, { action: 'ready' });
  const readyKeys = [...party.ready];
  const readyGlances = readyKeys.map(key => glance(phone(room, key)));
  assert.ok(readyGlances.every(view => view === readyGlances[0]), 'every ready phone looks alike');
  stop();
});

test('night: same heading, line, list, button count and message for a vampire, the Oracle, the Warden and a villager', () => {
  const { room, party, withRole, act, id, stop } = table(8);
  advanceBloodmoon(room, () => {});
  assert.equal(room.phase, 'blood-night');
  const views = assertAlike(room, party, 'night, before anyone taps');
  const living = party.alive.size;
  for (const view of views) {
    assert.equal((view.html.match(/class="blood-seat" data-action="blood-pick"/g) ?? []).length, living - 1, `${view.role}: a button for every other player`);
    assert.doesNotMatch(outside(view.html), privateCopy, `${view.role}: nothing private outside the card`);
    assert.doesNotMatch(view.html, /data-chosen/, `${view.role}: nobody highlighted`);
  }
  // Each role's own instructions are in its card.
  const cardOf = role => card(phone(room, withRole(role)[0]));
  assert.match(cardOf('vampire'), /Tap the villager you want to bite/);
  assert.match(cardOf('oracle'), /Tap the player you want to check/);
  assert.match(cardOf('warden'), /Tap the player you want to guard[\s\S]*data-action="blood-pick"[^>]*>Guard yourself/);
  assert.match(cardOf('villager'), /Tap the player you suspect most/);

  // One vampire picks; the other sees it, but only inside the card.
  const [v1, v2] = withRole('vampire');
  const [oracle] = withRole('oracle');
  const [warden] = withRole('warden');
  const villagers = withRole('villager');
  act(v1, { action: 'night', id: id(villagers[0]) });
  assert.match(card(phone(room, v2)), /Player \d+<\/strong> wants to bite <strong>Player \d+/);
  const waiting = [v2, oracle, warden, ...villagers].map(key => glance(phone(room, key)));
  assert.ok(waiting.every(view => view === waiting[0]), 'a vampire who can see a partner\'s pick looks like everyone else who has not tapped');

  // Everyone taps (the vampires disagree, so the night stays open and they can still change their minds).
  act(v2, { action: 'night', id: id(villagers[1]) });
  act(oracle, { action: 'night', id: id(v1) });
  act(warden, { action: 'night', id: id(villagers[0]) });
  for (const key of villagers) act(key, { action: 'night', id: id(v1) });
  assert.equal(room.phase, 'blood-night');
  const done = assertAlike(room, party, 'night, after everyone taps');
  for (const view of done) {
    assert.match(view.html, /Choice made\. Eyes down until dawn\./);
    assert.doesNotMatch(outside(view.html), /data-action="blood-pick"|data-chosen/, `${view.role}: the list is locked and shows no pick`);
    assert.doesNotMatch(outside(view.html), privateCopy, `${view.role}: nothing private outside the card`);
  }
  // A vampire changes their mind from inside the card.
  assert.match(card(phone(room, v1)), /You can change your mind[\s\S]*data-action="blood-pick" data-id="p\d+">Bite Player/);
  assert.match(card(phone(room, oracle)), /You are checking <strong>Player/);
  assert.match(card(phone(room, warden)), /You are guarding <strong>Player/);
  assert.match(card(phone(room, villagers[0])), /Your hunch tonight: <strong>Player/);
  stop();
});

test('night two: the Warden\'s barred player looks like any other seat; the reason is in the card', () => {
  const { room, party, withRole, act, id, stop } = table(6);
  advanceBloodmoon(room, () => {});
  const [vampire] = withRole('vampire');
  const [warden] = withRole('warden');
  const villagers = withRole('villager');
  act(warden, { action: 'night', id: id(villagers[0]) });
  act(vampire, { action: 'night', id: id(villagers[0]) });
  advanceBloodmoon(room, () => {}); // dawn: the Warden saved them
  advanceBloodmoon(room, () => {}); // day
  advanceBloodmoon(room, () => {}); // vote
  advanceBloodmoon(room, () => {}); // verdict: nobody voted
  advanceBloodmoon(room, () => {}); // night two
  assert.equal(room.phase, 'blood-night');
  assert.equal(party.night, 2);
  const views = assertAlike(room, party, 'night two');
  const view = views.find(entry => entry.role === 'warden');
  assert.match(view.html, new RegExp(`<button type="button" class="blood-seat" data-action="blood-pick" data-id="${id(villagers[0])}"`), 'last night\'s guard is a normal button');
  assert.match(card(view.html), /You guarded <strong>Player \d+<\/strong> last night, so choose someone else tonight/);
  // A mis-tap is refused in words that fit every role.
  assert.deepEqual(act(warden, { action: 'night', id: id(villagers[0]) }), [400, 'Choose someone else.']);
  stop();
});

test('a vampire tapping a fellow vampire is told the same thing anyone is', () => {
  const { room, withRole, act, id, stop } = table(8);
  advanceBloodmoon(room, () => {});
  const [v1, v2] = withRole('vampire');
  assert.deepEqual(act(v1, { action: 'night', id: id(v2) }), [400, 'Choose someone else.']);
  assert.deepEqual(act(v1, { action: 'night', id: id(v1) }), [400, 'Choose someone else.']);
  stop();
});

test('dawn, day and vote: the Oracle\'s vision and the vampires\' partners stay inside the card', () => {
  const { room, party, withRole, act, id, stop } = table(8);
  advanceBloodmoon(room, () => {});
  const [v1, v2] = withRole('vampire');
  const [oracle] = withRole('oracle');
  const [warden] = withRole('warden');
  const villagers = withRole('villager');
  act(v1, { action: 'night', id: id(villagers[0]) });
  act(v2, { action: 'night', id: id(villagers[0]) });
  act(oracle, { action: 'night', id: id(v1) });
  act(warden, { action: 'night', id: id(villagers[1]) });
  for (const key of villagers) act(key, { action: 'night', id: id(v1) });
  assert.equal(room.phase, 'blood-dawn');

  for (const [label, step] of [['dawn'], ['day', true], ['vote', true]]) {
    if (step) advanceBloodmoon(room, () => {});
    assert.equal(room.phase, 'blood-' + label);
    const views = assertAlike(room, party, label);
    for (const view of views) assert.doesNotMatch(outside(view.html), privateCopy, `${label}: nothing private outside ${view.role}'s card`);
    assert.match(card(phone(room, oracle)), /Night 1: <strong>Player \d+<\/strong> is a VAMPIRE/, `${label}: the Oracle can still peek at the finding`);
    assert.match(card(phone(room, v1)), /Your fellow vampire: <strong>Player/, `${label}: a vampire can still peek at their partner`);
  }
  // Every living player votes, and every locked ballot looks the same whoever cast it.
  const voters = [...party.roles.keys()].filter(key => party.alive.has(key));
  for (const key of voters.slice(0, -1)) act(key, { action: 'vote', id: key === villagers[2] ? id(v1) : id(villagers[2]) });
  const locked = voters.slice(0, -1).map(key => glance(phone(room, key)));
  assert.ok(locked.every(view => view === locked[0]), 'a locked vote looks the same on every role\'s phone');
  act(voters.at(-1), { action: 'vote', id: ABSTAIN });
  assert.equal(room.phase, 'blood-verdict');
  assertVerdict(room, party);
  stop();
});

function assertVerdict(room, party) {
  const views = [...party.roles.keys()].filter(key => party.alive.has(key)).map(key => glance(phone(room, key)));
  assert.ok(views.every(view => view === views[0]), 'the verdict looks the same on every phone');
}

test('the role card is only for phones, and keeps its place while a phase lasts', () => {
  const { room, stop } = table(6);
  const tv = bloodmoonView({ phase: room.phase, ends: room.ends, party: publicBloodmoon(room, 'host'), player: undefined }, { host: true, canControl: true, escape, icons: () => '' });
  assert.doesNotMatch(tv, /blood-role-card|blood-tonight/, 'no role card on the TV');
  const app = read('public/app.js');
  assert.match(app, /const roleCardWasOpen = !enter && !host && Boolean\(app\.querySelector\('\.blood-role-card'\)\?\.open\);/, 'a peeked card stays open within a phase');
  const css = read('public/phone-simple.css');
  assert.match(css, /\.game\.player-only \.blood-role-card\[open\] \.blood-peek \{ display: none; \}/);
  assert.match(css, /\.game\.player-only \.blood-role-card \.blood-hide \{ display: none; \}/);
  stop();
});
