// Which host line fits the public moment the TV has just reached. Pure: it
// reads two successive TV states and returns [game, kind, delayMs] for a line
// in momentCalls (public/duo-scripts.js), or nothing. Every condition uses
// only what the TV already shows at that moment: counts and outcomes after
// their reveal, never a role, a hidden answer or anything a player typed.
const sum = list => list.reduce((total, value) => total + value, 0);
const teamLead = state => {
  const teams = [...(state.teams ?? [])].sort((a, b) => b.score - a.score);
  if (teams.length < 2) return undefined;
  return teams[0].score > teams[1].score ? teams[0].id : null;
};

export function momentFor(before, next) {
  if (!before || !next || before.game !== next.game) return undefined;
  const entered = phase => next.phase === phase && before.phase !== phase;
  const opened = phase => next.phase === phase && (before.phase !== phase || before.index !== next.index);
  const first = next.index === 0;
  const last = next.total > 1 && next.index === next.total - 1;
  const party = next.party ?? {};
  switch (next.mode) {
    case 'potato':
      if (entered('party-potato')) return ['potato', 'start', 2600];
      if (before.phase === 'party-potato' && next.phase === 'finished') return ['potato', 'burned', 1100];
      return undefined;
    case 'punchline':
    case 'cards': {
      if (opened('party-write')) return party.votePoints === 200 ? ['funny', 'final', 1800] : first ? ['funny', 'write', 2600] : undefined;
      if (entered('party-vote')) return ['funny', 'vote', 700];
      if (entered('party-reveal')) {
        const votes = (party.ballot ?? []).map(entry => entry.votes ?? 0);
        const top = Math.max(0, ...votes);
        if (!sum(votes)) return undefined;
        if (sum(votes) > 1 && top === sum(votes)) return ['funny', 'landslide', 1200];
        if (votes.filter(value => value === top).length > 1) return ['funny', 'tie', 1200];
        return ['funny', 'votes', 1200];
      }
      return undefined;
    }
    case 'tracks':
      if (next.phase === 'party-build' && party.step === 0 && (before.phase !== 'party-build' || before.index !== next.index)) return first ? ['tracks', 'start', 2600] : undefined;
      if (next.phase === 'party-build' && party.step === 1 && before.party?.step !== 1) return ['tracks', 'sabotage', 600];
      if (entered('party-judge')) return ['tracks', 'judge', 600];
      if (entered('party-reveal')) return ['tracks', 'lever', 300];
      return undefined;
    case 'bluff':
      if (opened('party-write')) return first ? ['bluff', 'write', 2600] : undefined;
      if (entered('party-vote')) return ['bluff', 'vote', 700];
      // The call waits for the unmasking: the server holds the result back while the votes are counted.
      if (next.phase === 'party-reveal' && party.liarId !== undefined && before.party?.liarId === undefined) return party.caught ? ['bluff', 'caught', 600] : party.escaped ? ['bluff', 'escaped', 600] : undefined;
      return undefined;
    case 'samepage':
      if (opened('party-write')) return first ? ['samepage', 'write', 2600] : undefined;
      if (entered('party-reveal')) {
        const groups = party.groups ?? [];
        if (!groups.length) return undefined;
        if (groups.length === 1 && groups[0].count > 1) return ['samepage', 'all', 1200];
        if (groups.every(group => group.count === 1)) return ['samepage', 'none', 1200];
        if (groups[0].count >= 3) return ['samepage', 'big', 1200];
      }
      return undefined;
    case 'spotlight':
      if (opened('spotlight-ready')) return first ? ['spotlight', 'contestant', 2600] : undefined;
      if (entered('spotlight-expert')) return first ? ['spotlight', 'expert', 1500] : undefined;
      if (entered('spotlight-answer')) return party.expertSubmitted ? ['spotlight', 'over', 500] : undefined;
      if (entered('spotlight-reveal')) return party.points > 0 ? ['spotlight', 'right', 1000] : ['spotlight', 'wrong', 1000];
      return undefined;
    case 'brain':
      if (opened('brain-question')) return last ? ['brain', 'top', 1800] : first ? ['brain', 'level', 2600] : undefined;
      if (entered('brain-reveal')) {
        const outcomes = party.outcomes ?? [];
        if (party.remaining === 1 && before.party?.remaining > 1) return ['brain', 'last', 1200];
        if (outcomes.some(outcome => outcome.eliminated)) return ['brain', 'out', 1200];
        if (outcomes.length > 1 && outcomes.every(outcome => outcome.correct)) return ['brain', 'allright', 1200];
        if (outcomes.length > 1 && outcomes.every(outcome => !outcome.correct)) return ['brain', 'nobody', 1200];
      }
      return undefined;
    case 'topanswers':
      if (opened('top-poll')) return first ? ['top', 'poll', 2600] : undefined;
      if (entered('top-guess')) return ['top', 'guess', 600];
      if (entered('top-reveal')) {
        const results = party.results;
        if (!results?.totalVotes) return undefined;
        if (results.totalVotes > 1 && results.mostVotes === results.totalVotes) return ['top', 'unanimous', 2200];
        return results.leaders?.length > 1 ? ['top', 'tie', 2200] : ['top', 'clear', 2200];
      }
      return undefined;
    case 'rare':
      if (party.panelSize && !entered('rare-review')) return undefined;
      if (opened('rare-write')) return first ? ['rare', 'write', 2600] : undefined;
      if (entered('rare-review')) return ['rare', 'review', 500];
      if (entered('rare-reveal')) {
        const groups = party.results?.groups ?? [];
        if (!groups.length) return undefined;
        return groups.some(group => group.count === 1) ? ['rare', 'unique', 1500] : ['rare', 'shared', 1500];
      }
      return undefined;
    case 'sketch':
      if (opened('sketch-draw')) return first ? ['sketch', 'draw', 2600] : undefined;
      if (next.phase === 'sketch-draw' && before.phase === 'sketch-draw' && before.index === next.index
        && !(before.party?.correctCount > 0) && party.correctCount >= 1) return ['sketch', 'first', 200];
      if (entered('sketch-reveal')) {
        if (!party.correctCount) return ['sketch', 'nobody', 900];
        if (before.ends && next.now < before.ends - 5000) return ['sketch', 'cracked', 900];
      }
      return undefined;
    case 'wheel':
      // Every other spin, so the line stays a treat.
      return entered('rolling') && next.index % 2 === 0 ? ['wheel', 'spin', 300] : undefined;
    case 'dice': {
      if (!entered('question') || last) return undefined;
      const multiplier = next.motion?.multiplier;
      if (multiplier === 3) return ['dice', 'triple', 500];
      if (multiplier === 2) return ['dice', 'double', 500];
      return multiplier === 1 && next.index % 3 === 0 ? ['dice', 'single', 500] : undefined;
    }
    case 'showdown': {
      // Team scores only move on screen at a checkpoint, so that is when to call them.
      if (!entered('score-break')) return undefined;
      const was = teamLead(before);
      const now = teamLead(next);
      if (now === undefined || was === undefined || now === was) return undefined;
      return now === null ? ['showdown', 'level', 900] : ['showdown', 'lead', 900];
    }
    default:
      return undefined;
  }
}

/** Hot Potato's clock: the line owed when the time left crosses a mark. */
export function potatoClockCall(previousMs, remainingMs) {
  if (!(previousMs > 0) || !(remainingMs > 0)) return undefined;
  if (previousMs > 60000 && remainingMs <= 60000) return 'minute';
  if (previousMs > 20000 && remainingMs <= 20000) return 'twenty';
  return undefined;
}

/**
 * The public question now on the TV, as [key, text], for reading aloud. Only
 * prompts every player may already see: never a private question, a prompt
 * hidden from someone, an answer or anything a player typed.
 */
export function publicPrompt(state) {
  if (!state) return undefined;
  const party = state.party ?? {};
  let prompt;
  if (state.phase === 'question' && !state.privateQuestions) prompt = state.question?.prompt;
  else if (['spotlight-expert', 'brain-question'].includes(state.phase)) prompt = party.question?.prompt;
  else if (['rare-write', 'top-poll'].includes(state.phase)) prompt = party.prompt;
  else if (state.phase === 'party-write' && ['punchline', 'cards', 'samepage'].includes(state.mode)) prompt = party.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) return undefined;
  return [`${state.game}/${state.index}/${state.phase}/${prompt}`, prompt.replace(/_{2,}/g, 'blank')];
}
