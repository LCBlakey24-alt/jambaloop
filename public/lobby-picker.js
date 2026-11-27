// Lobby-first hosting: the room opens on a carousel of every game. The
// captain swipes through it on their phone; the TV shows the same 3D shelf
// gliding in step and re-themes to the game in front. Playing a game closes
// the carousel and the TV introduces it.
import { modes, minimumPlayers } from './game-config.js';
import { carouselOffsets, wrapIndex, CAROUSEL_REACH } from './game-carousel.js';
import { identityOf, identityVariables } from './game-identities.js';
import { tileArt, launcherCopy } from './home-launcher.js';
import { modeVariables } from './mode-style.js';
import { avatarView, wallColumns } from './party-views.js';

const ids = modes.map(([id]) => id);
const info = id => modes.find(([key]) => key === id);
const indexOf = id => Math.max(0, ids.indexOf(id));

function centreInfo(id, escape) {
  const [, name, description] = info(id);
  return `<div class="picker-info" style="${identityVariables(id)}">
    <p class="picker-kind">${launcherCopy(id).kind} · ${minimumPlayers(id)}+ players · ${escape(identityOf(id).title)}</p>
    <h2 class="picker-name">${escape(name)}</h2><p class="picker-description">${escape(description)}</p></div>`;
}

/** The 3D shelf of game tiles, centred on `mode` (the TV and phones share it). */
function shelf(mode) {
  const centre = indexOf(mode);
  const offsets = carouselOffsets(ids.length, centre);
  return `<div class="carousel-track" aria-hidden="true">${ids.map((id, i) => {
    const distance = Math.abs(offsets[i]);
    return `<div class="carousel-card" data-mode="${id}" style="${identityVariables(id)};--offset:${offsets[i]};--distance:${distance}"${i === centre ? ' aria-current="true"' : ''}${distance > CAROUSEL_REACH ? ' aria-hidden="true"' : ''}>${tileArt(id)}</div>`;
  }).join('')}</div>`;
}

/** The TV: a 3D shelf of tiles, the centred game's details, and how to join. */
export function pickerTv(state, { escape, canDrive }) {
  const captain = state.captainName ? escape(state.captainName) : 'The captain';
  return `<section class="lobby-picker" data-picker-tv>
    <div class="game-carousel picker-carousel"><div class="carousel-stage">
      ${canDrive ? '<button type="button" class="carousel-arrow" data-action="picker-step" data-direction="-1" aria-label="Previous game">‹</button>' : '<span></span>'}
      ${shelf(state.picker.mode)}
      ${canDrive ? '<button type="button" class="carousel-arrow" data-action="picker-step" data-direction="1" aria-label="Next game">›</button>' : '<span></span>'}
    </div></div>
    <div class="picker-footer">
      <div class="game-panel picker-join"><div class="eyebrow">JOIN ON YOUR PHONE</div><div class="room-code">${escape(state.code)}</div>
        ${state.qr ? `<img class="qr" src="${state.qr}" alt="QR code to join room ${escape(state.code)}">` : ''}</div>
      <div class="picker-centre" aria-live="polite">${centreInfo(state.picker.mode, escape)}</div>
      <div class="game-panel picker-room"><div class="eyebrow">IN THE ROOM · ${state.players.length || state.playerCount || 0}</div>
        <ul class="players face-wall is-strip" style="--cols:${Math.max(3, Math.min(9, (state.players ?? []).length))}">${(state.players ?? []).slice(0, 18).map(player => `<li>${avatarView(player, escape)}<span>${escape(player.name)}</span></li>`).join('')}${(state.players?.length ?? 0) > 18 ? `<li class="players-more">+${state.players.length - 18} more</li>` : ''}</ul>
        <p class="picker-hint">${state.playerCount ? `${captain} is choosing on their phone` : 'Waiting for players to join'}</p>
        ${canDrive ? `<button type="button" class="button primary" data-action="picker-play">Play this game</button>
        <span class="picker-room-actions"><button type="button" class="button outline" data-action="picker-settings">Game settings</button>
        <button type="button" class="button outline" data-action="welcome-play">▶ Play the welcome</button></span>` : ''}</div>
    </div></section>`;
}

const joinHost = state => { try { return new URL(state.joinUrl).host; } catch { return location.host; } };

/** The TV before the party starts: how to join, who is here, and the start button. */
export function gatherTv(state, { escape }) {
  const count = state.players?.length || state.playerCount || 0;
  const captain = state.captainName ? escape(state.captainName) : '';
  return `<section class="party-gather" data-gather-tv>
    <div class="gather-join"><div class="eyebrow">JOIN THE PARTY</div>
      <p class="gather-how">Scan with your phone camera, or go to <strong>${escape(joinHost(state))}</strong> and enter</p>
      <div class="room-code">${escape(state.code)}</div>
      ${state.qr ? `<img class="qr" src="${state.qr}" alt="QR code to join room ${escape(state.code)}">` : ''}</div>
    <div class="gather-room"><div class="eyebrow">IN THE ROOM · ${count}</div>
      <ul class="players gather-players face-wall" style="--cols:${wallColumns(Math.min((state.players ?? []).length, 48))}">${(state.players ?? []).slice(0, 48).map(player => `<li>${avatarView(player, escape)}<span>${escape(player.name)}</span></li>`).join('')}${(state.players?.length ?? 0) > 48 ? `<li class="players-more">+${state.players.length - 48} more</li>` : ''}</ul>
      ${count ? '' : '<p class="gather-empty">Waiting for the first player…</p>'}
      <div class="gather-actions"><button type="button" class="button primary gather-start" data-action="party-start" ${count ? '' : 'disabled'}>Everyone’s in · Start the party</button>
        <p class="picker-hint">${count ? `${captain || 'The captain'} can also start it from their phone` : 'The first player to join is the captain'}</p>
        <button type="button" class="gather-skip" data-action="party-skip">Skip the intro and go to the games</button></div>
    </div></section>`;
}

