// Original drawable categories. Scenarios combine tested grammatical building blocks;
// no third-party proprietary clue banks or character images are required.
import {randomInt} from 'node:crypto';
import {questionHistoryId} from './public/question-history.js';
import {sketchObjectsV4} from './creative-expansion-v4.js';
import {sketchObjectsV5} from './creative-expansion-v5.js';
const objects=["bicycle","rainbow","ice cream cone","football","basketball","swimming goggles","sandcastle","lighthouse","telescope","volcano","treasure chest","pirate ship","hot air balloon","rocket","roller coaster","campfire","snowman","snowflake","treehouse","toothbrush","umbrella","teapot","alarm clock","train","backpack","camera","birthday cake","bookcase","guitar","piano","sunflower","wheelbarrow","scarecrow","waterfall","bridge","castle","dragon","wizard hat","robot","spaceship","moon","solar system","dinosaur","hedgehog","butterfly","octopus","jellyfish","penguin","giraffe","elephant","raincloud","toaster","skateboard","microscope","lifebuoy","traffic light","bowling pins","bus stop","bow tie","paintbrush"];
const animals=["giraffe","penguin","elephant","octopus","hedgehog","kangaroo","fox","owl","panda","tiger","dog","cat","rabbit","dinosaur","dragon","monkey","hippo","crocodile","parrot","llama"];
const situations=["riding a bicycle","playing basketball","wearing sunglasses","driving a bus","eating spaghetti","holding an umbrella","playing a guitar","building a sandcastle","flying a kite","carrying a birthday cake","sleeping in a hammock","wearing a superhero cape"];
export const sketchPrompts=Object.freeze([
  ...objects.map((answer,index)=>Object.freeze({id:'object-'+index,answer,category:'Objects & places',difficulty:'easy',aliases:[],historyId:questionHistoryId('sketch:'+answer)})),
  // v4 objects keep their own ids, so existing prompt ids and histories never shift.
  ...sketchObjectsV4.filter(answer=>!objects.includes(answer)&&!animals.includes(answer)).map((answer,index)=>Object.freeze({id:'object-v4-'+index,answer,category:'Objects & places',difficulty:'easy',aliases:[],historyId:questionHistoryId('sketch:'+answer)})),
  ...sketchObjectsV5.filter(answer=>!objects.includes(answer)&&!animals.includes(answer)&&!sketchObjectsV4.includes(answer)).map((answer,index)=>Object.freeze({id:'object-v5-'+index,answer,category:'Objects & places',difficulty:'easy',aliases:[],historyId:questionHistoryId('sketch:'+answer)})),
  ...animals.flatMap((animal,i)=>situations.map((action,j)=>{
    const answer=animal+' '+action;
    return Object.freeze({id:'scene-'+i+'-'+j,answer,category:'Silly scenes',difficulty:j<4?'standard':'challenge',aliases:['a '+answer],historyId:questionHistoryId('sketch:'+answer)});
  })),
]);
export function normaliseSketchGuess(value){return String(value??'').normalize('NFKD').toLocaleLowerCase('en-GB')
  .replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ')
  .replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim().replace(/^(?:a|an|the) /,'');}
export function chooseSketchPrompt(seen=new Set()){
  const fresh=sketchPrompts.filter(p=>!seen.has('sketch:'+p.id)&&!seen.has(p.historyId));
  const list=fresh.length?fresh:sketchPrompts;
  return list[randomInt(list.length)];
}
