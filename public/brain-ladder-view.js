import { partyFinale } from './party-finale.js';
import {replayButtons} from './game-night.js';
import { face } from './player-face.js';

function ladderRail(total,index,ended) {
  const steps=Array.from({length:total},(_,i)=>total-i);
  return '<ol class="brain-steps" style="--brain-rows:'+total+'" aria-label="Reasoning levels">'+steps.map(step=>{
    const state=step<index+1?'is-cleared':step===index+1?(ended?'is-cleared':'is-current'):'is-locked';
    return '<li class="'+state+'"><span>LEVEL '+String(step).padStart(2,'0')+'</span>'+
      '<span class="brain-step-mark" aria-hidden="true">'+(step<index+1||(ended&&step===index+1)?'✓':step===index+1?'◆':'·')+'</span></li>';
  }).join('')+'</ol>';
}

function choiceBoard(party,phase,{host,escape}) {
  if(!party.question)return '';
  const showAnswer=phase==='brain-reveal'||phase==='finished';
  const canAnswer=party.canAnswer&&!party.answered&&!host;
  return '<div class="brain-answers">'+party.question.options.map((answer,i)=>{
    const correct=showAnswer&&party.question.correct===i;
    const chosen=party.ownAnswer===i;
    const css='brain-answer'+(correct?' is-correct':'')+(chosen?' is-chosen':'');
    const inside='<strong>'+('ABCD'[i])+'</strong><span>'+escape(answer)+'</span>'+
      (showAnswer&&correct?'<small>CORRECT</small>':'');
    return canAnswer?'<button type="button" class="'+css+'" data-action="brain-answer" data-option="'+i+'">'+inside+'</button>'
      :'<div class="'+css+'">'+inside+'</div>';
  }).join('')+'</div>';
}

// Everyone starts with two lives.
const hearts=lives=>'♥'.repeat(Math.max(0,lives||0))+'♡'.repeat(Math.max(0,2-(lives||0)));
export function livesLabel(lives) {
  return lives>0?'<span class="brain-own-lives" aria-label="Your lives: '+lives+' of 2">YOUR LIVES <b aria-hidden="true">'+hearts(lives)+'</b></span>'
    :'<span class="brain-own-lives is-out">YOU’RE WATCHING</span>';
}

/** This player's own result for the level just revealed. */
export function ownVerdict(party,player) {
  const outcome=party.outcomes?.find(result=>result.id===player?.id);
  if(!outcome)return '<div class="brain-verdict is-watching" role="status"><strong>You’re watching this climb</strong><span>You can still see every puzzle and solution.</span></div>';
  if(outcome.correct)return '<div class="brain-verdict is-right" role="status"><strong>✓ Right! +'+outcome.gained+' points</strong><span>'+hearts(outcome.lives)+' still climbing</span></div>';
  const miss=outcome.answered?'Not this time':'No answer in time';
  if(outcome.eliminated)return '<div class="brain-verdict is-out" role="status"><strong>✗ '+miss+': you’re out</strong><span>Watch the rest of the climb from here.</span></div>';
  return '<div class="brain-verdict is-wrong" role="status"><strong>✗ '+miss+': you lost a life</strong><span>'+hearts(outcome.lives)+' one life left</span></div>';
}

function ranking(party) {
  return [...party.roster].sort((a,b)=>b.score-a.score||b.lives-a.lives||a.name.localeCompare(b.name));
}

