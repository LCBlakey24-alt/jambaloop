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

/**
 * The list of players on a phone. It looks the same on every role's phone: no
 * role tags, no partner's pick, no barred seat and no highlight of tonight's
 * choice. Anything only one role should know sits inside the role card.
 */
function seats(party, escape, { pickable, action, chosen, selfId } = {}) {
  return `<ul class="blood-seats${pickable ? ' is-picking' : ''}">${party.seats.map(seat => {
    const out = !seat.alive;
    const blocked = out || (pickable && pickable(seat) === false);
    const tags = [
      out && seat.role ? `<b class="blood-tag" data-role="${seat.role}">${roleNames[seat.role]}</b>` : '',
      out ? `<small>${seat.how === 'bitten' ? 'Bitten' : 'Banished'}</small>` : '',
      seat.id === selfId ? '<small>You</small>' : '',
    ].join('');
    const inner = `<span class="blood-face">${avatarView(seat, escape)}</span><span class="blood-seat-name">${escape(seat.name)}</span>${tags}`;
    const state = `${out ? ' data-out' : ''}${chosen && seat.id === chosen ? ' data-chosen' : ''}${seat.connected === false && !out ? ' data-away' : ''}`;
    return action && !blocked
      ? `<li${state}><button type="button" class="blood-seat" data-action="${action}" data-id="${escape(seat.id)}" aria-pressed="${seat.id === chosen}">${inner}</button></li>`
      : `<li${state}><span class="blood-seat">${inner}</span></li>`;
  }).join('')}</ul>`;
}

const kicon = name => `<i class="k-icon" style="--icon:url(/icons/kenney/${name}.svg)" aria-hidden="true"></i>`;
// Renders of Kenney Graveyard Kit models (CC0), made by scripts/render-model-sprites.mjs.
const graves = ['gravestone-round', 'gravestone-cross', 'gravestone-bevel', 'gravestone-decorative'];
const talkingPoints = [
  'Who has been very quiet?', 'Who changed their story?', 'Who is steering the vote?', 'Who seems far too relaxed?',
  'Who accused first, and why?', 'Who has not been suspected yet?',
];

/**
 * The TV's village: everyone sits round the fire. A house is a player still in;
 * a skull marks one who has fallen, with the role they turned out to be. It
 * shows only what is already public.
 */
// The village is drawn from renders of Kenney's Hexagon Kit (the houses), Graveyard Kit (the props, coffin and
// gravestones) and Particle Pack (the flames), all CC0. A seat's house is chosen by seat number, never by role, and
// a fallen player's marker shows only how they fell, which everyone already knows.
const sprite = (name, css) => `<img class="${css}" src="/models/sprites/${name}.webp" alt="">`;
const home = (seat, index) => !seat.alive
  ? (seat.how === 'bitten' ? sprite('coffin', 'blood-grave blood-coffin') : sprite(graves[index % graves.length], 'blood-grave'))
  : sprite(index % 3 === 2 ? 'unit-mansion' : 'unit-house', 'blood-house');
// Pines and the old crypt stand in the corners, clear of every seat; lanterns flank the fire.
const scenery = `<div class="blood-scenery" aria-hidden="true">${sprite('pine', 'blood-prop is-nw')}${sprite('pine-crooked', 'blood-prop is-ne')}
  ${sprite('crypt', 'blood-prop is-sw')}${sprite('pine', 'blood-prop is-se')}</div>`;
const campfire = `<span class="blood-fire" aria-hidden="true">${sprite('blood-glow', 'blood-fire-glow')}${sprite('lantern-glass', 'blood-lantern is-left')}
  ${sprite('fire-basket', 'blood-fire-basket')}${sprite('blood-flame-a', 'blood-flame is-a')}${sprite('blood-flame-b', 'blood-flame is-b')}${sprite('lantern-glass', 'blood-lantern is-right')}</span>`;

