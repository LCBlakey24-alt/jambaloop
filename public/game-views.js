import { boardRoute, boardPath, boardPathChoices, boardFinish, boardFork, boardMappedPosition, boardDuration, durationLabel } from './board-route.js';
import { avatarView } from './party-views.js';
import { categories, categoryName, partyModes, minimumPlayers, wheelCategories } from './game-config.js';
import {requiredPlayers} from './team-play.js';

export function wheelView(state) {
  const entries = wheelCategories(state.includeChristmas);
  const slice = 360 / entries.length;
  const colors = entries.map(([, , , , color], index) => color + ' ' + index * slice + 'deg ' + (index + 1) * slice + 'deg').join(',');
  const selected = entries.findIndex(([id]) => id === state.motion?.category);
  const turn = 360 * 5 - selected * slice;
  return `<div class="wheel-frame" role="img" aria-label="${selected < 0 ? 'Category wheel ready to spin' : 'Category wheel landing on ' + categoryName(state.motion.category)}">
    <div class="wheel-pointer"></div>
    <div class="wheel-disk ${selected < 0 ? '' : 'spinning'}" style="--wheel-colors:${colors};--wheel-start:${-slice / 2}deg;--wheel-turn:${turn}deg">
      ${entries.map(([, , , , , short], index) => `<span class="wheel-label" style="--angle:${index * slice}deg">${short}</span>`).join('')}
    </div>
    <span class="wheel-hub">✦</span>
  </div>`;
}

const safeName = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const pawnMarks = ['◆', '▲', '●', '■'];
const pipCells = [[], [5], [1, 9], [1, 5, 9], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]];

function dieBadge(value) {
  const pips = pipCells[value];
  const grid = Array.from({ length: 9 }, (_, index) => `<i${pips.includes(index + 1) ? ' class="pip"' : ''}></i>`).join('');
  return `<span class="die-badge" aria-hidden="true">${grid}</span>`;
}

export function rollRecap(state, forStage = false) {
  const motion = state.motion;
  if (!motion) return '';
  const board = state.mode === 'board';
  const team = state.teams[state.activeTeam];
  const dice = board ? [motion.die] : motion.dice;
  const summary = board ? `Team ${team.name} rolled ${motion.die} · ${categoryName(motion.category)}` : `Rolled ${dice.join(' + ')} = ${motion.sum}`;
  const outcome = board ? `Space ${motion.to} of ${boardFinish(state.boardLength,motion.pathChoice)} · Level ${motion.difficulty}/6${motion.pathMultiplier === 2 ? ' · POWER ×2 for active team' : motion.pathChoice === 'questions' ? ' · QUESTION TRAIL' : ''}${forStage ? ' · ' + motion.points + ' base pts' : ''}`
    : `×${motion.multiplier} points`;
  return `<div class="roll-recap ${forStage ? 'stage-score' : board ? 'turn-info' : 'roll-result'}"${team ? ` style="--roll-accent:${team.color}"` : ''}>
    <div class="roll-faces">${dice.map(dieBadge).join('')}</div><div><strong>${summary}</strong><small>${outcome}</small></div></div>`;
}

export function teamList(state, personalTeam, compact = false) {
  const showScores = state.phase === 'finished' || (state.scoreInterval ?? 1) === 1;
  return `<div class="board-teams ${compact ? 'compact-teams' : ''}">${state.teams.map(team => `<div class="board-team ${team.id === state.activeTeam ? 'active-team' : ''}" style="--team:${team.color}">
    <span class="team-mark" aria-hidden="true">${pawnMarks[team.id]}</span><span><strong>${safeName(team.name)}${team.id === personalTeam ? (state.playStyle === 'individual' ? ' · you' : ' · your team') : ''}</strong>
    <small>${team.position >= boardFinish(state.boardLength,team.pathChoice) ? 'Finished' : Math.round(boardMappedPosition(state.boardLength,team.position,team.pathChoice)*10)/10 + ' / ' + state.boardLength + ' towards finish'}${team.pathChoice ? ' · ' + (team.pathChoice === 'power' ? 'Power Lane' : 'Question Trail') : ''}${showScores ? ' · ' + team.score.toLocaleString() + ' pts' : ''}</small></span>
    ${showScores && state.phase === 'reveal' && team.roundPoints ? `<span class="team-bonus">+${team.roundPoints} pts</span>` : ''}</div>`).join('')}</div>`;
}

