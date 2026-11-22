import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boardRoute, boardFork, boardPath, boardFinish,
  boardMappedPosition, boardRequiresChoice, boardPathChoices,
} from '../public/board-route.js';

test('fork paths share a start, junction, rejoin and finish at all board sizes', () => {
  for (const spaces of [16,24,32,40]) {
    const normal=boardRoute(spaces,false);
    const power=boardPath(spaces,false,'power');
    const quiz=boardPath(spaces,false,'questions');
    const {start,rejoin,extra}=boardFork(spaces);
    assert.equal(extra,4);
    assert.equal(power.length,spaces+1);
    assert.equal(quiz.length,spaces+extra+1);
    for (let i=0;i<=start;i++) assert.deepEqual(quiz[i].x,normal[i].x);
    assert.deepEqual([quiz[start].x,quiz[start].z,quiz[start].category],
      [power[start].x,power[start].z,power[start].category]);
    assert.deepEqual([quiz[rejoin+extra].x,quiz[rejoin+extra].z],
                     [power[rejoin].x,power[rejoin].z]);
    assert.deepEqual([quiz.at(-1).x,quiz.at(-1).z],
                     [power.at(-1).x,power.at(-1).z]);
    assert.equal(boardFinish(spaces,'power'),spaces);
    assert.equal(boardFinish(spaces,'questions'),spaces+4);
    assert.equal(quiz.at(-1).finish,true);
    assert.ok(quiz.slice(start+1,rejoin+extra).every(t=>t.lane==='questions' && t.category));
    assert.ok(power.slice(start+1,rejoin).every(t=>t.lane==='power' && t.category));
  }
});

test('route choice is needed before a die can cross the fork', () => {
  assert.equal(boardRequiresChoice(16,0,undefined),true);
  assert.equal(boardRequiresChoice(24,0,undefined),false);
  assert.equal(boardRequiresChoice(24,1,undefined),true);
  assert.equal(boardRequiresChoice(24,6,undefined),true);
  assert.equal(boardRequiresChoice(24,2,'power'),false);
});

test('progress follows geographic position after long-route rejoin', () => {
  for(const length of [16,24,32,40]){
    const {start,rejoin,extra}=boardFork(length);
    assert.equal(boardMappedPosition(length,start,'questions'),start);
    assert.equal(boardMappedPosition(length,rejoin+extra,'questions'),rejoin);
    assert.equal(boardMappedPosition(length,length+extra,'questions'),length);
    assert.equal(boardMappedPosition(length,length,'power'),length);
    assert.ok(boardMappedPosition(length,start+2,'questions')<start+2);
  }
});
test('two supported routes are separately named for the UI',()=>{
  assert.deepEqual(boardPathChoices.map(path=>path.id),['power','questions']);
  assert.match(boardPathChoices[0].detail,/×2/);
  assert.match(boardPathChoices[1].detail,/Four extra/);
});
