// "How to play": an animated explainer on the TV for the game the captain just
// picked. Each spoken line in public/guide-scripts.js names a scene; this
// module draws it as a mock TV and a mock phone in the game's own colours, so
// the guide looks like the screens players are about to use. Original CSS
// artwork; the real game tile and a few recorded sprites are reused.
import { modes } from './game-config.js';
import { identityVariables } from './game-identities.js';
import { tileArt } from './home-launcher.js';
import { gameGuides } from './guide-scripts.js';

const nameOf = mode => modes.find(([id]) => id === mode)?.[1] ?? '';
const many = (count, draw) => Array.from({ length: count }, (_, n) => draw(n)).join('');
const tv = (inner, extra = '') => `<span class="guide-tv ${extra}"><span class="guide-tv-screen">${inner}</span></span>`;
const phone = (inner, extra = '') => `<span class="guide-phone ${extra}"><span class="guide-phone-screen">${inner}</span></span>`;
const pair = (left, right) => `<div class="guide-pair">${left}${right}</div>`;
const solo = inner => `<div class="guide-solo">${inner}</div>`;
const bar = text => `<span class="guide-q">${text}</span>`;
const pads = (picked = 1, labels = ['', '', '', '']) => `<span class="guide-pads">${labels.map((label, n) => `<i class="${n === picked ? 'is-picked' : ''}" style="--n:${n}">${label}</i>`).join('')}</span>`;
const lines = count => `<span class="guide-lines">${many(count, n => `<i style="--n:${n}"></i>`)}</span>`;
const chip = (text, extra = '') => `<b class="guide-chip ${extra}">${text}</b>`;
const faces = (count, extra = '') => `<span class="guide-faces ${extra}">${many(count, n => `<i style="--n:${n}"></i>`)}</span>`;
const heart = (broken = false) => `<img class="guide-icon ${broken ? 'is-broken' : ''}" src="/icons/kenney/${broken ? 'suit-hearts-broken' : 'suit-hearts'}.svg" alt="">`;
const icon = (name, extra = '') => `<img class="guide-icon ${extra}" src="/icons/kenney/${name}.svg" alt="">`;
const die = value => `<span class="guide-die" data-value="${value}">${many(value, () => '<i></i>')}</span>`;
const wheel = '<span class="guide-wheel"><i></i></span><span class="guide-wheel-pin"></span>';
const scale = (out = false) => `<span class="guide-scale">${many(5, n => `<i class="${out && n === 4 ? 'is-out' : ''}" style="--n:${n}"></i>`)}<b></b></span>`;
const board = `<span class="guide-board">${many(12, n => `<i class="${[0, 3, 6, 9].includes(n) ? 'is-corner' : ''}" style="--n:${n}"></i>`)}<b></b></span>`;
const scoreRows = (labels = ['1st', '2nd', '3rd']) => `<span class="guide-rows">${labels.map((label, n) => `<i style="--n:${n}"><u></u><em>${label}</em></i>`).join('')}</span>`;
const ring = text => `<span class="guide-ring"><em>${text}</em></span>`;