export function boardView(state) {
  const route = boardRoute(state.boardLength, state.includeChristmas);
  const edge = state.boardLength / 8;
  const tiles = route.map(({ x, z, index, category, label, finish }) => {
    const entry = categories.find(([id]) => id === category);
    const tokens = state.teams.filter(team => Math.round(boardMappedPosition(state.boardLength,team.position,team.pathChoice)) === index);
    return `<div class="fallback-tile" data-landing="${index === state.motion?.to}" style="grid-area:${z + edge + 1}/${x + edge + 1};--tile:${entry?.[4] ?? '#fff0d4'}" title="${label}">
      <strong>${finish ? '⚑' : index || '✦'}</strong><small>${entry?.[5] ?? label}</small>
      <span>${tokens.map(team => `<i style="--pawn:${team.color}">${pawnMarks[team.id]}</i>`).join('')}</span></div>`;
  }).join('');
  const label = state.motion ? `Race board, rolled ${state.motion.die}, landing on space ${state.motion.to}`
    : `Race board with ${state.boardLength} spaces and a dice tower`;
  return `<div class="board-stage race-stage" id="board-stage" role="img" aria-label="${label}">
    <div class="board-fallback" style="--board-grid:${edge * 2 + 1};--center-end:${edge * 2 + 1}" aria-hidden="true">${tiles}
    <div class="fallback-center"><strong>Board Race</strong><span>${state.boardLength} spaces · Fork ahead</span><small>POWER ×2 · QUIZ +4 tiles</small>
    ${state.motion ? dieBadge(state.motion.die) : ''}</div></div>
    <div class="board-fork-key" aria-hidden="true"><span class="power">Power ×2</span><span class="questions">Question Trail +4</span></div>
    <div class="stage-beat" aria-hidden="true"><span data-during="rolling">In the tower</span><span data-during="landing">Bouncing onto the board</span><span data-during="moving">Pawn advancing</span></div>
    ${rollRecap(state, true)}
  </div>`;
}

export function diceView(state) {
  const values = state.motion?.dice ?? [1, 6];
  return `<div class="board-stage dice-stage" id="board-stage" role="img" aria-label="${state.motion ? 'Rolled ' + values.join(' and ') : 'Two dice ready to roll'}">
    <div class="dice-fallback" aria-hidden="true">${values.map(dieBadge).join('')}</div>
    <div class="stage-beat" aria-hidden="true"><span data-during="rolling">Dice in motion</span></div>
    ${rollRecap(state, true)}
  </div>`;
}

