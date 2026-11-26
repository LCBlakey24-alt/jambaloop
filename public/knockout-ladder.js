// Knockout's survivor ladder on the TV. Each player has three pixel hearts.
// On the reveal, a lost heart shatters into pixels with a chiptune hit; a
// player on their last heart gets a big X across their photo and a KO jingle,
// drops into the knocked-out row, and everyone below moves up a rung.
// Decorative only: reads the TV's knockout ladder, never answers.
import { avatarView } from './party-views.js';
import { prefersReducedMotion } from './motion.js';

// 7×6 pixel heart.
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const pixels = HEART.flatMap((row, y) => [...row].flatMap((cell, x) => cell === 'X' ? [[x, y]] : []));
// Fixed scatter per pixel so every shatter looks the same on every screen.
const scatter = pixels.map(([x, y], i) => {
  const angle = Math.atan2(y - 2.5, x - 3) + (i % 3 - 1) * .5;
  const reach = 22 + (i * 37 % 19);
  return [Math.round(Math.cos(angle) * reach), Math.round(Math.sin(angle) * reach - 10), (i * 53 % 160) - 80];
});

function pixelHeart(state) {
  const rects = pixels.map(([x, y], i) => {
    const [dx, dy, spin] = scatter[i];
    const shine = x === 1 && y === 1;
    return `<rect x="${x}" y="${y}" width="1" height="1" style="--dx:${dx}px;--dy:${dy}px;--spin:${spin}deg"${shine ? ' class="shine"' : ''}/>`;
  }).join('');
  return `<svg class="pixel-heart" data-heart="${state}" viewBox="0 0 7 6" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${rects}</svg>`;
}

function hearts(row) {
  // A heart lost this round is drawn full and shatters on cue.
  const before = row.lost ? row.lives + 1 : row.lives;
  return `<span class="ko-hearts" aria-label="${row.lives} ${row.lives === 1 ? 'life' : 'lives'} left">${[0, 1, 2]
    .map(i => pixelHeart(i < row.lives ? 'full' : row.lost && i === before - 1 ? 'breaking' : 'empty')).join('')}</span>`;
}

const rung = (row, index, escape) => `<li class="ko-rung" data-player="${escape(row.id)}"${row.lost ? ' data-lost' : ''}${row.outNow ? ' data-out-now' : ''}>
  <span class="ko-rank">${index + 1}</span><span class="ko-face">${avatarView(row, escape)}<i class="ko-x" aria-hidden="true"></i></span>
  <span class="ko-name">${escape(row.name)}</span>${hearts(row)}</li>`;

/** The ladder panel for the TV during a knockout round. */
export function knockoutLadder(state, escape) {
  const ladder = state.knockout;
  if (!ladder) return '';
  const shown = ladder.survivors.slice(0, 8);
  const total = ladder.survivorCount ?? ladder.survivors.length;
  // Players knocked out this round start on the ladder, then drop off it.
  const falling = ladder.out.filter(row => row.outNow).slice(0, 4);
  const knocked = ladder.out.filter(row => !row.outNow).slice(0, Math.max(0, 10 - falling.length));
  return `<aside class="game-panel ko-ladder" aria-label="Survivors">
    <div class="eyebrow">SURVIVORS · <span data-ko-count>${total}</span> STILL IN</div>
    <ol class="ko-rungs">${[...shown, ...falling].map((row, i) => rung(row, i, escape)).join('')}</ol>
    ${total > shown.length ? `<p class="ko-more">+${total - shown.length} more still in</p>` : ''}
    ${ladder.out.length ? `<div class="ko-out"><div class="eyebrow">KNOCKED OUT</div><ul>${[...falling, ...knocked].map(row =>
      `<li title="${escape(row.name)}"${row.outNow ? ' data-now' : ''}><span class="ko-face is-out">${avatarView(row, escape)}<i class="ko-x" aria-hidden="true"></i></span></li>`).join('')}</ul></div>` : ''}
  </aside>`;
}

