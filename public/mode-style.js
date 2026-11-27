// Display fonts and scene colours share the same palette on every device.
import { identityOf, identityVariables } from './game-identities.js';
const styles = {
  soclose: { font:'Club Tracks', weight:700, accent:'#ffbf68', backdrop:'#08282d', panel:'#123e42', edge:'#559a93', motif:'tiles', notes:[330,440,550], wave:'triangle' },
  quizrace: { font: 'Club Knockout', weight: 700, accent: '#1dd9be', backdrop: '#07061a', panel: '#120f33', edge: '#3a2f86', motif: 'orbit', notes: [523, 622, 784], wave: 'triangle' },
  classic: { font: 'Club Classic', weight: 700, accent: '#f5d58d', backdrop: '#080f24', panel: '#14254a', edge: '#9b7843', motif: 'stars', notes: [523, 659, 784], wave: 'sine' },
  wheel: { font: 'Club Wheel', weight: 700, accent: '#ffcf74', backdrop: '#200e36', panel: '#3d1958', edge: '#9a57ad', motif: 'orbit', notes: [440, 622, 831], wave: 'triangle' },
  board: { font: 'Club Race', weight: 700, accent: '#e8c591', backdrop: '#13241c', panel: '#1f3a2b', edge: '#a8783f', motif: 'tiles', notes: [392, 523, 659], wave: 'triangle' },
  dice: { font: 'Club Rally', weight: 400, accent: '#e9c46a', backdrop: '#24090f', panel: '#3d1421', edge: '#b8913f', motif: 'dice', notes: [330, 494, 740], wave: 'triangle' },
  knockout: { font: 'Club Knockout', weight: 700, accent: '#ff9b91', backdrop: '#190c13', panel: '#30171e', edge: '#88444a', motif: 'pulse', notes: [294, 440, 587], wave: 'triangle' },
  bluff: { font: 'Club Bluff', weight: 800, accent: '#98e5cf', backdrop: '#101f29', panel: '#19343f', edge: '#33595f', motif: 'glints', notes: [349, 415, 523], wave: 'sine' },
  punchline: { font: 'Club Punchline', weight: 800, accent: '#ffc0a5', backdrop: '#2b1a29', panel: '#43283b', edge: '#714859', motif: 'bubbles', notes: [587, 740, 880], wave: 'triangle' },
  cards: { font: 'Club Cards', weight: 700, accent: '#f4c0de', backdrop: '#281925', panel: '#40293b', edge: '#64435a', motif: 'cards', notes: [330, 550, 660], wave: 'sine' },
  tracks: { font: 'Club Tracks', weight: 700, accent: '#c1e88d', backdrop: '#17251a', panel: '#273c29', edge: '#4a6247', motif: 'rails', notes: [262, 392, 523], wave: 'triangle' },
  potato: { font: 'Club Potato', weight: 400, accent: '#ffd176', backdrop: '#301918', panel: '#4c2924', edge: '#7a503b', motif: 'sparks', notes: [330, 440, 660], wave: 'triangle' },
  showdown: { font: 'Club Teams', weight: 700, accent: '#9be9f3', backdrop: '#101d38', panel: '#1c3050', edge: '#3f5e84', motif: 'flags', notes: [440, 660, 880], wave: 'sine' },
  samepage: { font: 'Club Classic', weight: 800, accent: '#77efdc', backdrop: '#102939', panel: '#1c3447', edge: '#4a8b94', motif: 'bubbles', notes: [349, 523, 659], wave: 'sine' },
  spotlight: { font: 'Club Wheel', weight: 800, accent: '#ffc88d', backdrop: '#20182c', panel: '#34233f', edge: '#7a5577', motif: 'orbit', notes: [330, 440, 659], wave: 'sine' },
  brain: {font:'Club Classic',weight:800,accent:'#86e7fa',backdrop:'#0c2232',panel:'#19364c',edge:'#45738a',motif:'tiles',notes:[392,523,784],wave:'sine'},
  topanswers: {font:'Club Classic',weight:850,accent:'#ffca83',backdrop:'#221932',panel:'#342a43',edge:'#785c7e',motif:'bubbles',notes:[330,494,659],wave:'triangle'},
  rare: {font:'Club Classic',weight:900,accent:'#a2f4cd',backdrop:'#0f2630',panel:'#1b3c47',edge:'#428078',motif:'glints',notes:[392,523,659],wave:'sine'},
  bloodmoon: {font:'Club Classic',weight:850,accent:'#ff8a8f',backdrop:'#150b26',panel:'#2a1846',edge:'#6e3a66',motif:'glints',notes:[294,349,440],wave:'triangle'},
  wayoff: {font:'Club Classic',weight:850,accent:'#ffd23f',backdrop:'#1b2006',panel:'#343c10',edge:'#8a9a2e',motif:'glints',notes:[392,494,587],wave:'square'},
  shade: {font:'Club Classic',weight:800,accent:'#ff5fa2',backdrop:'#16161b',panel:'#2e2e38',edge:'#5a5a6a',motif:'glints',notes:[523,659,784],wave:'triangle'},
  dontlook: {font:'Club Classic',weight:800,accent:'#7ff3ff',backdrop:'#6d0b38',panel:'#981454',edge:'#ff7fb8',motif:'glints',notes:[494,622,740],wave:'square'},
  catchup: {font:'Club Classic',weight:850,accent:'#c8ff3d',backdrop:'#0b0d52',panel:'#2327a8',edge:'#5a60e0',motif:'glints',notes:[440,554,659],wave:'sawtooth'},
  sketch: {font:'Club Classic',weight:850,accent:'#a4dcff',backdrop:'#101d34',panel:'#203857',edge:'#567b98',motif:'bubbles',notes:[523,659,784],wave:'sine'},
};

// Each show's identity (game-identities.js) supplies its face and palette;
// the motif, notes and wave above stay with the scene and sound cues.
export function modeStyle(mode) {
  const base = styles[mode] ?? styles.classic;
  const id = identityOf(mode);
  return { ...base, font: id.display, weight: id.weight, accent: id.accent, backdrop: id.bg[1], panel: id.surface, edge: id.accent + '66' };
}

export function modeVariables(mode) {
  const style = modeStyle(mode);
  return `--mode-type:'${style.font}';--mode-weight:${style.weight};--game-accent:${style.accent};--mode-backdrop:${style.backdrop};--mode-panel:${style.panel};--mode-edge:${style.edge};${identityVariables(mode)}`;
}

export function sceneBackdrop(mode, celebration) {
  const { motif } = modeStyle(mode);
  return `<div class="scene-backdrop" data-motif="${motif}" aria-hidden="true">
    <i></i><i></i><i></i></div>
    ${celebration ? '<div class="scene-burst" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b></div>' : ''}`;
}
