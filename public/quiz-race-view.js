import {raceTrackMarkup} from './quiz-race-track.js';
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
    <div class="quiz-race-standings">${r.racers.map(p=>`<div class="race-rank-row" data-race-rank="${p.id}" style="--racer:${p.color}"><span class="race-position">${p.position}</span><span class="race-rank-name">${name(p.name)}</span><span class="race-rank-percent">${percent(p.distance,r.length)}%</span><span class="race-mini-track"><i style="width:${percent(p.distance,r.length)}%"></i></span></div>`).join('')}</div></div>`;
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
        <ol>${r.racers.map(p=>`<li><strong>#${p.position} ${name(p.name)}</strong><span>${p.finishedAt===undefined?percent(p.distance,r.length)+'%':((p.finishedAt-3000)/1000).toFixed(2)+'s'}</span></li>`).join('')}</ol>
      </details>
      <div class="actions">${canControl ? replayButtons(s,icons) : '<button class="button outline" data-action="leave">Back to home</button>'}</div>
    </section>`;
  }
  if(finished) return `<section class="game-panel race-finish-panel"><div class="eyebrow">CHEQUERED FLAG</div><h1>${winningTeam ? 'Team ' + name(winningTeam.name) + ' wins Quiz Race!' : name(leader?.name) + ' wins Quiz Race!'}</h1>
    <p>${winningTeam ? name(leader?.name) + ' crossed first to win it for their team.' : 'First across the finish line wins.'} Final order comes from the server, not the animation.</p>
    ${track()}${raceTeams}<div class="race-results">${r.racers.map(p=>`<div><strong>#${p.position} · ${name(p.name)}</strong><span>${p.finishedAt === undefined ? percent(p.distance,r.length)+'% completed' : ((p.finishedAt - 3000)/1000).toFixed(2)+'s'}</span></div>`).join('')}</div>
    <div class="actions">${canControl? replayButtons(s,icons):'<button class="button outline" data-action="leave">Back to home</button>'}</div></section>`;
  if (host) return `<section class="game-panel race-broadcast" aria-label="Quiz Race broadcast"><div class="race-broadcast-head"><div><div class="eyebrow">QUIZ RACE · ${name(s.categoryName||'GENERAL KNOWLEDGE')}</div><h1>${intro?'Get ready to race!':'Race to the finish!'}</h1></div><div class="race-broadcast-time"><strong data-race-clock>0:00</strong><span>RACE TIME</span></div></div>
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
      <button type="button" class="race-power is-ram" data-action="race-power" data-kind="ram"><b>💥 Ram</b><small data-power-note></small></button></div>
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
  set('boost', live && own.boosts > 0, own.boosts > 0 ? 'Once per race' : 'Used');
  set('ram', live && own.rams > 0 && Boolean(own.ramTarget), own.rams < 1 ? 'None left' : own.ramTarget ? `Hit ${own.ramTarget} · ${own.rams} left` : `Nobody in range · ${own.rams} left`);
  const alert = root.querySelector('[data-race-alert]');
  const text = own.rammedBy ? `💥 Rammed by ${own.rammedBy}!` : '';
  if (alert && alert.textContent !== text) alert.textContent = text;
  root.querySelector('.race-phone')?.toggleAttribute('data-rammed', Boolean(own.rammedBy));
}
