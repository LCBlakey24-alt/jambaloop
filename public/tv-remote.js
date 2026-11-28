// Moving around the TV screen with a remote: up, down, left and right move between the buttons on screen,
// and OK presses the one that is highlighted. Only on a screen recognised as the TV (see device.js); keys a
// page already uses (the game carousel's left and right) are left to it.
const focusable = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const directions = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

/**
 * The best next box from `from` in a direction: the nearest one whose centre lies that way, preferring
 * boxes in line with it. Boxes are {left, top, width, height}; returns the index, or -1 if there is none.
 */
export function nextInDirection(from, direction, boxes) {
  const centre = box => [box.left + box.width / 2, box.top + box.height / 2];
  const [fx, fy] = centre(from);
  let best = -1, bestScore = Infinity;
  boxes.forEach((box, index) => {
    const [cx, cy] = centre(box);
    const along = direction === 'right' ? cx - fx : direction === 'left' ? fx - cx : direction === 'down' ? cy - fy : fy - cy;
    const across = direction === 'left' || direction === 'right' ? Math.abs(cy - fy) : Math.abs(cx - fx);
    if (along <= 4) return;
    const score = along + across * 2.5;
    if (score < bestScore) { bestScore = score; best = index; }
  });
  return best;
}

function shown(element) {
  const box = element.getBoundingClientRect();
  if (!box.width || !box.height) return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' && !element.closest('[hidden], [inert], [aria-hidden="true"]');
}

/** Listen for the remote. `isTv` is checked on every key press, so choosing "This is our TV" takes effect at once. */
export function enableRemote(isTv, win = globalThis.window) {
  if (!win) return;
  // On the window, so it runs after the page's own key handlers and can see whether they used the key.
  win.addEventListener('keydown', event => {
    const direction = directions[event.key];
    if (!direction || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !isTv()) return;
    const doc = win.document;
    const typing = event.target?.closest?.('input, textarea, select, [contenteditable="true"]');
    if (typing && (direction === 'left' || direction === 'right')) return;
    const scope = doc.querySelector('dialog[open]') ?? doc;
    const items = [...scope.querySelectorAll(focusable)].filter(shown);
    if (!items.length) return;
    // Nothing highlighted yet: start from the middle of the action (the centre game, or the main button),
    // not from whatever happens to come first on the page.
    const start = doc.querySelector('.carousel-card[aria-current="true"]') ?? scope.querySelector('.button.primary');
    const current = items.includes(doc.activeElement) ? doc.activeElement : items.includes(start) ? start : undefined;
    let next = items[0];
    if (current) {
      const others = items.filter(item => item !== current);
      const index = nextInDirection(current.getBoundingClientRect(), direction, others.map(item => item.getBoundingClientRect()));
      if (index < 0 && current === doc.activeElement) return;
      next = index < 0 ? current : others[index];
    }
    event.preventDefault();
    next.focus();
    next.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  });
}
