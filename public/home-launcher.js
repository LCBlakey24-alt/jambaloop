// Animated mode identities are CSS-driven: real text, no photographic covers.
import { modes, minimumPlayers, partyModes } from './game-config.js';
import { modeStyle, modeVariables } from './mode-style.js';
import { narration, narratorAsset } from './narration-scripts.js';
import { duoIntros, hosts, spoken } from './duo-scripts.js';
import { duoRecordings } from './duo-recordings.js';

export const LAUNCHER_PAGE_SIZE = 8;

const identities = {
  soclose: {lines:['SO','CLOSE'],strap:'EVERY NUMBER COUNTS',kind:'ESTIMATION',steps:['Read the question and its measurement unit.','Scroll to your best estimate and lock it in privately.','The closest guess earns 100 points; exact guesses earn 200.']},
  classic:   {lines:['CLASSIC','QUIZ'], strap:'THE ORIGINAL QUIZ', kind:'TRIVIA', steps:['Pick a question category and round length.','Answer questions on your phone.','Collect points and top the leaderboard.']},
  wheel:     {lines:['SPIN THE','WHEEL'], strap:'LET FATE CHOOSE', kind:'TRIVIA', steps:['Spin the wheel for the next category.','Answer the question on your phone.','Score points across the rounds.']},
  board:     {lines:['BOARD','RACE'], strap:'ROLL. RACE. WIN.', kind:'RACING', steps:['Choose your teams and board length.','Roll the dice and tackle landing-square questions.','Move around the board towards the finish.']},
  dice:      {lines:['DICE','RALLY'], strap:'LUCK MEETS KNOWLEDGE', kind:'TRIVIA', steps:['Roll two dice to set the points multiplier.','Answer questions on your phone.','Use the multiplier to climb the scores.']},
  knockout:  {lines:['KNOCK','OUT'], strap:'STAY IN THE GAME', kind:'ELIMINATION', steps:['Everyone starts with three lives.','Wrong answers cost you a life.','Six levels of ten questions, each harder than the last. It runs until one player is left; if more than one survives all sixty, one closest-number question decides it.']},
  punchline: {lines:['PUNCHLINE','PARTY'], strap:'MAKE THEM LAUGH', kind:'PARTY', steps:['Choose 3, 5 or 7 rounds and read a ridiculous writing prompt.','Send a funny reply from your phone.','Vote anonymously for your favourite punchline and collect points across rounds.']},
  cards:     {lines:['FILL THE','BLANK'], strap:'COMPLETE THE CHAOS', kind:'PARTY', steps:['Choose 3, 5 or 7 rounds and receive a private hand of phrase cards.','Pick the funniest way to finish the prompt.','Compare picks, vote anonymously, and score throughout the match.']},
  tracks:    {lines:['FORK IN','THE TRACKS'], strap:'DEFEND YOUR TRACK', kind:'TEAMS', steps:['A different player becomes Trolley Driver each round; everyone drives once.','Teams choose one of three good cards, one of three sabotage cards, and one of three final good cards.','The Driver pulls the lever. New teams and all nine card options reset next round.']},
  bluff:     {lines:['SPOT THE','BLUFF'], strap:'TRUST NO ONE', kind:'PARTY', steps:['Choose 3, 5 or 7 rounds. The secret bluff role rotates.','Everyone submits a private answer — one person never sees the prompt.','Vote on the replies, earn points for catching the bluff, and reveal the final winner.']},
  potato:    {lines:['HOT','POTATO'], strap:'PASS THE PRESSURE', kind:'PARTY', steps:['Someone starts holding the hot potato.','Answer correctly to pass it along.','Don’t be holding it when the timer ends.']},
  quizrace:  {lines:['QUIZ','RACE'], strap:'THINK FAST. MOVE FASTER.', kind:'RACING', steps:['Everyone races at the same time.','Fast correct answers give bigger speed boosts.','Overtake the field and cross the line first.']},
  showdown:  {lines:['TEAM','SHOWDOWN'], strap:'BETTER TOGETHER', kind:'TEAMS', steps:['Split into two to four teams.','Answer the team questions on phones.','Combine points to take the team victory.']},
  samepage:  {lines:['SAME','PAGE'], strap:'THINK ALIKE. SCORE TOGETHER.', kind:'PARTY', steps:['Everyone privately types an answer to the same creative prompt.','Answers are grouped on the big screen after everyone locks in.','Earn 100 points for each other person whose answer matches yours.']},
  spotlight: {lines:['SPOTLIGHT','WHEEL'],strap:'YOUR TURN TO SHINE',kind:'GAME SHOW',steps:['Choose one, two or three contestant turns per player.','The wheel selects a topic and another player as your expert.','The expert suggests an answer; the contestant makes the final choice. Earn 100 points for a correct contestant answer or 40 for a correct expert hint.']},
  brain: {lines:['BRAIN','LADDER'],strap:'CLIMB WITH YOUR MIND',kind:'PUZZLES',steps:['Choose a five, seven or ten-level climb.','Everyone starts with two lives; answer original number and logic puzzles privately.','Correct answers earn more points as the challenges get harder. Wrong or missed answers cost one life, and losing both means spectating.']},
  topanswers: {lines:['TOP','ANSWERS'],strap:'READ YOUR ROOM',kind:'PARTY SHOW',steps:['Choose one of four answers to an original opinion question. That creates a real secret poll of everyone playing.','Then secretly predict which answer will be the most popular among your group.','The TV reveals real vote counts. Your prediction earns 20 points per vote for your choice, plus 100 if it shares the most votes. Tied top answers both count.']},
  rare: {lines:['RARE','FIND'],strap:'STAND OUT TO SCORE',kind:'GAME SHOW',steps:['Everyone types a different answer to the same question, privately on their phone.','Accepted answers are checked against a finite catalogue; the host can review unusual entries before scores are final.','A valid unique answer scores 200, a shared pair scores 100 each, and answers selected by three or more score 50 each. Invalid answers score zero.']},
  bloodmoon: {lines:['BLOOD','MOON'],strap:'WHO IS THE VAMPIRE?',kind:'SECRET ROLES',steps:['Every phone is dealt a secret role: a few Vampires, one Oracle, one Warden, and Villagers. The TV never sees who is who.','Each night everyone chooses on their own phone: Vampires pick someone to bite, the Oracle checks one player, the Warden guards one.','Each day the room talks it over and votes to banish a suspect. The village wins when every vampire is out; the vampires win when they match the village.']},
  wayoff: {lines:['WAY','OFF'],strap:'FURTHEST GUESS IS OUT',kind:'ELIMINATION',steps:['Everyone scrolls to their best guess at the same number question. The TV shows every guess turning live.','When the answer lands, the guess furthest from it is out. Anyone who did not guess is out too.','Fresh question, fewer players. The last one left wins.']},
  shade: {lines:['SHADE'],strap:'ONE WORD. ONE COLOUR.',kind:'COLOUR CLUES',steps:['One player is shown a secret square on a giant colour board and describes it out loud in a single word.','Everyone else places a guess on their phone. Then a second word and a second guess, then a third: three words, three guesses.','The exact square scores 3, one away 2, two away 1. The clue-giver scores for every guess on or beside the target.']},
  dontlook: {lines:['DON’T','LOOK!'],strap:'BACK TO THE TELLY',kind:'DESCRIBE IT',steps:['One player turns their back to the TV. A word appears on the screen behind them.','Their team describes it without saying it, and taps Correct or Pass on their phones.','Sixty seconds a turn. Teams take turns, everyone gets a go at guessing, and the most correct answers wins.']},
  catchup: {lines:['CATCH','UP'],strap:'SET IT. THEN BEAT IT.',kind:'TEAM CHASE',steps:['The room splits into two sides. One side has 60 seconds to answer as many questions as it can. The question is on the TV; anyone on the side can answer on their phone.','The other side then gets 60 seconds and fresh questions to beat that number. A wrong answer freezes your side for a moment.','Then the sides swap. Win a round by setting a target nobody catches, or by beating the one you were set.']},
  sketch: {lines:['SKETCH','SPRINT'],strap:'DRAW FAST. GUESS FASTER.',kind:'DRAWING',steps:['Choose 3, 5 or 7 rounds; artists rotate across the group.','One artist draws a private prompt on their phone, live on the TV.','The other players get five guesses each. Earn 150 points for the first correct guess, 100 for second, 75 thereafter, and 50 for the artist when somebody guesses correctly.']},
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
  const {lines} = identity(id);
  return `<span class="tile-art ${isPreview?'tile-art-preview':''}" data-motif="${style.motif}" data-show="${id}" aria-hidden="true">
    <span class="tile-motion"><i></i><i></i><i></i></span>
    <span class="tile-wordmark">${lines.map(line=>`<span>${line}</span>`).join('')}</span>
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
        <span class="narrator-mode" data-narrator-status role="status">${duoRecordings[key]?'Recorded: Max and Poppy':narratorAsset(key)?'Recorded announcer':'Device read-aloud'}</span>
      </div>
      <details class="narrator-script">
        <summary>Read spoken introduction</summary>
        ${duoRecordings[key] ? duoIntros[key].map(([host,text])=>`<p><b>${hosts[host].name}:</b> ${spoken(text)}</p>`).join('') : `<p>${narration[key]}</p>`}
      </details>
      ${narratorAsset(key) || duoRecordings[key] ? '<a class="narrator-credit" href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">Voice generated with ElevenLabs</a>' : ''}
      <h3>How to play</h3>
      <ol class="preview-steps">${steps.map((step,i)=>`<li><b>${String(i+1).padStart(2,'0')}</b><span>${step}</span></li>`).join('')}</ol>
      <div class="preview-actions">
        <button type="button" class="button primary" data-action="party" data-mode="${key}">Host a party <span aria-hidden="true">→</span></button>
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
