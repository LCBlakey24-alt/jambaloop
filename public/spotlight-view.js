import {replayButtons} from './game-night.js';

const choices=['A','B','C','D'];
const stageTag={
  'spotlight-ready':'CONTESTANT UP NEXT',
  'spotlight-expert':'EXPERT ADVICE',
  'spotlight-answer':'FINAL ANSWER',
  'spotlight-reveal':'THE REVEAL',
  finished:'FINAL STANDINGS',
};

function wheelFaces(roster,escape) {
  const visible=roster.slice(0,10);
  return visible.map((player,index) => {
    const angle=index*360/visible.length;
    return '<span class="spotlight-wheel-label" style="--angle:'+angle+'deg">'+escape(player.name)+'</span>';
  }).join('');
}

function questionPanel(party,escape) {
  const question=party.question;
  if(!question) return '';
  return '<div class="spotlight-question"><span class="spotlight-topic">'+escape(party.topic||'MIXED BAG')+
    '</span><h2>'+escape(question.prompt)+'</h2></div>';
}

function optionsPanel(party,phase,{host,escape}) {
  const question=party.question;
  if(!question)return '';
  const advice=phase==='spotlight-expert'&&party.expertTurn&&!party.expertSubmitted&&!host;
  const answer=phase==='spotlight-answer'&&party.contestantTurn&&!party.contestantSubmitted&&!host;
  const revealed=phase==='spotlight-reveal'||phase==='finished';
  return '<div class="spotlight-options">'+question.options.map((option,index) => {
    const chosen=party.choice===index&&revealed;
    const correct=revealed&&question.correct===index;
    const advised=party.advice===index&&revealed;
    const selected=advice||answer;
    const control=advice?'spotlight-advice':answer?'spotlight-answer':'';
    const cls='spotlight-choice'+(correct?' is-correct':'')+(chosen?' is-contestant':'')+(advised?' is-expert':'');
    const tag=correct?'CORRECT':chosen?'LOCKED':advised?'EXPERT':'';
    return selected
      ? '<button type="button" class="'+cls+'" data-action="'+control+'" data-option="'+index+'"><span class="spotlight-choice-letter">'+choices[index]+'</span><span>'+escape(option)+'</span></button>'
      : '<div class="'+cls+'"><span class="spotlight-choice-letter">'+choices[index]+'</span><span>'+escape(option)+'</span>'+(tag?'<small>'+tag+'</small>':'')+'</div>';
  }).join('')+'</div>';
}

