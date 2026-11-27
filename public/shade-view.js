// Shade on the TV and on phones. The TV carries the whole colour board with
// every guess as it lands. A guesser's phone is a magnifier: tap the small
// board to zoom in, tap a square, place the guess. The clue-giver's phone
// shows the secret square.
import { avatarView } from './party-views.js';
import { replayButtons } from './game-night.js';
import { SHADE_COLUMNS, SHADE_ROWS, rowLetters, shadeColour, shadeName } from './shade-grid.js';

const range = count => Array.from({ length: count }, (_, n) => n);
const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
const ZOOM = 3; // squares either side of the centre in the phone's magnifier

// What this phone is looking at. Kept here so a room update does not lose it.
const lens = { step: undefined, centre: undefined, picked: undefined };
export function shadeLens(step, change) {
  if (lens.step !== step) Object.assign(lens, { step, centre: undefined, picked: undefined });
  if (change) Object.assign(lens, change);
  return lens;
}

/** The full board. `pins` maps "c,r" to the players who guessed there. */
function board(party, { escape, target, frame, mine = [] }) {
  const pins = new Map();
  for (const guess of party.guesses ?? []) for (const square of guess.squares) {
    const key = square.join(',');
    pins.set(key, [...(pins.get(key) ?? []), guess]);
  }
  const near = (c, r) => frame && target ? Math.max(Math.abs(c - target[0]), Math.abs(r - target[1])) : 9;
  return `<div class="shade-board" style="--cols:${SHADE_COLUMNS};--rows:${SHADE_ROWS}" role="img" aria-label="The colour board">
    <span class="shade-corner"></span>${range(SHADE_COLUMNS).map(c => `<span class="shade-col">${c + 1}</span>`).join('')}
    ${range(SHADE_ROWS).map(r => `<span class="shade-row">${rowLetters[r]}</span>${range(SHADE_COLUMNS).map(c => {
      const here = pins.get(`${c},${r}`);
      const distance = near(c, r);
      const cls = [same(target, [c, r]) ? 'is-target' : '', distance <= 2 ? `is-ring-${distance}` : '', mine.some(square => same(square, [c, r])) ? 'is-mine' : ''].filter(Boolean).join(' ');
      return `<i class="${cls}" style="background:${shadeColour(c, r)}">${here ? `<span class="shade-pin" data-count="${here.length}">${avatarView(here[0], escape)}${here.length > 1 ? `<b>${here.length}</b>` : ''}</span>` : ''}</i>`;
    }).join('')}`).join('')}</div>`;
}

/** Phone: the small board to aim with, then a magnified patch to choose from. */
function magnifier(party, { escape }) {
  const { centre, picked } = shadeLens(party.step);
  const mine = party.mine ?? [];
  if (!centre) {
    return `<p class="shade-hint">Tap the board roughly where you think it is. You can fine-tune next.</p>
      <div class="shade-mini" style="--cols:${SHADE_COLUMNS}">${range(SHADE_ROWS).map(r => range(SHADE_COLUMNS).map(c =>
        `<button type="button" data-action="shade-zoom" data-c="${c}" data-r="${r}" aria-label="${shadeName(c, r)}" class="${mine.some(square => same(square, [c, r])) ? 'is-mine' : ''}" style="background:${shadeColour(c, r)}"></button>`).join('')).join('')}</div>`;
  }
  const c0 = Math.min(Math.max(centre[0] - ZOOM, 0), SHADE_COLUMNS - (ZOOM * 2 + 1));
  const r0 = Math.min(Math.max(centre[1] - ZOOM, 0), SHADE_ROWS - (ZOOM * 2 + 1));
  const size = ZOOM * 2 + 1;
  return `<div class="shade-zoom" style="--cols:${size}">${range(size).map(dr => range(size).map(dc => {
      const c = c0 + dc; const r = r0 + dr;
      const taken = mine.some(square => same(square, [c, r]));
      return `<button type="button" data-action="shade-select" data-c="${c}" data-r="${r}" class="${same(picked, [c, r]) ? 'is-picked' : ''}${taken ? ' is-mine' : ''}" ${taken ? 'disabled' : ''} style="background:${shadeColour(c, r)}"><span>${shadeName(c, r)}</span></button>`;
    }).join('')).join('')}</div>
    <div class="shade-actions"><button type="button" class="button outline" data-action="shade-back">‹ Whole board</button>
      <button type="button" class="button primary" data-action="shade-place" ${picked ? '' : 'disabled'}>${picked ? `Place guess on ${shadeName(...picked)}` : 'Tap a square'}</button></div>`;
}

