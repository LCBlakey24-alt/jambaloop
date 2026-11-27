// Original TV-first rarity show. User text must always be escaped before injection into markup.
import { partyFinale } from './party-finale.js';
import {replayButtons} from './game-night.js';
import { answerWall } from './party-views.js';
import { face } from './player-face.js';
function revealRows(p,escape){
 const groups=p.results?.groups||[];
 const invalid=p.results?.invalid||[];
 return `<div class="rare-reveal-rows" role="list" aria-label="Actual answers and how often each was given">
   ${groups.length?groups.map(group=>`<article class="rare-answer-row" role="listitem">
     <div class="rare-answer-symbol">${group.points===200?'★':group.points===100?'◆':'●'}</div>
     <div class="rare-answer-name"><strong>${escape(group.answer)}</strong>
       <span>${group.members.map(member=>face(member)+escape(member.name)).join(' · ')}${group.reviewed?' · host-approved':''}</span></div>
     <div class="rare-answer-score"><strong>${group.count}×</strong><span>+${group.points} EACH</span></div>
   </article>`).join(''):'<p class="rare-muted">No valid answers submitted this round.</p>'}
   ${invalid.length?`<div class="rare-invalid-list"><strong>Unaccepted entries · 0 points</strong>
     ${invalid.map(entry=>`<p>${escape(entry.name)}: ${escape(entry.answer)}</p>`).join('')}</div>`:''}
 </div>`;
}
function reviewQueue(p,escape){
 const rows=p.reviews||[];
 return `<section class="rare-review-area"><h2>Host answer review</h2>
  <p>These answers are not recognised by the curated list. Approve only if they genuinely fit this specific question. Your decisions are recorded. ${p.reviewSource?`<a class="rare-review-source" href="${escape(p.reviewSource)}" target="_blank" rel="noopener noreferrer">Open the topic reference</a>`:'No external reference is attached for this topic; verify unfamiliar answers before accepting.'}</p>
  <div class="rare-review-list">${rows.map(row=>`<article class="rare-review-row">
   <div><strong>${escape(row.answer)}</strong><small>${row.count} ${row.count===1?'entry':'entries'} · ${row.decision?'Marked '+row.decision:'Review required'}</small></div>
   <div class="rare-review-buttons">
     <select aria-label="Match ${escape(row.answer)} to an accepted answer" data-review-select="${escape(row.token)}">
       <option value="" ${!row.canonical?'selected':''}>Accept as another valid answer</option>
       ${p.answerChoices.map(choice=>`<option value="${escape(choice)}" ${row.canonical===choice?'selected':''}>Match: ${escape(choice)}</option>`).join('')}
     </select>
     <button type="button" class="button outline small" data-action="rare-review-approve" data-review-token="${escape(row.token)}" aria-pressed="${row.decision==='approve'}">Accept</button>
     <button type="button" class="button outline small" data-action="rare-review-reject" data-review-token="${escape(row.token)}" aria-pressed="${row.decision==='reject'}">Reject</button>
   </div></article>`).join('')}</div>
  <p class="rare-review-footnote">${p.remaining} ${p.remaining===1?'answer still needs':'answers still need'} a decision.</p>
  </section>`;
}
function finalRows(s,escape,host){
 const rankings=s.players||[];
 const highest=rankings[0]?.score??0;
 const top=rankings.filter(entry=>entry.score===highest);
 const title=top.length===1?escape(top[0].name)+' found the edge!':'It’s a shared Rare Find win!';
 return `<div class="rare-finale"><span class="rare-eyebrow">RARE FIND · FINAL RESULTS</span>
  <h1>${title}</h1>${partyFinale(s,{host,escape})}<p>Correct answers scored best when nobody else thought of them.</p>
  <ol class="rare-final-leaders">${rankings.map(entry=>{
    const rank=rankings.findIndex(candidate=>candidate.score===entry.score)+1;
    return `<li><span><b>${rank}.</b> ${face(entry)}${escape(entry.name)}</span><strong>${entry.score.toLocaleString()} PTS</strong></li>`;
  }).join('')}</ol>
  </div>`;
}
export function rareFindView(s,{host,canControl,escape,icons,reply}){
 const p=s.party;
 if(!p||p.type!=='rare')return '';
 const phase=s.phase,write=phase==='rare-write',review=phase==='rare-review',reveal=phase==='rare-reveal',finished=phase==='finished';
 const header=`<header class="rare-head"><span class="rare-wordmark">RARE<span>FIND</span></span>
   <span class="rare-round">ROUND ${s.index+1} / ${s.total}</span>
   <span class="rare-status">${write?'SEEK AN ANSWER':review?'HOST REVIEW':reveal?'RARITY REVEAL':'GAME COMPLETE'}</span></header>`;
 let stage='',footer='';
 if(finished){
  stage=finalRows(s,escape,host)+(!host?`<p class="rare-personal-total">Your final total: <strong>${s.player?.score?.toLocaleString()??0} pts</strong></p>`:'');
  if(canControl)footer=`<div class="rare-footer">${replayButtons(s,icons)}</div>`;
 }else{
  const prompt=`<div class="rare-prompt"><span class="rare-eyebrow">${escape(p.category)} · ORIGINAL CHALLENGE</span>
    <h1>${escape(p.prompt)}</h1>
    <p>${write?'Try for a valid answer nobody else will choose. Unique: 200 pts · two matches: 100 each · 3+: 50 each.':
      review?'Unrecognised entries must be checked before any round results can be revealed.':
      'These are the real submissions from your room. Different spellings of accepted answers count together.'}</p></div>`;
  let body='';
  if(write){
    if(host)body=`<div class="rare-wait">${answerWall(s,escape,'responses locked')||`<div class="rare-gem" aria-hidden="true">?</div><strong>${p.submissions} / ${p.responseTarget} responses locked</strong>`}<p>All answers stay private until the host review or reveal.</p></div>`;
    else if(p.answered)body=`<div class="rare-locked" role="status"><strong>ANSWER LOCKED</strong><span>${escape(p.ownAnswer)}</span><p>Wait for the host to reveal what everyone chose.</p></div>`;
    else body=`<form id="bluff-form" class="rare-entry-form"><label for="rare-answer">Your answer</label>
      <textarea id="rare-answer" name="reply" maxlength="60" rows="2" required placeholder="Type something correct but unexpected">${escape(reply??'')}</textarea>
      <button class="button primary" type="submit">Lock in my answer ${icons('check')}</button>
      <small>One submission only. Accepted aliases and spelling variations count as the same answer.</small></form>`;
    if(host)footer='<div class="rare-footer"><button type="button" class="button outline" data-action="advance">Close answers / review</button></div>';
  }else if(review){
    body=host?reviewQueue(p,escape):`<div class="rare-wait"><div class="rare-gem" aria-hidden="true">◆</div>
      <strong>Answers are being checked</strong><p>The TV host is reviewing unusual answers before the scores appear.</p></div>`;
    if(host)footer=`<div class="rare-footer"><button type="button" class="button primary" data-action="advance" ${p.remaining?'disabled':''}>
      ${p.remaining?'Review all answers to continue':'Reveal real answers and points'} ${icons('arrow-right')}</button></div>`;
  }else if(reveal){
    body=`<div class="rare-reveal-head"><strong>${p.results.valid} valid responses</strong><span>${p.results.responded} submitted · ${p.results.invalidCount} unaccepted</span></div>`+revealRows(p,escape)+
      (!host?`<p class="rare-own-score">You earned <strong>+${p.earned} pts</strong> this round.</p>`:'')+
      (p.source?`<p class="rare-source"><a href="${escape(p.source)}" target="_blank" rel="noopener noreferrer">Review reference source</a></p>`:'');
    if(host)footer=`<div class="rare-footer"><button type="button" class="button primary" data-action="advance">
      ${s.index+1<s.total?'Next rarity round':'Show final standings'} ${icons('arrow-right')}</button></div>`;
  }
  stage=prompt+body;
 }
 return `<section class="game-panel rare-game" data-rare-phase="${phase}">${header}<div class="rare-stage">${stage}</div>${footer}</section>`;
}
