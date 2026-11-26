import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boardRoute, boardFork, boardPath, boardFinish,
  boardMappedPosition, boardRequiresChoice, boardPathChoices, boardStopsAtFork } from '../public/board-route.js';

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

test('a team chooses its lane only when it is standing on the junction', () => {
  // The junction is the first corner of the lap: space 3 of 16, space 5 of 24.
  assert.equal(boardRequiresChoice(16,0,undefined),false,'not at the start of the game');
  assert.equal(boardRequiresChoice(16,2,undefined),false,'not one square short');
  assert.equal(boardRequiresChoice(16,3,undefined),true,'on the junction');
  assert.equal(boardRequiresChoice(16,3,'power'),false,'already chosen');
  assert.equal(boardRequiresChoice(24,5,undefined),true);
  // A roll that would pass the junction stops on it; landing on it or short of it is a normal move.
  assert.equal(boardStopsAtFork(16,0,6,undefined),true);
  assert.equal(boardStopsAtFork(16,0,3,undefined),false);
  assert.equal(boardStopsAtFork(16,1,1,undefined),false);
  assert.equal(boardStopsAtFork(16,2,2,undefined),true);
  assert.equal(boardStopsAtFork(16,3,3,'questions'),false,'a team that has chosen moves freely');
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

test('Board Race turn limits let the race reach the centre, and the final order never ties', async () => {
  const { suggestedTurnCap, boardTurnCaps, compareBoardTeams } = await import('../public/board-route.js');
  // Every board and piece count gets at least two spare rolls a side over the average.
  for (const spaces of [16, 24, 32, 40]) for (let pieces = 2; pieces <= 8; pieces++) {
    const cap = suggestedTurnCap(spaces, pieces);
    assert.ok(boardTurnCaps.includes(cap));
    assert.ok(cap >= (Math.ceil(spaces / 3.5) + 2) * pieces, `${spaces} spaces, ${pieces} pieces: ${cap} turns is too few`);
  }
  const order = compareBoardTeams(24);
  const side = (id, extra) => ({ id, position: 12, pathChoice: 'power', score: 30, correct: 4, pace: 2000, ...extra });
  const first = teams => [...teams].sort(order)[0].id;
  assert.equal(first([side(0), side(1, { position: 13 })]), 1, 'furthest wins');
  assert.equal(first([side(0), side(1, { score: 30.5 })]), 1, 'then points');
  assert.equal(first([side(0), side(1, { correct: 4.5 })]), 1, 'then right answers per player');
  assert.equal(first([side(0), side(1, { pace: 1999 })]), 1, 'then the faster side');
  assert.notEqual(order(side(0), side(1)), 0, 'never level');
  assert.notEqual(order(side(0, { pace: null }), side(1, { pace: null })), 0);
});
