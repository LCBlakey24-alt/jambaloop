import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { modes } from '../public/game-config.js';
import { duoIntros, hosts, presenters, reactionTakes, skipQuips, spoken, welcomeBack, welcomeScript } from '../public/duo-scripts.js';
import { duoRecordings, duoTake } from '../public/duo-recordings.js';
import { gameGuides, panelGuide } from '../public/guide-scripts.js';

test('every game has a short Double Act intro where both hosts take turns', () => {
  assert.deepEqual(Object.keys(duoIntros).sort(), modes.map(([id]) => id).sort());
  for (const [mode, lines] of Object.entries(duoIntros)) {
    assert.ok(lines.length >= 3 && lines.length <= 6, mode);
    for (const presenter of presenters) assert.ok(lines.some(([host]) => host === presenter), `${mode}: ${presenter} speaks`);
    for (const [host] of lines) assert.ok(hosts[host], `${mode}: ${host} is a known voice`);
    for (let i = 1; i < lines.length; i++) assert.notEqual(lines[i][0], lines[i - 1][0], `${mode}: hosts alternate`);
    for (const [, text] of lines) assert.ok(spoken(text).length > 0 && spoken(text).length <= 140, `${mode}: short, captionable lines`);
  }
});

test('every recording is committed and has one timing per scripted line', () => {
  const scripts = { ...duoIntros, welcome: welcomeScript, 'welcome-back': welcomeBack,
    ...Object.fromEntries(skipQuips.map((lines, index) => [`skip-${index + 1}`, lines])),
  ...reactionTakes,
  ...Object.fromEntries(Object.entries(gameGuides).map(([mode, lines]) => [`guide-${mode}`, lines])) };
  for (const [key, timings] of Object.entries(duoRecordings)) {
    assert.ok(scripts[key], `${key} is a known script`);
    assert.ok(existsSync(new URL('../public' + duoTake(key), import.meta.url)), `${key}.mp3 is committed`);
    assert.equal(timings.length, scripts[key].length, `${key}: one timing per line`);
    timings.forEach(([start, end], index) => {
      assert.ok(end > start, `${key} line ${index + 1} has length`);
      if (index) assert.ok(start >= timings[index - 1][0], `${key} lines are in order`);
    });
  }
});

test('mood tags guide the voice but never reach the caption', () => {
  assert.equal(spoken('[excited] Ladies and gentlemen... it\'s [laughs] Knockout!'), 'Ladies and gentlemen... it\'s Knockout!');
  for (const lines of [...Object.values(duoIntros), welcomeScript, welcomeBack, ...skipQuips])
    for (const [, text] of lines) assert.doesNotMatch(spoken(text), /[\[\]]/);
});

test('captions always show the exact line, and nothing is generated at runtime', () => {
  const narrator = readFileSync(new URL('../public/narrator.js', import.meta.url), 'utf8');
  assert.match(narrator, /showCaption\(host, text\)/);
  assert.doesNotMatch(narrator, /elevenlabs\.io|xi-api-key/i, 'no API calls from the browser');
});

test('the Jambaloop welcome: both hosts, alternating, each line paired with a TV scene', async () => {
  const show = readFileSync(new URL('../public/welcome-show.js', import.meta.url), 'utf8');
  for (let i = 0; i < welcomeScript.length; i++) {
    const [host, text, scene] = welcomeScript[i];
    assert.ok(hosts[host] && spoken(text).length <= 140, `line ${i + 1}`);
    if (i) assert.notEqual(host, welcomeScript[i - 1][0], `line ${i + 1} alternates`);
    assert.match(show, new RegExp(`\\b${scene}: `), `scene ${scene} is drawn`);
  }
  assert.ok(/phone/i.test(welcomeScript.map(([, text]) => text).join(' ')), 'explains phones as controllers');
  assert.ok(/captain/i.test(welcomeScript.map(([, text]) => text).join(' ')), 'explains the captain');
});

test('every game has its own music theme, with the house music as the fallback', () => {
  for (const [id] of modes) assert.ok(existsSync(new URL(`../public/audio/music/game-${id}.mp3`, import.meta.url)), `${id} has a theme`);
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /playMusic\('game-' \+ \(s\.picker\?\.mode \?\? s\.mode\), \{ fallback: 'lobby' \}\)/, 'the carousel plays the theme of the game in view');
  assert.match(app, /playMusic\('game-' \+ s\.mode, \{ quiet: true, fallback: 'lobby' \}\)/, 'the theme carries on quietly during play');
});

test('every game has a detailed how-to-play guide, each line paired with a drawn scene', () => {
  const show = readFileSync(new URL('../public/guide-show.js', import.meta.url), 'utf8');
  assert.deepEqual(Object.keys(gameGuides).sort(), modes.map(([id]) => id).sort());
  for (const [mode, lines] of Object.entries(gameGuides)) {
    assert.ok(lines.length >= 7 && lines.length <= 10, `${mode}: detailed but not endless`);
    assert.ok(presenters.includes(lines[0][0]), `${mode}: a regular host opens`);
    assert.equal(lines[0][2], 'title', `${mode}: opens on the title card`);
    assert.equal(lines.at(-1)[2], 'go', `${mode}: ends on the send-off`);
    assert.ok(/phone/i.test(lines.map(([, text]) => text).join(' ')), `${mode}: says what to do on the phone`);
    const guests = new Set(lines.map(([host]) => host).filter(host => !presenters.includes(host)));
    if (guests.size) assert.ok(lines.some(([host, , scene]) => presenters.includes(host) && scene === 'handover'), `${mode}: the regular hosts hand over to the guest`);
    for (const [host, text, scene] of lines) {
      assert.ok(hosts[host], `${mode}: ${host} is a known voice`);
      assert.ok(spoken(text).length > 0 && spoken(text).length <= 150, `${mode}: captionable line`);
      assert.doesNotMatch(spoken(text), /[\[\]—]/, `${mode}: clean caption`);
      assert.match(show, new RegExp(`\\n  ${scene}: `), `${mode}: scene ${scene} is drawn`);
    }
  }
});

test('guides describe the selected Rare Find scoring and Classic Quiz tied results', () => {
  const panelText = panelGuide.map(([, text]) => text).join(' ');
  const roomText = gameGuides.rare.map(([, text]) => text).join(' ');
  const classicText = gameGuides.classic.map(([, text]) => text).join(' ');
  assert.match(panelText, /research panel/i);
  assert.match(panelText, /lose five points/i);
  assert.equal(panelGuide.find(([, , scene]) => scene === 'gem')[3], 'SHARED −5');
  assert.match(roomText, /hundred each/i);
  assert.match(classicText, /shared victory/i);
  assert.match(classicText, /if speed bonuses are switched on/i);
  const boardIntro = duoIntros.board.map(([, text]) => text).join(' ');
  assert.match(boardIntro, /roll the die and move your piece/i);
  assert.match(boardIntro, /everyone answers/i);
  assert.doesNotMatch(boardIntro, /question to keep moving/i);
});
