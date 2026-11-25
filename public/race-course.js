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
