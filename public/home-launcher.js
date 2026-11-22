// Animated mode identities are CSS-driven: real text, no photographic covers.
import { modes, minimumPlayers, partyModes } from './game-config.js';
import { modeStyle, modeVariables } from './mode-style.js';
import { narration, narratorAsset } from './narration-scripts.js';

export const LAUNCHER_PAGE_SIZE = 8;

const identities = {
  classic:   {lines:['CLASSIC','QUIZ'], strap:'THE ORIGINAL QUIZ', kind:'TRIVIA', steps:['Pick a question category and round length.','Answer questions on your phone.','Collect points and top the leaderboard.']},
  wheel:     {lines:['SPIN THE','WHEEL'], strap:'LET FATE CHOOSE', kind:'TRIVIA', steps:['Spin the wheel for the next category.','Answer the question on your phone.','Score points across the rounds.']},
  board:     {lines:['BOARD','RACE'], strap:'ROLL. RACE. WIN.', kind:'RACING', steps:['Choose your teams and board length.','Roll the dice and tackle landing-square questions.','Move around the board towards the finish.']},
  dice:      {lines:['DICE','RALLY'], strap:'LUCK MEETS KNOWLEDGE', kind:'TRIVIA', steps:['Roll two dice to set the points multiplier.','Answer questions on your phone.','Use the multiplier to climb the scores.']},
  knockout:  {lines:['KNOCK','OUT'], strap:'STAY IN THE GAME', kind:'ELIMINATION', steps:['Everyone starts with three lives.','Wrong answers cost you a life.','Survive as the field gets smaller.']},
  punchline: {lines:['PUNCHLINE','PARTY'], strap:'MAKE THEM LAUGH', kind:'PARTY', steps:['Read the ridiculous writing prompt.','Send a funny reply from your phone.','Vote for your favourite punchline.']},
  cards:     {lines:['FILL THE','BLANK'], strap:'COMPLETE THE CHAOS', kind:'PARTY', steps:['Receive a private hand of phrase cards.','Pick the funniest way to finish the prompt.','Compare picks and vote.']},
  tracks:    {lines:['FORK IN','THE TRACKS'], strap:'DEFEND YOUR TRACK', kind:'TEAMS', steps:['A different player becomes Trolley Driver each round; everyone drives once.','Teams choose one of three good cards, one of three sabotage cards, and one of three final good cards.','The Driver pulls the lever. New teams and all nine card options reset next round.']},
  bluff:     {lines:['SPOT THE','BLUFF'], strap:'TRUST NO ONE', kind:'PARTY', steps:['One player is secretly missing the prompt.','Everyone submits an answer or bluff.','Vote for who is faking it.']},
  potato:    {lines:['HOT','POTATO'], strap:'PASS THE PRESSURE', kind:'PARTY', steps:['Someone starts holding the hot potato.','Answer correctly to pass it along.','Don’t be holding it when the timer ends.']},
  quizrace:  {lines:['QUIZ','RACE'], strap:'THINK FAST. MOVE FASTER.', kind:'RACING', steps:['Everyone races at the same time.','Fast correct answers give bigger speed boosts.','Overtake the field and cross the line first.']},
  showdown:  {lines:['TEAM','SHOWDOWN'], strap:'BETTER TOGETHER', kind:'TEAMS', steps:['Split into two to four teams.','Answer the team questions on phones.','Combine points to take the team victory.']},
};

export function launcherModes(filter = 'all') {
  return modes.filter(([id]) => filter === 'all' || partyModes.includes(id) === (filter === 'party'));
}

export function launcherPageCount(filter = 'all') {
  return Math.max(1, Math.ceil(launcherModes(filter).length / LAUNCHER_PAGE_SIZE));
}

function identity(id) {
  return identities[id] ?? {lines:[id.toUpperCase()],strap:'PLAY TOGETHER',kind:'GAME',steps:[]};
}

function tileArt(id, isPreview = false) {
  const style = modeStyle(id);
  const {lines,strap} = identity(id);
  return `<span class="tile-art ${isPreview?'tile-art-preview':''}" data-motif="${style.motif}" aria-hidden="true">
    <span class="tile-motion"><i></i><i></i><i></i></span>
    <span class="tile-wordmark">${lines.map(line=>`<span>${line}</span>`).join('')}</span>
    <span class="tile-strap">${strap}</span>
  </span>`;
}

export function launcherTile(mode) {
  const [id,name,description] = mode;
  const {kind} = identity(id);
  const players = minimumPlayers(id);
  return `<button type="button" class="game-tile" data-action="preview-mode" data-mode="${id}"
      style="${modeVariables(id)}" aria-label="${name}. ${description}. Preview game details.">
    ${tileArt(id)}
    <span class="tile-info"><span class="tile-kind">${kind}</span><span class="tile-minimum">${players}+ players</span></span>
  </button>`;
}

export function launcherPreview(id) {
  const mode=modes.find(([key])=>key===id);
  if(!mode)return '';
  const [key,name,description]=mode;
  const {steps,kind}=identity(key);
  const players=minimumPlayers(key);
  return `<div class="game-preview" style="${modeVariables(key)}" data-mode="${key}">
    <div class="preview-cover">${tileArt(key,true)}</div>
    <div class="preview-copy">
      <div class="preview-overline"><span class="preview-dot"></span> ${kind} <span>·</span> ${players}+ PLAYERS</div>
      <h2 id="preview-title">${name}</h2>
      <p class="preview-description">${description}</p>
      <div class="narrator-controls">
        <button type="button" class="narrator-toggle" data-action="narrator-toggle" data-mode="${key}"
            aria-pressed="false" aria-label="Listen to ${name} introduction">
          <span data-narrator-symbol aria-hidden="true">▶</span><span data-narrator-label>Listen to intro</span>
        </button>
        <span class="narrator-mode" data-narrator-status role="status">${narratorAsset(key)?'Recorded announcer':'Device read-aloud'}</span>
      </div>
      <details class="narrator-script">
        <summary>Read spoken introduction</summary>
        <p>${narration[key]}</p>
      </details>
      ${narratorAsset(key) ? '<a class="narrator-credit" href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">Voice generated with ElevenLabs</a>' : ''}
      <h3>How to play</h3>
      <ol class="preview-steps">${steps.map((step,i)=>`<li><b>${String(i+1).padStart(2,'0')}</b><span>${step}</span></li>`).join('')}</ol>
      <div class="preview-actions">
        <button type="button" class="button primary" data-action="host" data-mode="${key}">Set up this game <span aria-hidden="true">→</span></button>
        <button type="button" class="button outline" data-action="close-preview">Back to games</button>
      </div>
    </div>
  </div>`;
}

export function launcherSetupArtwork(id) {
  if(!identities[id])return '';
  return `<span class="tile-setup-art" style="${modeVariables(id)}">${tileArt(id,true)}</span>`;
}

export function allLauncherIdentities() { return Object.keys(identities); }
