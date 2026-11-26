// Lobby-first hosting: the room opens on a carousel of every game. The
// captain swipes through it on their phone; the TV shows the same 3D shelf
// gliding in step and re-themes to the game in front. Playing a game closes
// the carousel and the TV introduces it.
import { modes, minimumPlayers } from './game-config.js';
import { carouselOffsets, wrapIndex, CAROUSEL_REACH } from './game-carousel.js';
import { identityOf, identityVariables } from './game-identities.js';
import { tileArt, launcherCopy } from './home-launcher.js';
import { modeVariables } from './mode-style.js';
import { avatarView } from './party-views.js';

const ids = modes.map(([id]) => id);
const info = id => modes.find(([key]) => key === id);
const indexOf = id => Math.max(0, ids.indexOf(id));

function centreInfo(id, escape) {
  const [, name, description] = info(id);
  return `<div class="picker-info" style="${identityVariables(id)}">
    <p class="picker-kind">${launcherCopy(id).kind} · ${minimumPlayers(id)}+ players · ${escape(identityOf(id).title)}</p>
    <h2 class="picker-name">${escape(name)}</h2><p class="picker-description">${escape(description)}</p></div>`;
}

/** The TV: a 3D shelf of tiles, the centred game's details, and how to join. */
export function pickerTv(state, { escape, canDrive }) {
  const centre = indexOf(state.picker.mode);
  const offsets = carouselOffsets(ids.length, centre);
  const captain = state.captainName ? escape(state.captainName) : 'The captain';
  return `<section class="lobby-picker" data-picker-tv>
    <div class="game-carousel picker-carousel"><div class="carousel-stage">
      ${canDrive ? '<button type="button" class="carousel-arrow" data-action="picker-step" data-direction="-1" aria-label="Previous game">‹</button>' : '<span></span>'}
      <div class="carousel-track" aria-hidden="true">${ids.map((id, i) => {
        const distance = Math.abs(offsets[i]);
        return `<div class="carousel-card" data-mode="${id}" style="${identityVariables(id)};--offset:${offsets[i]};--distance:${distance}"${i === centre ? ' aria-current="true"' : ''}${distance > CAROUSEL_REACH ? ' aria-hidden="true"' : ''}>${tileArt(id)}</div>`;
      }).join('')}</div>
      ${canDrive ? '<button type="button" class="carousel-arrow" data-action="picker-step" data-direction="1" aria-label="Next game">›</button>' : '<span></span>'}
    </div></div>
    <div class="picker-footer">
      <div class="game-panel picker-join"><div class="eyebrow">JOIN ON YOUR PHONE</div><div class="room-code">${escape(state.code)}</div>
        ${state.qr ? `<img class="qr" src="${state.qr}" alt="QR code to join room ${escape(state.code)}">` : ''}</div>
      <div class="picker-centre" aria-live="polite">${centreInfo(state.picker.mode, escape)}</div>
      <div class="game-panel picker-room"><div class="eyebrow">IN THE ROOM · ${state.players.length || state.playerCount || 0}</div>
        <ul class="players">${(state.players ?? []).map(player => `<li>${avatarView(player, escape)}${escape(player.name)}</li>`).join('')}</ul>
        <p class="picker-hint">${state.playerCount ? `${captain} is choosing on their phone` : 'Waiting for players to join'}</p>
        ${canDrive ? `<button type="button" class="button primary" data-action="picker-play">Play this game</button>
        <button type="button" class="button outline" data-action="welcome-play">▶ Play the welcome</button>` : ''}</div>
    </div></section>`;
}

/** Glide the TV shelf to the captain's game and re-theme the screen around it. */
export function movePickerTv(root, state, escape) {
  const stage = root.querySelector('[data-picker-tv]');
  if (!stage) return false;
  const centre = indexOf(state.picker.mode);
  const offsets = carouselOffsets(ids.length, centre);
  stage.querySelectorAll('.carousel-card').forEach((card, i) => {
    const distance = Math.abs(offsets[i]);
    card.style.setProperty('--offset', offsets[i]);
    card.style.setProperty('--distance', distance);
    card.toggleAttribute('aria-current', i === centre);
    if (distance > CAROUSEL_REACH) card.setAttribute('aria-hidden', 'true'); else card.removeAttribute('aria-hidden');
  });
  const centreInfoSlot = stage.querySelector('.picker-centre');
  if (centreInfoSlot) centreInfoSlot.innerHTML = centreInfo(state.picker.mode, escape);
  themeTo(root, state.picker.mode);
  return true;
}