export function spotlightView(state,{host,canControl,escape,icons}) {
  const {party,phase,index,total}=state;
  if(!party || party.type!=='spotlight')return '';
  const ready=phase==='spotlight-ready';
  const revealed=phase==='spotlight-reveal';
  const finished=phase==='finished';
  const tag=stageTag[phase]??'SPOTLIGHT WHEEL';
  const contestant=party.contestant?.name??'Contestant';
  const expert=party.expert?.name??'Expert';
  const wheel='<div class="spotlight-wheel-wrap"><div class="spotlight-wheel '+(ready?'is-ready':'has-spun')+'">'+
    '<div class="spotlight-wheel-segments" aria-hidden="true"></div>'+
    wheelFaces(party.roster,escape)+
    '<div class="spotlight-wheel-core"><span>SPOTLIGHT</span><b>WHEEL</b><small>'+(ready?'WHO WILL HELP?':escape(party.topic??'TAKE THE STAGE'))+'</small></div>'+
    '</div><span class="spotlight-wheel-pointer" aria-hidden="true">▼</span></div>';
  const cast='<div class="spotlight-cast"><article class="spotlight-person"><small>CONTESTANT</small><strong>'+escape(contestant)+'</strong></article>'+
    '<div class="spotlight-cast-versus" aria-hidden="true">+</div>'+
    '<article class="spotlight-person spotlight-helper"><small>EXPERT</small><strong>'+escape(ready?'Wheel decides':expert)+'</strong></article></div>';
  let controls='';
  let content='';
  if(finished) {
    const ranks=state.players??[];
    const top=ranks[0]?.score??0;
    const winners=ranks.filter(player=>player.score===top);
    const headline=winners.length===1?escape(winners[0].name)+' takes the spotlight!':'A shared spotlight!';
    content='<div class="spotlight-final"><span class="spotlight-final-kicker">THE FINAL SPOTLIGHT</span>'+
      '<h1>'+headline+'</h1><p>Every contestant had their chance to shine.</p>'+
      '<ol class="spotlight-final-ranking">'+ranks.map((person,i)=>'<li><span><b>'+(i+1)+'</b> '+escape(person.name)+'</span><strong>'+person.score.toLocaleString()+' PTS</strong></li>').join('')+'</ol>'+
      (!host?'<p class="spotlight-personal-final">Your points: <b>'+(state.player?.score?.toLocaleString()??0)+'</b></p>':'')+
      (canControl?'<div class="actions">'+replayButtons(state,icons)+'</div>':'')+
      '</div>';
  } else if(ready) {
    content='<div class="spotlight-up-next"><span class="spotlight-final-kicker">NEXT IN THE SPOTLIGHT</span>'+
      '<h1>'+escape(contestant)+'</h1><p>The wheel will choose a topic and another player to give advice.</p>'+
      '<span class="spotlight-round-count">'+(index+1)+' / '+total+' CONTESTANT TURNS</span></div>';
    controls=canControl?'<button class="button primary spotlight-primary" data-action="advance">Spin for an expert '+icons('aperture')+'</button>':'';
  } else {
    const status=phase==='spotlight-expert'
      ? (party.expertTurn?'You are the expert. Select the answer you recommend.':party.contestantTurn?'Your expert is choosing an answer.':'The expert is preparing a suggestion.')
      : phase==='spotlight-answer'
        ? (party.contestantTurn?'You have the final say. Lock your answer.':'The contestant is locking in an answer.')
        : 'The points are in!';
    const roleMessage=host?'<p class="spotlight-stage-note">'+
      (phase==='spotlight-expert'?'The expert is advising privately.':
      phase==='spotlight-answer'?'The contestant is deciding whether to trust their expert.':'The question and roles are revealed.')+
      '</p>':'<p class="spotlight-role-note">'+escape(status)+'</p>';
    const privateHint=phase==='spotlight-answer'&&party.contestantTurn
      ? '<p class="spotlight-expert-tip">Expert advice: <strong>'+
        (party.advice===null?'No suggestion provided':escape(party.question.options[party.advice]))+
        '</strong></p>':'';
    const revealSummary=revealed?'<div class="spotlight-awards"><div><small>CONTESTANT</small><strong>'+escape(contestant)+'</strong><b>+'+party.points+' pts</b></div>'+
      '<div><small>EXPERT</small><strong>'+escape(expert)+'</strong><b>+'+party.expertPoints+' pts</b></div></div>':'';
    const source=revealed&&party.question?.source?'<p class="spotlight-source">Source: <a href="'+escape(party.question.source)+'" target="_blank" rel="noopener noreferrer">Read the reference</a></p>':'';
    const locked=phase==='spotlight-expert'&&party.expertTurn&&party.expertSubmitted
      ||phase==='spotlight-answer'&&party.contestantTurn&&party.contestantSubmitted;
    content='<div class="spotlight-question-stage">'+questionPanel(party,escape)+privateHint+
      optionsPanel(party,phase,{host,escape})+roleMessage+
      (locked?'<p role="status" class="spotlight-locked">Your selection is locked in.</p>':'')+
      revealSummary+source+'</div>';
    if(canControl){
      controls=phase==='spotlight-expert'
        ?'<button class="button outline spotlight-primary" data-action="advance">Continue without advice '+icons('arrow-right')+'</button>'
        :phase==='spotlight-answer'
          ?'<button class="button outline spotlight-primary" data-action="advance">Reveal answer '+icons('eye')+'</button>'
          :'<button class="button primary spotlight-primary" data-action="advance">'+(index+1<total?'Next contestant':'Final standings')+' '+icons('arrow-right')+'</button>';
    }
  }
  return '<section class="game-panel spotlight-game" data-spotlight-phase="'+phase+'">'+
    '<header class="spotlight-head"><strong class="spotlight-brand">SPOTLIGHT<span>WHEEL</span></strong>'+
    '<span class="spotlight-round">ROUND '+(index+1)+' / '+total+'</span>'+
    '<span class="spotlight-state">'+tag+'</span></header>'+
    (finished?content:'<div class="spotlight-stage">'+
      '<aside class="spotlight-wheel-side">'+wheel+cast+'</aside>'+
      '<div class="spotlight-focus">'+content+'</div></div>')+
    (controls?'<div class="spotlight-footer">'+controls+'</div>':'')+'</section>';
}
