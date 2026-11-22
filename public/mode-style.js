// Display fonts and scene colours share the same palette on every device.
const styles = {
  quizrace: { font: 'Club Race', weight: 700, accent: '#1dd9be', backdrop: '#131a33', panel: '#222d4a', edge: '#4a5a83', motif: 'orbit', notes: [523, 622, 784], wave: 'triangle' },
  classic: { font: 'Club Classic', weight: 700, accent: '#aabaff', backdrop: '#141831', panel: '#232b4a', edge: '#414e76', motif: 'stars', notes: [523, 659, 784], wave: 'sine' },
  wheel: { font: 'Club Wheel', weight: 700, accent: '#dfbbff', backdrop: '#201333', panel: '#34204a', edge: '#584075', motif: 'orbit', notes: [440, 622, 831], wave: 'triangle' },
  board: { font: 'Club Race', weight: 700, accent: '#e8c591', backdrop: '#141f1a', panel: '#23352b', edge: '#49634d', motif: 'tiles', notes: [392, 523, 659], wave: 'triangle' },
  dice: { font: 'Club Rally', weight: 400, accent: '#ffb87c', backdrop: '#2a1716', panel: '#442728', edge: '#724742', motif: 'dice', notes: [330, 494, 740], wave: 'triangle' },
  knockout: { font: 'Club Knockout', weight: 700, accent: '#ff98b4', backdrop: '#2a1427', panel: '#411e39', edge: '#71415d', motif: 'pulse', notes: [294, 440, 587], wave: 'triangle' },
  bluff: { font: 'Club Bluff', weight: 800, accent: '#98e5cf', backdrop: '#101f29', panel: '#19343f', edge: '#33595f', motif: 'glints', notes: [349, 415, 523], wave: 'sine' },
  punchline: { font: 'Club Punchline', weight: 800, accent: '#ffc0a5', backdrop: '#2b1a29', panel: '#43283b', edge: '#714859', motif: 'bubbles', notes: [587, 740, 880], wave: 'triangle' },
  cards: { font: 'Club Cards', weight: 700, accent: '#f4c0de', backdrop: '#281925', panel: '#40293b', edge: '#64435a', motif: 'cards', notes: [330, 550, 660], wave: 'sine' },
  tracks: { font: 'Club Tracks', weight: 700, accent: '#c1e88d', backdrop: '#17251a', panel: '#273c29', edge: '#4a6247', motif: 'rails', notes: [262, 392, 523], wave: 'triangle' },
  potato: { font: 'Club Potato', weight: 400, accent: '#ffd176', backdrop: '#301918', panel: '#4c2924', edge: '#7a503b', motif: 'sparks', notes: [330, 440, 660], wave: 'triangle' },
  showdown: { font: 'Club Teams', weight: 700, accent: '#9be9f3', backdrop: '#101d38', panel: '#1c3050', edge: '#3f5e84', motif: 'flags', notes: [440, 660, 880], wave: 'sine' },
  samepage: { font: 'Club Classic', weight: 800, accent: '#77efdc', backdrop: '#102939', panel: '#1c3447', edge: '#4a8b94', motif: 'bubbles', notes: [349, 523, 659], wave: 'sine' },
};

export function modeStyle(mode) {
  return styles[mode] ?? styles.classic;
}

export function modeVariables(mode) {
  const style = modeStyle(mode);
  return `--mode-type:'${style.font}';--mode-weight:${style.weight};--game-accent:${style.accent};--mode-backdrop:${style.backdrop};--mode-panel:${style.panel};--mode-edge:${style.edge}`;
}

export function sceneBackdrop(mode, celebration) {
  const { motif } = modeStyle(mode);
  return `<div class="scene-backdrop" data-motif="${motif}" aria-hidden="true">
    <i></i><i></i><i></i></div>
    ${celebration ? '<div class="scene-burst" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b></div>' : ''}`;
}
