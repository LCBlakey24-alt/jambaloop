import { replayButtons } from './game-night.js';
import { socialModes, modes } from './game-config.js';
import {forkView} from './fork-view.js';
import {samePageView} from './same-page-view.js';
import {spotlightView} from './spotlight-view.js';
import {brainLadderView} from './brain-ladder-view.js';
export function avatarView(player, escape) {
  return player.avatar ? `<img class="player-avatar" src="${escape(player.avatar)}" alt="" loading="lazy">`
    : `<span class="player-avatar avatar-initial" aria-hidden="true">${escape(Array.from(player.name)[0]?.toUpperCase() ?? '?')}</span>`;
}

export function partyView(state, { host, canControl, escape, reply, icons }) {
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
    if (finished) return `<section class="game-panel results party-results"><div class="eyebrow">TIME’S UP</div>
      <h1>${escape(party.holder.name)} got caught with the potato!</h1><div class="party-holder">${avatarView(party.holder, escape)}<p>${party.passes} successful ${party.passes === 1 ? 'pass' : 'passes'}</p></div><div class="actions">${replay}</div></section>`;
    const holder = escape(party.holder.name);
    const feedback = party.last && party.last.id === state.player?.id ? { miss: 'Incorrect. You still have the potato.', skip: 'Question skipped. You still have the potato.', pass: 'Correct! You passed the potato.', alone: 'Correct! Waiting for someone else to reconnect before you can pass.' }[party.last.result] : '';
    return `<section class="game-panel party-panel potato-panel">
      <div class="eyebrow">HOT POTATO · SHARED COUNTDOWN</div>
      ${host ? '<div class="potato-stage-clock"><span class="timer potato-timer" id="timer"></span></div>' : ''}
      <h1>${party.holding ? 'You have the potato!' : holder + ' has the potato'}</h1>
      <div class="party-holder">${avatarView(party.holder, escape)}<p>${party.passes} successful ${party.passes === 1 ? 'pass' : 'passes'}</p></div>
      ${feedback ? `<p class="party-feedback" role="status">${feedback}</p>` : ''}
      ${party.holding ? `<div class="potato-question"><h2>${escape(party.question.prompt)}</h2>
        <div class="answers">${party.question.options.map((option, index) => `<button class="answer potato-choice" style="--answer:var(--pink)" data-action="potato-answer" data-option="${index}"><strong>${'ABCD'[index]}</strong><span>${escape(option)}</span></button>`).join('')}</div>
        <button class="button outline" data-action="potato-skip">Skip question</button><p>A skip or wrong answer gives you a new question. You keep the potato until you get one right.</p></div>`
        : '<p>Only the current holder receives a question. The timer keeps ticking when the potato moves.</p>'}
    </section>`;
  }

  if (state.phase === 'party-write') return `<section class="game-panel party-panel"><div class="eyebrow">SPOT THE BLUFF · REPLIES</div>
    <h1>${host ? 'Write your replies' : party.bluffing ? 'You are the bluff' : 'Your private prompt'}</h1>
    <p>${host ? 'Everyone writes a reply on their phone. One person has no prompt.' : party.bluffing ? 'You don’t get the prompt. Make up a short reply and try to blend in.' : escape(party.prompt)}</p>
    ${host ? `<p role="status">${party.submissions} of ${party.responseTarget} replied</p>` : party.wrote ? '<p role="status">Reply locked in.</p>' :
      `<form id="bluff-form"><label>Your reply<textarea name="reply" rows="3" required maxlength="100">${escape(reply ?? '')}</textarea></label><button class="button primary" type="submit">Lock in reply</button></form>`}
    ${canControl ? `<div class="actions">${next('Show replies and open voting')}</div>` : ''}</section>`;

  return `<section class="game-panel party-panel ${finished ? 'results' : ''}"><div class="eyebrow">SPOT THE BLUFF · ${finished ? 'RESULTS' : 'VOTING'}</div>
    <h1>${finished ? escape(party.liarName) + (party.caught ? ' was caught!' : ' got away with it!') : 'Who was bluffing?'}</h1>
    <p class="bluff-prompt">${escape(party.prompt)}</p>
    <div class="bluff-replies">${party.replies.map(entry => `<article class="bluff-card ${entry.id === party.liarId ? 'revealed-bluff' : ''}">
      <header>${avatarView(entry, escape)}<strong>${escape(entry.name)}</strong></header>
      <p>${entry.text ? escape(entry.text) : 'No reply'}</p>
      ${finished ? `<small>${entry.votes} ${entry.votes === 1 ? 'vote' : 'votes'}${entry.id === party.liarId ? ' · The bluff' : ''}</small>`
        : !host && state.player.id !== entry.id && !party.voted ? `<button class="button outline small" data-action="bluff-vote" data-id="${entry.id}">Vote for ${escape(entry.name)}</button>` : ''}
    </article>`).join('')}</div>
    ${!finished && !host && party.voted ? '<p role="status">Vote locked in.</p>' : ''}
    ${!finished && host ? `<p role="status">${party.submissions} of ${party.responseTarget} voted</p>` : ''}
    <div class="actions">${finished ? replay : canControl ? next('Reveal the bluff') : ''}</div></section>`;
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
    ? `<button class="button primary small" data-action="bluff-vote" data-id="${id}">${label}</button>` : '';
  const prompt = `<p class="bluff-prompt">${escape(party.prompt)}</p>`;

  let body;
  if (finished) {
    const best = state.players[0]?.score ?? 0;
    const winners = state.players.filter(player => player.score === best);
    body = `<h1>${tracks ? 'All tracks explored' : winners.length === 1 ? escape(winners[0].name) + ' wins!' : 'It’s a tie!'}</h1>
      ${tracks ? '<p>Play again for another set of dilemmas.</p>' : `<ol class="ranking">${state.players.map(player => `<li><span>${avatarView(player, escape)}${escape(player.name)}</span><strong>${player.score.toLocaleString()} pts</strong></li>`).join('')}</ol>`}
      ${canControl ? `<div class="actions">${replayButtons(state, icons)}</div>` : '<p>Stay here if the captain starts another game.</p>'}`;
  } else if (writing) {
    const waiting = party.wrote ? '<p role="status">Entry locked in.</p>' : '';
    const editor = party.hand ? `<div class="bluff-replies">${party.hand.map((card, option) => `<button class="button outline play-card" data-action="social-card" data-option="${option}">${escape(card)}</button>`).join('')}</div>`
      : `<form id="bluff-form"><label>Your reply<textarea name="reply" rows="3" maxlength="100" required>${escape(reply ?? '')}</textarea></label><button class="button primary">Lock in reply</button></form>`;
    body = `<h1>${mode === 'cards' ? 'Complete the sentence' : 'Write a punchline'}</h1>${prompt}
      ${host ? `<p role="status">${party.submissions} of ${party.responseTarget} entered</p>` : waiting || editor}
      ${next('Open voting')}`;
  } else {
    const votes = party.trackVotes;
    const leader = votes && votes[0] !== votes[1] ? (votes[0] > votes[1] ? 'Track A' : 'Track B') : '';
    body = `<h1>${voting ? tracks ? 'Which track?' : 'Vote for your favourite' : tracks ? leader ? leader + ' wins the vote' : 'The vote is tied' : 'The votes are in'}</h1>
      ${prompt}<div class="bluff-replies ${tracks ? 'tracks-grid' : ''}">
      ${tracks ? party.tracks.map((track, i) => `<article class="bluff-card"><small>Track ${'AB'[i]}</small><p>${escape(track)}</p>
        ${voting ? vote(i, 'Vote Track ' + 'AB'[i]) : `<strong>${votes[i]} ${votes[i] === 1 ? 'vote' : 'votes'}</strong>`}</article>`).join('')
        : party.ballot.map((entry, i) => `<article class="bluff-card"><small>${voting ? 'Entry ' + (i + 1) : escape(entry.name)}</small>
          <p>${escape(entry.text)}</p>${voting ? entry.yours ? '<small>Your entry</small>' : vote(entry.id, 'Vote for entry ' + (i + 1))
            : `<strong>${entry.votes} ${entry.votes === 1 ? 'vote' : 'votes'} · ${entry.votes * 100} pts</strong>`}</article>`).join('')}
      </div>
      ${!tracks && party.shortlisted ? `<p class="shortlist-note">The room submitted ${party.ballot.length + party.shortlisted} entries. Six were drawn at random for the ballot.</p>` : ''}
      ${voting && !tracks && !party.ballot.length ? '<p>No entries were submitted.</p>' : ''}
      ${voting && host ? `<p role="status">${party.submissions} of ${party.responseTarget} voted</p>` : ''}
      ${voting && !host && party.voted ? '<p role="status">Vote locked in.</p>' : ''}
      ${next(voting ? 'Reveal votes' : index + 1 < total ? 'Next round' : 'Final results')}`;
  }
  const teamScores = state.playStyle === 'teams' && state.teams.length && (finished || phase === 'party-reveal')
    ? `<div class="party-team-scores" aria-label="Team standings">${[...state.teams].sort((a,b)=>b.score-a.score).map(team=>
      `<div style="--team:${team.color}"><strong>Team ${escape(team.name)}</strong><span>${team.score.toLocaleString()} pts</span></div>`).join('')}</div>`
    : '';
  const winner = finished && state.playStyle === 'teams' && state.teamWinners?.length === 1
    ? `<p class="party-team-winner">Team ${escape(state.teams.find(t=>t.id===state.teamWinners[0])?.name)} wins!</p>` : '';
  return `<section class="game-panel party-panel ${finished ? 'results' : ''}">
    <div class="eyebrow">${title} · Round ${index + 1} of ${total}</div>${winner}${teamScores}${body}</section>`;
}
