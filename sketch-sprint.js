// Sketch Sprint: all authority, secrets and points live on the server.
import {randomInt} from 'node:crypto';
import {connectedPlayers} from './room-presence.js';
import {clockExpired,stopDeadline,watchDeadline} from './room-clock.js';
import {chooseSketchPrompt,normaliseSketchGuess} from './sketch-prompts.js';
const inkColours=new Set(['#17223d','#e64e74','#258dd3','#21a77d','#edae49']);
const roundSeconds=90;
function shuffle(values){const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=randomInt(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function nextArtist(room,keys){
 room.sketchQueue=(room.sketchQueue??[]).filter(key=>keys.includes(key));
 if(!room.sketchQueue.length)room.sketchQueue=shuffle(keys);
 return room.sketchQueue.shift();
}
export function startSketchRound(room,publish){
 const keys=connectedPlayers(room);
 if(keys.length<3){room.phase='finished';room.ends=0;stopDeadline(room);publish(room);return;}
 const artist=nextArtist(room,keys);
 const prompt=chooseSketchPrompt(room.seen);
 room.seen.add('sketch:'+prompt.id);
 room.party={type:'sketch',artist,prompt,strokes:[],points:0,guesses:new Map(),wrong:new Map(),earned:new Map(),correctOrder:[],clears:0};
 room.opened=Date.now();room.ends=room.opened+roundSeconds*1000;
 room.phase='sketch-draw';
 watchDeadline(room,()=>expireSketch(room,publish));
 publish(room);
}
function revealSketch(room,publish){
 if(room.phase!=='sketch-draw')return;
 const p=room.party;
 if(p.correctOrder.length){
   room.players.get(p.artist).score+=50;
   p.earned.set(p.artist,50);
 }
 room.phase='sketch-reveal';room.ends=0;stopDeadline(room);
 publish(room);
}
export function expireSketch(room,publish){if(room.mode==='sketch'&&room.phase==='sketch-draw'&&clockExpired(room))revealSketch(room,publish);}
export function advanceSketch(room,publish){
 if(room.phase==='sketch-draw')return revealSketch(room,publish);
 if(room.phase!=='sketch-reveal')return;
 if(room.index+1<room.count){room.index++;return startSketchRound(room,publish);}
 room.phase='finished';publish(room);
}
function validateStroke(data){
 if(!inkColours.has(data.colour)||![2,4,8].includes(data.weight)||!Array.isArray(data.points)||data.points.length<2||data.points.length>32)return false;
 return data.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isInteger(n)&&n>=0&&n<=1000));
}
export function submitSketch(room,key,data,publish){
 if(room.mode!=='sketch'||!room.players.has(key))return [403,'Only players can take part.'];
 if(data?.game!==room.game||data?.index!==room.index||room.phase!=='sketch-draw'||clockExpired(room)){
   expireSketch(room,publish);return [409,'This drawing round has ended.'];
 }
 const p=room.party;
 if(data.action==='stroke'){
   if(key!==p.artist)return [403,'Only the current artist can draw.'];
   if(!validateStroke(data))return [400,'Use a permitted brush and 2–32 points within the drawing canvas.'];
   if(p.strokes.length>=220||p.points+data.points.length>6000)return [413,'The round has reached its drawing limit.'];
   p.strokes.push({colour:data.colour,weight:data.weight,points:data.points});p.points+=data.points.length;
   publish(room);return [204];
 }
 if(data.action==='clear'){
   if(key!==p.artist)return [403,'Only the artist can clear the canvas.'];
   if(p.clears>=3)return [409,'You have used all three clears this round.'];
   p.strokes=[];p.points=0;p.clears++;publish(room);return [204];
 }
 if(data.action==='guess'){
   if(key===p.artist)return [403,'Artists cannot submit guesses.'];
   if(p.correctOrder.includes(key))return [204];
   const raw=typeof data.text==='string'?data.text.trim():'';
   if(!raw||raw.length>90)return [400,'Enter a guess of 1–90 characters.'];
   const guess=normaliseSketchGuess(raw);
   if(!guess)return [400,'Enter a word or phrase.'];
   const tries=p.wrong.get(key)??0;
   if(tries>=5)return [409,'You have used your five guesses this round.'];
   const valid=[p.prompt.answer,...p.prompt.aliases].some(value=>normaliseSketchGuess(value)===guess);
   if(!valid){p.wrong.set(key,tries+1);publish(room,true);return [204];}
   const place=p.correctOrder.length;
   const points=place===0?150:place===1?100:75;
   p.correctOrder.push(key);p.guesses.set(key,raw);p.earned.set(key,points);room.players.get(key).score+=points;
   const eligible=connectedPlayers(room).filter(other=>other!==p.artist);
   if(eligible.length>0&&eligible.every(other=>p.correctOrder.includes(other)))revealSketch(room,publish);
   else publish(room);
   return [204];
 }
 return [409,'This action is not available now.'];
}
export function publicSketch(room,key){
 const p=room.party;if(!p)return;
 const revealed=['sketch-reveal','finished'].includes(room.phase);
 const artist=room.players.get(p.artist);
 const player=room.players.get(key);
 const ownCorrect=p.correctOrder.includes(key);
 return {type:'sketch',artist:{id:artist?.id,name:artist?.name,avatar:artist?.avatar},drawing:key===p.artist,
   category:p.prompt.category,difficulty:p.prompt.difficulty,prompt:key===p.artist||revealed?p.prompt.answer:undefined,
   strokes:p.strokes,correctCount:p.correctOrder.length,guessesMade:p.wrong.get(key)??0,
   guessed:ownCorrect,ownEarned:p.earned.get(key)??0,clearsLeft:key===p.artist?3-p.clears:undefined,
   answer:revealed?p.prompt.answer:undefined,
   guessers:revealed?p.correctOrder.map((winner,index)=>({name:room.players.get(winner)?.name,id:room.players.get(winner)?.id,points:p.earned.get(winner),position:index+1})):undefined,
   roundSeconds};
}
