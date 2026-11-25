// Animated mode identities are CSS-driven: real text, no photographic covers.
import { modes, minimumPlayers, partyModes } from './game-config.js';
import { showMark } from './show-identity.js';
import { modeStyle, modeVariables } from './mode-style.js';
import { narration, narratorAsset } from './narration-scripts.js';

export const LAUNCHER_PAGE_SIZE = 8;

const identities = {
  soclose: {lines:['SO','CLOSE'],strap:"Closest number wins.",kind:'ESTIMATION',steps:['Read the question and its measurement unit.','Scroll to your best estimate and lock it in privately.','The closest guess earns 100 points; exact guesses earn 200.']},
  classic:   {lines:['CLASSIC','QUIZ'], strap:"Choose a topic. Outsmart your rivals.", kind:'TRIVIA', steps:['Pick a question category and round length.','Answer questions on your phone.','Collect points and top the leaderboard.']},
  wheel:     {lines:['SPIN THE','WHEEL'], strap:"Spin to pick your topic.", kind:'TRIVIA', steps:['Spin the wheel for the next category.','Answer the question on your phone.','Score points across the rounds.']},
  board:     {lines:['BOARD','RACE'], strap:"Roll, answer, reach the finish.", kind:'RACING', steps:['Choose individual or team play and your board length.','Roll the dice and tackle landing-square questions.','Choose your route and race towards the finish.']},
  dice:      {lines:['DICE','RALLY'], strap:"Roll for bigger points.", kind:'TRIVIA', steps:['Roll two dice to set the points multiplier.','Answer questions on your phone.','Use the multiplier to climb the scores.']},
  knockout:  {lines:['KNOCK','OUT'], strap:"Three lives. Stay in play.", kind:'ELIMINATION', steps:['Everyone starts with three lives.','Wrong or missed answers cost a life.','Survive as the field gets smaller.']},
  punchline: {lines:['PUNCHLINE','PARTY'], strap:"Write the funniest reply.", kind:'PARTY', steps:['Choose 3, 5 or 7 rounds and read a ridiculous writing prompt.','Send a funny reply from your phone.','Vote anonymously for your favourite punchline and collect points across rounds.']},
  cards:     {lines:['FILL THE','BLANK'], strap:"Pick the funniest phrase.", kind:'PARTY', steps:['Choose 3, 5 or 7 rounds and receive a private hand of phrase cards.','Pick the funniest way to finish the prompt.','Vote for another player’s funniest entry; each vote earns points.']},
  tracks:    {lines:['FORK IN','THE TRACKS'], strap:"Build tracks. Persuade the driver.", kind:'TEAMS', steps:['A different player becomes Trolley Driver each round; everyone drives once.','Defend your own track, sabotage the other team’s track, then reinforce your own.','The Driver chooses which track to spare. Teams are reshuffled each round.']},
  bluff:     {lines:['SPOT THE','BLUFF'], strap:"Find the secret faker.", kind:'PARTY', steps:['Choose 3, 5 or 7 rounds. The secret bluff role rotates.','Everyone submits a private answer — one person never sees the prompt.','Vote for the bluff; catch them to earn points, or escape detection as the bluff.']},
  potato:    {lines:['HOT','POTATO'], strap:"Pass it before time runs out.", kind:'PARTY', steps:['Someone starts holding the hot potato.','Answer correctly to pass it along.','Don’t be holding it when the timer ends.']},
  quizrace:  {lines:['QUIZ','RACE'], strap:"Right answers fuel your race.", kind:'RACING', steps:['Everyone races at the same time.','Fast correct answers give bigger speed boosts.','Overtake the field and cross the line first.']},
  showdown:  {lines:['TEAM','SHOWDOWN'], strap:"Team up. Score together.", kind:'TEAMS', steps:['Split into two to four teams.','Answer the team questions on phones.','Your team scores the average of its players’ points.']},
  samepage:  {lines:['SAME','PAGE'], strap:"Match answers to score.", kind:'PARTY', steps:['Everyone privately types an answer to the same creative prompt.','Answers are grouped on the big screen after everyone locks in.','Earn 100 points for each other person whose answer matches yours.']},
  spotlight: {lines:['SPOTLIGHT','WHEEL'],strap:"Take the hot seat.",kind:'GAME SHOW',steps:['Choose one, two or three contestant turns per player.','The wheel selects a topic and another player as your expert.','The expert suggests an answer; the contestant makes the final choice. Earn 100 points for a correct contestant answer or 40 for a correct expert hint.']},
  brain: {lines:['BRAIN','LADDER'],strap:"Solve puzzles. Climb higher.",kind:'PUZZLES',steps:['Choose a five, seven or ten-level climb.','Everyone starts with two lives; answer original number and logic puzzles privately.','Correct answers earn more points as the challenges get harder. Wrong or missed answers cost one life, and losing both means spectating.']},
  topanswers: {lines:['TOP','ANSWERS'],strap:"Predict the room’s favourite.",kind:'PARTY SHOW',steps:['Choose one of four answers to an original opinion question. That creates a real secret poll of everyone playing.','Then secretly predict which answer will be the most popular among your group.','The TV reveals real vote counts. Your prediction earns 20 points per vote for your choice, plus 100 if it shares the most votes. Tied top answers both count.']},
  rare: {lines:['RARE','FIND'],strap:"Find a rare correct answer.",kind:'GAME SHOW',steps:['Everyone privately types a valid answer to the same question.','Accepted answers are checked against a finite catalogue; the host can review unusual entries before scores are final.','A valid unique answer scores 200, a shared pair scores 100 each, and answers selected by three or more score 50 each. Invalid answers score zero.']},
  sketch: {lines:['SKETCH','SPRINT'],strap:"Draw it. Guess it.",kind:'DRAWING',steps:['Choose 3, 5 or 7 rounds; artists rotate across the group.','One artist draws a private prompt on their phone, live on the TV.','The other players get five guesses each. Earn 150 points for the first correct guess, 100 for second, 75 thereafter, and 50 for the artist when somebody guesses correctly.']},
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

export function tileArt(id, isPreview = false) {
  const style = modeStyle(id);
  const {lines,strap} = identity(id);
  return `<span class="tile-art ${isPreview?'tile-art-preview':''}" data-motif="${style.motif}" data-show="${id}" aria-hidden="true">
    <span class="tile-motion"><i></i><i></i><i></i></span>
    ${showMark(id)}
    <span class="tile-wordmark">${lines.map(line=>`<span>${line}</span>`).join('')}</span>
    <span class="tile-strap">${strap}</span>
  </span>`;
}

export function launcherTile(mode) {
  const [id,name,description] = mode;
  const {kind} = identity(id);
  const players = minimumPlayers(id);
  return `<button type="button" class="game-tile" data-action="preview-mode" data-mode="${id}"
      style="${modeVariables(id)}" aria-label="${name}. ${description} Preview game details.">
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

// The same concise, original game instructions power preview cards and player lobbies.
export function launcherSteps(id) { return [...identity(id).steps]; }

export function allLauncherIdentities() { return Object.keys(identities); }

/** Launcher copy for one game: wordmark lines, strapline, kind and steps. */
export function launcherCopy(id) { return identity(id); }
