import { potatoCircleView, potatoSvg } from './potato-stage.js';
import { replayButtons } from './game-night.js';
import { partyFinale } from './party-finale.js';
import { socialModes, modes } from './game-config.js';
import {forkView} from './fork-view.js';
import {samePageView} from './same-page-view.js';
import {spotlightView} from './spotlight-view.js';
import {brainLadderView} from './brain-ladder-view.js';
import {topAnswersView} from './top-answers-view.js';
import {rareFindView} from './rare-find-view.js';
import {bluffView} from './bluff-view.js';
import {sketchView} from './sketch-view.js';
import {bloodmoonView} from './bloodmoon-view.js';
import {catchUpView} from './catch-up-view.js';
import {shadeView} from './shade-view.js';
import {dontLookView} from './dont-look-view.js';
/** How many pictures across a wall of this many players should be. */
export const wallColumns = count => count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : count <= 16 ? 4 : count <= 25 ? 5 : count <= 36 ? 6 : 8;

export function avatarView(player, escape) {
  const photo = player.avatar ? ` data-room-avatar="${escape(player.avatar)}"` : '';
  return `<span class="player-avatar avatar-initial" aria-hidden="true"${photo}>${escape(Array.from(player.name)[0]?.toUpperCase() ?? '?')}</span>`;
}

export function partyView(state, { host, canControl, escape, reply, icons }) {
  if(state.mode==='bloodmoon')return bloodmoonView(state,{host,canControl,escape,icons});
  if(state.mode==='catchup')return catchUpView(state,{host,canControl,escape,icons});
  if(state.mode==='shade')return shadeView(state,{host,canControl,escape,icons});
  if(state.mode==='dontlook')return dontLookView(state,{host,canControl,escape,icons});
  if(state.mode==='sketch')return sketchView(state,{host,canControl,escape,icons});
  if (state.mode === 'rare') return rareFindView(state,{host,canControl,escape,icons,reply});
  if (state.mode === 'topanswers') return topAnswersView(state,{host,canControl,escape,icons});
  if (state.mode === 'brain') return brainLadderView(state,{host,canControl,escape,icons});
  if (state.mode === 'spotlight') return spotlightView(state,{host,canControl,escape,icons});
  if (state.mode === 'samepage') return samePageView(state,{host,canControl,escape,icons,reply});
  if (state.mode === 'tracks') return forkView(state,{host,canControl,escape,icons,replayButtons});
  if (socialModes.includes(state.mode)) return socialView(state, { host, canControl, escape, reply, icons });
  const party = state.party;
  const finished = state.phase === 'finished';
  const next = label => `<button class="button primary" data-action="advance">${label}</button>`;
  const replay = canControl ? replayButtons(state, icons)
    : '<p>Stay here if the captain starts another game.</p>';
  if (state.mode === 'potato') {
    if (finished) {
      // The TV tells the full story; a player needs only their own outcome.
      const caught = partyFinale(state, { host, escape, variant: 'potato' });
      if (!host) return `<section class="game-panel results party-results party-phone-finish">
        <div class="eyebrow">HOT POTATO · TIME’S UP</div>${caught}
        <p class="party-phone-hint">Watch the TV for the final reveal.</p><div class="actions">${replay}</div>
      </section>`;
      return `<section class="game-panel results party-results"><div class="eyebrow">TIME’S UP</div>
        <h1>${escape(party.holder.name)} got caught with the potato!</h1>${caught}
        <div class="party-holder">${avatarView(party.holder, escape)}<p>${party.passes} successful ${party.passes === 1 ? 'pass' : 'passes'}</p></div>
        <div class="actions">${replay}</div></section>`;
    }
    const holder = escape(party.holder.name);
    const feedback = party.last && party.last.id === state.player?.id ? { miss: 'Incorrect. You still have the potato.', skip: 'Question skipped. You still have the potato.', pass: 'Correct! You passed the potato.', alone: 'Correct! Waiting for someone else to reconnect before you can pass.', rescue: 'The host moved the potato when your connection dropped. You can rejoin the next turn.' }[party.last.result] : '';
    const rescue = host && party.holderConnected === false ? `<div class="potato-rescue" role="status">
        <strong>${escape(party.holder.name)} appears disconnected.</strong>
        <p>Once their reconnection grace period has passed, you can move the potato to an online player. The countdown keeps running.</p>
        ${party.canRescue ? '<button type="button" class="button outline" data-action="potato-rescue">Move potato to another player</button>'
          : '<small>No other players are currently connected.</small>'}
      </div>` : '';
    // The TV seats everyone in a circle with the potato in front of the holder.
    if (host) return `<section class="game-panel party-panel potato-panel potato-circle-stage">
      <div class="eyebrow">HOT POTATO · SHARED COUNTDOWN</div>
      ${potatoCircleView(party, escape, avatarView)}${rescue}</section>`;
    return `<section class="game-panel party-panel potato-panel"${party.holding ? ' data-holding' : ''}>
      <div class="eyebrow">HOT POTATO · SHARED COUNTDOWN</div>
      <div class="phone-potato" aria-hidden="true"><div class="hot-potato-pulse">${potatoSvg}</div></div>
      <h1>${party.holding ? 'You have the potato!' : holder + ' has the potato'}</h1>
      <div class="party-holder">${avatarView(party.holder, escape)}<p>${party.passes} successful ${party.passes === 1 ? 'pass' : 'passes'}</p></div>
      ${feedback ? `<p class="party-feedback" role="status">${feedback}</p>` : ''}
      ${party.holding ? `<div class="potato-question"><h2>${escape(party.question.prompt)}</h2>
        <div class="answers">${party.question.options.map((option, index) => `<button class="answer potato-choice" style="--answer:var(--pink)" data-action="potato-answer" data-option="${index}"><strong>${'ABCD'[index]}</strong><span>${escape(option)}</span></button>`).join('')}</div>
        <button class="button outline" data-action="potato-skip">Skip question</button><p>A skip or wrong answer gives you a new question. You keep the potato until you get one right.</p></div>`
        : '<p>Only the current holder receives a question. The timer keeps ticking when the potato moves.</p>'}
    </section>`;
  }

  return bluffView(state,{host,canControl,escape,reply,icons});
}

