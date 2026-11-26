import { showIdentity } from './show-identity.js';
import { bindTilt, celebrate, countUp, prefersReducedMotion } from './motion.js';
import { enforceTvLegibility } from './tv-legibility.js';
import {soCloseView,numberWheelRows,soCloseRevealView} from './so-close-view.js';
import {revealFrame as soCloseFrame, stageFrame as soCloseStage} from './so-close-reveal.js';
import { scoreBreakView, updateScoreBreak } from './score-break.js';
import { winnerBanner, playerFinish } from './result-highlights.js';
import { bindRoomAvatars } from './room-avatars.js';
import { animatePotato, potatoHeat } from './potato-stage.js';
import { quizRaceView, updateRacePowers } from './quiz-race-view.js';
import { mountQuizRaceTrack } from './quiz-race-track.js';
import { mobileDeck } from './mobile-deck.js';
import { awardView, currentFrame, frameView, revealFrames, scoreReveal } from './ceremony.js';
import { boardSpeedValues, bonusValues, canSetScore, defaultScoring, doubleSchedules, pointValues } from './scoring.js';
import { gameNightPresets, gameNightView, partySettings, playlistEditor, playlistLimit, queuedSettings, replayButtons } from './game-night.js';
import { clearRoomSession, forgetPlayer, parseRoomCode, recentRooms, rememberPlayer, rememberedPlayer, restoreRoomSession, saveRoomSession } from './room-session.js';
import {readQuestionHistory, rememberQuestion} from './question-history.js';
import { modeVariables, sceneBackdrop } from './mode-style.js';
import { launcherTile, launcherPreview, launcherModes, launcherSetupArtwork, LAUNCHER_PAGE_SIZE } from './home-launcher.js';
import { carouselView, moveCarousel, themeHome, wrapIndex } from './game-carousel.js';
import { playSting, stingFor } from './show-sting.js';
import { isWelcomeNarration, narrationPlaying, playScript, playWelcome, stopNarration, toggleNarration } from './narrator.js';
import { bloodmoonCalls, knockoutReactions, raceCalls, reactions, skipQuips, welcomeBack } from './duo-scripts.js';
import { openWelcome } from './welcome-show.js';
import { playChiptune, playCue, playTick, playTowerImpact } from './sound-cues.js';
import { duckMusic, playMusic, playSfx, preloadSfx, stopMusic } from './sfx.js';
import { bindPickerSwipe, movePicker, pickerPhone, pickerTv, stepMode } from './lobby-picker.js';
import { knockoutLadder, phoneHearts, playKnockout, rememberLadder, shatterPhoneHeart } from './knockout-ladder.js';
import { boardLengths, boardRoute, boardDuration, durationLabel, suggestedTurnCap, boardRequiresChoice, boardPathChoices } from './board-route.js';
import {teamPlayModes, defaultPlayStyle} from './team-play.js';
import { avatarView, partyView } from './party-views.js';
import { identityOf, identityVariables } from './game-identities.js';
import { hideStage, showStage } from './stage-3d.js';
import { bumpCount, clockTension, lockRail, reactionFor, stageReveal, stageable, updateLockRail } from './show-moments.js';
import {connectSketchPainter,paintSketchBoard,clearSketch} from './sketch-canvas.js';
import { openLibrary, savedQuizzes } from './quiz-editor.js';
import { answerGuide, helpTypes, closestStep, createDraft, formatNumber, orderedItems, setEstimatePrecision, specialAnswer } from './answer-controls.js';
import { demoView, explainer, hasDemo, practiceView, samples } from './learning.js';
import { categories, categoryGroups, categoryName, modes, themes, questionTypes, formatTypes, formatId, difficulties, defaultTheme, partyModes, fixedQuestionModes, minimumPlayers, questionCounts, scoreIntervals, defaultScoreInterval, supportsScoreCheckpoints } from './game-config.js';
import { boardView, diceView, lobbyView, reviewView, rollRecap, teamList, teamScoreboard, wheelView } from './game-views.js';

const icons = (name, css = '') => `<img class="${css}" src="/icons/${name}.svg" alt="">`;
const modeName = id => modes.find(mode => mode[0] === id)?.[1] ?? '';
const app = document.querySelector('#app');
const switchAvatarSession = bindRoomAvatars(app);
bindTilt();
bindImmersiveChrome();

// Immersive TV: show host controls briefly on mouse, key or touch activity.
function bindImmersiveChrome() {
  let hideTimer;
  const reveal = () => {
    if (!document.querySelector('.game.immersive')) return;
    document.body.classList.add('tv-chrome-visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => document.body.classList.remove('tv-chrome-visible'), 2600);
  };
  for (const type of ['mousemove', 'keydown', 'touchstart', 'wheel']) document.addEventListener(type, reveal, { passive: true });
}
const home = app.innerHTML;
const dialog = document.querySelector('#dialog');
const content = document.querySelector('#dialog-content');
const footer = document.querySelector('footer');
const announcement = document.querySelector('#phase-announcement');
// Answer colours: strong, distinct and AA-contrast with their ink (answer-colours.css).
const colors = ['#c8203f', '#1d5fd0', '#f2b01e', '#0d8250'];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let session;
let state;
let signature;
let pending = false;
let stream;
let lastUpdate = 0;
let streamReady = false;
let nextConnect = 0;
let offset = 0;
let submittingAnswer;
let raceSending = false;
let raceTrackView;
// One persistent WebGL circuit per race on the TV; re-attached after renders.
let race3d;
let race3dLoading;
function disposeRace3d() { race3d?.dispose(); race3d = undefined; race3dLoading = undefined; }
let raceAnimationFrame = 0;
let raceSnapshotLocal = 0;
let sound;
let soundEnabled = false;
let draftKey;
let draft;
let practice;
let previewTheme = localStorage.getItem('quiz-club-theme') ?? defaultTheme;
let boardDisplay;
let boardModule;
let renderedPhase;
let lastSoCloseCue;
let categoryGroup = 0;
let homeFilter = 'all';
let homePage = 0;
let homeSelected;
// Home carousel (big screens): which game is centred, shelf or tile view, and
// the opt-in voice guide. Preferences are per-device conveniences only.
let carouselIndex = 0;
let lastLobbyMode;
let carouselTimer;
const stored = key => { try { return localStorage.getItem(key); } catch { return null; } };
const store = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } };
let homeView = stored('jambaloop-home-view') === 'grid' ? 'grid' : 'carousel';
let carouselVoice = false;
const carouselScreen = matchMedia('(min-width: 1000px) and (min-height: 600px)');
let homeTab = 'games';
let tvFocus = false;
let partyReply = '';
let joinAvatar;
let playlistDraft;
let reconnecting = false;
let lastPoll = 0;
let ceremonyFrames = [];

function setTheme(id) {
  document.body.dataset.theme = themes.some(([theme]) => theme === id) ? id : defaultTheme;
}

function previewStyle(id) {
  previewTheme = id;
  localStorage.setItem('quiz-club-theme', id);
  setTheme(id);
}

function renderGraphics(s, previous, animateRoll) {
  const current = app.querySelector('#board-stage, .wheel-frame');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = () => reduced ? 0 : Math.max(0, (s.motion?.ends ?? 0) - Date.now() - offset);
  if (previous && current) {
    if (animateRoll) {
      const canvas = previous.querySelector('canvas');
      previous.replaceChildren(...current.childNodes, canvas);
      previous.setAttribute('aria-label', current.getAttribute('aria-label'));
      current.replaceWith(previous);
      boardDisplay.update(s, duration());
    } else current.replaceWith(previous);
    return;
  }
  boardDisplay?.dispose();
  boardDisplay = undefined;
  if (current?.id !== 'board-stage') return;
  if (s.phase === 'rolling' && !reduced) current.dataset.pending = 'true';
  boardModule ??= import('./board.js');
  boardModule.then(({ mountTable }) => {
    if (current.isConnected) boardDisplay = mountTable(current, s, duration(), hit => {
      if (soundEnabled) playTowerImpact(sound, hit);
    });
  }).catch(() => {
    // The team positions and dice result remain available on devices without WebGL.
  }).finally(() => {
    delete current.dataset.pending;
  });
}


function updateQuizRaceVisuals() {
  raceAnimationFrame = 0;
  if(!session || !state?.race || !['race-countdown','race','finished'].includes(state.phase)) return;
  const snapshot=state.race;
  const elapsed=snapshot.paused ? 0 : Math.min(320,Math.max(0, Date.now()-raceSnapshotLocal));
  const sim=snapshot.time+(snapshot.paused?0:Math.max(0,Date.now()-raceSnapshotLocal));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  raceTrackView?.update(snapshot.racers,snapshot.length,reduced?0:elapsed,reduced,sim);
  const set=(selector,text)=>{const item=app.querySelector(selector);if(item&&item.textContent!==String(text))item.textContent=String(text);};
  set('[data-race-clock]',`${Math.floor(Math.max(0,sim-3000)/60000)}:${String(Math.floor(Math.max(0,sim-3000)/1000)%60).padStart(2,'0')}`);
  set('[data-race-countdown]',Math.max(1,Math.ceil((3000-sim)/1000)));
  const own=snapshot.own;
  if(own){
    const current=snapshot.racers.find(p=>p.id===state.player?.id);
    const ratio=Math.round(100*(own.distance+(reduced?0:(current?.speed??1)*elapsed/1000))/Math.max(1,snapshot.length));
    const progress=app.querySelector('[data-race-progress]');if(progress)progress.style.width=Math.min(100,ratio)+'%';
    set('[data-race-progress-text]',Math.min(100,ratio)+'%');
    set('[data-race-speed-value]',(current?.speed??1).toFixed(2)+'×');
    set('[data-race-position]',own.position+' / '+state.playerCount);
    set('[data-race-speed]',(current?.speed??1)>1.04?'BOOSTING':(current?.speed??1)<.96?'SLOWED':'CRUISING');
    if(own.question)set('[data-race-deadline]',Math.max(0,Math.ceil((own.question.deadline-sim)/1000))+'s');
  }
  snapshot.racers.forEach(r=>{const row=[...app.querySelectorAll('[data-race-rank]')].find(node=>node.dataset.raceRank===r.id);if(!row)return;
    const rank=row.querySelector('.race-position');if(rank)rank.textContent=r.position;
    const percent=Math.min(100,Math.round(100*r.distance/snapshot.length));
    const text=row.querySelector('.race-rank-percent');if(text)text.textContent=percent+'%';
    const meter=row.querySelector('.race-mini-track i');if(meter)meter.style.width=percent+'%';
  });
  raceAnimationFrame=requestAnimationFrame(updateQuizRaceVisuals);
}

function renderHome() {
  stopNarration();
  boardDisplay?.dispose();
  boardDisplay = undefined;
  raceTrackView?.dispose(); raceTrackView = undefined; disposeRace3d();
  cancelAnimationFrame(raceAnimationFrame); raceAnimationFrame = 0;
  setTheme(previewTheme);
  app.innerHTML = home;
  renderedPhase = undefined;
  lastSoCloseCue = undefined;
  announcement.textContent = '';
  partyReply = '';
  footer.hidden = false;
  const recent = app.querySelector('[data-action="recent-rooms"]');
  if (recent) recent.hidden = recentRooms().length === 0;
  homeFilter = 'all';
  homePage = 0;
  homeSelected = undefined;
  homeTab = 'games';
  showHomeTab('games');
  renderModeCards('all');
  categoryGroup = 0;
  document.querySelector('#category-filters').innerHTML = categoryGroups.map(([name], index) => `
    <button class="topic-filter" type="button" data-action="filter-topics" data-group="${index}" aria-pressed="${index === 0}">${name}</button>`).join('');
  renderCategories();
  const topicCount=app.querySelector('[data-action="home-tab"][data-tab="topics"] span');
  if(topicCount)topicCount.textContent=String(categories.length-1);
  const gameCount=app.querySelector('[data-action="home-tab"][data-tab="games"] span');
  if(gameCount)gameCount.textContent=String(modes.length);
}

function showHomeTab(tab) {
  if (!['games','topics'].includes(tab)) return;
  stopNarration();
  homeTab = tab;
  app.querySelectorAll('[data-home-panel]').forEach(panel => {
    panel.hidden = panel.dataset.homePanel !== tab;
  });
  document.querySelectorAll('[data-action="home-tab"]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.tab === tab));
  });
  const heading = app.querySelector(tab === 'games' ? '#mode-heading' : '#category-heading');
  if (heading && tab === 'topics') heading.setAttribute('tabindex','-1');
}

function homePageSize() {
  // Show every game on ordinary desktop screens; small/short displays retain paging.
  if (matchMedia('(min-width: 1100px) and (min-height: 700px)').matches) return modes.length;
  if (matchMedia('(max-width: 760px)').matches) return 4;
  if (matchMedia('(max-width: 900px)').matches) return 6;
  return LAUNCHER_PAGE_SIZE;
}

function carouselActive() {
  return homeView === 'carousel' && carouselScreen.matches && !homeSelected;
}

function renderModeCards(group = homeFilter) {
  stopNarration();
  const list = app.querySelector('#mode-list');
  if (!list) return;
  homeFilter = group;
  const matches = launcherModes(homeFilter);
  const shell = app.querySelector('[data-home-shell]');
  const carousel = app.querySelector('#game-carousel');
  const toggle = app.querySelector('[data-action="carousel-view"]');
  if (toggle) {
    toggle.hidden = !carouselScreen.matches;
    toggle.textContent = homeView === 'carousel' ? 'Show all tiles' : 'Show the shelf';
  }
  if (carousel && carouselActive()) {
    carouselIndex = wrapIndex(carouselIndex, matches.length);
    carousel.innerHTML = carouselView(matches, carouselIndex, carouselVoice);
    carousel.hidden = false;
    list.hidden = true;
    app.querySelector('#game-preview').hidden = true;
    app.querySelector('#mode-pager').hidden = true;
    shell.dataset.homeView = 'carousel';
    themeHome(shell, matches[carouselIndex][0]);
    stageFor(shell, matches[carouselIndex][0]);
    const count = app.querySelector('#mode-count');
    if (count) count.textContent = 'Every game, one party · ← → to browse';
    return;
  }
  if (carousel) { carousel.hidden = true; carousel.innerHTML = ''; }
  if (shell) { delete shell.dataset.homeView; delete shell.dataset.carouselScheme; shell.removeAttribute('style'); }
  const size = homePageSize();
  const pages = Math.max(1, Math.ceil(matches.length / size));
  homePage = Math.max(0, Math.min(homePage, pages - 1));
  list.innerHTML = matches.slice(homePage * size, (homePage + 1) * size).map(launcherTile).join('');
  const preview = app.querySelector('#game-preview');
  if (homeSelected && matches.some(([id]) => id === homeSelected)) {
    preview.innerHTML = launcherPreview(homeSelected);
    preview.hidden = false;
    list.hidden = true;
  } else {
    homeSelected = undefined;
    preview.innerHTML = '';
    preview.hidden = true;
    list.hidden = false;
  }
  const pager = app.querySelector('#mode-pager');
  pager.hidden = Boolean(homeSelected);
  const previous = pager.querySelector('[data-direction="-1"]');
  const next = pager.querySelector('[data-direction="1"]');
  previous.disabled = homePage === 0;
  next.disabled = homePage >= pages - 1;
  pager.querySelector('#mode-page-output').textContent = `Page ${homePage + 1} of ${pages} · ${matches.length} games`;
  const count = app.querySelector('#mode-count');
  if (count) count.textContent = homeSelected ? 'How to play' : 'Tap a game to see how it works';
}

function setupPreview(mode, play = false) {
  return `<div class="setup-look" style="${modeVariables(mode)}">
    ${launcherSetupArtwork(mode)}
    ${explainer(mode, play)}</div>`;
}

function renderCategories() {
  const query = document.querySelector('#topic-search').value.trim().toLocaleLowerCase();
  const [, group] = categoryGroups[categoryGroup];
  const visible = categories.filter(([id, name, description]) =>
    (!group.length || group.includes(id)) && (name + ' ' + description).toLocaleLowerCase().includes(query));
  document.querySelector('#category-empty').hidden = Boolean(visible.length);
  document.querySelector('#category-list').innerHTML = visible.map(([id, name, description, icon, color]) => `
    <button class="card" data-action="party" data-mode="classic" data-category="${id}" style="--accent:${color}">
      <span class="category-icon" style="--icon:url('/icons/${icon}.svg')"><i></i></span>
      ${icons('arrow-up-right', 'arrow')}<h3>${name}</h3><p>${description}</p>
    </button>`).join('');
}