/** Every scene: (mode, detail) => HTML. Words on screen are labels, not rules text. */
const scenes = {
  title: mode => solo(`<span class="guide-tile">${tileArt(mode)}</span><span class="guide-kicker">HOW TO PLAY</span><span class="guide-name">${nameOf(mode)}</span>`),
  handover: (mode, who) => solo(`<span class="guide-kicker">OVER TO</span><span class="guide-name is-host">${who ?? ''}</span><span class="guide-mic">${icon('character')}</span>`),
  setup: () => pair(tv(bar('Topic') + lines(3)), phone(`<span class="guide-list">${many(4, n => `<i class="${n === 1 ? 'is-picked' : ''}" style="--n:${n}"></i>`)}</span>`)),
  answer: () => pair(tv(bar('?') + lines(2)), phone(pads(2) + '<span class="guide-tap"></span>')),
  order: () => pair(tv(bar('True or false?') + lines(1)), phone(`<span class="guide-order">${many(4, n => `<i style="--n:${n}">${n + 1}</i>`)}</span>`)),
  speed: () => pair(tv(ring('FAST') + chip('+ MORE', 'is-rise')), phone(pads(0) + '<span class="guide-tap is-quick"></span>')),
  scores: (mode, labels) => solo(scoreRows(labels)),
  win: () => solo(`<span class="guide-trophy">${icon('award')}</span><span class="guide-kicker">WINNER</span>` + faces(5, 'is-podium')),
  go: mode => solo(`<span class="guide-go">${nameOf(mode)}</span><span class="guide-kicker">GET READY</span><span class="guide-burst">${many(18, n => `<i style="--n:${n}"></i>`)}</span>`),
  spin: () => pair(tv(wheel), phone(chip('Category') + lines(2))),
  dice: () => pair(tv(`<span class="guide-dice">${die(5)}${die(3)}</span>`), phone('<span class="guide-button">ROLL</span><span class="guide-tap"></span>')),
  multiplier: () => solo(`<span class="guide-dice">${die(6)}${die(4)}</span>${chip('× POINTS', 'is-big is-rise')}`),
  board: () => pair(tv(board), phone(bar('?') + pads(1))),
  powers: () => solo(`${board}<span class="guide-powers">${chip('50/50')}${chip('New Question')}${chip('Double Points')}${chip('Half Points')}</span>`),
  hearts: (mode, count = 3) => solo(`<span class="guide-hearts">${many(count, n => n === count - 1 ? heart(true) : heart())}</span>`),
  out: () => solo(faces(5, 'is-out') + chip('OUT', 'is-bad is-big')),
  levels: () => solo(`<span class="guide-ladder">${many(6, n => `<i style="--n:${n}">${6 - n}</i>`)}<b></b></span>`),
  number: () => pair(tv(bar('How many?') + lines(1)), phone('<span class="guide-number"><i>41</i><i class="is-now">42</i><i>43</i></span><span class="guide-button">LOCK IN</span>')),
  prompt: () => pair(tv(bar('…') + lines(2)), phone(lines(3))),
  write: () => pair(tv(faces(5, 'is-waiting')), phone('<span class="guide-typing"><i></i></span><span class="guide-button">SEND</span>')),
  replies: () => solo(`<span class="guide-cards">${many(4, n => `<i style="--n:${n}">${lines(2)}</i>`)}</span>`),
  vote: () => pair(tv(`<span class="guide-cards is-small">${many(4, n => `<i style="--n:${n}">${lines(1)}</i>`)}</span>`), phone(`<span class="guide-list">${many(4, n => `<i class="${n === 2 ? 'is-picked' : ''}" style="--n:${n}"></i>`)}</span><span class="guide-tap"></span>`)),
  hand: () => pair(tv(bar('The ____') + lines(1)), phone(`<span class="guide-hand">${many(3, n => `<i style="--n:${n}"></i>`)}</span>`)),
  tracks: () => solo(`<span class="guide-fork"><i class="is-a"></i><i class="is-b"></i><img src="/models/sprites/train-tram-round.webp" alt=""></span>`),
  driver: () => solo(`<span class="guide-fork is-still"><i class="is-a"></i><i class="is-b"></i></span><span class="guide-lever"><i></i></span>${chip('DRIVER')}`),
  sabotage: () => pair(tv('<span class="guide-fork is-small"><i class="is-a"></i><i class="is-b is-hit"></i></span>'), phone(`<span class="guide-hand is-bad">${many(3, n => `<i style="--n:${n}"></i>`)}</span>`)),
  debate: () => solo(`<span class="guide-talk">${faces(3)}<b>!</b><b>?</b>${faces(3)}</span>`),
  lever: () => solo(`<span class="guide-fork is-pulled"><i class="is-a"></i><i class="is-b"></i><img src="/models/sprites/train-tram-round.webp" alt=""></span><span class="guide-lever is-pulled"><i></i></span>`),
  secret: () => solo(`<span class="guide-phones">${many(5, n => phone(n === 3 ? '<b class="guide-mystery">?</b>' : lines(2), n === 3 ? 'is-odd' : ''))}</span>`),
  roles: () => solo(`<span class="guide-phones">${many(4, n => phone(n === 1 ? '<img class="guide-sprite" src="/models/sprites/character-vampire.webp" alt="">' : icon(n === 2 ? 'shield' : n === 3 ? 'book-open' : 'structure-house'), 'is-role'))}</span>${chip('SECRET')}`),
  night: () => solo(`<span class="guide-sky is-night"><b></b>${icon('structure-house')}${icon('structure-church')}${icon('structure-house')}</span>`),
  day: () => solo(`<span class="guide-sky is-day"><b></b>${icon('structure-house')}${icon('structure-church')}${icon('structure-house')}</span><img class="guide-sprite is-grave" src="/models/sprites/gravestone-round.webp" alt="">`),
  potato: () => solo(`<span class="guide-circle">${many(6, n => `<i style="--n:${n}"></i>`)}<b></b></span>`),
  timer: (mode, text = '?') => solo(`${ring(text)}<span class="guide-kicker">TICK · TICK · TICK</span>`),
  race: () => solo(`<span class="guide-track">${many(4, n => `<i style="--n:${n}"><b></b></i>`)}</span>`),
  boost: () => pair(tv(`<span class="guide-track is-boost">${many(3, n => `<i style="--n:${n}"><b></b></i>`)}</span>`), phone(`<span class="guide-powerbar">${icon('shield')}${icon('fire')}${icon('arrow-rotate')}</span><span class="guide-tap"></span>`)),
  teams: (mode, count = 3) => solo(`<span class="guide-teams">${many(count, n => `<i style="--n:${n}">${faces(3)}</i>`)}</span>`),
  match: () => solo(`<span class="guide-match"><i>apple</i><i>apple</i><i>apple</i><i class="is-odd">kiwi</i></span>${chip('+100 each', 'is-rise')}`),
  spotlight: () => solo(`<span class="guide-spot"><b></b>${faces(1)}</span>`),
  expert: () => pair(phone(pads(1) + chip('EXPERT'), 'is-left'), phone(pads(1) + chip('YOU'))),
  puzzle: () => pair(tv(`<span class="guide-seq"><i>2</i><i>4</i><i>8</i><i class="is-q">?</i></span>`), phone(pads(3, ['12', '14', '10', '16']))),
  predict: () => pair(tv(bar('Most popular?')), phone(pads(0) + chip('PREDICT'))),
  bars: () => solo(`<span class="guide-bars">${many(4, n => `<i style="--n:${n}"></i>`)}</span>`),
  gem: () => solo(`<span class="guide-match is-gem"><i>Mars</i><i>Mars</i><i>Earth</i><i class="is-rare">Neptune</i></span>${chip('+200', 'is-rise')}`),
  closest: () => solo(scale(false) + chip('CLOSEST', 'is-rise')),
  target: () => solo(`<span class="guide-target"><em>7</em><i></i><em class="is-chase">5</em></span>${ring('60')}`),
  freeze: () => solo(`<span class="guide-freeze">${faces(3)}<b>FROZEN</b></span>`),
  palette: () => solo(`<span class="guide-swatches">${many(60, n => `<i style="--h:${(n % 12) * 30};--l:${82 - Math.floor(n / 12) * 13}%"></i>`)}</span>`),
  clue: () => solo(`${faces(1)}<span class="guide-speech">“lagoon”</span>${faces(4, 'is-waiting')}`),
  pick: () => pair(tv(`<span class="guide-swatches is-small">${many(60, n => `<i style="--h:${(n % 12) * 30};--l:${82 - Math.floor(n / 12) * 13}%"></i>`)}</span>`), phone(`<span class="guide-swatches is-zoom">${many(9, n => `<i class="${n === 4 ? 'is-picked' : ''}" style="--h:${170 + (n % 3) * 10};--l:${62 - Math.floor(n / 3) * 8}%"></i>`)}</span><span class="guide-button">PLACE GUESS</span>`)),
  rings: () => solo(`<span class="guide-swatches is-rings">${many(25, n => { const d = Math.max(Math.abs(n % 5 - 2), Math.abs(Math.floor(n / 5) - 2)); return `<i style="--h:${160 + (n % 5) * 8};--l:${70 - Math.floor(n / 5) * 7}%"><b>${3 - d}</b></i>`; })}</span>`),
  turned: () => solo(`<span class="guide-turned">${tv(bar('PENGUIN'))}<i></i></span>`),
  mime: () => solo(`${faces(3, 'is-miming')}<span class="guide-hush">SHHH</span>`),
  mark: () => pair(tv(bar('PENGUIN')), phone('<span class="guide-button is-good">✓ CORRECT</span><span class="guide-button is-pass">PASS</span><span class="guide-tap"></span>')),
  draw: () => pair(tv('<svg class="guide-doodle" viewBox="0 0 120 80"><path d="M10 60 Q30 10 50 50 T90 40 Q105 30 110 55"/></svg>'), phone('<svg class="guide-doodle" viewBox="0 0 120 80"><path d="M10 60 Q30 10 50 50 T90 40 Q105 30 110 55"/></svg><span class="guide-tap is-draw"></span>')),
};

