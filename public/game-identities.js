// Every show has its own look: a display face, a bold palette and a surface
// style, so no two games read alike on the TV, the phone or the launcher.
// One table feeds the game screens (as CSS custom properties), the launcher
// carousel and the tests. All fonts are self-hosted under the SIL OFL.
//
// scheme: 'dark' or 'light' page. bg: two-stop page gradient. surface /
// surface2: panels and raised panels. ink / muted: text on those surfaces.
// accent / accent2: highlights. question: whether prompts use the display
// face ('display') or the readable house sans ('body').
export const identities = {
  classic:    { title: 'Golden Hour', display: 'Show Classic', weight: 700, question: 'display', upper: false, scheme: 'dark',
    bg: ['#0b1d6b', '#040b30'], surface: '#0f2479', surface2: '#18339b', ink: '#fffaf0', muted: '#ccd6ff', accent: '#ffc93c', accent2: '#ff6b5a', radius: '6px' },
  wheel:      { title: 'Carnival Midway', display: 'Show Wheel', weight: 400, question: 'body', upper: true, scheme: 'dark',
    bg: ['#7412c4', '#2b0548'], surface: '#3d0a6b', surface2: '#561092', ink: '#ffffff', muted: '#ead2ff', accent: '#ffd23f', accent2: '#ff3fa4', radius: '22px' },
  board:      { title: 'Games Table', display: 'Show Board', weight: 700, question: 'display', upper: false, scheme: 'dark',
    bg: ['#0f5c3c', '#05281a'], surface: '#0a4029', surface2: '#12583a', ink: '#fff6e0', muted: '#d2e8d6', accent: '#f0c060', accent2: '#e0533d', radius: '4px' },
  dice:       { title: 'Deco Salon', display: 'Show Dice', weight: 400, question: 'body', upper: true, scheme: 'dark',
    bg: ['#7d0f2b', '#2c0410'], surface: '#480817', surface2: '#661024', ink: '#fff3dc', muted: '#f3ccd3', accent: '#f2c14e', accent2: '#2ec4b6', radius: '2px' },
  knockout:   { title: 'Fight Night', display: 'Show Knockout', weight: 400, question: 'display', upper: true, scheme: 'dark',
    bg: ['#1a1a1f', '#000000'], surface: '#141418', surface2: '#24242a', ink: '#ffffff', muted: '#cdcdd5', accent: '#ff2a2a', accent2: '#ffe600', radius: '0px' },
  bluff:      { title: 'Case Files', display: 'Show Bluff', weight: 700, question: 'display', upper: false, scheme: 'dark',
    bg: ['#1d232b', '#0a0c0f'], surface: '#20252d', surface2: '#2c323b', ink: '#f2eee3', muted: '#bcbec4', accent: '#c6ff00', accent2: '#ff4d4d', radius: '3px' },
  punchline:  { title: 'Comic Strip', display: 'Show Punchline', weight: 400, question: 'display', upper: true, scheme: 'light',
    bg: ['#ffe14d', '#ffb703'], surface: '#ffffff', surface2: '#fff4c2', ink: '#14110a', muted: '#55431a', accent: '#d81e23', accent2: '#1f5fd6', radius: '14px' },
  cards:      { title: 'Card Parlour', display: 'Show Cards', weight: 700, question: 'display', upper: false, scheme: 'light',
    bg: ['#f6ecdc', '#e3cfb2'], surface: '#fffaf2', surface2: '#f2e5d0', ink: '#2a1230', muted: '#6a4f66', accent: '#b8164f', accent2: '#1d6b5f', radius: '12px' },
  tracks:     { title: 'Junction Box', display: 'Show Tracks', weight: 400, question: 'body', upper: true, scheme: 'dark',
    bg: ['#2b2e33', '#101113'], surface: '#1b1d20', surface2: '#2a2d31', ink: '#f7f7f2', muted: '#c6c9cc', accent: '#ffb300', accent2: '#35d06b', radius: '3px' },
  potato:     { title: 'Hot Seat', display: 'Show Potato', weight: 400, question: 'display', upper: false, scheme: 'dark',
    bg: ['#ff6a1f', '#a8220a'], surface: '#6e1706', surface2: '#8c210c', ink: '#fff6e8', muted: '#ffd9c4', accent: '#ffd23f', accent2: '#ffffff', radius: '18px' },
  showdown:   { title: 'Arena Lights', display: 'Show Teams', weight: 700, question: 'body', upper: true, scheme: 'dark',
    bg: ['#0a52ff', '#001660'], surface: '#00217a', surface2: '#003099', ink: '#ffffff', muted: '#d2e2ff', accent: '#ff7a1a', accent2: '#00e0ff', radius: '8px' },
  samepage:   { title: 'Lagoon', display: 'Show SamePage', weight: 800, question: 'display', upper: false, scheme: 'dark',
    bg: ['#12b5a4', '#08636e'], surface: '#074e58', surface2: '#08595f', ink: '#ffffff', muted: '#d0f5ef', accent: '#fff36b', accent2: '#ff9ac6', radius: '24px' },
  spotlight:  { title: 'Velvet Theatre', display: 'Show Spotlight', weight: 400, question: 'display', upper: false, scheme: 'dark',
    bg: ['#86102a', '#22020a'], surface: '#3a0510', surface2: '#550a1a', ink: '#fff3e6', muted: '#f5cbd3', accent: '#ffd27a', accent2: '#ffffff', radius: '10px' },
  brain:      { title: 'Neon Lab', display: 'Show Brain', weight: 800, question: 'body', upper: true, scheme: 'dark',
    bg: ['#04304f', '#010d18'], surface: '#031a2d', surface2: '#072f4d', ink: '#eafbff', muted: '#acd9e8', accent: '#2ef2ff', accent2: '#b6ff3b', radius: '4px' },
  topanswers: { title: 'Seventies Survey', display: 'Show Top', weight: 400, question: 'display', upper: false, scheme: 'dark',
    bg: ['#de5a20', '#74270d'], surface: '#561d0a', surface2: '#70270f', ink: '#fff4e0', muted: '#ffdcbf', accent: '#ffc145', accent2: '#4fd8d1', radius: '20px' },
  rare:       { title: 'Treasure Vault', display: 'Show Rare', weight: 400, question: 'display', upper: false, scheme: 'dark',
    bg: ['#0b6249', '#022419'], surface: '#04342a', surface2: '#08483a', ink: '#f6f0dc', muted: '#c6e4d4', accent: '#e8c35a', accent2: '#7ee8ff', radius: '6px' },
  bloodmoon:  { title: 'Moonlit Village', display: 'Show Bloodmoon', weight: 700, question: 'display', upper: false, scheme: 'dark',
    bg: ['#2a1846', '#0d0718'], surface: '#1a1030', surface2: '#2a1846', ink: '#ffffff', muted: '#cdbfe6', accent: '#ff8a8f', accent2: '#ffe9c2', radius: '18px' },
  wayoff:     { title: 'Target Range', display: 'Show WayOff', weight: 400, question: 'body', upper: false, scheme: 'dark',
    bg: ['#8a1f55', '#2b0a1c'], surface: '#3a0f27', surface2: '#501636', ink: '#ffffff', muted: '#f3c6dc', accent: '#ffd23f', accent2: '#5ee6ff', radius: '18px' },
  sketch:     { title: 'Sketch Pad', display: 'Show Sketch', weight: 700, question: 'display', upper: false, scheme: 'light',
    bg: ['#fdfcf7', '#ebe6d8'], surface: '#ffffff', surface2: '#f4f0e6', ink: '#1d2433', muted: '#545c6e', accent: '#e0294c', accent2: '#2a6fdb', radius: '16px' },
  quizrace:   { title: 'Neon Grand Prix', display: 'Show Race', weight: 700, question: 'body', upper: true, scheme: 'dark',
    bg: ['#1a0838', '#05010f'], surface: '#100524', surface2: '#1d0b3d', ink: '#ffffff', muted: '#cbbcff', accent: '#ff2bd6', accent2: '#1df2e0', radius: '4px' },
  soclose:    { title: 'Measuring Studio', display: 'Show SoClose', weight: 600, question: 'body', upper: false, scheme: 'dark',
    bg: ['#0f5457', '#052a2d'], surface: '#073a3d', surface2: '#0d4b4f', ink: '#f6f4e6', muted: '#bfd8d5', accent: '#ffbf68', accent2: '#7fe3d6', radius: '6px' },
};

export const identityOf = mode => Object.hasOwn(identities, mode) ? identities[mode] : identities.classic;

/** CSS custom properties for a game's screens and launcher tile. */
export function identityVariables(mode) {
  const id = identityOf(mode);
  return [
    `--id-display:'${id.display}'`, `--id-weight:${id.weight}`,
    `--id-question:${id.question === 'display' ? `'${id.display}'` : "'House Sans'"}`,
    `--id-case:${id.upper ? 'uppercase' : 'none'}`, `--id-bg1:${id.bg[0]}`, `--id-bg2:${id.bg[1]}`,
    `--id-surface:${id.surface}`, `--id-surface2:${id.surface2}`, `--id-ink:${id.ink}`, `--id-muted:${id.muted}`,
    `--id-accent:${id.accent}`, `--id-accent2:${id.accent2}`, `--id-radius:${id.radius}`,
    // The show's illustrated scene: launcher tile artwork and game backdrop.
    `--id-scene:url('/scenes/${Object.hasOwn(identities, mode) ? mode : 'classic'}.svg')`,
  ].join(';');
}
