import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { partyFinale } from '../public/party-finale.js';
import { partyView } from '../public/party-views.js';
import { bluffView } from '../public/bluff-view.js';
import { samePageView } from '../public/same-page-view.js';
import { topAnswersView } from '../public/top-answers-view.js';
import { rareFindView } from '../public/rare-find-view.js';
import { sketchView } from '../public/sketch-view.js';

const escape = text => String(text).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const host = { host: true, canControl: false, escape, icons: () => '', reply: '' };
const phone = { ...host, host: false };
const players = [
  { id: 'a', name: 'Alex', score: 200, lives: 2, wins: 1 },
  { id: 'b', name: 'Bailey', score: 200, lives: 2, wins: 1 },
  { id: 'c', name: 'Charlie', score: 100, lives: 1, wins: 0 },
];
const room = (mode, party = {}) => ({
  mode, phase: 'finished', index: 2, total: 3, game: 1, code: '123456',
  playStyle: 'individual', teams: [], party,
  players, playerCount: 3, player: players[1], rank: 1,
});

test('party winners respect tied players and never expose unescaped names', () => {
  const state = room('bluff');
  const result = partyFinale(state, host);
  assert.match(result, /SHARED VICTORY/);
  assert.match(result, /Alex · Bailey/);
  assert.match(result, /200 points/);
  assert.doesNotMatch(result, /Charlie/);
  const escaped = partyFinale({...state, players:[{...players[0],name:'<script>'}]},host);
  assert.match(escaped, /&lt;script&gt;/);
  assert.doesNotMatch(escaped, /<script>/);
});

test('phone finale uses the actual published individual rank and score', () => {
  const result = partyFinale(room('rare'), phone);
  assert.match(result, /YOUR FINISH/);
  assert.match(result, /#1/);
  assert.match(result, /200/);
});

test('Hot Potato reports the player caught rather than declaring a winner', () => {
  const state = room('potato',{holder:{id:'b',name:'Bailey'},passes:12});
  const result = partyFinale(state,{...phone,variant:'potato'});
  assert.match(result, /You got caught!/);
  assert.match(result, /12 successful passes/);
  assert.doesNotMatch(result, /GAME WINNER|SHARED VICTORY|YOUR FINISH/);
  const seen = partyView(state, phone);
  assert.match(seen, /THE TIMER RAN OUT/);
  assert.match(seen, /You got caught!/);
  assert.match(seen, /party-phone-finish/);
  assert.doesNotMatch(seen, /got caught with the potato!/);
  assert.doesNotMatch(seen, /GAME WINNER/);
  const tv = partyView(state,host);
  assert.match(tv, /Bailey got caught with the potato!/);
  assert.match(tv, /class="party-holder"/);
});

test('Punchline Party phones show personal result with optional full scores, TV retains public podium', () => {
  const state = room('punchline', { tracks: [] });
  const personal = partyView(state,phone);
  assert.match(personal,/YOUR FINISH/);
  assert.match(personal,/#1/);
  assert.match(personal,/View all scores without a TV/);
  assert.match(personal,/<details class="party-phone-scores">/);
  assert.doesNotMatch(personal,/<ol class="ranking">/);
  assert.doesNotMatch(personal,/SHARED VICTORY/);
  const tv = partyView(state,host);
  assert.match(tv,/SHARED VICTORY/);
  assert.match(tv,/<ol class="ranking">/);
  assert.doesNotMatch(tv,/party-phone-scores/);
});

test('Fill the Blank phone hides detailed team scores by default and escapes names', () => {
  const state = {...room('cards', { tracks: [] }), playStyle: 'teams',
    teamWinners: ['blue'],
    teams: [
      {id:'blue',name:'Blue <test>',score:500,color:'#abcdef'},
      {id:'red',name:'Red',score:250,color:'#fedcba'},
    ],
    players: [
      {...players[0],name:'Alex <img src=x onerror=alert(1)>'},
      players[1],players[2],
    ],
  };
  const personal = partyView(state,phone);
  assert.match(personal,/YOUR FINISH/);
  assert.match(personal,/View all scores without a TV/);
  assert.match(personal,/Team Blue &lt;test&gt;/);
  assert.match(personal,/Alex &lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(personal,/<img src=x/);
  assert.doesNotMatch(personal,/class="party-team-scores"/);
  const tv = partyView(state,host);
  assert.match(tv,/WINNING TEAM/);
  assert.match(tv,/class="party-team-scores"/);
  assert.doesNotMatch(tv,/party-phone-scores/);
});

test('Fork in the Tracks presents the judge result without inventing a winning team', () => {
  const state = room('tracks');
  const display = partyFinale(state,{...host,variant:'tracks'});
  assert.match(display, /All tracks explored/);
  assert.doesNotMatch(display, /WINNING TEAM|GAME WINNER/);
});

test('team party finales use server-specified winning team IDs', () => {
  const state = {...room('cards',{tracks:[]}),playStyle:'teams',teamWinners:['blue'],
    teams:[{id:'blue',name:'Blue',score:500},{id:'red',name:'Red',score:250}]};
  const html = partyView(state,host);
  assert.match(html, /WINNING TEAM/);
  assert.match(html, /Team Blue/);
  assert.doesNotMatch(html, /WINNING TEAM[\s\S]*Team Red wins/);
});

test('each scored party game renders the right result summary', () => {
  const games = [
    [s=>bluffView(s,host),room('bluff',{replies:[]})],
    [s=>samePageView(s,host),room('samepage',{type:'samepage'})],
    [s=>topAnswersView(s,host),room('topanswers',{type:'topanswers'})],
    [s=>rareFindView(s,host),room('rare',{type:'rare'})],
    [s=>sketchView(s,host),room('sketch',{artist:{name:'Alex'},guessers:[],category:'Animals',answer:'Owl',correctCount:0})],
  ];
  for(const [view,state] of games) {
    const html=view(state);
    assert.match(html, /SHARED VICTORY/, state.mode+' should show tied winners');
    assert.match(html, /200 points/, state.mode+' should show real score');
    assert.doesNotMatch(html, /data-action="bluff-vote"/);
  }
});

test('all party finale integrations, continuous scroll and reduced motion are present', async () => {
  const dir = new URL('../public/',import.meta.url);
  for(const file of [
    'party-views.js','bluff-view.js','same-page-view.js','spotlight-view.js',
    'brain-ladder-view.js','top-answers-view.js','rare-find-view.js',
    'sketch-view.js','fork-view.js'
  ]) {
    const source = await readFile(new URL(file,dir),'utf8');
    assert.match(source,/partyFinale\(/,file+' must render a shared outcome');
  }
  const [deck,app,css,index]=await Promise.all([
    readFile(new URL('mobile-deck.js',dir),'utf8'),
    readFile(new URL('app.js',dir),'utf8'),
    readFile(new URL('party-finales.css',dir),'utf8'),
    readFile(new URL('index.html',dir),'utf8')
  ]);
  assert.match(deck,/\.game\.player-only:not\(\[data-phase="lobby"\]\):not\(\[data-phase="waiting"\]\)/);
  assert.match(css,/overflow-y: auto/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(app,/'finished'\]\.includes\(s.phase\)/);
  assert.match(index,/href="\/party-finales\.css"/);
});