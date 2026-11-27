import { capacityError, defaultScoreInterval, fixedQuestionModes, maximumPlayers, minimumPlayers, modes, supportsScoreCheckpoints } from './game-config.js';

export const playlistLimit = 12;

export const gameNightPresets = {
  15: ['rare', 'samepage', 'potato'],
  30: ['classic', 'spotlight', 'topanswers', 'samepage', 'brain'],
  60: ['classic', 'rare', 'spotlight', 'board', 'samepage', 'brain', 'topanswers', 'punchline', 'tracks', 'potato', 'quizrace', 'showdown'],
};

export function queuedSettings(mode, theme) {
  return {
    mode, theme, count: mode === 'board' ? 12 : mode === 'spotlight' ? 1 : mode === 'topanswers' ? 3 : mode === 'rare' ? 3 : 5, category: 'mixed', seconds: 20,
    format: mode === 'soclose' ? 'estimate' : 'choice', autoReveal: true,
    scoreInterval: supportsScoreCheckpoints(mode) ? defaultScoreInterval : undefined,
    privateQuestions: mode === 'showdown',
    difficulty: fixedQuestionModes.includes(mode) && !['showdown','soclose'].includes(mode) ? 'family' : 'standard',
  };
}

/**
 * Settings for a game chosen in a party: the quick-switch defaults, but quiz
 * games start on the standard bank with every question type and ten rounds.
 */
export function partySettings(mode, theme) {
  const quick = queuedSettings(mode, theme);
  if (!['classic', 'dice', 'knockout', 'wheel', 'board'].includes(mode)) return quick;
  return { ...quick, format: 'mixed', difficulty: 'standard', ...(mode === 'board' ? {} : { count: 10 }) };
}

export function replayButtons(state, icons) {
  return `${state.night.queue.length ? '' : `<button class="button primary" data-action="quick-replay">${icons('rotate-ccw')} Replay this game</button>`}
    <button class="button ${state.night.queue.length ? 'primary' : 'outline'}" data-action="choose-game">${icons('layout-grid')} Choose another game</button>
    <button class="button outline" data-action="again">Change settings</button>`;
}

export function gameNightView(state, { canControl, escape, icons }) {
  const { queue, played, standings = [] } = state.night;
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
    ${standings.length ? `<div class="night-standings"><div><span class="eyebrow">GAME NIGHT STANDINGS</span><small>3 / 2 / 1 stars for a podium place · ties share stars</small></div>
      <ol>${standings.slice(0, 5).map((player, index) => `<li><b>${index + 1}</b><span>${escape(player.name)}</span><strong>${player.stars} ★</strong><small>${player.wins} ${player.wins === 1 ? 'win' : 'wins'}</small></li>`).join('')}</ol></div>` : ''}
    ${canControl ? `<div class="actions">
      ${finished && upcoming ? `<button class="button primary" data-action="night-next">Load next game ${icons('arrow-right')}</button>` : ''}
      <button class="button outline small" data-action="night">${icons('list-ordered')} ${queue.length ? 'Edit playlist' : 'Build a playlist'}</button>
    </div>` : ''}</section>`;
}

// `players` is the current group size; games it exceeds are flagged and cannot be added.
export function playlistEditor(queue, escape, icons, players = 0) {
  const tooBig = id => players > maximumPlayers(id);
  const ordered = queue.map((id, index) => {
    const mode = modes.find(([mode]) => mode === id);
    return `<li ${tooBig(id) ? 'class="playlist-unfit"' : ''}><span class="playlist-number">${index + 1}</span><strong>${escape(mode[1])}${tooBig(id) ? `<small>Up to ${maximumPlayers(id)} players · remove to save</small>` : ''}</strong><div class="playlist-buttons">
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
      ${modes.map(([id, name]) => `<option value="${id}" ${tooBig(id) ? 'disabled' : ''}>${escape(name)}${tooBig(id) ? ' (up to ' + maximumPlayers(id) + ' players)' : ''}</option>`).join('')}</select></label>
      <button type="button" class="button outline small" data-night-edit="add" ${queue.length >= playlistLimit ? 'disabled' : ''}>Add ${icons('plus')}</button></div>
      <p class="lobby-rule">Times are estimates and depend on your group’s pace.</p><p class="error" role="alert"></p>
      <button class="button primary" type="submit">Save playlist ${icons('check')}</button></form>`;
}
