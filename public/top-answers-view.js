// Original, room-sourced popularity show. All answers are prewritten opinions;
// the percentage bars are derived exclusively from votes in this room.
import { partyFinale } from './party-finale.js';
import {replayButtons} from './game-night.js';
const letters='ABCD';
const phaseLabels={'top-poll':'ROOM POLL','top-guess':'YOUR PREDICTION','top-reveal':'THE ANSWERS',finished:'FINAL STANDINGS'};
const asNumber=value=>Number.isFinite(value)?value.toLocaleString('en-GB'):'0';

function optionCards(party,phase,host,escape){
  const revealed=phase==='top-reveal';
  const poll=phase==='top-poll';
  const guesses=phase==='top-guess';
  const canChoose=!host&&(poll?!party.pollLocked:guesses?!party.predictionLocked:false);
  const leaderChoices=new Set(party.results?.leaders||[]);
  const total=party.results?.totalVotes??0;
  return '<div class="top-options'+(revealed?' top-revealed':'')+'">'+party.options.map((option,index)=>{
    const count=revealed?(party.counts[index]||0):0;
    const leader=revealed&&leaderChoices.has(index);
    const selected=host?false:poll?party.ownPoll===index:guesses?party.ownPrediction===index:party.ownPrediction===index;
    const percentage=revealed&&total?Math.round(count/total*100):0;
    const cls='top-option'+(selected?' is-selected':'')+(leader?' is-leader':'')+(revealed?' is-revealed':'');
    const body='<span class="top-option-letter">'+letters[index]+'</span><div class="top-option-body">'+
      '<strong>'+escape(option)+'</strong>'+
      (revealed?'<div class="top-bar-track" aria-hidden="true"><span style="width:'+percentage+'%"></span></div>':'')+
      '</div>'+
      (revealed?'<span class="top-vote-tally"><strong>'+count+'</strong><small>'+percentage+'%</small></span>':
        selected?'<span class="top-locked-indicator">LOCKED</span>':'')+
      (leader?'<span class="top-number-one">MOST POPULAR</span>':'');
    return canChoose?'<button type="button" class="'+cls+'" data-action="'+(poll?'top-poll':'top-guess')+'" data-option="'+index+'">'+body+'</button>'
      :'<div class="'+cls+'">'+body+'</div>';
  }).join('')+'</div>';
}
function scores(state,escape,host){
  const scores=state.players??[];
  const best=scores[0]?.score??0;
  const winners=scores.filter(row=>row.score===best);
  const headline=winners.length===1?escape(winners[0].name)+' read the room!':'A shared top answer!';
  return '<div class="top-finale"><span class="top-hero-tag">THE FINAL REVEAL</span>'+
    '<h1>'+headline+'</h1>'+partyFinale(state,{host,escape})+'<p>The real votes are in. Here are the final scores.</p>'+
    '<ol class="top-final-scores">'+scores.map((row,index)=>'<li><span><b>'+(index+1)+'.</b> '+escape(row.name)+'</span><strong>'+asNumber(row.score)+' PTS</strong></li>').join('')+'</ol>'+
    '</div>';
}

export function topAnswersView(state,{host,canControl,escape,icons}){
  const {party,phase,index,total}=state;
  if(!party||party.type!=='topanswers')return '';
  const finished=phase==='finished';
  const poll=phase==='top-poll';
  const guess=phase==='top-guess';
  const reveal=phase==='top-reveal';
  const complete=poll?party.pollCount:party.predictionCount;
  const target=poll?party.pollResponseTarget:party.guessResponseTarget;
  const currentStatus=poll?'POLLING THE ROOM':guess?'PREDICT THE TOP CHOICE':reveal?'THE REAL VOTES':'GAME COMPLETE';
  const label=phaseLabels[phase]||'TOP ANSWERS';
  let content='',actions='';
  if(finished){
    content=scores(state,escape,host)+
      (!host?'<p class="top-personal-final">Your score: <strong>'+asNumber(state.player?.score)+' points</strong></p>':'')+
      (canControl?'<div class="actions top-final-controls">'+replayButtons(state,icons)+'</div>':'');
  } else {
    const note=poll
      ?'Which answer would YOU choose? The poll is secret until everyone has voted.'
      :guess
        ?'Now guess which option was picked most often. No one can see the totals yet.'
        :'These are the actual choices made by players in this room — not an outside survey.';
    let status='';
    if(reveal){
      const leaders=party.results?.leaders||[];
      const topNames=leaders.map(i=>party.options[i]);
      const voted=party.results?.totalVotes??0;
      const lead=voted===0?'Nobody voted in this round.':topNames.length>1?'It’s a tie at the top!':'And the most popular answer is…';
      status='<div class="top-reveal-message"><strong>'+escape(lead)+'</strong>'+
        '<span>'+voted+' actual '+(voted===1?'vote':'votes')+' · '+topNames.map(escape).join(' / ')+'</span>'+
        (!host?'<b>You earned +'+asNumber(party.earned)+' points this round.</b>':'')+'</div>';
    }else if(host){
      status='<div class="top-progress" role="status"><strong>'+complete+'</strong><span>/ '+target+' '+
        (poll?'poll votes':'predictions')+' locked</span><p>Choices are hidden from the TV until the reveal.</p></div>';
    }else {
      const locked=poll?party.pollLocked:party.predictionLocked;
      status=locked?'<div class="top-progress top-progress-locked" role="status"><strong>LOCKED</strong><p>Your choice is saved. Watch the shared TV.</p></div>'
        :'<p class="top-player-tip">Choose one answer on your phone.</p>';
    }
    content='<div class="top-question"><span class="top-hero-tag">'+label+'</span><h1>'+escape(party.prompt)+'</h1><p>'+note+'</p></div>'+
      optionCards(party,phase,host,escape)+status;
    if(canControl)actions='<div class="top-advance"><button type="button" class="button '+(reveal?'primary':'outline')+'" data-action="advance">'+
      (poll?'Close poll and start predictions':guess?'Reveal real vote totals':index+1<total?'Next room poll':'Show final standings')+
      ' '+icons('arrow-right')+'</button></div>';
  }
  return '<section class="game-panel top-game" data-top-phase="'+phase+'">'+
    '<header class="top-header"><span class="top-wordmark">TOP<span>ANSWERS</span></span>'+
    '<span class="top-round">ROUND '+(index+1)+' / '+total+'</span>'+
    '<span class="top-live"><i aria-hidden="true"></i>'+currentStatus+'</span></header>'+
    '<div class="top-stage">'+content+'</div>'+actions+'</section>';
}
