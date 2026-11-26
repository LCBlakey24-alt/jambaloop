import { categoryName, boardRollDuration } from './game-config.js';

export const boardLengths = [16, 24, 32, 40];
export const boardTurnCaps = [12, 18, 24, 36, 48, 60];
const genres = ['general', 'history', 'science', 'christmas', 'sports', 'geography', 'entertainment', 'food', 'news', 'art', 'animals', 'space', 'books', 'music', 'technology', 'games'];

export function boardRoute(length, includeChristmas) {
  const edge = length / 8;
  const coordinates = [];
  for (let x = -edge; x <= edge; x++) coordinates.push([x, edge]);
  for (let z = edge - 1; z >= -edge; z--) coordinates.push([edge, z]);
  for (let x = edge - 1; x >= -edge; x--) coordinates.push([x, -edge]);
  for (let z = -edge + 1; z < edge; z++) coordinates.push([-edge, z]);
  coordinates.push([-edge + 1, edge - 1]);
  const topics = includeChristmas ? genres : genres.filter(id => id !== 'christmas');
  return coordinates.map(([x, z], index) => {
    const category = index ? topics[(index - 1) % topics.length] : undefined;
    return { x, z, index, category, label: index === 0 ? 'Start' : categoryName(category), finish: index === length };
  });
}

// Board Race branches along the right-hand side of the physical game board.
// Power Lane is the shorter original route; Question Trail has four extra tiles.
// A landing on a Power Lane-only tile doubles *that team's* earned answer points.
export const boardPathChoices = [
  {id:'power', name:'Power Lane', detail:'Short route · ×2 points for your team on Power Lane tiles'},
  {id:'questions', name:'Question Trail', detail:'Four extra spaces · more rolls and question opportunities'},
];

export function boardFork(spaces) {
  return {start:spaces / 4, rejoin:spaces / 2, extra:4};
}

export function boardPath(spaces, includeChristmas, choice = 'power') {
  const base = boardRoute(spaces, includeChristmas);
  const {start,rejoin,extra} = boardFork(spaces);
  if (choice !== 'questions') return base.map(tile => ({
    ...tile, lane: tile.index > start && tile.index < rejoin ? 'power' : undefined,
    baseIndex:tile.index
  }));
  const edge = spaces / 8;
  const edges = rejoin - start + extra;
  const interior = Array.from({length:edges-1}, (_,offset) => {
    const t=(offset+1)/edges;
    const baseIndex = Math.max(start+1,Math.min(rejoin-1,Math.round(start+(rejoin-start)*t)));
    const source=base[baseIndex];
    return {x:edge-.66,z:edge-2*edge*t,category:source.category,label:source.label,baseIndex,
      lane:'questions',finish:false};
  });
  return [...base.slice(0,start+1),...interior,...base.slice(rejoin)].map((tile,index,array) => ({
    ...tile,index,finish:index===array.length-1
  }));
}

export function boardFinish(spaces, choice) {
  return spaces + (choice === 'questions' ? boardFork(spaces).extra : 0);
}

// Compare teams by actual geographic progress, not their raw tile counts.
// Both lanes meet at the same square and continue together.
export function boardMappedPosition(spaces, position, choice) {
  const {start,rejoin,extra}=boardFork(spaces);
  if (choice !== 'questions' || position <= start) return position;
  const branchEnd = rejoin + extra;
  if (position >= branchEnd) return position - extra;
  return start+(position-start)*(rejoin-start)/(branchEnd-start);
}

// A team picks its lane only once it is standing on the junction square.
export function boardRequiresChoice(spaces, position, choice) {
  return !choice && position === boardFork(spaces).start;
}
/** A roll that would carry an undecided team past the junction stops on it. */
export function boardStopsAtFork(spaces, from, die, choice) {
  const { start } = boardFork(spaces);
  return !choice && from < start && from + die > start;
}

export function suggestedTurnCap(spaces, pieces) {
  return boardTurnCaps.find(cap => cap >= Math.ceil(spaces / 3.5) * pieces) ?? boardTurnCaps.at(-1);
}

export function boardDuration({ spaces, pieces, players, cap, seconds, autoReveal }) {
  const teams = Math.max(1, Math.min(pieces, players));
  // The mass below the finish after n rolls gives one team's survival probability.
  let mass = Array(spaces).fill(0);
  mass[0] = 1;
  const survival = [1];
  for (let roll = 1; roll <= Math.ceil(cap / teams); roll++) {
    const next = Array(spaces).fill(0);
    for (let position = 0; position < spaces; position++) {
      for (let die = 1; die <= 6 && position + die < spaces; die++) next[position + die] += mass[position] / 6;
    }
    survival.push(next.reduce((sum, probability) => sum + probability, 0));
    mass = next;
  }
  function percentile(target) {
    for (let turn = 1; turn < cap; turn++) {
      let unfinished = 1;
      for (let team = 0; team < teams; team++) {
        unfinished *= survival[Math.floor(turn / teams) + (team < turn % teams ? 1 : 0)];
      }
      if (1 - unfinished >= target) return turn;
    }
    return cap;
  }
  const low = percentile(.2);
  const high = percentile(.8);
  const answerLow = seconds ? seconds * (autoReveal ? .55 : .85) : 18;
  const answerHigh = seconds || 35;
  const overhead = boardRollDuration / 1000 + 5 + Math.min(8, Math.log2(Math.max(1, players)));
  return {
    teams, low, high,
    minMinutes: Math.max(1, Math.round(low * (overhead + answerLow) / 60)),
    maxMinutes: Math.max(1, Math.ceil(high * (overhead + 5 + answerHigh) / 60)),
  };
}

export function durationLabel({ minMinutes, maxMinutes }) {
  return (minMinutes === maxMinutes ? minMinutes : minMinutes + '–' + maxMinutes) + ' min';
}
