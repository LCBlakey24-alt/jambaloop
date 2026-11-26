// Bloodmoon on the TV and on phones. The TV only ever draws the neutral view
// (who is still in, totals, public results). A phone adds its owner's secret
// role and private choices, which arrive in `party.you` and nowhere else.
import { avatarView } from './party-views.js';
import { replayButtons } from './game-night.js';

const roleNames = { vampire: 'Vampire', oracle: 'Oracle', warden: 'Warden', villager: 'Villager' };
const roleIcons = {
  vampire: '<path d="M4 6c3 0 5 2 8 2s5-2 8-2c0 6-2 12-8 14C6 18 4 12 4 6z"/><path d="m9 13 1 3M15 13l-1 3"/>',
  oracle: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  warden: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  villager: '<path d="M3 11 12 4l9 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
};
const roleIcon = role => `<svg class="blood-role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${roleIcons[role] ?? ''}</svg>`;
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const article = role => role === 'oracle' ? 'the Oracle' : role === 'warden' ? 'the Warden' : `a ${roleNames[role]}`;

const moon = '<div class="blood-moon" aria-hidden="true"><i></i><i></i><i></i></div>';

function seats(party, escape, { pickable, action, chosen, barred, mates = [], selfId } = {}) {
  const mateIds = new Map(mates.map(mate => [mate.id, mate]));
  return `<ul class="blood-seats${pickable ? ' is-picking' : ''}">${party.seats.map(seat => {
    const out = !seat.alive;
    const mate = mateIds.get(seat.id);
    const blocked = out || seat.id === barred || (pickable && pickable(seat) === false);
    const tags = [
      out && seat.role ? `<b class="blood-tag" data-role="${seat.role}">${roleNames[seat.role]}</b>` : '',
      out ? `<small>${seat.how === 'bitten' ? 'Bitten' : 'Banished'}</small>` : '',
      mate ? '<b class="blood-tag" data-role="vampire">Fellow vampire</b>' : '',
      seat.id === selfId ? '<small>You</small>' : '',
      seat.id === barred && !out ? '<small>Guarded last night</small>' : '',
      [...mateIds.values()].some(other => other.pick === seat.id) ? '<small class="blood-mate-pick">Your partner’s pick</small>' : '',
    ].join('');
    const inner = `<span class="blood-face">${avatarView(seat, escape)}</span><span class="blood-seat-name">${escape(seat.name)}</span>${tags}`;
    const state = `${out ? ' data-out' : ''}${seat.id === chosen ? ' data-chosen' : ''}${seat.connected === false && !out ? ' data-away' : ''}`;
    return action && !blocked
      ? `<li${state}><button type="button" class="blood-seat" data-action="${action}" data-id="${escape(seat.id)}" aria-pressed="${seat.id === chosen}">${inner}</button></li>`
      : `<li${state}><span class="blood-seat">${inner}</span></li>`;
  }).join('')}</ul>`;
}

const progress = (party, label) => party.expected ? `<p class="blood-progress" role="status"><strong>${party.done} / ${party.expected}</strong><span>${label}</span></p>` : '';
const clock = state => state.ends ? '<div class="blood-timer"><small>TIME LEFT</small><span id="timer" class="timer"></span></div>' : '';

function roleCard(you, escape, { open = false } = {}) {
  const mates = you.mates?.length ? `<p class="blood-mates">Your fellow ${you.mates.length === 1 ? 'vampire' : 'vampires'}: <strong>${you.mates.map(mate => escape(mate.name)).join(', ')}</strong></p>` : '';
  const findings = you.findings?.length ? `<ul class="blood-findings">${you.findings.map(found =>
    `<li data-vampire="${found.vampire}">Night ${found.night}: <strong>${escape(found.name)}</strong> is ${found.vampire ? 'a VAMPIRE' : 'not a vampire'}</li>`).join('')}</ul>` : '';
  return `<details class="blood-role-card" data-role="${you.role}"${open ? ' open' : ''}>
    <summary><span>Your secret role</span><em>Tap to ${open ? 'hide' : 'peek'}</em></summary>
    <div class="blood-role-body">${roleIcon(you.role)}<h2>${you.name}</h2><p>${you.brief}</p>${mates}${findings}</div></details>`;
}

function winnerBanner(party) {
  return party.winner === 'vampires'
    ? ['The vampires win!', 'They now match the village. The night is theirs.']
    : ['The village wins!', 'Every vampire has been banished. The sun comes up at last.'];
}

