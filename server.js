import { clockExpired, roomTask, setClockPaused, stopDeadline, watchDeadline } from './room-clock.js';
import { caughtLast, finishRanks as orderedFinishRanks, nightAward, placementRanks } from './result-ranks.js';
import { revealPlan as estimateRevealPlan } from './public/so-close-reveal.js';
import { ESTIMATE_LIMIT } from './public/answer-controls.js';
import { deskAwards } from './awards.js';
import { answerValue, boardSpeedValues, bonusValues, canSetScore, defaultScoring, doubleSchedules, pointValues, roundMultiplier } from './public/scoring.js';
import { playlistLimit, queuedSettings } from './public/game-night.js';
import { isConnected, liveConnection, responseTarget, touchPlayer, trackConnection } from './room-presence.js';
import { boardLengths, boardRoute, boardPath, boardPathChoices, boardFork, boardFinish, boardMappedPosition, boardRequiresChoice, boardStopsAtFork, boardCornerPower, boardPowers, compareBoardTeams } from './public/board-route.js';
import { teamPlayModes, defaultPlayStyle, validPlayStyle, requiredPlayers, teamAssignments } from './public/team-play.js';
import { partyModes, startParty, advanceParty, advancePartyWhenReady, expireParty, rescuePotato, submitParty, publicParty, partyWhoIsIn } from './party-games.js';
import express from 'express';
import QRCode from 'qrcode';
import { randomBytes, randomInt } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { difficultyQuestions } from './difficulty-questions.js';
import { replayTimeline } from './public/race-replay.js';
import { advanceQuizRace, createQuizRace, publicRaceState, useRacePower, raceDifficulties, raceLengths, racePlacings, raceTracks, raceStyles, raceReplay, leagueCircuits, leagueTrack, createLeague, scoreLeagueRace, leagueStandings, setRacePaused, submitRaceAnswer } from './quiz-race.js';
import { networkInterfaces } from 'node:os';
import { inviteOriginOptions, qrJoinUrl } from './room-invite.js';
import { isRoomMember, positiveSetting, readAvatar, requestBudget } from './room-http.js';
import { fileURLToPath } from 'node:url';
import { validateQuiz, prepareCustomQuiz } from './public/custom-quiz.js';
import { boardQuestionOrder } from './board-questions.js';
import { boardQuestion, makeQuestions, makeSoCloseQuestions, questionCategories, verifiedSourceFor } from './questions.js';
import { soCloseSourceFor } from './so-close-bank.js';
import {questionHistoryId, questionHistoryLimit, validQuestionHistoryId} from './public/question-history.js';
import { isEstimateShow, maximumTeams, afterHoursModes, modes, themes, isQuestionFormat, formatTypes, difficulties, teams, socialModes, minimumPlayers, boardRollDuration, defaultTheme, fixedQuestionModes, questionCounts, wheelCategories, scoreIntervals, supportsScoreCheckpoints, maximumPlayers, capacityError } from './public/game-config.js';

const app = express();
const rooms = new Map();
const port = process.env.PORT || 3000;
const maxRooms = positiveSetting('MAX_ROOMS', 128);
const idleRoomMs = positiveSetting('ROOM_IDLE_MS', 4 * 60 * 60 * 1000);
// Full game-night and visual QA legitimately create more than 30 short-lived
// rooms from one host. Keep abuse bounded without blocking the 17-mode suite.
const createBudget = requestBudget(positiveSetting('ROOMS_PER_MINUTE', 60));
const joinBudget = requestBudget(positiveSetting('JOINS_PER_ROOM_PER_MINUTE', 360));
const categories = [...questionCategories, 'mixed'];
const token = () => randomBytes(18).toString('hex');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);
app.use(express.json({ limit: '128kb' }));
app.use('/vendor', express.static(fileURLToPath(new URL('./node_modules/three/build/', import.meta.url))));
app.use('/icons', express.static(fileURLToPath(new URL('./node_modules/lucide-static/icons/', import.meta.url))));
// The service worker and app manifest are checked for updates on every visit, so an installed
// Jambaloop never keeps an old copy of them.
app.use(['/sw.js', '/manifest.webmanifest'], (_req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});
app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

function readSettings(body = {}) {
  const { mode = 'classic', theme = defaultTheme, format = isEstimateShow(mode) ? 'estimate' : 'choice', category, count, seconds, autoReveal = false, includeChristmas = false, teamCount = mode === 'tracks' ? 2 : 4, boardLength = 24, playStyle = defaultPlayStyle(mode), privateQuestions = false, phoneView = 'answers', difficulty = 'standard', scoring, boardSpeed = 50, scoreInterval = 1, customQuiz = null, raceLength = 'medium', raceTrack = 'neon', raceDifficulty = 'mixed', raceLeague = false, raceStyle = 'quiz', afterDark = false } = body ?? {};
  if (typeof privateQuestions !== 'boolean' || !validPlayStyle(mode,playStyle) || (mode === 'tracks' && teamCount !== 2)) return;
  if (mode === 'quizrace' && (!raceLengths[raceLength] || !raceTracks.includes(raceTrack) || !raceDifficulties.includes(raceDifficulty) || typeof raceLeague !== 'boolean' || !raceStyles.includes(raceStyle) || format !== 'choice' || customQuiz !== null)) return;
  if (isEstimateShow(mode) && (format !== 'estimate' || privateQuestions || customQuiz !== null || difficulty !== 'standard')) return;
  const privateTeam = mode === 'showdown' && privateQuestions;
  if (privateTeam && customQuiz !== null) return;
  if (!boardLengths.includes(boardLength) || !['full', 'answers'].includes(phoneView) || !Number.isInteger(teamCount) || teamCount < 2 || teamCount > maximumTeams(mode)) return;
  let quiz;
  if (customQuiz !== null) {
    if (!fixedQuestionModes.includes(mode)) return;
    try { quiz = validateQuiz(customQuiz); } catch { return; }
  }
  if (!difficulties.some(([id]) => id === difficulty)) return;
  // The adults-only prompts exist for a named set of party games and must be asked for explicitly.
  if (typeof afterDark !== 'boolean' || (afterDark && !afterHoursModes.includes(mode))) return;
  if (difficulty !== 'standard' && (!fixedQuestionModes.includes(mode) || privateTeam || quiz || category !== 'mixed' || format !== 'choice' || includeChristmas)) return;
  const allowedCounts = questionCounts(mode, privateTeam ? 'choice' : format, privateTeam ? 'mixed' : category);
  if (!modes.some(([id]) => id === mode) || !themes.some(([id]) => id === theme)
    || !isQuestionFormat(format) || !categories.includes(category)
    || typeof autoReveal !== 'boolean' || typeof includeChristmas !== 'boolean' || (!quiz && mode !== 'knockout' && !allowedCounts.includes(count)) || ![0, 15, 20, 30, 45].includes(seconds)) return;
  if (scoring !== undefined && (!scoring || !pointValues.includes(scoring.base) || !bonusValues.includes(scoring.bonus)
    || !doubleSchedules.some(([id]) => id === scoring.doubles))) return;
  if (!boardSpeedValues.includes(boardSpeed) || !scoreIntervals.includes(scoreInterval)) return;
  const scores = isEstimateShow(mode) ? {base:100,bonus:0,doubles:'off'} : canSetScore(mode) ? (scoring
    ? { base: scoring.base, bonus: seconds ? scoring.bonus : 0, doubles: scoring.doubles }
    : defaultScoring(seconds)) : undefined;
  return { mode, theme, difficulty, raceLength, raceTrack, raceDifficulty, raceLeague: mode === 'quizrace' && raceLeague === true, raceStyle: mode === 'quizrace' ? raceStyle : 'quiz', scoring: scores, boardSpeed: seconds ? boardSpeed : 0, legacyScoring: !isEstimateShow(mode) && scoring === undefined, format: privateTeam ? 'choice' : format, category: fixedQuestionModes.includes(mode) && !privateTeam ? category : 'mixed', count: mode === 'knockout' ? KNOCKOUT_QUESTIONS : ['tracks', 'samepage', 'spotlight', 'brain', 'topanswers', 'rare', 'sketch', 'punchline', 'cards', 'bluff'].includes(mode) ? count : socialModes.includes(mode) ? 3 : partyModes.includes(mode) ? 1 : quiz?.questions.length ?? count,
    seconds, autoReveal, includeChristmas, afterDark, phoneView: privateTeam ? 'full' : phoneView, privateQuestions: privateTeam,
    teamCount, boardLength, playStyle, scoreInterval: supportsScoreCheckpoints(mode) ? scoreInterval : 1, customQuiz: quiz };
}

// Never promise more questions than the chosen topic and format can supply:
// the round would otherwise run off the end of the list mid-game.
function clampToQuestions(room) {
  if (fixedQuestionModes.includes(room.mode) && !room.customQuiz && !room.privateQuestions && room.questions.length)
    room.count = Math.min(room.count, room.questions.length);
}

function resetPlayer(player) {
  Object.assign(player, { score: 0, wins: 0, streak: 0, bestStreak: 0, misses: 0, comebacks: 0, fastest: undefined, slowest: undefined, pace: undefined, rightTime: undefined, rights: undefined, rounds: [] });
}

// Everyone who will play the next game: current players plus anyone queued.
const groupSize = room => room.players.size + room.waiting.size;

function roundQuestions({ mode, category, count, format, includeChristmas, difficulty }, seen) {
  return isEstimateShow(mode) ? makeSoCloseQuestions(category, count, seen, includeChristmas)
    : makeQuestions(category, count, seen, format, includeChristmas, difficulty);
}

// So Close references are cited sources, labelled separately from the
// independently verified multiple-choice set.
const answerSourceFor = (mode, prompt) => verifiedSourceFor(prompt) ?? (isEstimateShow(mode) ? soCloseSourceFor(prompt) : undefined);

function resetGame(room, settings) {
  // Carry already seen race prompts into the shared per-room history before replaying.
  if (room.race?.issued) for (const prompt of room.race.issued) room.seen.add(prompt);
  for (const [key, player] of room.waiting) room.players.set(key, player);
  room.waiting.clear();
  stopDeadline(room);
  clearEstimateTimers(room);
  Object.assign(room, settings, {
    settings, lobbyVersion: (room.lobbyVersion ?? 0) + 1, clockVersion: 0, pausedAt: 0,
    scoreBreak: undefined, lastScoreBreak: new Map(), estimateReveal: undefined, estimateGuesses: undefined,
    phase: 'lobby', index: 0, opened: 0, ends: 0, ceremony: undefined, awards: [], motion: null, predictions: new Map(), wheelRemaining: [], teams: [], roundReview: [], party: undefined, privateReview: new Map(), privateRound: undefined, remaining: room.players.size, race: undefined, league: undefined, replayShow: undefined,
    route: settings.mode === 'board' ? boardRoute(settings.boardLength, settings.includeChristmas) : undefined,
    quizTypes: settings.privateQuestions ? ['choice', 'boolean'] : settings.customQuiz ? [...new Set(settings.customQuiz.questions.map(item => item.type))] : undefined,
    questions: settings.customQuiz ? prepareCustomQuiz(settings.customQuiz) : fixedQuestionModes.includes(settings.mode) ? roundQuestions(settings, room.seen) : [],
  });
  clampToQuestions(room);
  room.answers.clear();
  for (const player of room.players.values()) {
    resetPlayer(player);
    player.ready = false;
    delete player.team;
    delete player.lives;
  }
}

