import assert from 'node:assert/strict';
import test from 'node:test';
import { placementRanks } from '../result-ranks.js';
import { createQuizRace, racePlacings } from '../quiz-race.js';

const compare = (a, b) => (b.lives ?? 0) - (a.lives ?? 0) || b.score - a.score;
const points = [...['Alex', 'Blake', 'Charlie'].entries()].map(([i, name]) =>
  ({id: String(i), name, score: 100, lives: undefined}));

test('Quiz Race gives separate finishing places even when all racer scores round to 100', () => {
  const pool = [{type:'choice',category:'general',prompt:'Which one?',options:['Yes','No'],correct:0}];
  const entries = points.map((player,i)=>['key-'+i,player]);
  const race = createQuizRace(entries,pool,{length:'short'});
  race.racers.get('key-0').finishedAt = 95_000; // Second place
  race.racers.get('key-1').finishedAt = 90_000; // First place
  race.racers.get('key-2').finishedAt = undefined;
  race.racers.get('key-2').distance = 69;
  const order = racePlacings(race).map(racer=>points.find(player=>player.id===racer.id));
  assert.deepEqual(order.map(x=>x.id),['1','0','2']);
  // The server must rank by the finishing order, not by shared integer score.
  const ranks = placementRanks(order, compare, true);
  assert.deepEqual([...ranks.entries()],[['1',1],['0',2],['2',3]]);
  assert.equal(ranks.get('0'),2);
  assert.equal(ranks.get('1'),1);
});

test('Classic Quiz and team games preserve legitimate tied positions', () => {
  const rows = [
    {id:'a',score:600,lives:2},
    {id:'b',score:600,lives:2},
    {id:'c',score:450,lives:2},
    {id:'d',score:450,lives:2},
    {id:'e',score:350,lives:1},
  ];
  const ranks = placementRanks(rows,compare);
  assert.deepEqual([...ranks.values()],[1,1,3,3,5]);
});

test('A player with the same score but a different identity cannot steal a racing place', () => {
  const ranks = placementRanks(points,compare,true);
  assert.equal(ranks.get('0'),1);
  assert.equal(ranks.get('1'),2);
  assert.equal(ranks.get('2'),3);
  assert.equal(ranks.get('not-a-player'),undefined);
  assert.deepEqual([...placementRanks([],compare)],[]);
});

test('Ranking remains stable over repeated state publication and does not mutate input', () => {
  const before = JSON.stringify(points);
  const one = placementRanks(points,compare,true);
  const two = placementRanks(points,compare,true);
  assert.deepEqual(one,two);
  assert.equal(JSON.stringify(points),before);
});
