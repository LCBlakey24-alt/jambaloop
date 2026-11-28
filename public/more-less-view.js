import {partyFinale} from './party-finale.js';
import {replayButtons} from './game-night.js';

export function moreLessView(state,{host,canControl,escape,icons}) {
  const p=state.party;
  if (!p || p.type !== 'moreless') return '';
  const finished=state.phase==='finished';
  const reveal=state.phase==='moreless-reveal';
  const action=label=>canControl?`<div class="moreless-actions"><button class="button primary" data-action="advance">${label} ${icons('arrow-right')}</button></div>`:'';
  if (finished) return `<section class="game-panel moreless-stage"><p class="moreless-kicker">MORE OR LESS</p><h1>Final results</h1>${partyFinale(state,{host,escape})}${canControl?replayButtons(state,icons):'<p>Stay here for the next game.</p>'}</section>`;
  const options=p.options.map((label,index)=>{
    const winner=reveal && p.correct===index;
    const body=`<span class="moreless-letter">${index===0?'A':'B'}</span><strong>${escape(label)}</strong>${reveal?`<span class="moreless-value">${escape(String(p.values[index]))} ${escape(p.unit)}</span>`:''}${winner?'<span class="moreless-correct">CORRECT</span>':''}`;
    if (!host && !p.locked && !p.watching && !reveal) return `<button type="button" class="moreless-option" data-action="moreless-vote" data-option="${index}">${body}</button>`;
    return `<div class="moreless-option ${winner?'is-correct':''} ${!host && p.ownVote===index?'is-selected':''}">${body}</div>`;
  }).join('');
  const status=reveal
    ? `<p class="moreless-status">${p.style==='elimination'?'Survivors continue.':'100 points for a correct answer.'}</p>`
    : host ? `<p class="moreless-status" role="status">${p.count} of ${p.target} answers locked</p>`
    : p.watching ? '<p class="moreless-status" role="status">You are watching this round.</p>'
    : p.locked ? '<p class="moreless-status" role="status">Answer locked. Watch the TV.</p>'
    : '<p class="moreless-status">Choose your answer.</p>';
  return `<section class="game-panel moreless-stage">
    <header><p class="moreless-kicker">MORE OR LESS · ${p.style==='elimination'?'ELIMINATION':'POINTS'}</p><span>ROUND ${state.index+1} / ${state.total}</span></header>
    <h1>${escape(p.prompt)}</h1><div class="moreless-options">${options}</div>
    ${status}${action(reveal?(p.lastRound||state.index+1>=state.total?'Final results':'Next question'):'Reveal answer')}
  </section>`;
}
