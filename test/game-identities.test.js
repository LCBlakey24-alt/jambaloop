import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { identities, identityVariables } from '../public/game-identities.js';
import { modes } from '../public/game-config.js';
import { modeStyle } from '../public/mode-style.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const luminance = hex => {
  const channel = c => { const v = parseInt(hex.slice(c, c + 2), 16) / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  return .2126 * channel(1) + .7152 * channel(3) + .0722 * channel(5);
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

test('every released game has its own identity, face and page colour', () => {
  const ids = modes.map(([id]) => id);
  assert.deepEqual(Object.keys(identities).sort(), [...ids].sort());
  const faces = Object.values(identities).map(id => id.display);
  assert.equal(new Set(faces).size, faces.length, 'no two games share a display face');
  const pages = Object.values(identities).map(id => id.bg[1]);
  assert.equal(new Set(pages).size, pages.length, 'no two games share a page colour');
  const titles = Object.values(identities).map(id => id.title);
  assert.equal(new Set(titles).size, titles.length);
  for (const id of ids) assert.equal(modeStyle(id).font, identities[id].display, id + ' scenes use its face');
});

test('text is readable on every surface (WCAG AA or better)', () => {
  for (const [mode, id] of Object.entries(identities)) {
    for (const surface of [id.surface, id.surface2]) {
      assert.ok(contrast(id.ink, surface) >= 7, `${mode} ink ${contrast(id.ink, surface).toFixed(2)}`);
      assert.ok(contrast(id.muted, surface) >= 4.5, `${mode} muted ${contrast(id.muted, surface).toFixed(2)}`);
      assert.ok(contrast(id.accent, surface) >= 3, `${mode} accent ${contrast(id.accent, surface).toFixed(2)}`);
    }
    assert.ok(['dark', 'light'].includes(id.scheme));
    assert.ok(['display', 'body'].includes(id.question));
  }
});

test('every face is self-hosted with its OFL licence, and the CSS layer stays in step', () => {
  const fonts = read('public/fonts.css');
  for (const id of Object.values(identities)) {
    const face = fonts.match(new RegExp(`font-family: '${id.display}';[^}]*url\\('/fonts/([a-z0-9-]+)\\.woff2'\\)`));
    assert.ok(face, id.display + ' has an @font-face');
    assert.ok(existsSync(new URL(`../public/fonts/${face[1]}.woff2`, import.meta.url)), face[1] + '.woff2');
    assert.ok(existsSync(new URL(`../public/fonts/${face[1]}-OFL.txt`, import.meta.url)), face[1] + ' licence');
  }
  const css = read('public/game-identities.css');
  for (const [mode, id] of Object.entries(identities)) {
    assert.ok(css.includes(`body.playing:has(.game[data-mode="${mode}"]) { background:${id.bg[1]}; }`), mode + ' page colour');
  }
  // Light shows are exactly the ones the stylesheet prints as paper.
  const light = Object.entries(identities).filter(([, id]) => id.scheme === 'light').map(([mode]) => `[data-mode="${mode}"]`);
  assert.ok(css.includes(`body .game:is(${light.join(',')}) { color-scheme:light; }`));
  assert.match(identityVariables('punchline'), /--id-display:'Show Punchline';.*--id-case:uppercase/);
});