function finale(state, { host, canControl, escape, icons }) {
  const party = state.party;
  const [title, line] = winnerBanner(party);
  const mine = party.you;
  const own = mine ? `<p class="blood-own-result">${(mine.team === 'vampires') === (party.winner === 'vampires') ? `Your side won${mine.earned ? `: +${mine.earned} points` : ''}.` : 'Your side lost this one.'}</p>` : '';
  return `<section class="game-panel blood-game blood-finished" data-winner="${party.winner ?? ''}">
    <header class="blood-head"><div><span class="blood-kicker">BLOODMOON · THE END</span><h1>${party.winner ? title : 'Not enough players'}</h1><p>${party.winner ? line : 'Bloodmoon needs at least five players in the room.'}</p></div></header>
    ${host ? '' : own}
    <ul class="blood-cast">${party.seats.map(seat => `<li data-role="${seat.role}"${seat.alive ? '' : ' data-out'}>
      <span class="blood-face">${avatarView(seat, escape)}</span><strong>${escape(seat.name)}</strong><b class="blood-tag" data-role="${seat.role}">${roleIcon(seat.role)}${roleNames[seat.role] ?? ''}</b></li>`).join('')}</ul>
    <div class="actions">${canControl ? replayButtons(state, icons) : '<p>Stay here if the captain starts another game.</p>'}</div></section>`;
}

