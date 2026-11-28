// Original show identities: decorative vector artwork and presentation copy only.
// No player names, answers or game state are interpolated into these assets.
//
// Every show has its own emblem (a 120×108 line drawing in the show's accent
// colour). Studio and finale identities are added show by show as each
// redesign batch lands; until then a show keeps the shared ceremony.
const marks = Object.freeze({
  moreless: '<path d="M60 14v70M26 31h68M34 31 18 67h32L34 31zm52 0L70 67h32L86 31zM41 89h38"/><circle cx="60" cy="26" r="5" fill="currentColor"/>',
  classic: '<path d="M39 19h42v25c0 15-8 23-21 27-13-4-21-12-21-27z"/><path d="M39 25H24v12c0 11 6 17 17 17M81 25h15v12c0 11-6 17-17 17M60 71v14M44 88h32"/><path d="m60 28 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="currentColor" stroke="none"/>',
  wheel: '<circle cx="60" cy="54" r="35"/><circle cx="60" cy="54" r="27"/><path d="M60 27v54M33 54h54M41 35l38 38M79 35 41 73"/><circle cx="60" cy="54" r="7" fill="currentColor"/><path d="m53 10 14 0-7 15z" fill="currentColor"/><path d="M38 90h44"/>',
  knockout: '<path d="m60 12 36 14v27c0 20-14 33-36 43-22-10-36-23-36-43V26z"/><path d="M36 46h12l6-13 8 28 7-15h15"/><path d="M40 74h12m2 0h12m2 0h12" stroke-width="5"/>',
  // Tabletop path of tiles climbing to a finish flag, with a pawn on the way.
  board: '<path d="M14 88h20V70h20V52h20V34h20"/><path d="M14 88v-6m20 6V70m20 0V52m20 0V34m20 0V16"/><path d="M94 34V12l14 6-14 6"/><circle cx="44" cy="44" r="6"/><path d="M38 63c0-8 3-13 6-13s6 5 6 13z" fill="currentColor" stroke="none"/>',
  // Two tumbling dice with brass-salon pips.
  dice: '<rect x="16" y="38" width="42" height="42" rx="8" transform="rotate(-12 37 59)"/><rect x="62" y="22" width="40" height="40" rx="8" transform="rotate(14 82 42)"/><g fill="currentColor" stroke="none"><circle cx="28" cy="52" r="3.6"/><circle cx="46" cy="66" r="3.6"/><circle cx="37" cy="59" r="3.6"/><circle cx="74" cy="31" r="3.4"/><circle cx="90" cy="52" r="3.4"/><circle cx="76" cy="50" r="3.4"/><circle cx="88" cy="33" r="3.4"/></g><path d="M18 96h84" stroke-dasharray="2 8"/>',
  // Stand-up microphone with a laughter burst.
  punchline: '<rect x="40" y="14" width="22" height="34" rx="11"/><path d="M32 40c0 12 9 20 19 20s19-8 19-20M51 60v20M38 82h26"/><path d="M80 22l8-8M86 34h12M80 46l9 7" stroke-width="4"/><path d="M44 26h14M44 34h14" stroke-width="2"/>',
  // Fanned phrase cards with a blank to fill.
  cards: '<rect x="20" y="24" width="44" height="62" rx="6" transform="rotate(-14 42 55)"/><rect x="52" y="18" width="44" height="62" rx="6" transform="rotate(10 74 49)" fill="currentColor" fill-opacity=".12"/><path d="M60 46h28" transform="rotate(10 74 49)"/><path d="M60 58h12" stroke-width="5" transform="rotate(10 74 49)"/>',
  // A railway junction splitting into two tracks.
  tracks: '<path d="M60 98V60M60 60 26 14M60 60l34-46"/><path d="M52 98V62L19 18M68 98V62l33-44" stroke-width="2"/><path d="M50 90h20M50 78h20M50 66h20M30 30l8-6M24 22l8-6M82 24l8 6M88 16l8 6" stroke-width="3"/><circle cx="60" cy="60" r="5" fill="currentColor"/>',
  // Detective magnifier over an evidence pin.
  bluff: '<circle cx="50" cy="46" r="26"/><path d="m69 65 26 26" stroke-width="8"/><path d="M38 44c4-6 20-6 24 0-4 6-20 6-24 0z"/><circle cx="50" cy="44" r="4" fill="currentColor"/><path d="M84 14v14M77 21h14" stroke-width="2"/>',
  // A steaming potato with a fuse-like heat curl.
  potato: '<path d="M26 62c-6-20 10-36 32-36 24 0 40 12 38 30-2 20-20 32-42 30-14-1-24-10-28-24z"/><circle cx="46" cy="52" r="2.5" fill="currentColor"/><circle cx="70" cy="62" r="2.5" fill="currentColor"/><circle cx="60" cy="44" r="2" fill="currentColor"/><path d="M44 20c-4-6 4-8 0-14M60 18c-4-6 4-8 0-14M76 20c-4-6 4-8 0-14" stroke-width="2.5"/>',
  // Chequered flag with speed lines.
  quizrace: '<path d="M44 92V16"/><path d="M44 18h50v34H44" /><path d="M44 18h12v9H44zm24 0h13v9H68zM56 27h12v8H56zm25 0h13v8H81zM44 35h12v8H44zm24 0h13v8H68zM56 43h12v9H56zm25 0h13v9H81z" fill="currentColor" stroke="none"/><path d="M10 40h24M16 54h18M8 68h26" stroke-width="4"/>',
  // Two team shields meeting at a spark.
  showdown: '<path d="M16 24h32v26c0 16-8 26-16 32-8-6-16-16-16-32z"/><path d="M72 24h32v26c0 16-8 26-16 32-8-6-16-16-16-32z"/><path d="m60 32-5 14h9l-6 16" stroke-width="4"/><path d="M26 40h12M82 40h12"/>',
  // Two speech bubbles overlapping on a shared thought.
  samepage: '<path d="M14 24h48a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H34L20 76V64h-6a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8z"/><path d="M58 40h48a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8h-6v12L86 80H58a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8z"/><path d="M50 52h20v12H50z" fill="currentColor" stroke="none"/>',
  // A theatre spotlight casting a cone onto a star.
  spotlight: '<rect x="18" y="12" width="26" height="18" rx="4" transform="rotate(30 31 21)"/><path d="M36 30 20 94h80L46 22"/><path d="m60 62 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="currentColor" stroke="none"/><path d="M18 100h84"/>',
  // A ladder rising into a laboratory circuit node.
  brain: '<path d="M38 98 50 14M70 98 82 14"/><path d="M40 84h31M43 66h31M45 48h31M48 30h31" stroke-width="2.5"/><circle cx="96" cy="22" r="9"/><path d="M82 14h5M96 31v12h-8" stroke-width="2"/><circle cx="96" cy="22" r="3" fill="currentColor"/>',
  // A survey bar chart crowned by its top answer.
  topanswers: '<path d="M14 94h92"/><rect x="20" y="58" width="16" height="36" rx="3"/><rect x="44" y="34" width="16" height="60" rx="3" fill="currentColor" fill-opacity=".2"/><rect x="68" y="66" width="16" height="28" rx="3"/><rect x="92" y="76" width="10" height="18" rx="2"/><path d="m42 24 6-12 4 8 4-8 6 12z" fill="currentColor" stroke="none"/>',
  // A faceted gemstone with a vault glint.
  debate: '<path d="M10 22h65v34H38L22 71V56H10zM57 67h52v28H96v12L81 95H57z"/>',
  rare: '<path d="M30 30h60l18 20-48 46-48-46z"/><path d="M12 50h96M42 30l-10 20 28 46 28-46-10-20M60 30v20"/><path d="M96 12v12M90 18h12" stroke-width="2.5"/>',
  // A precision caliper closing on a reading.
  soclose: '<path d="M14 26h92v16H14z"/><path d="M24 26v8M36 26v5M48 26v8M60 26v5M72 26v8M84 26v5M96 26v8" stroke-width="2"/><path d="M22 42v46l10-10V42M70 42v46l-10-10V42"/><path d="M46 60v18" stroke-width="2" stroke-dasharray="3 4"/><circle cx="46" cy="56" r="3" fill="currentColor"/>',
  // A full moon over rooftops with a bat crossing it.
  bloodmoon: '<circle cx="60" cy="46" r="30"/><path d="M42 44c6-6 10-2 12 2 2-3 4-4 6-4s4 1 6 4c2-4 6-8 12-2-6 0-8 4-9 8-3-3-6-2-9 2-3-4-6-5-9-2-1-4-3-8-9-8z" fill="currentColor" fill-opacity=".25"/><path d="M10 96V78l14-12 14 12v18M46 96V72l12-10 12 10v24M78 96V80l14-12 14 12v16M6 96h108"/>',
  // A target with one dart well wide of it.
  wayoff: '<circle cx="48" cy="56" r="34"/><circle cx="48" cy="56" r="21"/><circle cx="48" cy="56" r="8" fill="currentColor"/><path d="M96 14l14 6-10 6zM100 20 84 34"/><path d="M88 82l8 8m0-8-8 8" stroke-width="3"/>',
  // A runner's flag ahead of a chasing arrow, under a stopwatch.
  catchup: '<circle cx="60" cy="34" r="22"/><path d="M60 12V6M52 6h16M60 34V20M60 34l10 8"/><path d="M10 84h70M68 74l12 10-12 10" stroke-width="5"/><path d="M96 96V70l14 6-14 6"/>',
  // A board of colour swatches with one picked out.
  shade: '<rect x="14" y="22" width="92" height="76" rx="8"/><path d="M37 22v76M60 22v76M83 22v76M14 47h92M14 72h92"/><rect x="60" y="47" width="23" height="25" fill="currentColor"/>',
  // A closed eye above a speech bubble: do not look, just listen.
  dontlook: '<path d="M14 44c14 16 30 24 46 24s32-8 46-24"/><path d="M30 60l-8 12M48 68l-3 14M72 68l3 14M90 60l8 12"/><rect x="34" y="88" width="52" height="22" rx="10"/>',
  // A pencil finishing a quick sketch line.
  sketch: '<path d="M80 14l16 16-46 46-22 6 6-22z"/><path d="m72 22 16 16M34 60l16 16"/><path d="M12 96c14-14 26 8 40-6s24 6 34-2" stroke-width="2.5"/>',
});

