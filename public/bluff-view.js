import { partyFinale } from './party-finale.js';
import {replayButtons} from './game-night.js';
import { answerWall } from './party-views.js';

// TV/phone view for original Spot the Bluff, with no secret prompt in TV markup.
export function bluffView(s,{host,canControl,escape,reply,icons}){
  const party=s.party;
  if(!party)return '';
  const writing=s.phase==='party-write';
  const voting=s.phase==='party-vote';
  const revealing=s.phase==='party-reveal';
  const finished=s.phase==='finished';
  const stage=`<header class="bluff-show-header">
    <span class="bluff-show-logo">SPOT <span>THE BLUFF</span></span>
    <span class="bluff-show-round">ROUND ${s.index+1} / ${s.total}</span>
    <span class="bluff-show-phase">${writing?'SECRET REPLIES':voting?'WHO IS BLUFFING?':revealing?'THE TRUTH':'FINAL RESULTS'}</span>
  </header>`;
  let body='',actions='';
  if(writing){
    body=`<div class="bluff-show-intro"><h1>${host?'One person has no prompt':party.bluffing?'You are the bluff!':'Your secret prompt'}</h1>
      <p>${host?'Everyone writes privately. Exactly one player has to improvise without knowing the question.':
        party.bluffing?'Invent something plausible. You need to blend in with the answers of players who saw the real prompt.':escape(party.prompt)}</p></div>`;
    if(host){
      body+=answerWall(s,escape,'replies in')||`<div class="bluff-show-progress" role="status"><strong>${party.submissions} / ${party.responseTarget}</strong><span>replies received</span></div>`;
    }else if(party.wrote){
      body+='<p class="bluff-show-locked" role="status">Your reply is locked. Wait for the voting round.</p>';
    }else{
      body+=`<form id="bluff-form" class="bluff-show-entry">
        <label>Your reply<textarea name="reply" maxlength="100" rows="3" required placeholder="Write a convincing answer">${escape(reply??'')}</textarea></label>
        <button class="button primary" type="submit">Lock in reply ${icons('check')}</button>
      </form>`;
    }
    if(canControl)actions='<button type="button" class="button primary" data-action="advance">Open the vote</button>';
  }else if(voting||revealing){
    const showTruth=revealing;
    body=`<div class="bluff-show-intro">
      <h1>${showTruth?(party.caught?'The bluff was caught!':'The bluff escaped the vote!'):'Who had no prompt?'}</h1>
      <p>${escape(party.prompt)}</p>
      ${showTruth?`<p class="bluff-show-verdict"><strong>${escape(party.liarName)}</strong> was bluffing.
        ${party.correctVotes} ${party.correctVotes===1?'player spotted':'players spotted'} the bluff.
        ${party.escaped?'The bluff earned 100 escape points.':''}</p>`:''}
    </div>
    <div class="bluff-replies bluff-show-cards" role="list" aria-label="${showTruth?'Round replies and voting results':'Replies to vote on'}">
      ${(party.replies??[]).length?(party.replies??[]).map((entry,i)=>`<article class="bluff-card party-vote-card ${showTruth&&entry.id===party.liarId?'revealed-bluff':''}" role="listitem">
        <header><span class="bluff-show-number">${i+1}</span><strong>${escape(entry.name)}</strong>${showTruth&&entry.id===party.liarId?'<b class="bluff-show-truth">THE BLUFF</b>':''}</header>
        <p>${escape(entry.text)}</p>
        ${showTruth?`<small>${entry.votes} ${entry.votes===1?'vote':'votes'}</small>`:
          !host&&entry.id===s.player?.id?'<small>Your reply — you cannot vote for yourself.</small>':
          !host&&!party.voted?`<button type="button" class="button outline small party-vote-button" data-action="bluff-vote" data-id="${escape(entry.id)}" aria-label="Vote for ${escape(entry.name)}">Vote for ${escape(entry.name)}</button>`:''}
      </article>`).join(''):'<p class="bluff-show-empty">No player replies were submitted for this round.</p>'}
    </div>
    ${!showTruth&&host?answerWall(s,escape,'votes in')||`<p class="bluff-show-progress" role="status">${party.submissions} / ${party.responseTarget} votes submitted</p>`:''}
    ${!showTruth&&!host&&party.voted?'<div class="bluff-show-locked party-vote-confirmation" role="status"><strong>Vote locked in</strong><span>Your choice is saved. Watch the TV for the reveal.</span></div>':''}
    ${showTruth&&!host?`<p class="bluff-show-earned" role="status">You earned <strong>+${party.ownEarned??0} points</strong> this round.</p>`:''}`;
    if(canControl)actions=`<button type="button" class="button primary" data-action="advance">${
      showTruth?(s.index+1<s.total?'Next secret round':'Show final standings'):'Reveal the bluff'} ${icons('arrow-right')}</button>`;
  }else if(finished){
    const players=s.players??[];
    const top=players[0]?.score??0;
    const winners=players.filter(p=>p.score===top);
    body=`<div class="bluff-show-finale"><span class="eyebrow">THE FINAL REVEAL</span>
      <h1>${winners.length===1?escape(winners[0].name)+' wins!':'It’s a shared win!'}</h1>
      ${partyFinale(s,{host,escape})}<p>Correctly identify the bluff for +100 points. Escape as the bluff for +100 points.</p>
      <ol class="ranking bluff-show-standings">${players.map(p=>{
        const rank=players.findIndex(candidate=>candidate.score===p.score)+1;
        return `<li><span>${rank}. ${escape(p.name)}</span><strong>${p.score.toLocaleString()} pts</strong></li>`;
      }).join('')}</ol>
    </div>`;
    if(canControl)actions=replayButtons(s,icons);
  }
  return `<section class="game-panel party-panel bluff-game ${finished?'results':''}" data-bluff-phase="${s.phase}">
    ${stage}<div class="bluff-show-stage">${body}</div>
    ${actions?`<div class="actions bluff-show-actions">${actions}</div>`:''}
  </section>`;
}
