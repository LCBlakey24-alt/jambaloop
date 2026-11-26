// Writes public/scenes/<mode>.svg from public/show-scenes.js.
// Run after changing a scene or a show's colours: node scripts/build-show-scenes.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { sceneModes, sceneSvg } from '../public/show-scenes.js';

const folder = new URL('../public/scenes/', import.meta.url);
mkdirSync(folder, { recursive: true });
for (const mode of sceneModes) writeFileSync(new URL(mode + '.svg', folder), sceneSvg(mode));
console.log(`Wrote ${sceneModes.length} scenes.`);
