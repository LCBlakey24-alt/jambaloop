import assert from 'node:assert/strict';
import test from 'node:test';
import {forkGoodCards,forkBadCards,forkScenes,forkStages,forkSentence} from '../public/fork-cards.js';
import {validPlayStyle,defaultPlayStyle,teamAssignments} from '../public/team-play.js';

test('all trolley cards are sentence-safe noun phrases, not competing clauses',()=>{
  assert.ok(forkGoodCards.length>=40);
  assert.ok(forkBadCards.length>=30);
  assert.equal(new Set(forkGoodCards).size,forkGoodCards.length);
  assert.equal(new Set(forkBadCards).size,forkBadCards.length);
  for(const card of [...forkGoodCards,...forkBadCards]){
    assert.match(card,/^(a |an |the |all )/i,'Card must be a standalone noun phrase: '+card);
    assert.doesNotMatch(card,/[.!?;,]$/);
    assert.doesNotMatch(card,/<|>/);
  }
  for(const goodOne of forkGoodCards.slice(0,8)){
    for(const bad of forkBadCards.slice(0,8)){
      for(const goodTwo of forkGoodCards.slice(8,11)){
        const text=forkSentence([goodOne,bad,goodTwo],'B');
        assert.ok(text.startsWith('If the trolley takes Track B, it will hit '));
        assert.ok(text.includes(goodOne+', '+bad+', and '+goodTwo+'.'));
        assert.equal(text.match(/\./g).length,1);
      }
    }
  }
});

test('trolley mode uses two teams, three placements and rounds with original themes',()=>{
  assert.deepEqual(forkStages.map(stage=>stage.kind),['good','bad','good']);
  assert.ok(forkScenes.length>=7);
  assert.equal(defaultPlayStyle('tracks'),'teams');
  assert.equal(validPlayStyle('tracks','individual'),false);
  assert.equal(validPlayStyle('tracks','teams'),true);
  const entries=Array.from({length:7},(_,i)=>['p'+i,{id:'i'+i,name:'P'+i}]);
  const {groups,ids}=teamAssignments(entries,'tracks','teams',2);
  assert.deepEqual(groups.map(group=>group.size),[4,3]);
  assert.deepEqual([...ids.values()],[0,1,0,1,0,1,0]);
});
