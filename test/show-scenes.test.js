import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modes } from '../public/game-config.js';
import { identityVariables } from '../public/game-identities.js';
import { sceneModes, sceneSvg } from '../public/show-scenes.js';
import { launcherTile, launcherPreview } from '../public/home-launcher.js';

const ids = modes.map(([id]) => id);

test('every game has its own scene, and the committed SVG matches the drawing code', () => {
  assert.deepEqual([...sceneModes].sort(), [...ids].sort());
  const scenes = ids.map(sceneSvg);
  assert.equal(new Set(scenes).size, ids.length, 'every scene is different');
  for (const [index, id] of ids.entries()) {
    const file = readFileSync(new URL(`../public/scenes/${id}.svg`, import.meta.url), 'utf8');
    assert.equal(file, scenes[index], `${id}.svg is stale: run node scripts/build-show-scenes.mjs`);
  }
});

test('scenes are plain vector artwork: no scripts, text, images, links or handlers', () => {
  for (const id of ids) {
    const svg = sceneSvg(id);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 400 400"/);
    assert.doesNotMatch(svg, /<(script|text|image|foreignObject|use|a)\b|href=|\son[a-z]+=/i, id);
    assert.doesNotMatch(svg, /NaN|undefined/, `${id} has a bad coordinate`);
  }
});

test('every show has a panel scene and two sizes of illustrated cover', () => {
  for (const mode of modes) {
    const [id] = mode;
    assert.ok(identityVariables(id).includes(`--id-scene:url('/scenes/${id}.svg')`), id);
    for (const suffix of ['', '-small']) {
      const path = `/covers/${id}${suffix}.webp`;
      const image = readFileSync(new URL('../public' + path, import.meta.url));
      assert.equal(image.toString('ascii', 8, 12), 'WEBP', path);
      assert.ok(identityVariables(id).includes(`url('${path}')`));
    }
    assert.ok(launcherTile(mode).includes(`data-show="${id}"`));
  }
  assert.ok(identityVariables('__proto__').includes("--id-scene:url('/scenes/classic.svg')"), 'unknown modes fall back safely');
  const css = readFileSync(new URL('../public/game-identities.css', import.meta.url), 'utf8');
  assert.match(css, /\.tile-art\[data-show\]::before \{[^}]*background:var\(--id-cover-small\)/, 'compact tiles paint their small illustration');
  assert.match(css, /\.game-panel:not\(\.game-panel \.game-panel\) \{[^}]*var\(--id-scene\)/, 'game panels paint the same scene');
  assert.match(css, /\.lobby-tile \{[^}]*var\(--id-cover-small\)/, 'the lobby card shows the tile');
});

test('tiles show only the game logo, with no tagline', () => {
  for (const mode of modes) {
    assert.doesNotMatch(launcherTile(mode), /tile-strap/);
    assert.doesNotMatch(launcherPreview(mode[0]), /tile-strap/);
  }
});

test('every game has its own recorded title sting', () => {
  for (const id of ids) assert.ok(readFileSync(new URL(`../public/audio/sfx/sting-${id}.mp3`, import.meta.url)).length > 5000, id);
});
