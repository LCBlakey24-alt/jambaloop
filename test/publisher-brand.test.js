import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const files = {};
const load = async path => files[path] ??= await readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Jambaloop remains the product while Rookie Quest Games is clearly credited as publisher', async () => {
  const html = await load('public/index.html');
  const app = await load('public/app.js');
  const css = await load('public/publisher-brand.css');

  assert.match(html, /<title>Jambaloop[^<]+Rookie Quest Games<\/title>/);
  assert.match(html, /name="description"[^>]+Jambaloop, a Rookie Quest Games production/);
  assert.match(html, /A ROOKIE QUEST GAMES PRODUCTION/);
  assert.match(html, /JAMBALOOP · BY ROOKIE QUEST GAMES/);
  assert.match(html, /A Rookie Quest Games production/);
  assert.match(html, /src="\/branding\/jambaloop-logo-white\.webp"/);
  assert.match(html, /src="\/branding\/jambaloop-logo-navy\.webp"/);
  assert.match(html, /<link rel="stylesheet" href="\/publisher-brand\.css">/);
  assert.match(app, /host && \['lobby','finished'\]\.includes\(s\.phase\)/);
  assert.match(app, /studio-publisher/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-height:660px\)/);

  assert.doesNotMatch(html, /<h1[^>]*>\s*Rookie Quest Games/);
  assert.doesNotMatch(html, /href="https?:\/\/[^\"]*rookiequest/i,
    'No unverified parent-site link should be invented');
});

test('Publisher brand policy protects existing game domains, logos and company identity', async () => {
  const policy = await load('docs/ROOKIE_QUEST_GAMES_JAMBALOOP_BRAND.md');
  assert.match(policy, /Rookie Quest Keeper/);
  assert.match(policy, /Rookie Quest Forge/);
  assert.match(policy, /Rookie Quest Worlds/);
  assert.match(policy, /Rookie Quest RPG/);
  assert.match(policy, /Rookie Quest Games/);
  assert.match(policy, /Jambaloop/);
  assert.match(policy, /separate incorporated company/);
  assert.match(policy, /Do not move domains/);
});
