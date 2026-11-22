import {replayButtons} from './game-night.js';

export function samePageView(state,{host,canControl,escape,reply,icons}) {
  const {party,phase,index,total}=state;
  if(!party||party.type!=='samepage') return '';
  const writing=phase==='party-write';
  const finished=phase==='finished';
  const reveal=phase==='party-reveal';
  const resultTitle=finished ? 'THE FINAL MATCH' : writing?'THINK OF THE SAME ANSWER':'ANSWERS REVEALED';
  const control=label=>canControl?`<button type="button" class="button primary" data-action="advance">${label} ${icons('arrow-right')}</button>`:'';
  const scoreboard=finished?`<ol class="same-page-scores" aria-label="Final player standings">${(state.players??[]).map((player,i)=>
    `<li><span>#${i+1} ${escape(player.name)}</span><strong>${player.score.toLocaleString()} pts</strong></li>`).join('')}</ol>`:'';
  const groups=party.groups?.length?`<div class="same-page-clusters" aria-label="Grouped player answers">
    ${party.groups.map(group=>`<article class="same-page-cluster ${group.count>1?'is-match':'is-solo'}">
      <header><span>${group.count>1?group.count+' PEOPLE MATCHED':'UNIQUE ANSWER'}</span>
        <strong>${group.pointsEach} POINTS EACH</strong></header>
      <h2>${escape(group.answer)}</h2>
      <p>${group.players.map(person=>escape(person.name)).join(' · ')}</p>
    </article>`).join('')}</div>`:
    (writing?'':'<p class="same-page-empty">No answers were submitted this round.</p>');
  const phonePrompt=writing&&!host ? party.wrote
    ? `<p class="same-page-status" role="status">Answer locked in. ${party.submissions} of ${party.responseTarget} players ready.</p>`
    : `<form id="bluff-form" class="same-page-form">
       <label>Your answer
         <textarea name="reply" maxlength="50" rows="2" required placeholder="Type a word or short phrase…">${escape(reply??'')}</textarea>
       </label>
       <button type="submit" class="button primary">Lock in answer</button>
       <small>Spelling, punctuation and capitals are normalised. The more people who match your answer, the more points you each win.</small>
     </form>`
    : '';
  return `<section class="game-panel party-panel same-page-stage ${finished?'results':''}" data-match-phase="${phase}">
    <div class="same-page-top"><span class="eyebrow">SAME PAGE · ROUND ${index+1} / ${total}</span>
      <span class="same-page-count">${writing?party.submissions+' / '+party.responseTarget+' ANSWERS':'ALL ANSWERS REVEALED'}</span></div>
    <h1>${resultTitle}</h1>
    <p class="same-page-prompt">${escape(party.prompt)}</p>
    ${writing?`<div class="same-page-write">
      ${host?`<div class="same-page-waiting"><span aria-hidden="true">◎</span>
        <strong>Everyone is choosing a secret answer</strong>
        <p>Try to think like the rest of the room. Answers stay hidden until the reveal.</p>
       </div>`:phonePrompt}
       ${control('Reveal matches')}</div>`:
      `<div class="same-page-reveal">${groups}
        ${!host&&reveal?`<p class="same-page-earned">You earned <strong>+${party.ownPoints??0} points</strong> this round.</p>`:''}
        ${scoreboard}
        ${finished?(canControl?replayButtons(state,icons):'<p>Waiting for the next game.</p>'):
          control(index+1<total?'Next round':'Final results')}
       </div>`}
  </section>`;
}