function village(party, escape, centre) {
  const count = party.seats.length;
  const homes = party.seats.map((seat, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const out = !seat.alive;
    return `<li style="left:${(50 + 43 * Math.cos(angle)).toFixed(2)}%;top:${(50 + 39 * Math.sin(angle)).toFixed(2)}%"${out ? ' data-out' : ''}${seat.connected === false && !out ? ' data-away' : ''}>
      <span class="blood-home">${home(seat, index)}<span class="blood-face">${avatarView(seat, escape)}</span></span>
      <strong>${escape(seat.name)}</strong>${out && seat.role ? `<b class="blood-tag" data-role="${seat.role}">${roleNames[seat.role]}</b>` : ''}</li>`;
  }).join('');
  return `<div class="blood-village" data-size="${count > 10 ? 'large' : count > 7 ? 'medium' : 'small'}">${scenery}<ul>${homes}</ul>
    <div class="blood-green">${campfire}${centre ?? ''}</div></div>`;
}

/** What the whole room already knows, kept in view: who is left and how each player fell. */
function chronicle(party, escape) {
  const fallen = party.seats.filter(seat => !seat.alive).sort((a, b) => (b.fellOrder ?? 0) - (a.fellOrder ?? 0)); // newest first, so the latest news is always in view
  const events = fallen.map(seat => `<li data-how="${seat.how}">${kicon(seat.how === 'bitten' ? 'fire' : 'flag-triangle')}<span><small>${seat.how === 'bitten' ? 'Night' : 'Day'} ${seat.fellNight ?? ''}</small>
    <strong>${escape(seat.name)}</strong> ${seat.how === 'bitten' ? 'was bitten' : 'was banished'}${seat.role ? ` · <b class="blood-tag" data-role="${seat.role}">${roleNames[seat.role]}</b>` : ''}</span></li>`).join('');
  return `<aside class="blood-chronicle" aria-label="The story so far">
    <div class="blood-stats"><div data-kind="vampires"><img class="blood-vampire" src="/models/sprites/character-vampire.webp" alt=""><strong>${party.hiding ?? party.counts.vampire}</strong><span>${(party.hiding ?? party.counts.vampire) === 1 ? 'vampire' : 'vampires'} still hiding</span></div>
      <div data-kind="village">${sprite('unit-house', 'blood-count-house')}<strong>${party.aliveCount}</strong><span>still in the village</span></div></div>
    <h2>The story so far</h2>
    ${events ? `<ol>${events}</ol>` : '<p class="blood-quiet">Nobody has fallen yet.</p>'}</aside>`;
}

const tvStage = (party, escape, centre) => `<div class="blood-stage">${village(party, escape, centre)}${chronicle(party, escape)}</div>`;

const progress = (party, label) => party.expected ? `<p class="blood-progress" role="status"><strong>${party.done} / ${party.expected}</strong><span>${label}</span></p>` : '';
const clock = state => state.ends ? '<div class="blood-timer"><small>TIME LEFT</small><span id="timer" class="timer"></span></div>' : '';

/**
 * Tonight's private notes, shown only inside the role card: what this role's
 * tap does, what it picked, and (for vampires) what their partners picked.
 */
function tonight(you, escape, party, selfId) {
  const name = id => `<strong>${escape(party.seats.find(seat => seat.id === id)?.name ?? 'someone')}</strong>`;
  const button = (id, label) => `<button type="button" class="button outline small" data-action="blood-pick" data-id="${escape(id)}">${label}</button>`;
  let notes = '';
  if (you.role === 'vampire') {
    const partners = you.mates.filter(mate => mate.alive);
    const theirs = partners.map(mate => `<li><strong>${escape(mate.name)}</strong> ${mate.pick ? `wants to bite ${name(mate.pick)}` : 'has not chosen yet'}</li>`).join('');
    const others = you.pick ? party.seats.filter(seat => seat.alive && seat.id !== selfId && seat.id !== you.pick && !you.mates.some(mate => mate.id === seat.id)) : [];
    notes = `<p>${you.pick ? `You want to bite ${name(you.pick)}.` : 'Tap the villager you want to bite.'}${partners.length ? ' Agree on one victim with your partner: a split means nobody is bitten.' : ''}</p>
      ${theirs ? `<ul class="blood-partner-picks">${theirs}</ul>` : ''}
      ${others.length ? `<p>You can change your mind until the night ends:</p><div class="blood-repick">${others.map(seat => button(seat.id, `Bite ${escape(seat.name)}`)).join('')}</div>` : ''}`;
  } else if (you.role === 'oracle') {
    notes = `<p>${you.pick ? `You are checking ${name(you.pick)}.` : 'Tap the player you want to check.'} At dawn you learn whether they are a vampire.</p>`;
  } else if (you.role === 'warden') {
    const self = you.pick === selfId;
    notes = `<p>${you.pick ? `You are guarding ${self ? 'yourself' : name(you.pick)}.` : 'Tap the player you want to guard.'} The vampires cannot bite them tonight.</p>
      ${you.barred ? `<p>You guarded ${you.barred === selfId ? 'yourself' : name(you.barred)} last night, so choose someone else tonight.</p>` : ''}
      ${!you.pick && you.barred !== selfId ? `<div class="blood-repick">${button(selfId, 'Guard yourself')}</div>` : ''}`;
  } else {
    notes = `<p>${you.pick ? `Your hunch tonight: ${name(you.pick)}.` : 'Tap the player you suspect most.'} It is a private note to yourself; everyone taps at night, so nobody stands out.</p>`;
  }
  return `<div class="blood-tonight"><h3>Tonight</h3>${notes}</div>`;
}