const shows = Object.freeze({
  classic: Object.freeze({ studio: 'THE GRAND QUIZ STUDIO', finale: 'THE CHAMPIONS’ PODIUM', mark: marks.classic }),
  wheel: Object.freeze({ studio: 'THE CATEGORY CARNIVAL', finale: 'THE GRAND FINALE', mark: marks.wheel }),
  knockout: Object.freeze({ studio: 'THE ELIMINATION ARENA', finale: 'THE SURVIVORS’ STANDINGS', mark: marks.knockout }),
  board: Object.freeze({ studio: 'THE GRAND TABLETOP', finale: 'THE FINISH LINE', mark: marks.board }),
  dice: Object.freeze({ studio: 'THE BRASS DICE SALON', finale: 'THE HIGH ROLLERS’ TABLE', mark: marks.dice }),
  quizrace: Object.freeze({ studio: 'THE NEON CIRCUIT', finale: 'THE VICTORY LAP', mark: marks.quizrace }),
});
export function showIdentity(mode) {
  return Object.hasOwn(shows, mode) ? shows[mode] : undefined;
}
export function showMarkPath(mode) {
  return Object.hasOwn(marks, mode) ? marks[mode] : '';
}
export function showMark(mode) {
  const mark = showMarkPath(mode);
  return mark ? `<svg class="show-mark" viewBox="0 0 120 108" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${mark}</svg>` : '';
}
