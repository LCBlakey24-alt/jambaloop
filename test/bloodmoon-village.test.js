// Bloodmoon's TV village in 3D renders (owner request, 28 November 2026: the houses and other symbols were flat
// 2D icons beside the rendered gravestones and vampire). Renders of Kenney's Hexagon Kit (houses), Graveyard Kit
// (props, coffin, gravestones, vampire) and Particle Pack (flames), all CC0. Nothing about a living player's role
// may show: a house is chosen by seat number, and a fallen player's marker shows only how they fell.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { publicBloodmoon, startBloodmoon } from '../bloodmoon.js';
import { bloodmoonView } from '../public/bloodmoon-view.js';

const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

function tv(size) {
  const room = { mode: 'bloodmoon', game: 1, phase: 'lobby', players: new Map(), lastSeen: new Map(), liveConnections: new Map(), waiting: new Map(), host: 'host', pausedAt: 0, ends: 0 };
  for (let i = 0; i < size; i++) { room.players.set('k' + i, { id: 'p' + i, name: 'Player ' + i, score: 0 }); room.lastSeen.set('k' + i, Date.now()); }
  startBloodmoon(room, () => {});
  clearTimeout(room.deadline);
  const draw = () => bloodmoonView({ phase: room.phase, ends: room.ends, party: publicBloodmoon(room, 'host'), player: undefined }, { host: true, canControl: true, escape, icons: () => '' });
  return { room, draw };
}

test('every living player has a 3D house, chosen by seat and never by role', () => {
  const { room, draw } = tv(8);
  const html = draw();
  assert.doesNotMatch(html, /structure-house/, 'no flat house icon left');
  const houses = [...html.matchAll(/<img class="blood-house" src="\/models\/sprites\/(unit-house|unit-mansion)\.webp" alt="">/g)].map(m => m[1]);
  assert.equal(houses.length, 8);
  assert.deepEqual(houses, Array.from({ length: 8 }, (_, i) => i % 3 === 2 ? 'unit-mansion' : 'unit-house'), 'a manor every third seat, by seat number');
  // The same seats give the same houses however the roles fall: deal the roles again and nothing changes.
  const before = html.match(/<ul>[\s\S]*?<\/ul>/)[0];
  const roles = [...room.party.roles.entries()];
  room.party.roles = new Map(roles.map(([key], i) => [key, roles[(i + 1) % roles.length][1]]));
  assert.equal(draw().match(/<ul>[\s\S]*?<\/ul>/)[0], before, 'the ring looks the same whoever is a vampire');
});

test('the fallen: a coffin for the bitten, a gravestone for the banished', () => {
  const { room, draw } = tv(6);
  const [bitten, banished] = [...room.players.keys()];
  room.party.alive.delete(bitten); room.party.alive.delete(banished);
  room.party.fallen = [...(room.party.fallen ?? []), { key: bitten, how: 'bitten', night: 1 }, { key: banished, how: 'banished', night: 1 }];
  const seats = publicBloodmoon(room, 'host').seats;
  const html = bloodmoonView({ phase: room.phase, ends: room.ends, party: { ...publicBloodmoon(room, 'host'), seats: seats.map((seat, i) => i === 0 ? { ...seat, alive: false, how: 'bitten' } : i === 1 ? { ...seat, alive: false, how: 'banished' } : seat) }, player: undefined },
    { host: true, canControl: true, escape, icons: () => '' });
  assert.match(html, /<img class="blood-grave blood-coffin" src="\/models\/sprites\/coffin\.webp" alt="">/);
  assert.match(html, /<img class="blood-grave" src="\/models\/sprites\/gravestone-(round|cross|bevel|decorative)\.webp" alt="">/);
});

test('scenery, the fire and the verdict figure; every file is shipped and its licence recorded', () => {
  const view = read('public/bloodmoon-view.js');
  assert.match(view, /<div class="blood-scenery" aria-hidden="true">/, 'scenery is decoration for screen readers');
  assert.match(view, /<span class="blood-fire" aria-hidden="true">/);
  assert.match(view, /sprite\(out\.role === 'vampire' \? 'character-vampire' : 'gravestone-round', 'blood-verdict-figure'\)/, 'the verdict shows a role only once it is announced');
  const used = new Set([...view.matchAll(/sprite\('([\w-]+)'/g)].map(m => m[1]).concat(['unit-house', 'unit-mansion', 'coffin', 'character-vampire', 'gravestone-round']));
  for (const name of used) assert.ok(existsSync(new URL(`../public/models/sprites/${name}.webp`, import.meta.url)), name + '.webp is shipped');
  for (const licence of ['LICENCE-hexagon-kit-CC0.txt', 'LICENCE-particle-pack-CC0.txt', 'LICENCE-graveyard-kit-CC0.txt']) {
    assert.match(read('public/models/sprites/' + licence), /Creative Commons Zero|CC0/i, licence);
  }
  const assets = read('docs/BRANDING_ASSETS.md');
  assert.match(assets, /Hexagon Kit/);
  assert.match(assets, /Particle Pack/);
  const css = read('public/bloodmoon.css');
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{\n\s+\.blood-flame\.is-a \{ animation:/, 'the flames hold still when motion is reduced');
});