/** Wear the browsed game's identity on the whole screen while picking. */
export function themeTo(root, mode) {
  const view = root.querySelector('.game');
  if (!view || view.dataset.mode === mode) return;
  view.dataset.mode = mode;
  view.setAttribute('style', modeVariables(mode));
}

/** A phone: a swipeable strip of tiles. The captain drives; others watch. */
export function pickerPhone(state, { escape, canDrive }) {
  const [, name] = info(state.picker.mode);
  const captain = state.captainName ? escape(state.captainName) : 'The captain';
  return `<section class="game-panel picker-phone" data-picker-phone ${canDrive ? 'data-driver' : ''}>
    <div class="eyebrow">${canDrive ? 'CHOOSE THE NEXT GAME' : 'GAME CAROUSEL'}</div>
    <p class="picker-hint">${canDrive ? 'Swipe to browse. The TV follows you.' : `${captain} is choosing. Watch the TV.`}</p>
    ${welcomePanel(state, canDrive)}
    <div class="picker-strip" ${canDrive ? '' : 'inert'}>${ids.map(id => `<div class="picker-tile" data-mode="${id}" style="${modeVariables(id)}">${tileArt(id)}</div>`).join('')}</div>
    <div class="picker-controls">${canDrive ? `<button type="button" class="button outline" data-action="picker-step" data-direction="-1" aria-label="Previous game">‹</button>
      <button type="button" class="button primary" data-action="picker-play">Play <span data-picker-name>${escape(name)}</span></button>
      <button type="button" class="button outline" data-action="picker-step" data-direction="1" aria-label="Next game">›</button>` : `<p class="picker-now">Now showing: <strong data-picker-name>${escape(name)}</strong></p>`}</div>
  </section>`;
}

/**
 * Scroll a phone's strip to a game (smoothly unless it is the first paint).
 * Following the room is quiet; the captain's own steps report the move.
 */
export function syncPhonePicker(root, mode, smooth = true, { report = false } = {}) {
  const strip = root.querySelector('.picker-strip');
  const tile = strip?.querySelector(`.picker-tile[data-mode="${mode}"]`);
  if (!tile) return;
  if (report) delete strip.dataset.syncing; else strip.dataset.syncing = mode;
  strip.scrollTo({ left: tile.offsetLeft - (strip.clientWidth - tile.clientWidth) / 2, behavior: smooth ? 'smooth' : 'instant' });
  const label = root.querySelector('[data-picker-name]');
  if (label) label.textContent = info(mode)?.[1] ?? '';
}

/** The captain's swipes: report the centred game once the strip settles. */
export function bindPhonePicker(root, onBrowse) {
  const strip = root.querySelector('[data-picker-phone][data-driver] .picker-strip');
  if (!strip || strip.dataset.bound) return;
  strip.dataset.bound = 'true';
  let timer;
  let last;
  strip.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const middle = strip.scrollLeft + strip.clientWidth / 2;
      const tiles = [...strip.children];
      const nearest = tiles.reduce((best, tile) => Math.abs(tile.offsetLeft + tile.clientWidth / 2 - middle) < Math.abs(best.offsetLeft + best.clientWidth / 2 - middle) ? tile : best, tiles[0]);
      const mode = nearest?.dataset.mode;
      const label = root.querySelector('[data-picker-name]');
      if (label && mode) label.textContent = info(mode)[1];
      if (strip.dataset.syncing === mode) { delete strip.dataset.syncing; last = mode; return; }
      if (mode && mode !== last) { last = mode; strip.dataset.reported = mode; onBrowse(mode); }
    }, 140);
  }, { passive: true });
}

/** On phones while Max and Poppy are on: the captain can skip or choose. */
function welcomePanel(state, canDrive) {
  if (!state.welcome) return '';
  const body = state.welcome === 'asking'
    ? canDrive ? `<p>Everyone here has played before. Watch the intro again?</p>
      <div class="actions"><button type="button" class="button outline" data-action="welcome-tour">▶ Play the intro</button>
      <button type="button" class="button primary" data-action="welcome-skip">Skip, let's play</button></div>`
      : '<p>The captain is deciding whether to replay the intro.</p>'
    : state.welcome === 'playing'
      ? canDrive ? `<p>Max and Poppy are saying hello on the TV.</p>
        <div class="actions"><button type="button" class="button primary" data-action="welcome-skip" style="grid-column:1 / -1">Skip intro</button></div>`
        : '<p>Watch the TV: Max and Poppy are saying hello.</p>'
      : '<p>Off we go!</p>';
  return `<div class="picker-welcome" role="status">${body}</div>`;
}

export const stepMode = (mode, direction) => ids[wrapIndex(indexOf(mode) + direction, ids.length)];