app.post('/api/rooms', async (req, res) => {
  const retry = createBudget.retryIn(req.ip);
  if (retry) return res.set('Retry-After', String(retry)).status(429).json({ error: 'Too many room requests. Wait a moment and try again.' });
  if (rooms.size >= maxRooms) return res.set('Retry-After', '60').status(503).json({ error: 'All game rooms are in use. Please try again later.' });
  const settings = readSettings(req.body);
  if (!settings) return res.status(400).json({ error: 'Choose a game mode, category, question count and timer.' });
  let code;
  do { code = String(randomInt(100000, 1000000)); } while (rooms.has(code));
  const host = token();
  const room = { code, host, game: 1, revision: 0, clients: new Map(), seen: new Set(), players: new Map(), waiting: new Map(), liveConnections: new Map(), lastSeen: new Map(), night: { queue: [], played: 0, version: 0, results: [], standings: [] }, answers: new Map(), updated: Date.now() };
  resetGame(room, settings);
  // Lobby-first hosting: the room opens on a game carousel the captain drives.
  // It starts as a waiting room: nobody browses games until the party is started.
  if (req.body?.picker === true) { room.picker = { mode: settings.mode, version: 0 }; room.gathering = true; }
  // Prefer a real Wi-Fi/LAN address over localhost or virtual adapters.
  // Hosts can switch adapters from the lobby if the recommended one is unreachable.
  // Do not use x-forwarded-host/proto when generating invite links.
  room.joinOptions = inviteOriginOptions({
    publicUrl: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL, host: req.get('host'), protocol: req.protocol,
    port: server.address().port, interfaces: networkInterfaces()
  });
  room.joinUrl = qrJoinUrl(room.joinOptions[0].origin, code);
  rooms.set(code, room);
  try {
    room.qr = await QRCode.toDataURL(room.joinUrl, { margin: 2, width: 220 });
  } catch (error) {
    rooms.delete(code);
    throw error;
  }
  res.status(201).json({ code, host });
});

app.use('/api/rooms/:code', (req, res, next) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found. Check the code and try again.' });
  const key = req.get('x-game-key');
  const member = isRoomMember(room, key);
  res.locals.room = room;
  res.locals.key = key;
  res.locals.member = member;
  // Anonymous probes must not keep rooms alive or advance timers/game phases.
  if (member) {
    room.updated = Date.now();
    expireParty(room, publish);
    if (room.phase === 'question' && clockExpired(room)) reveal(room);
    touchPlayer(room, key);
  }
  next();
});

app.get('/api/rooms/:code', (_req, res) => {
  const { room, key, member } = res.locals;
  if (!member) return res.status(403).json({ error: 'Join the room to continue.' });
  res.json(roomState(room, key));
});

function controlsRoom(room, key) {
  return key === room.host || (room.captain !== undefined && key === room.captain);
}

// So Close reveals are staged on the server, not only in the animation.
// 'guesses': names and numbers only; 'answer': the actual value too;
// 'results': winners, distances, points and updated scores.
function estimateStage(room, now = Date.now()) {
  const reveal = room.estimateReveal;
  if (!isEstimateShow(room.mode) || room.phase !== 'reveal' || !reveal || reveal.skipped) return 'results';
  const plan = estimateRevealPlan(reveal.count);
  const elapsed = now - reveal.starts;
  return elapsed >= plan.duration ? 'results' : elapsed >= plan.duration - plan.actual ? 'answer' : 'guesses';
}

function clearEstimateTimers(room) {
  for (const timer of room.estimateTimers ?? []) clearTimeout(timer);
  room.estimateTimers = undefined;
}

function scheduleEstimateStages(room) {
  clearEstimateTimers(room);
  const { starts, count } = room.estimateReveal;
  const plan = estimateRevealPlan(count);
  const { game, index } = room;
  const publishStage = () => {
    if (room.phase === 'reveal' && room.game === game && room.index === index && room.estimateReveal?.starts === starts) publish(room);
  };
  room.estimateTimers = [plan.duration - plan.actual, plan.duration]
    .map(delay => setTimeout(() => roomTask(room, 'reveal stage', publishStage), Math.max(0, starts + delay - Date.now())));
}

function roomState(room, key, ranked = rankings(room), counts = liveCounts(room)) {
  const isHost = key === room.host;
  const captain = room.players.get(room.captain);
  const waiting = room.waiting.get(key);
  const player = room.players.get(key) ?? waiting;
  const { phase, index, code, category, questions, ends, opened, seconds, game, players, answers, qr, joinUrl } = room;
  const question = room.privateQuestions ? room.privateRound?.get(key) : questions[index];
  const visible = !waiting && (phase === 'question' || phase === 'reveal');
  const hiddenScores = room.scoreInterval !== 1 && !['lobby', 'finished'].includes(phase);
  const publicPlayer = ({ rounds, fastest, slowest, misses, comebacks, lifeLostAt, outAt, returning, rightTime, rights, ...entry }) => phase === 'lobby' && isHost
    ? { ...entry, connected: counts.ids.has(entry.id) } : entry;
  const revealed = phase === 'reveal';
  const answer = answers.get(key);
  const { correct, ...publicQuestion } = question ?? {};
  const estimateHold = revealed && isEstimateShow(room.mode) ? estimateStage(room) : 'results';
  const holdOutcome = estimateHold !== 'results';
  const holdAnswer = estimateHold === 'guesses';
  // Until the winner moment, every view sees pre-round scores and standings.
  const held = entry => holdOutcome && room.estimateReveal?.before?.has(entry.id)
    ? { ...entry, ...room.estimateReveal.before.get(entry.id) } : entry;
  const standingsOrder = holdOutcome ? ranked.map(held).sort(comparePlayers) : ranked;
  const leaderboard = (isHost && !hiddenScores ? standingsOrder : !waiting && phase === 'finished' ? standingsOrder.slice(0, 10) : []).map(publicPlayer);
  const activeTeam = room.mode === 'board' && room.teams.length ? index % room.teams.length : undefined;
  const scoreBreak = phase === 'score-break' && !waiting ? room.scoreBreak : undefined;
  const ownCheckpoint = scoreBreak && player ? room.lastScoreBreak.get(room.teams.length ? player.team : player.id)?.row : undefined;
  const scoresPublished = room.scoreInterval === 1 || phase === 'finished';
  const playerScore = room.lastScoreBreak.get(player?.id)?.row.score ?? 0;
  const finalRanks = phase === 'finished' ? finishRanks(room, ranked, comparePlayers) : undefined;
  // TV only: who has locked in, in lock order, never what they chose. After the
  // reveal each stamp says right or wrong; So Close stages its own reveal.
  // Sized for a full room of 300: the TV gets the 12 most recent faces plus
  // the totals, not one entry per player on every update.
  const showLocks = isHost && visible && !(revealed && isEstimateShow(room.mode));
  const lockList = showLocks ? [...answers] : [];
  const lockIns = showLocks ? lockList.slice(-12).flatMap(([playerKey, entry]) => {
    const participant = players.get(playerKey);
    return participant ? [{ id: participant.id, name: participant.name, avatar: participant.avatar, ...(revealed ? { won: Boolean(entry.won) } : {}) }] : [];
  }) : undefined;
  const lockCount = showLocks ? lockList.length : undefined;
  const lockRight = showLocks && revealed ? lockList.filter(([, entry]) => entry.won).length : undefined;
  return { revision: room.revision, code, category, phase: waiting ? 'waiting' : phase, index, total: room.count, seconds, game, opened, ends, answered: answers.size,
    lockIns, lockCount, lockRight,
    wayOut: room.mode === 'wayoff' && revealed && estimateHold === 'results' ? room.wayOut : undefined,
    stillIn: room.mode === 'wayoff' && phase !== 'lobby' ? room.remaining : undefined,
    out: room.mode === 'wayoff' && player ? player.lives === 0 : undefined,
    liveGuesses: isHost && phase === 'question' && !room.privateQuestions && room.questions[index]?.type === 'estimate' ? liveGuesses(room) : undefined,
    picker: phase === 'lobby' && !waiting && room.picker ? { ...room.picker } : undefined,
    welcome: phase === 'lobby' && !waiting ? room.welcome : undefined,
    // The waiting room before "Start the party": join, but no carousel yet.
    gathering: phase === 'lobby' && !waiting && room.picker && room.gathering ? true : undefined,
    // The chosen game's "how to play" guide is on the TV.
    briefing: phase === 'lobby' && !waiting && !room.picker ? room.briefing : undefined,
    // TV only: everyone here has played or seen the welcome before.
    everyoneReturning: isHost && players.size > 0 && [...players.values()].every(entry => entry.returning) || undefined,
    connected: counts.connected, waitingCount: room.waiting.size, responseTarget: counts.target,
    readyCount: phase === 'lobby' ? counts.ready : undefined, lobbyVersion: room.lobbyVersion,
    pausedAt: !waiting && room.pausedAt ? room.pausedAt : undefined, clockVersion: room.clockVersion,
    night: room.night, difficulty: room.difficulty, prediction: publicPrediction(room, key),
    scoring: room.scoring, boardSpeed: room.boardSpeed, boost: roundMultiplier(room.scoring, index, room.count),
    scoreInterval: room.scoreInterval, scoreCheckpointNext: revealed && !waiting && scoreCheckpointDue(room),
    scoreBreak: scoreBreak ? {
      starts: scoreBreak.starts, number: scoreBreak.number, entryCount: scoreBreak.entries.length,
      entries: isHost ? scoreBreak.entries : undefined,
      own: ownCheckpoint,
    } : undefined,
    ceremony: isHost && phase === 'finished' ? room.ceremony : undefined,
    awards: !waiting && phase === 'finished' ? room.awards : undefined,
    mode: room.mode, playStyle: room.playStyle, privateQuestions: room.privateQuestions, party: waiting ? undefined : publicParty(room, key), whoIsIn: waiting ? undefined : partyWhoIsIn(room), race: room.mode === 'quizrace' && room.race ? publicRaceState(room.race, key, isHost) : undefined, raceLength: room.raceLength, raceTrack: room.raceTrack, raceDifficulty: room.raceDifficulty, raceLeague: room.raceLeague || undefined,
    // `playing` flips when the replay ends, so every screen's state changes and the results come up everywhere at once.
    raceReplay: room.mode === 'quizrace' && room.replayShow && ['finished', 'race-standings'].includes(room.phase) ? { ...room.replayShow, playing: Date.now() < room.replayShow.until } : undefined,
    raceStyle: room.mode === 'quizrace' ? room.raceStyle : undefined, league: room.mode === 'quizrace' ? publicLeague(room) : undefined, phoneView: room.phoneView, isCaptain: key === room.captain, captainId: captain?.id, captainName: captain?.name,
    quizTitle: room.customQuiz?.title, quizTypes: room.quizTypes,
    // Names and selfies of everyone playing, so each screen can show a face beside a name.
    // Already visible to the room in the lobby; left out of very large rooms to keep updates small.
    roster: !waiting && players.size <= 60 ? [...players.values()].map(entry => ({ id: entry.id, name: entry.name, avatar: entry.avatar })) : undefined,
    includeChristmas: room.includeChristmas, afterDark: room.afterDark || undefined, autoReveal: room.autoReveal, theme: room.theme, format: room.format, motion: room.motion, activeTeam,
    teams: hiddenScores ? room.teams.map(team => ({ ...team, score: room.lastScoreBreak.get(team.id)?.row.score ?? 0, roundPoints: undefined })) : room.teams,
    lastTurn: revealed && finalTurn(room), teamWinners: phase === 'finished' && room.teams.length ? winningTeams(room) : undefined, teamCount: room.teamCount, boardLength: room.boardLength,
    teamPreview: phase === 'lobby' && room.players.size &&
      (room.playStyle === 'teams' || (room.mode === 'board' && room.players.size <= 4)) ?
      teamAssignments(room.players,room.mode,room.playStyle,room.teamCount,{allowUnfilled:true}).groups : undefined,
    raceTeams: room.mode === 'quizrace' && room.teams.length && room.race ?
      room.teams.map(team => {
        const racers = [...room.race.racers.values()].filter(racer => team.members.some(member => member.id === racer.id));
        return {id:team.id,name:team.name,color:team.color,size:team.size,
          distance:Math.max(0,...racers.map(racer => racer.distance)),
          finishedAt:Math.min(Infinity,...racers.map(racer => racer.finishedAt ?? Infinity))};
      }).sort((a,b)=>a.finishedAt-b.finishedAt || b.distance-a.distance) : undefined,
    boardFork: room.mode === 'board' ? boardFork(room.boardLength) : undefined,
    // 50/50 goes to the team that played it and to nobody else, the TV included.
    removedOptions: room.mode === 'board' && phase === 'question' && player && room.fifty?.get(player.team)?.index === index ? room.fifty.get(player.team).removed : undefined,
    questionRefreshed: room.mode === 'board' && phase === 'question' && room.skipped?.index === index ? room.teams[room.skipped.by]?.name : undefined,
    players: leaderboard, playerCount: players.size, player: player ? { ...publicPlayer(held(player)), score: scoresPublished ? held(player).score : playerScore } : undefined,
    review: !waiting && phase === 'finished' ? (room.privateQuestions ? room.privateReview.get(key) ?? [] : room.roundReview).map((review, i) => ({
      ...review,
      prompt: isHost || room.phoneView === 'full' ? review.prompt : undefined,
      result: player?.rounds[i],
    })) : undefined,
    remaining: room.mode === 'knockout' && phase !== 'lobby' ? room.remaining : undefined,
    level: room.mode === 'knockout' && phase !== 'lobby' ? knockoutLevel(index) : undefined,
    levelUp: room.mode === 'knockout' && phase === 'question' && index > 0 && index < KNOCKOUT_QUESTIONS && index % KNOCKOUT_PER_LEVEL === 0 ? true : undefined,
    quickWin: room.mode === 'knockout' && revealed && room.players.size > 2 && index === 2 && room.remaining === 1 ? true : undefined,
    decider: room.mode === 'knockout' && phase !== 'lobby' && room.decider ? true : undefined,
    deciderBoard: room.mode === 'knockout' && revealed && isHost ? room.deciderBoard : undefined,
    knockoutNote: room.mode === 'knockout' && revealed ? room.knockoutNote : undefined,
    knockout: room.mode === 'knockout' && isHost && visible ? knockoutLadder(room, revealed) : undefined,
    // Your own phone only: whether you lost a heart this round (and went out).
    lostLife: room.mode === 'knockout' && revealed && player?.lifeLostAt === index ? true : undefined,
    knockedOut: room.mode === 'knockout' && revealed && player?.outAt === index ? true : undefined,
    rank: player ? finalRanks?.get(player.id) : undefined, selection: answers.get(key)?.option, now: Date.now(),
    answerCorrect: revealed && answer && !holdOutcome ? Boolean(answer.won) : undefined,
    earned: revealed && !hiddenScores && !holdOutcome && answer?.won ? answer.points : undefined,
    closest: revealed && !holdOutcome && question?.type === 'estimate' ? room.closest : undefined,
    estimateReveal: isEstimateShow(room.mode) && revealed && !waiting && room.estimateReveal ? {
      starts: room.estimateReveal.starts, count: room.estimateReveal.count, skipped: room.estimateReveal.skipped, stage: estimateHold,
    } : undefined,
    estimateGuesses: isEstimateShow(room.mode) && revealed && isHost && room.estimateGuesses ? (holdOutcome
      ? room.estimateGuesses.map(({ id, name, guess }) => ({ id, name, guess })).sort((a, b) => a.guess - b.guess || a.id.localeCompare(b.id))
      : room.estimateGuesses) : undefined,
    breakdown: revealed && isHost && !room.privateQuestions && ['choice', 'boolean'].includes(question.type) ? question.options.map((_, option) =>
      [...answers.values()].filter(entry => entry.option === option).length) : undefined,
    question: visible && question ? { ...publicQuestion, ...(question.type === 'estimate' && !revealed ? { min: undefined, max: undefined } : {}), historyId:questionHistoryId(question.prompt), basePoints: room.motion?.points ?? (question.type === 'estimate' && room.legacyScoring ? 1000 : room.scoring?.base), prompt: isHost || room.phoneView === 'full' ? publicQuestion.prompt : undefined, correct: revealed && !holdAnswer ? correct : undefined, source: revealed && !holdAnswer ? answerSourceFor(room.mode, question.prompt) : undefined } : undefined,
    qr: isHost ? qr : undefined, joinUrl: isHost ? joinUrl : undefined,
    joinOptions: isHost ? room.joinOptions : undefined };
}

