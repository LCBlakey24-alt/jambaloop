// Who may move a game on (owner direction, 28 November 2026): the captain's phone is the room's remote
// control, so every step the TV host can move on, the captain can move on too, with the same checks that
// the request is for the step still on screen. The steps below are the only exceptions. Only the TV host
// moves them on, for the reason given, and the captain's phone says so where a button would otherwise be.
// The server (server.js, /advance) and the phone views both read this list, so they cannot disagree.
const tvOnlySteps = Object.freeze({
  // Rare Find's answer review: only the TV host sees the answers nobody recognised and judges them, and
  // only they know when they have finished (a decision can still be changed right up to the reveal).
  rare: Object.freeze({ phases: Object.freeze(['rare-review']),
    note: 'Only the TV host can move this step on, once every answer has been checked.' }),
  // Fork in the Tracks' card vote: closing it early lays the first card for any team that has not voted.
  // The captain plays on one of the teams, so they could pick the moment that decides the other team's card.
  tracks: Object.freeze({ phases: Object.freeze(['party-build']),
    note: 'The vote closes by itself once both teams have chosen. Only the TV host can close it early.' }),
});

/** True when only the TV host may move this step of this game on. */
export function onlyTvMovesOn(mode, phase) {
  return Object.hasOwn(tvOnlySteps, mode) && tvOnlySteps[mode].phases.includes(phase);
}

/** What the captain's phone says at a step only the TV host moves on (undefined for every other step). */
export function tvStepNote(mode, phase) {
  return onlyTvMovesOn(mode, phase) ? tvOnlySteps[mode].note : undefined;
}

/** Every step only the TV host moves on, as [mode, phase] pairs (for tests and audits). */
export const tvOnlyStepList = Object.freeze(Object.entries(tvOnlySteps).flatMap(([mode, { phases }]) => phases.map(phase => [mode, phase])));
