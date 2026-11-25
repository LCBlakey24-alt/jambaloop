// Hot Potato on the TV: everyone sits in a circle (their selfie, or an initial)
// and a pulsing, ticking potato sits in front of whoever holds it. When the
// holder answers correctly the server picks the next holder; the potato then
// arcs across the circle to them. Presentation only: the server decides who
// holds the potato, and only the holder's phone ever receives the question.

/** Seat centres (percent of the ring box), clockwise from the top. */
export function seatPositions(count, radiusX = 43, radiusY = 39) {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / Math.max(1, count);
    return { x: 50 + radiusX * Math.cos(angle), y: 50 + radiusY * Math.sin(angle), angle };
  });
}

/** Where the potato rests: in front of the holder, towards the middle. */
export function potatoSpot(seat) {
  return { x: 50 + (seat.x - 50) * .62, y: 50 + (seat.y - 50) * .58 };
}

const percent = value => value.toFixed(2) + '%';

// An original, hand-drawn style potato: lumpy body, eyes and rising steam.
export const potatoSvg = `<svg class="hot-potato-art" viewBox="0 0 120 110" aria-hidden="true" focusable="false">
  <defs><radialGradient id="potato-skin" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#f3c27a"/><stop offset=".55" stop-color="#c98a43"/><stop offset="1" stop-color="#7c4a1f"/></radialGradient></defs>
  <g class="hot-potato-steam" fill="none" stroke="#fff3" stroke-width="5" stroke-linecap="round">
    <path d="M42 26c-6-7 4-11-2-19"/><path d="M60 22c-6-7 4-11-2-19"/><path d="M78 26c-6-7 4-11-2-19"/></g>
  <path d="M20 66c-6-20 10-36 32-38 13-1 22 3 34 2 18-1 30 14 28 32-2 21-20 36-49 37-28 1-40-14-45-33z" fill="url(#potato-skin)" stroke="#5b3413" stroke-width="3"/>
  <g fill="#6d3f17" opacity=".75"><ellipse cx="44" cy="58" rx="4" ry="2.6"/><ellipse cx="74" cy="52" rx="3.4" ry="2.2"/><ellipse cx="86" cy="76" rx="4" ry="2.4"/><ellipse cx="55" cy="84" rx="3" ry="2"/><ellipse cx="33" cy="78" rx="2.6" ry="1.8"/></g>
  <path d="M34 48c8-6 18-8 26-6" stroke="#fff8" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>`;

/** The circle of players with the potato in front of the current holder. */
export function potatoCircleView(party, escape, avatarView) {
  const seats = party.seats?.length ? party.seats : [party.holder];
  const positions = seatPositions(seats.length);
  const holderIndex = Math.max(0, seats.findIndex(seat => seat.id === party.holder.id));
  const spot = potatoSpot(positions[holderIndex]);
  // Big rooms get smaller seats so faces never overlap round the ring.
  const size = seats.length <= 6 ? 'large' : seats.length <= 12 ? 'medium' : 'small';
  return `<div class="potato-ring" data-seats="${size}" style="--seat-count:${seats.length}">
    ${seats.map((seat, index) => `<div class="potato-seat${seat.id === party.holder.id ? ' is-holder' : ''}${seat.connected === false ? ' is-away' : ''}" style="--x:${percent(positions[index].x)};--y:${percent(positions[index].y)}">
      ${avatarView(seat, escape)}<span class="potato-seat-name">${escape(seat.name)}</span></div>`).join('')}
    <div class="potato-centre">
      <div class="potato-stage-clock"><span class="timer potato-timer" id="timer"></span></div>
      <h1>${escape(party.holder.name)} has the potato</h1>
      <p>${party.passes} successful ${party.passes === 1 ? 'pass' : 'passes'}</p>
    </div>
    <div class="hot-potato" data-potato-holder="${escape(party.holder.id)}" style="--x:${percent(spot.x)};--y:${percent(spot.y)}"><div class="hot-potato-pulse">${potatoSvg}</div></div>
  </div>`;
}

let last;
/**
 * After each render: if the holder changed, fly the potato from the old seat to
 * the new one in a high arc. Reduced motion simply shows it in its new place.
 */
export function animatePotato(root, key, reducedMotion) {
  const potato = root?.querySelector('.hot-potato');
  if (!potato) { last = undefined; return false; }
  const now = { key, id: potato.dataset.potatoHolder, x: potato.style.getPropertyValue('--x'), y: potato.style.getPropertyValue('--y') };
  const jumped = last && last.key === key && last.id !== now.id;
  if (jumped && !reducedMotion && potato.animate) {
    potato.animate([
      { left: last.x, top: last.y, transform: 'translate(-50%,-50%) scale(1) rotate(0deg)' },
      { offset: .5, transform: 'translate(-50%,-50%) translateY(-16cqh) scale(1.55) rotate(200deg)' },
      { left: now.x, top: now.y, transform: 'translate(-50%,-50%) scale(1) rotate(360deg)' },
    ], { duration: 720, easing: 'cubic-bezier(.33,.72,.38,1)' });
  }
  last = now;
  return Boolean(jumped);
}

/** Faster, redder pulsing as the shared countdown runs down (1 = full time). */
export function potatoHeat(root, fraction) {
  const ring = root?.querySelector('.potato-ring');
  if (!ring) return;
  const beat = .32 + .68 * Math.max(0, Math.min(1, fraction));
  ring.style.setProperty('--potato-beat', beat.toFixed(2) + 's');
  ring.style.setProperty('--potato-heat', (1 - fraction).toFixed(2));
}