// Knockout's survivor ladder for the TV: lives, never answers. Who lost a heart
// (and who went out) this round is shown only once the round is revealed.
function knockoutLadder(room, revealed) {
  const rows = [...room.players.values()].map(player => ({
    id: player.id, name: player.name, avatar: player.avatar, lives: player.lives ?? 0, score: player.score,
    lost: revealed && player.lifeLostAt === room.index, out: !player.lives,
    outNow: revealed && player.outAt === room.index, outAt: player.outAt,
  }));
  const survivors = rows.filter(row => !row.out).sort((a, b) => b.lives - a.lives || b.score - a.score);
  const out = rows.filter(row => row.out).sort((a, b) => b.outAt - a.outAt || b.score - a.score);
  // Sized for 300 players: the top of the ladder, everyone who fell this
  // round (capped) and the most recent knockouts, with the true count.
  const strip = ({ score, outAt, ...row }) => row;
  return { survivorCount: survivors.length, survivors: survivors.slice(0, 8).map(strip), out: out.slice(0, 12).map(strip),
    outNowCount: out.filter(row => row.outNow).length };
}

// Level on points in a quiz goes to whoever answered their right answers faster
// (`pace`, average milliseconds). Games that never set a pace still share places.
const paceOf = entry => entry.pace ?? 0;
const comparePlayers = (a, b) => (b.lives ?? 0) - (a.lives ?? 0) || b.score - a.score || paceOf(a) - paceOf(b);
const compareTeams = (mode, spaces) => mode === 'board' ? compareBoardTeams(spaces) : (a, b) => b.score - a.score || paceOf(a) - paceOf(b);

// Hot Potato awards no points: whoever is caught holding it finishes last and
// everyone else shares first. Ranking by score would tie the whole room, so the
// caught player used to collect a win and three Game Night stars.
const caughtHolder = room => room.mode === 'potato' ? room.players.get(room.party?.holder)?.id : undefined;

// A Quiz Race league: points for every placing over three races, one on each circuit. The table is ordered by
// points, then by the most recent race, so there is always one champion.
function leagueTable(room) {
  return room.league ? leagueStandings(room.league).filter(row => room.players.has(row.key)) : [];
}

function publicLeague(room) {
  const { league } = room;
  if (!league) return undefined;
  const next = league.round < league.races ? leagueCircuits[league.round] : undefined;
  return { races: league.races, round: league.round, next, nextTrack: next ? leagueTrack(room.raceTrack, league.round) : undefined,
    table: leagueTable(room).map((row, index) => { const player = room.players.get(row.key); return { id: player.id, name: player.name, position: index + 1, points: row.points, gained: row.gained }; }) };
}

/** A league race has finished: score it. Returns true when the league is over. */
function finishLeagueRace(room) {
  const keyOf = racer => [...room.race.racers].find(([, entry]) => entry === racer)?.[0];
  const over = scoreLeagueRace(room.league, racePlacings(room.race).map(keyOf));
  for (const [key, player] of room.players) if (room.league.points.has(key)) player.score = room.league.points.get(key);
  return over;
}

function rankings(room) {
  if (room.mode === 'quizrace' && room.league) return leagueTable(room).map(row => room.players.get(row.key));
  if (room.mode === 'quizrace' && room.race) return racePlacings(room.race).map(r => [...room.players.values()].find(p => p.id === r.id));
  return caughtLast([...room.players.values()], comparePlayers, caughtHolder(room));
}

function finishRanks(room, rows, compare) {
  return orderedFinishRanks(rows, compare, { distinctPositions: room.mode === 'quizrace' && Boolean(room.race), caughtId: caughtHolder(room) });
}

function recordNightResult(room) {
  if (room.phase !== 'finished' || room.night.lastScoredGame === room.game) return;
  const teamResult = room.teams.length && room.mode !== 'quizrace' &&
    (room.playStyle === 'teams' || room.mode === 'board');
  const compare = teamResult ? compareTeams(room.mode, room.boardLength) : comparePlayers;
  const rows = teamResult ? [...room.teams].sort(compare) : rankings(room);
  // Quiz Race players all approach 100 score at the finish line. Use their
  // actual race finishing order; point-based games still preserve shared places.
  const ranks = teamResult ? placementRanks(rows, compare) : finishRanks(room, rows, compare);
  const caught = caughtHolder(room);

  for (const player of room.players.values()) {
    const resultId = teamResult ? player.team : player.id;
    const placing = ranks.get(resultId);
    if (!placing) continue;
    let standing = room.night.standings.find(entry => entry.id === player.id);
    if (!standing) {
      standing = {id: player.id, name: player.name, avatar: player.avatar, stars: 0, wins: 0, podiums: 0, games: 0};
      room.night.standings.push(standing);
    }
    standing.name = player.name;
    standing.avatar = player.avatar;
    standing.games++;
    const award = nightAward(placing, player.id === caught);
    standing.stars += award.stars;
    if (award.win) standing.wins++;
    if (award.podium) standing.podiums++;
  }
  room.night.standings.sort((a, b) => b.stars - a.stars || b.wins - a.wins || a.name.localeCompare(b.name));
  room.night.results.push({
    game: room.game,
    mode: room.mode,
    winners: room.night.standings.filter(entry => {
      const player = [...room.players.values()].find(candidate => candidate.id === entry.id);
      return player && ranks.get(teamResult ? player.team : player.id) === 1;
    }).map(entry => entry.id),
  });
  room.night.results = room.night.results.slice(-24);
  room.night.lastScoredGame = room.game;
}

function liveCounts(room) {
  const ids = new Set();
  let ready = 0;
  for (const [key, player] of room.players) {
    if (!isConnected(room, key)) continue;
    ids.add(player.id);
    if (player.ready) ready++;
  }
  return { ids, ready, connected: ids.size, target: responseTarget(room) };
}

function canWriteLive(client) {
  if (client.destroyed || client.writableEnded) return false;
  if (client.writableLength <= 128 * 1024) return true;
  client.destroy();
  return false;
}

function sendState(room, key, client, ranked, counts) {
  if (!canWriteLive(client)) return;
  client.write(JSON.stringify(roomState(room, key, ranked, counts)) + '\n');
}

function publish(room, hostOnly = false) {
  recordNightResult(room);
  room.revision++;
  if (!hostOnly) {
    clearTimeout(room.hostUpdate);
    room.hostUpdate = undefined;
    const ranked = rankings(room);
    const counts = liveCounts(room);
    for (const [client, key] of room.clients) sendState(room, key, client, ranked, counts);
    return;
  }
  if (!room.hostUpdate) {
    room.hostUpdate = setTimeout(() => roomTask(room, 'host update', () => {
      room.hostUpdate = undefined;
      const ranked = rankings(room);
      const counts = liveCounts(room);
      for (const [client, key] of room.clients) {
        if (room.phase === 'lobby' || controlsRoom(room, key)) sendState(room, key, client, ranked, counts);
      }
    }), 100);
  }
}

