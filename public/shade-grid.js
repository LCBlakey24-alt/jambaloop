// Shade: the colour board. One shared, pure description of the grid so the
// server (scoring) and every screen (drawing) agree on what each square is.
export const SHADE_COLUMNS = 30;
export const SHADE_ROWS = 16;
export const rowLetters = 'ABCDEFGHIJKLMNOP';

/** A square's colour: hue runs left to right, light to deep runs top to bottom. */
export function shadeColour(column, row) {
  const hue = Math.round(column * 360 / SHADE_COLUMNS);
  const depth = row / (SHADE_ROWS - 1);
  const lightness = Math.round(88 - depth * 62);
  const saturation = Math.round(68 + 26 * Math.sin(depth * Math.PI));
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

/** "K7": row letter then column number, as printed round the edge of the board. */
export const shadeName = (column, row) => `${rowLetters[row]}${column + 1}`;
export const validSquare = square => Array.isArray(square) && square.length === 2 && Number.isInteger(square[0]) && Number.isInteger(square[1])
  && square[0] >= 0 && square[0] < SHADE_COLUMNS && square[1] >= 0 && square[1] < SHADE_ROWS;

/** How far a guess is from the target, counting diagonals as one step. */
export const shadeDistance = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
/** Exact square 3, one away 2, two away 1. */
export const shadePoints = distance => Math.max(0, 3 - distance);
