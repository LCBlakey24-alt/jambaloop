import { winnerBanner, playerFinish } from './result-highlights.js';

// Present the outcome already decided by each game. Hot Potato is an elimination
// ending, not a score-based victory; the Trolley game has a separate judge verdict.
export function partyFinale(state, { host, escape, variant = 'scores' }) {
  if (state.phase !== 'finished') return '';

  if (variant === 'potato') {
    const holder = state.party?.holder;
    if (!holder) return '';
    const passes = state.party.passes ?? 0;
    const own = !host && state.player?.id === holder.id;
    return `<div class="party-caught-banner" role="note">
      <span class="party-caught-icon" aria-hidden="true">!</span>
      <div><small>THE TIMER RAN OUT</small>
        <strong>${host ? escape(holder.name) + ' was caught!' : own ? 'You got caught!' : 'You’re safe!'}</strong>
        <span>${host || own ? '' : escape(holder.name) + ' got caught · '}${passes} successful ${passes === 1 ? 'pass' : 'passes'} before time ran out</span>
      </div>
    </div>`;
  }

  if (variant === 'tracks') {
    // The judge chooses a track each round. Do not claim a team won merely
    // because the top individual score came from that team.
    return host
      ? '<div class="party-track-summary" role="note"><strong>All tracks explored</strong><span>Final player points are below. Every driver had their turn.</span></div>'
      : playerFinish(state);
  }

  // Brain Ladder's own results sort by score and then remaining lives.
  // Match its visible scoreboard rather than introducing a second ordering.
  const displayState = state.mode === 'brain' && Array.isArray(state.party?.roster)
    ? { ...state, playStyle: 'individual',
      players: [...state.party.roster].sort((a, b) => b.score - a.score || b.lives - a.lives || a.name.localeCompare(b.name)) }
    : state;

  return host ? winnerBanner(displayState, escape) : playerFinish(state);
}
