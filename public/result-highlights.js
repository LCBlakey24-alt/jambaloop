// Present the scores supplied by the room, never recompute the winner from a UI vote.
function finalNames(names, escape) {
  const shown = names.slice(0, 3).map(escape);
  return shown.join(' · ') + (names.length > shown.length ? ` + ${names.length - shown.length} more` : '');
}
export function winnerBanner(state, escape) {
  const teamFinish = state.mode === 'board' || state.playStyle === 'teams';
  const ranked = state.players ?? [];
  const top = ranked[0];
  const leaders = top ? ranked.filter(player => player.score === top.score && player.lives === top.lives && (player.pace ?? 0) === (top.pace ?? 0)) : [];
  const teams = (state.teams ?? []).filter(team => state.teamWinners?.includes(team.id));
  const winners = teamFinish ? teams.map(team => state.playStyle === 'individual' ? team.name : 'Team ' + team.name)
    : leaders.map(player => player.name);
  if (!winners.length) return '';
  const label = winners.length === 1 ? (teamFinish && state.playStyle !== 'individual' ? 'WINNING TEAM' : 'GAME WINNER') : 'SHARED VICTORY';
  const score = teamFinish
    ? teams.length === 1 && Number.isFinite(teams[0].score) ? teams[0].score.toLocaleString('en-GB') + ' points' : 'Final team standings'
    : top.score.toLocaleString('en-GB') + ' points' + (leaders.length === 1 && ranked[1] && ranked[1].score === top.score && ranked[1].lives === top.lives ? ' · level on points, won on speed' : '');
  return `<div class="results-winner-banner" role="note">
    <span class="results-winner-mark" aria-hidden="true">★</span>
    <div class="results-winner-copy"><small>${label}</small>
      <strong>${finalNames(winners, escape)}</strong>
      <span>${score}</span>
    </div></div>`;
}

export function playerFinish(state) {
  const rank = state.rank;
  const count = state.playerCount;
  const points = state.player?.score ?? 0;
  if (!Number.isInteger(rank) || rank < 1 || !Number.isInteger(count) || count < 1) return '';
  return `<div class="results-player-finish" role="note" aria-label="Your final position and score">
    <div><small>YOUR FINISH</small><strong>#${rank}</strong><span>of ${count} ${count === 1 ? 'player' : 'players'}</span></div>
    <div><small>TOTAL SCORE</small><strong>${points.toLocaleString('en-GB')}</strong><span>points</span></div>
  </div>`;
}