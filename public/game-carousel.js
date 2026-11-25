// The home carousel for the big screen: games sit on a curved 3D shelf, the
// centred one in front. The page behind takes on that game's identity, an
// optional voice guide reads its introduction, and a TV remote (arrow keys),
// swipe, scroll or click moves the shelf. Phones keep the tile grid.
import { identityOf, identityVariables } from './game-identities.js';
import { launcherCopy, tileArt } from './home-launcher.js';
import { minimumPlayers } from './game-config.js';
import { narratorAsset } from './narration-scripts.js';

export const CAROUSEL_REACH = 3;

/** Signed shortest distance from the centre for every card on a circular shelf. */
export function carouselOffsets(count, index) {
  return Array.from({ length: count }, (_, i) => {
    let offset = ((i - index) % count + count) % count;
    if (offset > count / 2) offset -= count;
    return offset;
  });
}

export const wrapIndex = (index, count) => ((index % count) + count) % count;

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

function card([id, name], offset) {
  const distance = Math.abs(offset);
  const hidden = distance > CAROUSEL_REACH;
  return `<button type="button" class="carousel-card" data-action="carousel-go" data-mode="${id}" style="${identityVariables(id)};--offset:${offset};--distance:${distance}"
    ${offset === 0 ? 'aria-current="true"' : ''} ${hidden ? 'tabindex="-1" aria-hidden="true"' : ''} aria-label="${escapeHtml(name)}${offset === 0 ? ' (selected)' : ''}">
    ${tileArt(id)}</button>`;
}

/** Info for the centred game, set in that game's own face and colours. */
export function carouselInfo([id, name, description], voiceOn) {
  const { kind, steps } = launcherCopy(id);
  const players = minimumPlayers(id);
  return `<div class="carousel-info" data-mode="${id}" style="${identityVariables(id)}" aria-live="polite">
    <p class="carousel-kind">${kind} · ${players}+ players · ${escapeHtml(identityOf(id).title)}</p>
    <h2 class="carousel-name">${escapeHtml(name)}</h2>
    <p class="carousel-description">${escapeHtml(description)}</p>
    <ol class="carousel-steps">${steps.slice(0, 3).map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    <div class="carousel-actions">
      <button type="button" class="button primary" data-action="host" data-mode="${id}">Play ${escapeHtml(name)} <span aria-hidden="true">→</span></button>
      <button type="button" class="button outline" data-action="preview-mode" data-mode="${id}">Full details</button>
      <button type="button" class="button outline carousel-voice" data-action="carousel-voice" aria-pressed="${voiceOn}">
        <span aria-hidden="true">${voiceOn ? '🔊' : '🔈'}</span> Voice guide ${voiceOn ? 'on' : 'off'}</button>
    </div>
    <small class="carousel-voice-note">${narratorAsset(id) ? 'Recorded announcer' : 'Read aloud by this device'} · ← → or swipe to browse · Enter to play</small>
  </div>`;
}

export function carouselView(list, index, voiceOn) {
  if (!list.length) return '';
  const centre = wrapIndex(index, list.length);
  const offsets = carouselOffsets(list.length, centre);
  return `<div class="carousel-stage" data-carousel>
      <button type="button" class="carousel-arrow" data-action="carousel-step" data-direction="-1" aria-label="Previous game">‹</button>
      <div class="carousel-track" role="listbox" aria-label="Games">${list.map((mode, i) => card(mode, offsets[i])).join('')}</div>
      <button type="button" class="carousel-arrow" data-action="carousel-step" data-direction="1" aria-label="Next game">›</button>
    </div>
    ${carouselInfo(list[centre], voiceOn)}
    <p class="carousel-count"><span>${centre + 1}</span> / ${list.length}</p>`;
}

/** Update an existing carousel in place so cards glide rather than re-render. */
export function moveCarousel(root, list, index, voiceOn) {
  const cards = root.querySelectorAll('.carousel-card');
  if (cards.length !== list.length) return false;
  const centre = wrapIndex(index, list.length);
  const offsets = carouselOffsets(list.length, centre);
  cards.forEach((element, i) => {
    const distance = Math.abs(offsets[i]);
    element.style.setProperty('--offset', offsets[i]);
    element.style.setProperty('--distance', distance);
    if (i === centre) element.setAttribute('aria-current', 'true'); else element.removeAttribute('aria-current');
    if (distance > CAROUSEL_REACH) { element.tabIndex = -1; element.setAttribute('aria-hidden', 'true'); }
    else { element.removeAttribute('tabindex'); element.removeAttribute('aria-hidden'); }
  });
  root.querySelector('.carousel-info').outerHTML = carouselInfo(list[centre], voiceOn);
  root.querySelector('.carousel-count span').textContent = centre + 1;
  return true;
}

/** Cross-fade the page behind the home screen to the centred game's look. */
export function themeHome(shell, mode) {
  const layers = shell.querySelectorAll('.carousel-theme');
  if (layers.length < 2) return;
  const [a, b] = layers;
  const next = a.classList.contains('is-active') ? b : a;
  const current = next === a ? b : a;
  next.setAttribute('style', identityVariables(mode));
  next.dataset.mode = mode;
  next.classList.add('is-active');
  current.classList.remove('is-active');
  shell.dataset.carouselScheme = identityOf(mode).scheme;
  shell.setAttribute('style', identityVariables(mode));
}
