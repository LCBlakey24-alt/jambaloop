import {formatNumber} from './answer-controls.js';

export function guessRows(value,min,max){
  return [2,1,0,-1,-2].map(offset=>value+offset<min||value+offset>max?null:value+offset);
}
export function numberWheelRows(question,value){
  return guessRows(value,question.min,question.max).map((number,i)=>`<span class="so-close-number ${i===2?'current':''}">${number===null?'&nbsp;':formatNumber(number,i===2?question.unit:'')}</span>`).join('');
}
export function soCloseView(question,{draft,selection,revealed,host,disabled,closest,guesses},escape){
  const {min,max,unit,correct}=question;
  if(revealed){
    const rows=Array.isArray(guesses)?guesses:[];
    const position=value=>Math.max(0,Math.min(100,100*(value-min)/Math.max(1,max-min)));
    return `<section class="so-close-result"><div class="eyebrow">THE ACTUAL ANSWER</div><strong class="so-close-actual">${formatNumber(correct,unit)}</strong>
      ${host?`<div class="so-close-scale" aria-hidden="true"><span class="so-close-target" style="--position:${position(correct)}%"></span>${rows.map(row=>`<i class="${row.won?'nearest':''}" style="--position:${position(row.guess)}%"></i>`).join('')}</div><div class="so-close-bounds"><span>${formatNumber(min,unit)}</span><span>${formatNumber(max,unit)}</span></div>
        <ol class="so-close-guesses" aria-label="Guesses, closest first">${rows.map(row=>`<li data-nearest="${row.won}"><strong>${escape(row.name)}</strong><span>${formatNumber(row.guess,unit)}</span><small>${formatNumber(row.distance,unit==='year'?'years':unit)} away${row.won?' · +'+row.points+' pts':''}</small></li>`).join('')}</ol>`:selection===undefined?'<p>No guess submitted.</p>':`<p>Your guess: <b>${formatNumber(selection,unit)}</b></p><p>${formatNumber(Math.abs(selection-correct),unit==='year'?'years':unit)} away</p>`}
      <p>${closest?closest.count+' closest · '+formatNumber(closest.distance,unit==='year'?'years':unit)+' away':'No guesses submitted.'}</p></section>`;
  }
  if(host)return `<section class="so-close-result"><div class="eyebrow">ESTIMATION RANGE</div><strong class="so-close-actual">${formatNumber(min,unit)} – ${formatNumber(max,unit)}</strong><div class="so-close-scale" aria-hidden="true"></div><p>Guesses stay secret until the reveal.</p></section>`;
  const value=selection??draft;
  if(selection!==undefined||disabled)return `<section class="so-close-result"><div class="eyebrow">${selection!==undefined?'GUESS LOCKED':'SENDING GUESS'}</div><strong class="so-close-actual">${formatNumber(value,unit)}</strong></section>`;
  const coarse=Math.max(1,Math.round((max-min)/100));
  return `<div class="answer-editor so-close-editor" data-editor="estimate">
    <div class="so-close-wheel"><button type="button" data-step="1" aria-label="Increase guess">▲</button><div class="so-close-wheel-rows" data-so-close-rows aria-hidden="true">${numberWheelRows(question,value)}</div><button type="button" data-step="-1" aria-label="Decrease guess">▼</button>
    <input type="range" min="${min}" max="${max}" step="1" value="${value}" data-range aria-label="Scroll your estimate"></div>
    <label>Your guess ${unit?'('+escape(unit)+')':''}<input type="number" data-number inputmode="numeric" min="${min}" max="${max}" step="1" value="${value}"></label>
    <div class="so-close-coarse"><button type="button" data-step="-${coarse}">−${coarse}</button><button type="button" data-step="${coarse}">+${coarse}</button></div>
    <small>${formatNumber(min,unit)} to ${formatNumber(max,unit)}</small>
    <button type="button" class="button primary" data-action="submit-special">Lock in my guess</button></div>`;
}

/* No result information appears in the ordinary presentation until its stage.
   All answers have already been locked on the server when this sequence begins. */
