import {partyFinale} from './party-finale.js';
import {replayButtons} from './game-night.js';

export function debateView(state,{host,canControl,escape,icons}){
 const {party:p,phase}=state;
 if(!p)return '';
 const next=label=>host?`<button class="button primary" data-action="advance">${label}</button>`:'';
 if(phase==='finished')return `<section class="game-panel debate-stage"><h1>Final verdict</h1>${partyFinale(state,{host,escape})}
   ${host?`<ol>${state.players.map(player=>`<li>${escape(player.name)} · ${player.score} pts</li>`).join('')}</ol>`:''}
   ${canControl?replayButtons(state,icons):''}</section>`;
 const pitch=['debate-first','debate-second'].includes(phase);
 const side=phase==='debate-first'?0:1;
 const result=phase==='debate-reveal';
 const voting=phase==='debate-vote';
 const canVote=!host&&voting&&p.mySide===-1&&!p.locked;
 const cards=p.speakers.map((name,i)=>{
   const body=`<small>${escape(name)}</small><strong>${escape(p.topic[i+1])}</strong>${result?`<b>${p.counts[i]} votes</b>`:''}`;
   return canVote?`<button class="debate-side" data-action="debate-vote" data-option="${i}">${body}</button>`:`<div class="debate-side" ${pitch&&side===i?'data-speaking="true"':''}>${body}</div>`;
 }).join('');
 const margin=result?Math.abs(p.counts[0]-p.counts[1]):0;
 const cue=pitch?(host||p.mySide!==side?escape(p.speakers[side])+' has the floor':'Your turn to speak')
   :result?(margin?escape(p.speakers[p.counts[0]>p.counts[1]?0:1])+' wins '+margin+' '+(margin===1?'point':'points'):'Tie · no points')
   :host?p.voted+' ballots locked':p.mySide>=0?'The audience is voting':p.locked?'Vote locked':'Who made the better case?';
 return `<section class="game-panel debate-stage"><small>${host?'FLOOR TIME · ':''}DEBATE ${state.index+1} OF ${state.total}</small>
   <h1>${escape(p.topic[0])}</h1><div class="debate-sides">${cards}</div>
   <p role="status">${cue} ${pitch?'<span class="timer" id="timer"></span>':''}</p>
   ${next(phase==='debate-first'?'Next speaker':phase==='debate-second'?'Open ballot':voting?'Close ballot':state.index+1<state.total?'Next debate':'Final standings')}</section>`;
}