/** The scenes a script may name (the tests check every script against this). */
export const guideScenes = Object.keys(scenes);

/** Open the guide on the TV. Returns { line(index), close() }. */
export function openGuide(root, mode, { onSkip, script = gameGuides[mode] ?? [] } = {}) {
  root.querySelector('.guide-show')?.remove();
  const overlay = document.createElement('section');
  overlay.className = 'guide-show';
  overlay.dataset.mode = mode;
  overlay.setAttribute('style', identityVariables(mode));
  overlay.setAttribute('aria-label', 'How to play ' + nameOf(mode));
  overlay.innerHTML = `<header class="guide-head"><span class="guide-head-tile">${tileArt(mode)}</span>
      <span><small>HOW TO PLAY</small><strong>${nameOf(mode)}</strong></span>
      <span class="guide-steps" aria-hidden="true">${script.map(() => '<i></i>').join('')}</span>
      <button type="button" class="button outline guide-skip">Skip · we know this one</button></header>
    <div class="guide-stage" aria-hidden="true"></div>`;
  overlay.querySelector('.guide-skip').addEventListener('click', () => onSkip?.());
  root.append(overlay);
  const stage = overlay.querySelector('.guide-stage');
  const dots = [...overlay.querySelectorAll('.guide-steps i')];
  let shown;
  return {
    line(index) {
      const [, , scene, detail] = script[index] ?? [];
      dots.forEach((dot, n) => { dot.classList.toggle('is-done', n < index); dot.classList.toggle('is-now', n === index); });
      overlay.dataset.line = index;
      if (!scenes[scene] || scene === shown) return;
      shown = scene;
      stage.dataset.scene = scene;
      stage.innerHTML = `<div class="guide-scene" data-scene="${scene}">${scenes[scene](mode, detail)}</div>`;
    },
    close() {
      overlay.classList.add('is-closing');
      setTimeout(() => overlay.remove(), 450);
    },
  };
}
