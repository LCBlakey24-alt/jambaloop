// The date the question banks were last fact-checked end to end. Players see
// it in the lobby of every game that asks factual questions, so "the latest"
// and "the most" are read as true up to this date. Change it only when a full
// review has been done and written up as docs/QUESTION_FACT_CHECK_<date>.md.
export const factsCheckedOn = '2026-11-27';

/** Games whose questions are opinions, jokes, drawings or roles, not facts. */
const opinionModes = ['punchline', 'cards', 'tracks', 'bluff', 'bloodmoon', 'samepage', 'sketch', 'topanswers', 'shade'];
export const asksFacts = mode => !opinionModes.includes(mode);

export function factsCheckedLabel() {
  const [year, month, day] = factsCheckedOn.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `Facts checked to ${day} ${months[month - 1]} ${year}`;
}