function openDialog(mode, value, gameMode, quizId) {
  stopNarration();
  practice = undefined;
  dialog.classList.toggle('setup-dialog', ['host', 'configure', 'rematch', 'practice', 'library', 'night'].includes(mode));
  if (['host', 'configure', 'rematch'].includes(mode)) {
    const configured = mode !== 'host';
    const rematch = mode === 'rematch';
    // From the lobby carousel, settings open on the game being browsed.
    const selectedMode = quizId ? 'classic' : configured ? gameMode ?? state.mode : gameMode ?? 'classic';
    const raceSetup = configured && state.mode === 'quizrace' ? state : {}; 
    const seconds = configured ? state.seconds : 20;
    const scoring = configured && state.scoring ? state.scoring : defaultScoring(seconds);
    const interval = configured ? state.scoreInterval ?? defaultScoreInterval : defaultScoreInterval;
    const intervalLabels = { 0: 'Final scores only', 1: 'Every question', 3: 'Every 3 questions', 5: 'Every 5 questions' };
    const speed = configured && state.mode === 'board' ? state.boardSpeed : 50;
    const selected = (items, current) => items.map(([id, name]) => `<option value="${escape(id)}" ${id === current ? 'selected' : ''}>${escape(name)}</option>`).join('');
    const library = savedQuizzes();
    const selectedQuiz = quizId ?? (configured && state.quizTitle ? 'current' : '');
    const quizChoices = [
      ['', 'Quiz Club question bank'],
      ...(configured && state.quizTitle ? [['current', state.quizTitle + ' (in this room)']] : []),
      ...library.map(quiz => [quiz.id, quiz.title]),
    ];
    content.innerHTML = `<div class="eyebrow">GAME SETUP</div><h2>${rematch ? 'Set up a rematch' : configured ? 'Choose a game' : 'Host a game'}</h2>
    <p>${rematch ? 'Everyone stays in the room and starts with a fresh score.' : configured ? 'Changes appear on every screen in this room.' : 'Choose a mode, then share the room code with your group.'}</p>
    <form id="${mode}-form">
    <fieldset class="mode-options"><legend>Game mode</legend>${modes.map(([id, name, description]) => `<label>
      <input name="mode" type="radio" value="${id}" ${id === selectedMode ? 'checked' : ''}>
      <span><i class="mode-thumb" style="${identityVariables(id)}" aria-hidden="true"></i><strong>${name}</strong><small>${description}</small></span></label>`).join('')}</fieldset>
    <div class="explainer-slot">${setupPreview(selectedMode, Boolean(gameMode))}</div>
    <div class="quiz-source" id="quiz-source"><label>Question source<select name="quiz">${selected(quizChoices, selectedQuiz)}</select></label>
      <button type="button" class="button outline small" data-action="library">My quizzes</button></div>
    <label id="difficulty-field">Difficulty<select name="difficulty">${selected(difficulties, configured ? state.difficulty : 'standard')}</select></label>
    <div class="form-row"><label id="category-field">Category<select name="category">${selected(categories, value ?? 'mixed')}</select></label>
    <label><span id="count-label">Questions</span><select name="count" aria-labelledby="count-label"></select></label>
    <label>Time per question<select name="seconds">${selected([15, 20, 30, 45, 0].map(value => [value, value ? value + ' seconds' : 'No timer']), seconds)}</select></label></div>
    <input type="hidden" name="format" value="${configured ? state.format : 'mixed'}">
    <fieldset class="format-picks" id="format-field"><legend>Question types <small>Tick as many as you like</small></legend>
      <div class="format-picks-grid">${questionTypes.map(([id, name]) => `<label><input type="checkbox" name="questionType" value="${id}" ${formatTypes(configured ? state.format : 'mixed').includes(id) ? 'checked' : ''}><span>${name}</span></label>`).join('')}</div>
      <small class="error format-picks-note" id="format-note" aria-live="polite"></small></fieldset>
    <fieldset id="race-setup" class="race-setup"><legend>Quiz Race</legend><div class="form-row">
      <label>Race length<select name="raceLength">${selected([['short','Short · ~1 min'],['medium','Medium · ~2 min'],['long','Long · ~3 min']],raceSetup.raceLength ?? 'medium')}</select></label>
      <label>Track theme<select name="raceTrack">${selected([['neon','Neon Circuit'],['desert','Desert Run'],['snow','Snow Circuit'],['jungle','Jungle Trail'],['space','Space Route']],raceSetup.raceTrack ?? 'neon')}</select></label>
      <label>Difficulty<select name="raceDifficulty">${selected([['easy','Easy'],['medium','Medium'],['hard','Hard'],['mixed','Mixed']],raceSetup.raceDifficulty ?? 'mixed')}</select></label></div>
      <small>2–12 racers. Multiple-choice questions appear privately on phones. Fast correct answers boost speed. Easy/Hard use curated questions where available, supplemented by standard questions.</small></fieldset>
    <label id="score-interval-field">Leaderboard reveal<select name="scoreInterval" aria-label="Leaderboard reveal" aria-describedby="score-interval-help">${selected(scoreIntervals.map(value => [value, intervalLabels[value]]), interval)}</select>
      <small id="score-interval-help">Correct answers are still revealed after each question.</small></label>
    <div class="setup-presets" aria-label="Timing presets"><button type="button" class="button outline small" data-preset="quick">Quick game</button>
      <button type="button" class="button outline small" data-preset="relaxed">No rush</button></div>
    <fieldset class="scoring-fields" id="quiz-scoring"><legend>Quiz scoring</legend>
      <div class="form-row"><label>Points for a correct answer<select name="basePoints">${selected(pointValues.map(value => [value, value + ' points']), scoring.base)}</select></label>
      <label>Max speed bonus<select name="speedPoints">${selected(bonusValues.map(value => [value, value ? '+' + value + ' points' : 'Off']), scoring.bonus)}</select></label>
      <label>Double points<select name="doublePoints">${selected(doubleSchedules, scoring.doubles)}</select></label></div>
      <small>Double points apply to correct answers and their speed bonus. Dice Rally also applies its dice multiplier.</small></fieldset>
    <fieldset class="team-play-setup" id="team-play-setup"><legend>How are you playing?</legend>
      <div class="play-style-options" role="group" aria-label="Play style">
        <label><input type="radio" name="playStyle" value="individual" ${(configured ? state.playStyle : defaultPlayStyle(selectedMode)) === 'individual' ? 'checked' : ''}><span><b>Individual</b><small>Everyone plays for themselves</small></span></label>
        <label><input type="radio" name="playStyle" value="teams" ${(configured ? state.playStyle : defaultPlayStyle(selectedMode)) === 'teams' ? 'checked' : ''}><span><b>Teams</b><small>Balanced groups compete together</small></span></label>
      </div>
      <p id="team-play-help" class="team-play-help" aria-live="polite">Players will be assigned automatically when the game starts.</p>
    </fieldset>
    <label class="switch-row" id="private-field"><input type="checkbox" name="privateQuestions" ${!configured || state.privateQuestions || state.mode !== 'showdown' ? 'checked' : ''}>
      <span><strong>Private questions</strong><small>Deal a different question to each phone. The TV shows team scores.</small></span></label>
    <label id="team-count-field"><span id="team-count-label">Number of teams</span><select name="teamCount" aria-labelledby="team-count-label">${selected([[2, '2 teams'], [3, '3 teams'], [4, '4 teams']], configured ? state.teamCount : 2)}</select></label>
    <fieldset class="board-planner" id="board-planner" hidden><legend>Board &amp; timing</legend>
      <div class="form-row"><label>Board spaces<select name="boardLength">${selected(boardLengths.map(length => [length, length + ' spaces']), configured ? state.boardLength : 16)}</select></label>
      <label>Expected players<input name="plannedPlayers" type="number" min="1" max="300" value="${configured ? state.playerCount || state.teamCount : 4}"></label></div>
      <label id="board-speed-field">Max speed bonus<select name="boardSpeed">${selected(boardSpeedValues.map(value => [value, value ? '+' + value + '% of the die roll' : 'Off']), speed)}</select></label>
      <div class="route-preview" aria-hidden="true"></div>
      <p class="board-path-setup-note"><strong>Two paths at the fork:</strong> Power Lane = fewer spaces and ×2 points for the active team on its special tiles; Question Trail = four extra spaces and more turns to earn points.</p>
      <output class="duration-preview" aria-live="polite"></output>
      <small>Estimates use dice odds, question time and time between turns.</small>
    </fieldset>
    <label>Phone display<select name="phoneView">${selected([['answers', 'Answer buttons only · follow the TV'], ['full', 'Also show the full question · no TV needed']], configured ? state.phoneView : 'answers')}</select></label>
    <label>Visual style<select name="theme">${selected(themes, configured ? state.theme : previewTheme)}</select></label>
    <label class="switch-row"><input type="checkbox" name="autoReveal" ${configured && state.autoReveal ? 'checked' : ''}><span><strong>Auto-reveal answers</strong><small>Reveal when every eligible player has answered.</small></span></label>
    <label class="switch-row" id="christmas-field"><input type="checkbox" name="includeChristmas" ${configured && state.includeChristmas ? 'checked' : ''}><span>Include Christmas questions</span></label>
    <p class="settings-note" id="scoring-note" aria-live="polite"></p>
    <p class="error" role="alert"></p><button class="button primary" type="submit">${rematch ? 'Set up rematch' : configured ? 'Apply to lobby' : 'Create room'} ${icons('arrow-up-right')}</button></form>`;
    const form = content.querySelector('form');
    if (configured) {
      form.dataset.game = state.game;
      form.dataset.lobbyVersion = state.lobbyVersion;
    }
    let explained = selectedMode;
    let boardCapEdited = configured && state.mode === 'board';
    let scoringEdited = Boolean(configured && state.scoring);
    const update = (event) => {
      const game = form.elements.mode.value;
      if (explained !== game) {
        form.querySelector('.explainer-slot').innerHTML = setupPreview(game, true);
        if (event?.target?.name === 'mode') {
          const preferred = defaultPlayStyle(game);
          form.querySelector('[name="playStyle"][value="' + preferred + '"]').checked = true;
        }
        explained = game;
      }
      const party = partyModes.includes(game);
      const privateField = form.querySelector('#private-field');
      privateField.hidden = game !== 'showdown';
      const privateQuiz = game === 'showdown' && form.elements.privateQuestions.checked;
      form.elements.privateQuestions.disabled = game !== 'showdown';
      const board = game === 'board';
      const race = game === 'quizrace';
      const soClose = game === 'soclose';
      if(soClose){form.elements.difficulty.value='standard';}
      form.querySelector('#race-setup').hidden = !race;
      form.querySelector('#race-setup').disabled = !race;
      if(race){form.elements.seconds.value='0';form.elements.difficulty.value='standard';}
      // The ticked types become one canonical format; at least one stays ticked.
      const typeBoxes = [...form.querySelectorAll('[name="questionType"]')];
      let ticked = typeBoxes.filter(box => box.checked).map(box => box.value);
      let formatNote = '';
      if (!ticked.length) {
        const last = event?.target?.name === 'questionType' ? event.target : typeBoxes[0];
        last.checked = true;
        ticked = [last.value];
        formatNote = 'Keep at least one question type ticked.';
      }
      form.querySelector('#format-note').textContent = formatNote;
      form.elements.format.value = soClose ? 'estimate' : race ? 'choice' : formatId(ticked);
      const timed = form.elements.seconds.value !== '0';
      const scoreFields = form.querySelector('#quiz-scoring');
      scoreFields.hidden = !canSetScore(game);
      scoreFields.disabled = scoreFields.hidden;
      form.elements.speedPoints.closest('label').hidden = !timed;
      form.querySelector('#board-speed-field').hidden = !timed;
      if ([form.elements.basePoints, form.elements.speedPoints].includes(event?.target)) scoringEdited = true;
      if (!scoringEdited) {
        const points = defaultScoring(timed);
        form.elements.basePoints.value = points.base;
        form.elements.speedPoints.value = points.bonus;
      }
      const categoryField = form.querySelector('#category-field');
      const supportsCustom = fixedQuestionModes.includes(game) && !privateQuiz && !soClose;
      const trolley = game === 'tracks';
      const matching = game === 'samepage';
      const spotlight = game === 'spotlight';
      const brain = game === 'brain';
      const topAnswers = game === 'topanswers';
      const rare = game === 'rare';
      const creativeRounds = ['cards', 'punchline', 'bluff', 'sketch'].includes(game);
      const allowsTeams = teamPlayModes.includes(game);
      const teamOption = form.querySelector('input[name="playStyle"][value="teams"]');
      const soloOption = form.querySelector('input[name="playStyle"][value="individual"]');
      soloOption.disabled = trolley;
      teamOption.disabled = !allowsTeams;
      if (trolley) {
        teamOption.checked = true;
        form.elements.teamCount.value = '2';
      }
      for (const option of form.elements.teamCount.options) {
        option.disabled = trolley && option.value !== '2';
      }
      if (!allowsTeams && teamOption.checked) {
        form.querySelector('input[name="playStyle"][value="individual"]').checked = true;
      }
      const style = form.querySelector('input[name="playStyle"]:checked').value;
      form.querySelector('#team-count-field').hidden = style !== 'teams';
      form.querySelector('#team-count-label').textContent = trolley ? 'Exactly two teams' : 'Number of teams';
      const help = form.querySelector('#team-play-help');
      help.textContent = trolley ? 'One player becomes the Trolley Driver each round. Everyone else is reshuffled into two teams and votes for one of three cards per phase.'
        : matching ? 'Everyone writes a secret answer individually. Matching answers score points; there are no teams or predetermined correct answers.'
        : game === 'sketch' ? 'Players rotate as the artist, sketch on their phones, and guess from everyone’s live drawings. This mode scores individually.'
        : !allowsTeams ? 'This game has a shared vote or one-holder outcome, so it currently plays individually.'
        : style === 'teams' ? 'Choose 2–4 teams. Everyone who joins is assigned evenly when play starts; team scores use the average member score so a larger team has no advantage.'
        : board ? 'Every person races their own board piece, up to four racers.'
        : race ? 'Each person races independently for first place.' : 'Every player competes individually.';
      for (const option of form.elements.teamCount.options) option.textContent = option.value + ' teams';
      form.querySelector('#board-planner').hidden = !board;
      if (board && event?.target === form.elements.count) boardCapEdited = true;
      form.querySelector('#quiz-source').hidden = !supportsCustom;
      form.elements.quiz.disabled = !supportsCustom;
      const custom = supportsCustom && Boolean(form.elements.quiz.value);
      form.elements.difficulty.disabled = !supportsCustom || custom || race;
      form.querySelector('#difficulty-field').hidden = form.elements.difficulty.disabled;
      const curated = !form.elements.difficulty.disabled && form.elements.difficulty.value !== 'standard';
      categoryField.hidden = (!supportsCustom && !race && !soClose) || custom || curated;
      const formatField = form.querySelector('#format-field');
      formatField.hidden = custom || party || privateQuiz || curated || race || soClose;
      formatField.disabled = formatField.hidden;
      form.elements.count.closest('label').hidden = custom || (party && !matching && !spotlight && !brain && !topAnswers && !rare && !creativeRounds) || race;
      form.elements.seconds.closest('label').hidden = party || race;
      form.elements.autoReveal.closest('label').hidden = party || race;
      form.elements.phoneView.closest('label').hidden = party || privateQuiz || race;
      form.querySelector('.setup-presets').hidden = party || race || soClose;
      const scoreInterval = form.elements.scoreInterval;
      scoreInterval.disabled = !supportsScoreCheckpoints(game);
      scoreInterval.closest('label').hidden = scoreInterval.disabled;
      const christmasField = form.querySelector('#christmas-field');
      christmasField.hidden = (party && game !== 'potato') || custom || curated || (!categoryField.hidden && form.elements.category.value !== 'mixed');
      form.elements.includeChristmas.disabled = christmasField.hidden;
      form.querySelector('#count-label').textContent = board ? 'Maximum turns' : rare ? 'Rarity rounds' : topAnswers ? 'Room poll rounds' : brain ? 'Ladder height' : spotlight ? 'Turns per contestant' : trolley || matching || creativeRounds ? 'Rounds' : 'Questions';
      const counts = questionCounts(game, privateQuiz || curated ? 'choice' : form.elements.format.value, privateQuiz || curated ? 'mixed' : form.elements.category.value);
      const previous = Number(form.elements.count.value) || (configured ? state.total : 0);
      const spaces = Number(form.elements.boardLength.value);
      const pieces = style === 'individual' ? Math.min(4,Math.max(1,Number(form.elements.plannedPlayers.value)||1)) : Number(form.elements.teamCount.value);
      const players = Math.min(300, Math.max(1, Number(form.elements.plannedPlayers.value) || pieces));
      const preferred = board && !boardCapEdited ? suggestedTurnCap(spaces, Math.min(pieces, players)) : previous;
      form.elements.count.innerHTML = selected(counts.map(count => [count, brain ? count + ' levels' : spotlight ? count + ' ' + (count === 1 ? 'turn' : 'turns') + ' each' : count]), counts.includes(preferred) ? preferred : spotlight ? counts[0] : counts[1] ?? counts[0]);
      if (board) {
        const plan = boardDuration({ spaces, pieces, players, cap: Number(form.elements.count.value),
          seconds: Number(form.elements.seconds.value), autoReveal: form.elements.autoReveal.checked });
        form.querySelector('.duration-preview').textContent = 'About ' + durationLabel(plan) + ' · ' + plan.teams
          + (plan.teams === 1 ? ' piece' : ' pieces') + ' · ' + (plan.low === plan.high ? plan.low : plan.low + '–' + plan.high) + ' turns';
        form.querySelector('.route-preview').innerHTML = boardRoute(spaces, form.elements.includeChristmas.checked).slice(1).map(tile => {
          const color = categories.find(([id]) => id === tile.category)[4];
          return `<span style="--tile:${color}" title="${escape(tile.label)}">${tile.index}</span>`;
        }).join('');
      }
      const format = form.elements.format.value;
      const scoringNote = format === 'estimate' ? 'Closest guesses receive equal base points.'
        : form.elements.seconds.value === '0' ? 'No speed bonus.'
        : formatTypes(format).includes('estimate') ? 'Timed correct answers can earn a speed bonus. Closest guesses receive equal base points.'
        : 'Faster correct answers earn more.';
      form.querySelector('#scoring-note').textContent = soClose ? 'Closest guesses earn 100 points; exact guesses earn 200. No speed bonus.' : race ? 'You steer your speed with answers. Correct boosts you, Pass and wrong answers slow you down. First to finish wins.' : party ? (rare ? 'Everyone secretly enters a valid answer that the other players might not think of. A verified unique answer earns 200 points, a pair earns 100 each, three or more matches earn 50 each. Unrecognised answers need the TV host to review them before reveal. Choose 3, 5 or 7 rounds.' : topAnswers ? 'Everyone privately votes for their genuine favourite among four options. Then secretly predicts the room’s most popular answer. The TV reveals real room vote counts (never invented surveys). Score 20 per vote for your prediction, plus 100 when you predict a top-ranked option. Choose 3, 5 or 7 rounds.' : brain ? 'Climb 5, 7 or 10 original reasoning puzzles. Start with 2 lives; a missed or wrong answer costs 1 life. Each higher level earns more points, and eliminated players can watch the remaining climb.' : spotlight ? 'Everyone takes one contestant turn. A randomly selected expert suggests an answer first. Contestants earn 100 points for a correct answer; experts earn 40 for a correct suggestion. Choose one, two or three turns each, for up to twenty players.' : matching ? 'Write a short answer privately. Each other player who matches it earns you 100 points. Choose 3, 5 or 7 rounds.' : trolley ? 'Each round: two teams choose one of three cards in each phase (defend, sabotage, reinforce). The Trolley Driver pulls the lever. One round per player.' : game === 'bluff' ? 'Play 3, 5 or 7 rounds. One player per round never sees the secret prompt, and the bluff role rotates. A correct vote earns +100 points. If the bluff escapes the vote, they earn +100. Strict most votes catches the bluff; tied top votes let them escape.' : game === 'potato' ? 'Two or more players. The potato has one shared two-minute timer.' : creativeRounds ? 'Choose 3, 5 or 7 rounds. Players select cards or write punchlines privately, then vote on the funniest entry each round. The same room and cumulative scores continue throughout.' : 'Players use their phones to enter or vote.')
        : privateQuiz ? 'Each player gets a unique multiple-choice or True or False question in each round.'
        : custom ? 'Uses every question in the saved quiz in its authored order.'
        : curated ? 'A curated mixed-topic pack with multiple-choice questions.' : board
        ? 'Choose Power Lane for double points on its special tiles, or Question Trail for four extra question spaces. The dice set movement and question level.'
        : game === 'wheel' ? 'The wheel picks a different category until it has used them all. ' + scoringNote
        : game === 'dice' ? 'Two dice set the points multiplier for each question. ' + scoringNote
        : game === 'knockout' ? 'Wrong or missed answers cost a life. The last player standing wins.'
        : game === 'showdown' ? 'Balanced teams score the average of their players’ points each round.' : scoringNote;
    };
    form.addEventListener('click', event => {
      const preset = event.target.closest('[data-preset]');
      if (!preset) return;
      const quick = preset.dataset.preset === 'quick';
      form.elements.seconds.value = quick ? '15' : '0';
      if (quick) { form.elements.count.selectedIndex = 0; boardCapEdited = true; }
      update();
    });
    form.addEventListener('change', update);
    form.elements.plannedPlayers.addEventListener('input', update);
    update();
  } else if (mode === 'night') {
    playlistDraft = { queue: [...state.night.queue], version: state.night.version, game: state.game };
    content.innerHTML = playlistEditor(playlistDraft.queue, escape, icons, (state?.playerCount ?? 0) + (state?.waitingCount ?? 0));
  } else if (mode === 'library') {
    content.innerHTML = '<div id="quiz-library"></div>';
    openLibrary(content.firstElementChild, escape, id => {
      openDialog(state?.phase === 'lobby' && session ? 'configure' : state?.phase === 'finished' && session ? 'rematch' : 'host', 'mixed', undefined, id);
    });
  } else if (mode === 'practice') {
    if (!value && hasDemo(state?.mode)) showDemo(state.mode, 0);
    else showPractice(value ?? (samples[formatTypes(state?.format)[0]] ? formatTypes(state?.format)[0] : 'choice'));
  } else if (mode === 'themes') {
    content.innerHTML = `<div class="eyebrow">VISUAL STYLE</div><h2>Set the mood</h2><div class="theme-options">
      ${themes.map(([id, name, color, panel]) => `<button class="button outline" data-action="theme" data-theme="${id}" aria-pressed="${previewTheme === id}">
      <span style="--swatch:${color};--swatch-bg:${panel}"></span>${name}</button>`).join('')}</div>`;
  } else if (mode === 'recent-rooms') {
    const rooms = recentRooms().slice(0, 6);
    if (!rooms.length) return openDialog('join');
    content.innerHTML = `<div class="eyebrow">PLAYER CONTROLLER</div><h2>Resume a room</h2>
      <div class="recent-rooms">${rooms.map(room => `<button class="recent-room" data-action="resume-room" data-code="${room.code}">
        <span class="recent-room-icon">${icons('rotate-ccw')}</span><span><strong>${escape(room.name ? 'Play as ' + room.name : 'Room ' + room.code)}</strong>
        <small>${escape(modeName(room.mode) || 'Quiz Club')} · ${room.name ? 'Room ' + room.code : 'Saved on this browser'}</small></span>
        ${icons('chevron-right', 'recent-arrow')}</button>`).join('')}</div>
      <button class="button outline" data-action="join">Join another room</button>`;
  } else if (mode === 'join') {
    joinAvatar = undefined;
    const roomCode = parseRoomCode(String(value ?? ''));
    content.innerHTML = `<div class="join-intro">
      <div class="eyebrow">YOUR PHONE IS THE CONTROLLER</div>
      <h2>Join game night<span class="brand-dot">.</span></h2>
      <p>Ask the host for their six-digit room code, or scan their QR code to join directly.</p>
    </div>
    <div class="join-card" aria-hidden="true">
      <span class="join-card-avatar" data-join-avatar>?</span>
      <span class="join-card-copy"><small>PLAYER</small><strong data-join-name>Your name here</strong><small data-join-room>${roomCode ? 'Room ' + escape(roomCode) : 'Room ——————'}</small></span>
      <span class="join-card-stamp">${roomCode ? 'TICKET READY' : 'NEW PLAYER'}</span>
    </div>
    <form id="join-form" autocomplete="on">
      <label class="join-room-field" for="join-room-code">Room code
        <input id="join-room-code" name="code" value="${escape(roomCode)}" placeholder="123456"
          inputmode="numeric" autocomplete="off" enterkeyhint="next" pattern="[0-9]{6}" maxlength="6"
          aria-describedby="join-room-hint" required>
      </label>
      <small class="join-field-hint" id="join-room-hint">You can also paste a room invitation link here.</small>
      <label for="join-player-name">Your player name
        <input id="join-player-name" name="name" placeholder="What should we call you?" autocomplete="nickname"
          maxlength="24" enterkeyhint="go" required>
      </label>
      <details class="join-photo-option">
        <summary>Choose a player photo <span>(optional)</span></summary>
        <div class="selfie-picker"><img id="selfie-preview" class="player-avatar" alt="Your avatar preview" hidden>
          <label class="button outline small file-button">Take a selfie<input data-selfie type="file" accept="image/*" capture="user" aria-label="Take a selfie"></label>
          <label class="button outline small file-button">Choose photo<input data-selfie type="file" accept="image/*" aria-label="Choose photo"></label>
          <button type="button" class="button outline small" data-action="clear-selfie" hidden>Remove photo</button>
        </div>
        <small class="photo-privacy">Your photo is optional and only visible to players who have joined the same room.</small>
      </details>
      <p class="error" role="alert"></p>
      <button class="button primary join-room-submit" type="submit">Join the room ${icons('arrow-up-right')}</button>
    </form>
    ${recentRooms().length ? '<button class="text-button join-resume-link" data-action="recent-rooms">Resume a recent room</button>' : ''}`;
  } else {
    content.innerHTML = `<div class="eyebrow">QUIZ NIGHT</div><h2>How to play</h2><ol>
    <li>Host a game in the TV browser or connect a laptop to the TV. Choose a game mode and create a room.</li>
    <li>On each phone, scan the QR code or open the same site and enter the room code and a nickname.</li>
    <li>Start when everyone has joined. Tap answers on your phone. Board Race assigns teams automatically, and anyone on the active team can roll.</li>
    </ol><div class="actions"><button class="button primary" data-action="host">Host a game</button><button class="button outline" data-action="practice">Practice answers</button></div>`;
  }
  content.querySelector('h2').id = 'dialog-title';
  if (!dialog.open) dialog.showModal();
  else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    content.animate?.([{ opacity: .76, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 160, easing: 'ease-out' });
  }
}

