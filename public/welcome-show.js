// "Welcome to Jambaloop": a short animated opener on the TV while Max and
// Poppy explain how the night works. Each spoken line names a scene; this
// module draws those scenes (original CSS artwork, plus real game tiles).
import { modes } from './game-config.js';
import { identityVariables } from './game-identities.js';
import { tileArt } from './home-launcher.js';

const pieces = count => Array.from({ length: count }, (_, n) => `<i style="--n:${n}"></i>`).join('');
const tile = id => `<span class="welcome-tile" style="${identityVariables(id)}">${tileArt(id)}</span>`;
const phone = (inner, extra = '') => `<span class="welcome-phone ${extra}">${inner}</span>`;
const pads = '<i style="--c:#c8203f"></i><i style="--c:#1f63d6"></i><i style="--c:#f0b21f"></i><i style="--c:#0f8a52"></i>';

const scenes = {
  hello: () => `<div class="welcome-logo"><span>Jambal<b>oo</b>p</span><small>WELCOME TO GAME NIGHT</small></div>
    <div class="welcome-burst" aria-hidden="true">${pieces(12)}</div>`,
  devices: () => `<div class="welcome-devices"><span class="welcome-tv"><span class="welcome-tv-screen">${tile('classic')}</span></span>
    <span class="welcome-links">${'<i></i>'.repeat(3)}</span>
    <span class="welcome-phones">${phone(`<span class="welcome-pads">${pads}</span>`)}${phone(`<span class="welcome-pads">${pads}</span>`, 'is-tilted')}</span></div>`,
  join: (room) => `<div class="welcome-join"><span class="welcome-code-label">ROOM CODE</span><span class="welcome-code">${room.code}</span>
    ${room.qr ? `<img class="welcome-qr" src="${room.qr}" alt="">` : ''}${phone('<span class="welcome-scan"></span>', 'is-scanning')}</div>`,
  captain: () => `<div class="welcome-captain">${phone(`<span class="welcome-strip">${['wheel', 'knockout', 'potato', 'sketch'].map(tile).join('')}</span>`, 'is-captain')}
    <span class="welcome-crown" aria-hidden="true">👑</span></div>`,
  play: () => `<div class="welcome-play"><span class="welcome-question">What's the capital of Australia?</span>
    ${phone(`<span class="welcome-pads is-live">${pads}</span>`)}</div>`,
  shows: () => `<div class="welcome-parade">${modes.map(([id]) => tile(id)).join('')}</div>`,
  ready: () => `<div class="welcome-ready"><span>Let's play!</span></div><div class="welcome-burst is-confetti" aria-hidden="true">${pieces(24)}</div>`,
  back: () => `<div class="welcome-back"><span class="welcome-back-title">Welcome back!</span>
    <small>Everyone here has played before</small>
    <span class="welcome-choice"><button type="button" class="button outline" data-welcome="tour">▶ Play the intro</button>
      <button type="button" class="button primary" data-welcome="skip">Skip, let's play</button></span>
    <small class="welcome-choice-hint">The captain can choose on their phone</small></div>`,
  skip: () => `<div class="welcome-ready is-skip"><span>Good luck!</span></div><div class="welcome-burst is-confetti" aria-hidden="true">${pieces(24)}</div>`,
};

/** Open the overlay on the TV. Returns { scene(name), close() }. */
export function openWelcome(root, room, { onSkip, onTour }) {
  root.querySelector('.welcome-show')?.remove();
  const overlay = document.createElement('section');
  overlay.className = 'welcome-show';
  overlay.setAttribute('aria-label', 'Welcome to Jambaloop');
  overlay.innerHTML = `<div class="welcome-stage"></div>
    <button type="button" class="button outline welcome-skip">Skip intro</button>`;
  overlay.querySelector('.welcome-skip').addEventListener('click', () => onSkip?.());
  // The welcome-back choice can also be made on the TV.
  overlay.addEventListener('click', event => {
    const choice = event.target.closest('[data-welcome]')?.dataset.welcome;
    if (choice === 'skip') onSkip?.();
    if (choice === 'tour') onTour?.();
  });
  root.append(overlay);
  const stage = overlay.querySelector('.welcome-stage');
  let current;
  return {
    scene(name) {
      if (name === current || !scenes[name]) return;
      current = name;
      stage.dataset.scene = name;
      stage.innerHTML = `<div class="welcome-scene" data-scene="${name}"${name === 'back' ? '' : ' aria-hidden="true"'}>${scenes[name](room)}</div>`;
    },
    close() {
      overlay.classList.add('is-closing');
      setTimeout(() => overlay.remove(), 450);
    },
  };
}
