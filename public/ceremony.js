import { avatarView } from './party-views.js';

const awardIcons = { fast: 'zap', slow: 'hourglass', correct: 'trophy', wrong: 'target', streak: 'flame', comeback: 'trending-up' };

export function scoreReveal(phase, room) {
  if (!room.ceremony) return '';
  return `<section class="game-panel score-ceremony" id="score-ceremony" ${phase ? '' : 'hidden'}>
    <div class="eyebrow">FINAL SCORE REVEAL</div>
    <div id="ceremony-frame"></div>
    <button class="button outline small" data-action="ceremony-skip">Skip to full results</button></section>`;
}

export function revealFrames(players, awards = []) {
  let rank = 0;
  const ascending = players.map((player, index) => {
    if (!index || player.score !== players[index - 1].score || player.lives !== players[index - 1].lives) rank = index + 1;
    return { player, rank };
  }).reverse();
  const leading = ascending.slice(-3);
  const remaining = ascending.slice(0, -3);
  const frames = [{ label: 'The scores are in', rows: [], milliseconds: 1150 }];
  for (let index = 0; index < remaining.length; index += 12) {
    frames.push({ label: 'The countdown begins', rows: remaining.slice(index, index + 12), milliseconds: 1550 });
  }
  for (const row of leading) {
    frames.push({ label: row.rank === 1 ? 'The top score' : 'On the podium', rows: [row], milliseconds: row.rank === 1 ? 2050 : 1350 });
  }
  if (awards.length) frames.push({ awards, rows: [], milliseconds: 4800 });
  return frames;
}

export function currentFrame(frames, elapsed) {
  for (const [index, frame] of frames.entries()) {
    elapsed -= frame.milliseconds;
    if (elapsed < 0) return index;
  }
  return -1;
}

export function frameView(frame, escape, icons) {
  if (frame.awards) return `<div class="ceremony-slide ceremony-awards">${awardView(frame.awards, escape, icons)}</div>`;
  if (!frame.rows.length) return `<div class="ceremony-slide ceremony-intro"><span aria-hidden="true">✦</span><h1>${frame.label}</h1></div>`;
  const rows = frame.rows.map(({ player, rank }, index) => `<li style="--appear:${Math.min(index, 9)}">
    <span class="ceremony-rank">#${rank}</span>${avatarView(player, escape)}<strong>${escape(player.name)}</strong>
    <span>${player.score.toLocaleString()} pts</span></li>`).join('');
  return `<div class="ceremony-slide ${frame.rows.length === 1 ? 'ceremony-spotlight' : ''} ${frame.rows[0].rank === 1 ? 'ceremony-winner' : ''}">
    <h2>${frame.label}</h2><ol class="ceremony-ranks">${rows}</ol></div>`;
}

export function awardView(awards, escape, icons) {
  if (!awards?.length) return '';
  return `<section class="game-panel awards-panel" aria-label="Round awards"><div class="eyebrow">GAME NIGHT HONOURS</div><h2>The awards</h2>
    <div class="award-grid">${awards.map(award => `<article class="award-card" data-award="${award.id}">
      <span class="award-icon" aria-hidden="true">${icons(awardIcons[award.id])}</span>
      <div><h3>${award.title}</h3><small>${award.label} · ${escape(award.value)}</small>
      <strong>${award.names.map(escape).join(', ')}${award.tied > award.names.length ? ' and ' + (award.tied - award.names.length) + ' more' : ''}</strong></div>
    </article>`).join('')}</div></section>`;
}
