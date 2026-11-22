// TV/phone presenter for original Jambaloop Fork in the Tracks.
// Sentence fragments are predefined noun phrases and always fit the shared structure.
import {forkStages} from './fork-cards.js';

const stages=['DEFEND YOUR TRACK','SABOTAGE THEIR TRACK','ONE LAST DEFENCE'];
const slotNames=['GOOD CARD','SABOTAGE CARD','GOOD CARD'];
const trackLetters=['A','B'];

function trackBoard(state, escape) {
  return `<div class="fork-tracks" aria-label="Two trolley tracks">${state.teams.map((team,index)=>{
    const cards=state.party.placements[index];
    const cells=cards.map((card,slot)=>`<span class="fork-tile ${card?'filled':'empty'} ${slot===1?'sabotage':'protect'}"
      aria-label="${slotNames[slot]}: ${card?escape(card):'awaiting placement'}">
      <small>${slotNames[slot]}</small><strong>${card?escape(card):'Waiting for card'}</strong></span>`);
    return `<article class="fork-track" style="--fork-team:${team.color}">
      <header><span class="fork-rail-icon" aria-hidden="true">⤳</span><strong>TRACK ${trackLetters[index]}</strong>
        <span>TEAM ${escape(team.name)}</span></header>
      <p class="fork-track-sentence">If the trolley takes Track ${trackLetters[index]}, it will hit ${cells[0]}, ${cells[1]}, and ${cells[2]}.</p>
      <footer><span>${cards.filter(Boolean).length}/3 cards placed</span>
        ${state.party.hit===index?'<b class="fork-hit">TROLLEY HIT THIS TRACK</b>':''}
        ${state.party.saved===index?'<b class="fork-saved">TRACK SPARED</b>':''}</footer>
    </article>`;
  }).join('')}</div>`;
}

function scores(state, escape) {
  return `<div class="fork-score-strip" aria-label="Team points">${state.teams.map(team=>
    `<div style="--fork-team:${team.color}"><span>TEAM ${escape(team.name)}</span><strong>${team.score} ${team.score===1?'POINT':'POINTS'}</strong></div>`).join('')}</div>`;
}

export function forkView(state, {host,escape,icons,replayButtons}) {
  const party=state.party;
  if(!party || party.type!=='fork')return '';
  const phase=state.phase;
  const finished=phase==='finished';
  const building=phase==='party-build';
  const judge=phase==='party-judge';
  const reveal=phase==='party-reveal';
  const step=party.step;
  const title=finished?'THE FINAL VERDICT':judge?'JUDGE: MAKE YOUR CHOICE':reveal?'THE TROLLEY HAS SPOKEN':stages[step];
  const scene=escape(party.scene);
  const yourTeam=state.teams.find(team=>team.id===party.team);
  const destination=step===1 ? party.team===0?1:0 : party.team;
  const prompt=building && !host && yourTeam
    ? step===1 ? `TEAM ${escape(yourTeam.name)}: sabotage Track ${trackLetters[destination]}`
      : `TEAM ${escape(yourTeam.name)}: defend Track ${trackLetters[destination]}`
    : '';
  const progress=building ? `<div class="fork-vote-status" role="status">${party.submissions} of ${party.responseTarget} players selected a card. ${host?'Each team decides by majority vote.':''}</div>` : '';
  const controls=building ? host
      ? `<div class="fork-controls"><button class="button primary" data-action="advance">Lock placements and continue ${icons('arrow-right')}</button><small>Or wait for both teams to finish voting.</small></div>`
      : party.voted ? '<p class="fork-locked" role="status">Your card is locked in. Waiting for your teammates.</p>'
      : `<section class="fork-hand" aria-label="Choose a card"><h2>${escape(forkStages[step].title)}</h2>
         <p>${escape(forkStages[step].prompt)} Your team’s most popular choice will be placed.</p>
         <div class="fork-hand-options">${(party.hand??[]).map((card,index)=>
           `<button type="button" class="fork-card-pick ${step===1?'bad':'good'}" data-action="fork-card" data-fork-step="${step}" data-option="${index}"><small>CARD ${index+1}</small><span>${escape(card)}</span></button>`).join('')}</div></section>`
    : judge ? host
      ? `<section class="fork-controls fork-judge-controls"><h2>Which track should the trolley hit?</h2>
        <p>Pick the most ridiculous track to hit. The other team saves its track and wins one point.</p>
        <div class="fork-choice-buttons">${state.teams.map((team,index)=>
          `<button type="button" class="fork-judge-choice" data-action="fork-judge" data-track="${index}" style="--fork-team:${team.color}">
          <b>HIT TRACK ${trackLetters[index]}</b><small>Spare Team ${escape(state.teams[1-index].name)}</small></button>`).join('')}</div></section>`
      : '<p class="fork-locked">The judge is deciding which track the trolley hits.</p>'
    : reveal ? `<section class="fork-outcome" role="status"><h2>Track ${trackLetters[party.hit]} gets hit!</h2>
        <p>Team <strong>${escape(state.teams[party.saved].name)}</strong> saves its track and earns a point.</p>
        ${host ? `<button type="button" class="button primary" data-action="advance">${state.index+1<state.total?'Next round':'Final results'} ${icons('arrow-right')}</button>` : '<small>Waiting for the judge to continue.</small>'}</section>`
    : finished ? `<div class="fork-final"><h2>${state.teamWinners?.length===1
      ? 'Team '+escape(state.teams.find(t=>t.id===state.teamWinners[0]).name)+' wins the trolley showdown!'
      : 'The trolley showdown ends in a tie!'}</h2>
      ${host?'<p>The final tally is in. Who is brave enough for a rematch?</p>':''}
      ${host?replayButtons(state,icons):'<p>Stay here for a rematch or return to the homepage.</p>'}</div>`:'';
  return `<section class="game-panel fork-game ${host?'fork-host':'fork-phone'}" data-fork-phase="${phase}">
    <div class="fork-intro"><div><div class="eyebrow">FORK IN THE TRACKS · ROUND ${state.index+1} OF ${state.total} ${building?'· PLACEMENT '+(step+1)+'/3':''}</div>
      <h1>${title}</h1><p>${scene}</p>${prompt?`<strong class="fork-your-role">${prompt}</strong>`:''}</div>
      <span class="fork-judge-label">${host?'YOU ARE THE JUDGE':'HOST JUDGES'}</span></div>
    ${scores(state,escape)}
    ${trackBoard(state,escape)}
    ${progress}${controls}
  </section>`;
}