function socialView(state, { host, canControl, escape, reply, icons }) {
  const { party, phase, mode, index, total } = state;
  const title = modes.find(([id]) => id === mode)[1];
  const tracks = party.tracks.length > 0;
  const writing = phase === 'party-write';
  const voting = phase === 'party-vote';
  const finished = phase === 'finished';
  const next = label => canControl ? `<div class="actions"><button class="button primary" data-action="advance">${label}</button></div>` : '';
  const vote = (id, label) => !host && voting && !party.voted
    ? `<button class="button primary small party-vote-button" type="button" data-action="bluff-vote" data-id="${id}" aria-label="${label}">${label}</button>` : '';
  const prompt = `<p class="bluff-prompt">${escape(party.prompt)}</p>`;

  let body;
  if (finished) {
    const best = state.players[0]?.score ?? 0;
    const winners = state.players.filter(player => player.score === best);
    const teamWinners = state.playStyle === 'teams' ? state.teams.filter(team => state.teamWinners?.includes(team.id)) : [];
    const headline = state.playStyle === 'teams'
      ? teamWinners.length === 1 ? 'Team ' + escape(teamWinners[0].name) + ' wins!' : 'The teams are tied!'
      : winners.length === 1 ? escape(winners[0].name) + ' wins!' : 'It’s a tie!';
    const outro = canControl ? `<div class="actions">${replayButtons(state, icons)}</div>`
      : '<p class="party-phone-hint">Stay here if the captain starts another game.</p>';
    if (!host) {
      const scoreList = state.players.map(player =>
        `<li><span>${escape(player.name)}</span><strong>${player.score.toLocaleString('en-GB')} pts</strong></li>`).join('');
      const teamList = state.playStyle === 'teams'
        ? `<h3>Team scores</h3><ol class="party-phone-score-list">${[...state.teams].sort((a,b)=>b.score-a.score)
            .map(team=>`<li><span>Team ${escape(team.name)}</span><strong>${team.score.toLocaleString('en-GB')} pts</strong></li>`).join('')}</ol>`
        : '';
      body = `${partyFinale(state, { host, escape })}
        <p class="party-phone-hint">See the final celebration and leaderboard on the TV.</p>
        <details class="party-phone-scores"><summary>View all scores without a TV</summary>
          ${teamList}<ol class="party-phone-score-list">${scoreList}</ol>
        </details>${outro}`;
    } else {
      body = `${partyFinale(state, { host, escape })}<h1>${tracks ? 'All tracks explored' : headline}</h1>
        ${tracks ? '<p>Play again for another set of dilemmas.</p>' : `<ol class="ranking">${state.players.map(player => `<li><span>${avatarView(player, escape)}${escape(player.name)}</span><strong>${player.score.toLocaleString()} pts</strong></li>`).join('')}</ol>`}
        ${outro}`;
    }
  } else if (writing) {
    const waiting = party.wrote ? '<p role="status">Entry locked in.</p>' : '';
    const editor = party.hand ? `<div class="bluff-replies">${party.hand.map((card, option) => `<button class="button outline play-card" data-action="social-card" data-option="${option}" data-hand-version="${party.handVersion ?? 0}">${escape(card)}</button>`).join('')}</div>
        <div class="party-hand-options">${party.redrawAvailable ? '<button class="button outline" type="button" data-action="social-redraw">Refresh my six cards</button><small>One free hand refresh each round, before you lock in.</small>' : '<small>Hand refresh already used for this round.</small>'}</div>`
      : `<form id="bluff-form"><label>Your reply<textarea name="reply" rows="3" maxlength="100" required>${escape(reply ?? '')}</textarea></label><button class="button primary">Lock in reply</button></form>`;
    body = `<h1>${mode === 'cards' ? 'Complete the sentence' : 'Write a punchline'}</h1>${party.votePoints === 200 ? '<p class="party-final-bonus" role="status">Final round · Every vote earns double points</p>' : ''}${prompt}
      ${host ? `<p role="status">${party.submissions} of ${party.responseTarget} entered</p>` : waiting || editor}
      ${next('Open voting')}`;
  } else {
    const votes = party.trackVotes;
    const leader = votes && votes[0] !== votes[1] ? (votes[0] > votes[1] ? 'Track A' : 'Track B') : '';
    body = `<h1>${voting ? tracks ? 'Which track?' : 'Vote for your favourite' : tracks ? leader ? leader + ' wins the vote' : 'The vote is tied' : 'The votes are in'}</h1>
      ${party.votePoints === 200 ? '<p class="party-final-bonus">Final round · Each vote is worth 200 points</p>' : ''}${prompt}
      ${!tracks && voting && party.ballot.length > 6 ? `<p class="party-ballot-note">All ${party.ballot.length} entries are included. Scroll to see every choice before voting.</p>` : ''}
      <div class="bluff-replies party-vote-list ${tracks ? 'tracks-grid' : ''}" role="list" aria-label="${voting ? 'Choose an entry to vote for' : 'Voting results'}">
      ${tracks ? party.tracks.map((track, i) => `<article class="bluff-card party-vote-card" role="listitem"><small>Track ${'AB'[i]}</small><p>${escape(track)}</p>
        ${voting ? vote(i, 'Vote Track ' + 'AB'[i]) : `<strong>${votes[i]} ${votes[i] === 1 ? 'vote' : 'votes'}</strong>`}</article>`).join('')
        : party.ballot.map((entry, i) => `<article class="bluff-card party-vote-card" role="listitem"><small>${voting ? 'Entry ' + (i + 1) : escape(entry.name)}</small>
          <p>${escape(entry.text)}</p>${voting ? entry.yours ? '<small>Your entry</small>' : vote(entry.id, 'Vote for entry ' + (i + 1))
            : `<strong>${entry.votes} ${entry.votes === 1 ? 'vote' : 'votes'} · ${entry.votes * (party.votePoints ?? 100)} pts</strong>`}</article>`).join('')}
      </div>
      ${!tracks && party.shortlisted ? `<p class="shortlist-note">${party.shortlisted} entries weren't available for voting.</p>` : ''}
      ${voting && !tracks && !party.ballot.length ? '<p>No entries were submitted.</p>' : ''}
      ${voting && host ? `<p role="status">${party.submissions} of ${party.responseTarget} voted</p>` : ''}
      ${voting && !host && party.voted ? '<div class="party-vote-confirmation" role="status"><strong>Vote locked in</strong><span>Your choice is saved. Watch for the results on the big screen.</span></div>' : ''}
      ${next(voting ? 'Reveal votes' : index + 1 < total ? 'Next round' : 'Final results')}`;
  }
  const teamScores = state.playStyle === 'teams' && state.teams.length && ((finished && host) || phase === 'party-reveal')
    ? `<div class="party-team-scores" aria-label="Team standings">${[...state.teams].sort((a,b)=>b.score-a.score).map(team=>
      `<div style="--team:${team.color}"><strong>Team ${escape(team.name)}</strong><span>${team.score.toLocaleString()} pts</span></div>`).join('')}</div>`
    : '';
  return `<section class="game-panel party-panel ${finished ? 'results' : ''}">
    <div class="eyebrow">${title} · Round ${index + 1} of ${total}</div>${teamScores}${body}</section>`;
}
