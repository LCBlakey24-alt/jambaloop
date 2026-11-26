import {ESTIMATE_LIMIT,formatNumber,precisionChips,guessRows,numberWheelRows,rulerWheel} from './answer-controls.js';

// No range is shown while guessing: the ruler wheel starts at zero and every
// arrow, drag or scroll moves by the step size the player picks (1, 10, 100 … 1M).
export {guessRows,numberWheelRows};
export function soCloseView(question,{draft,selection,revealed,host,disabled,closest,guesses},escape){
  const {min,max,unit,correct}=question; // min and max arrive only with the reveal
  if(revealed){
    const rows=Array.isArray(guesses)?guesses:[];
    const position=value=>Math.max(0,Math.min(100,100*(value-min)/Math.max(1,max-min)));
    return `<section class="so-close-result"><div class="eyebrow">THE ACTUAL ANSWER</div><strong class="so-close-actual">${formatNumber(correct,unit)}</strong>
      ${host?`<div class="so-close-scale" aria-hidden="true"><span class="so-close-target" style="--position:${position(correct)}%"></span>${rows.map(row=>`<i class="${row.won?'nearest':''}" style="--position:${position(row.guess)}%"></i>`).join('')}</div><div class="so-close-bounds"><span>${formatNumber(min,unit)}</span><span>${formatNumber(max,unit)}</span></div>
        <ol class="so-close-guesses" aria-label="Guesses, closest first">${rows.map(row=>`<li data-nearest="${row.won}"><strong>${escape(row.name)}</strong><span>${formatNumber(row.guess,unit)}</span><small>${formatNumber(row.distance,unit==='year'?'years':unit)} away${row.won?' · +'+row.points+' pts':''}</small></li>`).join('')}</ol>`:selection===undefined?'<p>No guess submitted.</p>':`<p>Your guess: <b>${formatNumber(selection,unit)}</b></p><p>${formatNumber(Math.abs(selection-correct),unit==='year'?'years':unit)} away</p>`}
      <p>${closest?closest.count+' closest · '+formatNumber(closest.distance,unit==='year'?'years':unit)+' away':'No guesses submitted.'}</p></section>`;
  }
  if(host)return `<section class="so-close-result so-close-no-range"><div class="eyebrow">NO RANGE · NO CLUES</div><strong class="so-close-actual">${unit?(unit==='year'?'Name the year':'Answer in '+escape(unit)):'Name the number'}</strong><p>Every guess stays secret until the reveal.</p></section>`;
  const value=selection??draft;
  if(selection!==undefined||disabled)return `<section class="so-close-result"><div class="eyebrow">${selection!==undefined?'GUESS LOCKED':'SENDING GUESS'}</div><strong class="so-close-actual">${formatNumber(value,unit)}</strong></section>`;
  return `<div class="answer-editor so-close-editor" data-editor="estimate">
    <div class="so-close-wheel"><button type="button" data-step="1" aria-label="Increase guess by one step">▲</button>${rulerWheel(question,value)}<button type="button" data-step="-1" aria-label="Decrease guess by one step">▼</button></div>
    <div class="so-close-precision"><span>Step size</span>${precisionChips()}</div>
    <label>Your guess ${unit?'('+escape(unit)+')':''}<input type="number" data-number inputmode="numeric" min="${Math.min(0,question.min??0)}" max="${ESTIMATE_LIMIT}" step="1" value="${value}"></label>
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
  // Up to twelve markers carry the player's initials; bigger rooms keep plain ticks.
  const initials=name=>escape(String(name).trim().split(/\s+/).map(part=>[...part][0]??'').join('').slice(0,2).toUpperCase());
  const tagged=visible.length<=12;
  const ruler=host?`<div class="so-close-scale" aria-hidden="true">${visible.map((row,i)=>`<i class="${final&&row.won?'nearest':''}" style="--position:${position(row.guess)}%;--lane:${i%3}">${tagged?`<b>${initials(row.name)}</b>`:''}</i>`).join('')}${actual?`<span class="so-close-target" style="--position:${position(q.correct)}%"></span>`:''}</div><div class="so-close-bounds"><span>${measure(q.min)}</span><span>${measure(q.max)}</span></div>`:'';
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
  const source=q.source?`<a class="question-source" href="${escape(q.source)}" target="_blank" rel="noopener noreferrer">Answer source</a>`:'';
  return `${actualHeading}<div class="so-close-round-winner"><h3>${winnerHeading}</h3>${host?(winners.length?`<p>${winners.slice(0,5).map(row=>escape(row.name)).join(' · ')}${winners.length>5?' + '+(winners.length-5)+' more':''} · ${difference(winners[0].distance)} away · +${winners[0].points} pts${winners.length>1?' each':''}</p>`:''):(state.selection===undefined?'<p>No guess submitted.</p>':`<p>Your guess: ${measure(state.selection)} · ${difference(Math.abs(state.selection-q.correct))} away · +${state.earned??0} pts</p>`)}</div>
    ${ruler}
    ${host?`<ol class="so-close-guesses" aria-label="All guesses, closest first">${[...rows].sort((a,b)=>a.distance-b.distance).map(row=>`<li data-nearest="${row.won}"><strong>${escape(row.name)}</strong><span>${measure(row.guess)}</span><small>${difference(row.distance)} away · +${row.points} pts</small></li>`).join('')}</ol>`:''}${source}`;
}