export function brainLadderView(state,{host,canControl,escape,icons}) {
  const {party,phase,index,total}=state;
  if(!party||party.type!=='brain')return '';
  const reveal=phase==='brain-reveal';
  const finished=phase==='finished';
  const question=party.question;
  const pointValue=80+20*(index+1);
  const leaders=ranking(party);
  const winner=leaders[0]?.score??0;
  const winners=leaders.filter(p=>p.score===winner);
  const finalHeadline=winners.length===1?escape(winners[0].name)+' tops the ladder!':'A shared top step!';
  const panel='<aside class="brain-rail"><div class="brain-rail-title"><span>THE LADDER</span><strong>'+total+' LEVELS</strong></div>'+
    ladderRail(total,index,finished)+
    '<div class="brain-remaining"><strong>'+party.remaining+'</strong><span>STILL CLIMBING</span></div>'+
    '<div class="brain-players">'+leaders.slice(0,4).map((p,i)=>'<div><b>'+(i+1)+'</b><span>'+face(p)+escape(p.name)+'</span><small>'+('♥'.repeat(p.lives)||'OUT')+'</small></div>').join('')+'</div></aside>';
  let body='';
  let next='';
  if(finished) {
    body='<div class="brain-finale"><div class="brain-micro">THE FINAL RUNG</div>'+
      '<h1>'+finalHeadline+'</h1>'+partyFinale(state,{host,escape})+'<p>Two lives. Every decision counted.</p>'+
      '<ol class="brain-final-leaders">'+leaders.map((p,i)=>'<li><span><b>'+(i+1)+'.</b> '+face(p)+escape(p.name)+'</span><span>'+('♥'.repeat(p.lives)||'ELIMINATED')+'</span><strong>'+p.score.toLocaleString()+' PTS</strong></li>').join('')+'</ol>'+
      (!host?'<p class="brain-own-final">Your result: <b>'+state.player?.score?.toLocaleString()+' points</b></p>':'')+
      (canControl?'<div class="actions">'+replayButtons(state,icons)+'</div>':'')+'</div>';
  } else {
    const answered=party.answered;
    const yourTurn=party.canAnswer;
    const response=host?'<p class="brain-status" role="status">'+party.submissions+' of '+party.responseTarget+' answers locked. Private answers reveal together.</p>'
      : yourTurn?(answered?'<p class="brain-status brain-locked" role="status">Your answer is locked. Watch the big screen for the result.</p>'
        :'<p class="brain-status">Choose one answer. A wrong answer costs a life.</p>')
      :'<p class="brain-status brain-spectator" role="status">You are spectating this round. You can still watch the other players climb.</p>';
    const correctText=reveal?'<div class="brain-explanation"><b>THE SOLUTION</b><span>'+escape(question.explanation)+'</span></div>':'';
    // The room's tally is for the TV; a phone shows that player's own result instead.
    const outcomes=reveal?(host?'<div class="brain-outcomes"><b>'+party.remaining+' still climbing</b>'+
      '<span>'+party.outcomes.filter(result=>result.correct).length+' correct answers · '+
      party.outcomes.filter(result=>result.eliminated).length+' eliminated this step</span></div>':ownVerdict(party,state.player)):'';
    const micro=host?(reveal?'ANSWER REVEALED':'YOUR NEXT CHALLENGE'):(reveal?'ANSWER REVEALED':livesLabel(party.ownLives));
    body='<div class="brain-puzzle"><div class="brain-micro">'+micro+
      '<span>+'+pointValue+' PTS</span></div><h1>'+escape(question.prompt)+'</h1>'+
      choiceBoard(party,phase,{host,escape})+
      (reveal?correctText+outcomes:response)+'</div>';
    if(canControl)next='<button class="button '+(reveal?'primary':'outline')+' brain-next" data-action="advance">'+
      (reveal?(index+1<total&&party.remaining>0?'Next level':'Final standings'):'Reveal the solution')+
      ' '+icons('arrow-right')+'</button>';
  }
  return '<section class="game-panel brain-game" data-brain-phase="'+phase+'">'+
    '<header class="brain-head"><span class="brain-brand">BRAIN<span>LADDER</span></span>'+
    '<span class="brain-round">LEVEL '+Math.min(index+1,total)+' / '+total+'</span>'+
    '<span class="brain-live">'+(finished?'COMPLETE':reveal?'SOLUTION':'THINK CAREFULLY')+'</span></header>'+
    '<div class="brain-stage">'+panel+'<div class="brain-focus">'+body+'</div></div>'+
    (next?'<div class="brain-footer">'+next+'</div>':'')+'</section>';
}