/**
 * The role card. It is always closed when a screen first appears, and closed
 * it looks the same for every role; the player taps it to peek.
 */
function roleCard(you, escape, { party, phase, selfId } = {}) {
  const mates = you.mates?.length ? `<p class="blood-mates">Your fellow ${you.mates.length === 1 ? 'vampire' : 'vampires'}: <strong>${you.mates.map(mate => escape(mate.name)).join(', ')}</strong></p>` : '';
  const findings = you.findings?.length ? `<ul class="blood-findings">${you.findings.map(found =>
    `<li data-vampire="${found.vampire}"${phase === 'dawn' && found.night === party?.night ? ' data-new' : ''}>Night ${found.night}: <strong>${escape(found.name)}</strong> is ${found.vampire ? 'a VAMPIRE' : 'not a vampire'}</li>`).join('')}</ul>` : '';
  const notes = phase === 'night' && you.alive && party ? tonight(you, escape, party, selfId) : '';
  return `<details class="blood-role-card" data-role="${you.role}">
    <summary><span>Your secret role</span><em><span class="blood-peek">Tap to peek</span><span class="blood-hide">Tap to hide</span></em></summary>
    <div class="blood-role-body">${roleIcon(you.role)}<h2>${you.name}</h2><p>${you.brief}</p>${mates}${notes}${findings}</div></details>`;
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
  const selfId = state.player?.id;
  // Every phone's role card, closed; only what is inside it differs between roles.
  const card = you ? roleCard(you, escape, { party, phase, selfId }) : '';
  let body = '';

  if (phase === 'roles') {
    body = host
      ? `${head('Check your phone for your secret role', `Hiding in this room: ${mix}. Keep your screen to yourself.`)}${tvStage(party, escape, progress(party, 'players ready'))}${next('Start the first night')}`
      : you ? `${head('Roles are dealt', 'Keep yours to yourself: tap the card to peek, then tap I’m ready.')}${card}
          ${you.ready ? '<p class="blood-locked" role="status">Ready. Night falls when everyone is in.</p>' : '<div class="actions"><button type="button" class="button primary" data-action="blood-ready">I’m ready</button></div>'}${next('Start the first night')}`
        : `${head('Roles are being dealt', 'You joined after the deal, so watch this one and play the next.')}`;
  } else if (phase === 'night') {
    if (host) body = `${head('Night falls on the village', 'Everyone: eyes on your own phone and make your choice.')}${tvStage(party, escape, progress(party, 'choices made'))}${next('End the night')}`;
    else if (!you) body = `${head('Night falls', 'You are watching this game.')}${moon}`;
    else if (!you.alive) body = `${head('Night falls', 'You are out of the game. Watch quietly: no hints.')}${moon}`;
    else {
      // One heading, one line, one list and one message for every role, so a glance at a neighbour's
      // phone gives nothing away. Each role's own instructions and picks are inside the role card.
      body = `${head('Make your night choice', 'Everyone taps a player. Peek at your role card to see what your tap does.')}${card}
        ${seats(party, escape, { action: you.pick ? undefined : 'blood-pick', selfId, pickable: seat => seat.id !== selfId })}
        ${you.pick ? '<p class="blood-locked" role="status">Choice made. Eyes down until dawn.</p>' : ''}${next('End the night')}`;
    }
  } else if (phase === 'dawn') {
    const victim = party.dawn?.victim;
    const news = victim
      ? `<div class="blood-news" data-kind="bitten"><span class="blood-face">${avatarView(victim, escape)}</span><h2>${escape(victim.name)} was bitten in the night</h2><p>They were ${article(victim.role)}.</p></div>`
      : '<div class="blood-news" data-kind="safe"><h2>Everyone survived the night</h2><p>No one was bitten.</p></div>';
    // The Oracle's vision is in the role card with the rest of their findings, never on the open screen.
    body = host ? `${head('Dawn breaks', '')}${tvStage(party, escape, news)}${next('Start the day')}`
      : `${head('Dawn breaks', you ? 'Anything only you should know is on your role card.' : '')}${news}${card}${next('Start the day')}`;
  } else if (phase === 'day') {
    body = `${head('Who is a vampire?', host ? 'Talk it over out loud. Accuse, defend, bluff. Then the village votes.' : you?.alive === false ? 'You are out. Watch quietly: no hints.' : 'Talk it over out loud, then vote on your phone.')}
      ${host ? tvStage(party, escape, `<p class="blood-talk">${talkingPoints[(party.night - 1) % talkingPoints.length]}</p>`) : seats(party, escape, { selfId })}${card}${next('Open the vote')}`;
  } else if (phase === 'vote') {
    if (host) body = `${head('The village votes', 'Choose on your phone: banish a suspect, or abstain. A tie banishes nobody.')}${tvStage(party, escape, progress(party, 'votes in'))}${next('Close the vote')}`;
    else if (!you?.alive) body = `${head('The village votes', you ? 'You are out, so you have no vote. Watch quietly.' : 'You are watching this game.')}`;
    else body = `${head(you.voted ? 'Vote locked' : 'Who should be banished?', you.voted ? 'Wait for the count on the TV.' : 'Pick one suspect, or abstain. A tie banishes nobody.')}
      ${seats(party, escape, { action: you.voted ? undefined : 'blood-vote', chosen: you.ballot, selfId, pickable: seat => seat.id !== selfId })}
      ${you.voted ? `<p class="blood-locked" role="status">${you.ballot === 'abstain' ? 'You abstained.' : 'Your vote is in.'}</p>` : '<div class="actions"><button type="button" class="button outline" data-action="blood-vote" data-id="abstain">Abstain</button></div>'}${card}${next('Close the vote')}`;
  } else if (phase === 'verdict') {
    const verdict = party.verdict ?? { tally: [] };
    const top = Math.max(1, ...verdict.tally.map(row => row.votes));
    const out = verdict.banished;
    const news = out
      ? `<div class="blood-news" data-kind="${out.role === 'vampire' ? 'caught' : 'wrong'}">${sprite(out.role === 'vampire' ? 'character-vampire' : 'gravestone-round', 'blood-verdict-figure')}<span class="blood-face">${avatarView(out, escape)}</span><h2>${escape(out.name)} is banished</h2><p>They were ${article(out.role)}${out.role === 'vampire' ? '!' : '.'}</p></div>`
      : `<div class="blood-news" data-kind="safe"><h2>Nobody is banished</h2><p>${verdict.tied ? 'The vote was tied.' : 'Nobody was voted for.'}</p></div>`;
    body = `${head('The verdict', '')}${news}
      <ol class="blood-tally">${verdict.tally.map(row => `<li><span class="blood-face">${avatarView(row, escape)}</span><strong>${escape(row.name)}</strong>
        <span class="blood-bar"><i style="width:${Math.round(100 * row.votes / top)}%"></i></span><b>${plural(row.votes, 'vote')}</b></li>`).join('')}
        ${verdict.abstained ? `<li class="blood-abstained"><strong>Abstained</strong><b>${verdict.abstained}</b></li>` : ''}</ol>${next('Continue')}`;
  }
  return `<section class="game-panel blood-game" data-blood="${phase}"${you ? ` data-alive="${you.alive}"` : ''}>${body}</section>`;
}
