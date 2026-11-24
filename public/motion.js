// Shared presentation motion: pointer tilt on cards, celebratory confetti and
// counting numbers. Purely decorative: no game state is read from or written
// to the DOM here, and everything is skipped when the viewer prefers reduced
// motion.

const reducedQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
export const prefersReducedMotion = () => reducedQuery.matches;

/* ---------------------------------------------------------------- tilt -- */

const TILT_SELECTOR = '.game-tile, .preview-cover, [data-tilt]';
let tilted;

function resetTilt(element) {
  if (!element) return;
  element.style.removeProperty('--tilt-x');
  element.style.removeProperty('--tilt-y');
  element.style.removeProperty('--glare-x');
  element.style.removeProperty('--glare-y');
  element.removeAttribute('data-tilting');
}

/** Cards lean towards a mouse or pen and a soft light follows the pointer. */
export function bindTilt(root = document) {
  if (bindTilt.bound) return;
  bindTilt.bound = true;
  const fine = typeof matchMedia === 'function' ? matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  root.addEventListener('pointermove', event => {
    if (!fine.matches || prefersReducedMotion() || event.pointerType === 'touch') return;
    const element = event.target.closest?.(TILT_SELECTOR);
    if (element !== tilted) { resetTilt(tilted); tilted = element; }
    if (!element) return;
    const box = element.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    element.style.setProperty('--tilt-x', ((0.5 - y) * 9).toFixed(2) + 'deg');
    element.style.setProperty('--tilt-y', ((x - 0.5) * 11).toFixed(2) + 'deg');
    element.style.setProperty('--glare-x', (x * 100).toFixed(1) + '%');
    element.style.setProperty('--glare-y', (y * 100).toFixed(1) + '%');
    element.setAttribute('data-tilting', '');
  }, { passive: true });
  root.addEventListener('pointerleave', () => { resetTilt(tilted); tilted = undefined; }, true);
  root.addEventListener('pointerdown', () => { resetTilt(tilted); tilted = undefined; }, { passive: true });
}

/* ------------------------------------------------------------ confetti -- */

const celebrated = new Set();
let confettiCanvas;
let confettiFrame;
let particles = [];

function accentColours(source) {
  const style = source ? getComputedStyle(source) : null;
  const accent = style?.getPropertyValue('--game-accent').trim() || '#ffcf74';
  return [accent, '#ffffff', '#ffd36e', '#3fe4c4', '#ff8fa6', '#9fb6ff'];
}

function confettiLoop(now) {
  const context = confettiCanvas.getContext('2d');
  const { width, height } = confettiCanvas;
  context.clearRect(0, 0, width, height);
  particles = particles.filter(p => now - p.born < p.life && p.y < height + 40);
  for (const p of particles) {
    const age = (now - p.born) / 1000;
    p.vy += 900 * p.scale * 0.016;
    p.vx *= 0.992;
    p.x += p.vx * 0.016;
    p.y += p.vy * 0.016;
    p.spin += p.turn * 0.016;
    const fade = Math.min(1, (p.life - (now - p.born)) / 400);
    context.save();
    context.globalAlpha = Math.max(0, fade);
    context.translate(p.x, p.y);
    context.rotate(p.spin);
    context.scale(1, Math.cos(age * p.flip));
    context.fillStyle = p.colour;
    if (p.round) { context.beginPath(); context.arc(0, 0, p.size / 2, 0, Math.PI * 2); context.fill(); }
    else context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    context.restore();
  }
  if (particles.length) confettiFrame = requestAnimationFrame(confettiLoop);
  else { confettiCanvas.remove(); confettiCanvas = undefined; confettiFrame = undefined; }
}

/**
 * Fire a one-off confetti burst. `key` prevents the same moment repeating
 * across re-renders; `intensity` scales the particle count (TV ≈ 1, phone ≈ .45).
 */
export function celebrate(key, { source, intensity = 1, origin = 'top' } = {}) {
  if (prefersReducedMotion() || typeof document === 'undefined' || !document.body) return false;
  if (key) {
    if (celebrated.has(key)) return false;
    celebrated.add(key);
    if (celebrated.size > 200) celebrated.delete(celebrated.values().next().value);
  }
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  if (!confettiCanvas) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'confetti-layer';
    confettiCanvas.setAttribute('aria-hidden', 'true');
    document.body.append(confettiCanvas);
  }
  confettiCanvas.width = innerWidth * ratio;
  confettiCanvas.height = innerHeight * ratio;
  const colours = accentColours(source);
  const count = Math.round(150 * intensity);
  const now = performance.now();
  const width = confettiCanvas.width;
  for (let i = 0; i < count; i++) {
    const fromSides = origin === 'sides';
    const left = i % 2 === 0;
    const scale = ratio;
    particles.push({
      x: fromSides ? (left ? -10 : width + 10) : width * (0.15 + Math.random() * 0.7),
      y: fromSides ? confettiCanvas.height * (0.55 + Math.random() * 0.2) : -20 - Math.random() * 120,
      vx: fromSides ? (left ? 1 : -1) * (420 + Math.random() * 520) * scale : (Math.random() - 0.5) * 360 * scale,
      vy: fromSides ? -(620 + Math.random() * 520) * scale : (Math.random() * 120) * scale,
      size: (7 + Math.random() * 7) * scale,
      spin: Math.random() * Math.PI,
      turn: (Math.random() - 0.5) * 12,
      flip: 4 + Math.random() * 8,
      round: Math.random() < 0.18,
      colour: colours[i % colours.length],
      born: now - Math.random() * 120,
      life: 2600 + Math.random() * 1200,
      scale,
    });
  }
  if (!confettiFrame) confettiFrame = requestAnimationFrame(confettiLoop);
  return true;
}

/* ------------------------------------------------------------- counters -- */

const format = new Intl.NumberFormat('en-GB');

/**
 * Count numbers up from zero when a results view first appears. Only elements
 * marked with data-count-up are touched; their final text is restored exactly.
 */
export function countUp(root, duration = 900) {
  if (prefersReducedMotion() || !root) return;
  const targets = [...root.querySelectorAll('[data-count-up]')].slice(0, 40);
  const jobs = targets.flatMap(element => {
    const text = element.textContent;
    const match = text.match(/-?[\d,]+/);
    if (!match) return [];
    const value = Number(match[0].replace(/,/g, ''));
    if (!Number.isFinite(value) || Math.abs(value) < 2) return [];
    return [{ element, text, value, before: text.slice(0, match.index), after: text.slice(match.index + match[0].length) }];
  });
  if (!jobs.length) return;
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    for (const job of jobs) {
      if (!job.element.isConnected) continue;
      job.element.textContent = t >= 1 ? job.text : job.before + format.format(Math.round(job.value * ease(t))) + job.after;
    }
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
