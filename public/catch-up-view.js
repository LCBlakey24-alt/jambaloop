// Catch Up on the TV and on phones. The TV carries the show: the question,
// the clock, the count and the chase track. A phone is a remote: four answer
// buttons when it is your side's turn, and nothing to do when it is not.
import { avatarView } from './party-views.js';
import { replayButtons } from './game-night.js';

const letters = ['A', 'B', 'C', 'D'];
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function roster(side, escape) {
  return `<div class="catch-side" style="--side:${side.colour}"><h3>${escape(side.name)}<small>${plural(side.wins, 'round')} won</small></h3>
    <ul>${side.members.map(member => `<li>${avatarView(member, escape)}<span>${escape(member.name)}</span></li>`).join('')}</ul></div>`;
}

/** TV: a side as a big team card, with its part in this leg and a pip per round won. */
function bigSide(side, role, { active = false, crowned = false, rounds = 0, escape }) {
  const pips = rounds ? `<span class="catch-pips" aria-label="${plural(side.wins, 'round')} won">${Array.from({ length: rounds }, (_, n) => `<i class="${n < side.wins ? 'is-won' : ''}"></i>`).join('')}</span>` : '';
  return `<div class="catch-team${active ? ' is-active' : ''}${crowned ? ' is-crowned' : ''}" style="--side:${side.colour}">
    <span class="catch-role">${role}</span><h3>${escape(side.name)}</h3>
    <ul class="catch-crew" data-size="${side.members.length > 6 ? 'many' : side.members.length > 3 ? 'some' : 'few'}">${side.members.map(member => `<li>${avatarView(member, escape)}<span>${escape(member.name)}</span></li>`).join('')}</ul>${pips}</div>`;
}

/** TV: the round as a finish-line picture, the target as a flag and the chase as a runner. */
function finishLine(result, setter, chaser) {
  const span = Math.max(result.target, result.chase, 5) + 2;
  const at = value => Math.min(88, Math.max(14, 100 * value / span)).toFixed(1);
  // Level or one apart: the runner stops just short of (or just past) the flag so both numbers can be read.
  const flag = Number(at(result.target));
  const reached = Number(at(result.chase));
  const runner = Math.abs(reached - flag) < 10 ? flag + (result.caught ? 10 : -10) : reached;
  return `<div class="catch-finish" data-caught="${result.caught}" aria-hidden="true">
    <i class="catch-finish-run" style="width:${runner}%;--side:${chaser.colour}"></i>
    <b class="catch-finish-flag" style="left:${flag}%;--side:${setter.colour}"><span>${result.target}</span><small>TARGET</small></b>
    <b class="catch-finish-runner" style="left:${runner}%;--side:${chaser.colour}"><span>${result.chase}</span><small>CHASE</small></b></div>`;
}

/** The chase track: the target as a flag, the count as a runner closing on it. */
function track(party, side) {
  const target = party.target;
  const span = Math.max(target ?? 0, party.count ?? 0, 5) + 2;
  const at = value => Math.min(100, 100 * value / span).toFixed(1);
  return `<div class="catch-track" style="--side:${side.colour}" aria-hidden="true">
    <i class="catch-fill" style="width:${at(party.count ?? 0)}%"></i>
    ${target === undefined ? '' : `<b class="catch-target" style="left:${at(target)}%"><span>${target}</span></b>`}
    <b class="catch-runner" style="left:${at(party.count ?? 0)}%"></b></div>`;
}