async function api(path, body, key = session?.key) {
  const headers = key ? { 'x-game-key': key } : {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api/rooms' + path, { method: body === undefined ? 'GET' : 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  if (!response.ok) {
    const error = new Error((await response.json().catch(() => ({}))).error ?? 'Could not connect. Please try again.');
    error.status = response.status;
    throw error;
  }
  if (response.status !== 204) return response.json();
}

/** The join form's player card follows the name, room code and photo as you go. */
function updateJoinCard(form = document.querySelector('#join-form')) {
  const card = form?.closest('#dialog-content, dialog')?.querySelector('.join-card');
  if (!card) return;
  const name = form.elements.name.value.trim();
  const code = parseRoomCode(form.elements.code.value);
  card.querySelector('[data-join-name]').textContent = name || 'Your name here';
  card.querySelector('[data-join-room]').textContent = code ? 'Room ' + code : 'Room ——————';
  card.querySelector('.join-card-stamp').textContent = code && name ? 'TICKET READY' : code ? 'ADD YOUR NAME' : 'NEW PLAYER';
  card.toggleAttribute('data-ready', Boolean(code && name));
  const avatar = card.querySelector('[data-join-avatar]');
  avatar.style.backgroundImage = joinAvatar ? `url("${joinAvatar}")` : '';
  avatar.textContent = joinAvatar ? '' : (Array.from(name)[0] ?? '?').toUpperCase();
}
document.addEventListener('input', event => { if (event.target.closest?.('#join-form')) updateJoinCard(event.target.form); });

// What the connecting screen shows while the room answers.
let pendingJoin;

function startSession(next) {
  stream?.abort();
  stream = undefined;
  lastUpdate = 0;
  lastPoll = 0;
  reconnecting = false;
  nextConnect = 0;
  session = next;
  switchAvatarSession(next);
  tvFocus = false;
  state = undefined;
  draftKey = undefined;
  submittingAnswer = undefined;
  document.body.classList.add('playing');
  signature = undefined;
  saveRoomSession(next);
  rememberPlayer(next);
  history.replaceState(null, '', '/');
  dialog.close();
  boardDisplay?.dispose();
  boardDisplay = undefined;
  raceTrackView?.dispose(); raceTrackView = undefined; disposeRace3d();
  cancelAnimationFrame(raceAnimationFrame); raceAnimationFrame = 0;
  const joining = !next.host ? pendingJoin ?? { name: next.name } : undefined;
  pendingJoin = undefined;
  const initial = (Array.from(joining?.name ?? '')[0] ?? '').toUpperCase();
  app.innerHTML = `<section class="game connection-screen"><div class="connect-stage">
    <div class="connect-rings" aria-hidden="true"><i></i><i></i><i></i>
      <span class="connect-avatar"${joining?.avatar ? ` style="background-image:url('${joining.avatar}')"` : ''}>${next.host ? '📺' : joining?.avatar ? '' : escape(initial || '★')}</span></div>
    <div class="eyebrow">ROOM ${escape(next.code)}</div>
    <h1>${next.host ? 'Opening the studio' : 'Finding your seat'}<span class="connect-dots" aria-hidden="true"><b>.</b><b>.</b><b>.</b></span></h1>
    <p role="status">${next.host ? 'Setting up the big screen' : joining?.name ? `Getting ${escape(joining.name)} into the room` : 'Connecting to the room'}</p>
    <button class="button outline" data-action="leave">Cancel</button>
  </div></section>`;
  connect();
}

function leave() {
  closeWelcome();
  stopMusic();
  stream?.abort();
  stream = undefined;
  session = undefined;
  switchAvatarSession();
  tvFocus = false;
  submittingAnswer = undefined;
  raceSending = false; raceTrackView?.dispose(); raceTrackView = undefined; disposeRace3d();
  cancelAnimationFrame(raceAnimationFrame);raceAnimationFrame=0;
  document.body.classList.remove('playing');
  clearRoomSession();
  history.replaceState(null, '', '/');
  renderHome();
}

// A pasted invite URL (or a six-digit number) becomes a plain, validated room code.
document.addEventListener('input', event => {
  if (!event.target.matches('#join-form input[name="code"]')) return;
  const value = event.target.value;
  const compact = value.replace(/[^0-9]/g, '').slice(0, 6);
  if (value !== compact) event.target.value = compact;
});

document.addEventListener('paste', event => {
  if (!event.target.matches('#join-form input[name="code"]')) return;
  const code = parseRoomCode(event.clipboardData?.getData('text'));
  if (!code) return;
  event.preventDefault();
  event.target.value = code;
  event.target.form.elements.name.focus();
});

