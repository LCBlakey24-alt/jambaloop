// Broadcast stings for the TV: a short full-screen title card in the show's
// own identity when a game starts, and a "final round" band before the last
// question or round. Decorative only (aria-hidden, no pointer events, never
// blocks timers); skipped for reduced motion, phones and mid-game reloads.
import { identityVariables } from './game-identities.js';
import { launcherCopy } from './home-launcher.js';

const roundPhases = ['debate-first','question', 'ready', 'spotlight-ready', 'brain-question', 'top-poll', 'rare-write', 'party-write', 'party-build', 'sketch-draw', 'party-judge'];
const played = new Set();

/** Which sting (if any) the change from `previousKey` to state `s` deserves. */
export function stingFor(previousKey, s, host) {
  if (!host || !previousKey || !s) return null;
  const [code, game, index, phase] = previousKey.split('/');
  if (code !== s.code || Number(game) !== s.game) return null;
  if (['lobby', 'waiting'].includes(phase) && !['lobby', 'waiting', 'finished'].includes(s.phase)) return 'title';
  if (s.mode !== 'knockout' && s.total > 1 && s.index === s.total - 1 && Number(index) !== s.index && roundPhases.includes(s.phase)) return 'final';
  return null;
}

const escape = value => String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

export function stingView(kind, mode, finalLabel = 'Final round') {
  const { lines, strap } = launcherCopy(mode);
  const title = kind === 'title' ? lines : finalLabel.split(' ');
  return `<div class="show-sting" data-kind="${kind}" data-mode="${mode}" style="${identityVariables(mode)}" aria-hidden="true">
    <i class="sting-bar"></i><i class="sting-bar"></i><i class="sting-bar"></i>
    <div class="sting-card"><span class="sting-kicker">${kind === 'title' ? 'Now playing' : 'Last one'}</span>
      <span class="sting-title">${title.map(line => `<span>${escape(line)}</span>`).join('')}</span>
      ${kind === 'title' ? `<span class="sting-strap">${escape(strap)}</span>` : ''}</div></div>`;
}

/** Play a sting once per game; returns true when one starts. */
export function playSting(kind, s, { reducedMotion, onStart } = {}) {
  if (!kind || reducedMotion) return false;
  const key = `${s.code}/${s.game}/${kind}`;
  if (played.has(key)) return false;
  played.add(key);
  document.querySelector('.show-sting')?.remove();
  const holder = document.createElement('div');
  const finalLabel = ['question', 'ready'].includes(s.phase) && s.mode !== 'board' ? 'Final question' : 'Final round';
  holder.innerHTML = stingView(kind, s.mode, finalLabel);
  const sting = holder.firstElementChild;
  document.body.append(sting);
  const remove = () => sting.remove();
  sting.addEventListener('animationend', event => { if (event.target === sting) remove(); });
  setTimeout(remove, kind === 'title' ? 2000 : 1600);
  onStart?.();
  return true;
}