export function catchUpView(state, { host, canControl, escape, icons }) {
  const party = state.party;
  if (!party) return '';
  const phase = state.phase;
  const sides = party.sides;
  const turn = sides[party.turn];
  const other = sides[1 - party.turn];
  const mine = party.side === undefined ? undefined : sides[party.side];
  const next = label => canControl ? `<div class="actions catch-actions"><button type="button" class="button primary" data-action="advance">${label}</button></div>` : '';
  const kicker = `CATCH UP · ROUND ${party.round + 1} OF ${party.rounds}`;
  let body = '';

  if (phase === 'finished') {
    const champion = party.champion === null || party.champion === undefined ? undefined : sides[party.champion];
    body = `<header class="catch-head"><span class="catch-kicker">CATCH UP · FULL TIME</span>
        <h1>${champion ? `${escape(champion.name)} win!` : 'Honours even!'}</h1><p>${sides.map(side => `${escape(side.name)} ${side.wins}`).join(' · ')} rounds${party.decidedBy === 'answers' ? ` · level on rounds, won ${party.right[champion.id]}–${party.right[1 - champion.id]} on right answers` : party.decidedBy === 'mistakes' ? ' · level on rounds and right answers, won with fewer wrong answers' : ''}</p></header>
      ${!host && mine ? `<p class="catch-note" role="status">${champion ? (champion.id === mine.id ? 'Your side won.' : 'Your side lost this one.') : 'A draw.'}${party.earned ? ` You earned ${party.earned} points.` : ''}</p>` : ''}
      ${host ? `<div class="catch-versus is-final">${bigSide(sides[0], champion?.id === 0 ? '★ CHAMPIONS' : champion ? 'RUNNERS-UP' : 'LEVEL', { crowned: champion?.id === 0, rounds: party.rounds, escape })}
          <div class="catch-vs"><span>${sides[0].wins}–${sides[1].wins}</span><small>ROUNDS</small></div>
          ${bigSide(sides[1], champion?.id === 1 ? '★ CHAMPIONS' : champion ? 'RUNNERS-UP' : 'LEVEL', { crowned: champion?.id === 1, rounds: party.rounds, escape })}</div>`
        : `<div class="catch-sides">${sides.map(side => roster(side, escape)).join('')}</div>`}
      <div class="actions">${canControl ? replayButtons(state, icons) : '<p>Stay here if the captain starts another game.</p>'}</div>`;
  } else if (phase === 'catch-ready') {
    const title = party.chasing ? `${escape(turn.name)} chase: beat ${party.target}` : `${escape(turn.name)} run first`;
    const line = party.chasing ? `${party.seconds} seconds and fresh questions. ${escape(turn.name)} need more than ${party.target} to catch ${escape(other.name)}.`
      : `${party.seconds} seconds to answer as many as they can. Any player on the side can answer; the first answer counts. A wrong answer freezes the side for a moment.`;
    body = `<header class="catch-head"><span class="catch-kicker">${kicker}</span><h1>${title}</h1><p>${line}</p></header>
      ${!host && mine ? `<p class="catch-note" role="status">You are on the ${escape(mine.name)}. ${mine.id === turn.id ? 'Your side is up: get ready.' : 'Your side watches this one.'}</p>` : ''}
      ${!host && !mine ? '<p class="catch-note" role="status">You joined after the sides were picked. Watch this one and play the next.</p>' : ''}
      ${host ? `<div class="catch-versus">${bigSide(turn, party.chasing ? 'CHASING NOW' : 'RUNNING FIRST', { active: true, rounds: party.rounds, escape })}
          <div class="catch-vs"><span>VS</span><div class="catch-dial"><b>${party.seconds}</b><small>SECONDS</small></div>
            ${party.chasing ? `<div class="catch-beat"><small>TO BEAT</small><b>${party.target}</b></div>` : ''}</div>
          ${bigSide(other, party.chasing ? `SET ${party.target}` : 'CHASE NEXT', { rounds: party.rounds, escape })}</div>`
        : `<div class="catch-sides">${sides.map(side => roster(side, escape)).join('')}</div>`}${next('Start the clock')}`;
  } else if (phase === 'catch-leg') {
    const frozen = party.frozenFor > 0;
    const last = party.last ? `<p class="catch-last" data-correct="${party.last.correct}" role="status">${party.last.correct ? '✓ Correct' : '✗ Wrong'}: ${escape(party.last.answer)}${party.last.correct ? '' : ' · frozen for a moment'}</p>` : '<p class="catch-last" aria-hidden="true">&nbsp;</p>';
    const scoreboard = `<div class="catch-score" style="--side:${turn.colour}"><div><small>${party.chasing ? 'CHASING' : 'RUNNING'}</small><strong>${escape(turn.name)}</strong></div>
        <b class="catch-count" data-catch-count>${party.count}</b>${party.chasing ? `<div class="catch-need"><small>TO BEAT</small><strong>${party.target}</strong></div>` : ''}
        <div class="catch-clock"><small>TIME LEFT</small><span id="timer" class="timer"></span></div></div>${track(party, turn)}`;
    if (host) {
      body = `<header class="catch-head is-live"><span class="catch-kicker">${kicker}</span></header>${scoreboard}
        <h2 class="catch-question">${escape(party.question.prompt)}</h2>
        <ol class="catch-options">${party.question.options.map((option, index) => `<li data-option="${index}"><i>${letters[index]}</i><span>${escape(option)}</span></li>`).join('')}</ol>${last}${next('Stop the clock')}`;
    } else if (party.canAnswer) {
      body = `<header class="catch-head is-live"><span class="catch-kicker">${escape(turn.name)} · ${party.count}${party.chasing ? ` · beat ${party.target}` : ''}</span></header>
        <p class="catch-phone-question">${escape(party.question.prompt)}</p>
        <div class="catch-buttons">${party.question.options.map((option, index) => `<button type="button" class="catch-button" data-action="catch-answer" data-option="${index}"${frozen ? ' disabled' : ''}><i>${letters[index]}</i><span>${escape(option)}</span></button>`).join('')}</div>${last}`;
    } else {
      body = `<header class="catch-head"><span class="catch-kicker">${kicker}</span><h1>${escape(turn.name)} are ${party.chasing ? 'chasing' : 'running'}</h1>
        <p>${mine ? 'It is the other side’s turn. Watch the TV.' : 'You are watching this game.'}</p></header><p class="catch-note" role="status">${party.count}${party.chasing ? ` · they need more than ${party.target}` : ''}</p>`;
    }
  } else if (phase === 'catch-result') {
    const result = party.result;
    const winner = sides[result.winner];
    body = `<header class="catch-head"><span class="catch-kicker">${kicker}</span>
        <h1>${result.caught ? `Caught! ${escape(winner.name)} take the round` : `${escape(winner.name)} get away!`}</h1>
        <p>Target ${result.target}. The chase reached ${result.chase}.${result.chase === result.target ? ' Level is not enough: the chasers must beat it.' : ''}</p></header>
      <div class="catch-result" data-caught="${result.caught}"><div><small>TARGET</small><strong>${result.target}</strong></div><i>${result.caught ? '<' : '≥'}</i><div><small>CHASE</small><strong>${result.chase}</strong></div></div>
      ${host ? `${finishLine(result, sides[1 - party.turn], sides[party.turn])}
        <div class="catch-versus is-result">${bigSide(sides[0], result.winner === 0 ? '✓ ROUND WON' : 'ROUND LOST', { active: result.winner === 0, rounds: party.rounds, escape })}
          <div class="catch-vs"><span>${sides[0].wins}–${sides[1].wins}</span><small>ROUNDS</small></div>
          ${bigSide(sides[1], result.winner === 1 ? '✓ ROUND WON' : 'ROUND LOST', { active: result.winner === 1, rounds: party.rounds, escape })}</div>`
        : `<div class="catch-sides">${sides.map(side => roster(side, escape)).join('')}</div>`}${next(party.round + 1 < party.rounds ? 'Swap sides' : 'Final result')}`;
  }
  return `<section class="game-panel catch-game" data-catch="${phase.replace('catch-', '')}">${body}</section>`;
}