let lastOrder;

/** Remember the ladder before the reveal so rows can slide to their new rungs. */
export function rememberLadder(state) {
  if (state.phase === 'question' && state.knockout) lastOrder = { key: `${state.code}/${state.game}/${state.index}`, ids: state.knockout.survivors.map(row => row.id) };
}

/**
 * Play the round's knockout beats after `delay` (the reveal's drum-roll):
 * hearts shatter, KO'd players get their X and fall to the knocked-out row,
 * survivors climb to their new rungs. Any later re-render shows the result.
 */
export function playKnockout(root, state, { enter, delay = 0, onHit, onKo }) {
  const panel = root.querySelector('.ko-ladder');
  if (!panel || !enter || state.phase !== 'reveal' || prefersReducedMotion()) return;
  const rows = [...panel.querySelectorAll('.ko-rung')];
  const hits = rows.filter(row => row.hasAttribute('data-lost'));
  const outs = rows.filter(row => row.hasAttribute('data-out-now'));
  if (!hits.length && !outs.length) return;
  const at = (ms, step) => setTimeout(() => { if (panel.isConnected) step(); }, ms);
  // Rows start where they stood before this round.
  const before = lastOrder?.key === `${state.code}/${state.game}/${state.index}` ? lastOrder.ids : null;
  if (before) rows.forEach((row, index) => {
    const was = before.indexOf(row.dataset.player);
    if (was >= 0 && was !== index) row.style.setProperty('--from', was - index);
  });
  panel.dataset.koStage = 'ready';
  // The count drops only when the knocked-out players actually fall.
  const count = panel.querySelector('[data-ko-count]');
  const final = count?.textContent;
  if (count && outs.length) count.textContent = Number(final) + outs.length;
  hits.forEach((row, i) => at(delay + i * 140, () => {
    const heart = row.querySelector('[data-heart="breaking"]');
    heart?.classList.add('is-shattering');
    row.classList.add('is-hit');
    if (i === 0) onHit?.();
    at(760, () => heart?.setAttribute('data-heart', 'empty'));
  }));
  const koAt = delay + hits.length * 140 + 700;
  if (outs.length) at(koAt, () => { outs.forEach(row => row.classList.add('is-ko')); onKo?.(); });
  const settleAt = koAt + (outs.length ? 1500 : 150);
  at(settleAt, () => { outs.forEach(row => row.classList.add('is-gone')); panel.dataset.koStage = 'falling'; if (count) count.textContent = final; });
  at(settleAt + 550, () => { outs.forEach(row => { row.hidden = true; }); panel.dataset.koStage = 'settle'; });
}

/** Your pixel hearts on your phone during Knockout. */
export function phoneHearts(state) {
  const lives = state.player?.lives ?? 0;
  const lost = Boolean(state.lostLife);
  return `<span class="ko-hearts ko-phone-hearts" aria-hidden="true">${[0, 1, 2]
    .map(i => pixelHeart(i < lives ? 'full' : lost && i === lives ? 'breaking' : 'empty')).join('')}</span>`;
}

/** Break your own heart on your phone (after the reveal beat), with a buzz. */
export function shatterPhoneHeart(root, state) {
  if (!state.lostLife || prefersReducedMotion()) return;
  const heart = root.querySelector('.ko-phone-hearts [data-heart="breaking"]');
  if (!heart) return;
  root.querySelector('.ko-phone-hearts').dataset.koStage = 'ready';
  heart.classList.add('is-shattering');
  // Browsers only allow a buzz after the player has touched the page.
  if (navigator.userActivation?.hasBeenActive) try { navigator.vibrate?.(state.knockedOut ? [90, 60, 90, 60, 260] : [70, 40, 120]); } catch {}
  setTimeout(() => heart.isConnected && heart.setAttribute('data-heart', 'empty'), 760);
}