// Let the TV host switch to a reachable network adapter. Do not allow arbitrary external URLs.
app.post('/api/rooms/:code/invite', async (req, res) => {
  const {room, key} = res.locals;
  if (key !== room.host) return res.status(403).json({error: 'Only the TV host can change the join address.'});
  const option = room.joinOptions?.find(entry => entry.origin === req.body?.origin);
  if (!option) return res.status(400).json({error: 'Choose one of the listed connection addresses.'});
  const url = qrJoinUrl(option.origin, room.code);
  try {
    const qr = await QRCode.toDataURL(url, {margin: 2, width: 220});
    room.joinUrl = url;
    room.qr = qr;
    publish(room);
    res.sendStatus(204);
  } catch {
    res.status(500).json({error: 'Could not generate the new QR code. Try again.'});
  }
});

app.get('/api/rooms/:code/live', (_req, res) => {
  const { room, key, member } = res.locals;
  if (!member) return res.status(403).json({ error: 'Join the room to continue.' });
  if (liveConnection(room, key)) {
    return res.set('Retry-After', '5').status(409).json({ error: 'This session is already receiving live updates. Try again shortly.' });
  }
  res.set({ 'Content-Type': 'application/x-ndjson', 'X-Accel-Buffering': 'no', 'Cache-Control': 'no-store, no-transform' });
  res.flushHeaders();
  room.clients.set(res, key);
  res.once('close', () => {
    room.clients.delete(res);
    room.updated = Date.now();
  });
  trackConnection(room, key, res);
  sendState(room, key, res);
});

app.post('/api/rooms/:code/join', (req, res) => {
  const { room } = res.locals;
  const retry = joinBudget.retryIn(room.code + '/' + req.ip);
  if (retry) return res.set('Retry-After', String(retry)).status(429).json({ error: 'Too many attempts to join. Wait a moment and try again.' });
  const name = typeof req.body?.name === 'string' ? req.body.name.normalize('NFC').trim() : '';
  if (!name || name.length > 24 || /[\p{Cc}\p{Bidi_Control}]/u.test(name)) {
    return res.status(400).json({ error: 'Enter a nickname of up to 24 characters with no control characters.' });
  }
  // Joining counts queued players too; Board Race keeps room for a Teams switch.
  if (room.players.size + room.waiting.size >= maximumPlayers(room.mode)) return res.status(409).json({ error: 'This room is full.' });
  if ([...room.players.values(), ...room.waiting.values()].some(player => player.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'That nickname is taken.' });
  }
  const key = token();
  const avatar = readAvatar(req.body?.avatar);
  if (req.body?.avatar !== undefined && !avatar) {
    return res.status(400).json({ error: 'Use a smaller selfie or join without a photo.' });
  }
  const id = token();
  const seenQuestions = req.body?.seenQuestions ?? [];
  if (!Array.isArray(seenQuestions) || seenQuestions.length > questionHistoryLimit ||
      seenQuestions.some(id => !validQuestionHistoryId(id)))
    return res.status(400).json({ error: 'Your question history could not be loaded. Clear local game history and retry.' });
  const player = { id, name, ready: false, avatar: avatar ? '/api/rooms/' + room.code + '/avatar/' + id : undefined,
    // This phone has already seen the welcome or played before.
    returning: req.body?.returning === true };
  // Each player's optional device history influences the next question selection.
  for (const id of seenQuestions) room.seen.add(id);
  if (avatar) {
    room.avatars ??= new Map();
    room.avatars.set(id, avatar);
  }
  resetPlayer(player);
  if (room.phase === 'lobby') {
    room.players.set(key, player);
    room.captain ??= key;
  } else room.waiting.set(key, player);
  touchPlayer(room, key);
  room.updated = Date.now();
  res.status(201).json({ key });
  publish(room, true);
});

app.post('/api/rooms/:code/ready', (req, res) => {
  const { room, key } = res.locals;
  const player = room.players.get(key);
  const { ready, lobbyVersion } = req.body ?? {};
  if (!player) return res.status(403).json({ error: 'Join the lobby to mark yourself ready.' });
  if (room.phase !== 'lobby' || lobbyVersion !== room.lobbyVersion) return res.status(409).json({ error: 'The lobby has changed.' });
  if (typeof ready !== 'boolean') return res.status(400).json({ error: 'Choose a ready status.' });
  if (player.ready !== ready) {
    player.ready = ready;
    publish(room, true);
  }
  res.sendStatus(204);
});

