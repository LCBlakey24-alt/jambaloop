// Keep the same DOM and form controls on every page. Only their visibility changes.
const mobileQuery = '(max-width: 680px), (pointer: coarse) and (max-width: 950px)';
const groups = [
  '.game', '.game-panel', '.hero', '.hero-inner', '.hero-copy', '.modes', '.categories', '.lobby',
  '.join-panel > div:first-child', '.turn-copy', '.tv-round', '.tv-round-hud', '.potato-question',
  '.answers', '.answer-editor', '.order-result', '.order-list', '.bluff-replies', '.board-teams',
  '.players', '.ranking', '.podium', '.award-grid', '.review-list', '.lobby-guide dl', '.team-scoreboard',
  '.mode-list', '.cards', '#post-ceremony', '#quiz-library', '.saved-quizzes', '.saved-quizzes > section',
  '.form-row', 'form', 'fieldset', 'details[open]', '.quiz-source', '.playlist-editor',
  '.recent-rooms', '.practice-demo', '.practice-scene', '.practice-choices', '.theme-options', '#ceremony-frame', '.ceremony-slide', '.ceremony-ranks',
].join(',');
const fixed = [
  '.game-top', '#reconnect-status', '#game-error', 'legend', 'summary', '#dialog-title',
  '#dialog-content .error', '.party-panel > [role="status"]', ':is(#join-form,#host-form,#configure-form,#rematch-form,#night-form) > button:last-child',
].join(',');
const ignores = 'script, style, template, .scene-backdrop, .scene-burst';

function pager(label) {
  const nav = document.createElement('nav');
  nav.className = 'mobile-pager';
  nav.setAttribute('aria-label', label);
  nav.hidden = true;
  nav.innerHTML = '<button type="button" data-deck-prev aria-label="Previous page">‹ <span>Back</span></button>'
    + '<output aria-live="polite"></output>'
    + '<button type="button" data-deck-next aria-label="Next page"><span>Next</span> ›</button>';
  return nav;
}

function planTree(parent, leaves, marked, breaks) {
  return [...parent.children].flatMap(element => {
    if (element.matches(ignores) || element.hidden || getComputedStyle(element).display === 'none') return [];
    if (element.matches(fixed)) return [{ element, pinned: true }];
    if (element.matches(groups) && element.childElementCount) {
      const start = leaves.length;
      const children = planTree(element, leaves, marked, breaks);
      if (!children.length) return [];
      if (element.hasAttribute('data-deck-section') && start < leaves.length) breaks.add(start);
      marked.push(element);
      return [{ element, children }];
    }
    const index = leaves.length;
    leaves.push(element);
    marked.push(element);
    return [{ element, index }];
  });
}

function show(tree, first, last) {
  let any = false;
  for (const { element, index, children, pinned } of tree) {
    const visible = pinned || (children ? show(children, first, last) : index >= first && index < last);
    // A split fieldset or details block only needs its label alongside its own content.
    const contextOnly = pinned && element.matches('legend,summary');
    element.toggleAttribute('data-deck-hidden', !visible);
    if (!contextOnly) any ||= visible;
  }
  return any;
}

function track(element, nav, getKey) {
  let tree = [];
  let marked = [];
  let leaves = [];
  let breaks = new Set();
  let pages = [];
  let current = 0;
  let key;
  let dirty = true;
  const before = nav.querySelector('[data-deck-prev]');
  const after = nav.querySelector('[data-deck-next]');
  const status = nav.querySelector('output');

  function clear() {
    for (const item of marked) item.removeAttribute('data-deck-hidden');
    marked = [];
    nav.hidden = true;
    dirty = true;
  }

  function open(index, focus) {
    if (!pages.length) return;
    current = Math.min(pages.length - 1, Math.max(0, index));
    const { first, last } = pages[current];
    show(tree, first, last);
    nav.hidden = pages.length < 2;
    before.disabled = current === 0;
    after.disabled = current === pages.length - 1;
    const text = `${current + 1} / ${pages.length}`;
    if (status.textContent !== text) status.textContent = text;
    if (focus) {
      const target = (focus === before && !before.disabled ? before : focus === after && !after.disabled ? after
        : focus === before || focus === after ? (before.disabled ? after : before) : focus);
      target?.focus({ preventScroll: true });
    }
  }

  function indexOf(node) {
    if (!node) return -1;
    return leaves.findIndex(leaf => leaf === node || leaf.contains(node) || node.contains(leaf));
  }

  function measure(keep) {
    if (!dirty) return;
    const nextKey = getKey();
    const reset = nextKey !== key;
    const anchor = !reset && (keep || leaves[pages[current]?.first]);
    const oldPage = reset ? 0 : current;
    key = nextKey;
    clear();
    leaves = [];
    breaks = new Set();
    tree = planTree(element, leaves, marked, breaks);
    pages = [];
    dirty = false;
    if (!leaves.length) return;
    const fits = () => element.scrollHeight <= element.clientHeight + 1;
    if (fits()) {
      pages.push({ first: 0, last: leaves.length });
    } else {
      nav.hidden = false;
      const sectionEnds = [...breaks, leaves.length];
      for (let first = 0; first < leaves.length;) {
        const end = sectionEnds.find(index => index > first);
        // First show a single item. Grow the range in larger steps and refine the last fit.
        let best = first + 1;
        let upper = Math.min(end, best + 1);
        while (upper > best) {
          show(tree, first, upper);
          if (!fits()) break;
          best = upper;
          upper = Math.min(end, first + 2 * (best - first));
        }
        let lower = best + 1;
        let limit = upper - 1;
        while (lower <= limit) {
          const middle = Math.floor((lower + limit) / 2);
          show(tree, first, middle);
          if (fits()) { best = middle; lower = middle + 1; }
          else limit = middle - 1;
        }
        pages.push({ first, last: best });
        first = best;
      }
    }
    const leaf = indexOf(anchor);
    const page = pages.findIndex(({ first, last }) => leaf >= first && leaf < last);
    open(page >= 0 ? page : oldPage);
  }

  function jump(node, focus = false) {
    const leaf = indexOf(node);
    const page = pages.findIndex(({ first, last }) => leaf >= first && leaf < last);
    if (page < 0) return;
    open(page, focus ? node : undefined);
  }

  before.addEventListener('click', () => open(current - 1, before));
  after.addEventListener('click', () => open(current + 1, after));
  return { clear, measure, jump, invalidate: () => { dirty = true; } };
}

