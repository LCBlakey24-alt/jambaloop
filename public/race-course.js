// The Quiz Race course, shared by the 2D SVG track and the 3D TV circuit so
// both always draw the same road. Presentation only: the server's race
// distances decide every placing.
export const coursePath = 'M80 280 C130 80 300 90 365 225 S555 350 635 210 S815 65 897 205 S1035 345 1080 180';

/** Cubic segments [start, control1, control2, end], with each S control point reflected. */
export function courseSegments(path = coursePath) {
  const tokens = path.match(/[MCS]|-?\d+(?:\.\d+)?/g);
  const segments = [];
  let point;
  let lastControl;
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    const take = () => [Number(tokens[i++]), Number(tokens[i++])];
    if (command === 'M') { point = take(); lastControl = point; continue; }
    while (i < tokens.length && !/[MCS]/.test(tokens[i])) {
      const first = command === 'C' ? take() : [2 * point[0] - lastControl[0], 2 * point[1] - lastControl[1]];
      const second = take();
      const end = take();
      segments.push([point, first, second, end]);
      lastControl = second;
      point = end;
    }
  }
  return segments;
}

/**
 * 3D TV circuit: a figure-of-eight lap (world units, y = height). The race
 * starts and finishes on the same straight; the second pass through the
 * middle crosses over the first on a raised bridge. Placings depend only on
 * progress as a fraction of the lap, so this can differ from the 2D course.
 */
export const circuitPoints = [
  [-12, 0, 7.6], [-6, 0, 7.2],                // start/finish straight
  [-2.2, 0, 3.0], [0, 0, 0], [2.6, 0, -2.6],  // first pass through the middle (under the bridge)
  [6.8, 0, -5.9], [11.8, 0, -7.4], [16.2, 0, -4.9], [17.6, 0, -.2], [16.2, 0, 4.4],
  [11.6, 0, 7.6], [6.8, .5, 6.4],
  [3.0, 1.5, 3.2], [0, 1.9, 0], [-3.0, 1.5, -3.1], // second pass: up and over the bridge
  [-6.8, .5, -6.4], [-11.8, 0, -7.6], [-16.4, 0, -5.2], [-18.0, 0, -.6], [-16.8, 0, 4.2],
];

/**
 * Three circuits, one per race length. Each is a closed lap that starts and finishes on its first
 * straight. `crossing` marks where one part of the lap passes over another, so nothing is built there.
 */
export const circuits = {
  // Short: a quick kidney-shaped oval with one dip in the back straight.
  short: { points: [
    [-8, 0, 6.6], [0, 0, 6.9], [8, 0, 6.6],
    [12.6, 0, 3.6], [13.6, 0, 0], [12.4, 0, -3.8],
    [8, 0, -6.6], [3, 0, -5.4], [-2, 0, -4.6], [-7.5, 0, -6.4],
    [-12.4, 0, -3.8], [-13.6, 0, 0], [-12.6, 0, 3.6],
  ], crossing: [] },
  // Medium: the figure of eight.
  medium: { points: circuitPoints, crossing: [[0, 0]] },
  // Long: four straights joined by hairpins, with a ramp on every straight and a chicane in the middle.
  long: { points: [
    [-14, 0, 12], [-7, 0, 12], [0, 1.2, 12], [7, 0, 12], [15, 0, 12],                 // start straight and first ramp
    [21, 0, 9.6], [23.6, 0, 3.5], [23.6, 0, -4], [21, 0, -10], [15, 0, -12.5],        // the long right-hander
    [8, 0, -12.5], [1, 1.1, -12.5], [-6, 0, -12.5], [-14, 0, -12.5],                  // back straight and second ramp
    [-19.6, 0, -11.4], [-22.2, 0, -8.5], [-19.6, 0, -5.4],                            // left hairpin
    [-13, 0, -4.5], [-6.5, 0, -3.2], [-1, 0, -5.4], [4, 0, -4.2], [10, 1.5, -4.5], [15, 0, -3.8], // chicane and the big ramp
    [18.4, 0, -1.6], [18.6, 0, 2.4], [15, 0, 4.8],                                    // right hairpin
    [9, 0, 5], [3, .9, 4.6], [-3, 0, 5], [-10, 0, 4.6], [-16, 0, 4.6],                // return straight and last ramp
    [-20.4, 0, 6], [-22, 0, 8.8], [-19.4, 0, 11.4],                                   // final turn back to the line
  ], crossing: [] },
};