export function bloodmoonView(state, { host, canControl, escape, icons }) {
  const party = state.party;
  if (!party) return '';
  if (state.phase === 'finished') return finale(state, { host, canControl, escape, icons });
  const phase = state.phase.replace('blood-', '');
  const you = host ? undefined : party.you;
  const next = label => canControl ? `<div class="actions blood-actions"><button type="button" class="button primary" data-action="advance">${label}</button></div>` : '';
  const kicker = `BLOODMOON · ${phase === 'roles' ? 'THE DEAL' : ['night', 'dawn'].includes(phase) ? `NIGHT ${party.night}` : `DAY ${party.night}`}`;
  const head = (title, line) => `<header class="blood-head"><div><span class="blood-kicker">${kicker}</span><h1>${title}</h1>${line ? `<p>${line}</p>` : ''}</div>${clock(state)}</header>`;
  const mix = `${plural(party.counts.vampire, 'vampire')}, 1 Oracle, 1 Warden and ${plural(party.counts.villager, 'villager')}`;
  let body = '';

  if (phase === 'roles') {
    body = host
      ? `${head('Check your phone for your secret role', `Hiding in this room: ${mix}. Keep your screen to yourself.`)}${moon}${progress(party, 'players ready')}${seats(party, escape)}${next('Start the first night')}`
      : you ? `${head('Your secret role', 'Do not show anyone. Tap ready when you have read it.')}${roleCard(you, escape, { open: true })}
          ${you.ready ? '<p class="blood-locked" role="status">Ready. Night falls when everyone is in.</p>' : '<div class="actions"><button type="button" class="button primary" data-action="blood-ready">I’m ready</button></div>'}${next('Start the first night')}`
        : `${head('Roles are being dealt', 'You joined after the deal, so watch this one and play the next.')}`;
  } else if (phase === 'night') {
    if (host) body = `${head('Night falls on the village', 'Everyone: eyes on your own phone and make your choice.')}${moon}${progress(party, 'choices made')}${seats(party, escape)}${next('End the night')}`;
    else if (!you) body = `${head('Night falls', 'You are watching this game.')}${moon}`;
    else if (!you.alive) body = `${head('Night falls', 'You are out of the game. Watch quietly: no hints.')}${moon}`;
    else {
      const ask = { vampire: ['Who will you bite?', you.mates.some(mate => mate.alive) ? 'Agree on one victim with your partner. A split means nobody is bitten.' : 'Choose a villager.'],
        oracle: ['Who will you check?', 'At dawn you learn whether they are a vampire.'],
        warden: ['Who will you guard?', 'The vampires cannot bite the player you guard tonight.'],
        villager: ['Who do you suspect most?', 'A private note to yourself. Everyone taps at night, so nobody stands out.'] }[you.role];
      const done = you.pick && you.role !== 'vampire';
      body = `${head(ask[0], ask[1])}${roleCard(you, escape)}
        ${seats(party, escape, { action: done ? undefined : 'blood-pick', chosen: you.pick, barred: you.barred, mates: you.mates, selfId: state.player?.id,
          pickable: seat => (you.role === 'warden' || seat.id !== state.player?.id) && !(you.role === 'vampire' && you.mates.some(mate => mate.id === seat.id)) })}
        ${you.pick ? `<p class="blood-locked" role="status">${you.role === 'vampire' ? 'Chosen. You can change your mind until the night ends.' : 'Locked in. Eyes down until dawn.'}</p>` : ''}${next('End the night')}`;
    }
  } else if (phase === 'dawn') {
    const victim = party.dawn?.victim;
    const news = victim
      ? `<div class="blood-news" data-kind="bitten"><span class="blood-face">${avatarView(victim, escape)}</span><h2>${escape(victim.name)} was bitten in the night</h2><p>They were ${article(victim.role)}.</p></div>`
      : '<div class="blood-news" data-kind="safe"><h2>Everyone survived the night</h2><p>No one was bitten.</p></div>';
    const latest = you?.findings?.at(-1);
    const vision = latest && latest.night === party.night ? `<p class="blood-vision" data-vampire="${latest.vampire}" role="status">Your vision: <strong>${escape(latest.name)}</strong> is ${latest.vampire ? 'a VAMPIRE' : 'not a vampire'}.</p>` : '';
    body = `${head('Dawn breaks', '')}${news}${vision}${host ? seats(party, escape) : you ? roleCard(you, escape) : ''}${next('Start the day')}`;
  } else if (phase === 'day') {
    body = `${head('Who is a vampire?', host ? 'Talk it over out loud. Accuse, defend, bluff. Then the village votes.' : you?.alive === false ? 'You are out. Watch quietly: no hints.' : 'Talk it over out loud, then vote on your phone.')}
      ${seats(party, escape, { selfId: state.player?.id, mates: you?.mates })}${you ? roleCard(you, escape) : ''}${next('Open the vote')}`;
  } else if (phase === 'vote') {
    if (host) body = `${head('The village votes', 'Choose on your phone: banish a suspect, or abstain. A tie banishes nobody.')}${progress(party, 'votes in')}${seats(party, escape)}${next('Close the vote')}`;
    else if (!you?.alive) body = `${head('The village votes', you ? 'You are out, so you have no vote. Watch quietly.' : 'You are watching this game.')}`;
    else body = `${head(you.voted ? 'Vote locked' : 'Who should be banished?', you.voted ? 'Wait for the count on the TV.' : 'Pick one suspect, or abstain. A tie banishes nobody.')}
      ${seats(party, escape, { action: you.voted ? undefined : 'blood-vote', chosen: you.ballot, mates: you.mates, selfId: state.player?.id, pickable: seat => seat.id !== state.player?.id })}
      ${you.voted ? `<p class="blood-locked" role="status">${you.ballot === 'abstain' ? 'You abstained.' : 'Your vote is in.'}</p>` : '<div class="actions"><button type="button" class="button outline" data-action="blood-vote" data-id="abstain">Abstain</button></div>'}${next('Close the vote')}`;
  } else if (phase === 'verdict') {
    const verdict = party.verdict ?? { tally: [] };
    const top = Math.max(1, ...verdict.tally.map(row => row.votes));
    const out = verdict.banished;
    const news = out
      ? `<div class="blood-news" data-kind="${out.role === 'vampire' ? 'caught' : 'wrong'}"><span class="blood-face">${avatarView(out, escape)}</span><h2>${escape(out.name)} is banished</h2><p>They were ${article(out.role)}${out.role === 'vampire' ? '!' : '.'}</p></div>`
      : `<div class="blood-news" data-kind="safe"><h2>Nobody is banished</h2><p>${verdict.tied ? 'The vote was tied.' : 'Nobody was voted for.'}</p></div>`;
    body = `${head('The verdict', '')}${news}
      <ol class="blood-tally">${verdict.tally.map(row => `<li><span class="blood-face">${avatarView(row, escape)}</span><strong>${escape(row.name)}</strong>
        <span class="blood-bar"><i style="width:${Math.round(100 * row.votes / top)}%"></i></span><b>${plural(row.votes, 'vote')}</b></li>`).join('')}
        ${verdict.abstained ? `<li class="blood-abstained"><strong>Abstained</strong><b>${verdict.abstained}</b></li>` : ''}</ol>${next('Continue')}`;
  }
  return `<section class="game-panel blood-game" data-blood="${phase}"${you ? ` data-alive="${you.alive}"` : ''}>${body}</section>`;
}
