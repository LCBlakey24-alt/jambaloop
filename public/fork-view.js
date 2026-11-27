// TV/phone presenter for original Jambaloop Fork in the Tracks.
// Sentence fragments are predefined noun phrases and always fit the shared structure.
import { partyFinale } from './party-finale.js';
import {forkStages} from './fork-cards.js';

const stages=['DEFEND YOUR TRACK','SABOTAGE THEIR TRACK','ONE LAST DEFENCE'];
const slotNames=['DEFEND','SABOTAGE','DEFEND'];
const revealTitles=['FIRST CARDS ON THE TRACKS','THE SABOTAGE IS REVEALED','THE LAST CARDS ARE DOWN'];
const trackLetters=['A','B'];

// The tram is a render of the Kenney Train Kit's round tram (CC0), made by scripts/render-model-sprites.mjs.
const tram = '<img class="fork-tram" src="/models/sprites/train-tram-round.webp" alt="" width="320" height="320">';

// The junction: a trolley on one rail that forks to Track A and Track B. Each
// track has three square slots, filled one placement at a time.
function trackBoard(state, escape) {
  const party=state.party;
  return `<div class="fork-junction" ${party.hit===0||party.hit===1?`data-hit="${party.hit}"`:''}>
    <div class="fork-lead" aria-hidden="true">${tram}
      <i class="fork-rail fork-rail-a"></i><i class="fork-rail fork-rail-b"></i><svg class="fork-switch" viewBox="0 0 100 200" preserveAspectRatio="none" focusable="false"><path d="M0 100C55 100 45 50 100 50"/><path d="M0 100C55 100 45 150 100 150"/></svg></div>
    <div class="fork-tracks" aria-label="Two trolley tracks">${state.teams.map((team,index)=>{
    const cards=party.placements[index];
    const text=cards.map(card=>card?escape(card):'a card still to come');
    const slots=cards.map((card,slot)=>`<li class="fork-slot fork-tile ${card?'filled':'empty'} ${slot===1?'sabotage':'protect'}${card&&party.placed===slot?' is-new':''}" style="--order:${index}">
      <small>${slotNames[slot]}</small><strong>${card?escape(card):'?'}</strong></li>`).join('');
    return `<article class="fork-track" style="--fork-team:${team.color}"${party.hit===index?' data-hit':''}${party.saved===index?' data-saved':''}>
      <header><strong>TRACK ${trackLetters[index]}</strong><span>TEAM ${escape(team.name)}</span>
        ${party.hit===index?'<b class="fork-hit">TROLLEY HIT THIS TRACK</b>':''}${party.saved===index?'<b class="fork-saved">TRACK SPARED</b>':''}</header>
      <ol class="fork-slots">${slots}</ol>
      <p class="fork-track-sentence">If the trolley takes Track ${trackLetters[index]}, it will hit ${text[0]}, ${text[1]}, and ${text[2]}.</p>
    </article>`;
  }).join('')}</div></div>`;
}

function scores(state, escape) {
  return `<div class="fork-score-strip" aria-label="Team points">${state.teams.map(team=>
    `<div style="--fork-team:${team.color}"><span>TEAM ${escape(team.name)}</span><strong>${state.phase==='party-reveal'?team.roundPoints+' POINT THIS ROUND':team.size+' '+(team.size===1?'PLAYER':'PLAYERS')}</strong></div>`).join('')}</div>`;
}

