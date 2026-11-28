// The phone layout. Every phone screen is one screen (owner direction, 28 November 2026): there are no
// Back/Next pages to flick between. Screens are designed to fit a phone; on a small phone, with large text or
// with the keyboard open, the screen scrolls instead. This module only sizes the layout to the visible part
// of the screen (which shrinks when the keyboard opens) and marks the page as a phone layout.
import { isTvScreen } from './device.js';
const mobileQuery = '(max-width: 680px), (pointer: coarse) and (max-width: 950px)';

export function mobileDeck() {
  const media = matchMedia(mobileQuery);
  // A TV is never laid out as a phone, even when its browser reports a small, coarse-pointer screen.
  const phoneLayout = () => media.matches && !isTvScreen();
  const root = document.documentElement;
  let frame;

  function refresh() {
    frame = undefined;
    if (!phoneLayout()) return;
    const height = window.visualViewport?.height ?? innerHeight;
    const top = window.visualViewport?.offsetTop ?? 0;
    root.style.setProperty('--phone-height', `${Math.round(height)}px`);
    root.style.setProperty('--phone-top', `${Math.round(top)}px`);
    root.classList.toggle('mobile-keyboard', height < 365 && Boolean(window.visualViewport && height < innerHeight - 55));
  }
  function schedule() {
    if (phoneLayout() && !frame) frame = requestAnimationFrame(refresh);
  }
  function toggle() {
    root.classList.toggle('mobile-deck', phoneLayout());
    if (!phoneLayout()) root.classList.remove('mobile-keyboard');
    schedule();
  }

  // A field the browser flags (a missing name, say) is scrolled into view on this one screen.
  document.addEventListener('invalid', event => {
    if (phoneLayout()) event.target.scrollIntoView?.({ block: 'center' });
  }, true);
  // Typing: keep the field above the keyboard once it has opened.
  document.addEventListener('focusin', event => {
    if (phoneLayout() && event.target.matches?.('input:not([type="checkbox"],[type="radio"],[type="range"]),textarea')) {
      setTimeout(() => event.target.isConnected && event.target.scrollIntoView?.({ block: 'nearest' }), 300);
    }
  });
  for (const event of ['resize', 'orientationchange']) window.addEventListener(event, schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  // Choosing "This screen is our TV" switches the phone layout off at once.
  globalThis.addEventListener?.('jambaloop-screen', toggle);
  media.addEventListener('change', toggle);
  toggle();
}