export function shadeView(state, { host, canControl, escape, icons }) {
  const party = state.party;
  if (!party) return '';
  const phase = state.phase;
  const giver = party.giver?.name ? escape(party.giver.name) : 'The clue-giver';
  const kicker = `SHADE · ROUND ${state.index + 1} OF ${state.total}`;
  const guessing = ['shade-clue', 'shade-clue2', 'shade-clue3'].includes(phase);
  const ordinal = ['First', 'Second', 'Third'][party.clue - 1] ?? 'Third';
  const clueWords = `${ordinal.toUpperCase()} WORD · ${party.clue} OF 3`;
  const onward = phase === 'shade-clue3' ? 'Reveal the square' : phase === 'shade-clue2' ? 'Third word' : 'Second word';
  const next = label => canControl ? `<button type="button" class="button primary" data-action="advance">${label}</button>` : '';
  let body = '';

  if (phase === 'finished') {
    body = `<header class="shade-head"><span class="shade-kicker">SHADE · FINAL SCORES</span><h1>${state.players?.[0] ? `${escape(state.players[0].name)} has the best eye!` : 'Game over'}</h1></header>
      ${!host && party.earned !== undefined ? `<p class="shade-note" role="status">You scored ${party.earned} points.</p>` : ''}
      <ol class="shade-final">${(state.players ?? []).slice(0, 10).map(player => `<li>${avatarView(player, escape)}<span>${escape(player.name)}</span><b>${player.score}</b></li>`).join('')}</ol>
      <div class="actions">${canControl ? replayButtons(state, icons) : '<p>Stay here if the captain starts another game.</p>'}</div>`;
  } else if (host) {
    const result = party.result;
    const side = phase === 'shade-reveal' && result
      ? `<aside class="shade-side"><h2>${shadeName(...result.target)}</h2><span class="shade-swatch" style="background:${shadeColour(...result.target)}"></span>
          <ol class="shade-scores">${result.rows.slice(0, 8).map(row => `<li>${avatarView(row, escape)}<span>${escape(row.name)}</span><b>+${row.points}</b></li>`).join('')}</ol>
          <p class="shade-giver">${giver} earns <b>+${result.giverPoints}</b> for the clues</p>${next(state.index + 1 < state.total ? 'Next clue-giver' : 'Final scores')}</aside>`
      : `<aside class="shade-side"><span class="shade-badge">${clueWords}</span><h2>${giver}</h2><p>is describing a secret square, one word at a time.</p>
          <p class="shade-progress" role="status"><b>${party.submissions ?? 0}</b> / ${party.responseTarget ?? 0} have guessed</p>
          <p class="shade-rule">Exact square <b>3</b> · one away <b>2</b> · two away <b>1</b></p>${next(onward)}</aside>`;
    body = `<header class="shade-head"><span class="shade-kicker">${kicker}</span></header>
      <div class="shade-stage">${board(party, { escape, target: party.target, frame: phase === 'shade-reveal' })}${side}</div>`;
  } else if (party.giving && guessing) {
    body = `<header class="shade-head"><span class="shade-kicker">${kicker} · YOU GIVE THE CLUES</span><h1>${ordinal} word</h1>
        <p>Say <strong>one word</strong> out loud${party.clue > 1 ? ', a new one' : ''}. Do not point, and do not say the letter or number.</p></header>
      <div class="shade-secret"><span class="shade-swatch is-big" style="background:${shadeColour(...party.target)}"></span><strong>${shadeName(...party.target)}</strong>
        <div class="shade-context" style="--cols:5">${range(5).map(dr => range(5).map(dc => { const c = party.target[0] - 2 + dc; const r = party.target[1] - 2 + dr;
          return `<i class="${dc === 2 && dr === 2 ? 'is-target' : ''}" style="background:${c >= 0 && c < SHADE_COLUMNS && r >= 0 && r < SHADE_ROWS ? shadeColour(c, r) : 'transparent'}"></i>`; }).join('')).join('')}</div></div>
      <p class="shade-note" role="status">${party.submissions ?? 0} of ${party.responseTarget ?? 0} have guessed.</p>
      ${canControl ? `<div class="actions">${next(onward)}</div>` : ''}`;
  } else if (guessing && party.left > 0) {
    body = `<header class="shade-head"><span class="shade-kicker">${kicker} · ${clueWords}</span><h1>Find ${giver}’s colour</h1>
        <p>Guess ${party.clue} of 3. One square for this word.</p></header>${magnifier(party, { escape })}`;
  } else if (guessing) {
    body = `<header class="shade-head"><span class="shade-kicker">${kicker}</span><h1>${party.mine ? 'Guess placed' : 'Watch the TV'}</h1>
        <p>${party.mine ? (phase === 'shade-clue3' ? 'All three guesses are in. Watch the TV for the reveal.' : 'Wait for the next word. One more guess after each.') : 'You joined after this game began. You can play the next one.'}</p></header>
      ${party.mine?.length ? `<p class="shade-note" role="status">Your guesses: ${party.mine.map(square => shadeName(...square)).join(', ')}</p>` : ''}
      ${canControl ? `<div class="actions">${next(onward)}</div>` : ''}`;
  } else if (phase === 'shade-reveal') {
    const row = party.result?.rows.find(entry => entry.id === state.player?.id);
    body = `<header class="shade-head"><span class="shade-kicker">${kicker}</span><h1>It was ${shadeName(...party.result.target)}</h1></header>
      <div class="shade-secret"><span class="shade-swatch is-big" style="background:${shadeColour(...party.result.target)}"></span></div>
      <p class="shade-note" role="status">${party.giving ? `Your clues earned you ${party.result.giverPoints} points.` : row ? `You scored ${row.points} points this round.` : 'No guesses from you this round.'}</p>
      ${canControl ? `<div class="actions">${next(state.index + 1 < state.total ? 'Next clue-giver' : 'Final scores')}</div>` : ''}`;
  }
  return `<section class="game-panel shade-game" data-shade="${phase.replace('shade-', '')}">${body}</section>`;
}
