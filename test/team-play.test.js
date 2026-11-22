import assert from 'node:assert/strict';
import test from 'node:test';
import {
  teamPlayModes, defaultPlayStyle, validPlayStyle, requiredPlayers,
  teamAssignments, refreshGroupScores,
} from '../public/team-play.js';

const people=n=>Array.from({length:n},(_,i)=>['key'+i,{id:'id'+i,name:'Player '+i,score:0}]);

test('solo/teams are supported in nine score/finish games; three vote/holder games stay solo',()=>{
  const playable=['classic','wheel','board','dice','knockout','punchline','cards','quizrace','showdown','tracks'];
  assert.deepEqual([...teamPlayModes],playable);
  for(const mode of playable){
    assert.equal(validPlayStyle(mode,'teams'),true,mode);
    assert.equal(validPlayStyle(mode,'individual'),mode!=='tracks');
  }
  for(const mode of ['bluff','potato']){
    assert.equal(validPlayStyle(mode,'teams'),false,mode);
    assert.equal(validPlayStyle(mode,'individual'),true);
  }
  assert.equal(defaultPlayStyle('board'),'teams');
  assert.equal(defaultPlayStyle('showdown'),'teams');
  assert.equal(defaultPlayStyle('tracks'),'teams');
  assert.equal(defaultPlayStyle('classic'),'individual');
  assert.equal(requiredPlayers('classic','teams',4,1),4);
  assert.equal(requiredPlayers('punchline','teams',2,3),3);
});

test('groups are balanced by signup order, with no duplicates or lost players',()=>{
  for(const count of [2,3,4]){
    const players=people(11);
    const {groups,ids}=teamAssignments(players,'classic','teams',count);
    assert.equal(groups.length,count);
    assert.equal(groups.reduce((sum,t)=>sum+t.size,0),11);
    assert.ok(Math.max(...groups.map(t=>t.size))-Math.min(...groups.map(t=>t.size))<=1);
    assert.deepEqual([...ids.values()],players.map((_,i)=>i%count));
    assert.equal(new Set(groups.flatMap(group=>group.members.map(x=>x.id))).size,11);
  }
});

test('Board Race solo uses one pawn per person and enforces four-piece limit',()=>{
  for(const n of [1,2,3,4]){
    const {groups}=teamAssignments(people(n),'board','individual',4);
    assert.equal(groups.length,n);
    assert.ok(groups.every(team=>team.size===1 && team.members[0].name===team.name));
  }
  assert.throws(()=>teamAssignments(people(5),'board','individual',4));
  const {groups}=teamAssignments(people(2),'board','teams',4,{allowUnfilled:true});
  assert.equal(groups.length,4);
  assert.equal(groups[2].size,0);
  assert.throws(()=>teamAssignments(people(2),'board','teams',4));
});

test('team scoring uses average scores to balance unequal group sizes',()=>{
  const peopleMap=new Map(people(5));
  const {groups,ids}=teamAssignments(peopleMap,'classic','teams',2);
  for(const [key,player] of peopleMap)player.team=ids.get(key);
  peopleMap.get('key0').score=600;
  peopleMap.get('key2').score=300;
  peopleMap.get('key4').score=0;
  peopleMap.get('key1').score=450;
  peopleMap.get('key3').score=150;
  const room={mode:'classic',teams:groups,players:peopleMap};
  refreshGroupScores(room);
  assert.equal(groups[0].score,300);
  assert.equal(groups[1].score,300);
});
