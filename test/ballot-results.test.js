import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { winnerBanner, playerFinish } from '../public/result-highlights.js';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;');

test('game finals show the actual highest score and preserve joint winners', () => {
  const state={mode:'classic', playStyle:'individual', teams:[], players:[
    {name:'Alex',score:300,lives:2},
    {name:'Bailey',score:300,lives:2},
    {name:'Charlie',score:200,lives:2}
  ]};
  const html=winnerBanner(state,escape);
  assert.match(html,/SHARED VICTORY/);
  assert.match(html,/Alex · Bailey/);
  assert.match(html,/300 points/);
  assert.doesNotMatch(html,/Charlie/);
});

test('team finals use server-selected winning team IDs, not an inferred leader', () => {
  const state={mode:'showdown',playStyle:'teams',teamWinners:['blue'],teams:[
    {id:'red',name:'Red',score:800},
    {id:'blue',name:'Blue',score:900},
  ],players:[]};
  const html=winnerBanner(state,escape);
  assert.match(html,/WINNING TEAM/);
  assert.match(html,/Team Blue/);
  assert.match(html,/900 points/);
  assert.doesNotMatch(html,/Team Red/);
});

test('winner names are escaped and personal scorecards display ranking correctly', () => {
  const html=winnerBanner({mode:'classic',playStyle:'individual',teams:[],players:[{name:'<Winner>',score:250}]},escape);
  assert.ok(html.includes('&lt;Winner>') || html.includes('&lt;Winner&gt;'));
  assert.doesNotMatch(html,/<Winner>/);
  const personal=playerFinish({rank:2,playerCount:5,player:{score:1234}});
  assert.match(personal,/YOUR FINISH/);
  assert.match(personal,/#2/);
  assert.match(personal,/of 5 players/);
  assert.match(personal,/1,234/);
  assert.equal(playerFinish({rank:0,playerCount:5,player:{score:2}}),'');
});

test('mobile live voting remains scrollable without deck splitting', async () => {
  const [deck,app,css,markup]=await Promise.all([
    readFile(new URL('../public/mobile-deck.js', import.meta.url),'utf8'),
    readFile(new URL('../public/app.js', import.meta.url),'utf8'),
    readFile(new URL('../public/ballot-results.css', import.meta.url),'utf8'),
    readFile(new URL('../public/index.html', import.meta.url),'utf8')
  ]);
  for(const phase of ['party-vote','party-reveal','top-poll','top-guess','top-reveal']) {
    assert.doesNotMatch(deck,/data-deck-hidden|mobile-pager/,phase+' is never split into pages');
    assert.ok(css.includes('[data-phase="'+phase+'"]'),phase+' should scroll');
  }
  assert.match(css,/overflow-y: auto/);
  assert.match(app,/const playerScroll = !enter/);
  assert.match(app,/app\.scrollTop = playerScroll/);
  assert.match(markup,/href="\/ballot-results\.css"/);
});