import { partyFinale } from './party-finale.js';
import {replayButtons} from './game-night.js';
import { answerWall } from './party-views.js';
import { face } from './player-face.js';

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
    body=`<div class="bluff-show-intro"><h1>${host?'One of you cannot see the prompt':party.bluffing?'You are the bluff!':'Your secret prompt'}</h1>
      <p>${host?'Everyone answers on their phone. The bluffer only knows what kind of answer to write, and has to blend in.':
        party.bluffing?'You cannot see the prompt. Write something that could pass for an answer, then keep a straight face.':escape(party.prompt)}</p>
      ${!host&&party.bluffing&&party.hint?`<p class="bluff-show-hint"><span>Everyone else is writing</span><strong>${escape(party.hint)}</strong></p>`:''}</div>`;
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
    // The reveal has two beats, both timed by the server: the vote count, then the unmasking.
    const counting=revealing&&party.stage==='count';
    const showTruth=revealing&&!counting;
    const liar=showTruth?(party.replies??[]).find(entry=>entry.id===party.liarId)??{id:party.liarId,name:party.liarName}:undefined;
    const most=Math.max(1,...(party.replies??[]).map(entry=>entry.votes??0));
    body=`<div class="bluff-show-intro">
      <h1>${showTruth?(party.caught?'Caught!':'Got away with it!'):counting?'The votes are in…':'Who had no prompt?'}</h1>
      <p class="bluff-show-prompt">${escape(party.prompt)}</p>
      ${counting?`<p class="bluff-show-countdown" role="status">The room suspects ${(party.suspects??[]).length>1?'more than one of you':(party.suspects??[]).length?'one of you most of all':'nobody'}. The bluffer is about to be unmasked…</p>`:''}
      ${showTruth?`<div class="bluff-show-unmask ${party.caught?'is-caught':'is-escaped'}" role="status">
        ${face(liar)}<div><span>THE BLUFFER WAS</span><strong>${escape(party.liarName)}</strong>
        <small>${party.correctVotes} ${party.correctVotes===1?'player':'players'} spotted it · ${party.fooled??0} fooled${
          (party.fooled??0)||party.escaped?` · +${(party.fooled??0)*50+(party.escaped?100:0)} for the bluffer`:''}</small></div>
        <b>${party.caught?'CAUGHT':'ESCAPED'}</b></div>`:''}
    </div>
    <div class="bluff-replies bluff-show-cards" role="list" aria-label="${showTruth?'Round replies and voting results':'Replies to vote on'}">
      ${(party.replies??[]).length?(party.replies??[]).map((entry,i)=>`<article class="bluff-card party-vote-card ${showTruth&&entry.id===party.liarId?'revealed-bluff':''} ${revealing&&(party.suspects??[]).includes(entry.id)?'is-suspect':''}" role="listitem">
        <header>${face(entry)}<strong>${escape(entry.name)}</strong>${showTruth&&entry.id===party.liarId?'<b class="bluff-show-truth">THE BLUFF</b>':revealing&&(party.suspects??[]).includes(entry.id)?'<b class="bluff-show-suspect">MOST SUSPECTED</b>':''}</header>
        <p>${escape(entry.text)}</p>
        ${revealing?`<small class="bluff-show-votes"><span class="bluff-vote-bar"><i style="width:${Math.round(100*(entry.votes??0)/most)}%"></i></span>${entry.votes} ${entry.votes===1?'vote':'votes'}</small>`:
          !host&&entry.id===s.player?.id?'<small>Your reply — you cannot vote for yourself.</small>':
          !host&&!party.voted?`<button type="button" class="button outline small party-vote-button" data-action="bluff-vote" data-id="${escape(entry.id)}" aria-label="Vote for ${escape(entry.name)}">Vote</button>`:''}
      </article>`).join(''):'<p class="bluff-show-empty">No player replies were submitted for this round.</p>'}
    </div>
    ${voting&&host?answerWall(s,escape,'votes in')||`<p class="bluff-show-progress" role="status">${party.submissions} / ${party.responseTarget} votes submitted</p>`:''}
    ${voting&&!host&&party.voted?'<div class="bluff-show-locked party-vote-confirmation" role="status"><strong>Vote locked in</strong><span>Your choice is saved. Watch the TV for the reveal.</span></div>':''}
    ${showTruth&&!host?`<p class="bluff-show-earned" role="status">You earned <strong>+${party.ownEarned??0} points</strong> this round.</p>`:''}`;
    if(canControl&&!counting)actions=`<button type="button" class="button primary" data-action="advance">${
      showTruth?(s.index+1<s.total?'Next secret round':'Show final standings'):'Count the votes'} ${icons('arrow-right')}</button>`;
  }else if(finished){
    const players=s.players??[];
    const top=players[0]?.score??0;
    const winners=players.filter(p=>p.score===top);
    body=`<div class="bluff-show-finale"><span class="eyebrow">THE FINAL REVEAL</span>
      <h1>${winners.length===1?escape(winners[0].name)+' wins!':'It’s a shared win!'}</h1>
      ${partyFinale(s,{host,escape})}
      ${party.titles?.eye||party.titles?.bluffer?`<div class="bluff-show-titles">
        ${party.titles.eye?`<div><span>SHARPEST EYE</span><strong>${party.titles.eye.names.map(escape).join(' & ')}</strong><small>spotted the bluffer ${party.titles.eye.count} ${party.titles.eye.count===1?'time':'times'}</small></div>`:''}
        ${party.titles.bluffer?`<div><span>BEST BLUFFER</span><strong>${party.titles.bluffer.names.map(escape).join(' & ')}</strong><small>fooled ${party.titles.bluffer.count} ${party.titles.bluffer.count===1?'player':'players'}</small></div>`:''}
      </div>`:''}
      <p>Spot the bluffer for +100. As the bluffer: +50 for every player you fool, and +100 if you escape.</p>
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
