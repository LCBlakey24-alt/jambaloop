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