/** A phone before the party starts: you are in; the captain starts it. */
export function gatherPhone(state, { escape, canDrive }) {
  const captain = state.captainName ? escape(state.captainName) : 'The captain';
  const count = state.playerCount || state.players?.length || 1;
  return `<section class="game-panel gather-phone" data-gather-phone>
    <div class="lobby-eyebrow"><span class="eyebrow">ROOM ${escape(state.code)}</span>${canDrive ? '<span class="captain-tag">★ Captain</span>' : ''}</div>
    <h2 class="phone-welcome">${avatarView(state.player, escape)}<span>You’re in, ${escape(state.player?.name ?? '')}!</span></h2>
    <p class="gather-count" role="status">${count === 1 ? 'You are the first one here.' : `${count} players in the room.`}</p>
    ${canDrive ? `<p>You are the captain. When everyone has joined, start the party.</p>
      <div class="actions"><button type="button" class="button primary" data-action="party-start" style="grid-column:1 / -1">Everyone’s in · Start the party</button></div>
      <button type="button" class="gather-skip" data-action="party-skip">Skip the intro</button>`
      : `<p>Waiting for ${captain} to start the party. Watch the TV.</p>`}
  </section>`;
}

/** Glide the shelf (TV or phone) to a game and re-theme the screen around it. */
export function movePicker(root, mode, escape) {
  const track = root.querySelector('.picker-carousel .carousel-track');
  if (!track) return false;
  const centre = indexOf(mode);
  const offsets = carouselOffsets(ids.length, centre);
  track.querySelectorAll('.carousel-card').forEach((card, i) => {
    const distance = Math.abs(offsets[i]);
    card.style.setProperty('--offset', offsets[i]);
    card.style.setProperty('--distance', distance);
    card.toggleAttribute('aria-current', i === centre);
    if (distance > CAROUSEL_REACH) card.setAttribute('aria-hidden', 'true'); else card.removeAttribute('aria-hidden');
  });
  const slot = root.querySelector('.picker-centre');
  if (slot) slot.innerHTML = centreInfo(mode, escape);
  const name = root.querySelector('[data-picker-name]');
  if (name) name.textContent = info(mode)?.[1] ?? '';
  themeTo(root, mode);
  return true;
}

/** Wear the browsed game's identity on the whole screen while picking. */
export function themeTo(root, mode) {
  const view = root.querySelector('.game');
  if (!view || view.dataset.mode === mode) return;
  view.dataset.mode = mode;
  view.setAttribute('style', modeVariables(mode));
}

/** A phone: the same 3D shelf as the TV. The captain swipes; others watch. */
export function pickerPhone(state, { escape, canDrive }) {
  const [, name] = info(state.picker.mode);
  const captain = state.captainName ? escape(state.captainName) : 'The captain';
  return `<section class="game-panel picker-phone" data-picker-phone ${canDrive ? 'data-driver' : ''}>
    <div class="eyebrow">${canDrive ? 'CHOOSE THE NEXT GAME' : 'GAME CAROUSEL'}</div>
    <p class="picker-hint">${canDrive ? 'Swipe left or right. The TV follows you.' : `${captain} is choosing. Watch the TV.`}</p>
    ${welcomePanel(state, canDrive)}
    <div class="game-carousel picker-carousel is-phone">${shelf(state.picker.mode)}</div>
    <p class="picker-phone-info"><strong class="picker-name" data-picker-name>${escape(name)}</strong></p>
    ${canDrive ? `<div class="picker-controls"><button type="button" class="button outline" data-action="picker-step" data-direction="-1" aria-label="Previous game">‹</button>
      <button type="button" class="button primary" data-action="picker-play">Play this game</button>
      <button type="button" class="button outline" data-action="picker-step" data-direction="1" aria-label="Next game">›</button>
      <button type="button" class="button outline picker-settings" data-action="picker-settings">Game settings</button></div>` : ''}
  </section>`;
}

/** Thumb swipes on the shelf: one game per flick. */
export function bindPickerSwipe(root, onStep) {
  const track = root.querySelector('[data-picker-phone][data-driver] .carousel-track, [data-picker-tv] .carousel-track');
  if (!track || track.dataset.swipe) return;
  track.dataset.swipe = 'on';
  let startX;
  let startY;
  track.addEventListener('pointerdown', event => { startX = event.clientX; startY = event.clientY; }, { passive: true });
  track.addEventListener('pointerup', event => {
    if (startX === undefined) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    startX = undefined;
    if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1);
  });
  track.addEventListener('pointercancel', () => { startX = undefined; });
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