export function soCloseRevealView(state,frame,host,escape){
  const q=state.question, unit=q.unit;
  const measure=v=>formatNumber(v,unit);
  const difference=v=>formatNumber(v,unit==='year'?'years':unit);
  const rows=[...(state.estimateGuesses??[])].sort((a,b)=>a.guess-b.guess||a.id.localeCompare(b.id));
  const final=frame.kind==='winner', actual=final||frame.kind==='actual';
  const visible=rows.slice(0,frame.shown);
  const position=value=>Math.max(0,Math.min(100,100*(value-q.min)/Math.max(1,q.max-q.min)));
  const ruler=host?`<div class="so-close-scale" aria-hidden="true">${visible.map(row=>`<i class="${final&&row.won?'nearest':''}" style="--position:${position(row.guess)}%"></i>`).join('')}${actual?`<span class="so-close-target" style="--position:${position(q.correct)}%"></span>`:''}</div><div class="so-close-bounds"><span>${measure(q.min)}</span><span>${measure(q.max)}</span></div>`:'';
  if(frame.kind==='opening')return `<div class="so-close-reveal-head"><div class="eyebrow">GUESSING CLOSED</div><h2>All guesses are locked.</h2><p>${state.estimateReveal.count} guesses submitted. Let's see where they landed.</p></div>`;
  if(frame.kind==='guesses'){
    const current=rows.slice(frame.from,frame.shown);
    return `<div class="so-close-reveal-head"><div class="eyebrow">THE GUESSES · ${frame.shown} / ${state.estimateReveal.count}</div><h2>${host?'Here come the guesses…':'Look at the big screen'}</h2></div>
      ${host?`<div class="so-close-guess-cards">${current.map(row=>`<div class="so-close-guess-card"><small>${escape(row.name)}</small><strong>${measure(row.guess)}</strong></div>`).join('')}</div>`:`<p>${state.selection===undefined?'No guess submitted.':'Your locked guess: '+measure(state.selection)}</p>`}
      ${ruler}`;
  }
  if(frame.kind==='suspense')return `<div class="so-close-reveal-head"><div class="eyebrow">MOMENT OF TRUTH</div><h2>But what's the actual answer?</h2><strong class="so-close-mystery" aria-hidden="true">?</strong></div>${ruler}`;
  const actualHeading=`<div class="so-close-reveal-head"><div class="eyebrow">THE ACTUAL ANSWER</div><strong class="so-close-actual">${measure(q.correct)}</strong></div>`;
  if(!final)return actualHeading+ruler+'<p>Who came closest?</p>';
  const winners=rows.filter(row=>row.won);
  const winnerHeading=host?(winners.length? winners.length===1?escape(winners[0].name)+' wins the round!':winners.length+' players share the win!':'No guesses this round')
    :state.answerCorrect?(state.selection===q.correct?'Bang on! Exact answer!':'So close! You win!'):'Round complete';
  const source=q.source?`<a class="question-source" href="${escape(q.source)}" target="_blank" rel="noopener noreferrer">Verified answer source</a>`:'';
  return `${actualHeading}<div class="so-close-round-winner"><h3>${winnerHeading}</h3>${host?(winners.length?`<p>${winners.slice(0,5).map(row=>escape(row.name)).join(' · ')}${winners.length>5?' + '+(winners.length-5)+' more':''} · ${difference(winners[0].distance)} away · +${winners[0].points} pts each</p>`:''):(state.selection===undefined?'<p>No guess submitted.</p>':`<p>Your guess: ${measure(state.selection)} · ${difference(Math.abs(state.selection-q.correct))} away · +${state.earned??0} pts</p>`)}</div>
    ${ruler}
    ${host?`<ol class="so-close-guesses" aria-label="All guesses, closest first">${[...rows].sort((a,b)=>a.distance-b.distance).map(row=>`<li data-nearest="${row.won}"><strong>${escape(row.name)}</strong><span>${measure(row.guess)}</span><small>${difference(row.distance)} away · +${row.points} pts</small></li>`).join('')}</ol>`:''}${source}`;
}
