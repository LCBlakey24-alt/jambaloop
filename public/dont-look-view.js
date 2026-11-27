// Don't Look! on the TV and on phones. The TV shows the word in huge letters
// for the describing team. The guesser's phone never shows the word. The rest
// of the guesser's team get two big buttons: Correct and Pass.
import { avatarView } from './party-views.js';
import { replayButtons } from './game-night.js';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function scoreboard(party, escape, lit = party.active, showGuesser = true) {
  return `<div class="look-teams" data-teams="${party.teams.length}">${party.teams.map(team => `<div class="look-team${team.id === lit ? ' is-active' : ''}" style="--team:${team.colour}">
      <h3>${escape(team.name)}</h3><b>${team.score}</b><small>${plural(team.passes, 'pass').replace('passs', 'passes')}</small>
      <ul>${team.members.map(member => `<li class="${showGuesser && member.id === party.guesser.id ? 'is-guesser' : ''}">${avatarView(member, escape)}<span>${escape(member.name)}</span></li>`).join('')}</ul></div>`).join('')}</div>`;
}

export function dontLookView(state, { host, canControl, escape, icons }) {
  const party = state.party;
  if (!party) return '';
  const phase = state.phase;
  const team = party.teams[party.active];
  const guesser = party.guesser?.name ? escape(party.guesser.name) : 'The guesser';
  const solo = party.teams.length === 1;
  const round = party.round;
  const kicker = `DON’T LOOK! · ROUND ${round.number} OF ${round.of} · ${round.name.toUpperCase()}`;
  const roundBanner = `<div class="look-round" data-round="${round.id}"${round.opens ? ' data-opens' : ''}><b>ROUND ${round.number}</b><strong>${escape(round.name)}</strong><span>${escape(round.rule)}</span></div>`;
  const roundTable = party.teams.length > 1 || party.roundScores.length > 1 ? `<table class="look-rounds"><thead><tr><th></th>${party.teams.map(team => `<th style="color:${team.colour}">${escape(team.name)}</th>`).join('')}</tr></thead>
      <tbody>${party.roundScores.map((scores, index) => `<tr><th>${escape(party.roundNames[index])}</th>${scores.map(score => `<td>${score}</td>`).join('')}</tr>`).join('')}
      <tr class="is-total"><th>Total</th>${party.teams.map(team => `<td>${team.score}</td>`).join('')}</tr></tbody></table>` : '';
  const next = label => canControl ? `<div class="actions look-actions"><button type="button" class="button primary" data-action="advance">${label}</button></div>` : '';
  let body = '';

  if (phase === 'finished') {
    const champion = party.champion === null || party.champion === undefined ? undefined : party.teams[party.champion];
    const title = solo ? `${party.teams[0].score} correct between you!` : champion ? `${escape(champion.name)} win!` : 'It’s a draw!';
    body = `<header class="look-head"><span class="look-kicker">DON’T LOOK! · FULL TIME</span><h1>${title}</h1>
        <p>${party.decidedBy === 'passes' ? 'Level on correct answers, so it went to the team with fewer passes.' : 'All three rounds added together.'}</p></header>
      ${!host && party.earned !== undefined ? `<p class="look-note" role="status">You earned ${party.earned} points.</p>` : ''}
      ${host ? `<div class="look-final">${scoreboard(party, escape, champion?.id ?? -1, false)}${roundTable}</div>` : roundTable + scoreboard(party, escape, champion?.id ?? -1, false)}<div class="actions">${canControl ? replayButtons(state, icons) : '<p>Stay here if the captain starts another game.</p>'}</div>`;
  } else if (phase === 'look-ready') {
    if (host) {
      body = `<header class="look-head"><span class="look-kicker">${kicker}</span><h1><em style="color:${team.colour}">${guesser}</em>, turn your back to the TV</h1>
          <p>${solo ? 'Everyone else' : `The ${escape(team.name)}`} will get the word on this screen across to you. ${party.seconds} seconds.</p></header>
        ${roundBanner}${scoreboard(party, escape)}${next('Start the clock')}`;
    } else if (party.canStart) {
      body = `<header class="look-head"><span class="look-kicker">${kicker} · YOU ARE GUESSING</span><h1>Turn your back to the TV</h1>
          <p>Shout out your guesses. When you are facing away, start the clock.</p></header>${roundBanner}
        <div class="look-buttons"><button type="button" class="look-button is-start" data-action="look-start">I’m not looking · Start</button></div>`;
    } else {
      body = `<header class="look-head"><span class="look-kicker">${kicker}</span><h1>${guesser} is guessing</h1>
          <p>${party.team === party.active ? 'You are helping. The word will be on the TV. Correct and Pass buttons will appear here.' : `It is the ${escape(team.name)}’ turn. Watch for peeking.`}</p></header>${roundBanner}${next('Start the clock')}`;
    }
  } else if (phase === 'look-turn') {
    const last = party.last ? `<p class="look-last" data-got="${party.last.got}" role="status">${party.last.got ? '✓ Correct' : 'Passed'}${party.last.word ? `: ${escape(party.last.word)}` : ''}</p>` : '<p class="look-last" aria-hidden="true">&nbsp;</p>';
    const strip = `<div class="look-strip" style="--team:${team.colour}"><div><small>${solo ? 'GUESSING' : escape(team.name).toUpperCase()}</small><strong>${guesser}</strong></div>
        <b class="look-count">${party.count}</b><div class="look-clock"><small>TIME LEFT</small><span id="timer" class="timer"></span></div></div>`;
    if (host) {
      body = `<header class="look-head is-live"><span class="look-kicker">${kicker}</span></header>${strip}
        <div class="look-card"><small>${escape(party.card.deck)}</small><strong>${escape(party.card.word)}</strong></div>
        <p class="look-rule" data-round="${round.id}">${escape(round.rule)}</p>${last}${next('Stop the clock')}`;
    } else if (party.guessing) {
      body = `<header class="look-head is-live"><span class="look-kicker">${kicker} · YOU ARE GUESSING</span><h1>Don’t look!</h1><p>Listen to your team and shout your guesses.</p></header>
        <div class="look-blind"><b>${party.count}</b><small>correct so far</small><span id="timer" class="timer"></span></div>${last}`;
    } else if (party.canMark) {
      body = `<header class="look-head is-live"><span class="look-kicker">${guesser} is guessing · ${party.count} so far</span></header>
        <p class="look-rule" data-round="${round.id}"><strong>${escape(round.name)}.</strong> ${escape(round.rule)}</p>
        <p class="look-phone-word"><small>${escape(party.card.deck)}</small>${escape(party.card.word)}</p>
        <div class="look-buttons"><button type="button" class="look-button is-correct" data-action="look-mark" data-result="correct">✓ Correct</button>
          <button type="button" class="look-button is-pass" data-action="look-mark" data-result="pass">Pass</button></div>${last}`;
    } else {
      body = `<header class="look-head"><span class="look-kicker">${kicker}</span><h1>The ${escape(team.name)} are up</h1><p>${guesser} is guessing. Watch for peeking.</p></header>
        <p class="look-note" role="status">${party.count} correct so far</p>`;
    }
  } else if (phase === 'look-result') {
    const result = party.result;
    body = `<header class="look-head"><span class="look-kicker">${kicker}</span><h1>${plural(result.correct, 'word')} for ${solo ? guesser : `the ${escape(team.name)}`}</h1>
        ${result.missed ? `<p>The clock stopped on <strong>${escape(result.missed)}</strong>.</p>` : ''}</header>
      <ul class="look-words">${result.words.map(entry => `<li data-got="${entry.got}">${entry.got ? '✓' : '–'} ${escape(entry.word)}</li>`).join('') || '<li data-got="false">No words this turn</li>'}</ul>
      ${host ? scoreboard(party, escape) : ''}${next(party.turn + 1 < party.turns ? 'Next guesser' : 'Final result')}`;
  }
  return `<section class="game-panel look-game" data-look="${phase.replace('look-', '')}">${body}</section>`;
}
