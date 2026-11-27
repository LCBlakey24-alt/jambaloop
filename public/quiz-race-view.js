import {raceTrackMarkup} from './quiz-race-track.js';
import { face } from './player-face.js';
const name = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = (distance, total) => Math.min(100, Math.round(100 * distance / Math.max(total,1)));

export function quizRaceView(s, {host,canControl,icons,replayButtons,sending}) {
  const r = s.race;
  const intro = s.phase === 'race-countdown';
  const finished = s.phase === 'finished';
  const leader = r.racers[0];
  const teamRace = s.playStyle === 'teams' && s.raceTeams?.length;
  const raceTeams = teamRace ? `<div class="race-team-strip" aria-label="Team race standings">${s.raceTeams.map((team,index)=>
    `<div style="--racer:${team.color}"><b>#${index+1} Team ${name(team.name)}</b><span>${percent(team.distance,r.length)}%</span></div>`).join('')}</div>` : '';
  const winningTeam = teamRace && s.teamWinners?.length === 1
    ? s.teams.find(team=>team.id===s.teamWinners[0]) : undefined;
  const track = () => `<div class="race-track-wrap" data-track="${r.track}">${raceTrackMarkup()}
    <div class="quiz-race-standings">${r.racers.map(p=>`<div class="race-rank-row" data-race-rank="${p.id}" style="--racer:${p.color}"><span class="race-position">${p.position}</span><span class="race-rank-name">${face(p)}${name(p.name)}<i class="race-rank-status" aria-hidden="true"></i></span><span class="race-rank-percent">${percent(p.distance,r.length)}%</span><span class="race-mini-track"><i style="width:${percent(p.distance,r.length)}%"></i></span></div>`).join('')}</div></div>`;
  // League: three races, points for every place. The table comes from the server.
  const league = s.league;
  const circuitName = { short: 'short', medium: 'figure-of-eight', long: 'long' };
  const leagueRows = () => `<div class="race-results race-league" aria-label="League table">${league.table.map(row => {
    const racer = r.racers.find(p => p.id === row.id);
    return `<div style="--racer:${racer?.color ?? '#fff'}"><strong>#${row.position} · ${racer ? face(racer) : ''}${name(row.name)}</strong><span>${row.gained ? `<em>+${row.gained}</em> ` : ''}${row.points} pts</span></div>`;
  }).join('')}</div>`;
  if (league && (finished || s.phase === 'race-standings')) {
    const over = finished;
    const champion = league.table[0];
    const mine = league.table.find(row => row.id === s.player?.id);
    const nextButton = canControl && !over ? `<button class="button primary" data-action="advance">Start race ${league.round + 1} ${icons('play')}</button>` : '';
    const heading = over ? `${name(champion?.name)} wins the league!` : `${name(leader?.name)} wins race ${league.round}!`;
    const eyebrow = over ? 'CHEQUERED FLAG · LEAGUE CHAMPION' : `LEAGUE · RACE ${league.round} OF ${league.races} DONE`;
    if (!host) return `<section class="game-panel race-phone race-phone-finish" aria-label="Your league position">
      <div class="eyebrow">${eyebrow}</div>
      <h1>${over ? (mine?.position === 1 ? 'You won the league!' : 'League complete!') : `Race ${league.round} done`}</h1>
      <div class="race-personal-finish"><span>YOUR LEAGUE POSITION</span>
        <strong>#${mine?.position ?? '-'} <small>of ${league.table.length}</small></strong>
        <span>${mine ? `${mine.points} points${mine.gained ? ` · +${mine.gained} that race` : ''}` : 'Watching this league'}</span></div>
      <p>${over ? 'See the final table on the TV.' : `Next: the ${circuitName[league.next]} circuit. Nudges and boosts are topped up for every race.`}</p>
      <details class="race-phone-results"><summary>View the league table without a TV</summary>${leagueRows()}</details>
      <div class="actions">${over ? (canControl ? replayButtons(s,icons) : '<button class="button outline" data-action="leave">Back to home</button>') : nextButton}</div>
    </section>`;
    return `<section class="game-panel race-finish-panel race-league-panel"><div class="eyebrow">${eyebrow}</div><h1>${heading}</h1>
      <p>${over ? `Three races, one table. ${name(leader?.name)} took the last race.` : `Points for every place: 10, 8, 6, 5, 4, 3, 2, then 1. Next up: the ${circuitName[league.next]} circuit.`}</p>
      ${leagueRows()}
      <div class="actions">${over ? (canControl ? replayButtons(s,icons) : '<button class="button outline" data-action="leave">Back to home</button>') : nextButton}</div></section>`;
  }
  if (finished && !host) {
    const personal = r.racers.find(p => p.id === s.player?.id);
    const placing = personal?.position;
    const won = placing === 1;
    const teamWon = teamRace && s.teamWinners?.includes(s.player?.team);
    const result = personal?.finishedAt === undefined
      ? (personal ? percent(personal.distance,r.length)+'% completed' : 'Race complete')
      : ((personal.finishedAt - 3000)/1000).toFixed(2)+'s finish';
    return `<section class="game-panel race-phone race-phone-finish" aria-label="Your Quiz Race result">
      <div class="eyebrow">CHEQUERED FLAG · QUIZ RACE</div>
      <h1>${teamRace ? teamWon ? 'Your team wins!' : 'Race complete!' : won ? 'You won!' : 'Race complete!'}</h1>
      <div class="race-personal-finish"><span>YOUR POSITION</span>
        <strong>#${placing ?? '-'} <small>of ${s.playerCount}</small></strong>
        <span>${name(result)}</span></div>
      <p>See the full leaderboard on the TV.</p>
      <details class="race-phone-results"><summary>View full results without a TV</summary>
        <ol>${r.racers.map(p=>`<li><strong>#${p.position} ${face(p)}${name(p.name)}</strong><span>${p.finishedAt===undefined?percent(p.distance,r.length)+'%':((p.finishedAt-3000)/1000).toFixed(2)+'s'}</span></li>`).join('')}</ol>
      </details>
      <div class="actions">${canControl ? replayButtons(s,icons) : '<button class="button outline" data-action="leave">Back to home</button>'}</div>
    </section>`;
  }
  if(finished) return `<section class="game-panel race-finish-panel"><div class="eyebrow">CHEQUERED FLAG</div><h1>${winningTeam ? 'Team ' + name(winningTeam.name) + ' wins Quiz Race!' : name(leader?.name) + ' wins Quiz Race!'}</h1>
    <p>${winningTeam ? name(leader?.name) + ' crossed first to win it for their team.' : 'First across the finish line wins.'} Final order comes from the server, not the animation.</p>
    ${track()}${raceTeams}<div class="race-results">${r.racers.map(p=>`<div><strong>#${p.position} · ${face(p)}${name(p.name)}</strong><span>${p.finishedAt === undefined ? percent(p.distance,r.length)+'% completed' : ((p.finishedAt - 3000)/1000).toFixed(2)+'s'}</span></div>`).join('')}</div>
    <div class="actions">${canControl? replayButtons(s,icons):'<button class="button outline" data-action="leave">Back to home</button>'}</div></section>`;
  if (host) return `<section class="game-panel race-broadcast" aria-label="Quiz Race broadcast"><div class="race-broadcast-head"><div><div class="eyebrow">QUIZ RACE · ${league ? `LEAGUE RACE ${league.round + 1} OF ${league.races}` : name(s.categoryName||'GENERAL KNOWLEDGE')}</div><h1>${intro?'Get ready to race!':'Race to the finish!'}</h1></div><div class="race-broadcast-time"><strong data-race-clock>0:00</strong><span>RACE TIME</span></div></div>
    ${intro?'<div class="race-countdown" data-race-countdown aria-live="polite">3</div>':''}
    ${track()}${raceTeams}<div class="race-broadcast-foot"><p>Answer questions on your phone to accelerate. Wrong answers slow you down.</p>
    ${canControl?`<button class="button outline small" data-action="clock">${s.pausedAt?'Resume race':'Pause race'}</button>`:''}</div></section>`;
  const own = r.own;
  const player = r.racers.find(p=>p.id===s.player?.id);
  const q=own?.question;
  const feedback=own?.feedback;
  return `<section class="game-panel race-phone"><div class="race-phone-head"><div><div class="eyebrow">QUIZ RACE</div><strong data-race-position>${own?.position??'-'} / ${s.playerCount}</strong></div><div class="race-phone-speed" data-race-speed>READY</div></div>
    ${teamRace ? `<p class="race-team-label">Your team: ${name(s.teams.find(t=>t.id===s.player?.team)?.name || 'Unassigned')}</p>` : ''}
    <div class="race-phone-progress" aria-label="Race progress"><i data-race-progress style="width:${percent(own?.distance||0,r.length)}%;background:${player?.color||'#1dd9be'}"></i></div>
    ${intro?'<div class="race-phone-intro"><h1>Ready, set…</h1><p>Quick, correct answers give you a bigger boost.</p><strong data-race-countdown>3</strong></div>':s.pausedAt?'<div class="race-phone-intro"><h1>Race paused</h1><p>Waiting for the host or captain to resume.</p></div>':q?`<div class="race-question" data-question-id="${q.id}"><div class="race-question-label"><span>QUESTION ${q.id}</span><span data-race-deadline>12s</span></div><h2>${name(q.prompt)}</h2><div class="race-options">${q.options.map((opt,index)=>`<button class="race-answer" data-action="race-answer" data-race-option="${index}" ${sending?'disabled':''}><span>${'ABCD'[index]}</span>${name(opt)}</button>`).join('')}</div><button class="button outline race-pass" data-action="race-pass" ${sending?'disabled':''}>Pass question · small slowdown</button></div>`:`<div class="race-phone-intro"><h2>${feedback?.outcome==='correct'?'Correct! Speed boost!':feedback?.outcome==='wrong'?'Not quite — slowing down':feedback?.outcome==='timeout'?'Time is up!':feedback?.outcome==='pass'?'Question passed':'Next question coming…'}</h2><p>${feedback?.answer?'Correct answer: '+name(feedback.answer):'Keep racing!'}</p></div>`}
    ${intro?'':`<div class="race-powers" data-race-powers><button type="button" class="race-power is-boost" data-action="race-power" data-kind="boost"><b>🚀 Boost</b><small data-power-note></small></button>
      <button type="button" class="race-power is-ram" data-action="race-power" data-kind="ram"><b>💥 Nudge</b><small data-power-note></small></button>
      <button type="button" class="race-power is-shield" data-action="race-power" data-kind="shield"><b>🛡 Shield</b><small data-power-note></small></button></div>
      <p class="race-power-alert" data-race-alert role="status"></p>`}
    <div class="race-phone-foot"><div><small>YOUR PROGRESS</small><strong data-race-progress-text>${percent(own?.distance||0,r.length)}%</strong></div><div><small>CURRENT SPEED</small><strong data-race-speed-value>${player?.speed?.toFixed(2)||'1.00'}×</strong></div></div>
    ${s.isCaptain?`<button class="button outline small" data-action="clock">${s.pausedAt?'Resume race':'Pause race'}</button>`:''}</section>`;
}

/** Keep the phone's power-up buttons live without re-rendering the question. */
export function updateRacePowers(root, state) {
  const bar = root.querySelector('[data-race-powers]');
  const own = state.race?.own;
  if (!bar || !own) return;
  const live = state.phase === 'race' && !state.pausedAt && !state.race.finished;
  const set = (kind, enabled, note) => {
    const button = bar.querySelector(`[data-kind="${kind}"]`);
    button.disabled = !enabled || button.dataset.sending === '1';
    button.querySelector('[data-power-note]').textContent = note;
  };
  const toTurbo = 3 - (own.streak ?? 0) % 3;
  set('boost', live && own.boosts > 0 && !own.armed, own.armed ? 'ARMED · get the next one right!' : own.boosts > 0 ? `Tap, then answer right · ${own.boosts} left` : `${toTurbo} right in a row earns one`);
  bar.querySelector('[data-kind="boost"]').toggleAttribute('data-armed', Boolean(own.armed));
  set('shield', live && own.shields > 0 && !own.shieldLeft, own.shieldLeft ? `Up · ${Math.ceil(own.shieldLeft / 1000)}s` : own.shields > 0 ? 'Blocks nudges for 6s' : 'Used');
  // A nudge can always be thrown while you have one: at nobody, it is wasted.
  set('ram', live && own.rams > 0, own.rams < 1 ? 'None left' : own.ramTarget ? `${own.ramTarget} is alongside · ${own.rams} left` : `Nobody alongside · ${own.rams} left`);
  bar.querySelector('[data-kind="ram"]').toggleAttribute('data-target', Boolean(own.ramTarget));
  const alert = root.querySelector('[data-race-alert]');
  const text = own.rammedBy ? `💥 Nudged by ${own.rammedBy}!` : own.blocked ? `🛡 Your shield stopped ${own.blocked}!` : own.missed ? '💨 Nobody there. Nudge wasted.' : own.fizzled ? '💨 Boost wasted: that answer was not right.'
    : own.turboEarned ? '🚀 Three in a row: boost earned!' : own.onFire ? `🔥 On fire! ${own.streak} in a row` : own.sprint ? '🏁 Final sprint: right answers count extra!' : '';
  if (alert && alert.textContent !== text) alert.textContent = text;
  root.querySelector('.race-phone')?.toggleAttribute('data-rammed', Boolean(own.rammedBy));
}
