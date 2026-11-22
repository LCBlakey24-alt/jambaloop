// Original TV-first matching game. All player-submitted strings are escaped.
import {replayButtons} from './game-night.js';

const results = (party, escape, compact=false) =>
  '<div class="samepage-matches'+(compact?' compact':'')+'">'+
    (party.groups?.length ? party.groups.map((group, index) => `
      <article class="samepage-group ${group.count>1?'matched':'single'}">
        <div class="samepage-group-count"><span>${group.count>1?'MATCH':'UNIQUE'}</span><strong>${group.count}</strong></div>
        <div class="samepage-group-main"><strong>${escape(group.answer)}</strong>
          <span class="samepage-names">${group.members.map(p=>escape(p.name)).join(' · ')}</span></div>
        <div class="samepage-group-points">${group.points ? '+'+group.points : '0'}<small>PTS EACH</small></div>
      </article>`).join('') : '<p>No answers were entered this round.</p>')+
    '</div>';

export function samePageView(state, {host,canControl,escape,icons,reply}) {
  const {party,phase,index,total} = state;
  if (!party || party.type !== 'samepage') return '';
  const writing = phase === 'party-write';
  const finished = phase === 'finished';
  const reveal = phase === 'party-reveal';
  const round = `<span class="samepage-round">ROUND ${index+1} OF ${total}</span>`;
  const stats = `<div class="samepage-submissions"><strong>${party.submissions}</strong><span> / ${party.responseTarget} ANSWERS LOCKED</span></div>`;
  let body = '';
  if (finished) {
    const standings = state.players ?? [];
    const best = standings[0]?.score;
    const leaders = standings.filter(player=>player.score===best);
    const resultTitle = leaders.length===1 ? escape(leaders[0].name)+' wins Same Page!' : 'It’s a shared victory!';
    body = `<div class="samepage-finale">
      <div class="samepage-victory-mark" aria-hidden="true">✧ ✧</div>
      <h1>${resultTitle}</h1>
      <p>Most matching minds across ${total} rounds.</p>
      <ol class="samepage-final-board">${standings.map((player,i)=>`<li><span><b>#${i+1}</b> ${escape(player.name)}</span><strong>${player.score.toLocaleString()} pts</strong></li>`).join('')}</ol>
      ${!host ? `<p>Your final score: <strong>${state.player?.score?.toLocaleString()??0} points</strong></p>` : ''}
      ${canControl ? `<div class="actions">${replayButtons(state,icons)}</div>` : '<p>Stay connected for the next game.</p>'}
    </div>`;
  } else if (writing) {
    body = `<div class="samepage-prompt"><span class="samepage-step">THINK OF THE SAME THING</span>
      <h1>${escape(party.prompt)}</h1>
      <p>Everyone answers privately. Match someone else to score 100 points per matching partner.</p></div>
      ${host ? `<div class="samepage-host-wait" aria-label="Answers waiting to reveal">
        <div class="samepage-orbits" aria-hidden="true"><i></i><i></i><i></i><b>?</b></div>
        ${stats}<p>No answers appear on the TV until the reveal.</p>
        </div>` : party.answered
        ? `<div class="samepage-locked" role="status"><strong>Answer locked</strong><span>${escape(party.ownAnswer)}</span><p>See whether the others think like you.</p></div>`
        : `<form id="bluff-form" class="samepage-answer-form">
            <label for="samepage-answer">Your answer</label>
            <textarea id="samepage-answer" name="reply" rows="2" maxlength="60" placeholder="Type your first thought…" required>${escape(reply ?? '')}</textarea>
            <button class="button primary" type="submit">Lock in answer ${icons('check')}</button>
            <small>Capitalisation and punctuation do not affect matches.</small>
          </form>`}
      ${canControl ? '<button class="button outline samepage-host-advance" data-action="advance">Reveal submitted answers</button>' : ''}`;
  } else if (reveal) {
    const matches=(party.groups??[]).filter(group=>group.count>1);
    const matchedPlayers=matches.reduce((sum,group)=>sum+group.count,0);
    body = `<div class="samepage-reveal-head"><span class="samepage-step">THE MATCH REVEAL</span>
      <h1>${matches.length ? matchedPlayers+' players found their people!' : 'No matching answers this time!'}</h1>
      <p>${escape(party.prompt)}</p>
      <div class="samepage-reveal-stats"><span>${party.groups?.length??0} distinct answers</span><span>${matchedPlayers} matched players</span></div></div>
      ${results(party,escape,!host)}
      ${!host ? `<p class="samepage-your-score">Your answer: <strong>${escape(party.ownAnswer??'No answer')}</strong> · <b>+${party.earned??0} pts</b></p>` : ''}
      ${canControl ? `<div class="samepage-host-next"><button class="button primary" data-action="advance">${index+1<total?'Next matching round':'Show final standings'} ${icons('arrow-right')}</button></div>` : ''}`;
  }
  return `<section class="game-panel samepage-game ${finished?'samepage-finished':''}" data-samepage-phase="${phase}">
      <header class="samepage-intro"><span class="samepage-logo">SAME<span>PAGE</span></span>${round}<span class="samepage-live">${writing?'ANSWERS OPEN':reveal?'MATCH REVEAL':'GAME COMPLETE'}</span></header>
      ${body}
    </section>`;
}