export function forkView(state, {host,escape,icons,replayButtons}) {
  const party=state.party;
  if(!party || party.type!=='fork')return '';
  const phase=state.phase;
  const finished=phase==='finished';
  const building=phase==='party-build';
  const judge=phase==='party-judge';
  const reveal=phase==='party-reveal';
  const placed=phase==='party-placed';
  const step=party.step;
  const title=finished?'THE FINAL RESULTS':placed?revealTitles[party.placed]??'CARDS REVEALED':judge?'TROLLEY DRIVER: PULL THE LEVER':reveal?'THE TROLLEY HAS SPOKEN':stages[step];
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
      : party.driverTurn ? '<p class="fork-locked" role="status">You are the Trolley Driver. Wait for both teams to complete their tracks, then pull the lever.</p>'
      : party.voted ? '<p class="fork-locked" role="status">Your card is locked in. Waiting for your teammates.</p>'
      : `<section class="fork-hand" aria-label="Choose a card"><h2>${escape((party.stage ?? forkStages[step]).title)}</h2>
         <p>${escape((party.stage ?? forkStages[step]).prompt)} Your team’s most popular choice will be placed.</p>
         <div class="fork-hand-options">${(party.hand??[]).map((card,index)=>
           `<button type="button" class="fork-card-pick ${step===1?'bad':'good'}" data-action="fork-card" data-fork-step="${step}" data-option="${index}"><small>CARD ${index+1}</small><span>${escape(card)}</span></button>`).join('')}</div></section>`
    : placed ? host
      ? `<div class="fork-controls"><button class="button primary" data-action="advance">${party.placed===2?'Call the Trolley Driver':'Next placement'} ${icons('arrow-right')}</button><small>Moves on by itself in a few seconds.</small></div>`
      : '<p class="fork-locked" role="status">The new cards are on the tracks. Look at the TV.</p>'
    : judge ? party.canJudge
      ? `<section class="fork-controls fork-judge-controls"><h2>${host?'Host fallback: driver disconnected':'You are the Trolley Driver!'}</h2>
        <p>Choose the funniest track to hit. Players on the spared track each earn one point.</p>
        <div class="fork-choice-buttons">${state.teams.map((team,index)=>
          `<button type="button" class="fork-judge-choice" data-action="fork-judge" data-track="${index}" style="--fork-team:${team.color}">
          <b>HIT TRACK ${trackLetters[index]}</b><small>Spare Team ${escape(state.teams[1-index].name)}</small></button>`).join('')}</div></section>`
      : `<p class="fork-locked">${escape(party.driver.name)} is deciding which track the trolley hits.</p>`
    : reveal ? `<section class="fork-outcome" role="status"><h2>Track ${trackLetters[party.hit]} gets hit!</h2>
        <p>Players on <strong>Team ${escape(state.teams[party.saved].name)}</strong> save their track and each earn a point.</p>
        ${host ? `<button type="button" class="button primary" data-action="advance">${state.index+1<state.total?'Next round':'Final results'} ${icons('arrow-right')}</button>` : '<small>Waiting for the judge to continue.</small>'}</section>`
    : finished ? `<div class="fork-final">${partyFinale(state,{host,escape,variant:'tracks'})}<h2>${state.players?.length
      ? ((state.players.filter(p=>p.score===state.players[0].score).length===1)
        ? escape(state.players[0].name)+' wins the trolley showdown!'
        : 'It is a tie at the top!')
      : 'The trolley showdown is complete!'}</h2>
      <div class="fork-individual-results" aria-label="Individual player points">${(state.players??[]).map((player,index)=>
        `<div><span>#${index+1} ${escape(player.name)}</span><strong>${Math.round(player.score/100)} points</strong></div>`).join('')}</div>
      ${host?replayButtons(state,icons):'<p>Stay here for a rematch or return to the homepage.</p>'}</div>`:'';
  return `<section class="game-panel fork-game ${host?'fork-host':'fork-phone'}" data-fork-phase="${phase}">
    <div class="fork-intro"><div><div class="eyebrow">FORK IN THE TRACKS${party.afterDark ? ' · <b class="fork-after-dark">AFTER DARK 18+</b>' : ''} · ROUND ${state.index+1} OF ${state.total} ${building||placed?'· PLACEMENT '+(step+1)+'/3':''}</div>
      <h1>${title}</h1><p>${scene}</p>${prompt?`<strong class="fork-your-role">${prompt}</strong>`:''}</div>
      <span class="fork-judge-label">${party.driverTurn?'YOU ARE THE DRIVER':'TROLLEY DRIVER: '+escape(party.driver.name)}</span></div>
    ${scores(state,escape)}
    ${trackBoard(state,escape)}
    ${progress}${controls}
  </section>`;
}