export function lobbyView(state, { host, escape, icons, modeName }) {
  const canControl = host || state.isCaptain;
  const config = `<button class="button outline" data-action="configure">${icons('settings')} Choose game</button>`;
  const minimum = requiredPlayers(state.mode,state.playStyle,state.teamCount,minimumPlayers(state.mode));
  const start = `<button class="button primary" data-action="advance" ${state.connected < minimum ? 'disabled' : ''}>Start ${state.mode === 'board' ? 'race' : partyModes.includes(state.mode) ? 'game' : 'quiz'} ${icons('play')}</button>`;
  const practice = `<button class="button outline" data-action="practice">${partyModes.includes(state.mode) || ['board', 'wheel', 'dice'].includes(state.mode) ? 'Try a practice round' : 'Practice answers'}</button>`;
  const captain = state.captainName ? `<p class="lobby-rule">Captain <strong>${escape(state.captainName)}</strong></p>` : '<p class="lobby-rule">The first player to join becomes captain.</p>';
  const game = escape(state.quizTitle || modeName(state.mode));
  const party = partyModes.includes(state.mode);
  const screens = state.phoneView === 'answers' ? 'Answer controls only' : 'Question and answers';
  const race = state.mode === 'quizrace';
  const boardPlan = state.mode === 'board' ? boardDuration({ spaces: state.boardLength, pieces: state.teamCount, players: state.playerCount || state.teamCount, cap: state.total, seconds: state.seconds, autoReveal: state.autoReveal }) : undefined;
  const summary = `<div class="lobby-game">${state.mode === 'rare' ? '<span class="lobby-rare-art" aria-hidden="true">RARE <b>FIND</b></span>' : state.mode === 'topanswers' ? '<span class="lobby-topanswers-art" aria-hidden="true">TOP <b>ANSWERS</b></span>' : state.mode === 'brain' ? '<span class="lobby-brain-art" aria-hidden="true">BRAIN <b>LADDER</b></span>' : state.mode === 'spotlight' ? '<span class="lobby-spotlight-art" aria-hidden="true">SPOTLIGHT <b>WHEEL</b></span>' : state.mode === 'samepage' ? '<span class="lobby-samepage-art" aria-hidden="true">SAME <b>PAGE</b></span>' : `<img src="/mode-${state.mode}.${state.mode==='quizrace'?'svg':'webp'}" alt="" class="lobby-mode-art" loading="lazy">`}<div class="lobby-game-copy"><strong>${game}</strong>${race ? `<small>2–12 racers · ${escape(state.raceLength)} race · ${escape(state.raceTrack)} track</small><small>${escape(state.raceDifficulty)} difficulty · 12 seconds per question · first to finish wins</small>` : party ? `<small>${state.mode === 'rare' ? (state.total + ' unusual answer rounds · 3+ players · host validates unrecognised answers') : state.mode === 'topanswers' ? (state.total + ' live room polls · choose then predict · 3+ players') : state.mode === 'brain' ? (state.total + ' logic levels · two lives each · points increase as you climb') : state.mode === 'potato' ? 'One shared 2-minute countdown' : state.mode === 'bluff' ? 'One secret bluff · private voting' : (state.mode === 'spotlight' ? ((state.playerCount * state.total) + ' contestant rounds · ' + state.total + ' ' + (state.total === 1 ? 'turn' : 'turns') + ' each') : state.mode === 'tracks' ? (state.playerCount + ' rounds · rotating Trolley Driver') : (state.total + ' rounds · private voting'))}</small>` : `<small>${state.total} ${state.mode === 'board' ? 'max turns' : state.total === 1 ? 'question' : 'questions'} · ${state.seconds ? state.seconds + 's each' : 'No timer'}</small><small>${state.privateQuestions ? 'Different questions on each phone' : 'Phones · ' + screens}</small>`}
    ${!race && !party && state.scoreInterval !== undefined ? `<small>${state.scoreInterval === 0 ? 'Leaderboard at the end' : state.scoreInterval === 1 ? 'Leaderboard after every question' : `Leaderboard every ${state.scoreInterval} ${state.mode === 'board' ? 'turns' : 'questions'}`}</small>` : ''}
    ${state.difficulty === 'family' ? '<small>Family mix · ages 8+</small>' : state.difficulty === 'challenge' ? '<small>Challenge mix</small>' : ''}
    ${!race && state.scoring ? `<small>${state.scoring.base} base pts${state.scoring.bonus ? ' · Up to +' + state.scoring.bonus + ' for speed' : ''}
      ${state.scoring.doubles === 'final' ? ' · Double scheduled finale' : state.scoring.doubles === 'third' ? ' · Double every third question' : ''}</small>` : ''}
    ${boardPlan && state.boardSpeed ? `<small>Up to +${state.boardSpeed}% for speed · Difficulty follows the die</small>` : ''}
    ${boardPlan ? `<small>${state.boardLength} spaces · ${boardPlan.teams} ${boardPlan.teams === 1 ? 'piece' : 'pieces'} · About ${durationLabel(boardPlan)}${state.playerCount ? '' : ' with ' + state.teamCount + ' players'}</small>` : ''}
    ${state.connected < minimum && party ? `<small>Needs at least ${minimum} players</small>` : ''}${state.playStyle === 'teams' ? `<small>${state.teamCount} balanced teams · players automatically allocated</small>` : state.mode === 'board' ? '<small>Individual racers · up to 4 pieces</small>' : '<small>Everyone plays individually</small>'}</div></div>`;

  const teamPreview = state.teamPreview?.length ? `<div class="lobby-team-preview" aria-label="Automatic team allocation">
    ${state.teamPreview.map(t => `<div class="lobby-team" style="--team:${t.color}">
      <strong>${state.playStyle === 'individual' ? escape(t.name) : 'Team ' + escape(t.name)}</strong>
      <span>${t.members.length ? t.members.map(m => escape(m.name)).join(', ') : 'Waiting for player'}</span></div>`).join('')}
    </div>` : '';
  const publicInvite = host && /^https:\/\//.test(state.joinUrl||'');
  const joinOrigin = host ? new URL(state.joinUrl).origin : '';
  const joinOptions = host ? (state.joinOptions || []) : [];
  const localOnly = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(state.joinUrl || '');
  const joinSelector = joinOptions.length > 1 ? '<label class="join-address-label">Phone connection address<select data-join-origin aria-label="Choose the network address used in the QR code">' +
    joinOptions.map(option => '<option value="' + escape(option.origin) + '" ' + (option.origin === joinOrigin ? 'selected' : '') + '>' + escape(option.label) + '</option>').join('') + '</select></label>' : '';
  const readyCount = state.readyCount ?? 0;
  const readyText = `${readyCount} of ${state.connected} ready`;
  if (!host) return `<div class="game-panel phone-lobby">
    <div class="lobby-eyebrow"><span class="eyebrow">ROOM ${state.code}</span>${state.isCaptain ? '<span class="captain-tag">★ Captain</span>' : ''}</div>
    <h2>${state.game > 1 ? 'Rematch ready, ' : 'You’re in, '}${escape(state.player.name)}!</h2>
    <p>${state.isCaptain ? 'Choose a game for the room and start when everyone is ready.' : 'Stay here while the captain sets up the game.'}</p>
    ${summary}${teamPreview}
    <div class="ready-actions"><button class="button outline" data-action="ready-toggle" aria-label="I’m ready" aria-pressed="${Boolean(state.player.ready)}">
      ${icons(state.player.ready ? 'circle-check' : 'circle')}${state.player.ready ? 'Ready' : 'I’m ready'}</button><span role="status">${readyText}</span></div>
    ${state.isCaptain ? '' : captain}
    <div class="actions">${canControl ? start + config : ''}${practice}</div></div>`;

  const transfer = state.players.length > 1 ? `<form id="captain-form" class="captain-form"><label>Change captain<select name="player">${state.players.map(player =>
    `<option value="${player.id}" ${player.id === state.captainId ? 'selected' : ''}>${escape(player.name)}</option>`).join('')}</select></label>
    <button class="button outline small" type="submit">Assign</button></form>` : '';
  return `<h1>${state.game > 1 ? 'Rematch lobby' : 'Party lobby'}<span class="brand-dot">.</span></h1><div class="lobby">
    <div class="game-panel join-panel"><div class="join-network"><div class="eyebrow">JOIN ON YOUR PHONE</div><div class="room-code">${state.code}</div>
      <p class="join-help">${publicInvite ? 'Scan from any phone — <strong>Wi-Fi, 4G or 5G</strong> all work.' : 'Scan using a phone on the <strong>same Wi-Fi</strong> as this laptop.'}</p>
      <p class="join-url" aria-label="Phone join link">${escape(state.joinUrl)}</p>
      ${joinSelector}
      ${localOnly ? '<p class="join-warning" role="alert">This address works only on the laptop. Connect to Wi-Fi and restart the server to find a phone address.</p>' : ''}
      ${publicInvite ? '<p class="join-help">Share the QR or room code with your family.</p>' : '<p class="join-help">If scanning fails, try another address or allow Node.js through Windows Firewall.</p>'}
      <button class="button outline" data-action="copy">${icons('link')} Copy join link</button></div>
      <div class="join-qr-frame"><img class="qr" src="${state.qr}" alt="QR code to join room ${state.code}"></div></div>
    <div class="game-panel roster-panel"><div class="eyebrow">IN THE ROOM</div>
      <h2>Players (${state.playerCount})</h2>${captain}
      <div class="roster-counts"><span class="online-count"><i></i>${state.connected} connected</span>
        ${state.connected < state.playerCount ? `<span>${state.playerCount - state.connected} away</span>` : ''}</div>
      ${state.connected ? `<div class="ready-meter"><strong>${readyText}</strong><progress value="${readyCount}" max="${state.connected}" aria-label="Players ready"></progress></div>` : ''}
      ${state.players.length ? `<ul class="players">${state.players.map(player => `<li data-connected="${player.connected}" data-ready="${Boolean(player.ready && player.connected)}">${avatarView(player, escape)}${escape(player.name)}${player.id === state.captainId ? '<span aria-label="Captain">★</span>' : ''}${player.connected ? player.ready ? '<small class="ready-badge">Ready</small>' : '' : '<small>Away</small>'}</li>`).join('')}</ul>` : '<p>Waiting for players to join…</p>'}
      ${transfer}${summary}${teamPreview}${state.autoReveal ? '<p class="lobby-rule">Auto-reveal is on</p>' : ''}
      <div class="actions">${config}${start}${practice}</div></div></div>`;
}

