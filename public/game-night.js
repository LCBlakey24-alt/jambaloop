import { defaultScoreInterval, fixedQuestionModes, minimumPlayers, modes, supportsScoreCheckpoints } from './game-config.js';

export const playlistLimit = 12;

export const gameNightPresets = {
  15: ['classic', 'punchline', 'potato'],
  30: ['classic', 'wheel', 'samepage', 'punchline', 'tracks', 'potato', 'dice'],
  60: ['classic', 'samepage', 'punchline', 'board', 'cards', 'potato', 'wheel', 'bluff', 'showdown', 'tracks', 'dice', 'knockout'],
};

export function queuedSettings(mode, theme) {
  return {
    mode, theme, count: mode === 'board' ? 12 : mode === 'spotlight' ? 1 : 5, category: 'mixed', seconds: 20,
    format: 'choice', autoReveal: true,
    scoreInterval: supportsScoreCheckpoints(mode) ? defaultScoreInterval : undefined,
    privateQuestions: mode === 'showdown',
    difficulty: fixedQuestionModes.includes(mode) && mode !== 'showdown' ? 'family' : 'standard',
  };
}

export function replayButtons(state, icons) {
  return `${state.night.queue.length ? '' : `<button class="button primary" data-action="quick-replay">${icons('rotate-ccw')} Replay this game</button>`}
    <button class="button outline" data-action="again">Play again with this group</button>`;
}

export function gameNightView(state, { canControl, escape, icons }) {
  const { queue, played } = state.night;
  if (!queue.length && !played && !canControl) return '';
  const finished = state.phase === 'finished';
  const nameOf = mode => modes.find(([id]) => mode === id)[1];
  const upcoming = queue[0];
  const title = upcoming ? escape(nameOf(upcoming)) : played ? 'Your lineup is complete' : 'Plan the next game';
  const help = upcoming ? `Needs ${minimumPlayers(upcoming)} ${minimumPlayers(upcoming) === 1 ? 'player' : 'players'} · Same room and phones`
    : played ? `${played} queued ${played === 1 ? 'game' : 'games'} loaded in this room` : 'Queue games and keep everyone in this room.';
  const url = upcoming && modes.find(([id]) => id === upcoming)[3];
  return `<section class="game-panel night-panel">
    <div class="night-main"><span class="night-icon">${icons(url || 'list-start')}</span><div>
      <div class="eyebrow">${upcoming ? 'UP NEXT' : 'GAME NIGHT'}</div><h2>${title}</h2><p>${help}</p>
    </div></div>
    ${queue.length > 1 ? `<ol class="night-preview" aria-label="Later games">${queue.slice(1).map(id => `<li>${escape(nameOf(id))}</li>`).join('')}</ol>` : ''}
    ${canControl ? `<div class="actions">
      ${finished && upcoming ? `<button class="button primary" data-action="night-next">Load next game ${icons('arrow-right')}</button>` : ''}
      <button class="button outline small" data-action="night">${icons('list-ordered')} ${queue.length ? 'Edit playlist' : 'Build a playlist'}</button>
    </div>` : ''}</section>`;
}

export function playlistEditor(queue, escape, icons) {
  const ordered = queue.map((id, index) => {
    const mode = modes.find(([mode]) => mode === id);
    return `<li><span class="playlist-number">${index + 1}</span><strong>${escape(mode[1])}</strong><div class="playlist-buttons">
      <button type="button" class="button outline small" data-night-edit="up" data-index="${index}" ${index ? '' : 'disabled'} aria-label="Move ${escape(mode[1])} up">${icons('arrow-up')}</button>
      <button type="button" class="button outline small" data-night-edit="down" data-index="${index}" ${index < queue.length - 1 ? '' : 'disabled'} aria-label="Move ${escape(mode[1])} down">${icons('arrow-down')}</button>
      <button type="button" class="button outline small" data-night-edit="remove" data-index="${index}" aria-label="${index ? 'Remove' : 'Skip'} ${escape(mode[1])}">${icons('x')}</button>
    </div></li>`;
  }).join('');
  return `<div class="eyebrow">GAME NIGHT</div><h2 id="dialog-title">Build your lineup</h2>
    <p>These games follow the one on screen. You can reorder or skip them here.</p>
    <div class="playlist-presets" aria-label="Playlist presets">${Object.keys(gameNightPresets).map(minutes =>
      `<button class="button outline small" data-night-edit="preset" data-minutes="${minutes}">About ${minutes} min</button>`).join('')}</div>
    ${queue.length ? `<ol class="playlist-editor">${ordered}</ol>` : '<p class="playlist-empty">Your playlist is empty.</p>'}
    <form id="night-form"><div class="playlist-add"><label>Add a game<select name="queuedMode">
      ${modes.map(([id, name]) => `<option value="${id}">${escape(name)}</option>`).join('')}</select></label>
      <button type="button" class="button outline small" data-night-edit="add" ${queue.length >= playlistLimit ? 'disabled' : ''}>Add ${icons('plus')}</button></div>
      <p class="lobby-rule">Times are estimates and depend on your group’s pace.</p><p class="error" role="alert"></p>
      <button class="button primary" type="submit">Save playlist ${icons('check')}</button></form>`;
}
