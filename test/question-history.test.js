import assert from 'node:assert/strict';
import test from 'node:test';
import {questionHistoryId, validQuestionHistoryId, readQuestionHistory, rememberQuestion} from '../public/question-history.js';
import {makeQuestions} from '../questions.js';
import {verifiedChoiceQuestions, questionAudit} from '../verified-questions.js';

test('stable question history IDs normalise case, whitespace and punctuation safely',()=>{
  const a=questionHistoryId('  Which  planet is the hottest? ');
  const b=questionHistoryId('which planet is the hottest?');
  assert.equal(a,b);
  assert.ok(validQuestionHistoryId(a));
  assert.ok(!validQuestionHistoryId('raw question text'));
  assert.ok(!validQuestionHistoryId('q1-012'));
});

test('new reference-backed multiple choice entries pass structural checks',()=>{
  assert.deepEqual(questionAudit(),[]);
  assert.ok(Object.values(verifiedChoiceQuestions).flat().length>=13);
  for(const rows of Object.values(verifiedChoiceQuestions)) for(const q of rows){
    assert.ok(q.source.startsWith('https://'));
    assert.equal(q.status,'verified');
    assert.equal(new Set([q.answer,...q.distractors]).size,4);
  }
});

test('quiz selection respects persistent IDs from an earlier game',()=>{
  const all=makeQuestions('space',100,new Set(),'choice');
  assert.ok(all.length>1,'Need at least two available space questions to test freshness');
  const last=all.at(-1).prompt;
  const history=new Set(all.slice(0,-1).map(row=>questionHistoryId(row.prompt)));
  const next=makeQuestions('space',1,history,'choice');
  assert.equal(next[0].prompt,last);
});

test('question history local storage gracefully handles privacy modes',()=>{
  const old=globalThis.localStorage;
  try {
    globalThis.localStorage={getItem(){throw Error('disabled')},setItem(){throw Error('disabled')}};
    assert.deepEqual(readQuestionHistory(),[]);
    assert.doesNotThrow(()=>rememberQuestion(questionHistoryId('A question')));
  } finally {
    if(old===undefined) delete globalThis.localStorage;
    else globalThis.localStorage=old;
  }
});
