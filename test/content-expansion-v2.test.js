import assert from 'node:assert/strict';
import {test} from 'node:test';
import {extraChoiceQuestions,extraBooleanQuestions,extraEstimateQuestions,extraOrderQuestions} from '../question-expansion-v2.js';
import {v2Punchlines,v2Blanks,v2Cards,v2Samepage,v2Bluff,v2ForkGood,v2ForkBad,v2Topanswers} from '../creative-expansion-v2.js';
import {makeQuestions,boardQuestion,questionCategories} from '../questions.js';
import {categories,categoryGroups,modes,questionCounts} from '../public/game-config.js';
import {topAnswersPrompts} from '../top-answers.js';
import {samePagePrompts} from '../same-page.js';
import {rareFindBank,answerMapFor} from '../rare-find-bank.js';
import {brainPuzzleBank} from '../brain-ladder.js';

const normalise = str=>String(str).normalize('NFKC').toLocaleLowerCase('en-GB').replace(/\s+/g,' ').trim();
const unique=(values,description)=>{
  assert.equal(new Set(values.map(normalise)).size,values.length,'Duplicate '+description);
};
const size = values=>Object.values(values).reduce((sum,arr)=>sum+arr.length,0);
const newCategories=['language','maths'];

test('Evergreen content pack is additive and every original question has a unique prompt and four answers',()=>{
 assert.ok(size(extraChoiceQuestions)>=112);
 assert.ok(size(extraBooleanQuestions)>=24);
 assert.ok(size(extraEstimateQuestions)>=12);
 assert.ok(size(extraOrderQuestions)>=12);
 for(const [category,questions] of Object.entries(extraChoiceQuestions)){
   assert.ok(questions.length>=4,category);
   unique(questions.map(row=>row[0]),'new choice prompts in '+category);
   for(const [prompt,...options] of questions){
     assert.equal(typeof prompt,'string');
     assert.ok(prompt.length>=16&&prompt.length<=210,prompt);
     assert.equal(options.length,4,prompt);
     assert.ok(options.every(option=>typeof option==='string'&&option.trim()!==''),prompt);
     unique(options,'answer choices for '+prompt);
   }
 }
 for(const [category,questions] of Object.entries(extraBooleanQuestions)){
   unique(questions.map(row=>row[0]),'true/false prompts in '+category);
   assert.ok(questions.every(([prompt,value])=>prompt.length>=16&&typeof value==='boolean'));
 }
 for(const [category,questions] of Object.entries(extraEstimateQuestions)){
   unique(questions.map(row=>row[0]),'estimate prompts in '+category);
   for(const [prompt,answer,unit,min,max] of questions){
     assert.ok(typeof prompt==='string'&&prompt.length>=16);
     assert.ok(Number.isFinite(answer)&&min<=answer&&answer<=max,'Bad numeric bound: '+prompt);
     assert.equal(typeof unit,'string');
   }
 }
 for(const [category,questions] of Object.entries(extraOrderQuestions)){
   unique(questions.map(row=>row[0]),'ordering prompts in '+category);
   for(const [prompt,...options] of questions){
     assert.ok(prompt.length>=16);
     assert.equal(options.length,4);
     unique(options,'ordering answers in '+prompt);
   }
 }
});
test('Two added genres are playable in every trivia format, including Board Race level six and mixed Wheel',()=>{
 const configured=new Set(categories.map(row=>row[0]));
 assert.equal(configured.size,categories.length,'Category IDs must be unique');
 assert.equal(modes.length,19,'The game library must retain all 18 previous games and So Close');
 assert.equal(categories.length,19,'The library must expose 18 named topics and Mixed Bag');
 assert.equal(questionCategories.length,18);
 for(const category of newCategories){
   assert.ok(configured.has(category),category+' not in UI');
   assert.ok(questionCategories.includes(category),category+' not in live question library');
   assert.ok(categoryGroups.some(([,ids])=>ids.includes(category)),category+' has no browsing group');
   assert.ok(extraChoiceQuestions[category].length>=20);
   for(const format of ['choice','boolean','estimate','order']){
     const count=questionCounts('classic',format,category).at(-1);
     const result=makeQuestions(category,count,new Set(),format,false);
     assert.equal(result.length,count,'Requested '+format+' count missing in '+category);
     unique(result.map(q=>q.prompt),'generated '+category+' '+format+' prompt');
     for(const row of result){
       assert.equal(row.category,category);
       assert.equal(row.type,format);
       if(format==='estimate'){
         assert.ok(row.min<=row.correct&&row.correct<=row.max);
       }else if(format==='order'){
         assert.deepEqual([...row.correct].sort((a,b)=>a-b),[0,1,2,3]);
         assert.equal(row.options.length,4);
       }else {
         assert.ok(Number.isInteger(row.correct)&&row.correct>=0&&row.correct<row.options.length);
         assert.equal(new Set(row.options).size,row.options.length);
       }
     }
     for(let tier=1;tier<=6;tier++){
       const q=boardQuestion(category,format,tier,new Set());
       assert.equal(q.category,category);
       assert.equal(q.difficulty,tier);
       assert.ok(q.prompt&&q.correct!==undefined,category+' '+format+' tier '+tier);
     }
   }
   const first=makeQuestions(category,8,new Set(),'choice',true);
   const seen=new Set(first.map(q=>q.prompt));
   const second=makeQuestions(category,8,seen,'choice',true);
   assert.ok(second.every(q=>!seen.has(q.prompt)),'Fresh prompts should win before repeats for '+category);
 }
 const mixed=makeQuestions('mixed',60,new Set(),'choice',false);
 assert.equal(mixed.length,60);
 assert.ok(mixed.some(q=>q.category==='language'));
 assert.ok(mixed.some(q=>q.category==='maths'));
 unique(mixed.map(q=>q.prompt),'mixed-topic selection');
});
test('All new subjective prompts and answer cards have unique, usable entries without invented survey numbers',()=>{
 const pools={punchlines:v2Punchlines,blanks:v2Blanks,cards:v2Cards,samepage:v2Samepage,bluff:v2Bluff,good:v2ForkGood,bad:v2ForkBad};
 assert.ok(Object.values(pools).reduce((s,arr)=>s+arr.length,0)+v2Topanswers.length>=227);
 for(const [id,items] of Object.entries(pools)){
   assert.ok(items.length>=16,id);
   unique(items,'creative '+id+' prompts');
   assert.ok(items.every(item=>typeof item==='string'&&item.length>=12&&item.length<=170),id+' length');
 }
 assert.ok(v2Blanks.every(prompt=>prompt.split('____').length===2),'Each blank must have exactly one playable gap');
 unique(v2Topanswers.map(row=>row[0]),'Top Answers polls');
 for(const [prompt,...options] of v2Topanswers){
   assert.equal(options.length,4,prompt);
   unique(options,'poll options '+prompt);
   assert.ok(!/\b(?:national|100 people|survey said|survey found)\b/i.test(prompt),'No invented survey claims');
 }
 assert.ok(topAnswersPrompts.length>=110);
 assert.ok(samePagePrompts.length>=85);
 unique(topAnswersPrompts.map(x=>x.prompt),'Top Answers entire bank');
 unique(samePagePrompts,'Same Page entire bank');
});
test('Finite Rare Find aliases remain conflict-free and algorithmic Brain Ladder grows with calculated unique answers',()=>{
 assert.ok(rareFindBank.length>=40);
 unique(rareFindBank.map(x=>x.prompt),'Rare Find prompts');
 for(const prompt of rareFindBank){
   assert.ok(prompt.answers.length>=3);
   assert.ok(answerMapFor(prompt).size>=prompt.answers.length);
 }
 assert.equal(brainPuzzleBank.length,10);
 assert.ok(brainPuzzleBank.every(level=>level.length===24));
 unique(brainPuzzleBank.flat().map(q=>q.prompt),'Brain Ladder puzzles');
 for(const puzzle of brainPuzzleBank.flat()){
   assert.equal(puzzle.options.length,4);
   assert.equal(new Set(puzzle.options).size,4);
   assert.equal(puzzle.options.filter(option=>option===puzzle.answer).length,1);
 }
});
