import assert from 'node:assert/strict';
import test from 'node:test';
import { punchlineV3, blankV3, cardV3 } from '../party-content-v3.js';
import { partyView } from '../public/party-views.js';

test('Party Games 2.0 adds 100 varied, distinct family-friendly items', () => {
  assert.equal(punchlineV3.length, 30);
  assert.equal(blankV3.length, 30);
  assert.equal(cardV3.length, 40);
  for (const [name,entries] of [['punchline',punchlineV3],['blank',blankV3],['cards',cardV3]]) {
    assert.equal(new Set(entries.map(s=>s.toLowerCase().trim())).size, entries.length, name+' contains duplicates');
    for (const entry of entries) {
      assert.equal(typeof entry, 'string');
      assert.ok(entry.length >= 12 && entry.length <= 180, name+' entry length');
      assert.ok(!/\b(?:fuck|shit|rape|porn)\b/i.test(entry), 'unexpected adults-only phrase');
    }
  }
  for(const phrase of blankV3) assert.equal(phrase.split('____').length, 2, 'one blank per phrase');
  for(const phrase of cardV3) assert.ok(!phrase.includes('____'), 'cards should be standalone noun phrases');
});

test('players see their refresh option and correctly labelled final-round ballot', () => {
  const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const helpers = {host:false,canControl:false,escape:esc,reply:'',icons:()=>''};
  const roster = Array.from({length:8},(_,index)=>({id:String(index),name:'Player '+index,score:0}));
  const party = {
    prompt:'The festival has been cancelled because of ____.',
    tracks:[],hand:['a goose','a kite','a balloon','a robot','a helmet','a bicycle'],
    entries:new Map(), votes:new Map(),redrawAvailable:true,wrote:false,voted:false,
    ballot:roster.map((player,i)=>({id:player.id,text:'Card '+i,yours:i===0})),
    submissions:2,responseTarget:8,shortlisted:0,votePoints:200
  };
  const state = {mode:'cards',phase:'party-write',index:2,total:3,party,players:roster,
    playStyle:'individual',teams:[]};
  const writing=partyView(state,helpers);
  assert.match(writing, /data-action="social-redraw"/);
  assert.match(writing, /Final round/);
  const voting=partyView({...state,phase:'party-vote',party:{...party,hand:undefined}},helpers);
  assert.match(voting, /All 8 entries are included/);
  assert.equal((voting.match(/data-action="bluff-vote"/g)||[]).length,7,'players can vote for every other entry');
  assert.match(voting,/200 points/);
});