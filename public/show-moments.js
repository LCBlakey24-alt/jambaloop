// Show moments: the broadcast beats of a quiz round.
//  - Lock-in stamps: each player's face lands on the TV as they lock in
//    (never what they chose).
//  - Reveal choreography: a drum-roll, wrong answers drop out one by one,
//    then the right answer flares. Phones hold their verdict for the same
//    beat so they don't spoil the TV.
//  - Scoreboard: each gain pops beside its new total and hot streaks get a
//    flame (the score break itself already stages the overtakes).
//  - Timer tension: the clock heats towards red, then a heartbeat and a red
//    edge glow in the last five seconds.
// Everything here is decorative and reads only state the screen already has.
// With reduced motion, the final state shows at once.

import { prefersReducedMotion } from './motion.js';

const DRUMROLL = 900;
const DROP_GAP = 330;
const FLARE = 150;
let stageToken = 0;

/** When the right answer appears; phones use the same clock as the TV. */
export const flareDelay = wrongCount => DRUMROLL + wrongCount * DROP_GAP + FLARE;

/** A round with A–D style buttons the TV can choreograph. */
export const stageable = s => s.phase === 'reveal' && !s.privateQuestions && s.mode !== 'soclose'
  && ['choice', 'boolean'].includes(s.question?.type) && Array.isArray(s.question?.options);

const holdFor = s => stageable(s) && !prefersReducedMotion() ? flareDelay(s.question.options.length - 1) : 0;

/* ---------------------------------------------------------- lock-ins -- */

function stamp(entry, order, revealed, escape, avatarView, fresh) {
  const verdict = revealed ? entry.won ? 'won' : 'miss' : '';
  return `<span class="lock-stamp${fresh ? ' is-fresh' : ''}" data-player="${escape(entry.id)}"${verdict ? ` data-verdict="${verdict}"` : ''} style="--order:${order}">`
    + `${avatarView(entry, escape)}<i class="lock-verdict">${verdict === 'won' ? '✓' : verdict === 'miss' ? '✕' : ''}</i></span>`;
}

/** The TV's row of locked-in faces. The count beside it is announced; this is visual. */
export function lockRail(s, escape, avatarView) {
  if (!Array.isArray(s.lockIns)) return '';
  const revealed = s.phase === 'reveal';
  return `<div class="lock-rail" data-lock-rail aria-hidden="true"${revealed ? ' data-verdicts="hold"' : ''}>${s.lockIns
    .map((entry, order) => stamp(entry, order, revealed, escape, avatarView, false)).join('')}</div>`;
}

/** Add only the new faces, so each one lands with its own bounce. */
export function updateLockRail(root, s, escape, avatarView) {
  const rail = root.querySelector('[data-lock-rail]');
  if (!rail || s.phase !== 'question' || !Array.isArray(s.lockIns)) return;
  const shown = new Set([...rail.children].map(child => child.dataset.player));
  s.lockIns.forEach((entry, order) => {
    if (!shown.has(entry.id)) rail.insertAdjacentHTML('beforeend', stamp(entry, order, false, escape, avatarView, !prefersReducedMotion()));
  });
}

/** A small kick on the "3 of 6 answered" line whenever it changes. */
export function bumpCount(counter) {
  if (!counter || prefersReducedMotion()) return;
  counter.classList.remove('is-bumped');
  void counter.offsetWidth;
  counter.classList.add('is-bumped');
}

/* ----------------------------------------------------------- reveal -- */

const shuffle = items => items.map(item => [Math.random(), item]).sort((a, b) => a[0] - b[0]).map(([, item]) => item);

/**
 * Run the reveal on a freshly rendered screen. `enter` is true only on the
 * render that opened the reveal; later re-renders show the final state.
 */
export function stageReveal(root, s, { host, enter, onFlare }) {
  const token = ++stageToken;
  const view = root.querySelector('.game');
  const rail = root.querySelector('[data-lock-rail]');
  const hold = enter ? holdFor(s) : 0;
  const live = () => token === stageToken && view?.isConnected;
  const after = (delay, step) => (delay ? setTimeout(() => { if (live()) step(); }, delay) : step());
  if (!hold) {
    // Nothing staged: the usual phase cue and confetti have already played.
    if (rail) rail.dataset.verdicts = 'on';
    return 0;
  }
  if (host) {
    const answers = view.querySelector('.question-panel .answers');
    const correct = answers?.querySelector('.answer.correct');
    if (!answers || !correct) { if (rail) rail.dataset.verdicts = 'on'; onFlare?.(); return 0; }
    // Hold back the highlight: without `.correct` nothing is dimmed or ringed yet.
    correct.classList.remove('correct');
    answers.dataset.stage = 'drumroll';
    shuffle([...answers.querySelectorAll('.answer')].filter(button => button !== correct)).forEach((button, order) =>
      after(DRUMROLL + order * DROP_GAP, () => button.classList.add('is-out')));
    after(hold, () => {
      answers.dataset.stage = 'flare';
      answers.querySelectorAll('.is-out').forEach(button => button.classList.remove('is-out'));
      correct.classList.add('correct', 'is-flare');
      onFlare?.();
    });
  } else {
    // Phones: same beat, then the verdict lands with its points.
    view.dataset.verdictHold = '';
    const correct = view.querySelector('.answers .answer.correct');
    correct?.classList.remove('correct');
    const result = view.dataset.result;
    view.dataset.result = '';
    after(hold, () => {
      delete view.dataset.verdictHold;
      correct?.classList.add('correct', 'is-flare');
      view.dataset.result = result;
      onFlare?.(result);
    });
  }
  if (rail) after(hold + 250, () => { rail.dataset.verdicts = 'on'; });
  return hold;
}

/* ----------------------------------------------------------- clock -- */

/** Heat the clock as time runs down; heartbeat and red edges in the last five seconds. */
export function clockTension(view, { fraction, remaining, paused, live }) {
  if (!view) return false;
  const final = live && !paused && remaining > 0 && remaining < 5000;
  view.style.setProperty('--tension', live ? (1 - fraction).toFixed(3) : '0');
  view.toggleAttribute('data-final-seconds', final);
  if (final && view.classList.contains('host-screen') && !view.querySelector('.tension-vignette'))
    view.insertAdjacentHTML('beforeend', '<div class="tension-vignette" aria-hidden="true"></div>');
  return final;
}

/* -------------------------------------------------------- reactions -- */

/**
 * Which host reaction (if any) fits this moment on the TV. Uses only what the
 * TV already shows: who was right, lives and streaks. Never names a player.
 */
export function reactionFor(s) {
  if (s.phase === 'question') {
    if (s.total >= 3 && s.index === s.total - 1) return 'final';
    if (s.total >= 6 && s.index === Math.ceil(s.total / 2)) return 'halfway';
    return undefined;
  }
  if (s.phase !== 'reveal' || !Array.isArray(s.lockIns)) return undefined;
  if (s.knockout?.out?.some(row => row.outNow)) return 'knockedout';
  const answered = s.lockIns.length;
  const right = s.lockIns.filter(entry => entry.won).length;
  if (!answered) return 'noanswers';
  if (!right) return 'nobody';
  if (answered >= 2 && right === answered) return 'everybody';
  if (answered >= 3 && right === 1) return 'onlyone';
  if (s.players?.some(player => player.streak === 3)) return 'streak';
  return undefined;
}