export function teamScoreboard(teams, personalId) {
  const ordered = [...teams].sort((a, b) => b.score - a.score);
  const scale = Math.max(1, ordered[0]?.score ?? 0);
  return `<ol class="team-scoreboard">${ordered.map(team => {
    const rank = ordered.findIndex(entry => entry.score === team.score) + 1;
    return `<li style="--team:${team.color};--share:${100 * team.score / scale}%">
      <span class="scoreboard-rank">#${rank}</span>
      <div><strong>Team ${safeName(team.name)}${team.id === personalId ? ' · your team' : ''}</strong><small>${team.size} ${team.size === 1 ? 'player' : 'players'}</small></div>
      <div class="team-points"><strong>${team.score.toLocaleString()} pts</strong>${team.roundPoints ? `<small>+${team.roundPoints.toLocaleString()} last round</small>` : ''}</div>
    </li>`;
  }).join('')}</ol>`;
}

export function reviewView(review, escape, formatNumber) {
  const verdicts = { won: 'Scored', miss: 'No points', skipped: 'No answer' };
  return `<details class="review-details"><summary>Review ${review.length} ${review.length === 1 ? 'question' : 'questions'}</summary>
    <ol class="review-list">${review.map((item, index) => `<li>
      <div><span>Question ${index + 1}</span>${item.result ? `<span class="review-verdict" data-result="${item.result}">${verdicts[item.result]}</span>` : ''}</div>
      ${item.prompt ? `<strong>${escape(item.prompt)}</strong>` : ''}
      <p>${escape(item.type === 'estimate' ? formatNumber(item.correct, item.unit) : Array.isArray(item.correct) ? item.correct.join(' → ') : item.correct)}</p>
    </li>`).join('')}</ol></details>`;
}
