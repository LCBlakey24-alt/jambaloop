import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { modes } from '../public/game-config.js';
import { identities } from '../public/game-identities.js';

const hsl = hex => {
  const [r, g, b] = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255);
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
  const h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l = (max + min) / 2;
  return { h: h * 60, s: !d ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
};
const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test('every game has its own typeface', () => {
  const css = readdirSync(new URL('../public/', import.meta.url)).filter(name => name.endsWith('.css'))
    .map(name => readFileSync(new URL('../public/' + name, import.meta.url), 'utf8')).join('\n');
  const file = alias => css.match(new RegExp(`font-family:\\s*'${alias}'[^}]*?url\\('([^']+)'`))?.[1];
  const seen = new Map();
  for (const [id] of modes) {
    const source = file(identities[id].display);
    assert.ok(source, `${id}: ${identities[id].display} is a real font`);
    assert.ok(!seen.has(source), `${id} shares the typeface of ${seen.get(source)}`);
    seen.set(source, id);
  }
});

test('no two games share a look-alike colour scheme', () => {
  const ids = modes.map(([id]) => id);
  for (const id of ids) assert.ok(identities[id], `${id} has an identity`);
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    const [one, two] = [identities[ids[a]], identities[ids[b]]];
    const [bgOne, bgTwo] = [hsl(one.bg[0]), hsl(two.bg[0])];
    // Greys have no real hue: compare them with each other by lightness only.
    const grey = bgOne.s < 0.2 && bgTwo.s < 0.2;
    const sameBackdrop = one.scheme === two.scheme && Math.abs(bgOne.l - bgTwo.l) < 0.12
      && (grey || (bgOne.s >= 0.2 && bgTwo.s >= 0.2 && hueGap(bgOne.h, bgTwo.h) < 22));
    const sameAccent = hueGap(hsl(one.accent).h, hsl(two.accent).h) < 16;
    assert.ok(!(sameBackdrop && sameAccent), `${ids[a]} and ${ids[b]} look alike: similar backdrop and the same accent colour`);
  }
});
