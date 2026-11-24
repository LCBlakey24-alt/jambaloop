import { partyModes } from './game-config.js';

export const pointValues = [50, 100, 250, 500, 1000, 2000];
export const boardSpeedValues = [0, 25, 50, 100];
export const bonusValues = [0, 50, 100, 250, 500, 1000];
export const doubleSchedules = [
  ['off', 'Off'],
  ['final', 'Scheduled final question'],
  ['third', 'Every third question'],
];

export const canSetScore = mode => mode !== 'board' && mode !== 'quizrace' && mode !== 'soclose' && !partyModes.includes(mode);
export const defaultScoring = seconds => ({ base: seconds ? 500 : 1000, bonus: seconds ? 500 : 0, doubles: 'off' });

export function roundMultiplier(scoring, index, count) {
  if (scoring?.doubles === 'final' && index === count - 1) return 2;
  if (scoring?.doubles === 'third' && (index + 1) % 3 === 0) return 2;
  return 1;
}

export function answerValue(room, question, elapsed) {

  const isEstimate = question.type === 'estimate';
  const scale = Math.max(0, 1 - elapsed / Math.max(1, room.ends - room.opened));
  if (room.mode === 'board') {
    const { points } = room.motion;
    const speed = room.ends && !isEstimate ? points * room.boardSpeed / 100 * scale : 0;
    return Math.round((points + speed) * 100) / 100;
  }
  const { base, bonus } = room.scoring;
  const speedPoints = room.ends && !isEstimate ? Math.round(bonus * scale) : 0;
  const value = isEstimate && room.legacyScoring ? 1000 : base;
  return (value + speedPoints) * roundMultiplier(room.scoring, room.index, room.count) * (room.motion?.multiplier ?? 1);
}
