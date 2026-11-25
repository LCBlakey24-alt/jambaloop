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
