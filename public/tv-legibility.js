// Sofa-distance legibility for the TV. After each render of an in-game TV
// screen, any text smaller than a height-relative floor is raised to it, so
// every game (including future ones) stays readable from across the room.
// Reads are batched before writes: one extra style pass per render.

// Compact elements whose geometry depends on their small type.
const SKIP = 'svg, canvas, .game-top, .wheel-disk, .spotlight-wheel, .sr-only, [hidden], [data-tv-legibility="off"]';

/** The minimum readable size for this TV: 24px at 1080p, 16px at 720p (10-foot UI). */
export function tvTextFloor(height = innerHeight) {
  return Math.round(Math.max(16, Math.min(40, height * 0.022)));
}

function hasOwnText(element) {
  for (const node of element.childNodes) if (node.nodeType === 3 && node.textContent.trim()) return true;
  return false;
}

/** Raise small text inside `root`; returns how many elements were enlarged. */
export function enforceTvLegibility(root, floor) {
  if (!root) return 0;
  floor ??= tvTextFloor();
  const raise = [];
  for (const element of root.querySelectorAll('*')) {
    if (!hasOwnText(element) || element.closest(SKIP)) continue;
    const size = parseFloat(getComputedStyle(element).fontSize);
    if (size < floor) raise.push(element);
  }
  for (const element of raise) {
    element.style.fontSize = floor + 'px';
    element.dataset.tvLegible = '';
  }
  return raise.length;
}