export function mobileDeck(app, dialog, content) {
  const media = matchMedia(mobileQuery);
  const root = document.documentElement;
  const appPager = pager('Screen pages');
  const dialogPager = pager('Dialog pages');
  app.after(appPager);
  content.after(dialogPager);
  let revision = 0;
  let frame;
  let keep;
  const appLayout = track(app, appPager, () => app.querySelector('[data-deck-key]')?.dataset.deckKey || 'home');
  const dialogLayout = track(content, dialogPager, () => `${revision}/${content.querySelector('#dialog-title')?.textContent}`);
  const active = () => dialog.open ? dialogLayout : appLayout;

  function refresh() {
    frame = undefined;
    if (!media.matches) return;
    const height = window.visualViewport?.height ?? innerHeight;
    const top = window.visualViewport?.offsetTop ?? 0;
    root.style.setProperty('--phone-height', `${Math.round(height)}px`);
    root.style.setProperty('--phone-top', `${Math.round(top)}px`);
    root.classList.toggle('mobile-keyboard', height < 365 && Boolean(window.visualViewport && height < innerHeight - 55));
    // Home launcher already has a 4/6/8-card page controller; avoid a second mobile pager.
    if (!dialog.open && app.querySelector('[data-home-shell]')) { appLayout.clear(); keep = undefined; return; }
    // A player's live gameplay is always one continuous controller surface.
    // Previously only a handful of phases bypassed pagination: Hot Potato,
    // Same Page writing, Brain Ladder questions and others could split the
    // question from the action button, leaving it invisible on another page.
    // Preserve the existing paged launcher/lobby/setup and neutral TV layout.
    const livePlayer = app.querySelector(
      '.game.player-only:not([data-phase="lobby"]):not([data-phase="waiting"])'
    );
    if (!dialog.open && (livePlayer ||
        app.querySelector('.game[data-mode="quizrace"], .game[data-mode="tracks"]'))) {
      appLayout.clear();
      keep = undefined;
      return;
    }
    active().measure(keep || (document.activeElement?.matches('input,select,textarea') ? document.activeElement : null));
    keep = undefined;
  }

  function schedule(layout = active(), node) {
    if (!media.matches) return;
    layout.invalidate();
    keep = node ?? keep;
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  function toggle() {
    root.classList.toggle('mobile-deck', media.matches);
    if (!media.matches) { root.classList.remove('mobile-keyboard'); appLayout.clear(); dialogLayout.clear(); return; }
    schedule(appLayout);
    if (dialog.open) schedule(dialogLayout);
  }

  for (const [element, layout] of [[app, appLayout], [content, dialogLayout]]) {
    new MutationObserver(mutations => {
      if (!media.matches) return;
      if (mutations.some(mutation => {
        const target = mutation.target;
        if (target.closest('#timer, [role="progressbar"], .time-track, #response-progress')) return false;
        if (mutation.type !== 'childList') return true;
        if ([...mutation.addedNodes, ...mutation.removedNodes].some(node => node.nodeType === 1)) {
          if (element === content && target === content && !content.querySelector('#night-form')) revision++;
          return true;
        }
        return !target.matches('.phase-caption, #stage-presence, output, option') && !target.closest('#ceremony-frame');
      })) schedule(layout);
    }).observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'hidden'] });
  }
  new MutationObserver(() => {
    if (dialog.open) {
      revision++;
      schedule(dialogLayout);
    } else schedule(appLayout);
  }).observe(dialog, { attributes: true, attributeFilter: ['open'] });

  let invalidField;
  document.addEventListener('invalid', event => {
    if (!media.matches) return;
    if (invalidField) {
      event.preventDefault();
      return;
    }
    const field = invalidField = event.target;
    const offPage = field.closest('[data-deck-hidden]');
    if (offPage) {
      event.preventDefault();
      active().jump(field, true);
    }
    setTimeout(() => {
      invalidField = undefined;
      if (offPage && field.isConnected && !field.closest('[data-deck-hidden]')) field.reportValidity();
    });
  }, true);
  document.addEventListener('click', event => {
    const href = event.target.closest('a[href="#mode-heading"],a[href="#category-heading"]')?.getAttribute('href');
    if (!href || !media.matches) return;
    event.preventDefault();
    const heading = app.querySelector(href);
    if (heading) appLayout.jump(heading, true);
  });
  for (const event of ['load', 'loadedmetadata']) document.addEventListener(event, ({ target }) => {
    if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) {
      if (content.contains(target)) schedule(dialogLayout);
      else if (app.contains(target)) schedule(appLayout);
    }
  }, true);
  for (const event of ['resize', 'orientationchange']) window.addEventListener(event, () => schedule());
  window.visualViewport?.addEventListener('resize', () => schedule());
  window.visualViewport?.addEventListener('scroll', () => {
    if (document.activeElement?.matches('input,textarea')) schedule();
  });
  document.fonts?.ready.then(() => schedule());
  media.addEventListener('change', toggle);
  toggle();
}
