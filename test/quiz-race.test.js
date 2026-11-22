import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuizRace, advanceQuizRace, submitRaceAnswer, raceMovement, raceSpeed, boostEffect, setRacePaused, publicRaceState, racePlacings } from '../quiz-race.js';
import { minimumPlayers, modes } from '../public/game-config.js';

const sample = [
  { type:'choice', category:'general', prompt:'Which planet is red?', options:['Venus','Mars','Saturn','Jupiter'], correct:1 },
  { type:'choice', category:'general', prompt:'How many?', options:['One','Two','Three','Four'], correct:3 },
];
const players = [ ['key-a', {id:'a',name:'Alex'}], ['key-b',{id:'b',name:'Blake'}] ];
const make = (now=0, options={}) => createQuizRace(players,sample,options,now);
const start = () => {const race=make();advanceQuizRace(race,3100);return race;};

test('Quiz Race is a distinct registered mode needing two players', () => {
  assert.ok(modes.some(([id])=>id==='quizrace'));
  assert.equal(minimumPlayers('quizrace'),2);
  assert.throws(()=>createQuizRace(players.slice(0,1),sample), /2 to 8/);
  assert.throws(()=>createQuizRace(players,[],{}),/question pool/);
});

test('all racers start stationary then move and receive independent questions', () => {
  const race=make();
  advanceQuizRace(race,2500);
  assert.equal(race.racers.get('key-a').distance,0);
  assert.equal(race.racers.get('key-a').question,null);
  advanceQuizRace(race,3050);
  assert.ok(race.racers.get('key-a').distance>0);
  assert.equal(race.racers.get('key-a').question.id,1);
  assert.equal(race.racers.get('key-b').question.id,1);
});

test('faster correct answers create stronger boosts than slower correct answers', () => {
  assert.ok(boostEffect('correct',2).amount > boostEffect('correct',10).amount);
  const a=start();
  const b=start();
  assert.equal(submitRaceAnswer(a,'key-a',{questionId:1,option:1},5000).status,204);
  assert.equal(submitRaceAnswer(b,'key-a',{questionId:1,option:1},12000).status,204);
  assert.ok(a.racers.get('key-a').effect.amount > b.racers.get('key-a').effect.amount);
  assert.equal(a.racers.get('key-a').correct,1);
});

test('wrong, pass and timeout are different recoverable slowdowns', () => {
  assert.equal(boostEffect('wrong').amount,-.45);
  assert.equal(boostEffect('pass').amount,-.30);
  assert.equal(boostEffect('timeout').amount,-.60);
  const r=start();
  assert.equal(submitRaceAnswer(r,'key-a',{questionId:1,option:0},r.time).status,204);
  assert.equal(submitRaceAnswer(r,'key-b',{questionId:1,pass:true},r.time).status,204);
  assert.equal(r.racers.get('key-a').wrong,1);
  assert.equal(r.racers.get('key-b').passed,1);
  assert.ok(raceSpeed(r.racers.get('key-a'),r.time)<raceSpeed(r.racers.get('key-b'),r.time));
  assert.equal(raceSpeed(r.racers.get('key-a'),r.time+5000),1);
  const t=start();
  advanceQuizRace(t,16000);
  assert.ok(t.racers.get('key-a').timeouts>=1);
});

test('duplicate, stale and malformed submissions are refused', () => {
  const r=start();
  assert.equal(submitRaceAnswer(r,'key-a',{questionId:99,option:1}).status,409);
  assert.equal(submitRaceAnswer(r,'key-a',{questionId:1,option:13}).status,400);
  assert.equal(submitRaceAnswer(r,'key-a',{questionId:1,pass:true,option:1}).status,400);
  assert.equal(submitRaceAnswer(r,'key-a',{questionId:1,option:1}).status,204);
  assert.equal(submitRaceAnswer(r,'key-a',{questionId:1,option:1}).status,409);
  assert.equal(submitRaceAnswer(r,'key-a',{questionId:1,pass:true}).status,409);
});

test('effects integrate exact time and never move backwards', () => {
  const r=start(),a=r.racers.get('key-a');
  const slow={...a,effect:{...boostEffect('timeout'),start:3100}};
  assert.ok(raceMovement(slow,3100,6100)>0);
  assert.equal(raceSpeed(slow,3100),.4);
  assert.equal(raceSpeed(slow,6100),1);
  assert.ok(raceMovement({...slow,effect:{...boostEffect('correct',0),start:3100}},3100,6100)>3);
});

test('paused racing freezes movement, deadlines, and effects until resumed', () => {
  const r=start();
  const dist=r.racers.get('key-a').distance;
  assert.ok(setRacePaused(r,true,4000));
  const frozen=r.time;
  const pausedDistance=r.racers.get('key-a').distance;
  advanceQuizRace(r,30000);
  assert.equal(r.time,frozen);
  assert.equal(r.racers.get('key-a').distance,pausedDistance);
  assert.ok(setRacePaused(r,false,30000));
  advanceQuizRace(r,31000);
  assert.ok(r.time>frozen);
  assert.ok(r.racers.get('key-a').distance>dist);
});

test('first crossing time wins independent of player array order', () => {
  const r=start();
  const a=r.racers.get('key-a'),b=r.racers.get('key-b');
  a.distance=r.length-.15;b.distance=r.length-.20;
  a.effect={...boostEffect('wrong'),start:r.time};
  b.effect={...boostEffect('correct',0),start:r.time};
  advanceQuizRace(r,3500);
  assert.equal(r.results[0].id,'b');
  assert.equal(racePlacings(r)[0].id,'b');
  assert.equal(publicRaceState(r,'key-a',true).winner,'b');
});

test('private question answers are not exposed to the TV or other players', () => {
  const r=start();
  const host=publicRaceState(r,'host',true);
  const a=publicRaceState(r,'key-a',false);
  assert.equal(host.own,undefined);
  assert.equal(a.own.question.prompt,sample[0].prompt);
  assert.equal(a.own.question.correct,undefined);
  assert.equal(JSON.stringify(host).includes('Which planet'),false);
  assert.equal(JSON.stringify(host).includes('Mars'),false);
});
