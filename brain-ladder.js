import {randomInt} from 'node:crypto';
import {questionHistoryId} from './public/question-history.js';
import {isConnected} from './room-presence.js';

// Original, deterministic reasoning puzzles. Every answer is calculated rather
// than asserted from a fictional survey or claimed population pass rate.
// Ten increasing reasoning levels, eighteen variants per level.
const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const colours=['Red','Blue','Green','Yellow','Purple'];
const positiveOptions=(value,step=1)=>[value,value-step,value+step,value+2*step];
const numberPuzzle=(level,variant,prompt,answer,explanation,step=1)=>
  ({level,variant,prompt,answer:String(answer),options:positiveOptions(answer,step).map(String),explanation});

function makePuzzle(level,v) {
  if (level===1) {
    const start=2+2*v,delta=2+v%4;
    return numberPuzzle(level,v,
      \`What number comes next? \${[0,1,2,3].map(i=>start+i*delta).join(', ')}, ?\`,
      start+4*delta,\`Each number increases by \${delta}.\`,delta);
  }
  if (level===2) {
    const start=1+v,mult=2+v%2;
    return numberPuzzle(level,v,
      \`What number comes next? \${[0,1,2].map(i=>start*mult**i).join(', ')}, ?\`,
      start*mult**3,\`Multiply each number by \${mult}.\`,mult);
  }
  if (level===3) {
    const day=v%7,offset=8+v,target=(day+offset)%7;
    return {level,variant:v,prompt:\`Today is \${days[day]}. What day of the week will it be in \${offset} days?\`,
      answer:days[target],options:[0,1,2,3].map(delta=>days[(target+delta)%7]),
      explanation:\`A week has 7 days. \${offset} days is \${Math.floor(offset/7)} full weeks plus \${offset%7} days.\`};
  }
  if (level===4) {
    const packets=3+v,items=2+v%5;
    return numberPuzzle(level,v,
      \`You have \${packets} packets, with \${items} stickers in each. How many stickers do you have?\`,
      packets*items,\`Multiply \${packets} by \${items}.\`,items);
  }
  if (level===5) {
    const start=4+v,a=2+v%5,b=a+3+v%4;
    const values=[start,start+a,start+a+b,start+2*a+b,start+2*a+2*b];
    return numberPuzzle(level,v,
      \`The jumps alternate between two sizes. What number comes next? \${values.join(', ')}, ?\`,
      start+3*a+2*b,\`The jumps alternate +\${a}, +\${b}, +\${a}, +\${b}. Next is +\${a}.\`,a);
  }
  if (level===6) {
    const hidden=3+v,mult=3+v%5,add=8+v%9,total=hidden*mult+add;
    return numberPuzzle(level,v,
      \`Find the hidden number: (□ × \${mult}) + \${add} = \${total}.\`,
      hidden,\`Subtract \${add} from \${total} then divide by \${mult}.\`);
  }
  if (level===7) {
    const n=1+v,extra=2+v%7;
    return numberPuzzle(level,v,
      \`What is next in this square-number pattern? \${[0,1,2,3].map(i=>(n+i)**2+extra).join(', ')}, ?\`,
      (n+4)**2+extra,\`The terms are consecutive perfect squares plus \${extra}.\`,n+4);
  }
  if (level===8) {
    const position=13+v,index=(position-1)%colours.length;
    return {level,variant:v,prompt:\`A colour pattern repeats: Red, Blue, Green, Yellow, Purple. Which colour is in position \${position}, counting Red as position 1?\`,
      answer:colours[index],options:[0,1,2,3].map(step=>colours[(index+step)%5]),
      explanation:\`The cycle has 5 colours. Position \${position} corresponds to position \${index+1} in the repeating cycle.\`};
  }
  if (level===9) {
    const middle=7+2*v,sum=3*middle;
    return numberPuzzle(level,v,
      \`Three consecutive odd numbers add up to \${sum}. What is the largest of the three?\`,
      middle+2,\`Their middle value is \${sum} ÷ 3 = \${middle}. The largest is 2 higher.\`,2);
  }
  const people=6+v;
  return numberPuzzle(level,v,
    \`At a gathering of \${people} people, each pair shakes hands exactly once. How many handshakes happen?\`,
    people*(people-1)/2,\`There are \${people} × \${people-1} ÷ 2 unique pairs.\`,people-1);
}

export const brainPuzzleBank=Object.freeze(
  Array.from({length:10},(_,i)=>Object.freeze(
    Array.from({length:18},(_,v)=>{
      const entry=makePuzzle(i+1,v);
      if(new Set(entry.options).size!==4 || entry.options.length!==4 ||
        !entry.options.includes(entry.answer)) throw Error('Invalid brain puzzle choices');
      return Object.freeze({...entry,id:\`brain-v1-\${i+1}-\${v}\`,historyId:questionHistoryId(entry.prompt)});
    })
  ))
);

const shuffle=list=>{
  const values=[...list];
  for(let i=values.length-1;i>0;i--){
    const j=randomInt(i+1);
    [values[i],values[j]]=[values[j],values[i]];
  }
  return values;
};

export function drawBrainPuzzle(level,seen=new Set()) {
  const pool=brainPuzzleBank[level-1];
  if(!pool) throw new Error('Invalid Brain Ladder stage');
  const unused=pool.filter(p=>!seen.has(p.id)&&!seen.has(p.historyId)&&!seen.has(p.prompt));
  const choice=(unused.length?unused:pool)[randomInt((unused.length?unused:pool).length)];
  const options=shuffle(choice.options);
  return {id:choice.id,historyId:choice.historyId,level,
    prompt:choice.prompt,options,correct:options.indexOf(choice.answer),
    explanation:choice.explanation};
}

function activeKeys(room) {
  return [...room.players.keys()].filter(key=>(room.party.lives.get(key)||0)>0);
}

function startRound(room,publish) {
  const party=room.party;
  if(!activeKeys(room).length) {
    room.phase='finished';
    publish(room);
    return;
  }
  const level=room.index+1;
  party.question=drawBrainPuzzle(level,room.seen);
  room.seen.add(party.question.id);
  room.seen.add(party.question.historyId);
  party.entries=new Map();
  party.outcomes=undefined;
  room.phase='brain-question';
  publish(room);
}

export function startBrainGame(room,publish) {
  room.party={type:'brain',lives:new Map([...room.players.keys()].map(key=>[key,2])),
    entries:new Map(),question:undefined,outcomes:undefined};
  for(const [key,player] of room.players)player.lives=2;
  return startRound(room,publish);
}

function revealBrain(room,publish) {
  const party=room.party,q=party.question,awarded=80+20*(room.index+1);
  party.outcomes=[];
  for(const key of activeKeys(room)) {
    const player=room.players.get(key),option=party.entries.get(key);
    const correct=party.entries.has(key)&&option===q.correct;
    if(correct){
      player.score+=awarded;
      player.wins++;
      player.streak++;
      player.bestStreak=Math.max(player.bestStreak,player.streak);
    } else {
      const next=(party.lives.get(key)||0)-1;
      party.lives.set(key,next);
      player.lives=next;
      player.streak=0;
      player.misses++;
    }
    party.outcomes.push({id:player.id,name:player.name,correct,
      answered:party.entries.has(key),lives:party.lives.get(key),
      gained:correct?awarded:0,eliminated:party.lives.get(key)===0});
  }
  room.phase='brain-reveal';
  publish(room);
}

export function advanceBrain(room,publish) {
  if(room.phase==='brain-question')return revealBrain(room,publish);
  if(room.phase!=='brain-reveal')return;
  if(room.index+1>=room.count || !activeKeys(room).length) {
    room.phase='finished';
    publish(room);
    return;
  }
  room.index++;
  startRound(room,publish);
}

export function submitBrain(room,key,data,publish) {
  const party=room.party;
  if(!party || party.type!=='brain'||room.phase!=='brain-question')
    return [409,'This Brain Ladder question is closed.'];
  if(data.index!==room.index)return [409,'The ladder has moved to another question.'];
  if(!room.players.has(key))return [403,'Join as a player before answering.'];
  if((party.lives.get(key)||0)===0)return [403,'You are spectating after elimination.'];
  if(data.action!=='answer' || !Number.isInteger(data.option)||
      data.option<0||data.option>=party.question.options.length)
    return [400,'Choose one of the four answers.'];
  if(party.entries.has(key))return [409,'Your answer is already locked.'];
  party.entries.set(key,data.option);
  const eligible=activeKeys(room).filter(member=>
    party.entries.has(member)||isConnected(room,member)).length;
  if(party.entries.size && party.entries.size===eligible)revealBrain(room,publish);
  else publish(room); // Everyone receives only the submission count; answers remain private.
  return [204];
}

export function publicBrain(room,key) {
  const party=room.party;
  if(!party || party.type!=='brain')return undefined;
  const revealed=room.phase==='brain-reveal'||room.phase==='finished';
  const q=party.question;
  const ownLives=party.lives.get(key);
  return {
    type:'brain',
    level:q?.level??room.index+1,
    question:q?{
      prompt:q.prompt,options:q.options,historyId:q.historyId,
      ...(revealed?{correct:q.correct,explanation:q.explanation}:{})
    }:undefined,
    roster:[...room.players].map(([member,player])=>({
      id:player.id,name:player.name,lives:party.lives.get(member)||0,score:player.score,
    })),
    submissions:party.entries.size,
    responseTarget:activeKeys(room).filter(member=>
      party.entries.has(member)||isConnected(room,member)).length,
    remaining:activeKeys(room).length,
    ownLives,
    canAnswer:room.phase==='brain-question'&&ownLives>0,
    answered:party.entries.has(key),
    ownAnswer:party.entries.get(key),
    outcomes:revealed?party.outcomes:undefined,
    earned:revealed?party.outcomes?.find(out=>out.id===room.players.get(key)?.id)?.gained:undefined,
  };
}
