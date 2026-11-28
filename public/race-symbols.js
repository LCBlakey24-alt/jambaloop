// The symbols of the symbol race, shared by the server (which deals the grids) and the phone
// (which draws them). Each symbol has its own shape and its own colour, so colour helps but is
// never the only way to tell two apart.
export const raceSymbols = Object.freeze([
  { id: 'circle', name: 'circle', colour: '#ff5d6c', path: '<circle cx="50" cy="50" r="36"/>' },
  { id: 'square', name: 'square', colour: '#4aa8ff', path: '<rect x="16" y="16" width="68" height="68" rx="8"/>' },
  { id: 'triangle', name: 'triangle', colour: '#ffd34d', path: '<path d="M50 12 90 84H10Z"/>' },
  { id: 'star', name: 'star', colour: '#ff9a3d', path: '<path d="M50 8l12 27 30 3-22 20 6 30-26-15-26 15 6-30L8 38l30-3z"/>' },
  { id: 'heart', name: 'heart', colour: '#ff7ad9', path: '<path d="M50 88C20 66 8 50 8 34a20 20 0 0 1 42-8 20 20 0 0 1 42 8c0 16-12 32-42 54z"/>' },
  { id: 'diamond', name: 'diamond', colour: '#3ee0c5', path: '<path d="M50 6 88 50 50 94 12 50Z"/>' },
  { id: 'plus', name: 'plus', colour: '#9bea5c', path: '<path d="M36 10h28v26h26v28H64v26H36V64H10V36h26z"/>' },
  { id: 'moon', name: 'moon', colour: '#c9b8ff', path: '<path d="M66 8a44 44 0 1 0 26 60A36 36 0 0 1 66 8z"/>' },
  { id: 'bolt', name: 'lightning bolt', colour: '#fff06a', path: '<path d="M58 4 18 56h26l-8 40 46-56H54z"/>' },
  { id: 'hexagon', name: 'hexagon', colour: '#8f6bff', path: '<path d="M27 10h46l23 40-23 40H27L4 50z"/>' },
  { id: 'arrow', name: 'arrow', colour: '#6fe3ff', path: '<path d="M50 6 92 50H66v44H34V50H8z"/>' },
  { id: 'ring', name: 'ring', colour: '#f4f1ea', path: '<path fill-rule="evenodd" d="M50 10a40 40 0 1 0 0 80 40 40 0 0 0 0-80zm0 22a18 18 0 1 1 0 36 18 18 0 0 1 0-36z"/>' },
]);
const byId = new Map(raceSymbols.map(symbol => [symbol.id, symbol]));
export const raceSymbol = id => byId.get(id);

/** How many squares are on the grid for a difficulty, at a fraction of the race run (mixed grows as you go). */
export function symbolGridSize(difficulty, progress = 0) {
  if (difficulty === 'easy') return 6;
  if (difficulty === 'medium') return 9;
  if (difficulty === 'hard') return 12;
  return progress < .34 ? 6 : progress < .67 ? 9 : 12;
}

/** The drawing of one symbol, in its own colour. */
export function symbolMarkup(id, label = false) {
  const symbol = byId.get(id);
  if (!symbol) return '';
  return `<svg class="race-symbol" viewBox="0 0 100 100" ${label ? `role="img" aria-label="${symbol.name}"` : 'aria-hidden="true"'} fill="${symbol.colour}">${symbol.path}</svg>`;
}