document.addEventListener('submit', async event => {
  const form = event.target;
  if(form.id==='sketch-guess-form'){
    event.preventDefault();
    await sendParty({action:'guess',text:form.elements.guess.value},form.querySelector('button'));
    return;
  }
  if (form.id === 'night-form') {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await api('/' + session.code + '/playlist', playlistDraft);
      dialog.close();
      await refresh();
    } catch (error) {
      form.querySelector('.error').textContent = error.message;
    } finally {
      submit.disabled = false;
    }
    return;
  }
  if (form.id === 'demo-form') {
    event.preventDefault();
    showDemo(practice.mode, practice.step + 1);
    return;
  }
  if (form.id === 'bluff-form') {
    event.preventDefault();
    await sendParty({ action: 'write', text: form.elements.reply.value }, form.querySelector('button'));
    return;
  }
  if (form.id === 'captain-form') {
    event.preventDefault();
    try {
      await api('/' + session.code + '/captain', { player: form.elements.player.value, game: state.game });
      await refresh();
    } catch (error) {
      document.querySelector('#game-error').textContent = error.message;
    }
    return;
  }
  if (!['host-form', 'join-form', 'configure-form', 'rematch-form'].includes(form.id)) return;
  event.preventDefault();
  const button = form.querySelector('button:not([type="button"])');
  button.disabled = true;
  const { mode, theme, format, category, count, seconds, code, name, autoReveal, includeChristmas, phoneView, quiz, teamCount, boardLength, playStyle, privateQuestions, difficulty, basePoints, speedPoints, doublePoints, boardSpeed, scoreInterval, raceLength, raceTrack, raceDifficulty } = Object.fromEntries(new FormData(form));
  try {
    const customQuiz = quiz && quiz !== 'current' ? savedQuizzes().find(entry => entry.id === quiz) : undefined;
    const curated = difficulty && difficulty !== 'standard';
    const scoring = basePoints ? { base: Number(basePoints), bonus: Number(speedPoints), doubles: doublePoints } : undefined;
    const settings = { mode, playStyle, theme, difficulty, raceLength, raceTrack, raceDifficulty, scoring, scoreInterval: scoreInterval === undefined ? undefined : Number(scoreInterval), boardSpeed: boardSpeed === undefined ? undefined : Number(boardSpeed), format: curated ? 'choice' : format, category: curated ? 'mixed' : category, phoneView, teamCount: Number(teamCount), boardLength: Number(boardLength), customQuiz, useRoomQuiz: quiz === 'current', count: Number(count), privateQuestions: privateQuestions === 'on', seconds: Number(seconds), autoReveal: autoReveal === 'on', includeChristmas: includeChristmas === 'on' };
    if (form.id === 'rematch-form' || form.id === 'configure-form') {
      const action = form.id === 'rematch-form' ? 'rematch' : 'configure';
      await api('/' + session.code + '/' + action, { ...settings, game: Number(form.dataset.game), lobbyVersion: Number(form.dataset.lobbyVersion) });
      dialog.close();
      await refresh();
    } else if (form.id === 'host-form') {
      const room = await api('', settings);
      startSession({ code: room.code, key: room.host, host: true });
    } else {
      const known = rememberedPlayer(code);
      if (known) {
        startSession(known);
        return;
      }
      const player = await api('/' + code + '/join', { name, avatar: joinAvatar, seenQuestions: readQuestionHistory(), returning: isReturning() });
      pendingJoin = { name, avatar: joinAvatar };
      startSession({ code, key: player.key, host: false });
    }
  } catch (error) {
    form.querySelector('.error').textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

const sameRank = (a, b) => a.score === b.score && a.lives === b.lives;
const rankOf = (players, player) => players.findIndex(entry => sameRank(entry, player)) + 1;
const lifeLabel = lives => lives === 1 ? '1 life' : lives + ' lives';
const leaderboard = players => `<ol class="ranking">${players.map(player => `<li><span>${avatarView(player, escape)}${rankOf(players, player)}. ${escape(player.name)}</span>
  <strong>${player.lives === undefined ? '' : lifeLabel(player.lives) + ' · '}${player.score.toLocaleString()} pts</strong></li>`).join('')}</ol>`;

function fullLeaderboard(players, title) {
  if (players.length <= 12) return leaderboard(players);
  return leaderboard(players.slice(0, 10)) + `<details class="review-details"><summary>${title} · ${players.length} players</summary>${leaderboard(players)}</details>`;
}

function standings(players) {
  return players.slice(0, 3).map((player, index) => {
    const rank = rankOf(players, player);
    return `<div class="podium-place place-${index + 1}"><span>${rank === 1 ? '★' : '#' + rank}</span>
      <strong>${escape(player.name)}</strong><small data-count-up>${player.score.toLocaleString()} pts</small></div>`;
  }).join('');
}

function responseTarget(state) {
  return state.responseTarget ?? state.playerCount;
}

function showsScoresEachQuestion(s) {
  return (s.scoreInterval ?? 1) === 1;
}

function nextQuestionLabel(s) {
  if (s.phase !== 'reveal') return 'Reveal answer';
  if (s.lastTurn) return 'See final results';
  if (s.scoreCheckpointNext) return 'Show leaderboard';
  return s.mode === 'board' ? 'Next turn' : 'Next question';
}

function checkpointNote(s) {
  if (s.phase !== 'reveal' || showsScoresEachQuestion(s) || s.lastTurn) return '';
  if (s.scoreCheckpointNext) return '<p class="checkpoint-note">Leaderboard up next</p>';
  if (s.scoreInterval > 1) {
    const next = (Math.floor((s.index + 1) / s.scoreInterval) + 1) * s.scoreInterval;
    if (next < s.total) return `<p class="checkpoint-note">Leaderboard after ${s.mode === 'board' ? 'turn' : 'question'} ${next}</p>`;
  }
  return '';
}

function tvRoundHud(s, timer, progress, host) {
  if (!host) return '';
  const revealed = s.phase === 'reveal';
  // The TV sidebar carries the standings; a second full-width board used to
  // squeeze the question panel until its answers were cut off at 720p.
  const leaders = revealed && showsScoresEachQuestion(s) && !s.teams.length ? s.players.slice(0, 8) : [];
  const groupPlay = showsScoresEachQuestion(s) && s.teams.length && s.mode !== 'board';
  return `<aside class="tv-round-hud">
    <section class="game-panel tv-status">
      <div class="eyebrow">${revealed ? 'ROUND COMPLETE' : 'LIVE ROUND'}</div>
      ${timer || `<strong class="tv-status-title">${revealed ? 'Answer revealed' : 'No timer'}</strong>`}
      <p class="status" id="host-answer-count" role="status">${answerCount(s)}</p>${progress}${lockRail(s, escape, avatarView)}
    </section>
    ${groupPlay ? `<section class="game-panel tv-leaders"><div class="eyebrow">TEAM SCORES</div>${teamScoreboard(s.teams)}</section>` : ''}
    ${leaders.length ? `<section class="game-panel tv-leaders"><div class="eyebrow">${s.players.length > leaders.length ? 'TOP SCORES' : 'LEADERBOARD'}</div>${leaderboard(leaders)}${s.players.length > leaders.length ? `<p class="tv-leaders-more">+${s.players.length - leaders.length} more players</p>` : ''}</section>` : ''}
  </aside>`;
}

function phaseCaption(s) {
  if (s.pausedAt) return 'Timer paused';
  if (s.phase === 'ready') return s.mode === 'wheel' ? 'Ready to spin' : 'Ready to roll';
  if (s.phase === 'rolling') return s.mode === 'wheel' ? 'Wheel spinning' : 'Dice rolling';
  // The caption must not announce the answer while So Close guesses are still showing.
  if (s.mode === 'soclose' && s.phase === 'reveal' && s.estimateReveal?.stage !== 'results') return 'The big reveal';
  return {
    lobby: 'Lobby open',
    waiting: 'Queued to join',
    question: 'Question live',
    reveal: 'Answer revealed',
    'score-break': 'Leaderboard checkpoint',
    'party-build': 'Build your track',
    'party-placed': 'Cards revealed on the tracks',
    'party-judge': 'Judge chooses track',
    'party-write': s.mode === 'cards' ? 'Choose a card' : s.mode === 'samepage' ? 'Write your matching answer' : 'Write a reply',
    'party-vote': 'Voting open',
    'party-reveal': s.mode === 'samepage' ? 'Matching answers revealed' : s.mode === 'bluff' ? 'The bluff is revealed' : 'Votes revealed',
    'spotlight-ready': 'Contestant enters the spotlight',
    'spotlight-expert': 'Expert advice in progress',
    'spotlight-answer': 'Contestant final answer',
    'spotlight-reveal': 'Spotlight answer and scores',
    'brain-question': 'Brain Ladder challenge',
    'brain-reveal': 'Brain Ladder solution',
    'top-poll': 'Live room poll',
    'top-guess': 'Predict the most popular choice',
    'top-reveal': 'Real room vote reveal',
    'rare-write': 'Rare Find entries open',
    'rare-review': 'Host reviewing unusual Rare Find answers',
    'rare-reveal': 'Real Rare Find answer reveal',
    'party-potato': 'Potato in play',
    'blood-roles': 'Secret roles dealt',
    'blood-night': 'Night: choose on your phone',
    'blood-dawn': 'Dawn',
    'blood-day': 'The village debates',
    'blood-vote': 'The village votes',
    'blood-verdict': 'The verdict',
    'sketch-draw': 'Artist drawing',
    'sketch-reveal': 'Drawing revealed',
    'race-countdown': 'Race about to start',
    race: 'Quiz Race in progress',
    finished: 'Final results',
  }[s.phase];
}

// Decorative celebration for genuine winning moments; keys stop repeats on re-render.
function celebrateMoment(s, host, enter, result, held = 0) {
  const view = app.querySelector('.game');
  if (!view) return;
  const key = `${s.code}/${s.game}`;
  if (s.phase === 'finished') {
    if (enter) countUp(view);
    if (host && !document.querySelector('#post-ceremony[hidden]')) celebrate(key + '/finale', { source: view, origin: 'sides' });
    const teamWin = s.teams?.length && s.teamWinners?.includes(s.player?.team);
    if (!host && enter && (s.rank === 1 || teamWin)) celebrate(key + '/finale/player', { source: view, intensity: .45 });
  } else if (!host && enter && result === 'win' && !held) {
    celebrate(`${key}/${s.index}/round`, { source: view, intensity: .22 });
  }
}

function render(s) {
  const { host } = session;
  const showLiveScores = showsScoresEachQuestion(s);
  const won = s.answerCorrect ?? Boolean(s.earned);
  const canControl = host || s.isCaptain;
  const controllerOnly = !host && s.phoneView === 'answers';
  const canPause = canControl && ((s.ends && ['question', 'party-potato'].includes(s.phase)) || (s.mode === 'quizrace' && ['race','race-countdown'].includes(s.phase)));
  const pauseButton = canPause ? `<button class="button outline small" data-action="clock">
    ${icons('pause')} Pause timer</button>` : '';
  setTheme(s.theme);
  const board = s.mode === 'board';
  const showdown = s.mode === 'showdown';
  const rally = s.mode === 'dice';
  const knockout = s.mode === 'knockout';
  const eliminated = knockout && s.player?.lives === 0;
  const team = s.teams[s.activeTeam];
  const ownTeam = s.teams[s.player?.team];
  let body;
  let timer = '';
  if (s.phase === 'waiting') {
    body = `<section class="game-panel waiting-panel"><div class="eyebrow">ROOM ${s.code}</div>
      <h1>You’re on the list, ${escape(s.player.name)}<span class="brand-dot">.</span></h1>
      <p>The current game is underway. Keep this open and you’ll join the next lobby automatically.</p>
    </section>`;
  } else if (s.mode === 'quizrace' && s.race && ['race-countdown', 'race', 'finished'].includes(s.phase)) {
    body = quizRaceView({...s, categoryName: categoryName(s.category)}, {host,canControl,icons,replayButtons,sending:raceSending});
  } else if (s.pausedAt) {
    body = `<section class="game-panel round-break">
      <span class="pause-mark">${icons('pause')}</span><div class="eyebrow">ROUND ON HOLD</div><h1>Timer paused<span class="brand-dot">.</span></h1>
      <div class="break-clock"><span class="timer" id="timer"></span><span>left in this round</span></div>
      <p>${s.selection !== undefined ? 'Your answer is locked in.' : 'The round continues when the host or captain resumes.'}</p>
      ${canControl ? `<div class="actions"><button class="button primary" data-action="clock">${icons('play')} Resume timer</button></div>` : ''}
    </section>`;
  } else if (s.party) {
    body = partyView(s, { host, canControl, escape, icons, reply: partyReply });
    if (s.phase === 'party-potato' && pauseButton) body = `<div class="round-pace">${pauseButton}</div>` + body;
    if (s.phase === 'party-potato' && !host) timer = '<span class="timer potato-timer" id="timer"></span>';
  } else if (s.phase === 'lobby' && s.picker) {
    body = host ? pickerTv(s, { escape, canDrive: true }) : pickerPhone(s, { escape, canDrive: s.isCaptain });
  } else if (s.phase === 'lobby') {
    body = lobbyView(s, { host, escape, icons, modeName });
    const types = s.quizTypes ?? (s.format === 'mixed' ? helpTypes : formatTypes(s.format));
    if (!partyModes.includes(s.mode)) body += `<section class="game-panel lobby-guide"><h2>How to answer</h2><dl>${types.map(type => {
      const [label, description] = answerGuide(type);
      return `<div><dt>${label}</dt><dd>${description}</dd></div>`;
    }).join('')}</dl></section>`;
  } else if (s.phase === 'ready' || s.phase === 'rolling') {
    const rolling = s.phase === 'rolling';
    const canRoll = board ? host || ownTeam?.id === team.id : canControl;
    const needsPath = board && !rolling && boardRequiresChoice(s.boardLength,team.position,team.pathChoice);
    const action = board || rally ? 'Roll the dice' : 'Spin the wheel';
    const title = board ? `${escape(team.name)}’s turn` : rally ? (rolling ? 'Dice in motion' : 'Roll for points') : rolling ? 'Spinning the wheel' : 'Spin for a category';
    const status = rolling ? (board ? 'Watch the die drop through the tower.' : rally ? 'Rolling the dice…' : 'Choosing a category…')
      : board ? needsPath ? 'Your team has reached a fork. Choose a path before rolling.' : 'The die sets the move, base points, and question level. Every team answers the landing square’s genre.' : rally ? 'The dice set the multiplier for everyone’s correct answers.' : 'The wheel picks the next topic.';
    body = `<div class="game-panel turn-panel ${board || rally ? 'board-turn' : 'wheel-turn'}">
      ${host ? board ? boardView(s) : rally ? diceView(s) : wheelView(s) : ''}
      <div class="turn-copy"><div class="eyebrow">${board ? 'TURN' : 'QUESTION'} ${s.index + 1} OF ${s.total}</div>
        <h1>${title}</h1>
        ${ownTeam ? `<p class="your-team" style="--team:${ownTeam.color}">You’re on Team ${ownTeam.name}</p>` : ''}
        <p role="status">${status}</p>
        ${board ? teamList(rolling ? { ...s, teams: s.teams.map(entry => entry.id === s.activeTeam ? { ...entry, position: s.motion.from } : entry) } : s, ownTeam?.id) : ''}
        ${rally ? '<div class="dice-rules"><span>2–6 <b>×1</b></span><span>7–10 <b>×2</b></span><span>11–12 <b>×3</b></span></div>' : ''}
        ${needsPath ? `<div class="board-path-picker"><h2>Choose your route</h2><p>Both lanes rejoin before the finish. Which will you take?</p>
          <div class="board-path-options">${boardPathChoices.map(option => `<button class="board-path-option ${option.id}" type="button" data-action="board-path" data-path="${option.id}"
          ${!canRoll ? 'disabled' : ''}><b>${option.name}</b><small>${option.detail}</small></button>`).join('')}</div></div>` : ''}
        ${board && team.pathChoice && !rolling ? `<p class="board-route-selected">Route chosen: <strong>${team.pathChoice === 'power' ? 'Power Lane · ×2 points' : 'Question Trail · +4 spaces'}</strong></p>` : ''}
        ${!rolling && canRoll && !needsPath ? `<button class="button primary" data-action="roll">${icons(board ? 'dice-5' : rally ? 'dices' : 'disc-3')} ${action}</button>` : ''}
        ${board ? boardPrediction(s, host) : ''}
        ${!rolling && !canRoll ? `<p class="turn-wait">${board ? 'Waiting for ' + (s.playStyle === 'individual' ? '' : 'Team ') + escape(team.name) + ' to roll.' : rally ? 'Waiting for the captain to roll.' : 'Waiting for the captain to spin.'}</p>` : ''}
      </div></div>`;
  } else if (s.phase === 'score-break') {
    body = scoreBreakView(s, { host, canControl, escape, icons });
  } else if (s.phase === 'finished') {
    const winners = s.players.filter(player => sameRank(player, s.players[0]));
    const winningTeams = s.teams.length ? s.teams.filter(team => s.teamWinners.includes(team.id)) : [];
    const title = board ? winningTeams.length === 1
        ? (s.playStyle === 'individual' ? escape(winningTeams[0].name) : 'Team ' + escape(winningTeams[0].name)) + ' wins the race!'
        : 'The race ends in a tie!'
      : s.playStyle === 'teams' ? winningTeams.length === 1 ? 'Team ' + escape(winningTeams[0].name) + ' wins!' : 'The teams are tied!'
      : winners.length === 1 ? escape(winners[0].name) + ' takes the crown!' : 'It’s a tie!';
    body = `<div class="game-panel results"><div class="eyebrow">FINAL RESULTS</div><h1>${title}</h1>
      ${host ? winnerBanner(s, escape) : playerFinish(s)}
      ${board ? teamList(s, ownTeam?.id, true) : s.teams.length ? teamScoreboard(s.teams, ownTeam?.id) : ''}
      ${s.teams.length ? '<h2>Individual scores</h2>' : ''}
      ${host ? `<div class="podium">${standings(s.players)}</div>` : ''}
      ${!host ? `<dl class="personal-scorecard"><div><dt>Rounds won</dt><dd>${s.player.wins} / ${s.index + 1}</dd></div><div><dt>Best streak</dt><dd>${s.player.bestStreak}</dd></div><div><dt>Final rank</dt><dd>#${s.rank}</dd></div></dl>` : ''}
      ${!host && s.playerCount > s.players.length ? '<h2>Top 10</h2>' : ''}${fullLeaderboard(s.players, 'Full standings')}${s.review.length ? reviewView(s.review, escape, formatNumber) : ''}<div class="actions">${canControl ? replayButtons(s, icons) : `<button class="button outline" data-action="leave">Back to home ${icons('arrow-right')}</button>`}</div>
      ${host ? '' : '<p class="status">Stay here if the captain or host starts a rematch.</p>'}</div>`;
  } else if(s.mode==='soclose' && s.phase==='reveal' && s.estimateReveal){
    body=`<div class="game-panel so-close-broadcast"><div class="eyebrow">ROUND ${s.index+1} OF ${s.total}</div><p class="so-close-reveal-prompt">${controllerOnly?'Round results':escape(s.question.prompt)}</p><div id="so-close-frame" aria-live="polite"></div>${canControl?`<div class="actions so-close-reveal-actions"><button class="button outline" data-action="estimate-reveal-skip">Skip to results</button><button class="button primary" data-action="advance" hidden>${nextQuestionLabel(s)} ${icons('arrow-right')}</button></div>`:''}</div>`;
  } else if (host && s.privateQuestions) {
    const revealed = s.phase === 'reveal';
    timer = !revealed && s.ends ? '<div class="tv-clock"><span class="timer" id="timer"></span><small>TIME LEFT</small></div>' : '';
    const response = !revealed ? `<progress id="response-progress" class="response-progress" value="${s.answered}" max="${Math.max(1, responseTarget(s))}" aria-label="Players who answered"></progress>` : '';
    body = `<div class="tv-round"><div class="game-panel question-panel">
      <div class="eyebrow">PRIVATE QUESTIONS · ROUND ${s.index + 1} OF ${s.total}</div>
      <h2>${revealed ? 'Round complete' : 'Questions are on your phones'}</h2>
      <p>Each player gets a different question on their phone.</p>
        <p class="round-value"><strong>${s.scoring.base.toLocaleString()} base points</strong>${s.ends && s.scoring.bonus ? `<span>Up to +${s.scoring.bonus.toLocaleString()} for speed</span>` : ''}${s.boost > 1 ? '<span>×2 this round</span>' : ''}</p>
      ${checkpointNote(s)}<div class="round-footer">${pauseButton}<button class="button primary" data-action="advance">${nextQuestionLabel(s)}</button></div>
      </div>${tvRoundHud(s, timer, response, host)}</div>`;
  } else {
    const revealed = s.phase === 'reveal';
    const locked = s.selection !== undefined;
    const sending = submittingAnswer?.game === s.game && submittingAnswer?.index === s.index;
    const selection = s.selection ?? (sending ? submittingAnswer.option : undefined);
    const question = s.question;
    const special = ['estimate', 'order'].includes(question.type);
    const key = `${s.game}/${s.index}`;
    if (draftKey !== key) {
      draftKey = key;
      draft = createDraft(question);
    }
    const base = question.basePoints;
    const bonusMax = s.ends && question.type !== 'estimate' ? board ? base * s.boardSpeed / 100 : s.scoring?.bonus : 0;
    const scoringLine = base ? `<p class="round-value"><strong>${base.toLocaleString()} base ${base === 1 ? 'point' : 'points'}</strong>
      ${bonusMax ? `<span>Up to +${bonusMax.toLocaleString()} for speed</span>` : ''}${s.boost > 1 ? '<span>×2 this round</span>' : ''}</p>` : '';
    timer = !revealed && s.ends
      ? host ? '<div class="tv-clock"><span class="timer" id="timer"></span><small>TIME LEFT</small></div>'
        : '<span class="player-timer" aria-label="Time remaining"><span class="player-timer-label">TIME LEFT</span><span class="timer" id="timer"></span></span>'
      : '';
    const deathNote = s.knockoutNote === 'spared' ? ' · Nobody left standing, so nobody is out' : s.knockoutNote === 'slowest' ? ' · All correct: the slowest answer loses a heart' : '';
    const lifeInfo = knockout ? `${s.suddenDeath !== undefined ? `<p class="sudden-death" role="status"><strong>SUDDEN DEATH</strong> Wrong, or slowest when everyone is right, loses a heart${deathNote}</p>` : deathNote ? `<p class="sudden-death" role="status">${deathNote.slice(3)}</p>` : ''}<p class="life-info">${host ? s.remaining + ' still in' : phoneHearts(s) + (s.knockedOut ? 'Knocked out!' : eliminated ? 'Out of lives · Spectating' : lifeLabel(s.player.lives) + ' left')}</p>` : '';
    const answerStatus = eliminated ? 'Watch the rest of the game, then join the rematch.' : locked ? 'Answer locked in. Waiting for the reveal…' : sending ? 'Sending your answer…' : s.ends ? 'Tap your answer before time runs out.' : 'Choose an answer to lock it in.';
    const revealStatus = won ? (question.type === 'estimate' ? 'Closest guess!' : 'Correct!')
        + (showLiveScores && s.earned ? ` +${s.earned.toLocaleString()} ${s.earned === 1 ? 'point' : 'points'}.` : '')
      : knockout ? eliminated ? 'You’re out of lives.' : 'You lost a life.'
      : locked ? question.type === 'estimate' ? 'Another guess was closer.' : 'Incorrect.' : 'Question closed.';
    const response = host && !revealed
      ? `<progress id="response-progress" class="response-progress" value="${s.answered}" max="${Math.max(1, responseTarget(s))}" aria-label="Players who answered"></progress>` : '';
    const promptHelp = !revealed ? `<p class="question-guide">${host && special ? 'On your phone: ' : ''}${s.mode === 'soclose' ? 'Swipe the number wheel or enter a number, then lock in your guess.' : answerGuide(question.type)[1]}</p>` : '';
    const playerFeedback = !host && (revealed || locked || sending || eliminated)
      ? `<div class="player-answer-feedback" role="status" data-feedback="${revealed ? won ? 'correct' : 'incorrect' : eliminated ? 'spectating' : locked ? 'locked' : 'sending'}">
        <span class="feedback-mark" aria-hidden="true">${revealed ? won ? '✓' : '!' : eliminated ? '•' : locked ? '✓' : '…'}</span>
        <span><strong>${revealed ? won ? 'Correct answer!' : 'Round complete' : eliminated ? 'Spectating' : locked ? 'Answer locked in' : 'Sending your answer'}</strong>
        <small>${revealed ? revealStatus : eliminated ? 'You can watch the remaining rounds.' : locked ? 'You can relax while everyone else finishes.' : 'Hold on while we save your choice.'}</small></span>
        ${revealed && won && showLiveScores && s.earned ? `<b class="points-pop" aria-hidden="true">+${s.earned.toLocaleString()}</b>` : ''}
      </div>` : '';
    body = `${host ? '<div class="tv-round">' : ''}<div class="game-panel question-panel ${revealed ? 'is-reveal' : ''}">
      <div class="eyebrow round-kicker"><span>${board ? 'TURN' : 'QUESTION'} ${s.index + 1} OF ${s.total}</span>
        <span>${escape(s.quizTitle || categoryName(question.category))}</span><span>${answerGuide(question.type)[0]}</span></div>
      ${board || rally ? rollRecap(s) : ''}${board ? boardPrediction(s, host) : ''}${scoringLine}${lifeInfo}
      ${ownTeam && s.playStyle === 'teams' ? `<p class="your-team" style="--team:${ownTeam.color}">Team ${escape(ownTeam.name)}${showLiveScores ? ' · ' + ownTeam.score.toLocaleString() + ' pts' : ''}</p>` : ''}
      <h2>${controllerOnly ? (revealed ? 'Answer revealed' : 'Look at the TV') : escape(s.question.prompt)}</h2>
      ${playerFeedback}
      ${timer && !host ? '<div class="time-track" aria-hidden="true"><div id="time-fill"></div></div>' : ''}
      ${promptHelp}
      ${s.mode === 'soclose' ? soCloseView(question,{draft,selection,revealed,host,disabled:eliminated || sending,closest:s.closest,guesses:s.estimateGuesses},escape) : special ? specialAnswer(question, { draft, selection, revealed, host, disabled: eliminated || sending, closest: s.closest }, escape) : `<div class="answers ${s.question.options.length === 2 ? 'binary-answers' : ''}">${s.question.options.map((option, index) => `<button style="--answer:${colors[index]};--share:${s.breakdown && s.answered ? s.breakdown[index] * 100 / s.answered : 0}%" class="answer ${selection === index ? 'selected' : ''} ${revealed && s.question.correct === index ? 'correct' : ''}"
       data-dim="${revealed ? s.question.correct !== index : !host && selection !== undefined && selection !== index}" data-action="answer" data-option="${index}" ${host || revealed || locked || sending || eliminated ? 'disabled' : ''}>
      <strong>${'ABCD'[index]}</strong><span>${escape(option)}${revealed && s.question.correct === index ? '<b class="answer-tick" aria-hidden="true"> ✓</b>' : ''}</span>
      ${s.breakdown ? `<small class="answer-count"><b class="vote-share">${s.answered ? Math.round(100 * s.breakdown[index] / s.answered) : 0}%</b><span>${s.breakdown[index]} ${s.breakdown[index] === 1 ? 'vote' : 'votes'}</span></small>` : ''}</button>`).join('')}</div>`}
      ${revealed && s.question.source ? `<a class="question-source" href="${escape(s.question.source)}" target="_blank" rel="noopener noreferrer">Verified answer source</a>` : ''}
       ${checkpointNote(s)}<div class="round-footer">${host ? '' : `<div class="round-status"><p class="status" ${playerFeedback ? '' : 'role="status"'}>${revealed ? revealStatus + (showLiveScores ? ' Total: ' + s.player.score.toLocaleString() + ' pts.' : '') : answerStatus}</p>${revealed && s.player.streak >= 2 ? `<span class="streak-tag">${s.player.streak} in a row</span>` : ''}</div>`}
      ${pauseButton}
      ${canControl ? `<button class="button primary captain-next" data-action="advance">${nextQuestionLabel(s)} ${icons('arrow-right')}</button>` : ''}</div>
      </div>${host && knockout ? knockoutLadder(s, escape) : ''}${tvRoundHud(s, timer, response, host)}${host ? '</div>' : ''}${revealed && board && showLiveScores ? `<div class="game-panel round-leaders"><h2>Race standings</h2>${teamList(s, ownTeam?.id, true)}</div>` : ''}
`;
  }
  if (s.phase === 'finished') {
    const nextUp = gameNightView(s, { canControl, escape, icons });
    if (s.ceremony && host) {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      ceremonyFrames = revealFrames(s.players, s.awards);
      const playing = !reduced && !s.ceremony.skipped && currentFrame(ceremonyFrames, Date.now() + offset - s.ceremony.starts) >= 0;
      body = scoreReveal(playing, s) + `<div id="post-ceremony" ${playing ? 'hidden' : ''}>${s.night.queue.length ? nextUp : ''}
        ${body}${awardView(s.awards, escape, icons)}${s.night.queue.length ? '' : nextUp}</div>`;
    } else {
      body = (s.night.queue.length ? nextUp : '') + body + awardView(s.awards, escape, icons) + (s.night.queue.length ? '' : nextUp);
    }
  } else if (['lobby', 'waiting'].includes(s.phase) && !s.picker) body += gameNightView(s, { canControl, escape, icons });
  const phaseKey = `${s.code}/${s.game}/${s.index}/${s.phase}${s.pausedAt ? '/paused' : ''}${s.party?.holding || s.party?.type === 'fork' ? '/' + s.party.step : ''}`;
  const enter = renderedPhase !== phaseKey;
  // TV broadcast stings: the show's title card at kick-off, a band before the last round.
  const stingKind = enter ? stingFor(renderedPhase, s, host) : null;
  if (enter) playSting(stingKind, s, { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    // The title card plays the game's own musical sting.
    onStart: () => { if (!soundEnabled) return; if (stingKind === 'title') playSfx(sound, 'sting-' + s.mode, { volume: 0.5 }); else playCue(sound, s.mode, 'rolling'); } });
  const animateRoll = Boolean(boardDisplay && s.phase === 'rolling' && renderedPhase === `${s.code}/${s.game}/${s.index}/ready`);
  renderedPhase = phaseKey;
  const stage = enter && !animateRoll ? null : app.querySelector('#board-stage, .wheel-frame');
  const backdrop = enter ? null : app.querySelector('.scene-backdrop');
  const focused = document.activeElement;
  const guideWasOpen = !enter && !host && s.phase === 'lobby' && Boolean(app.querySelector('.player-game-guide')?.open);
  const guideHadFocus = guideWasOpen && Boolean(focused?.closest('.player-game-guide'));
  // Re-rendering an unchanged live phase must not jump the player to the top
  // while they're reading a long ballot, writing an answer or drawing.
  const playerScroll = !enter && !host && !['lobby', 'waiting'].includes(s.phase) ? app.scrollTop : null;
  const rosterScroll = enter ? 0 : app.querySelector('.players')?.scrollTop;
  const lobbyAction = !enter && s.phase === 'lobby' && app.contains(focused) && focused.matches('button[data-action]') ? focused.dataset.action : undefined;
  const captainSelect = !enter && focused?.matches('#captain-form select') ? focused.value : undefined;
  const writing = !enter && focused?.matches('#bluff-form textarea')
    ? [focused.selectionStart, focused.selectionEnd] : undefined;
  const showProgress = ['sketch-draw','sketch-reveal','ready', 'rolling', 'question', 'reveal', 'score-break', 'party-build', 'party-placed', 'party-judge', 'party-write', 'party-vote', 'party-reveal', 'spotlight-ready', 'spotlight-expert', 'spotlight-answer', 'spotlight-reveal', 'brain-question', 'brain-reveal', 'top-poll', 'top-guess', 'top-reveal', 'rare-write', 'rare-review', 'rare-reveal'].includes(s.phase) && s.total > 1;
  const caption = phaseCaption(s);
  const boost = s.boost > 1 && ['ready', 'rolling', 'question', 'reveal'].includes(s.phase)
    ? `<span class="score-boost">${icons('zap')} Double points</span>` : '';
  const mode = modes.find(([id]) => id === s.mode);
  const result = !host && s.phase === 'reveal' && s.mode!=='soclose' ? won ? 'win' : s.selection !== undefined ? 'miss' : 'skip'
    : !host && s.phase === 'question' && s.selection !== undefined ? 'locked' : '';
  const completed = ['reveal', 'score-break', 'party-reveal','sketch-reveal'].includes(s.phase) ? s.index + 1 : s.index;
  const track = showProgress ? `<div class="round-track" role="img" aria-label="${completed} of ${s.total} rounds completed">
    ${Array.from({ length: s.total }, (_, index) => `<i class="${index < completed ? 'done' : index === s.index ? 'current' : ''}"></i>`).join('')}</div>` : '';
  // Once play starts, the TV is locked to the game: chrome hides until summoned.
  const immersive = host && !['lobby', 'waiting'].includes(s.phase);
  // While the lobby carousel is open, every screen wears the browsed game's look.
  const shownMode = s.phase === 'lobby' && s.picker ? s.picker.mode : s.mode;
  app.innerHTML = `<section class="game ${host ? 'host-screen' : 'player-only'} ${immersive ? 'immersive' : ''} ${host && tvFocus ? 'tv-focus' : ''} ${enter ? 'phase-enter' : ''}" data-deck-key="${phaseKey}" data-phase="${s.phase}" data-paused="${Boolean(s.pausedAt)}" data-mode="${shownMode}" data-result="${result}" style="${modeVariables(shownMode)}">${sceneBackdrop(shownMode, enter && (s.phase === 'finished' || result === 'win'))}<div class="game-top">
    <div class="screen-identity"><span class="screen-mode-icon" aria-hidden="true">${icons(mode[3])}</span>
      <div><div class="screen-mode-title">${s.phase === 'lobby' && s.picker ? 'Pick a game' : escape(s.quizTitle || (s.mode === 'classic' ? categoryName(s.category) : modeName(s.mode)))}</div>
      <div class="screen-status">${host && s.phase === 'lobby' && !s.picker && showIdentity(s.mode) ? `<span class="show-studio-label">${showIdentity(s.mode).studio}</span>` : ''}<span class="phase-caption">${caption}</span>
      ${s.isCaptain && s.phase !== 'lobby' ? '<span class="captain-tag">★ Captain</span>' : ''}${boost}
      ${host && ['lobby','finished'].includes(s.phase) ? '<span class="studio-publisher">A ROOKIE QUEST GAMES PRODUCTION</span>' : ''}
      ${host && !['lobby','waiting'].includes(s.phase) ? `<span class="tv-live-pill"><i aria-hidden="true"></i>JAMBALOOP LIVE · <span data-tv-connected>${s.connected}</span> PLAYERS</span>` : ''}</div></div></div>${track}
      <div class="game-controls">${host ? '' : timer}
    ${host ? `<button class="button outline small tv-focus-toggle" data-action="tv-focus" title="Hide TV host controls while the captain runs the game" aria-pressed="${tvFocus}" aria-label="${tvFocus ? 'Exit TV focus' : 'TV focus'}">${icons('monitor-play', 'host-compact-icon')} <span>${tvFocus ? 'Exit TV focus' : 'TV focus'}</span></button>` : ''}
    ${host && s.phase !== 'lobby' ? `<button class="button outline small room-link" data-action="show-join" aria-label="Room ${s.code}">${icons('qr-code')} <span>Room ${s.code}</span></button>` : ''}
    ${host && window.AudioContext ? `<button class="button outline small" data-action="sound" aria-pressed="${soundEnabled}" aria-label="Sound ${soundEnabled ? 'on' : 'off'}">${icons(soundEnabled ? 'volume-2' : 'volume-x')} <span>Sound ${soundEnabled ? 'on' : 'off'}</span></button>` : ''}
    ${host && document.fullscreenEnabled ? `<button class="button outline small" data-action="fullscreen" aria-label="Fullscreen">${icons('maximize', 'host-compact-icon')} <span>Fullscreen</span></button>` : ''}
    <button class="button outline small" data-action="leave" aria-label="Home">${host ? icons('house', 'host-compact-icon') : ''}<span>Home</span></button></div></div>
    <div class="connection-strip" id="reconnect-status" role="status" ${reconnecting ? '' : 'hidden'}>Reconnecting to this room…</div>
    ${host && !['lobby', 'finished'].includes(s.phase) ? '<p class="stage-presence" id="stage-presence"></p>' : ''}
    ${(host || s.isCaptain) && !['lobby', 'finished', 'waiting'].includes(s.phase) && s.night.queue.length ? `<p class="live-lineup">Up next <strong>${modeName(s.night.queue[0])}</strong>
      ${canControl ? '<button class="button outline small" data-action="night">Edit playlist</button>' : ''}</p>` : ''}
    ${body}<p class="error" id="game-error" role="alert"></p></section>`;
  if (guideWasOpen) {
    const guide = app.querySelector('.player-game-guide');
    if (guide) {
      guide.open = true;
      if (guideHadFocus) guide.querySelector('summary')?.focus({ preventScroll: true });
    }
  }
  if (playerScroll !== null) app.scrollTop = playerScroll;
  switchAvatarSession.refresh();
  if (backdrop) app.querySelector('.scene-backdrop').replaceWith(backdrop);
  renderGraphics(s, stage, animateRoll);
  // Reveal beat: TV drum-roll and flare; phones hold their verdict to match.
  const held = stageReveal(app, s, { host, enter, onFlare: verdict => {
    if (host) { if (soundEnabled) { playSfx(sound, 'reveal', { volume: 0.5 }); playSfx(sound, 'correct', { volume: 0.35, at: 0.15 }); hostReaction(s, 1500); } }
    else if (verdict === 'win') celebrate(`${s.code}/${s.game}/${s.index}/round`, { source: app.querySelector('.game'), intensity: .22 });
    else shatterPhoneHeart(app, s);
  } });
  // Knockout: hearts shatter and KOs land just after the answer.
  if (host && s.mode === 'knockout') {
    playKnockout(app, s, { enter, delay: held + 350,
      onHit: () => { if (soundEnabled) playChiptune(sound, 'hit'); },
      onKo: () => { if (soundEnabled) { playChiptune(sound, 'ko'); playSfx(sound, 'bell', { volume: 0.5, at: 0.9 }); } } });
    rememberLadder(s);
  } else if (!host && enter && !held && s.phase === 'reveal') shatterPhoneHeart(app, s);
  if (host && held && soundEnabled) playSfx(sound, 'drumroll', { volume: 0.45 });
  if (host && enter && soundEnabled && s.phase === 'question') hostReaction(s, 600);
  celebrateMoment(s, host, enter, result, held);
  // Sofa distance: no in-game TV text below the height-relative floor.
  if (immersive && innerWidth > 760) enforceTvLegibility(app.querySelector('section.game'));
  // The lobby's game card slides in from the side the switcher moved towards.
  if (s.phase === 'lobby' && lastLobbyMode && lastLobbyMode !== s.mode) {
    const order = modes.map(([id]) => id);
    const step = (order.indexOf(s.mode) - order.indexOf(lastLobbyMode) + order.length) % order.length;
    const card = app.querySelector('.lobby-game');
    if (card) { card.style.setProperty('--swap-from', step <= order.length / 2 ? '1' : '-1'); card.classList.add('is-swapping'); }
  }
  lastLobbyMode = s.phase === 'lobby' ? s.mode : undefined;
  if(s.mode==='sketch')paintSketchBoard(s.party);
  // The welcome plays once the room has players and a captain to hand over to.
  if (host && s.phase === 'lobby' && s.picker && s.playerCount > 0 && s.captainName && !s.welcome && !welcomedRooms().includes(s.code)) requestWelcome();
  if (welcome && s.phase !== 'lobby') closeWelcome();
  if (s.phase === 'lobby' && s.picker) bindPickerSwipe(app, direction => stepPicker(direction));
  if (host && s.phase === 'lobby') stageFor(app.querySelector('.game'), shownMode); else hideStage();
  // Hot Potato: the potato arcs from the old holder's seat to the new one.
  animatePotato(host?app:null, s.code+'/'+s.game, matchMedia('(prefers-reduced-motion: reduce)').matches);
  if(s.mode!=='quizrace'&&race3d) disposeRace3d();
  if(s.mode==='quizrace' && s.race){
    raceTrackView?.dispose();
    const svgTrack=mountQuizRaceTrack(app);
    const raceKey=s.code+'/'+s.game;
    const stage=host?app.querySelector('.race-track-wrap'):null;
    if(!stage||race3d?.key!==raceKey&&race3dLoading!==raceKey) disposeRace3d();
    if(stage&&!race3d&&race3dLoading!==raceKey){
      race3dLoading=raceKey;
      import('./race-3d.js').then(({mountRace3D})=>{
        if(race3dLoading!==raceKey||race3d)return;
        race3d=mountRace3D({key:raceKey,track:s.raceTrack,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
        race3d.attach(app.querySelector('.race-track-wrap'));
      }).catch(()=>{ race3dLoading=undefined; /* No WebGL: the SVG track remains. */ });
    }
    race3d?.attach(stage);
    // The 3D circuit draws when ready; otherwise the SVG track does.
    raceTrackView={update:(...args)=>race3d?.update(...args)||svgTrack.update(...args),dispose:()=>svgTrack.dispose()};
    raceSnapshotLocal=Date.now();
    if(!raceAnimationFrame) raceAnimationFrame=requestAnimationFrame(updateQuizRaceVisuals);
  }
  updateCeremony();
  updateScoreBreak(app, Date.now() + offset);
  if (enter) announcement.textContent = caption + (showProgress ? ' · ' + (s.index + 1) + ' of ' + s.total : '');
  const roster = rosterScroll && app.querySelector('.players');
  if (roster) roster.scrollTop = rosterScroll;
  if (lobbyAction) app.querySelector(`button[data-action="${CSS.escape(lobbyAction)}"]:enabled`)?.focus({preventScroll:true});
  if (captainSelect) {
    const select = app.querySelector('#captain-form select');
    if (select && Array.from(select.options).some(item => item.value === captainSelect)) {
      select.value = captainSelect;
      select.focus({ preventScroll: true });
    }
  }
  if (writing) {
    const textarea = app.querySelector('#bluff-form textarea');
    textarea?.focus({ preventScroll: true });
    textarea?.setSelectionRange(...writing);
  }
  updateSoCloseReveal(s);
  if (enter && /^(lobby|ready|question|reveal|score-break|finished|party-)/.test(s.phase)) {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function updateSoCloseReveal(s=state){
  const target=document.querySelector('#so-close-frame');
  if(!target||!s?.estimateReveal||s.mode!=='soclose'||s.phase!=='reveal')return;
  const frame=soCloseStage(soCloseFrame(s.estimateReveal,Date.now()+offset),s.estimateReveal);
  const key=frame.kind+'/'+frame.shown;
  if(target.dataset.frame===key)return;
  target.dataset.frame=key;
  target.innerHTML=soCloseRevealView(s,frame,Boolean(session?.host),escape);
  const done=frame.kind==='winner';
  if(done&&(session?.host?(s.estimateGuesses??[]).some(row=>row.won):s.answerCorrect))
    celebrate(`${s.code}/${s.game}/${s.index}/soclose`,{source:target.closest('.game'),intensity:session?.host?.8:.4});
  const actions=target.parentElement.querySelector('.so-close-reveal-actions');
  if(actions){actions.querySelector('[data-action="estimate-reveal-skip"]').hidden=done;actions.querySelector('[data-action="advance"]').hidden=!done;}
  const cueKey=s.code+'/'+s.game+'/'+s.index+'/'+key;
  if(lastSoCloseCue!==cueKey){
    lastSoCloseCue=cueKey;
    if(session?.host&&soundEnabled)playCue(sound,s.mode,'estimate-'+frame.kind);
  }
}

function updateCeremony() {
  const frame = document.querySelector('#ceremony-frame');
  if (!frame || frame.parentElement.hidden || !state?.ceremony) return;
  const index = currentFrame(ceremonyFrames, Date.now() + offset - state.ceremony.starts);
  if (index < 0) {
    frame.parentElement.hidden = true;
    document.querySelector('#post-ceremony').hidden = false;
    return;
  }
  if (frame.dataset.index !== String(index)) {
    frame.dataset.index = index;
    frame.innerHTML = frameView(ceremonyFrames[index], escape, icons);
    if (ceremonyFrames[index].rows[0]?.rank === 1) {
      if (soundEnabled) playCue(sound, state.mode, 'finished');
      celebrate(`${state.code}/${state.game}/finale`, { source: frame.closest('.game'), origin: 'sides' });
    }
  }
}

function updateTimer() {
  const timer = document.querySelector('#timer');
  if (!timer || !state) return;
  const remaining = Math.max(0, state.ends - (state.pausedAt || Date.now() + offset));
  const secondsLeft = Math.ceil(remaining / 1000);
  const timeLabel = state.phase === 'party-potato'
    ? Math.floor(secondsLeft / 60) + ':' + String(secondsLeft % 60).padStart(2, '0')
    : secondsLeft + 's';
  if (timer.textContent !== timeLabel) timer.textContent = timeLabel;
  timer.classList.toggle('urgent', !state.pausedAt && remaining < 5000);
  const fraction = Math.min(1, remaining / (state.ends - state.opened));
  const fill = document.querySelector('#time-fill');
  if (fill) fill.style.transform = `scaleX(${fraction})`;
  timer.closest('.tv-clock, .potato-stage-clock')?.style.setProperty('--clock-fill', `${fraction * 100}%`);
  const final = clockTension(timer.closest('.game'), { fraction, remaining, paused: Boolean(state.pausedAt), live: state.phase === 'question' });
  // A tick each second through the last five on the TV (sound is opt-in).
  if (final && session?.host && soundEnabled) {
    const beat = `${state.game}/${state.index}/${secondsLeft}`;
    if (beat !== lastQuestionTick) { lastQuestionTick = beat; playTick(sound, true); }
  }
  if (state.phase === 'party-potato') {
    potatoHeat(app, fraction);
    // A tick each second on the TV (sound is opt-in), quicker in the last ten.
    if (session?.host && soundEnabled && !state.pausedAt && remaining > 0) {
      const beat = remaining < 10000 ? Math.ceil(remaining / 500) : secondsLeft;
      if (beat !== lastPotatoTick) { lastPotatoTick = beat; playTick(sound, remaining < 10000); }
    }
  }
}
let lastPotatoTick;
let lastQuestionTick;

function boardPrediction(state, host) {
  const prediction = state.prediction;
  if (!prediction) return '';
  const { own, eligible, result, total, correct } = prediction;
  if (result && (host ? total : own)) return `<p class="board-forecast" role="status">${host
    ? `${correct} of ${total} predicted the roll`
    : `${own === result ? 'You called it!' : 'This time it rolled ' + result + '.'}`}</p>`;
  if (host && state.phase === 'ready') return '<p class="board-forecast" id="board-forecast"></p>';
  if (!eligible || state.phase !== 'ready') return '';
  return `<div class="side-prediction"><strong>Predict the roll</strong>
    <div><button class="button outline small" data-action="predict" data-guess="low" aria-pressed="${own === 'low'}">Low · 1–3</button>
    <button class="button outline small" data-action="predict" data-guess="high" aria-pressed="${own === 'high'}">High · 4–6</button></div>
    <small>${own ? 'Prediction saved' : 'For fun, alongside your quiz score.'}</small></div>`;
}

function updatePresence(s) {
  const tvConnected=document.querySelector('[data-tv-connected]');
  if (tvConnected && tvConnected.textContent !== String(s.connected)) tvConnected.textContent=String(s.connected);
  const presence = document.querySelector('#stage-presence');
  if (presence) {
    const label = `${s.connected} connected${s.waitingCount ? ' · ' + s.waitingCount + ' joining next game' : ''}`;
    if (presence.textContent !== label) presence.textContent = label;
  }
  const forecast = document.querySelector('#board-forecast');
  if (forecast) {
    const label = s.prediction?.total ? `${s.prediction.total} roll predictions locked in` : 'Other teams can predict the roll on their phones.';
    if (forecast.textContent !== label) forecast.textContent = label;
  }
}

function answerCount(state) {
  return state.mode === 'knockout' && state.phase === 'reveal' ? `${state.answered} answered · ${state.remaining} still in`
    : `${state.answered} of ${Math.max(state.answered, responseTarget(state))} answered`;
}

function setConnectionStatus(value) {
  reconnecting = value;
  const strip = document.querySelector('#reconnect-status');
  if (strip) strip.hidden = !value;
}

function receive(next, current) {
  if (current !== session || next.revision < (state?.revision ?? -1)) return;
  offset = next.now - Date.now();
  setConnectionStatus(false);
  if (soundEnabled && current.host && state) {
    if (state.phase !== next.phase || state.index !== next.index) {
      const staged = stageable(next) && !prefersReducedMotion();
      if (!(next.mode==='soclose' && next.phase==='reveal') && !staged && (!next.ceremony || matchMedia('(prefers-reduced-motion: reduce)').matches)) playCue(sound, next.mode, next.phase);
    }
    else if (next.mode === 'potato' && next.party?.passes > state.party?.passes) playCue(sound, next.mode, 'pass');
    soundMoments(state, next);
    raceCommentary(state, next);
    bloodmoonCommentary(state, next);
  }
  if (dialog.open && state && (state.game !== next.game || state.phase === 'lobby' && next.phase !== 'lobby')) dialog.close();
  if (state?.game !== next.game || state?.index !== next.index || next.phase === 'lobby') partyReply = '';
  // A game chosen from the lobby carousel: the TV introduces it out loud.
  const introduce = current.host && state?.phase === 'lobby' && state.picker && !next.picker && next.phase === 'lobby';
  const welcomeMoved = current.host && (state?.welcome ?? null) !== (next.welcome ?? null);
  if (!current.host && (['playing', 'skipping'].includes(next.welcome) || next.phase === 'finished')) markReturning();
  state = next;
  // Store only opaque question IDs, never answer keys or other players' data.
  if (!current.host) {
    rememberQuestion(next.question?.historyId);
    rememberQuestion(next.race?.own?.question?.historyId);
    if (next.party?.type === 'samepage') rememberQuestion(next.party.historyId);
    if (next.party?.type === 'spotlight') rememberQuestion(next.party.question?.historyId);
    if (next.party?.type === 'brain') rememberQuestion(next.party.question?.historyId);
    if (next.party?.type === 'topanswers') rememberQuestion(next.party.historyId);
    if (next.party?.type === 'rare') rememberQuestion(next.party.historyId);
  }
  if(next.race) raceSnapshotLocal=Date.now();
  if (!current.host && next.player && (current.name !== next.player.name || current.mode !== next.mode)) {
    Object.assign(current, { name: next.player.name, mode: next.mode });
    rememberPlayer(current);
  }
  const { now, revision, answered, connected, waitingCount, responseTarget, race, lockIns, lockCount, lockRight, picker, ...stable } = next;
  // The lobby carousel glides in place; only opening or closing it re-renders.
  stable.pickerOpen = Boolean(picker);
  const raceSignature = race && { question:race.own?.question?.id, feedback:race.own?.feedback?.outcome, paused:race.paused, finished:race.finished };
  const lobbyStatus = next.phase === 'lobby' ? { connected } : undefined;
  const raceStable = next.mode==='quizrace' ? { ...stable, players: next.phase==='finished' ? stable.players : undefined, player: stable.player ? {...stable.player, score: undefined} : undefined } : stable;
  // Stroke updates paint directly into the existing canvas, preserving in-progress finger gestures.
  if(next.mode==='sketch'&&raceStable.party){
    raceStable.party={...raceStable.party,strokes:undefined};
  }
  const nextSignature = JSON.stringify({ ...raceStable, raceSignature, lobbyStatus,
    prediction: next.phase === 'ready' && current.host ? undefined : next.prediction });
  if (signature !== nextSignature) {
    signature = nextSignature;
    render(next);
  }
  const counter = current.host && document.querySelector('#host-answer-count');
  const countText = answerCount(next);
  if (counter && counter.textContent !== countText) { counter.textContent = countText; bumpCount(counter); }
  if (current.host) {
    const before = app.querySelectorAll('.lock-stamp').length;
    updateLockRail(app, next, escape, avatarView);
    if (soundEnabled && app.querySelectorAll('.lock-stamp').length > before) playSfx(sound, 'lockin', { volume: 0.5 });
  }
  if (introduce) toggleNarration(next.mode);
  if (!current.host && next.mode === 'quizrace') updateRacePowers(app, next);
  if (welcomeMoved) showWelcome(next.welcome);
  if (picker) {
    // The captain has started browsing: the welcome steps aside.
    if (welcome && picker.version !== welcome.version) { welcome.version = picker.version; welcomeAction('end'); }
    // Follow the room, except just after this screen moved it itself.
    if (Date.now() - lastLocalPick > 700) movePicker(app, picker.mode, escape);
    if (current.host) stageFor(app.querySelector('.game'), picker.mode);
  }
  const responseProgress = document.querySelector('#response-progress');
  if (responseProgress) {
    responseProgress.max = Math.max(1, next.responseTarget);
    responseProgress.value = next.answered;
  }
  updatePresence(next);
  if(next.mode==='sketch')paintSketchBoard(next.party);
  updateTimer();
}

// Max and Poppy react to the round on the TV (Sound on only): one short line,
// once per moment, never over another line, rotating through the variants.
const reactionTurn = {};
let reactedAt;
/** Say the next variant of a reaction, unless someone is already talking. */
function sayReaction(prefix, variants) {
  if (!soundEnabled || narrationPlaying() || !variants?.length) return;
  const turn = reactionTurn[prefix] = ((reactionTurn[prefix] ?? -1) + 1) % variants.length;
  const take = variants[turn];
  playScript(`${prefix}-${turn + 1}`, Array.isArray(take[0]) ? take : [take]);
}

function hostReaction(s, delay) {
  const kind = reactionFor(s);
  const moment = `${s.code}/${s.game}/${s.index}/${s.phase}`;
  if (!kind || reactedAt === moment) return;
  reactedAt = moment;
  // Knockout is called by Baz and Clive at ringside.
  const ringside = s.mode === 'knockout' && knockoutReactions[kind];
  setTimeout(() => {
    if (state?.game !== s.game || state?.index !== s.index || state?.phase !== s.phase) return;
    if (ringside) sayReaction(`react-ko-${kind}`, ringside); else sayReaction(`react-${kind}`, reactions[kind]);
  }, delay);
}

// Vince calls Quiz Race: the start, lead changes, close battles and the flag.
let raceCalledAt = 0;
/** Bloodmoon: the hosts call each public beat on the TV. */
function bloodmoonCommentary(before, next) {
  if (next.mode !== 'bloodmoon' || !next.party || before.phase === next.phase) return;
  const party = next.party;
  const kind = { 'blood-night': 'night', 'blood-day': 'day', 'blood-vote': 'vote',
    'blood-dawn': party.dawn?.victim ? 'bitten' : 'safe',
    'blood-verdict': party.verdict?.banished ? (party.verdict.banished.role === 'vampire' ? 'caught' : 'wrong') : 'nobody',
    finished: party.winner }[next.phase];
  if (kind && bloodmoonCalls[kind]) setTimeout(() => sayReaction(`react-blood-${kind}`, bloodmoonCalls[kind]), 700);
}

function raceCommentary(before, next) {
  if (next.mode !== 'quizrace' || !next.race) return;
  const call = (kind, gap = 0) => {
    if (Date.now() - raceCalledAt < gap) return;
    raceCalledAt = Date.now();
    sayReaction(`react-race-${kind}`, raceCalls[kind]);
  };
  if (before.phase === 'race-countdown' && next.phase === 'race') return call('start');
  if (next.phase === 'finished' && before.phase !== 'finished') return setTimeout(() => call('finish'), 900);
  if (next.phase !== 'race' || before.phase !== 'race') return;
  // Power-ups: a new ram or boost anywhere on the track gets a call.
  const fresh = kind => next.race.racers.some(racer => racer.power === kind && before.race?.racers?.find(old => old.id === racer.id)?.power !== kind);
  if (fresh('rammed')) { if (soundEnabled) playSfx(sound, 'wrong', { volume: 0.4 }); return call('ram', 5000); }
  if (fresh('boost')) { if (soundEnabled) playSfx(sound, 'whoosh', { volume: 0.5 }); return call('boost', 5000); }
  const [first, second] = next.race.racers;
  const leaderBefore = before.race?.racers?.[0]?.id;
  const length = next.race.length || 1;
  if (first && leaderBefore && first.id !== leaderBefore && first.distance > length * 0.08) return call('lead', 9000);
  if (first && second && first.distance > length * 0.4 && first.distance - second.distance < length * 0.015) call('close', 20000);
}

/** The TV's recorded effects and music for each moment of the show. */
function soundMoments(before, next) {
  const moved = before.phase !== next.phase || before.index !== next.index;
  // Music: the lobby theme under the lobby and carousel, the winners' theme at the end.
  if (next.phase === 'lobby') playMusic('lobby');
  else if (next.phase === 'finished' && before.phase !== 'finished') {
    playMusic('finale', { loop: false });
    playSfx(sound, 'fanfare', { volume: 0.5 });
    playSfx(sound, 'cheer', { volume: 0.45, at: 0.6 });
  } else if (next.phase !== 'finished') stopMusic();
  if (!moved) return;
  // The first question arrives under the title sting, so no whoosh there.
  if (next.phase === 'question' && next.index > 0) playSfx(sound, 'whoosh', { volume: 0.4 });
  // Warm the next game's sting while everyone is still in the lobby.
  if (next.phase === 'lobby') preloadSfx(sound, ['sting-' + (next.picker?.mode ?? next.mode)]);
  if (next.phase === 'rolling' && next.mode === 'wheel') playSfx(sound, 'wheel', { volume: 0.5 });
  if (next.mode === 'potato' && before.phase === 'party-potato' && next.phase !== 'party-potato') playSfx(sound, 'sizzle', { volume: 0.6 });
}

function showGameError(error) {
  const notice = document.querySelector('#game-error');
  if (notice) notice.textContent = error.message;
}

// Max and Poppy's welcome to Jambaloop. The room holds its state (playing,
// asking or skipping) so the TV, the captain's phone and everyone else agree.
let welcome;
const welcomedKey = 'jambaloop-welcomed';
const welcomedRooms = () => { try { return JSON.parse(sessionStorage.getItem(welcomedKey) ?? '[]'); } catch { return []; } };
// A phone that has seen the welcome or played a game is a returning player.
const returningKey = 'jambaloop-returning';
const isReturning = () => { try { return localStorage.getItem(returningKey) === '1'; } catch { return false; } };
const markReturning = () => { try { localStorage.setItem(returningKey, '1'); } catch {} };

function welcomeAction(action) {
  if (!session || !state) return Promise.resolve();
  return api('/' + session.code + '/welcome', { action, game: state.game }).catch(() => {});
}

/** TV: start the welcome once per room (or offer a skip if everyone's been before). */
function requestWelcome() {
  if (!session?.host || !state) return;
  try { sessionStorage.setItem(welcomedKey, JSON.stringify([...welcomedRooms(), state.code].slice(-20))); } catch {}
  welcomeAction(state.everyoneReturning ? 'ask' : 'start');
}

function welcomeOverlay() {
  welcome ??= openWelcome(document.body, { code: state.code, qr: state.qr },
    { onSkip: () => welcomeAction('skip'), onTour: () => welcomeAction('tour') });
  welcome.version = state.picker?.version;
  return welcome;
}

/** TV: follow the room's welcome state with the matching scene and lines. */
function showWelcome(to) {
  if (!to) { closeWelcome(); return; }
  const show = welcomeOverlay();
  if (to === 'playing') playWelcome({ onLine: (index, [, , scene]) => show.scene(scene), onDone: () => welcomeAction('end') });
  else if (to === 'asking') { show.scene('back'); playScript('welcome-back', welcomeBack); }
  else if (to === 'skipping') {
    show.scene('skip');
    const pick = Math.floor(Math.random() * skipQuips.length);
    playScript(`skip-${pick + 1}`, skipQuips[pick], { onDone: () => welcomeAction('end') });
  }
}

function closeWelcome() {
  if (isWelcomeNarration()) stopNarration();
  welcome?.close();
  welcome = undefined;
}

/** The live 3D backdrop, tinted for a game. */
function stageFor(element, mode) {
  const { accent, accent2, ink } = identityOf(mode);
  showStage(element, { accent, accent2, ink });
}

// The game in front of the shelf on this screen (it can be a step ahead of the room).
const centredPick = () => app.querySelector('.picker-carousel .carousel-card[aria-current]')?.dataset.mode ?? state?.picker?.mode;
let lastLocalPick = 0;

/** One step along the shelf: move here at once, then tell the room. */
function stepPicker(direction) {
  if (!state?.picker) return;
  const next = stepMode(centredPick(), direction);
  lastLocalPick = Date.now();
  movePicker(app, next, escape);
  browseTo(next);
}

/** Move the lobby carousel for every screen in the room. */
function browseTo(mode) {
  if (!session || !state?.picker) return;
  api('/' + session.code + '/browse', { mode, game: state.game }).catch(showGameError);
}

function connectionError(error, current) {
  if (current !== session) return;
  if ([403, 404].includes(error.status)) {
    if (!current.host) forgetPlayer(current.code);
    leave();
    openDialog(current.host ? 'host' : 'join', current.code);
    content.querySelector('.error').textContent = error.message;
  } else {
    setConnectionStatus(true);
    if (!state) {
      const status = app.querySelector('[role="status"]');
      if (status) status.textContent = 'Reconnecting to this room…';
    }
  }
}

async function refresh() {
  if (!session || pending) return;
  const current = session;
  pending = true;
  lastPoll = Date.now();
  try {
    receive(await api('/' + current.code), current);
  } catch (error) {
    connectionError(error, current);
  } finally {
    pending = false;
  }
}

async function connect() {
  if (!session || stream) return;
  const current = session;
  const controller = new AbortController();
  let pollOnlyUntil = 0;
  stream = controller;
  streamReady = false;
  lastUpdate = Date.now();
  try {
    const response = await fetch('/api/rooms/' + current.code + '/live', {
      headers: { 'x-game-key': current.key },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      if (response.status === 409) {
        const seconds = Number(response.headers.get('retry-after'));
        pollOnlyUntil = Date.now() + (seconds > 0 ? seconds : 5) * 1000;
      }
      await response.body?.cancel();
      await refresh();
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (current === session && stream === controller) {
      const { value, done } = await reader.read();
      if (done) break;
      lastUpdate = Date.now();
      streamReady = true;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (line) receive(JSON.parse(line), current);
      }
    }
  } catch {
    if (current === session) {
      setConnectionStatus(true);
      await refresh();
    }
  } finally {
    if (stream === controller) {
      controller.abort();
      stream = undefined;
      if (current === session && !pollOnlyUntil) setConnectionStatus(true);
      nextConnect = pollOnlyUntil || Date.now() + 800 + Math.random() * 1200;
    }
  }
}

function showDemo(mode, step, feedback) {
  practice = { mode, step, feedback };
  content.innerHTML = demoView(practice, modeVariables(mode), escape);
  content.querySelector('h2').tabIndex = -1;
  content.querySelector('h2').focus();
}

function showPractice(type) {
  const sample = samples[type] ?? samples.choice;
  practice = { sample, draft: createDraft(sample) };
  content.innerHTML = practiceView(practice, escape);
  content.querySelector('h2').id = 'dialog-title';
}

function editorContext(editor) {
  if (content.contains(editor) && practice) {
    return { question: practice.sample, value: practice.draft, save: value => { practice.draft = value; } };
  }
  if (state?.phase === 'question') return { question: state.question, value: draft, save: value => { draft = value; } };
}

function setEditorNumber(editor, value) {
  editor.querySelector('[data-number]').value = value;
  const context=editorContext(editor);
  context?.save(value);
  const rows=editor.querySelector('[data-so-close-rows]');
  if(rows && context) rows.innerHTML=numberWheelRows(context.question,value);
}

document.addEventListener('input', event => {
  if (event.target.matches('#bluff-form textarea')) partyReply = event.target.value;
  if (event.target.id === 'topic-search') {
    renderCategories();
    return;
  }
  const editor = event.target.closest('[data-editor="estimate"]');
  if (!editor) return;
  const context = editorContext(editor);
  if (!context) return;
  const value = event.target.valueAsNumber;
  if (event.target.validity.valid && Number.isSafeInteger(value)) {
    setEditorNumber(editor,value);
  }
});

document.addEventListener('wheel', event => {
  const target = event.target.closest('[data-so-close-rows], .number-scroller');
  if (!target || !event.deltaY) return;
  const editor = target.closest('[data-editor]');
  const context = editorContext(editor);
  if (!context) return;
  event.preventDefault();
  setEditorNumber(editor, closestStep(context.question, context.value, -Math.sign(event.deltaY)));
}, { passive: false });

let soCloseDrag;
document.addEventListener('pointerdown',event=>{
  const rows=event.target.closest('[data-so-close-rows]');
  if(!rows || !event.isPrimary || event.button!==0)return;
  soCloseDrag={rows,id:event.pointerId,y:event.clientY};
  rows.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove',event=>{
  if(!soCloseDrag || soCloseDrag.id!==event.pointerId)return;
  const {rows,y}=soCloseDrag;
  if(!rows.isConnected){soCloseDrag=undefined;return;}
  const editor=rows.closest('[data-editor]');
  const context=editorContext(editor);
  if(!context)return;
  const steps=Math.trunc((event.clientY-y)/24);
  // Larger numbers sit above the centre row, so content follows the finger:
  // dragging down brings the next larger number into the centre.
  if(steps){setEditorNumber(editor,closestStep(context.question,context.value,steps));soCloseDrag.y+=steps*24;}
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,event=>{if(soCloseDrag?.id===event.pointerId)soCloseDrag=undefined;});

document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || !event.target.matches('[data-number]')) return;
  event.preventDefault();
  event.target.closest('[data-editor]').querySelector('[data-action="submit-special"]').click();
});

function checkPractice(value) {
  const { sample } = practice;
  const correct = sample.type === 'order' ? value.every((item, index) => item === sample.correct[index]) : value === sample.correct;
  content.querySelector('.practice-feedback').textContent = sample.type === 'estimate'
    ? `The answer is ${formatNumber(sample.correct, sample.unit)}. You were ${Math.abs(value - sample.correct)} away.`
    : correct ? 'That’s right. In a live game, that answer earns points.' : 'Try again. This practice question doesn’t count toward your score.';
}

document.addEventListener('change', async event => {
  const input = event.target;
  if (input.matches('[data-join-origin]')) {
    const current = session;
    if (!current?.host || !state?.joinUrl || input.value === new URL(state.joinUrl).origin) return;
    const previous = new URL(state.joinUrl).origin;
    input.disabled = true;
    try {
      await api('/' + current.code + '/invite', { origin: input.value });
      if (session === current) await refresh();
    } catch (error) {
      if (input.isConnected) input.value = previous;
      const message = document.querySelector('#game-error');
      if (message) message.textContent = error.message || 'Could not change the phone connection address.';
    } finally {
      if (input.isConnected) input.disabled = false;
    }
    return;
  }
  if (!input.matches('[data-selfie]') || !input.files[0]) return;
  const form = input.closest('form');
  const submit = form.querySelector('button:not([type="button"])');
  const message = form.querySelector('.error');
  submit.disabled = true;
  try {
    if (input.files[0].size > 12000000) throw new Error('Choose a photo under 12 MB.');
    const bitmap = await createImageBitmap(input.files[0]);
    const size = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    canvas.getContext('2d').drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 96, 96);
    bitmap.close();
    if (!form.isConnected) return;
    joinAvatar = canvas.toDataURL('image/jpeg', .72);
    const preview = form.querySelector('#selfie-preview');
    preview.src = joinAvatar;
    preview.hidden = false;
    form.querySelector('[data-action="clear-selfie"]').hidden = false;
    updateJoinCard(form);
    message.textContent = '';
  } catch (error) {
    message.textContent = error.message || 'Could not open this photo.';
  } finally {
    submit.disabled = false;
    input.value = '';
  }
});

let partySubmitting = false;
async function sendParty(data, button) {
  if (partySubmitting || !session || !state?.party) return;
  const activeSession = session;
  const game = state.game;
  const index = state.index;
  partySubmitting = true;
  button.disabled = true;
  try {
    await api('/' + activeSession.code + '/party', { ...data, index, game }, activeSession.key);
    if (session === activeSession) await refresh();
  } catch (error) {
    if (session === activeSession) {
      // The room may rerender when refreshed, so show the original server
      // error *after* the refresh rather than allowing it to disappear.
      try { await refresh(); } catch { /* Keep the original action error visible. */ }
      const notice = document.querySelector('#game-error');
      if (notice) notice.textContent = error.message;
    }
  } finally {
    if (button.isConnected) button.disabled = false;
    partySubmitting = false;
  }
}

document.addEventListener('click', async event => {
  // Estimate step size: every arrow, drag and scroll then moves by this much.
  const chip = event.target.closest('[data-precision]');
  if (chip) {
    const editor = chip.closest('[data-editor]');
    const step = setEstimatePrecision(Number(chip.dataset.precision));
    for (const button of editor.querySelectorAll('[data-precision]')) button.setAttribute('aria-pressed', String(Number(button.dataset.precision) === step));
    const context = editorContext(editor);
    const rows = editor.querySelector('[data-so-close-rows]');
    if (rows && context) rows.innerHTML = numberWheelRows(context.question, context.value);
    return;
  }
  const edit = event.target.closest('[data-step], [data-move]');
  if (edit) {
    const editor = edit.closest('[data-editor]');
    const context = editorContext(editor);
    if (!context) return;
    if (edit.hasAttribute('data-step')) {
      setEditorNumber(editor, closestStep(context.question, context.value, Number(edit.dataset.step)));
    } else {
      const from = Number(edit.dataset.item);
      const to = from + Number(edit.dataset.move);
      const order = [...context.value];
      [order[from], order[to]] = [order[to], order[from]];
      context.save(order);
      editor.querySelector('[data-order]').innerHTML = orderedItems(context.question, order, true, escape);
      const target = editor.querySelector(`[data-item="${to}"][data-move="${edit.dataset.move}"]:not(:disabled)`)
        ?? editor.querySelector(`[data-item="${to}"]:not(:disabled)`);
      target?.focus();
    }
    return;
  }
  const playlistButton = event.target.closest('[data-night-edit]');
  if (playlistButton) {
    const { nightEdit, index, minutes } = playlistButton.dataset;
    const queue = playlistDraft.queue;
    if (nightEdit === 'preset') playlistDraft.queue = [...gameNightPresets[minutes]];
    else if (nightEdit === 'add' && queue.length < playlistLimit) queue.push(content.querySelector('[name="queuedMode"]').value);
    else if (nightEdit === 'remove') queue.splice(Number(index), 1);
    else if (['up', 'down'].includes(nightEdit)) {
      const to = Number(index) + (nightEdit === 'up' ? -1 : 1);
      [queue[index], queue[to]] = [queue[to], queue[index]];
    }
    content.innerHTML = playlistEditor(playlistDraft.queue, escape, icons, (state?.playerCount ?? 0) + (state?.waitingCount ?? 0));
    const focused = nightEdit === 'preset' ? content.querySelector(`[data-minutes="${minutes}"]`)
      : nightEdit === 'add' || nightEdit === 'remove' ? content.querySelector('[name="queuedMode"]')
      : content.querySelector(`[data-index="${Number(index) + (nightEdit === 'up' ? -1 : 1)}"]:not(:disabled)`);
    focused?.focus();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if(action==='sketch-colour'||action==='sketch-weight')return;
  if(action==='sketch-clear'){
    button.disabled=true;
    try{await clearSketch();await refresh();}
    catch(error){const notice=document.querySelector('#game-error');if(notice)notice.textContent=error.message;}
    finally{button.disabled=false;}
    return;
  }
  if (action === 'narrator-toggle') {
    toggleNarration(button.dataset.mode);
    return;
  }
  if (action === 'clear-selfie') {
    joinAvatar = undefined;
    const preview = content.querySelector('#selfie-preview');
    preview.removeAttribute('src');
    preview.hidden = true;
    button.hidden = true;
    updateJoinCard();
    return;
  }
  if (action === 'home-tab') {
    if (!session) showHomeTab(button.dataset.tab);
    return;
  }
  if (action === 'filter-modes') {
    document.querySelectorAll('.mode-filters button').forEach(filter =>
      filter.setAttribute('aria-pressed', String(filter === button)));
    homePage = 0;
    homeSelected = undefined;
    renderModeCards(button.dataset.group);
    return;
  }
  if (action === 'mode-page') {
    homePage += Number(button.dataset.direction);
    renderModeCards(homeFilter);
    return;
  }
  if (action === 'carousel-step' || action === 'carousel-go') {
    if (action === 'carousel-go' && performance.now() - carouselSwipedAt < 400) return;
    const list = launcherModes(homeFilter);
    if (action === 'carousel-go') {
      const target = list.findIndex(([id]) => id === button.dataset.mode);
      // On the landing showcase the centre card opens its details; hosting is a separate tap.
      if (target === wrapIndex(carouselIndex, list.length)) return button.closest('#game-carousel')?.querySelector('.carousel-info [data-action="preview-mode"]')?.click();
      stepCarousel(target - wrapIndex(carouselIndex, list.length));
    } else stepCarousel(Number(button.dataset.direction));
    return;
  }
  if (action === 'carousel-voice') {
    carouselVoice = !carouselVoice;
    const list = launcherModes(homeFilter);
    stopNarration();
    moveCarousel(app.querySelector('#game-carousel'), list, carouselIndex, carouselVoice);
    if (carouselVoice) toggleNarration(list[wrapIndex(carouselIndex, list.length)][0]);
    app.querySelector('.carousel-voice')?.focus({ preventScroll: true });
    return;
  }
  if (action === 'carousel-view') {
    homeView = homeView === 'carousel' ? 'grid' : 'carousel';
    store('jambaloop-home-view', homeView);
    homePage = 0;
    renderModeCards(homeFilter);
    return;
  }
  if (action === 'preview-mode') {
    const id = button.dataset.mode;
    if (!modes.some(([mode]) => mode === id)) return;
    homeSelected = id;
    renderModeCards(homeFilter);
    app.querySelector('[data-action="close-preview"]')?.focus({preventScroll:true});
    return;
  }
  if (action === 'close-preview') {
    const id = homeSelected;
    homeSelected = undefined;
    renderModeCards(homeFilter);
    app.querySelector(`[data-action="preview-mode"][data-mode="${id}"]`)?.focus({preventScroll:true});
    return;
  }
  if (action === 'race-power' && session && state?.race?.own) {
    button.dataset.sending = '1';
    button.disabled = true;
    try {
      await api('/' + session.code + '/race-power', { game: state.game, kind: button.dataset.kind });
      try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(button.dataset.kind === 'ram' ? [40, 30, 80] : 60); } catch {}
    } catch (error) { showGameError(error); }
    delete button.dataset.sending;
    await refresh();
    return;
  }
  if (action === 'race-answer' || action === 'race-pass') {
    if (raceSending || !state.race?.own?.question) return;
    const activeSession = session;
    const game = state.game;
    const qid = state.race.own.question.id;
    const answer = action === 'race-pass' ? { pass: true } : { option: Number(button.dataset.raceOption) };
    const controls = document.querySelectorAll('[data-action="race-answer"], [data-action="race-pass"]');
    raceSending = true;
    controls.forEach(control => control.disabled = true);
    let errorText;
    try {
      await api('/' + activeSession.code + '/race-answer', { game, questionId: qid, ...answer }, activeSession.key);
      if (session === activeSession) await refresh();
    } catch (error) {
      if (session === activeSession) {
        // The 409 response means a question may have expired. Refresh the
        // controls first, then keep the explanation visible on the new screen.
        errorText = error.message;
        await refresh();
      }
    } finally {
      raceSending = false;
      if (session === activeSession && state?.mode === 'quizrace' && state.game === game) {
        signature = undefined;
        render(state);
        const notice = document.querySelector('#game-error');
        if (notice && errorText) notice.textContent = errorText;
      } else {
        // Never redraw another room after an old request has finished.
        controls.forEach(control => { if (control.isConnected) control.disabled = false; });
      }
    }
    return;
  }
  if (action === 'fork-card') return sendParty({ action: 'card', step: Number(button.dataset.forkStep), option: Number(button.dataset.option) }, button);
  if (action === 'fork-judge') return sendParty({ action: 'judge', track: Number(button.dataset.track) }, button);
  if (action === 'rare-review-approve' || action === 'rare-review-reject') return sendParty({
    action:'review',decision:action === 'rare-review-approve'?'approve':'reject',
    token:button.dataset.reviewToken,
    canonical:action === 'rare-review-approve' ? button.closest('.rare-review-row')?.querySelector('select[data-review-select]')?.value ?? '' : '',
  },button);
  if (action === 'top-poll' || action === 'top-guess') return sendParty({ action: action === 'top-poll' ? 'poll' : 'guess', option: Number(button.dataset.option) }, button);
  if (action === 'brain-answer') return sendParty({ action: 'answer', option: Number(button.dataset.option) }, button);
  if (action === 'spotlight-advice' || action === 'spotlight-answer') return sendParty({ action: action === 'spotlight-advice' ? 'advice' : 'answer', option: Number(button.dataset.option) }, button);
  if (action === 'social-card') return sendParty({ action: 'card', option: Number(button.dataset.option), handVersion: Number(button.dataset.handVersion) }, button);
  if (action === 'social-redraw') return sendParty({ action: 'redraw' }, button);
  if (action === 'bluff-vote') return sendParty({ action: 'vote', id: button.dataset.id }, button);
  if (action === 'blood-ready') return sendParty({ action: 'ready' }, button);
  if (action === 'blood-pick') return sendParty({ action: 'night', night: state.party?.night, id: button.dataset.id }, button);
  if (action === 'blood-vote') return sendParty({ action: 'vote', night: state.party?.night, id: button.dataset.id }, button);
  if (action === 'potato-skip' || action === 'potato-answer') {
    return sendParty({ action: action === 'potato-skip' ? 'skip' : 'answer', option: Number(button.dataset.option), step: state.party.step }, button);
  }
  if (action === 'filter-topics') {
    categoryGroup = Number(button.dataset.group);
    document.querySelectorAll('#category-filters .topic-filter').forEach(filter =>
      filter.setAttribute('aria-pressed', String(filter === button)));
    renderCategories();
    return;
  }
  if (action === 'practice-type') {
    showPractice(button.dataset.type);
    content.querySelector('[aria-pressed="true"]').focus();
    return;
  }
  if (action === 'demo-reset') return showDemo(practice.mode, 0);
  if (action === 'demo-answer') {
    const { mode, step } = practice;
    const option = Number(button.dataset.option);
    if (mode === 'brain' && step === 0 && option !== 0) return showDemo(mode,0,'Not quite. The sequence increases by two. Try again; the correct next number is 10.');
    if (mode === 'potato' && option !== 1) {
      return showDemo(mode, 0, option === 2 ? 'You still have the potato. In a game a skip deals a fresh question. Try this sample again.' : 'Keep the potato and try again. Beavers are known for building dams.');
    }
    if (step === 1 && ['board', 'wheel', 'dice'].includes(mode)) return showPractice('choice');
    return showDemo(mode, step + 1);
  }
  if (action === 'practice-choice' && practice) return checkPractice(Number(button.dataset.option));
  let specialValue;
  if (action === 'submit-special') {
    const editor = button.closest('[data-editor]');
    const input = editor.querySelector('[data-number]');
    if (input && (!input.reportValidity() || !Number.isSafeInteger(input.valueAsNumber))) {
      input.focus();
      return;
    }
    specialValue = input ? input.valueAsNumber : editorContext(editor)?.value;
    if (content.contains(editor) && practice) return checkPractice(specialValue);
  }
  if (action === 'resume-room') {
    const saved = rememberedPlayer(button.dataset.code);
    if (saved) startSession(saved);
    else openDialog('join', button.dataset.code);
    return;
  }
  if (['help', 'host', 'join', 'themes', 'practice', 'library', 'recent-rooms'].includes(action)) return openDialog(action, button.dataset.category, button.dataset.mode);
  if (action === 'theme') {
    previewStyle(button.dataset.theme);
    return openDialog('themes');
  }
  if (action === 'close') return dialog.close();
  if (action === 'night' && session && state) return openDialog('night');
  if (action === 'leave') return leave();
  if (action === 'welcome-play' && session?.host && !state?.welcome) return welcomeAction('start');
  if (action === 'welcome-skip' && session) return welcomeAction('skip');
  if (action === 'welcome-tour' && session) return welcomeAction('tour');
  if (action === 'picker-open' && session && state?.phase === 'lobby') {
    return api('/' + session.code + '/browse', { open: true, game: state.game }).catch(error => showGameError(error));
  }
  if (action === 'picker-step' && session && state?.picker) return stepPicker(Number(button.dataset.direction));
  if (action === 'picker-settings' && session && state?.picker) return openDialog('configure', state.category, centredPick());
  if (action === 'picker-play' && session && state?.picker) {
    button.disabled = true;
    const mode = centredPick();
    try {
      await api('/' + session.code + '/configure', { ...partySettings(mode, state.theme), game: state.game, lobbyVersion: state.lobbyVersion });
    } catch (error) { button.disabled = false; showGameError(error); }
    return;
  }
  if (action === 'lobby-mode' && session && state?.phase === 'lobby') {
    // Quick switch from the lobby: the new game arrives with sensible defaults
    // (the full setup is still one tap away under Choose game).
    const buttons = [...(button.closest('.lobby-switcher')?.querySelectorAll('button') ?? [])];
    buttons.forEach(item => { item.disabled = true; });
    try {
      await api('/' + session.code + '/configure', { ...queuedSettings(button.dataset.mode, state.theme), game: state.game, lobbyVersion: state.lobbyVersion });
    } catch (error) {
      buttons.forEach(item => { item.disabled = false; });
      const notice = document.querySelector('#game-error');
      if (notice) notice.textContent = error.message;
    }
    return;
  }
  if (action === 'again' || action === 'configure') return openDialog(action === 'again' ? 'rematch' : 'configure', state.category);
  if (action === 'party') {
    button.disabled = true;
    const message = document.querySelector('#home-error');
    try {
      // Lobby first: everyone joins, then the captain picks the game on the
      // carousel. Hosting from a game's tile starts the carousel on that game.
      const chosen = modes.some(([id]) => id === button.dataset.mode) ? button.dataset.mode : undefined;
      const settings = chosen ? partySettings(chosen, previewTheme) : { mode: 'classic', category: 'mixed', count: 10, seconds: 20, format: 'mixed', theme: previewTheme, scoreInterval: defaultScoreInterval };
      // A topic card starts a Classic Quiz party on that topic.
      if (chosen === 'classic' && categories.some(([id]) => id === button.dataset.category)) settings.category = button.dataset.category;
      const room = await api('', { ...settings, picker: true });
      startSession({ code: room.code, key: room.host, host: true });
    } catch (error) {
      if (message) message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (!session || !state) return;
  const current = session;
  button.disabled = true;
  try {
    if (action === 'tv-focus') {
      tvFocus = !tvFocus;
      const stage = app.querySelector('.host-screen');
      stage.classList.toggle('tv-focus', tvFocus);
      button.setAttribute('aria-pressed', String(tvFocus));
      const label = tvFocus ? 'Exit TV focus' : 'TV focus';
      button.setAttribute('aria-label', label);
      button.querySelector('span').textContent = label;
    } else if (action === 'sound') {
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        sound ??= new AudioContext();
        await sound.resume();
        playCue(sound, state.mode, 'preview');
        preloadSfx(sound, ['whoosh', 'lockin', 'drumroll', 'reveal', 'correct', 'fanfare', 'cheer', 'bell', 'wheel', 'sizzle']);
        if (state.phase === 'lobby') playMusic('lobby');
      } else stopMusic();
      render(state);
      updateTimer();
    } else if (action === 'fullscreen') {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } else if (action === 'show-join') {
      content.innerHTML = `<div class="eyebrow">JOIN JAMBALOOP</div><h2 id="dialog-title">Room ${state.code}</h2>
        <p>Scan from a phone on the same Wi-Fi. If the link fails, return to the lobby and choose a different phone address.</p>
        <img class="qr join-dialog-qr" src="${state.qr}" alt="QR code to join room ${state.code}">
        <p class="join-url">${escape(state.joinUrl)}</p>
        <button class="button outline" data-action="copy">${icons('link')} Copy join link</button>`;
            dialog.showModal();
    } else if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(state.joinUrl);
        button.textContent = 'Link copied!';
      } catch {
        content.innerHTML = `<h2 id="dialog-title">Share join link</h2><label>Join link<input readonly value="${escape(state.joinUrl)}"></label>`;
        if (!dialog.open) dialog.showModal();
        content.querySelector('input').select();
      }
    } else if(action==='estimate-reveal-skip'){
      await api('/'+current.code+'/estimate-reveal-skip',{game:state.game,index:state.index});
      await refresh();
    } else if (action === 'ceremony-skip') {
      await api('/' + current.code + '/ceremony', { game: state.game });
      await refresh();
    } else if (action === 'ready-toggle') {
      await api('/' + current.code + '/ready', { ready: !state.player.ready, lobbyVersion: state.lobbyVersion });
      await refresh();
    } else if (action === 'clock') {
      const { game, index, phase, clockVersion, pausedAt } = state;
      await api('/' + current.code + '/pause', { game, index, phase, clockVersion, paused: !pausedAt });
      await refresh();
    } else if (action === 'quick-replay') {
      await api('/' + current.code + '/rematch', { game: state.game, sameGame: true });
      await refresh();
    } else if (action === 'potato-rescue') {
      await api('/' + current.code + '/potato-rescue', { game: state.game, step: state.party.step });
      await refresh();
    } else if (action === 'night-next') {
      await api('/' + current.code + '/playlist/next', { game: state.game, version: state.night.version });
      await refresh();
    } else if (action === 'predict') {
      await api('/' + current.code + '/predict', { game: state.game, index: state.index, guess: button.dataset.guess });
      await refresh();
    } else if (action === 'board-path') {
      await api('/' + current.code + '/board-path', { index: state.index, game: state.game, path: button.dataset.path });
      await refresh();
    } else if (action === 'roll') {
      await api('/' + current.code + '/roll', { index: state.index, game: state.game });
      await refresh();
    } else if (action === 'advance') {
      await api('/' + current.code + '/advance', { phase: state.phase, index: state.index, game: state.game, lobbyVersion: state.lobbyVersion });
      await refresh();
    } else if (['answer', 'submit-special'].includes(action) && !submittingAnswer && state.phase === 'question' && state.selection === undefined) {
      const answer = { index: state.index, option: action === 'answer' ? Number(button.dataset.option) : specialValue, game: state.game };
      submittingAnswer = answer;
      render(state);
      updateTimer();
      try {
        await api('/' + current.code + '/answer', answer);
        if (session === current && state.game === answer.game && state.index === answer.index && state.phase === 'question') {
          state.selection ??= answer.option;
        }
      } finally {
        if (submittingAnswer === answer) submittingAnswer = undefined;
        if (current === session) {
          signature = undefined;
          render(state);
          updateTimer();
        }
      }
      await refresh();
    }
  } catch (error) {
    const warning = document.querySelector('#game-error');
    if (warning) warning.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

// Sketch strokes are streamed without waiting for the full UI refresh, keeping the artist's pen steady.
connectSketchPainter(async data=>{
  if(!session||state?.mode!=='sketch'||!state.party?.drawing||state.phase!=='sketch-draw')return;
  const game=state.game,index=state.index;
  await api('/'+session.code+'/party',{...data,game,index});
});

dialog.addEventListener('close', () => content.querySelector('video')?.pause());
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || dialog.open || session || !homeSelected) return;
  const id = homeSelected;
  homeSelected = undefined;
  renderModeCards(homeFilter);
  app.querySelector(`[data-action="preview-mode"][data-mode="${id}"]`)?.focus({preventScroll:true});
});
// Reflow at the desktop all-games threshold, including rotation and window resizing.
matchMedia('(min-width: 1100px) and (min-height: 700px)').addEventListener('change', () => {
  if(session || !app.querySelector('[data-home-shell]')) return;
  homePage=0;
  renderModeCards(homeFilter);
});
matchMedia('(max-width: 900px)').addEventListener('change', () => {
  if (session || !app.querySelector('[data-home-shell]')) return;
  homePage = 0;
  homeSelected = undefined;
  renderModeCards(homeFilter);
});
matchMedia('(max-width: 760px)').addEventListener('change', () => {
  if (session || !app.querySelector('[data-home-shell]')) return;
  homePage = 0;
  homeSelected = undefined;
  renderModeCards(homeFilter);
});

// The landing shelf turns by itself while nobody is browsing it.
let carouselTouchedAt = performance.now();
setInterval(() => {
  if (session || document.hidden || prefersReducedMotion() || performance.now() - carouselTouchedAt < 15000) return;
  if (dialog.open || carouselVoice || homeSelected) return;
  stepCarousel(1, { auto: true });
}, 6500);

/** Turn the shelf by `delta` games; the page and voice guide follow. */
function stepCarousel(delta, { auto = false } = {}) {
  const carousel = app.querySelector('#game-carousel');
  if (!carousel || carousel.hidden || !delta) return;
  if (!auto) carouselTouchedAt = performance.now();
  const list = launcherModes(homeFilter);
  carouselIndex = wrapIndex(carouselIndex + delta, list.length);
  if (!moveCarousel(carousel, list, carouselIndex, carouselVoice)) carousel.innerHTML = carouselView(list, carouselIndex, carouselVoice);
  const mode = list[carouselIndex][0];
  themeHome(app.querySelector('[data-home-shell]'), mode);
  stageFor(app.querySelector('[data-home-shell]'), mode);
  stopNarration();
  clearTimeout(carouselTimer);
  // Speak only once the shelf settles, so quick browsing stays quiet.
  if (carouselVoice) carouselTimer = setTimeout(() => { if (!carousel.hidden) toggleNarration(mode); }, 700);
}

function carouselInput(event) {
  const carousel = app.querySelector('#game-carousel');
  return !session && !dialog.open && carousel && !carousel.hidden && carousel.offsetParent !== null
    && !event.target.closest?.('input, textarea, select, [contenteditable="true"]');
}
// A TV remote's left/right arrives as arrow keys.
document.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !carouselInput(event)) return;
  event.preventDefault();
  stepCarousel(event.key === 'ArrowLeft' ? -1 : 1);
  const centre = app.querySelector('.carousel-card[aria-current="true"]');
  if (document.activeElement?.classList.contains('carousel-card')) centre?.focus({ preventScroll: true });
});
let carouselWheelAt = 0;
document.addEventListener('wheel', event => {
  if (!event.target.closest?.('.carousel-stage') || !carouselInput(event)) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (Math.abs(delta) < 8) return;
  event.preventDefault();
  if (performance.now() - carouselWheelAt < 380) return;
  carouselWheelAt = performance.now();
  stepCarousel(Math.sign(delta));
}, { passive: false });
let carouselSwipe;
// The click that follows a swipe must not also pick the card under the finger.
let carouselSwipedAt = 0;
document.addEventListener('pointerdown', event => {
  if (event.target.closest?.('.carousel-track') && event.isPrimary) carouselSwipe = { x: event.clientX, id: event.pointerId };
});
document.addEventListener('pointerup', event => {
  if (!carouselSwipe || carouselSwipe.id !== event.pointerId) return;
  const dx = event.clientX - carouselSwipe.x;
  carouselSwipe = undefined;
  if (Math.abs(dx) > 50 && carouselInput(event)) {
    stepCarousel(dx < 0 ? 1 : -1);
    carouselSwipedAt = performance.now();
  }
});
carouselScreen.addEventListener('change', () => {
  if (!session && app.querySelector('[data-home-shell]')) renderModeCards(homeFilter);
});

renderHome();
mobileDeck(app, dialog, content);
const code = new URLSearchParams(location.search).get('join');
const saved = restoreRoomSession();
if (saved && (!code || saved.code === code && !saved.host)) startSession(saved);
else if (code) {
  const remembered = rememberedPlayer(code);
  if (remembered) startSession(remembered);
  else openDialog('join', code);
}
function reconnectNow() {
  if (!session) return;
  if (stream && Date.now() - lastUpdate > 15000) stream.abort();
  if (!stream) {
    nextConnect = 0;
    connect();
  }
  refresh();
}
window.addEventListener('online', reconnectNow);
window.addEventListener('offline', () => {
  if (session) setConnectionStatus(true);
});
window.addEventListener('pageshow', event => {
  if (event.persisted) reconnectNow();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') reconnectNow();
});
setInterval(() => {
  if (!session) return;
  if (stream && Date.now() - lastUpdate > 26000) stream.abort();
  if (!stream) {
    if (Date.now() - lastPoll >= 3500) refresh();
    if (Date.now() >= nextConnect) connect();
  } else if (Date.now() - lastUpdate > 2500 && !streamReady) refresh();
}, 1000);
setInterval(() => {
  updateTimer();
  updateCeremony();
  updateSoCloseReveal();
  if (state?.phase === 'score-break') updateScoreBreak(app, Date.now() + offset);
}, 150);