app.get('/api/rooms/:code/avatar/:id', (req, res) => {
  if (!res.locals.member) return res.status(403).json({ error: 'Join the room to view photos.' });
  const avatar = res.locals.room.avatars?.get(req.params.id);
  if (!avatar) return res.sendStatus(404);
  res.type('jpeg').set({ 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' }).send(avatar);
});

// A host can recover a disconnected holder, but never steal the turn from
// someone still online or within the existing reconnect grace.
app.post('/api/rooms/:code/potato-rescue', (req, res) => {
  const {room,key}=res.locals;
  if(key!==room.host)return res.status(403).json({error:'Only the TV host can reassign a disconnected potato.'});
  if(room.mode!=='potato'||room.phase!=='party-potato'||req.body?.game!==room.game||req.body?.step!==room.party?.step)
    return res.status(409).json({error:'This Hot Potato turn has moved on.'});
  const [status,message]=rescuePotato(room,publish);
  if(message)return res.status(status).json({error:message});
  return res.sendStatus(status);
});

app.post('/api/rooms/:code/party', (req, res) => {
  const [status, message] = submitParty(res.locals.room, res.locals.key, req.body, publish);
  if (message) return res.status(status).json({ error: message });
  if (status === 204 && ['party-write', 'party-vote'].includes(res.locals.room.phase)) {
    for (const [client, key] of res.locals.room.clients) {
      if (key === res.locals.key) sendState(res.locals.room, key, client);
    }
  }
  res.sendStatus(status);
});

function winningTeams(room) {
  if (room.mode === 'quizrace' && room.race) {
    const winner = room.league ? room.players.get(leagueTable(room)[0]?.key)?.id : racePlacings(room.race)[0]?.id;
    return room.teams.filter(team => team.members.some(member => member.id === winner)).map(team => team.id);
  }
  if (room.mode === 'knockout') {
    const living = team => team.members.filter(member =>
      [...room.players.values()].some(player => player.id === member.id && player.lives > 0)).length;
    const count = Math.max(...room.teams.map(living));
    if (count > 0) return room.teams.filter(team => living(team) === count).map(team => team.id);
  }
  const compare = compareTeams(room.mode,room.boardLength);
  const ordered = [...room.teams].sort(compare);
  return ordered.filter(team => compare(team, ordered[0]) === 0).map(team => team.id);
}

// Knockout: six levels of ten questions, each level harder than the last, and
// play continues until one player (or one team) is left standing. If more
// than one survives all sixty, a closest-number decider settles it.
// Ten per level in play; tests shorten it.
const KNOCKOUT_PER_LEVEL = Math.max(1, Number(process.env.KNOCKOUT_PER_LEVEL) || 10);
const KNOCKOUT_LEVELS = 6;
const KNOCKOUT_QUESTIONS = KNOCKOUT_PER_LEVEL * KNOCKOUT_LEVELS;
const KNOCKOUT_DECIDER_LIMIT = 10;
function knockoutUndecided(room) {
  if (room.mode !== 'knockout' || room.players.size < 2) return false;
  const living = [...room.players.values()].filter(player => player.lives > 0);
  return room.teams.length ? new Set(living.map(player => player.team)).size > 1 : living.length > 1;
}
const knockoutLevel = index => Math.min(KNOCKOUT_LEVELS, Math.floor(index / KNOCKOUT_PER_LEVEL) + 1);

// Draw the next Knockout question just before it is asked.
function knockoutQuestion(room) {
  const recent = new Set(room.questions.map(question => question.prompt));
  const fresh = list => list.find(question => question && !recent.has(question.prompt)) ?? list.find(Boolean);
  if (room.index >= KNOCKOUT_QUESTIONS) return fresh(makeQuestions('mixed', 20, room.seen, 'estimate', room.includeChristmas));
  const level = knockoutLevel(room.index);
  const types = formatTypes(room.format).filter(type => ['choice', 'boolean'].includes(type));
  const format = types.length ? types[room.index % types.length] : 'choice';
  const levelled = Object.keys(boardQuestionOrder).filter(id => id !== 'christmas' || room.includeChristmas);
  const topics = room.category !== 'mixed' && levelled.includes(room.category) ? [room.category]
    : room.category === 'mixed' ? levelled : [];
  const drawn = [];
  for (let attempt = 0; attempt < 8 && topics.length; attempt++) {
    try {
      const question = boardQuestion(topics[randomInt(topics.length)], format, level, room.seen);
      if (question?.prompt && !recent.has(question.prompt)) return question;
      if (question?.prompt) drawn.push(question);
    } catch { /* a small topic may have nothing at this level */ }
  }
  // Specialist topics have no levels: fall back to the topic's own bank, then Mixed Bag.
  return fresh([...drawn, ...makeQuestions(room.category, 30, room.seen, format, room.includeChristmas), ...makeQuestions('mixed', 30, room.seen, 'choice', room.includeChristmas)]);
}

// Way Off: every round the furthest guess goes out, until one player is left.
const WAYOFF_ROUND_LIMIT = 60;
const wayOffLiving = room => [...room.players].filter(([, player]) => player.lives > 0);

function finalTurn(room) {
  if (room.mode === 'wayoff') return wayOffLiving(room).length <= 1 || room.index + 1 >= WAYOFF_ROUND_LIMIT;
  if (room.mode === 'knockout' && room.players.size > 1)
    return !knockoutUndecided(room) || room.index + 1 >= KNOCKOUT_QUESTIONS + KNOCKOUT_DECIDER_LIMIT;
  return room.index + 1 >= room.count
    || (room.mode === 'knockout' && (room.teams.length
      ? new Set([...room.players.values()].filter(player=>player.lives>0).map(player=>player.team)).size <= 1
      : room.remaining <= (room.players.size > 1 ? 1 : 0))) || (room.mode === 'board' && room.teams.some(team => team.position >= boardFinish(room.boardLength,team.pathChoice)));
}

function scoreCheckpointDue(room) {
  return room.scoreInterval > 1 && (room.index + 1) % room.scoreInterval === 0 && !finalTurn(room);
}

function openScoreBreak(room) {
  const board = room.mode === 'board';
  const compare = room.teams.length ? compareTeams(room.mode,room.boardLength) : comparePlayers;
  const rows = room.teams.length ? room.teams : [...room.players.values()];
  const initialOrder = new Map(rows.map(({ id }, index) => [id, index]));
  const previous = room.lastScoreBreak;
  const ordered = [...rows].sort(compare);
  let rank = 1;
  const entries = ordered.map((row, index) => {
    if (index && compare(row, ordered[index - 1]) !== 0) rank = index + 1;
    const older = previous.get(row.id);
    return {
      id: row.id, name: row.name, avatar: row.avatar, color: row.color,
      // Individual hot streaks earn a flame on the TV scoreboard.
      streak: room.teams.length ? undefined : row.streak,
      score: row.score, previousScore: older?.row.score ?? 0, rank, previousRank: older?.row.rank ?? 1,
      previousIndex: older?.index ?? initialOrder.get(row.id),
      position: board ? row.position : undefined, previousPosition: board ? older?.row.position ?? 0 : undefined,
    };
  });
  room.lastScoreBreak = new Map(entries.map((row, index) => [row.id, { row, index }]));
  room.scoreBreak = { starts: Date.now(), number: room.index + 1, entries };
  room.phase = 'score-break';
  publish(room);
}

function nextTurn(room) {
  room.index++;
  room.scoreBreak = undefined;
  if (fixedQuestionModes.includes(room.mode) && room.mode !== 'dice') openQuestion(room);
  else readyTurn(room);
}

function reveal(room) {
  const question = room.questions[room.index];
  const before = isEstimateShow(room.mode) ? new Map([...room.players.values()].map(player =>
    [player.id, { score: player.score, wins: player.wins, streak: player.streak, bestStreak: player.bestStreak }])) : undefined;
  const estimates = question.type === 'estimate' ? [...room.answers.values()] : [];
  const distance = estimates.length ? Math.min(...estimates.map(answer => Math.abs(answer.option - question.correct))) : undefined;
  room.closest = question.type === 'estimate' && distance !== undefined
    ? { distance, count: estimates.filter(answer => Math.abs(answer.option - question.correct) === distance).length } : undefined;
  const tallies = room.teams.map(() => 0);
  for (const [key, answer] of room.answers) {
    const actual = room.privateRound?.get(key) ?? question;
    const won = question.type === 'estimate' ? Math.abs(answer.option - question.correct) === distance
      : question.type === 'order' ? answer.option.every((item, index) => item === question.correct[index])
      : answer.option === actual.correct;
    if (!won) continue;
    answer.won = true;
    if (isEstimateShow(room.mode)) answer.points = answer.option === question.correct ? 200 : 100;
    const player = room.players.get(key);
    // Only the active team's correct answers earn the Power Lane multiplier.
    // Other teams still answer the shared question at its normal value.
    if (room.mode === 'board' && room.motion?.pathMultiplier === 2 &&
        player.team === room.index % room.teams.length) {
      answer.points = Math.round(answer.points * 2 * 100) / 100;
    }
    // Double Points, played by this player's team, doubles what they earn here;
    // Half Points, played on them by a rival, halves it.
    if (room.mode === 'board' && room.teams[player.team]?.armed?.points) answer.points = Math.round(answer.points * 2 * 100) / 100;
    if (room.mode === 'board' && room.teams[player.team]?.halved) answer.points = Math.round(answer.points * .5 * 100) / 100;
    player.score += answer.points;
    if (room.mode === 'board') player.score = Math.round(player.score * 100) / 100;
    if (room.teams.length) tallies[player.team] += answer.points;
    if (room.teams[player.team] && !isEstimateShow(room.mode)) { const side = room.teams[player.team]; side.rights = (side.rights ?? 0) + 1; side.time = (side.time ?? 0) + answer.elapsed; }
    if (!isEstimateShow(room.mode)) {
      player.rightTime = (player.rightTime ?? 0) + answer.elapsed;
      player.rights = (player.rights ?? 0) + 1;
      player.pace = Math.round(player.rightTime / player.rights);
    }
  }
  if (room.mode === 'board') {
    // Whatever was played on this question is now spent.
    for (const team of room.teams) {
      team.used = { points: team.armed?.points || undefined, halved: team.halved ? true : undefined };
      if (team.armed) team.armed.points = false;
      team.halved = undefined;
    }
    room.fifty = new Map();
    room.skipped = undefined;
  }
  if (room.teams.length) {
    const precision = room.mode === 'board' ? 100 : 1;
    for (const team of room.teams) {
      team.roundPoints = Math.round(precision * tallies[team.id] / team.size) / precision;
      team.score = Math.round(precision * (team.score + team.roundPoints)) / precision;
      if (room.mode === 'board') { team.correct = (team.rights ?? 0) / team.size; team.pace = team.rights ? team.time / team.rights : Infinity; }
      else if (team.rights) team.pace = Math.round(team.time / team.rights);
    }
  }
  const correct = question.type === 'estimate' ? question.correct
    : question.type === 'order' ? question.correct.map(index => question.options[index])
    : question.options[question.correct];
  if (!room.privateQuestions) room.roundReview.push({ prompt: question.prompt, type: question.type, correct, unit: question.unit, source: answerSourceFor(room.mode, question.prompt) });
  for (const [key, player] of room.players) {
    const answer = room.answers.get(key);
    if (answer) {
      const time = answer.elapsed;
      player.fastest = Math.min(player.fastest ?? time, time);
      player.slowest = Math.max(player.slowest ?? time, time);
      if (answer.won && player.rounds.at(-1) === 'miss') player.comebacks++;
      if (!answer.won) player.misses++;
    }
    player.rounds.push(answer?.won ? 'won' : answer ? 'miss' : 'skipped');
    if (room.privateQuestions) {
      const item = room.privateRound.get(key);
      room.privateReview.get(key).push({ prompt: item.prompt, type: item.type, correct: item.options[item.correct] });
    }
    player.streak = answer?.won ? player.streak + 1 : 0;
    if (answer?.won) player.wins++;
    player.bestStreak = Math.max(player.bestStreak, player.streak);
  }
  if (room.mode === 'knockout') {
    const living = [...room.players].filter(([, player]) => player.lives > 0);
    let losers = living.filter(([key]) => !room.answers.get(key)?.won);
    room.knockoutNote = undefined;
    if (room.decider) {
      // The decider: closest guess wins outright; the faster guess breaks a tie.
      const gap = key => Math.abs(room.answers.get(key).option - question.correct);
      const guesses = living.filter(([key]) => room.answers.has(key))
        .sort((a, b) => gap(a[0]) - gap(b[0]) || room.answers.get(a[0]).elapsed - room.answers.get(b[0]).elapsed);
      const champion = guesses[0];
      losers = champion ? living.filter(([key, player]) => room.teams.length ? player.team !== champion[1].team : key !== champion[0]) : [];
      for (const [, player] of losers) player.lives = 1;
      room.deciderBoard = guesses.map(([key, player], place) => ({ id: player.id, name: player.name, avatar: player.avatar,
        guess: room.answers.get(key).option, gap: gap(key), winner: place === 0 })).reverse();
      if (!champion) room.knockoutNote = 'noguess';
    }
    // Nobody is knocked out on a question that would leave no one standing.
    const fatal = losers.filter(([, player]) => player.lives === 1);
    if (room.players.size > 1 && fatal.length === living.length) {
      losers = losers.filter(([, player]) => player.lives > 1);
      room.knockoutNote = 'spared';
    }
    for (const [, player] of losers) {
      player.lives--;
      player.lifeLostAt = room.index;
      if (!player.lives) { room.remaining--; player.outAt = room.index; }
    }
  }
  if (room.mode === 'wayoff') {
    // Anyone still in who did not guess is out; otherwise the furthest guess
    // goes (the slower guess if two are equally far). A big room loses a
    // quarter of its players each round. Nobody goes if nobody guessed.
    const living = wayOffLiving(room);
    const gap = key => Math.abs(room.answers.get(key).option - question.correct);
    const guessed = living.filter(([key]) => room.answers.has(key))
      .sort((a, b) => gap(b[0]) - gap(a[0]) || room.answers.get(b[0]).elapsed - room.answers.get(a[0]).elapsed);
    const silent = guessed.length ? living.filter(([key]) => !room.answers.has(key)) : [];
    const cut = guessed.length > 1 && !silent.length ? guessed.slice(0, Math.max(1, Math.floor(living.length / 4))) : [];
    const out = [...silent, ...cut].slice(0, living.length - 1);
    for (const [, player] of out) { player.lives = 0; player.outAt = room.index; player.lifeLostAt = room.index; }
    room.remaining = living.length - out.length;
    room.wayOut = out.map(([, player]) => ({ id: player.id, name: player.name, avatar: player.avatar }));
  }
  if (isEstimateShow(room.mode)) {
    room.estimateGuesses = [...room.answers].flatMap(([playerKey, entry]) => {
      const participant = room.players.get(playerKey);
      return participant ? [{id:participant.id,name:participant.name,guess:entry.option,distance:Math.abs(entry.option-question.correct),won:Boolean(entry.won),points:entry.won?entry.points:0}] : [];
    }).sort((a,b)=>a.distance-b.distance);
    room.estimateReveal = { starts: Date.now(), count: room.estimateGuesses.length, skipped: false, before };
    scheduleEstimateStages(room);
  }
  room.phase = 'reveal';
  stopDeadline(room);
  clearTimeout(room.timer);
  clearTimeout(room.autoTimer);
  room.autoTimer = undefined;
  publish(room);
}

function openQuestion(room) {
  if (room.mode === 'wayoff') {
    room.wayOut = undefined;
    room.count = Math.max(room.count, room.index + 1);
    if (!room.questions[room.index]) {
      const recent = new Set(room.questions.map(question => question.prompt));
      const pool = makeSoCloseQuestions(room.category, 12, room.seen, room.includeChristmas);
      room.questions[room.index] = pool.find(question => !recent.has(question.prompt)) ?? makeSoCloseQuestions('mixed', 12, room.seen, room.includeChristmas).find(question => !recent.has(question.prompt)) ?? pool[0];
    }
  }
  if (room.mode === 'knockout') {
    room.decider = room.players.size > 1 && room.index >= KNOCKOUT_QUESTIONS;
    room.deciderBoard = undefined;
    room.count = Math.max(KNOCKOUT_QUESTIONS, room.index + 1);
    if (!room.questions[room.index]) room.questions[room.index] = knockoutQuestion(room);
  }
  clearEstimateTimers(room);
  room.estimateReveal = undefined;
  room.estimateGuesses = undefined;
  room.answers.clear();
  room.drafts = new Map();
  room.opened = Date.now();
  room.ends = room.seconds ? room.opened + room.seconds * 1000 : 0;
  if (room.privateQuestions) {
    const pool = ['choice', 'boolean'].flatMap(type => makeQuestions('mixed', 560, room.seen, type, room.includeChristmas));
    const questions = [...new Map(pool.map(question => [question.prompt, question])).values()]
      .sort((a, b) => Number(room.seen.has(a.prompt)) - Number(room.seen.has(b.prompt))).slice(0, room.players.size);
    for (let i = questions.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    room.privateRound = new Map([...room.players.keys()].map((key, index) => [key, questions[index]]));
    for (const question of questions) room.seen.add(question.prompt);
  } else room.seen.add(room.questions[room.index].prompt);
  room.phase = 'question';
  if (room.mode === 'board') {
    const result = room.motion.die >= 4 ? 'high' : 'low';
    const correct = [...room.predictions.values()].filter(guess => guess === result).length;
    room.motion.forecast = { result, correct, total: room.predictions.size };
  }
  watchDeadline(room, () => reveal(room));
  publish(room);
}

function readyTurn(room) {
  room.answers.clear();
  room.ends = 0;
  room.motion = null;
  room.predictions.clear();
  room.phase = 'ready';
  publish(room);
}

function raceQuestionPool(category, difficulty, includeChristmas, history = new Set()) {
  // The source bank has uneven Easy/Hard coverage. Supplement in-category curated items
  // with standard questions; the UI labels this limitation rather than changing topics.
  const standard = makeQuestions(category, 160, history, 'choice', includeChristmas, 'standard');
  const levels = difficulty === 'mixed' ? ['family', 'challenge'] : difficulty === 'easy' ? ['family'] : difficulty === 'hard' ? ['challenge'] : [];
  const curated = levels.flatMap(level => difficultyQuestions[level]
    .filter(([genre]) => category === 'mixed' ? (includeChristmas || genre !== 'christmas') : genre === category)
    .map(([genre, prompt, correct, ...other]) => {
      const options = [correct, ...other].sort(() => Math.random() - .5);
      return {category: genre, prompt, options, correct: options.indexOf(correct), type: 'choice'};
    }));
  const seen = new Set();
  const pool = [];
  for (const item of [...curated, ...standard]) if (!seen.has(item.prompt)) {
    seen.add(item.prompt);
    pool.push(item);
  }
  // Returning players receive unseen prompts first, even on Quiz Race.
  return pool.sort((a,b) => Number(history.has(a.prompt) || history.has(questionHistoryId(a.prompt))) -
    Number(history.has(b.prompt) || history.has(questionHistoryId(b.prompt))));
}

// The action replay: when a race ends, the TV plays it back. The server owns when it starts and ends,
// so the TV and every phone agree, and the captain or TV host can skip it or watch it again.
function startReplay(room) {
  const replay = raceReplay(room.race);
  if (!replay?.frames.length) { room.replayShow = undefined; return; }
  const { duration } = replayTimeline(replay);
  const startedAt = Date.now();
  const show = room.replayShow = { id: (room.replayShow?.id ?? 0) + 1, startedAt, until: startedAt + duration };
  // Tell every screen when it ends, so the results appear without anyone pressing anything.
  setTimeout(() => roomTask(room, 'replay end', () => { if (room.replayShow === show) publish(room); }), duration + 50).unref();
}

function startRace(room) {
  room.replayShow = undefined;
  if (room.race?.issued) for (const prompt of room.race.issued) room.seen.add(prompt);
  // The symbol race deals its own grids and needs no questions.
  const pool = room.raceStyle === 'symbols' ? [] : raceQuestionPool(room.category, room.raceDifficulty, room.includeChristmas, room.seen);
  if (room.raceStyle !== 'symbols' && !pool.length) throw new Error('No questions available for Quiz Race.');
  // A league starts on the short circuit and works up; every race is a fresh grid with fresh nudges and boosts.
  if (room.raceLeague && !room.league) room.league = createLeague(room.players.keys());
  const league = room.raceLeague ? room.league : undefined;
  const length = league ? leagueCircuits[league.round] : room.raceLength;
  const track = league ? leagueTrack(room.raceTrack, league.round) : room.raceTrack;
  // RACE_LENGTH_SCALE shortens every race for browser tests; it is never set in production.
  room.race = createQuizRace([...room.players], pool, { length, track, difficulty: room.raceDifficulty, style: room.raceStyle, scale: Number(process.env.RACE_LENGTH_SCALE) || 1 }, performance.now());
  room.phase = 'race-countdown';
  room.opened = Date.now();
  publish(room);
}

function startGame(room) {
  // The first quiz is selected only after everyone has joined and supplied
  // their previous question history, not when the TV room is first created.
  if (fixedQuestionModes.includes(room.mode) && !room.customQuiz && !room.privateQuestions) {
    room.questions = roundQuestions(room, room.seen);
    clampToQuestions(room);
  }
  if (room.mode === 'tracks') {
    // Exactly one round per joined player; every player drives once.
    room.count = room.players.size;
    room.forkDriverOrder = [...room.players.keys()];
  }
  const allocation = teamAssignments(room.players,room.mode,room.playStyle,room.teamCount);
  room.teams = allocation.groups;
  for(const [key,player] of room.players) {
    if (allocation.ids.has(key)) player.team = allocation.ids.get(key);
    else delete player.team;
  }
  if (room.mode === 'board') for (const team of room.teams) {
    // Teams start with none; tests can deal some out to exercise each one.
    team.powers = Object.fromEntries(boardPowers.map(power => [power.id, Math.max(0, Number(process.env.BOARD_START_POWERS) || 0)]));
    team.armed = { points: false };
    team.halved = undefined;
    team.used = undefined;
  }
  if (room.mode === 'quizrace') return startRace(room);
  if (partyModes.includes(room.mode)) return startParty(room, publish);
  if (room.privateQuestions) for (const key of room.players.keys()) room.privateReview.set(key, []);
  if (room.mode === 'wayoff') {
    room.remaining = room.players.size;
    room.wayOut = undefined;
    room.count = Math.max(1, room.players.size - 1);
    for (const player of room.players.values()) { player.lives = 1; delete player.lifeLostAt; delete player.outAt; }
  }
  if (room.mode === 'knockout') {
    room.remaining = room.players.size;
    room.decider = false; room.deciderBoard = undefined; room.knockoutNote = undefined;
    room.count = KNOCKOUT_QUESTIONS;
    if (!room.customQuiz) room.questions = [];
    for (const player of room.players.values()) { player.lives = 3; delete player.lifeLostAt; delete player.outAt; }
  }
  if (fixedQuestionModes.includes(room.mode) && room.mode !== 'dice') return openQuestion(room);
  readyTurn(room);
}

// Host or the active team chooses the branch before their roll can cross the fork.
app.post('/api/rooms/:code/board-path', (req, res) => {
  const {room,key} = res.locals;
  if (room.mode !== 'board') return res.status(400).json({error:'Path choices are for Board Race.'});
  const team = room.teams[room.index % room.teams.length];
  if (!team || !(key === room.host || room.players.get(key)?.team === team.id)) {
    return res.status(403).json({error:'Only the active team or TV host can choose the path.'});
  }
  if (room.phase !== 'ready' || req.body?.game !== room.game || req.body?.index !== room.index) {
    return res.status(409).json({error:'Choose a path during your team’s turn.'});
  }
  if (!boardPathChoices.some(option => option.id === req.body?.path)) {
    return res.status(400).json({error:'Choose Power Lane or Question Trail.'});
  }
  if (team.position !== boardFork(room.boardLength).start) {
    return res.status(409).json({error: team.position > boardFork(room.boardLength).start ? 'Your team has already passed the fork.' : 'Choose a lane when your piece reaches the junction.'});
  }
  team.pathChoice = req.body.path;
  publish(room);
  res.sendStatus(204);
});

// Any player may play one of their team's power-ups. Double Points must come
// before their team answers; 50/50 and New Question need a live question;
// Half Points is played on a rival and lands on their next question.
app.post('/api/rooms/:code/board-power', (req, res) => {
  const { room, key } = res.locals;
  if (room.mode !== 'board' || ['lobby', 'finished'].includes(room.phase) || req.body?.game !== room.game) return res.status(409).json({ error: 'Power-ups are for a Board Race in play.' });
  const team = room.teams[room.players.get(key)?.team];
  if (!team) return res.status(403).json({ error: 'Only players on a team can play a power-up.' });
  const power = req.body?.power;
  if (!boardPowers.some(entry => entry.id === power)) return res.status(400).json({ error: 'Choose one of your team’s power-ups.' });
  if (!team.powers[power]) return res.status(409).json({ error: 'Your team is not holding that power-up.' });
  const live = room.phase === 'question' && !clockExpired(room);
  const question = room.questions[room.index];
  const teamAnswered = [...room.answers.keys()].some(other => room.players.get(other)?.team === team.id);
  if (power === 'points') {
    if (team.armed.points) return res.status(409).json({ error: 'Double Points is already in play.' });
    if (room.phase === 'question' && teamAnswered) return res.status(409).json({ error: 'Too late for this question: play Double Points before your team answers.' });
    team.armed.points = true;
  } else if (power === 'half') {
    const target = room.teams[req.body?.target];
    if (!target || !Number.isInteger(req.body?.target) || target.id === team.id) return res.status(400).json({ error: 'Choose a rival to halve.' });
    if (target.halved) return res.status(409).json({ error: 'That rival is already on half points.' });
    target.halved = { by: team.id };
  } else if (power === 'fifty') {
    if (!live) return res.status(409).json({ error: '50/50 needs a live question.' });
    if (question.type !== 'choice' || question.options.length < 4) return res.status(409).json({ error: '50/50 only works on a question with four answers.' });
    room.fifty ??= new Map();
    if (room.fifty.get(team.id)?.index === room.index) return res.status(409).json({ error: 'Your team has already used 50/50 on this question.' });
    const wrong = question.options.map((_, option) => option).filter(option => option !== question.correct);
    while (wrong.length > 2) wrong.splice(randomInt(wrong.length), 1);
    room.fifty.set(team.id, { index: room.index, removed: wrong });
  } else {
    if (!live) return res.status(409).json({ error: 'New Question needs a live question.' });
    if (room.pausedAt) return res.status(409).json({ error: 'Resume the timer first.' });
    // A fresh question on the same square for everyone; answers so far are cleared.
    const types = formatTypes(room.format);
    room.questions[room.index] = boardQuestion(room.motion.category, types[room.index % types.length], room.motion.difficulty, room.seen);
    room.fifty = new Map();
    room.skipped = { index: room.index, by: team.id };
    team.powers[power]--;
    openQuestion(room);
    return res.sendStatus(204);
  }
  team.powers[power]--;
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/roll', (req, res) => {
  const { room, key } = res.locals;
  const activeTeam = room.mode === 'board' ? room.teams[room.index % room.teams.length] : undefined;
  const allowed = room.mode === 'board' ? key === room.host || (activeTeam && room.players.get(key)?.team === activeTeam.id)
    : controlsRoom(room, key);
  if (!allowed) {
    return res.status(403).json({ error: 'Wait for your team’s turn to roll.' });
  }
  if (room.phase !== 'ready' || req.body?.game !== room.game || req.body?.index !== room.index) return res.sendStatus(204);
  if (room.mode === 'board' && activeTeam &&
      boardRequiresChoice(room.boardLength, activeTeam.position, activeTeam.pathChoice)) {
    return res.status(409).json({error:'Choose the Power Lane or Question Trail before rolling.'});
  }
  if (room.mode === 'dice') {
    const dice = [randomInt(1, 7), randomInt(1, 7)];
    const sum = dice[0] + dice[1];
    room.motion = { dice, sum, multiplier: sum >= 11 ? 3 : sum >= 7 ? 2 : 1 };
  } else if (activeTeam) {
    const die = randomInt(1, 7);
    const from = activeTeam.position;
    const path = boardPath(room.boardLength, room.includeChristmas, activeTeam.pathChoice || 'power');
    // No lane yet: the piece stops on the junction and the team chooses next turn.
    const junction = boardStopsAtFork(room.boardLength, from, die, activeTeam.pathChoice);
    const to = junction ? boardFork(room.boardLength).start : Math.min(path.length - 1, from + die);
    activeTeam.position = to;
    const landed = path[to];
    // Landing exactly on a corner (not a forced stop at the junction) collects its power-up.
    const reward = junction ? undefined : boardCornerPower(room.boardLength, to, activeTeam.pathChoice);
    if (reward) activeTeam.powers[reward]++;
    room.motion = { die, from, to, junction: junction || undefined, reward, points: die, difficulty: die,
      category: landed.category, pathChoice: activeTeam.pathChoice || 'power',
      pathMultiplier: landed.lane === 'power' ? 2 : 1,
      pathName: boardPathChoices.find(option => option.id === activeTeam.pathChoice)?.name ?? 'Board Race' };
  } else {
    if (!room.wheelRemaining.length) room.wheelRemaining = wheelCategories(room.includeChristmas).map(([id]) => id);
    const [category] = room.wheelRemaining.splice(randomInt(room.wheelRemaining.length), 1);
    room.motion = { category };
  }
  if (room.mode !== 'dice') {
    const types = formatTypes(room.format);
    const format = types[room.index % types.length];
    if (room.mode === 'board') room.questions.push(boardQuestion(room.motion.category, format, room.motion.difficulty, room.seen));
    else {
      const recent = new Set(room.questions.map(question => question.prompt));
      // A topic with nothing in this format falls back to multiple choice.
      const candidates = makeQuestions(room.motion.category, 15, room.seen, format);
      const usable = candidates.length ? candidates : makeQuestions(room.motion.category, 15, room.seen, 'choice');
      room.questions.push(usable.find(question => !recent.has(question.prompt)) ?? usable[0]);
    }
  }
  room.phase = 'rolling';
  room.motion.duration = room.mode === 'board' ? boardRollDuration : 2600;
  room.motion.ends = Date.now() + room.motion.duration;
  room.timer = setTimeout(() => roomTask(room, 'roll', () => openQuestion(room)), room.motion.duration);
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/pause', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can pause the timer.' });
  const { phase, game, index, paused, clockVersion } = req.body ?? {};
  if (typeof paused !== 'boolean') return res.status(400).json({ error: 'Choose pause or resume.' });
  if (room.mode === 'quizrace' && room.race && ['race-countdown', 'race'].includes(room.phase)) {
    if (game !== room.game || phase !== room.phase || index !== room.index || clockVersion !== room.clockVersion) return res.status(409).json({error:'The race has changed.'});
    if (Boolean(room.race.paused) === paused) return res.sendStatus(204);
    setRacePaused(room.race, paused, performance.now());
    room.pausedAt = paused ? Date.now() : 0;
    room.clockVersion++;
    publish(room);
    return res.sendStatus(204);
  }
  if (!room.ends || !['question', 'party-potato'].includes(room.phase)
    || phase !== room.phase || game !== room.game || index !== room.index || clockVersion !== room.clockVersion) {
    return res.status(409).json({ error: 'The timer has changed.' });
  }
  if (Boolean(room.pausedAt) === paused) return res.sendStatus(204);
  setClockPaused(room, paused);
  clearTimeout(room.autoTimer);
  room.autoTimer = undefined;
  if (!paused) {
    watchDeadline(room, () => room.phase === 'question' ? reveal(room) : expireParty(room, publish));
    scheduleReveal(room);
  }
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/estimate-reveal-skip', (req,res)=>{
  const {room,key}=res.locals;
  if(!controlsRoom(room,key))return res.status(403).json({error:'Only the host or captain can skip the reveal.'});
  if(!isEstimateShow(room.mode)||room.phase!=='reveal'||!room.estimateReveal||req.body?.game!==room.game||req.body?.index!==room.index)return res.status(409).json({error:'This reveal has ended.'});
  if(!room.estimateReveal.skipped){room.estimateReveal.skipped=true;clearEstimateTimers(room);publish(room);}
  res.sendStatus(204);
});

app.post('/api/rooms/:code/advance', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can advance the game.' });
  if (req.body?.lobbyVersion !== undefined && req.body.lobbyVersion !== room.lobbyVersion)
    return res.status(409).json({error:'Lobby settings changed. Review them before starting.'});
  if (['tracks','spotlight','rare','sketch'].includes(room.mode) && room.phase !== 'lobby' && key !== room.host)
    return res.status(403).json({error:'Only the TV host advances rounds in this game; contestants and experts answer on their phones.'});
  if (req.body?.game !== room.game || req.body?.phase !== room.phase || req.body?.index !== room.index) return res.sendStatus(204);
  if (room.pausedAt) return res.status(409).json({ error: 'Resume the timer before advancing.' });
  if (room.phase === 'lobby') {
    if (room.picker) return res.status(409).json({ error: 'Choose a game from the carousel first.' });
    room.welcome = undefined;
    setBriefing(room, undefined);
    const minimum = requiredPlayers(room.mode,room.playStyle,room.teamCount,minimumPlayers(room.mode));
    if (liveCounts(room).connected < minimum) return res.status(409).json({ error: `You need at least ${minimum} connected ${minimum === 1 ? 'player' : 'players'} to start.` });
    const tooMany = capacityError(room.mode, room.playStyle, room.players.size);
    if (tooMany) return res.status(409).json({ error: tooMany });
    startGame(room);
  } else if (room.mode === 'quizrace' && room.phase === 'race-standings') {
    startRace(room);
  } else if (partyModes.includes(room.mode)) {
    advanceParty(room, publish);
  } else if (room.phase === 'question') {
    reveal(room);
  } else if (room.phase === 'reveal' && estimateStage(room) !== 'results') {
    // An early Next (stale client, keyboard shortcut) completes the So Close
    // reveal instead of jumping past it; the following press moves on.
    room.estimateReveal.skipped = true;
    clearEstimateTimers(room);
    publish(room);
  } else if (room.phase === 'reveal') {
    if (finalTurn(room)) {
      room.phase = 'finished';
      room.ceremony = { starts: Date.now(), skipped: false };
      room.awards = deskAwards(room.players.values());
      publish(room);
    } else if (scoreCheckpointDue(room)) {
      openScoreBreak(room);
    } else nextTurn(room);
  } else if (room.phase === 'score-break') {
    nextTurn(room);
  }
  res.sendStatus(204);
});

