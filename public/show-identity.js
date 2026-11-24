// Original show identities: decorative vector artwork and presentation copy only.
// No player names, answers or game state are interpolated into these assets.
const shows = Object.freeze({
  classic: Object.freeze({
    studio: 'THE GRAND QUIZ STUDIO', finale: 'THE CHAMPIONS’ PODIUM',
    mark: '<path d="M39 19h42v25c0 15-8 23-21 27-13-4-21-12-21-27z"/><path d="M39 25H24v12c0 11 6 17 17 17M81 25h15v12c0 11-6 17-17 17M60 71v14M44 88h32"/><path d="m60 28 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="currentColor" stroke="none"/>',
  }),
  wheel: Object.freeze({
    studio: 'THE CATEGORY CARNIVAL', finale: 'THE GRAND FINALE',
    mark: '<circle cx="60" cy="54" r="35"/><circle cx="60" cy="54" r="27"/><path d="M60 27v54M33 54h54M41 35l38 38M79 35 41 73"/><circle cx="60" cy="54" r="7" fill="currentColor"/><path d="m53 10 14 0-7 15z" fill="currentColor"/><path d="M38 90h44"/>',
  }),
  knockout: Object.freeze({
    studio: 'THE ELIMINATION ARENA', finale: 'THE SURVIVORS’ STANDINGS',
    mark: '<path d="m60 12 36 14v27c0 20-14 33-36 43-22-10-36-23-36-43V26z"/><path d="M36 46h12l6-13 8 28 7-15h15"/><path d="M40 74h12m2 0h12m2 0h12" stroke-width="5"/>',
  }),
});
export function showIdentity(mode) {
  return Object.hasOwn(shows, mode) ? shows[mode] : undefined;
}
export function showMark(mode) {
  const show = showIdentity(mode);
  return show ? `<svg class="show-mark" viewBox="0 0 120 108" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${show.mark}</svg>` : '';
}