app.post('/api/rooms/:code/race-answer', (req, res) => {
  const {room, key} = res.locals;
  if (!room.players.has(key) || room.mode !== 'quizrace' || !room.race) return res.status(403).json({error:'Join an active Quiz Race to answer.'});
  if (req.body?.game !== room.game || !['race', 'race-countdown'].includes(room.phase)) return res.status(409).json({error:'This race is no longer active.'});
  advanceQuizRace(room.race, performance.now());
  const result = submitRaceAnswer(room.race, key, {questionId:req.body?.questionId, option:req.body?.option, pass:req.body?.pass}, room.race.time);
  if (result.status !== 204) return res.status(result.status).json({error: result.error});
  publish(room);
  res.sendStatus(204);
});

// The recorded race, for the TV's action replay. Public positions and power-ups only.
app.get('/api/rooms/:code/race-replay', (_req, res) => {
  const { room, member } = res.locals;
  if (!member) return res.status(403).json({ error: 'Join the room to continue.' });
  const replay = room.mode === 'quizrace' ? raceReplay(room.race) : undefined;
  if (!replay) return res.status(404).json({ error: 'There is no race to replay yet.' });
  res.json(replay);
});

app.post('/api/rooms/:code/race-replay', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can control the replay.' });
  if (room.mode !== 'quizrace' || !raceReplay(room.race) || !['finished', 'race-standings'].includes(room.phase) || req.body?.game !== room.game)
    return res.status(409).json({ error: 'There is no race to replay right now.' });
  const action = req.body?.action;
  if (action === 'skip') { if (room.replayShow && room.replayShow.until > Date.now()) room.replayShow = { ...room.replayShow, until: Date.now() }; }
  else if (action === 'again') startReplay(room);
  else return res.status(400).json({ error: 'Choose skip or again.' });
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/race-power', (req, res) => {
  const {room, key} = res.locals;
  if (!room.players.has(key) || room.mode !== 'quizrace' || !room.race) return res.status(403).json({error:'Join an active Quiz Race to use power-ups.'});
  if (req.body?.game !== room.game || room.phase !== 'race') return res.status(409).json({error:'Power-ups work once the race is under way.'});
  advanceQuizRace(room.race, performance.now());
  const result = useRacePower(room.race, key, req.body?.kind, room.race.time);
  if (result.status !== 204) return res.status(result.status).json({error: result.error});
  publish(room);
  res.sendStatus(204);
});

// Live guesses: while a closest-number question is open, each phone shares
// where its wheel is so the TV can show the numbers turning. Owner-directed:
// these guesses are public on the TV on purpose. Other phones never get them.
app.post('/api/rooms/:code/draft', (req, res) => {
  const { room, key } = res.locals;
  const player = room.players.get(key);
  const { value, index, game } = req.body ?? {};
  if (!player) return res.status(403).json({ error: 'Join the room to answer.' });
  const question = room.questions[index];
  const open = room.phase === 'question' && game === room.game && index === room.index && !clockExpired(room) && !room.pausedAt;
  if (!open || room.privateQuestions || question?.type !== 'estimate' || player.lives === 0 || room.answers.has(key)
    || !Number.isSafeInteger(value) || value < Math.min(0, question.min) || value > ESTIMATE_LIMIT) return res.sendStatus(204);
  room.drafts ??= new Map();
  const now = Date.now();
  // A phone may share at most a few positions a second.
  if (now - (room.drafts.get(key)?.at ?? 0) >= 120) { room.drafts.set(key, { value, at: now }); publish(room, true); }
  res.sendStatus(204);
});

function liveGuesses(room) {
  const rows = [];
  for (const [key, player] of room.players) {
    const locked = room.answers.get(key);
    const draft = room.drafts?.get(key);
    if (!locked && !draft) continue;
    rows.push({ id: player.id, name: player.name, avatar: player.avatar, value: locked ? locked.option : draft.value, locked: Boolean(locked), at: draft?.at ?? 0 });
  }
  // A big room shows the twelve wheels that moved most recently.
  const shown = rows.sort((a, b) => b.at - a.at).slice(0, 12).map(({ at, ...row }) => row).sort((a, b) => a.name.localeCompare(b.name));
  return { rows: shown, count: rows.length };
}

app.post('/api/rooms/:code/answer', (req, res) => {
  const { room, key } = res.locals;
  const player = room.players.get(key);
  const { option, index, game } = req.body ?? {};
  if (!player) return res.status(403).json({ error: 'Join the room to answer.' });
  if (room.phase !== 'question' || game !== room.game || index !== room.index || clockExpired(room)) return res.status(409).json({ error: 'This question has closed.' });
  if (room.pausedAt) return res.status(409).json({ error: 'The timer is paused. Try again when it resumes.' });
  const question = room.privateRound?.get(key) ?? room.questions[index];
  // Estimates show no range while guessing, so any whole number is a fair guess.
  const valid = question.type === 'estimate' ? Number.isSafeInteger(option) && option >= Math.min(0, question.min) && option <= ESTIMATE_LIMIT
    : question.type === 'order' ? Array.isArray(option) && option.length === question.options.length
      && new Set(option).size === option.length && option.every(item => Number.isInteger(item) && item >= 0 && item < question.options.length)
    : Number.isInteger(option) && option >= 0 && option < question.options.length;
  if (!valid) return res.status(400).json({ error: 'Check your answer and try again.' });
  if (player.lives === 0) return res.status(409).json({ error: 'You’re out of lives for this game.' });
  if (!room.answers.has(key)) {
    const elapsed = Math.max(0, Date.now() - room.opened);
    room.answers.set(key, { option, elapsed, points: answerValue(room, question, elapsed) });
    publish(room, true);
    scheduleReveal(room);
  }
  res.sendStatus(204);
});

function scheduleReveal(room) {
  if (room.phase !== 'question' || room.pausedAt || !room.autoReveal || room.autoTimer
    || !room.answers.size || room.answers.size !== responseTarget(room)) return;
  room.autoTimer = setTimeout(() => roomTask(room, 'auto-reveal', () => {
    room.autoTimer = undefined;
    if (room.phase === 'question' && !room.pausedAt && room.answers.size === responseTarget(room)) reveal(room);
  }), 800);
}

function publicPrediction(room, key) {
  if (room.mode !== 'board' || !['ready', 'rolling', 'question', 'reveal'].includes(room.phase)) return;
  const player = room.players.get(key);
  const own = room.predictions.get(key);
  return {
    own, eligible: Boolean(player && player.team !== room.index % room.teams.length),
    ...(key === room.host || own ? { total: room.predictions.size } : {}),
    ...room.motion?.forecast,
  };
}

app.post('/api/rooms/:code/predict', (req, res) => {
  const { room, key } = res.locals;
  const { game, index, guess } = req.body ?? {};
  if (!publicPrediction(room, key)?.eligible) return res.status(403).json({ error: 'Only players on other teams can predict this roll.' });
  if (room.phase !== 'ready' || game !== room.game || index !== room.index) return res.status(409).json({ error: 'The dice have already been rolled.' });
  if (!['low', 'high'].includes(guess)) return res.status(400).json({ error: 'Choose low or high.' });
  room.predictions.set(key, guess);
  publish(room, true);
  for (const [client, clientKey] of room.clients) {
    if (clientKey === key) sendState(room, key, client);
  }
  res.sendStatus(204);
});

app.post('/api/rooms/:code/ceremony', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can control the score reveal.' });
  if (room.phase !== 'finished' || req.body?.game !== room.game || !room.ceremony) return res.status(409).json({ error: 'There is no score reveal in progress.' });
  room.ceremony.skipped = true;
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/playlist', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can edit the playlist.' });
  const { game, version, queue } = req.body ?? {};
  if (game !== room.game || version !== room.night.version) return res.status(409).json({ error: 'The lineup changed. Open it again to see the latest games.' });
  if (!Array.isArray(queue) || queue.length > playlistLimit || queue.some(id => !modes.some(([mode]) => mode === id))) {
    return res.status(400).json({ error: 'Choose up to ' + playlistLimit + ' games for the playlist.' });
  }
  const unfit = queue.map(mode => capacityError(mode, queuedSettings(mode, room.theme).playStyle, groupSize(room))).find(Boolean);
  if (unfit) return res.status(409).json({ error: unfit });
  room.night.queue = queue;
  room.night.version++;
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/playlist/next', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can load the next game.' });
  const { game, version } = req.body ?? {};
  if (room.phase !== 'finished' || game !== room.game || version !== room.night.version || !room.night.queue.length) {
    return res.status(409).json({ error: 'Check the current game and playlist before loading the next game.' });
  }
  const nextSettings = readSettings(queuedSettings(room.night.queue[0], room.theme));
  const tooMany = capacityError(nextSettings.mode, nextSettings.playStyle, groupSize(room));
  if (tooMany) return res.status(409).json({ error: tooMany + ' Edit the playlist to continue.' });
  room.night.queue.shift();
  room.night.played++;
  room.night.version++;
  room.game++;
  resetGame(room, nextSettings);
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/configure', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can change the game.' });
  if (room.phase !== 'lobby' || req.body?.game !== room.game) return res.status(409).json({ error: 'The lobby has closed.' });
  if (req.body?.lobbyVersion !== undefined && req.body.lobbyVersion !== room.lobbyVersion)
    return res.status(409).json({error:'Lobby settings changed. Reopen setup to review the current choices.'});
  const body = req.body?.useRoomQuiz === true && room.customQuiz ? { ...req.body, customQuiz: room.customQuiz } : req.body;
  const settings = readSettings(body);
  if (!settings) return res.status(400).json({ error: 'Check the game settings or saved quiz.' });
  const tooMany = capacityError(settings.mode, settings.playStyle, groupSize(room));
  if (tooMany) return res.status(409).json({ error: tooMany });
  const picked = Boolean(room.picker);
  resetGame(room, settings);
  // Choosing a game closes the lobby's game carousel.
  room.picker = undefined;
  // A game picked from the carousel is explained on the TV first, once per
  // game per room, unless the room chose to skip the intros.
  room.briefed ??= new Set();
  if (picked && room.guides && !room.briefed.has(settings.mode)) setBriefing(room, 'playing');
  else setBriefing(room, undefined);
  publish(room);
  res.sendStatus(204);
});

// The "how to play" guide for the chosen game: the TV plays it, phones are
// told to watch, and it never holds the room up if the TV goes away.
function setBriefing(room, to) {
  clearTimeout(room.briefingTimer);
  room.briefing = to;
  if (!to) return;
  room.briefed?.add(room.mode);
  room.briefingTimer = setTimeout(() => roomTask(room, 'briefing', () => {
    if (!room.briefing) return;
    room.briefing = undefined;
    publish(room);
  }), Number(process.env.BRIEFING_LIMIT_MS) || 240_000);
  room.briefingTimer.unref?.();
}
// 'play' (re)starts it and 'skip' ends it: the captain or the TV. 'end' is the
// TV saying the guide has finished.
app.post('/api/rooms/:code/briefing', (req, res) => {
  const { room, key } = res.locals;
  const action = req.body?.action;
  if (!['play', 'skip', 'end'].includes(action)) return res.status(400).json({ error: 'Unknown guide action.' });
  if (action === 'end' ? key !== room.host : !controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can do that.' });
  if (room.phase !== 'lobby' || req.body?.game !== room.game || room.picker) return res.status(409).json({ error: 'The lobby has moved on.' });
  if (action === 'play' && room.briefing) return res.status(409).json({ error: 'The guide is already playing.' });
  setBriefing(room, action === 'play' ? 'playing' : undefined);
  publish(room);
  res.sendStatus(204);
});

// Max and Poppy's welcome, in step on every screen. The TV starts it ('start',
// or 'ask' when everyone has played before); the captain or TV can 'skip', or
// answer 'ask' with 'tour'; the TV ends it.
// 'party' is the "Start the party" button on the TV or the captain's phone: it
// closes the waiting room and plays the welcome (or asks a returning room).
const welcomeMoves = { party: [undefined, 'playing'], start: [undefined, 'playing'], ask: [undefined, 'asking'], tour: ['asking', 'playing'], skip: [['playing', 'asking'], 'skipping'], end: [null, undefined] };
app.post('/api/rooms/:code/welcome', (req, res) => {
  const { room, key } = res.locals;
  const action = req.body?.action;
  const move = Object.hasOwn(welcomeMoves, action) ? welcomeMoves[action] : undefined;
  if (!move) return res.status(400).json({ error: 'Unknown welcome action.' });
  const hostOnly = ['start', 'ask', 'end'].includes(action);
  if (hostOnly ? key !== room.host : !controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can do that.' });
  if (room.phase !== 'lobby' || req.body?.game !== room.game) return res.status(409).json({ error: 'The lobby has closed.' });
  if (action === 'party' && !room.gathering) return res.status(409).json({ error: 'The party has already started.' });
  if (action === 'party' && !room.players.size) return res.status(409).json({ error: 'Wait for at least one player to join.' });
  const [from] = move;
  const everyoneBack = [...room.players.values()].every(entry => entry.returning);
  const to = action === 'party' && everyoneBack ? 'asking' : move[1];
  const current = room.welcome;
  const allowed = from === null || (Array.isArray(from) ? from.includes(current) : from === current);
  if (!allowed) return res.status(409).json({ error: 'The welcome has moved on.' });
  room.welcome = to;
  room.gathering = false;
  // Starting the party properly means the hosts explain each game too.
  if (action === 'party') room.guides = true;
  // The TV normally ends the welcome. If it has gone away, the room moves on
  // by itself so phones are never left waiting on it.
  clearTimeout(room.welcomeTimer);
  if (to) {
    const limit = Number(process.env.WELCOME_LIMIT_MS) || { playing: 100_000, asking: 90_000, skipping: 20_000 }[to];
    room.welcomeTimer = setTimeout(() => roomTask(room, 'welcome', () => {
      if (room.welcome !== to) return;
      room.welcome = undefined;
      publish(room);
    }), limit);
    room.welcomeTimer.unref?.();
  }
  publish(room);
  res.sendStatus(204);
});

// The lobby's shared game carousel: the captain (or TV) scrolls it and every
// screen follows. { mode } moves it; { open: true } reopens it from a lobby.
app.post('/api/rooms/:code/browse', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can choose the game.' });
  if (room.phase !== 'lobby' || req.body?.game !== room.game) return res.status(409).json({ error: 'The lobby has closed.' });
  const { mode, open } = req.body ?? {};
  if (room.gathering && req.body?.skipIntro !== true) return res.status(409).json({ error: 'Start the party first.' });
  room.gathering = false;
  if (open === true) room.picker ??= { mode: room.mode, version: 0 };
  else if (!room.picker) return res.status(409).json({ error: 'Open the game carousel first.' });
  if (mode !== undefined) {
    if (!modes.some(([id]) => id === mode)) return res.status(400).json({ error: 'Choose a game from the carousel.' });
    room.picker.mode = mode;
  }
  room.picker.version++;
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/captain', (req, res) => {
  const { room, key } = res.locals;
  if (key !== room.host) return res.status(403).json({ error: 'Only the TV host can transfer the captain role.' });
  if (room.phase !== 'lobby' || req.body?.game !== room.game) return res.status(409).json({ error: 'Change captains from the lobby.' });
  const next = [...room.players].find(([, player]) => player.id === req.body?.player);
  if (!next) return res.status(400).json({ error: 'Choose a player in the room.' });
  room.captain = next[0];
  publish(room);
  res.sendStatus(204);
});

app.post('/api/rooms/:code/rematch', (req, res) => {
  const { room, key } = res.locals;
  if (!controlsRoom(room, key)) return res.status(403).json({ error: 'Only the captain or TV host can set up a rematch.' });
  if (room.phase !== 'finished' || req.body?.game !== room.game) {
    return res.status(409).json({ error: 'This game is no longer ready for a rematch.' });
  }
  const body = req.body?.useRoomQuiz === true && room.customQuiz ? { ...req.body, customQuiz: room.customQuiz } : req.body;
  const settings = body?.sameGame === true ? room.settings : readSettings(body);
  if (!settings) return res.status(400).json({ error: 'Check the game settings.' });
  const tooMany = capacityError(settings.mode, settings.playStyle, groupSize(room));
  if (tooMany) return res.status(409).json({ error: tooMany });
  room.game++;
  resetGame(room, settings);
  // "Choose another game": straight back to the carousel, on the game just played.
  if (req.body?.picker === true) room.picker = { mode: settings.mode, version: 0 };
  publish(room);
  res.sendStatus(204);
});

app.use('/api', (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  res.set('Cache-Control', 'no-store');
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'This request is too large.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Check the request format and try again.' });
  console.error('Game API request failed:', error.name);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

setInterval(() => {
  for (const room of rooms.values()) roomTask(room, 'race tick', () => {
    if (!room.race || !['race-countdown', 'race'].includes(room.phase)) return;
    const phaseWas = room.phase;
    const event = advanceQuizRace(room.race, performance.now());
    for (const [key, racer] of room.race.racers) {
      const player = room.players.get(key);
      if (player) player.score = Math.round(100 * racer.distance / room.race.length);
    }
    if (room.race.finished) {
      // In a league the table is shown between races; the last race ends the game on league points.
      room.phase = room.league && !finishLeagueRace(room) ? 'race-standings' : 'finished';
      room.ceremony = undefined;
      room.awards = [];
      startReplay(room);
    } else if (room.race.time >= 3000) room.phase = 'race';
    const now = Date.now();
    if (event || room.phase !== phaseWas || now - (room.race.lastBroadcast || 0) >= 250) {
      room.race.lastBroadcast = now;
      publish(room);
    }
  });
}, 100).unref();

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (!room.clients.size && now - room.updated >= idleRoomMs) {
      stopDeadline(room);
      clearTimeout(room.hostUpdate);
      clearTimeout(room.timer);
      clearTimeout(room.autoTimer);
      clearEstimateTimers(room);
      rooms.delete(code);
    }
  }
  createBudget.sweep(now);
  joinBudget.sweep(now);
}, Math.min(60_000, idleRoomMs)).unref();
setInterval(() => {
  for (const room of rooms.values()) roomTask(room, 'presence', () => {
    if (!room.clients.size && Date.now() - room.updated > 60000) return;
    const counts = liveCounts(room);
    const presence = [...counts.ids].join('/');
    if (room.presence === presence) return;
    room.presence = presence;
    publish(room, true);
    scheduleReveal(room);
    advancePartyWhenReady(room, publish);
  });
}, 3000).unref();
setInterval(() => {
  for (const room of rooms.values()) {
    for (const client of room.clients.keys()) {
      if (canWriteLive(client)) client.write('\n');
    }
  }
}, 12000).unref();

const server = app.listen(port, '0.0.0.0', () => console.log(`Quiz Club listening on http://localhost:${server.address().port}`));
